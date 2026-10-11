// Which browser origins may call this API. Never "*".
//
// Configure with env vars (comma-separated lists are allowed):
//   ALLOWED_ORIGINS            e.g. "https://sjrijournal.org,https://www.sjrijournal.org"
//   NEXT_PUBLIC_FRONTEND_URL   e.g. "https://sjri-publish-hub.vercel.app"
//   FRONTEND_URL               same idea, used for links in emails
// If none are set, the live frontend URL below is used.
// Vercel preview deployments of the frontend project (sjri-publish-hub-*-khalid-994d.vercel.app)
// are also allowed so preview links work; set ALLOW_VERCEL_PREVIEWS=false to turn that off.

const DEFAULT_ORIGINS = ['https://sjri-publish-hub.vercel.app'];
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3000'];
const PREVIEW_PATTERN = /^https:\/\/sjri-publish-hub(-[a-z0-9-]+)?-khalid-994d\.vercel\.app$/;

function normalize(origin: string) {
  return origin.trim().replace(/\/+$/, '').toLowerCase();
}

export function allowedOrigins(): string[] {
  const configured = [process.env.ALLOWED_ORIGINS, process.env.NEXT_PUBLIC_FRONTEND_URL, process.env.FRONTEND_URL]
    .filter(Boolean)
    .flatMap((value) => value!.split(','))
    .map(normalize)
    .filter((origin) => origin && origin !== '*');
  const list = configured.length ? configured : DEFAULT_ORIGINS;
  const withDev = process.env.NODE_ENV === 'production' ? list : [...list, ...DEV_ORIGINS];
  return Array.from(new Set(withDev));
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const value = normalize(origin);
  if (allowedOrigins().includes(value)) return true;
  if (process.env.ALLOW_VERCEL_PREVIEWS !== 'false' && PREVIEW_PATTERN.test(value)) return true;
  return false;
}

export const CORS_METHODS = 'GET, POST, PATCH, PUT, DELETE, OPTIONS';
export const CORS_HEADERS = 'Content-Type, Authorization';
