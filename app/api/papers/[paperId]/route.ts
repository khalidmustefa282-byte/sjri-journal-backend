import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, corsHeaders, handleCORS, getAuthUser } from '@/lib/utils';
import { Role, Review } from '@prisma/client';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new Response(null, { headers: corsHeaders() });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paperId: string }> }
) {
  const { paperId } = await params;
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
      include: {
        author: {
          select: { id: true, email: true, name: true },
        },
        submissions: true,
        reviews: true,
        decisions: true,
      },
    });

    if (!paper) {
      return errorResponse('Paper not found', 404);
    }

    // Access control
    const isAuthor = paper.submittedBy === user.id;
    const isEditorOrAdmin = [Role.EDITOR, Role.ADMIN].includes(user.role as Role);
    const isReviewer = paper.reviews.some((r: Review) => r.reviewerId === user.id);

    if (!isAuthor && !isEditorOrAdmin && !isReviewer) {
      return errorResponse('Forbidden', 403);
    }

    return successResponse({ paper });
  } catch (error) {
    console.error('Fetch paper error:', error);
    return errorResponse('Internal server error', 500);
  }
}
