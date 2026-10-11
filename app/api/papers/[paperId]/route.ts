import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loadPaperForUser } from '@/lib/access';
import { authorPaper, editorPaper, reviewerPaper } from '@/lib/papers';
import { handleError, requireUser, successResponse } from '@/lib/utils';

export async function GET(request: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
  try {
    const { paperId } = await params;
    const user = await requireUser(request);
    const { paper, access } = await loadPaperForUser(prisma, paperId, user);
    const shaped = access === 'editor' ? editorPaper(paper) : access === 'author' ? authorPaper(paper) : reviewerPaper(paper, user.id);
    return successResponse({ paper: shaped, access });
  } catch (error) {
    return handleError(error, 'Fetch paper error');
  }
}
