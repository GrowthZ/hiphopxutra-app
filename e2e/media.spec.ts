import { expect, test } from '@playwright/test';
import { adminAuth, event, PROJECT_ID, signInAdmin } from './emulator';

// Photo upload through the media Worker, run against `wrangler dev` (local R2) by `bun run test:media`.
// Skipped in the normal e2e run, which has no Worker.
const MEDIA_URL = process.env.VITE_MEDIA_URL ?? '';
test.skip(!MEDIA_URL.startsWith('http://localhost'), 'needs the local media Worker (bun run test:media)');

const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';

/** ID token for an email/password account, straight from the Auth emulator. */
async function idToken(email: string, password: string) {
  await adminAuth.createUser({ email, password }).catch(() => undefined);
  const res = await fetch(`${AUTH}/accounts:signInWithPassword?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  return (await res.json()).idToken as string;
}

const put = (path: string, token: string, body: BodyInit, type = 'image/webp') =>
  fetch(`${MEDIA_URL}/upload/${path}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': type }, body });

// Smallest valid-looking WebP / JPEG headers for the Worker's type check.
const WEBP = new Uint8Array([...'RIFF'].map((c) => c.charCodeAt(0)).concat([4, 0, 0, 0], [...'WEBP'].map((c) => c.charCodeAt(0))));
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

test('admin uploads a dancer photo: resized, WebP, cached for a year', async ({ page }) => {
  await signInAdmin(page);
  const result = await page.evaluate(async () => {
    // @ts-expect-error served by the Vite dev server, not resolvable by tsc
    const media: typeof import('../src/services/media') = await import('/src/services/media.ts');
    // A 3000x4000 photo, like a phone camera's.
    const canvas = document.createElement('canvas');
    canvas.width = 3000;
    canvas.height = 4000;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 3000, 4000);
    g.addColorStop(0, '#f59e0b');
    g.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 3000, 4000);
    const png = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/png'));
    const urls = await media.uploadDancerPhotos(png, 'e2e-dancer', { x: 30, y: 10, width: 40, height: 30 });
    const again = await media.uploadDancerPhotos(png, 'e2e-dancer', { x: 30, y: 10, width: 40, height: 30 });
    const size = async (url: string) => {
      const bitmap = await createImageBitmap(await (await fetch(url)).blob());
      return [bitmap.width, bitmap.height];
    };
    return { ...urls, again, half: await size(urls.halfBodyUrl!), avatar: await size(urls.avatarUrl) };
  });

  expect(result.halfBodyUrl).toMatch(/\/dancers\/e2e-dancer-half-[0-9a-f]{24}\.webp$/);
  expect(result.again).toEqual({ halfBodyUrl: result.halfBodyUrl, avatarUrl: result.avatarUrl }); // same bytes, same URL
  expect(result.half).toEqual([1080, 1440]);
  expect(result.avatar).toEqual([320, 320]);

  const res = await fetch(result.halfBodyUrl!);
  expect(res.headers.get('content-type')).toBe('image/webp');
  expect(res.headers.get('cache-control')).toContain('immutable');
  expect(res.headers.get('access-control-allow-origin')).toBe('*');
  expect(Number(res.headers.get('content-length') ?? (await res.arrayBuffer()).byteLength)).toBeLessThan(400_000);
});

test('Safari-style browser without WebP encoding uploads JPEG', async ({ page }) => {
  await signInAdmin(page);
  const url = await page.evaluate(async () => {
    // Safari ignores 'image/webp' in toBlob and returns a PNG.
    const toBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (cb, type, q) {
      return toBlob.call(this, cb, type === 'image/webp' ? 'image/png' : type, q);
    };
    // @ts-expect-error served by the Vite dev server, not resolvable by tsc
    const media: typeof import('../src/services/media') = await import('/src/services/media.ts');
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvas.getContext('2d')!.fillRect(0, 0, 800, 600); // an ordinary, fully opaque photo
    const png = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/png'));
    return media.uploadPhoto(png, 'teams', 'e2e-safari');
  });
  expect(url).toMatch(/\.jpg$/);
  expect((await fetch(url)).headers.get('content-type')).toBe('image/jpeg');
});

