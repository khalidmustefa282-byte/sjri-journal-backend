import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loadPaperForUser } from '@/lib/access';
import { pdfDownloadName } from '@/lib/papers';
import { pdfResponse } from '@/lib/storage';
import { HttpError, handleError, requireUser } from '@/lib/utils';

// Download the manuscript PDF of a paper the user is allowed to see (author, assigned reviewer, editor/admin).
export async function GET(request: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
  try {
    const { paperId } = await params;
    const user = await requireUser(request);
    const { paper } = await loadPaperForUser(prisma, paperId, user);
    if (!paper.pdfUrl) throw new HttpError('No PDF has been uploaded for this paper.', 404);
    return await pdfResponse(paper.pdfUrl, pdfDownloadName(paper), false);
  } catch (error) {
    return handleError(error, 'Paper PDF error');
  }
}
