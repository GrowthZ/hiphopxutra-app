// Media Worker in front of the R2 bucket.
//   PUT /upload/{folder}/{name}.webp|.jpg|.png  admins (Firebase ID token), stores the image; "Cập nhật thí sinh"
//                                               staff (role editor) only into dancers/
//   GET /{folder}/{name}.webp|.jpg|.png     public, cached at the edge and in browsers for a year
// (Safari can't encode WebP: iPhones upload JPEG, or PNG for cut-out photos that must keep their transparency.)
// File names are content hashes, so a URL never changes meaning and can be cached as immutable.

const FOLDERS = ['dancers', 'teams', 'judges', 'placeholders'];
const KEY_PATTERN = new RegExp(`^(${FOLDERS.join('|')})/[A-Za-z0-9_-]{1,80}\\.(webp|jpg|png)$`);
const TYPES = { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png' };
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

// token -> { role, expiry }; per isolate, so a burst of uploads checks Firestore once
const staffTokens = new Map();

function tokenPayload(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '=')));
  } catch {
    return null;
  }
}

/**
 * The caller's organizer role, the same check firestore.rules makes: a verified email (or a BTC username account)
 * listed in events/{EVENT_ID}/admins. 'admin' (no role = admin) or 'editor' (updates dancers); check-in staff and
 * everyone else get null. Reading that doc *with the caller's token* lets Firestore verify the token.
 */
async function staffRole(token, env) {
  const cached = staffTokens.get(token);
  if (cached && cached.expiry > Date.now()) return cached.role;

  const payload = tokenPayload(token);
  const email = String(payload?.email || '').toLowerCase();
  const trusted = payload?.email_verified === true || email.endsWith(BTC_DOMAIN);
  if (!email || !trusted || payload.aud !== env.FIREBASE_PROJECT_ID) return null;

  // FIRESTORE_URL points at the emulator in local tests (wrangler dev --var).
  const base = env.FIRESTORE_URL || 'https://firestore.googleapis.com';
  const res = await fetch(
    `${base}/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/events/${env.EVENT_ID}/admins/${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const { fields } = await res.json();
  const stored = fields?.role?.stringValue;
  const role = !stored || stored === 'admin' ? 'admin' : stored === 'editor' ? 'editor' : null;
  if (role) staffTokens.set(token, { role, expiry: Math.min(Date.now() + ADMIN_CACHE_MS, payload.exp * 1000) });
  return role;
}

/** Checks the file really is what its name says (a mislabelled PNG would be served with the wrong type). */
function matchesType(bytes, ext) {
  const ascii = (from, to) => String.fromCharCode(...bytes.subarray(from, to));
  if (ext === 'webp') return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
  if (ext === 'png') return bytes[0] === 0x89 && ascii(1, 4) === 'PNG';
  return bytes[0] === 0xff && bytes[1] === 0xd8;
}

async function upload(request, env, key) {
  if (!KEY_PATTERN.test(key)) return json(400, { error: 'Tên file không hợp lệ.' });
  const ext = key.split('.').pop();
  if (request.headers.get('Content-Type') !== TYPES[ext]) return json(415, { error: 'Chỉ nhận ảnh WebP, JPEG hoặc PNG.' });

  const token = (request.headers.get('Authorization') || '').replace(/^Bearer /, '');
  const role = token ? await staffRole(token, env) : null;
  if (!role || (role === 'editor' && !key.startsWith('dancers/'))) return json(403, { error: 'Chỉ admin được tải ảnh lên.' });

  const body = await request.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX_BYTES) return json(413, { error: 'Ảnh rỗng hoặc lớn hơn 3MB.' });

  if (!matchesType(new Uint8Array(body), ext)) return json(415, { error: 'Nội dung file không đúng định dạng ảnh.' });

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

/**
 * Uploads come only from the app (ALLOWED_ORIGINS) or local dev; reading stays open to every page.
 * A missing Origin (scripts, curl) still needs an admin token like any upload.
 */
function uploadOriginAllowed(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return (env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).includes(origin);
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method === 'PUT' && pathname.startsWith('/upload/')) {
      if (!uploadOriginAllowed(request, env)) return json(403, { error: 'Trang này không được phép tải ảnh lên.' });
      return upload(request, env, pathname.slice('/upload/'.length));
    }
    if (request.method === 'GET' || request.method === 'HEAD') return serve(request, env, ctx, pathname.slice(1));
    return new Response('Method not allowed', { status: 405, headers: CORS });
  },
};
