import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { editorPaper, parseAuthorsField, parseKeywords } from '@/lib/papers';
import { savePdf, validatePdf } from '@/lib/storage';
import { HttpError, handleError, optionalDate, optionalInt, readForm, requireUser, str, successResponse } from '@/lib/utils';

// Publish a finished paper in one step: the editor/admin uploads the final PDF with its details.
// Used for Phase 1 (papers received by email/WhatsApp) and for back-issues.
// Optional paperId: attach the final PDF to an existing accepted/scheduled submission and publish it.
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request, ['ADMIN', 'EDITOR']);
    const form = await readForm(request);
    const paperId = str(form.get('paperId'), 60);
    const volume = optionalInt(form.get('volume'), 'Volume', 1, 1000);
    const issue = optionalInt(form.get('issue'), 'Issue', 1, 100);
    if (volume === null || issue === null) throw new HttpError('Volume and issue numbers are required.');
    const publishedDate = optionalDate(form.get('publishedDate'), 'Publication date') ?? new Date();
    const pages = str(form.get('pages'), 30) || null;
    const doi = str(form.get('doi'), 200) || null;

    if (paperId) {
      const existing = await prisma.paper.findUnique({ where: { id: paperId } });
      if (!existing) throw new HttpError('Paper not found.', 404);
      if (!['ACCEPTED', 'SCHEDULED', 'PUBLISHED'].includes(existing.status)) throw new HttpError('Only accepted or scheduled papers can be published.', 409);
      const pdf = validatePdf(form.get('pdf'), !existing.pdfUrl);
      const pdfUrl = pdf ? await savePdf(pdf, 'published') : existing.pdfUrl;
      const [, paper] = await prisma.$transaction([
        prisma.editorialDecision.create({ data: { paperId, decisionType: 'PUBLISH', decidedBy: user.id, notes: str(form.get('notes'), 5000) || null } }),
        prisma.paper.update({
          where: { id: paperId },
          data: { status: 'PUBLISHED', volume, issue, pages, doi, publishedDate, pdfUrl, ...(pdf ? { pdfFileName: pdf.name.slice(0, 200) } : {}) },
        }),
      ]);
      return successResponse({ paper: editorPaper(paper) }, 200);
    }

    const title = str(form.get('title'), 300);
    const abstract = str(form.get('abstract'), 10000);
    const field = str(form.get('field'), 120);
    const keywords = parseKeywords(form.get('keywords'));
    const authors = parseAuthorsField(form.get('authors'));
    if (!title || !abstract || !field) throw new HttpError('Title, abstract and research field are required.');
    if (!authors) throw new HttpError('Add at least one author with a name.');
    const pdf = validatePdf(form.get('pdf'), true)!;
    const pdfUrl = await savePdf(pdf, 'published');

    const paper = await prisma.paper.create({
      data: {
        title,
        abstract,
        keywords,
        authors,
        field,
        pdfUrl,
        pdfFileName: pdf.name.slice(0, 200),
        submittedBy: user.id,
        status: 'PUBLISHED',
        volume,
        issue,
        pages,
        doi,
        publishedDate,
        submissionDate: publishedDate,
        submissions: { create: { version: 'v1', status: 'REVIEW_COMPLETE', notes: 'Published directly by the editorial office.' } },
        decisions: { create: { decisionType: 'PUBLISH', decidedBy: user.id, notes: 'Published directly by the editorial office.' } },
      },
    });

    return successResponse({ paper: editorPaper(paper) }, 201);
  } catch (error) {
    return handleError(error, 'Admin publish error');
  }
}
