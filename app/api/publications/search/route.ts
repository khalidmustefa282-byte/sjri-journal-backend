import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { publicPaper } from '@/lib/papers';
import { handleError, successResponse } from '@/lib/utils';

// Search published papers by title, abstract, keyword or author name.
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const q = (params.get('q') ?? '').trim().slice(0, 200);
    const field = (params.get('field') ?? '').trim();
    const yearRaw = Number(params.get('year'));
    const year = Number.isInteger(yearRaw) && yearRaw > 1900 && yearRaw < 3000 ? yearRaw : null;

    const where: Prisma.PaperWhereInput = { status: 'PUBLISHED' };
    if (field) where.field = field;
    if (year) where.publishedDate = { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };

    let papers = await prisma.paper.findMany({ where, orderBy: { publishedDate: 'desc' }, take: 500 });

    if (q) {
      const needle = q.toLowerCase();
      // Authors are stored as JSON, so matching is done here (the journal's catalogue is small).
      papers = papers.filter((p) => {
        const authors = JSON.stringify(p.authors ?? '').toLowerCase();
        return (
          p.title.toLowerCase().includes(needle) ||
          p.abstract.toLowerCase().includes(needle) ||
          p.keywords.some((k) => k.toLowerCase().includes(needle)) ||
          authors.includes(needle) ||
          (p.doi ?? '').toLowerCase().includes(needle)
        );
      });
    }

    const results = papers.slice(0, 50).map(publicPaper);
    return successResponse({ papers: results, count: papers.length });
  } catch (error) {
    return handleError(error, 'Search publications error');
  }
}
