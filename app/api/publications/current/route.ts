import { prisma } from '@/lib/prisma';
import { publicPaper } from '@/lib/papers';
import { handleError, successResponse } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// The current issue = the most recent volume/issue that has published papers.
export async function GET() {
  try {
    const latest = await prisma.paper.findFirst({
      where: { status: 'PUBLISHED', volume: { not: null }, issue: { not: null } },
      orderBy: [{ volume: 'desc' }, { issue: 'desc' }, { publishedDate: 'desc' }],
      select: { volume: true, issue: true },
    });

    const papers = await prisma.paper.findMany({
      where: latest ? { status: 'PUBLISHED', volume: latest.volume, issue: latest.issue } : { status: 'PUBLISHED' },
      orderBy: [{ pages: 'asc' }, { publishedDate: 'desc' }],
      take: 50,
    });

    const dates = papers.map((p) => p.publishedDate).filter((d): d is Date => !!d);
    const year = dates.length ? Math.max(...dates.map((d) => d.getUTCFullYear())) : null;

    return successResponse({
      issue: latest ? { volume: latest.volume, issue: latest.issue, year } : null,
      papers: papers.map(publicPaper),
    });
  } catch (error) {
    return handleError(error, 'Current publications error');
  }
}
