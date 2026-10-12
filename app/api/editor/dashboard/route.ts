import { NextRequest } from 'next/server';
import { PaperStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { handleError, requireUser, successResponse } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, ['EDITOR', 'ADMIN']);
    const grouped = await prisma.paper.groupBy({ by: ['status'], _count: { _all: true } });
    const byStatus = Object.fromEntries(Object.values(PaperStatus).map((s) => [s, 0])) as Record<PaperStatus, number>;
    for (const row of grouped) byStatus[row.status] = row._count._all;
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const pendingReviews = await prisma.review.count({ where: { submittedDate: null } });

    return successResponse({
      stats: {
        total,
        submitted: byStatus.SUBMITTED,
        underReview: byStatus.UNDER_REVIEW,
        published: byStatus.PUBLISHED,
        scheduled: byStatus.SCHEDULED,
        pendingReviews,
        byStatus,
      },
    });
  } catch (error) {
    return handleError(error, 'Editor dashboard error');
  }
}
