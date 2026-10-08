import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, corsHeaders, handleCORS } from '@/lib/utils';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new Response(null, { headers: corsHeaders() });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const field = searchParams.get('field');
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null;

    const where: any = {
      status: 'PUBLISHED',
    };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { abstract: { contains: q, mode: 'insensitive' } },
        { keywords: { hasSome: [q] } },
      ];
    }

    if (field) {
      where.field = field;
    }

    if (year) {
      where.publishedDate = {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31),
      };
    }

    const papers = await prisma.paper.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, affiliation: true, country: true },
        },
      },
      orderBy: { publishedDate: 'desc' },
      take: 50,
    });

    return successResponse({ papers, count: papers.length });
  } catch (error) {
    console.error('Search publications error:', error);
    return errorResponse('Internal server error', 500);
  }
}
