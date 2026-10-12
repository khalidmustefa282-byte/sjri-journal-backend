import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorPaper } from '@/lib/papers';
import { handleError, requireUser, successResponse } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const papers = await prisma.paper.findMany({
      where: { submittedBy: user.id },
      include: {
        submissions: { orderBy: { submissionDate: 'asc' } },
        reviews: { orderBy: { createdAt: 'asc' } },
        decisions: { orderBy: { decisionDate: 'asc' } },
      },
      orderBy: { submissionDate: 'desc' },
    });
    return successResponse({ papers: papers.map(authorPaper) });
  } catch (error) {
    return handleError(error, 'My submissions error');
  }
}
