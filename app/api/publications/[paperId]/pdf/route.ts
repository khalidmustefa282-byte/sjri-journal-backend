import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pdfDownloadName } from '@/lib/papers';
import { pdfResponse } from '@/lib/storage';
import { HttpError, handleError } from '@/lib/utils';

// Public PDF of a published paper. ?download=1 forces a download instead of opening in the browser.
export async function GET(request: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
  try {
    const { paperId } = await params;
    const paper = await prisma.paper.findFirst({ where: { id: paperId, status: 'PUBLISHED' } });
    if (!paper || !paper.pdfUrl) throw new HttpError('This PDF is not available.', 404);
    const response = await pdfResponse(paper.pdfUrl, pdfDownloadName(paper), request.nextUrl.searchParams.get('download') !== '1');
    response.headers.set('Cache-Control', 'public, max-age=3600');
    return response;
  } catch (error) {
    return handleError(error, 'Publication PDF error');
  }
}
