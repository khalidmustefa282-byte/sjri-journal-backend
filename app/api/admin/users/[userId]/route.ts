import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError, handleError, readJson, requireUser, successResponse } from '@/lib/utils';

// Admin-only account management:
//   { "role": "REVIEWER" }        change someone's role
//   { "password": "new-password" } set a new password for someone who forgot theirs
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const admin = await requireUser(request, ['ADMIN']);
    const { userId } = await params;
    const body = await readJson(request);
    const data: Prisma.UserUpdateInput = {};

    if (body.role !== undefined) {
      const role = body.role as Role;
      if (!Object.values(Role).includes(role)) throw new HttpError('Role must be AUTHOR, REVIEWER, EDITOR or ADMIN.');
      if (userId === admin.id && role !== 'ADMIN') throw new HttpError('You cannot remove your own admin role. Ask another admin to do it.', 409);
      data.role = role;
    }
    if (body.password !== undefined) {
      const password = typeof body.password === 'string' ? body.password : '';
      if (password.length < 8 || password.length > 200) throw new HttpError('The new password must be at least 8 characters.');
      data.password = await bcrypt.hash(password, 10);
    }
    if (!Object.keys(data).length) throw new HttpError('Nothing to change. Send a role or a password.');

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) throw new HttpError('User not found.', 404);

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, role: true, affiliation: true, country: true, createdAt: true },
    });
    return successResponse({ user });
  } catch (error) {
    return handleError(error, 'Admin update user error');
  }
}
