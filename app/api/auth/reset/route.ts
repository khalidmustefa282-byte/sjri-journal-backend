import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { fingerprintMatches, readResetToken } from '@/lib/reset';
import { HttpError, handleError, readJson, successResponse } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const token = typeof body.token === 'string' ? body.token : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (password.length < 8 || password.length > 200) throw new HttpError('The new password must be at least 8 characters.');

    const data = readResetToken(token);
    const user = data ? await prisma.user.findUnique({ where: { id: data.userId }, select: { id: true, password: true } }) : null;
    if (!data || !user || !fingerprintMatches(user.password, data.pv)) {
      throw new HttpError('This reset link has expired or was already used. Please request a new one.', 400);
    }

    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(password, 10) } });
    return successResponse({ message: 'Your password has been changed. You can now log in.' });
  } catch (error) {
    return handleError(error, 'Reset password error');
  }
}
