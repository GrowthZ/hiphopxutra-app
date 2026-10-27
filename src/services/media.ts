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

/** Draws `crop` (or the whole image) scaled to fit `max`, encoded as WebP. */
export function renderWebp(
  img: HTMLImageElement,
  max: { width: number; height: number },
  crop?: CropArea,
  quality = 0.82
): Promise<Blob> {
  const sx = crop ? (crop.x / 100) * img.naturalWidth : 0;
  const sy = crop ? (crop.y / 100) * img.naturalHeight : 0;
  const sw = crop ? (crop.width / 100) * img.naturalWidth : img.naturalWidth;
  const sh = crop ? (crop.height / 100) * img.naturalHeight : img.naturalHeight;
  const scale = Math.min(1, max.width / sw, max.height / sh);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Trình duyệt không hỗ trợ canvas.'));
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Không nén được ảnh.'))), 'image/webp', quality)
  );
}

/** Square crop centred horizontally, near the top (where the face usually is in a half-body shot). */
export function defaultAvatarCrop(img: HTMLImageElement): CropArea {
  const side = Math.min(img.naturalWidth, img.naturalHeight * 0.6);
  return {
    x: ((img.naturalWidth - side) / 2 / img.naturalWidth) * 100,
    y: 5,
    width: (side / img.naturalWidth) * 100,
    height: (side / img.naturalHeight) * 100,
  };
}

async function contentHash(blob: Blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Uploads a WebP blob through the media Worker (admin login required). Returns its public URL. */
export async function uploadImage(blob: Blob, folder: MediaFolder, name: string): Promise<string> {
  if (!MEDIA_URL) throw new Error('Chưa cấu hình VITE_MEDIA_URL (link Worker ảnh R2). Xem HUONG-DAN-CHAY.md.');
  const user = auth.currentUser;
  if (!user) throw new Error('Cần đăng nhập admin để tải ảnh lên.');

  const safeName = name.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
  const key = `${folder}/${safeName}-${await contentHash(blob)}.webp`;
  const res = await fetch(`${MEDIA_URL}/upload/${key}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'image/webp' },
    body: blob,
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: '' }));
    throw new Error(error || `Tải ảnh lên R2 thất bại (mã ${res.status}).`);
  }
  return `${MEDIA_URL}/${key}`;
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
