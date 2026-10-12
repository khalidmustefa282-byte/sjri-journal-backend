// The backend has no web pages; it only serves the API used by the SJRI website.
// This replaces the confusing 404 at the root URL.
export function GET() {
  return Response.json({
    service: 'SJRI Journal API',
    status: 'running',
    website: 'https://sjri-publish-hub.vercel.app',
    health: '/api/health',
  });
}
