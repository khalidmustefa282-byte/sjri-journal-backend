import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, corsHeaders, handleCORS, getAuthUser } from '@/lib/utils';
import { Role } from '@prisma/client';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new Response(null, { headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    if (user.role !== Role.REVIEWER && user.role !== Role.ADMIN) {
      return errorResponse('Forbidden', 403);
    }

    const body = await request.json();
    const { paperId, decision, comments, rating } = body;

    if (!paperId || !decision) {
      return errorResponse('paperId and decision are required');
    }

    // Verify paper exists
    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
    });

    if (!paper) {
      return errorResponse('Paper not found', 404);
    }

    // Create or update review
    const review = await prisma.review.upsert({
      where: {
        paperId_reviewerId: {
          paperId,
          reviewerId: user.id,
        },
      },
      create: {
        paperId,
        reviewerId: user.id,
        decision,
        comments: comments || null,
        rating: rating || null,
        submittedDate: new Date(),
      },
      update: {
        decision,
        comments: comments || null,
        rating: rating || null,
        submittedDate: new Date(),
      },
    });

    return successResponse({ review }, 201);
  } catch (error) {
    console.error('Submit review error:', error);
    return errorResponse('Internal server error', 500);
  }
}
