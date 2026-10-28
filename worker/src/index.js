// Media Worker in front of the R2 bucket.
//   PUT /upload/{folder}/{name}.webp|.jpg  admin-only (Firebase ID token), stores the image
//   GET /{folder}/{name}.webp|.jpg         public, cached at the edge and in browsers for a year
// (.jpg: Safari can't encode WebP, so iPhones upload JPEG instead.)
// File names are content hashes, so a URL never changes meaning and can be cached as immutable.

const FOLDERS = ['dancers', 'teams', 'judges', 'placeholders'];
const KEY_PATTERN = new RegExp(`^(${FOLDERS.join('|')})/[A-Za-z0-9_-]{1,80}\\.(webp|jpg)$`);
const TYPES = { webp: 'image/webp', jpg: 'image/jpeg' };
const BTC_DOMAIN = '@btc.hiphopxutra.vn';
const MAX_BYTES = 3 * 1024 * 1024;
const ADMIN_CACHE_MS = 5 * 60 * 1000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// token -> expiry; per isolate, so a burst of uploads checks Firestore once
const adminTokens = new Map();

function tokenPayload(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '=')));
  } catch {
    return null;
  }
}

/**
 * Admin = the same check firestore.rules makes: a verified email (or a BTC username account) listed in
 * events/{EVENT_ID}/admins with the admin role (no role = admin; check-in staff can't upload).
 * Reading that doc *with the caller's token* lets Firestore verify the token; a forged one is rejected.
 */
async function isAdmin(token, env) {
  const cached = adminTokens.get(token);
  if (cached && cached > Date.now()) return true;

  const payload = tokenPayload(token);
  const email = String(payload?.email || '').toLowerCase();
  const trusted = payload?.email_verified === true || email.endsWith(BTC_DOMAIN);
  if (!email || !trusted || payload.aud !== env.FIREBASE_PROJECT_ID) return false;

  // FIRESTORE_URL points at the emulator in local tests (wrangler dev --var).
  const base = env.FIRESTORE_URL || 'https://firestore.googleapis.com';
  const res = await fetch(
    `${base}/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/events/${env.EVENT_ID}/admins/${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return false;
  const { fields } = await res.json();
  if (fields?.role?.stringValue === 'checkin') return false;
  adminTokens.set(token, Math.min(Date.now() + ADMIN_CACHE_MS, payload.exp * 1000));
  return true;
}

/** Checks the file really is what its name says (a mislabelled PNG would be served with the wrong type). */
function matchesType(bytes, ext) {
  const ascii = (from, to) => String.fromCharCode(...bytes.subarray(from, to));
  return ext === 'webp' ? ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP' : bytes[0] === 0xff && bytes[1] === 0xd8;
}

async function upload(request, env, key) {
  if (!KEY_PATTERN.test(key)) return json(400, { error: 'Tên file không hợp lệ.' });
  const ext = key.split('.').pop();
  if (request.headers.get('Content-Type') !== TYPES[ext]) return json(415, { error: 'Chỉ nhận ảnh WebP hoặc JPEG.' });

  const token = (request.headers.get('Authorization') || '').replace(/^Bearer /, '');
  if (!token || !(await isAdmin(token, env))) return json(403, { error: 'Chỉ admin được tải ảnh lên.' });

  const body = await request.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX_BYTES) return json(413, { error: 'Ảnh rỗng hoặc lớn hơn 3MB.' });

  if (!matchesType(new Uint8Array(body), ext)) return json(415, { error: 'Nội dung file không phải ảnh WebP/JPEG.' });

  // Names are content hashes: the same key means the same bytes, so a retry or re-upload is free.
  if (!(await env.MEDIA.head(key))) {
    await env.MEDIA.put(key, body, {
      httpMetadata: { contentType: TYPES[ext], cacheControl: 'public, max-age=31536000, immutable' },
    });
  }
  return json(200, { key });
}

async function serve(request, env, ctx, key) {
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return request.method === 'HEAD' ? new Response(null, hit) : hit;

  const object = KEY_PATTERN.test(key) ? await env.MEDIA.get(key) : null;
  if (!object) return new Response('Not found', { status: 404, headers: CORS });

  const response = new Response(object.body, {
    headers: {
      ...CORS,
      'Content-Type': object.httpMetadata?.contentType || TYPES[key.split('.').pop()],
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: object.httpEtag,
    },
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return request.method === 'HEAD' ? new Response(null, response) : response;
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method === 'PUT' && pathname.startsWith('/upload/')) {
      return upload(request, env, pathname.slice('/upload/'.length));
    }
    if (request.method === 'GET' || request.method === 'HEAD') return serve(request, env, ctx, pathname.slice(1));
    return new Response('Method not allowed', { status: 405, headers: CORS });
  },
};
