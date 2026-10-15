import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HttpError, handleError, requireUser, successResponse } from '@/lib/utils';

// Admin only: permanently delete a paper (for test papers or spam), with its reviews, decisions and versions.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
  try {
    await requireUser(request, ['ADMIN']);
    const { paperId } = await params;
    const paper = await prisma.paper.findUnique({ where: { id: paperId }, select: { id: true, title: true, pdfUrl: true } });
    if (!paper) throw new HttpError('Paper not found.', 404);

    await prisma.paper.delete({ where: { id: paperId } });

    // Remove the stored file too (best effort).
    if (paper.pdfUrl && process.env.BLOB_READ_WRITE_TOKEN && paper.pdfUrl.startsWith('https://')) {
      try {
        const { del } = await import('@vercel/blob');
        await del(paper.pdfUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
      } catch (error) {
        console.error('Could not delete stored file:', error);
      }
    }
    return successResponse({ deleted: paper.id, title: paper.title });
  } catch (error) {
    return handleError(error, 'Delete paper error');
  }
}
