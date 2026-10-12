import { prisma } from '@/lib/prisma';
import { publicPaper } from '@/lib/papers';
import { HttpError, handleError, successResponse } from '@/lib/utils';

// Public detail page data for one published paper.
export async function GET(_request: Request, { params }: { params: Promise<{ paperId: string }> }) {
  try {
    const { paperId } = await params;
    const paper = await prisma.paper.findFirst({ where: { id: paperId, status: 'PUBLISHED' } });
    if (!paper) throw new HttpError('This paper was not found or is not published yet.', 404);
    return successResponse({ paper: publicPaper(paper) });
  } catch (error) {
    return handleError(error, 'Publication detail error');
  }
}
