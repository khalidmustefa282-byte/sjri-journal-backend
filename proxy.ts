import { NextResponse, type NextRequest } from 'next/server';
import { CORS_HEADERS, CORS_METHODS, isAllowedOrigin } from './lib/cors';

// CORS for every /api route, in one place. Only the SJRI frontend may call the API from a browser.
export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowed = isAllowedOrigin(origin);

  if (request.method === 'OPTIONS') {
    const headers = new Headers({ Vary: 'Origin' });
    if (allowed && origin) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Methods', CORS_METHODS);
      headers.set('Access-Control-Allow-Headers', CORS_HEADERS);
      headers.set('Access-Control-Max-Age', '600');
    }
    return new NextResponse(null, { status: allowed ? 204 : 403, headers });
  }

  const response = NextResponse.next();
  response.headers.set('Vary', 'Origin');
  if (allowed && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Expose-Headers', 'Content-Disposition');
  }
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
