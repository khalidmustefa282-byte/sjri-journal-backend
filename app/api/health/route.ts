import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  let database = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'unreachable';
  }
  return Response.json({
    service: 'SJRI Journal API',
    status: database === 'ok' ? 'ok' : 'degraded',
    database,
    fileStorage: process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : process.env.VERCEL ? 'not-configured' : 'local',
    loginConfigured: Boolean(process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 16),
    time: new Date().toISOString(),
  }, { status: database === 'ok' ? 200 : 503 });
}
