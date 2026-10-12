import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, requireUser, successResponse } from '@/lib/utils';

// Reviewer accounts the editor can assign.
export async function GET(request: NextRequest) {
  try {
    await requireUser(request, ['EDITOR', 'ADMIN']);
    const reviewers = await prisma.user.findMany({
      where: { role: 'REVIEWER' },
      select: { id: true, name: true, email: true, affiliation: true, _count: { select: { reviews: { where: { submittedDate: null } } } } },
      orderBy: { name: 'asc' },
    });
    return successResponse({
      reviewers: reviewers.map(({ _count, ...r }) => ({ ...r, openReviews: _count.reviews })),
    });
  } catch (error) {
    return handleError(error, 'Reviewer list error');
  }
}
