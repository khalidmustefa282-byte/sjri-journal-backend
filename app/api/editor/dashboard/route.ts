import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, corsHeaders, handleCORS, checkRole } from '@/lib/utils';
import { Role } from '@prisma/client';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new Response(null, { headers: corsHeaders() });
}

export async function GET(request: NextRequest) {
  try {
    const roleCheck = await checkRole(request, [Role.EDITOR, Role.ADMIN]);
    if (roleCheck.error) {
      return errorResponse(roleCheck.error, roleCheck.status);
    }

    const [
      total,
      submitted,
      underReview,
      published,
      scheduled,
    ] = await Promise.all([
      prisma.paper.count(),
      prisma.paper.count({ where: { status: 'SUBMITTED' } }),
      prisma.paper.count({ where: { status: 'UNDER_REVIEW' } }),
      prisma.paper.count({ where: { status: 'PUBLISHED' } }),
      prisma.paper.count({ where: { status: 'SCHEDULED' } }),
    ]);

    return successResponse({
      stats: {
        total,
        submitted,
        underReview,
        published,
        scheduled,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return errorResponse('Internal server error', 500);
  }
}
