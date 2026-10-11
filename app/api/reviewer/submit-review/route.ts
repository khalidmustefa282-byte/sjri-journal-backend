import { NextRequest } from 'next/server';
import { ReviewDecision } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError, handleError, optionalInt, readJson, requireUser, str, successResponse } from '@/lib/utils';

const REVIEWABLE = ['UNDER_REVIEW', 'REVISIONS_SUBMITTED', 'SUBMITTED'];

// A reviewer submits (or updates) their review. Only for papers they were assigned to.
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request, ['REVIEWER', 'ADMIN']);
    const body = await readJson(request);
    const paperId = typeof body.paperId === 'string' ? body.paperId : '';
    const decision = body.decision as ReviewDecision;
    if (!paperId || !decision) throw new HttpError('paperId and decision are required.');
    if (!['ACCEPT', 'REJECT', 'REQUEST_REVISIONS'].includes(decision)) throw new HttpError('Recommendation must be accept, reject or request revisions.');
    const comments = str(body.comments, 20000);
    if (!comments) throw new HttpError('Please write your comments for the editor and author.');
    const rating = optionalInt(body.rating, 'Rating', 1, 5);

    const assignment = await prisma.review.findUnique({
      where: { paperId_reviewerId: { paperId, reviewerId: user.id } },
      include: { paper: { select: { status: true } } },
    });
    if (!assignment) throw new HttpError('You have not been assigned to review this paper.', 403);
    if (!REVIEWABLE.includes(assignment.paper.status)) throw new HttpError('This paper is no longer open for review.', 409);

    const review = await prisma.review.update({
      where: { id: assignment.id },
      data: { decision, comments, rating, submittedDate: new Date() },
    });
    return successResponse({ review }, 201);
  } catch (error) {
    return handleError(error, 'Submit review error');
  }
}
