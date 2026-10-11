import { NextRequest } from 'next/server';
import { Decision, PaperStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError, handleError, optionalDate, optionalInt, readJson, requireUser, str, successResponse } from '@/lib/utils';

const NEXT_STATUS: Record<Decision, PaperStatus> = {
  ACCEPT: 'ACCEPTED',
  REJECT: 'REJECTED',
  REQUEST_REVISIONS: 'REVISIONS_REQUESTED',
  SCHEDULE: 'SCHEDULED',
  PUBLISH: 'PUBLISHED',
};

// Which decisions are allowed from each status (keeps the workflow sensible).
const ALLOWED_FROM: Record<Decision, PaperStatus[]> = {
  ACCEPT: ['SUBMITTED', 'UNDER_REVIEW', 'REVISIONS_SUBMITTED'],
  REJECT: ['SUBMITTED', 'UNDER_REVIEW', 'REVISIONS_SUBMITTED', 'REVISIONS_REQUESTED', 'ACCEPTED'],
  REQUEST_REVISIONS: ['SUBMITTED', 'UNDER_REVIEW', 'REVISIONS_SUBMITTED'],
  SCHEDULE: ['ACCEPTED', 'SCHEDULED'],
  PUBLISH: ['ACCEPTED', 'SCHEDULED'],
};

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request, ['EDITOR', 'ADMIN']);
    const body = await readJson(request);
    const paperId = typeof body.paperId === 'string' ? body.paperId : '';
    const decision = body.decision as Decision;
    if (!paperId || !decision) throw new HttpError('paperId and decision are required.');
    if (!Object.values(Decision).includes(decision)) throw new HttpError('Unknown decision.');
    const notes = str(body.notes, 10000) || null;

    const paper = await prisma.paper.findUnique({ where: { id: paperId } });
    if (!paper) throw new HttpError('Paper not found.', 404);
    if (!ALLOWED_FROM[decision].includes(paper.status)) {
      throw new HttpError(`A paper that is ${paper.status.toLowerCase().replace(/_/g, ' ')} cannot be given the decision "${decision.toLowerCase().replace(/_/g, ' ')}".`, 409);
    }

    const update: Prisma.PaperUpdateInput = { status: NEXT_STATUS[decision] };
    if (decision === 'SCHEDULE' || decision === 'PUBLISH') {
      const volume = optionalInt(body.volume, 'Volume', 1, 1000);
      const issue = optionalInt(body.issue, 'Issue', 1, 100);
      if (volume === null || issue === null) throw new HttpError('Volume and issue numbers are required to schedule or publish.');
      update.volume = volume;
      update.issue = issue;
      const pages = str(body.pages, 30);
      const doi = str(body.doi, 200);
      if (pages) update.pages = pages;
      if (doi) update.doi = doi;
      if (decision === 'PUBLISH') {
        if (!paper.pdfUrl) throw new HttpError('Upload the final PDF before publishing.', 409);
        update.publishedDate = optionalDate(body.publishedDate, 'Publication date') ?? new Date();
      } else {
        // For SCHEDULE, publishedDate holds the planned publication date (shown on the schedule).
        update.publishedDate = optionalDate(body.publishedDate, 'Planned publication date');
      }
    }

    const [editorialDecision] = await prisma.$transaction([
      prisma.editorialDecision.create({ data: { paperId, decisionType: decision, decidedBy: user.id, notes } }),
      prisma.paper.update({ where: { id: paperId }, data: update }),
    ]);

    return successResponse({ decision: editorialDecision, status: NEXT_STATUS[decision] }, 201);
  } catch (error) {
    return handleError(error, 'Editorial decision error');
  }
}
