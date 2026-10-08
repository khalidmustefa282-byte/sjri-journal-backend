import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, corsHeaders, handleCORS } from '@/lib/utils';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new Response(null, { headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, affiliation, country } = body;

    // Validation
    if (!email || !password || !name) {
      return errorResponse('Email, password, and name are required');
    }

    if (!Object.values(Role).includes(role || 'AUTHOR')) {
      return errorResponse('Invalid role');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return errorResponse('User already exists', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'AUTHOR',
        affiliation: affiliation || null,
        country: country || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        affiliation: true,
        country: true,
      },
    });

    return successResponse({ user }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse('Internal server error', 500);
  }
}
