import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

// CORS headers are added for all /api routes by proxy.ts.

export class HttpError extends Error {
  constructor(message: string, readonly status: number = 400) {
    super(message);
  }
}

export function errorResponse(message: string, status: number = 400) {
  return Response.json({ error: message }, { status });
}

export function successResponse(data: unknown, status: number = 200) {
  return Response.json(data, { status });
}

/** Turns thrown errors into JSON responses. Unknown errors become a generic 500. */
export function handleError(error: unknown, context: string) {
  if (error instanceof HttpError) return errorResponse(error.message, error.status);
  console.error(`${context}:`, error);
  return errorResponse('Something went wrong on the server. Please try again.', 500);
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('not an object');
    return body as Record<string, unknown>;
  } catch {
    throw new HttpError('The request body must be valid JSON.', 400);
  }
}

export async function readForm(request: Request): Promise<FormData> {
  try {
    return await request.formData();
  } catch {
    throw new HttpError('The request must be sent as a form (multipart/form-data).', 400);
  }
}

export function str(value: unknown, max = 5000): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export function optionalInt(value: unknown, field: string, min = 0, max = 100000): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(`${field} must be a whole number.`, 400);
  return n;
}

export function optionalDate(value: unknown, field: string): Date | null {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) throw new HttpError(`${field} must be a valid date.`, 400);
  return d;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function normalizeEmail(value: unknown): string {
  return str(value, 254).toLowerCase();
}
export function isEmail(value: string) {
  return EMAIL_PATTERN.test(value);
}

export type AuthUser = { id: string; email: string; role: Role };

export function jwtSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new HttpError('Server login is not configured (NEXTAUTH_SECRET missing).', 503);
  }
  return secret;
}

export function signToken(user: AuthUser) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret(), { expiresIn: '7d' });
}

export async function getAuthUser(request: NextRequest | Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 16) return null;
  try {
    const decoded = jwt.verify(authHeader.substring(7), secret) as Partial<AuthUser>;
    if (!decoded.id || !decoded.role || !Object.values(Role).includes(decoded.role)) return null;
    return { id: decoded.id, email: decoded.email ?? '', role: decoded.role };
  } catch {
    return null;
  }
}

/**
 * Requires a logged-in user, optionally with one of the given roles.
 * The role is re-read from the database so a role change (or deleted account) takes effect immediately.
 */
export async function requireUser(request: NextRequest | Request, roles?: Role[]): Promise<AuthUser> {
  const tokenUser = await getAuthUser(request);
  if (!tokenUser) throw new HttpError('Please log in to continue.', 401);
  const { prisma } = await import('./prisma');
  const user = await prisma.user.findUnique({ where: { id: tokenUser.id }, select: { id: true, email: true, role: true } });
  if (!user) throw new HttpError('Your account no longer exists. Please log in again.', 401);
  if (roles && !roles.includes(user.role)) throw new HttpError('You do not have permission to do this.', 403);
  return user;
}

/** Kept for older routes: returns { user } or { error, status }. */
export async function checkRole(request: NextRequest, requiredRoles: Role[]) {
  try {
    return { user: await requireUser(request, requiredRoles) };
  } catch (error) {
    if (error instanceof HttpError) return { error: error.message, status: error.status };
    throw error;
  }
}
