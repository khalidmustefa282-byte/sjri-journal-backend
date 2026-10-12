import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError, handleError, requireUser, successResponse } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, ['ADMIN']);
    const role = request.nextUrl.searchParams.get('role');
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim();
    if (role && !Object.values(Role).includes(role as Role)) throw new HttpError('Unknown role filter.');
    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role: role as Role } : {}),
        ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}),
      },
      select: { id: true, name: true, email: true, role: true, affiliation: true, country: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return successResponse({ users });
  } catch (error) {
    return handleError(error, 'Admin users error');
  }
}
