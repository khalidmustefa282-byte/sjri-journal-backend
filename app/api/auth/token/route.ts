import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { HttpError, handleError, normalizeEmail, readJson, signToken, successResponse } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const email = normalizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) throw new HttpError('Email and password are required.');

    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    const valid = user ? await bcrypt.compare(password, user.password) : false;
    if (!user || !valid) throw new HttpError('Incorrect email or password.', 401);

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    return successResponse({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    return handleError(error, 'Login error');
  }
}
