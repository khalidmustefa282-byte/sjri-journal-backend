import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, corsHeaders, handleCORS, checkRole } from '@/lib/utils';
import { Role } from '@prisma/client';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new Response(null, { headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  try {
    const roleCheck = await checkRole(request, [Role.EDITOR, Role.ADMIN]);
    if (roleCheck.error) {
      return errorResponse(roleCheck.error, roleCheck.status);
    }

    const body = await request.json();
    const { paperId, reviewerIds, deadline } = body;

    if (!paperId || !reviewerIds || !Array.isArray(reviewerIds)) {
      return errorResponse('paperId and reviewerIds array are required');
    }

    // Verify paper exists
    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
    });

    if (!paper) {
      return errorResponse('Paper not found', 404);
    }

    // Create review records for each reviewer
    const reviews = await Promise.all(
      reviewerIds.map((reviewerId: string) =>
        prisma.review.create({
          data: {
            paperId,
            reviewerId,
            decision: 'PENDING',
          },
        })
      )
    );

    // Update paper status
    await prisma.paper.update({
      where: { id: paperId },
      data: { status: 'UNDER_REVIEW' },
    });

    return successResponse({ reviews, message: 'Reviewers assigned' }, 201);
  } catch (error) {
    console.error('Assign reviewer error:', error);
    return errorResponse('Internal server error', 500);
  }
}
