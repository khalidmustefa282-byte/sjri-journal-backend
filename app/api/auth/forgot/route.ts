import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { siteUrl } from '@/lib/email';
import { notifyPasswordReset } from '@/lib/notify';
import { createResetToken } from '@/lib/reset';
import { handleError, normalizeEmail, readJson, successResponse } from '@/lib/utils';

// Sends a password reset link. Always gives the same answer so nobody can check which emails have accounts.
export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const email = normalizeEmail(body.email);
    if (email) {
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true, name: true, email: true, password: true },
      });
      if (user) {
        const link = `${siteUrl()}/reset-password?token=${encodeURIComponent(createResetToken(user))}`;
        await notifyPasswordReset(user, link);
      }
    }
    return successResponse({ message: 'If an account exists for this email, a reset link has been sent. Please check your inbox and spam folder.' });
  } catch (error) {
    return handleError(error, 'Forgot password error');
  }
}
