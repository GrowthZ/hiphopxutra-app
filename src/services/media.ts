import { auth } from './firebase';

// Photos live in Cloudflare R2 behind the media Worker (worker/), never inside Firestore documents.
// The browser resizes and encodes to WebP before upload; file names are content hashes, so the Worker
// can let browsers and the Cloudflare edge cache every image for a year.

export const MEDIA_URL = (import.meta.env.VITE_MEDIA_URL ?? '').replace(/\/+$/, '');

export type MediaFolder = 'dancers' | 'teams' | 'judges' | 'placeholders';

/** Crop rectangle in % of the source image (react-easy-crop's croppedArea). */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SIZES = {
  halfBody: { width: 1080, height: 1440 }, // LED, podium
  avatar: { width: 320, height: 320 }, // lists, bracket, judge portal
  photo: { width: 1280, height: 1280 }, // team / judge full photos
} as const;

export function loadImage(src: Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = typeof src === 'string' ? src : URL.createObjectURL(src);
    // Re-cropping an already uploaded photo draws it on a canvas: needs the Worker's CORS header.
    if (typeof src === 'string' && !src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (typeof src !== 'string') URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => reject(new Error('Không đọc được ảnh.'));
    img.src = url;
  });
}

const MAX_UPLOAD_BYTES = 2.8 * 1024 * 1024; // the Worker refuses > 3MB

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Không nén được ảnh.'))), type, quality)
  );

/** True when any pixel is see-through: a cut-out (background removed) photo. */
function hasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) return true;
  return false;
}

/**
 * Draws `crop` (or the whole image) scaled to fit `max`, encoded as WebP (keeps a cut-out's transparency).
 * Where the browser can't encode WebP (Safari hands back a PNG instead): JPEG for ordinary photos, PNG for
 * cut-outs, since JPEG would turn the removed background black on the LED. Lowers the quality (WebP/JPEG)
 * or the size (PNG) until it fits the upload limit.
 */
export async function renderWebp(
  img: HTMLImageElement,
  max: { width: number; height: number },
  crop?: CropArea,
  quality = 0.82
): Promise<Blob> {
  const sx = crop ? (crop.x / 100) * img.naturalWidth : 0;
  const sy = crop ? (crop.y / 100) * img.naturalHeight : 0;
  const sw = crop ? (crop.width / 100) * img.naturalWidth : img.naturalWidth;
  const sh = crop ? (crop.height / 100) * img.naturalHeight : img.naturalHeight;

  const draw = (scale: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return { canvas, ctx };
  };
  let scale = Math.min(1, max.width / sw, max.height / sh);
  let { canvas, ctx } = draw(scale);

  let blob = await encode(canvas, 'image/webp', quality);
  if (blob.type === 'image/webp') {
    for (let q = quality - 0.15; blob.size > MAX_UPLOAD_BYTES && q > 0.3; q -= 0.15) blob = await encode(canvas, 'image/webp', q);
  } else if (hasTransparency(ctx, canvas.width, canvas.height)) {
    blob = await encode(canvas, 'image/png', 1);
    while (blob.size > MAX_UPLOAD_BYTES && scale > 0.2) {
      scale *= 0.85;
      ({ canvas } = draw(scale));
      blob = await encode(canvas, 'image/png', 1);
    }
  } else {
    blob = await encode(canvas, 'image/jpeg', quality);
    for (let q = quality - 0.15; blob.size > MAX_UPLOAD_BYTES && q > 0.3; q -= 0.15) blob = await encode(canvas, 'image/jpeg', q);
  }
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error('Ảnh quá lớn sau khi nén, hãy chọn ảnh khác.');
  return blob;
}

async function contentHash(blob: Blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const UPLOAD_ATTEMPTS = 3;
const UPLOAD_TIMEOUT_MS = 30_000;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Uploads a WebP/JPEG/PNG blob through the media Worker (admin login required). Returns its public URL.
 * Retries network errors, timeouts and server hiccups; the key is a content hash, so a retry can't duplicate.
 */
const EXTENSIONS: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

export async function uploadImage(blob: Blob, folder: MediaFolder, name: string): Promise<string> {
  if (!MEDIA_URL) throw new Error('Chưa cấu hình VITE_MEDIA_URL (link Worker ảnh R2). Xem HUONG-DAN-CHAY.md.');
  const user = auth.currentUser;
  if (!user) throw new Error('Cần đăng nhập admin để tải ảnh lên.');

  const type = EXTENSIONS[blob.type] ? blob.type : 'image/webp';
  const safeName = name.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
  const key = `${folder}/${safeName}-${await contentHash(blob)}.${EXTENSIONS[type]}`;

  for (let attempt = 1; ; attempt++) {
    let res: Response | null = null;
    try {
      res = await fetch(`${MEDIA_URL}/upload/${key}`, {
        method: 'PUT',
        // A 403 on the first try may be an expired token: the retry forces a fresh one.
        headers: { Authorization: `Bearer ${await user.getIdToken(attempt > 1)}`, 'Content-Type': type },
        body: blob,
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      });
    } catch (err) {
      if (attempt >= UPLOAD_ATTEMPTS) {
        throw new Error(`Không kết nối được kho ảnh (${(err as Error).name === 'TimeoutError' ? 'quá thời gian' : 'lỗi mạng'}). Thử lại.`);
      }
    }
    if (res?.ok) return `${MEDIA_URL}/${key}`;
    const retryable = !res || res.status >= 500 || res.status === 429 || (res.status === 403 && attempt === 1);
    if (res && (!retryable || attempt >= UPLOAD_ATTEMPTS)) {
      const { error } = await res.json().catch(() => ({ error: '' }));
      throw new Error(error || `Tải ảnh lên R2 thất bại (mã ${res.status}).`);
    }
    await wait(700 * attempt);
  }
}

/** One photo, resized to `max`, straight to R2. */
export async function uploadPhoto(
  source: Blob | string,
  folder: MediaFolder,
  name: string,
  max: { width: number; height: number } = SIZES.photo
) {
  return uploadImage(await renderWebp(await loadImage(source), max), folder, name);
}

/** Dancer: the half-body photo plus an avatar cropped from it. */
export async function uploadDancerPhotos(source: Blob | string, name: string, crop: CropArea, halfBody = true) {
  const img = await loadImage(source);
  const [halfBodyUrl, avatarUrl] = await Promise.all([
    halfBody ? renderWebp(img, SIZES.halfBody).then((b) => uploadImage(b, 'dancers', `${name}-half`)) : undefined,
    renderWebp(img, SIZES.avatar, crop, 0.85).then((b) => uploadImage(b, 'dancers', `${name}-avatar`)),
  ]);
  return { halfBodyUrl, avatarUrl };
}

export const isInlineImage = (url?: string) => Boolean(url?.startsWith('data:image/') && !url.startsWith('data:image/svg'));
