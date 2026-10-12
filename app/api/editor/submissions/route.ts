import { NextRequest } from 'next/server';
import { PaperStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { editorPaper } from '@/lib/papers';
import { HttpError, handleError, requireUser, successResponse } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, ['EDITOR', 'ADMIN']);
    const status = request.nextUrl.searchParams.get('status');
    if (status && !Object.values(PaperStatus).includes(status as PaperStatus)) throw new HttpError('Unknown status filter.');

    const papers = await prisma.paper.findMany({
      where: status ? { status: status as PaperStatus } : undefined,
      include: {
        author: { select: { id: true, email: true, name: true, affiliation: true, country: true } },
        reviews: { include: { reviewer: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' } },
        decisions: { orderBy: { decisionDate: 'asc' } },
        submissions: { orderBy: { submissionDate: 'asc' } },
      },
      orderBy: { submissionDate: 'desc' },
      take: 500,
    });

    return successResponse({ papers: papers.map(editorPaper) });
  } catch (error) {
    return handleError(error, 'Editor submissions error');
  }
}
