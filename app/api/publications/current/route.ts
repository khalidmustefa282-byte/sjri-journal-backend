import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, corsHeaders, handleCORS } from '@/lib/utils';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new Response(null, { headers: corsHeaders() });
}

export async function GET(request: NextRequest) {
  try {
    const papers = await prisma.paper.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        author: {
          select: { id: true, name: true, affiliation: true, country: true },
        },
      },
      orderBy: { publishedDate: 'desc' },
      take: 20,
    });

    return successResponse({ papers });
  } catch (error) {
    console.error('Fetch publications error:', error);
    return errorResponse('Internal server error', 500);
  }
}
