import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, corsHeaders, handleCORS } from '@/lib/utils';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new Response(null, { headers: corsHeaders() });
}

export async function GET(request: NextRequest) {
  try {
    const currentYear = new Date().getFullYear();
    const currentYearStart = new Date(currentYear, 0, 1);
    const currentYearEnd = new Date(currentYear, 11, 31);

    // Papers published this year
    const papersThisYear = await prisma.paper.count({
      where: {
        status: 'PUBLISHED',
        publishedDate: {
          gte: currentYearStart,
          lte: currentYearEnd,
        },
      },
    });

    // Unique countries from authors
    const papers = await prisma.paper.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        author: {
          select: { country: true },
        },
      },
    });

    const uniqueCountries = new Set(
      papers
        .map((p: any) => p.author.country)
        .filter((c: string | null) => c)
    );

    const countriesCount = uniqueCountries.size;

    // Average days from submission to acceptance
    const decisions = await prisma.editorialDecision.findMany({
      where: {
        decisionType: 'ACCEPT',
      },
      include: {
        paper: {
          select: { submissionDate: true },
        },
      },
    });

    const avgDecisionDays =
      decisions.length > 0
        ? Math.round(
            decisions.reduce((acc: number, d: any) => {
              const days = Math.floor(
                (d.decisionDate.getTime() - d.paper.submissionDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              return acc + days;
            }, 0) / decisions.length
          )
        : 0;

    return successResponse({
      stats: {
        papersThisYear,
        countriesCount,
        avgDecisionDays,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return errorResponse('Internal server error', 500);
  }
}
