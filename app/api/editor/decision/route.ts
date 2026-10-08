import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, corsHeaders, handleCORS, checkRole } from '@/lib/utils';
import { Role, Decision, PaperStatus } from '@prisma/client';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new Response(null, { headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  try {
    const roleCheck = await checkRole(request, [Role.EDITOR, Role.ADMIN]);
    if (roleCheck.error) {
      return errorResponse(roleCheck.error, roleCheck.status);
    }

    const user = roleCheck.user!;
    const body = await request.json();
    const { paperId, decision, notes } = body;

    if (!paperId || !decision) {
      return errorResponse('paperId and decision are required');
    }

    if (!Object.values(Decision).includes(decision)) {
      return errorResponse('Invalid decision type');
    }

    // Verify paper exists
    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
    });

    if (!paper) {
      return errorResponse('Paper not found', 404);
    }

    // Create decision record
    const editorialDecision = await prisma.editorialDecision.create({
      data: {
        paperId,
        decisionType: decision,
        decidedBy: user.id,
        notes: notes || null,
      },
    });

    // Update paper status based on decision
    let newStatus: PaperStatus = 'SUBMITTED';
    if (decision === 'ACCEPT') newStatus = 'ACCEPTED';
    if (decision === 'REJECT') newStatus = 'REJECTED';
    if (decision === 'REQUEST_REVISIONS') newStatus = 'REVISIONS_REQUESTED';
    if (decision === 'PUBLISH') newStatus = 'PUBLISHED';
    if (decision === 'SCHEDULE') newStatus = 'SCHEDULED';

    await prisma.paper.update({
      where: { id: paperId },
      data: { status: newStatus },
    });

    return successResponse({ decision: editorialDecision }, 201);
  } catch (error) {
    console.error('Decision error:', error);
    return errorResponse('Internal server error', 500);
  }
}
