import { prisma } from '@/lib/prisma';
import { normalizeAuthors } from '@/lib/papers';
import { handleError, successResponse } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Real homepage numbers, calculated from the database.
export async function GET() {
  try {
    const year = new Date().getUTCFullYear();
    const papersThisYear = await prisma.paper.count({
      where: { status: 'PUBLISHED', publishedDate: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
    });
    const totalPublished = await prisma.paper.count({ where: { status: 'PUBLISHED' } });

    // Countries of the people who submitted published papers (direct publications by the office are skipped).
    const published = await prisma.paper.findMany({
      where: { status: 'PUBLISHED', author: { role: 'AUTHOR' } },
      select: { author: { select: { country: true } } },
    });
    const countriesCount = new Set(published.map((p) => p.author.country?.trim().toLowerCase()).filter(Boolean)).size;

    // Average days from submission to the first editorial decision.
    const decided = await prisma.paper.findMany({
      where: { decisions: { some: { decisionType: { in: ['ACCEPT', 'REJECT', 'REQUEST_REVISIONS'] } } } },
      select: { submissionDate: true, decisions: { where: { decisionType: { in: ['ACCEPT', 'REJECT', 'REQUEST_REVISIONS'] } }, orderBy: { decisionDate: 'asc' }, take: 1, select: { decisionDate: true } } },
    });
    const days = decided
      .map((p) => (p.decisions[0]!.decisionDate.getTime() - p.submissionDate.getTime()) / 86400000)
      .filter((d) => d >= 0);
    const avgDecisionDays = days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null;

    // Number of distinct author names listed on published papers.
    const authorNames = new Set(
      (await prisma.paper.findMany({ where: { status: 'PUBLISHED' }, select: { authors: true } }))
        .flatMap((p) => normalizeAuthors(p.authors).map((a) => a.name.toLowerCase())),
    );

    return successResponse({
      stats: { papersThisYear, totalPublished, countriesCount, avgDecisionDays, authorsCount: authorNames.size, decisionsSample: days.length },
    });
  } catch (error) {
    return handleError(error, 'Stats error');
  }
}
