import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HttpError, handleError, readJson, requireUser, successResponse } from '@/lib/utils';

const ASSIGNABLE = ['SUBMITTED', 'UNDER_REVIEW', 'REVISIONS_SUBMITTED'];

export async function POST(request: NextRequest) {
  try {
    await requireUser(request, ['EDITOR', 'ADMIN']);
    const body = await readJson(request);
    const paperId = typeof body.paperId === 'string' ? body.paperId : '';
    const reviewerIds = Array.isArray(body.reviewerIds) ? Array.from(new Set(body.reviewerIds.filter((id): id is string => typeof id === 'string'))) : [];
    if (!paperId || reviewerIds.length === 0) throw new HttpError('Choose a paper and at least one reviewer.');

    const paper = await prisma.paper.findUnique({ where: { id: paperId }, select: { id: true, status: true, submittedBy: true } });
    if (!paper) throw new HttpError('Paper not found.', 404);
    if (!ASSIGNABLE.includes(paper.status)) throw new HttpError('Reviewers can only be assigned to papers that are submitted or under review.', 409);

    const reviewers = await prisma.user.findMany({ where: { id: { in: reviewerIds }, role: 'REVIEWER' }, select: { id: true } });
    if (reviewers.length !== reviewerIds.length) throw new HttpError('Every selected person must have a Reviewer account.');
    if (reviewerIds.includes(paper.submittedBy)) throw new HttpError('An author cannot review their own paper.');

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.review.findMany({ where: { paperId, reviewerId: { in: reviewerIds } }, select: { reviewerId: true } });
      const already = new Set(existing.map((r) => r.reviewerId));
      const fresh = reviewerIds.filter((id) => !already.has(id));
      if (fresh.length) await tx.review.createMany({ data: fresh.map((reviewerId) => ({ paperId, reviewerId, decision: 'PENDING' as const })) });
      await tx.paper.update({ where: { id: paperId }, data: { status: 'UNDER_REVIEW' } });
      return { assigned: fresh.length, alreadyAssigned: already.size };
    });

    return successResponse({ ...result, message: 'Reviewers assigned' }, 201);
  } catch (error) {
    return handleError(error, 'Assign reviewer error');
  }
}
