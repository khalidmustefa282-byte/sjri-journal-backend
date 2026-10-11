import { prisma } from '@/lib/prisma';
import { handleError, successResponse } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Public editorial counts for the Publication page tabs. Numbers only, no titles or names.
export async function GET() {
  try {
    const grouped = await prisma.paper.groupBy({ by: ['status'], _count: { _all: true } });
    const count = (...statuses: string[]) => grouped.filter((g) => statuses.includes(g.status)).reduce((a, g) => a + g._count._all, 0);
    return successResponse({
      overview: {
        activeSubmissions: count('SUBMITTED', 'UNDER_REVIEW', 'REVISIONS_REQUESTED', 'REVISIONS_SUBMITTED', 'ACCEPTED'),
        submitted: count('SUBMITTED'),
        underReview: count('UNDER_REVIEW'),
        revisionsRequested: count('REVISIONS_REQUESTED'),
        revisionsSubmitted: count('REVISIONS_SUBMITTED'),
        accepted: count('ACCEPTED'),
        scheduled: count('SCHEDULED'),
        published: count('PUBLISHED'),
      },
    });
  } catch (error) {
    return handleError(error, 'Overview error');
  }
}