test('cut-out photos keep their transparent background (WebP, and PNG on Safari)', async ({ page }) => {
  await signInAdmin(page);
  const result = await page.evaluate(async () => {
    // @ts-expect-error served by the Vite dev server, not resolvable by tsc
    const media: typeof import('../src/services/media') = await import('/src/services/media.ts');
    // Two dancers cut out on a transparent background, like an AI team composite.
    const canvas = document.createElement('canvas');
    canvas.width = 2400;
    canvas.height = 1800;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(500, 300, 500, 1500);
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(1400, 300, 500, 1500);
    const png = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/png'));
    const cornerAlpha = async (url: string) => {
      const bitmap = await createImageBitmap(await (await fetch(url)).blob());
      const c = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d')!;
      c.drawImage(bitmap, 0, 0);
      return [c.getImageData(5, 5, 1, 1).data[3], c.getImageData(Math.round(bitmap.width * 0.3), bitmap.height - 5, 1, 1).data[3]];
    };
    const webpUrl = await media.uploadPhoto(png, 'teams', 'e2e-cutout');
    // Safari: no WebP encoder.
    const toBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (cb, type, q) {
      return toBlob.call(this, cb, type === 'image/webp' ? 'image/png' : type, q);
    };
    const safariUrl = await media.uploadPhoto(png, 'teams', 'e2e-cutout-safari');
    return { webpUrl, safariUrl, webpAlpha: await cornerAlpha(webpUrl), safariAlpha: await cornerAlpha(safariUrl) };
  });
  // Corner: see-through; inside a dancer: solid.
  expect(result.webpUrl).toMatch(/\.webp$/);
  expect(result.webpAlpha).toEqual([0, 255]);
  expect(result.safariUrl).toMatch(/\.png$/);
  expect(result.safariAlpha).toEqual([0, 255]);
  expect((await fetch(result.safariUrl)).headers.get('content-type')).toBe('image/png');
});

test('Worker refuses non-admins, check-in staff and mislabelled files; dancer editors only into dancers/', async () => {
  const admin = await idToken('uploader@btc.hiphopxutra.vn', 'secret-1');
  const desk = await idToken('desk@btc.hiphopxutra.vn', 'secret-2');
  const stranger = await idToken('stranger@btc.hiphopxutra.vn', 'secret-3');
  await event.collection('admins').doc('uploader@btc.hiphopxutra.vn').set({ name: 'BTC', role: 'admin' });
  await event.collection('admins').doc('desk@btc.hiphopxutra.vn').set({ name: 'Desk', role: 'checkin' });
  const editor = await idToken('photos@btc.hiphopxutra.vn', 'secret-4');
  await event.collection('admins').doc('photos@btc.hiphopxutra.vn').set({ name: 'Ảnh', role: 'editor' });

  expect((await put('teams/ok-1.webp', admin, WEBP)).status).toBe(200); // BTC username account, admin role
  expect((await put('teams/ok-2.jpg', admin, JPEG, 'image/jpeg')).status).toBe(200);
  expect((await put('teams/no-1.webp', desk, WEBP)).status).toBe(403); // check-in role
  expect((await put('teams/no-2.webp', stranger, WEBP)).status).toBe(403); // not in admins
  expect((await put('dancers/ok-4.webp', editor, WEBP)).status).toBe(200); // "Cập nhật thí sinh": dancer photos
  expect((await put('teams/no-5.webp', editor, WEBP)).status).toBe(403); // ... and nothing else
  expect((await put('teams/no-3.webp', 'garbage', WEBP)).status).toBe(403);
  expect((await put('teams/no-4.webp', admin, JPEG)).status).toBe(415); // JPEG bytes named .webp
  expect([400, 405]).toContain((await put('../etc/x.webp', admin, WEBP)).status); // path tricks never reach R2
  expect((await put('teams/a%2Fb.webp', admin, WEBP)).status).toBe(400);
  const fromOtherSite = await fetch(`${MEDIA_URL}/upload/teams/ok-3.webp`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${admin}`, 'Content-Type': 'image/webp', Origin: 'https://evil.example' },
    body: WEBP,
  });
  expect(fromOtherSite.status).toBe(403); // uploads only from the app's own pages
  expect(PROJECT_ID).toBe('demo-hiphopxutra');
});
