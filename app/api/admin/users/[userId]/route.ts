import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError, handleError, readJson, requireUser, successResponse } from '@/lib/utils';

// Only an Admin can change someone's role.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const admin = await requireUser(request, ['ADMIN']);
    const { userId } = await params;
    const body = await readJson(request);
    const role = body.role as Role;
    if (!Object.values(Role).includes(role)) throw new HttpError('Role must be AUTHOR, REVIEWER, EDITOR or ADMIN.');
    if (userId === admin.id && role !== 'ADMIN') throw new HttpError('You cannot remove your own admin role. Ask another admin to do it.', 409);

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) throw new HttpError('User not found.', 404);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true, affiliation: true, country: true, createdAt: true },
    });
    return successResponse({ user });
  } catch (error) {
    return handleError(error, 'Change role error');
  }
}
