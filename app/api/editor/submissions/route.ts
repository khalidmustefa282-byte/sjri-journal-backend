import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, corsHeaders, handleCORS, checkRole } from '@/lib/utils';
import { Role, PaperStatus } from '@prisma/client';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new Response(null, { headers: corsHeaders() });
}

export async function GET(request: NextRequest) {
  try {
    const roleCheck = await checkRole(request, [Role.EDITOR, Role.ADMIN]);
    if (roleCheck.error) {
      return errorResponse(roleCheck.error, roleCheck.status);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = status ? { status: status as PaperStatus } : undefined;

    const papers = await prisma.paper.findMany({
      where,
      include: {
        author: {
          select: { id: true, email: true, name: true },
        },
        reviews: {
          select: {
            id: true,
            reviewerId: true,
            decision: true,
            rating: true,
          },
        },
        decisions: {
          select: {
            id: true,
            decisionType: true,
            decidedBy: true,
          },
        },
      },
      orderBy: { submissionDate: 'desc' },
    });

    return successResponse({ papers });
  } catch (error) {
    console.error('Fetch submissions error:', error);
    return errorResponse('Internal server error', 500);
  }
}
