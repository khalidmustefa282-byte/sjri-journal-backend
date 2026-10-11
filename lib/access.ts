import type { PrismaClient } from '@prisma/client';
import { HttpError, type AuthUser } from './utils';

export type PaperAccess = 'editor' | 'author' | 'reviewer';

/** Loads a paper with its relations and checks the user may see it. Returns 404 (not 403) to avoid revealing ids. */
export async function loadPaperForUser(prisma: PrismaClient, paperId: string, user: AuthUser) {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    include: {
      author: { select: { id: true, name: true, email: true, affiliation: true, country: true } },
      submissions: { orderBy: { submissionDate: 'asc' } },
      reviews: { include: { reviewer: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' } },
      decisions: { orderBy: { decisionDate: 'asc' } },
    },
  });
  if (!paper) throw new HttpError('Paper not found.', 404);

  let access: PaperAccess | null = null;
  if (user.role === 'EDITOR' || user.role === 'ADMIN') access = 'editor';
  else if (paper.submittedBy === user.id) access = 'author';
  else if (paper.reviews.some((r) => r.reviewerId === user.id)) access = 'reviewer';
  if (!access) throw new HttpError('Paper not found.', 404);

  return { paper, access };
}
