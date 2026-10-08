import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, corsHeaders, handleCORS, getAuthUser } from '@/lib/utils';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new Response(null, { headers: corsHeaders() });
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const papers = await prisma.paper.findMany({
      where: { submittedBy: user.id },
      include: {
        submissions: true,
        reviews: true,
        decisions: true,
      },
    });

    return successResponse({ papers });
  } catch (error) {
    console.error('Fetch submissions error:', error);
    return errorResponse('Internal server error', 500);
  }
}
