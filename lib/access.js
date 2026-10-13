import { createHash, timingSafeEqual } from 'node:crypto';

export function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function matchesHash(value, expected) {
  if (typeof value !== 'string' || value.length < 4 || value.length > 200 || typeof expected !== 'string') return false;
  if (/^[a-f0-9]{64}$/.test(expected)) return timingSafeEqual(Buffer.from(hash(value), 'hex'), Buffer.from(expected, 'hex'));
  if (!/^\d{4}$/.test(expected)) return false;
  return timingSafeEqual(Buffer.from(hash(value), 'hex'), Buffer.from(hash(expected), 'hex'));
}

export function adminAllowed(request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
  return matchesHash(token, process.env.PMG_ADMIN_TOKEN_HASH);
}

export function json(body, status = 200) {
  return Response.json(body, {status, headers: {
    'Cache-Control': 'private, no-store, max-age=0',
    'Vercel-CDN-Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  }});
}

export function trustedOrigin(request) {
  const origin = request.headers.get('origin');
  return Boolean(process.env.PMG_PUBLIC_ORIGIN) && origin === process.env.PMG_PUBLIC_ORIGIN && request.headers.get('sec-fetch-site') !== 'cross-site';
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
