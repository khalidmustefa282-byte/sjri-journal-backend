import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { reviewerPaper } from '@/lib/papers';
import { handleError, requireUser, successResponse } from '@/lib/utils';

// Papers assigned to the logged-in reviewer (author identity hidden).
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request, ['REVIEWER', 'ADMIN']);
    const reviews = await prisma.review.findMany({
      where: { reviewerId: user.id },
      include: { paper: { include: { reviews: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse({ assignments: reviews.map((r) => reviewerPaper(r.paper, user.id)) });
  } catch (error) {
    return handleError(error, 'Reviewer assignments error');
  }
}
