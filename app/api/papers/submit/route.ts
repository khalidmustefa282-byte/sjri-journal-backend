import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, corsHeaders, handleCORS, getAuthUser, checkRole } from '@/lib/utils';
import { Role } from '@prisma/client';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new Response(null, { headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    // Parse form data
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const abstract = formData.get('abstract') as string;
    const keywords = formData.get('keywords') as string;
    const authors = formData.get('authors') as string;
    const field = formData.get('field') as string;
    const pdfFile = formData.get('pdf') as File;

    // Validation
    if (!title || !abstract || !keywords || !authors || !field) {
      return errorResponse('Missing required fields');
    }

    // Validate PDF
    if (pdfFile) {
      if (!pdfFile.type.includes('pdf')) {
        return errorResponse('File must be a PDF');
      }
      if (pdfFile.size > 50 * 1024 * 1024) {
        return errorResponse('File must be less than 50MB');
      }
    }

    // Create paper
    const paper = await prisma.paper.create({
      data: {
        title,
        abstract,
        keywords: keywords.split(',').map((k) => k.trim()),
        authors: JSON.parse(authors),
        field,
        pdfFileName: pdfFile?.name,
        submittedBy: user.id,
        status: 'SUBMITTED',
      },
      include: {
        author: {
          select: { id: true, email: true, name: true, role: true },
        },
      },
    });

    // Create submission record
    await prisma.submission.create({
      data: {
        paperId: paper.id,
        version: 'v1',
        status: 'RECEIVED',
      },
    });

    return successResponse({ paper }, 201);
  } catch (error) {
    console.error('Paper submission error:', error);
    return errorResponse('Internal server error', 500);
  }
}
