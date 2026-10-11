import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, requireUser, successResponse } from '@/lib/utils';

// Returns the logged-in user with their current role (roles can change after login).
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { id: true, email: true, name: true, role: true, affiliation: true, country: true },
    });
    return successResponse({ user });
  } catch (error) {
    return handleError(error, 'Me error');
  }
}
