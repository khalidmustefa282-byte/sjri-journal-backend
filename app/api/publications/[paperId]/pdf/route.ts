import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isPdfPaper, pdfDownloadName } from '@/lib/papers';
import { fileResponse } from '@/lib/storage';
import { HttpError, handleError } from '@/lib/utils';

// Public PDF of a published paper. ?download=1 forces a download instead of opening in the browser.
export async function GET(request: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
  try {
    const { paperId } = await params;
    const paper = await prisma.paper.findFirst({ where: { id: paperId, status: 'PUBLISHED' } });
    // The public site only ever serves PDFs, never an author's Word manuscript.
    if (!paper || !paper.pdfUrl || !isPdfPaper(paper)) throw new HttpError('This PDF is not available.', 404);
    const response = await fileResponse(paper.pdfUrl, pdfDownloadName(paper), request.nextUrl.searchParams.get('download') !== '1');
    response.headers.set('Cache-Control', 'public, max-age=3600');
    return response;
  } catch (error) {
    return handleError(error, 'Publication PDF error');
  }
}
