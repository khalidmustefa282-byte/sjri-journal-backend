import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { HttpError, handleError, isEmail, normalizeEmail, readJson, str, successResponse } from '@/lib/utils';

export const MIN_PASSWORD_LENGTH = 8;

// Public registration always creates an AUTHOR account.
// Any "role" sent by the browser is ignored on purpose; only an Admin can change roles
// (PATCH /api/admin/users/[userId]).
export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const email = normalizeEmail(body.email);
    const name = str(body.name, 120);
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password || !name) throw new HttpError('Name, email and password are required.');
    if (!isEmail(email)) throw new HttpError('Please enter a valid email address.');
    if (password.length < MIN_PASSWORD_LENGTH) throw new HttpError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (password.length > 200) throw new HttpError('Password is too long.');

    const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } });
    if (existing) throw new HttpError('An account with this email already exists. Please log in instead.', 409);

    const user = await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 10),
        name,
        role: 'AUTHOR',
        affiliation: str(body.affiliation, 200) || null,
        country: str(body.country, 80) || null,
      },
      select: { id: true, email: true, name: true, role: true, affiliation: true, country: true },
    });

    return successResponse({ user }, 201);
  } catch (error) {
    return handleError(error, 'Registration error');
  }
}
