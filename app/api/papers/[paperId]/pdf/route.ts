import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loadPaperForUser } from '@/lib/access';
import { pdfDownloadName } from '@/lib/papers';
import { fileResponse } from '@/lib/storage';
import { HttpError, handleError, requireUser } from '@/lib/utils';

// Download the current manuscript file (Word during review, PDF once published) of a paper the user is allowed to see (author, assigned reviewer, editor/admin).
export async function GET(request: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
  try {
    const { paperId } = await params;
    const user = await requireUser(request);
    const { paper } = await loadPaperForUser(prisma, paperId, user);
    if (!paper.pdfUrl) throw new HttpError('No file has been uploaded for this paper.', 404);
    return await fileResponse(paper.pdfUrl, pdfDownloadName(paper), false);
  } catch (error) {
    return handleError(error, 'Paper PDF error');
  }
}
