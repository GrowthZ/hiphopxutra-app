// Media Worker in front of the R2 bucket.
//   PUT /upload/{folder}/{name}.webp  admin-only (Firebase ID token), stores the image
//   GET /{folder}/{name}.webp         public, cached at the edge and in browsers for a year
// File names are content hashes, so a URL never changes meaning and can be cached as immutable.

const FOLDERS = ['dancers', 'teams', 'judges', 'placeholders'];
const KEY_PATTERN = new RegExp(`^(${FOLDERS.join('|')})/[A-Za-z0-9_-]{1,80}\\.webp$`);
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
 * Admin = the same check firestore.rules makes: a verified email listed in events/{EVENT_ID}/admins.
 * Reading that doc *with the caller's token* lets Firestore verify the token; a forged one is rejected.
 */
async function isAdmin(token, env) {
  const cached = adminTokens.get(token);
  if (cached && cached > Date.now()) return true;

  const payload = tokenPayload(token);
  if (!payload?.email || payload.email_verified !== true || payload.aud !== env.FIREBASE_PROJECT_ID) return false;

  const email = encodeURIComponent(payload.email.toLowerCase());
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/events/${env.EVENT_ID}/admins/${email}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return false;
  adminTokens.set(token, Math.min(Date.now() + ADMIN_CACHE_MS, payload.exp * 1000));
  return true;
}

async function upload(request, env, key) {
  if (!KEY_PATTERN.test(key)) return json(400, { error: 'Tên file không hợp lệ.' });
  if (request.headers.get('Content-Type') !== 'image/webp') return json(415, { error: 'Chỉ nhận ảnh WebP.' });

  const token = (request.headers.get('Authorization') || '').replace(/^Bearer /, '');
  if (!token || !(await isAdmin(token, env))) return json(403, { error: 'Chỉ admin được tải ảnh lên.' });

  const body = await request.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX_BYTES) return json(413, { error: 'Ảnh rỗng hoặc lớn hơn 3MB.' });

  await env.MEDIA.put(key, body, { httpMetadata: { contentType: 'image/webp' } });
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
      'Content-Type': object.httpMetadata?.contentType || 'image/webp',
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
