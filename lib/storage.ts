import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { HttpError } from './utils';

// PDF storage.
// - Production: Vercel Blob (needs BLOB_READ_WRITE_TOKEN, created automatically when a Blob store
//   is connected to the Vercel project).
// - Local development without a token: files go to ./.uploads (git-ignored).
// The stored reference is saved in Paper.pdfUrl. Blob URLs are never sent to browsers for
// unpublished manuscripts; downloads go through the API so access can be checked.

// Vercel rejects request bodies larger than 4.5 MB, so the real limit is a little below that.
export const MAX_PDF_BYTES = 4.4 * 1024 * 1024;
const LOCAL_PREFIX = 'local:';
const LOCAL_DIR = path.join(process.cwd(), '.uploads');

export function validatePdf(file: FormDataEntryValue | null, required: boolean): File | null {
  if (!file || typeof file === 'string' || file.size === 0) {
    if (required) throw new HttpError('Please attach the manuscript as a PDF file.', 400);
    return null;
  }
  const looksPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!looksPdf) throw new HttpError('The manuscript must be a PDF file.', 400);
  if (file.size > MAX_PDF_BYTES) throw new HttpError('The PDF must be smaller than 4.4 MB.', 413);
  return file;
}

async function assertPdfBytes(bytes: Buffer) {
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new HttpError('This file is not a valid PDF.', 400);
  }
}

export async function savePdf(file: File, folder: 'submissions' | 'published'): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  await assertPdfBytes(bytes);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-80) || 'manuscript.pdf';
  const key = `${folder}/${randomUUID()}-${safeName}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const blob = await put(key, bytes, {
      access: 'public',
      addRandomSuffix: true,
      contentType: 'application/pdf',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  if (process.env.VERCEL) {
    throw new HttpError(
      'File uploads are not set up on the server yet (BLOB_READ_WRITE_TOKEN missing). Please contact info@sjrijournal.org.',
      503,
    );
  }

  const target = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
  return LOCAL_PREFIX + key;
}

/** Returns the PDF as a Response to stream to the browser. */
export async function pdfResponse(stored: string, downloadName: string, inline = true): Promise<Response> {
  const disposition = `${inline ? 'inline' : 'attachment'}; filename="${downloadName.replace(/[^a-zA-Z0-9._ -]+/g, '-')}"`;
  const headers = { 'Content-Type': 'application/pdf', 'Content-Disposition': disposition, 'Cache-Control': 'private, max-age=0' };

  if (stored.startsWith(LOCAL_PREFIX)) {
    const relative = stored.slice(LOCAL_PREFIX.length);
    const target = path.join(LOCAL_DIR, relative);
    if (!target.startsWith(LOCAL_DIR + path.sep)) throw new HttpError('File not found.', 404);
    try {
      const bytes = await fs.readFile(target);
      return new Response(new Uint8Array(bytes), { headers });
    } catch {
      throw new HttpError('The PDF file could not be found.', 404);
    }
  }

  if (!/^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//i.test(stored)) {
    throw new HttpError('The PDF file could not be found.', 404);
  }
  const upstream = await fetch(stored);
  if (!upstream.ok || !upstream.body) throw new HttpError('The PDF file could not be loaded.', 502);
  return new Response(upstream.body, { headers });
}
