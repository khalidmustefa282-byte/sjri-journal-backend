import { prisma } from '@/lib/prisma';
import { publicPaper } from '@/lib/papers';
import { handleError, successResponse } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// All published papers grouped by year → volume/issue, newest first.
export async function GET() {
  try {
    const papers = await prisma.paper.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ volume: 'desc' }, { issue: 'desc' }, { publishedDate: 'desc' }],
      take: 2000,
    });

    type Issue = { key: string; volume: number | null; issue: number | null; year: number | null; papers: ReturnType<typeof publicPaper>[] };
    const issues = new Map<string, Issue>();
    for (const p of papers) {
      const key = p.volume && p.issue ? `${p.volume}-${p.issue}` : 'unassigned';
      if (!issues.has(key)) issues.set(key, { key, volume: p.volume, issue: p.issue, year: null, papers: [] });
      const entry = issues.get(key)!;
      entry.papers.push(publicPaper(p));
      const y = p.publishedDate?.getUTCFullYear() ?? null;
      if (y && (!entry.year || y > entry.year)) entry.year = y;
    }

    const years = new Map<string, { year: number | null; issues: Issue[] }>();
    for (const issue of issues.values()) {
      const key = String(issue.year ?? 'undated');
      if (!years.has(key)) years.set(key, { year: issue.year, issues: [] });
      years.get(key)!.issues.push(issue);
    }

    const archive = Array.from(years.values()).sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    return successResponse({ archive, totalPapers: papers.length });
  } catch (error) {
    return handleError(error, 'Archive error');
  }
}
