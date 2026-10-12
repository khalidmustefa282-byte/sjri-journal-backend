import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorPaper } from '@/lib/papers';
import { saveFile, validateManuscript } from '@/lib/storage';
import { HttpError, handleError, readForm, requireUser, str, successResponse } from '@/lib/utils';

// Author uploads a revised manuscript after the editor requested revisions.
export async function POST(request: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
  try {
    const { paperId } = await params;
    const user = await requireUser(request);
    const paper = await prisma.paper.findUnique({ where: { id: paperId }, include: { submissions: true } });
    if (!paper || paper.submittedBy !== user.id) throw new HttpError('Paper not found.', 404);
    if (paper.status !== 'REVISIONS_REQUESTED') throw new HttpError('Revisions can only be uploaded after the editor has requested them.', 409);

    const form = await readForm(request);
    const doc = validateManuscript(form);
    const notes = str(form.get('notes'), 5000) || null;
    const pdfUrl = await saveFile(doc, 'submissions');
    const version = `v${paper.submissions.length + 1}`;

    const updated = await prisma.paper.update({
      where: { id: paper.id },
      data: {
        pdfUrl,
        pdfFileName: doc.name.slice(0, 200),
        status: 'REVISIONS_SUBMITTED',
        submissions: { create: { version, status: 'RECEIVED', notes } },
      },
      include: { submissions: { orderBy: { submissionDate: 'asc' } }, reviews: true, decisions: true },
    });

    return successResponse({ paper: authorPaper(updated) }, 201);
  } catch (error) {
    return handleError(error, 'Revision upload error');
  }
}
