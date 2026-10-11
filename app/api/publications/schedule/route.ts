import { prisma } from '@/lib/prisma';
import { normalizeAuthors } from '@/lib/papers';
import { handleError, successResponse } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Papers scheduled for an upcoming issue (title and planned issue only, no PDF).
export async function GET() {
  try {
    const papers = await prisma.paper.findMany({
      where: { status: 'SCHEDULED' },
      orderBy: [{ volume: 'asc' }, { issue: 'asc' }, { publishedDate: 'asc' }],
      take: 200,
    });
    return successResponse({
      papers: papers.map((p) => ({
        id: p.id,
        title: p.title,
        field: p.field,
        authors: normalizeAuthors(p.authors).map((a) => ({ name: a.name, ...(a.affiliation ? { affiliation: a.affiliation } : {}) })),
        volume: p.volume,
        issue: p.issue,
        plannedDate: p.publishedDate,
      })),
    });
  } catch (error) {
    return handleError(error, 'Schedule error');
  }
}
