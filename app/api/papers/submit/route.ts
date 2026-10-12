import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorPaper, parseAuthorsField, parseKeywords } from '@/lib/papers';
import { saveFile, validateManuscript } from '@/lib/storage';
import { HttpError, handleError, readForm, requireUser, str, successResponse } from '@/lib/utils';

// Author submits a new manuscript (multipart form with a Word document in the "file" field).
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const form = await readForm(request);

    const title = str(form.get('title'), 300);
    const abstract = str(form.get('abstract'), 10000);
    const field = str(form.get('field'), 120);
    const keywords = parseKeywords(form.get('keywords'));
    const authors = parseAuthorsField(form.get('authors'));

    if (!title || !abstract || !field) throw new HttpError('Title, abstract and research field are required.');
    if (!keywords.length) throw new HttpError('Add at least one keyword.');
    if (!authors) throw new HttpError('Add at least one author with a name.');
    const doc = validateManuscript(form);

    const pdfUrl = await saveFile(doc, 'submissions');

    const paper = await prisma.paper.create({
      data: {
        title,
        abstract,
        keywords,
        authors,
        field,
        pdfUrl,
        pdfFileName: doc.name.slice(0, 200),
        submittedBy: user.id,
        status: 'SUBMITTED',
        submissions: { create: { version: 'v1', status: 'RECEIVED' } },
      },
      include: { submissions: true },
    });

    return successResponse({ paper: authorPaper(paper) }, 201);
  } catch (error) {
    return handleError(error, 'Paper submission error');
  }
}
