import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { HttpError } from './utils';

// File storage for manuscripts and published papers.
// - Authors submit Word documents (.doc / .docx). Editors check and correct them,
//   convert them to PDF themselves, and publish the final PDF.
// - Only PDFs are shown on the public website.
// - Production: Vercel Blob (BLOB_READ_WRITE_TOKEN). Local development: ./.uploads (git-ignored).
// The stored reference is saved in Paper.pdfUrl (name kept for compatibility; it may point to a Word file
// while the paper is in review). Storage URLs are never sent to browsers; downloads go through the API.

// Vercel rejects request bodies larger than 4.5 MB, so the real limit is a little below that.
export const MAX_FILE_BYTES = 4.4 * 1024 * 1024;
const LOCAL_PREFIX = 'local:';
const LOCAL_DIR = path.join(process.cwd(), '.uploads');

export type FileKind = 'pdf' | 'docx' | 'doc';

const CONTENT_TYPES: Record<FileKind, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
};

/** Works out the file type from a file name or stored reference. */
export function fileKind(nameOrUrl: string | null | undefined): FileKind | null {
  if (!nameOrUrl) return null;
  const clean = nameOrUrl.split('?')[0]!.toLowerCase();
  if (clean.endsWith('.pdf')) return 'pdf';
  if (clean.endsWith('.docx')) return 'docx';
  if (clean.endsWith('.doc')) return 'doc';
  return null;
}

function kindFromBytes(bytes: Buffer): FileKind | null {
  if (bytes.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  // .docx is a ZIP package
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return 'docx';
  // .doc (Word 97-2003) is an OLE compound file
  if (bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) return 'doc';
  return null;
}

function asFile(entry: FormDataEntryValue | null): File | null {
  if (!entry || typeof entry === 'string' || entry.size === 0) return null;
  return entry;
}

function checkSize(file: File) {
  if (file.size > MAX_FILE_BYTES) throw new HttpError('The file must be smaller than 4.4 MB.', 413);
}

/** Manuscripts and revisions from authors: Word only. Reads the "file" field (or "pdf" for older clients). */
export function validateManuscript(form: FormData): File {
  const file = asFile(form.get('file')) ?? asFile(form.get('pdf'));
  if (!file) throw new HttpError('Please attach your manuscript as a Word document (.doc or .docx).', 400);
  const kind = fileKind(file.name);
  if (kind !== 'docx' && kind !== 'doc') {
    throw new HttpError('The manuscript must be a Word document (.doc or .docx), not a PDF or other file.', 400);
  }
  checkSize(file);
  return file;
}

/** Final published papers: PDF only. */
export function validatePdf(file: FormDataEntryValue | null, required: boolean): File | null {
  const f = asFile(file);
  if (!f) {
    if (required) throw new HttpError('Please attach the final PDF.', 400);
    return null;
  }
  if (fileKind(f.name) !== 'pdf' && f.type !== 'application/pdf') throw new HttpError('The final paper must be a PDF file.', 400);
  checkSize(f);
  return f;
}

export async function saveFile(file: File, folder: 'submissions' | 'published'): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const declared = fileKind(file.name) ?? (file.type === 'application/pdf' ? 'pdf' : null);
  const actual = kindFromBytes(bytes);
  if (!declared || !actual || (declared === 'pdf') !== (actual === 'pdf')) {
    throw new HttpError(
      declared === 'pdf' ? 'This file is not a valid PDF.' : 'This file is not a valid Word document. Please save it as .docx and try again.',
      400,
    );
  }
  const ext = declared === 'pdf' ? 'pdf' : actual === 'doc' ? 'doc' : 'docx';
  const base = file.name.replace(/\.(pdf|docx?|DOCX?|PDF)$/i, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-70) || 'manuscript';
  const key = `${folder}/${randomUUID()}-${base}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const blob = await put(key, bytes, {
      access: 'public',
      addRandomSuffix: true,
      contentType: CONTENT_TYPES[ext],
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

/** Kept for older imports. */
export const savePdf = saveFile;

/** Streams a stored file to the browser. */
export async function fileResponse(stored: string, downloadName: string, inline = true): Promise<Response> {
  const kind = fileKind(stored) ?? fileKind(downloadName) ?? 'pdf';
  const safeName = downloadName.replace(/[^a-zA-Z0-9._ -]+/g, '-');
  // Word files can't be shown in the browser, so they are always downloaded.
  const disposition = `${inline && kind === 'pdf' ? 'inline' : 'attachment'}; filename="${safeName}"`;
  const headers = { 'Content-Type': CONTENT_TYPES[kind], 'Content-Disposition': disposition, 'Cache-Control': 'private, max-age=0' };

  if (stored.startsWith(LOCAL_PREFIX)) {
    const relative = stored.slice(LOCAL_PREFIX.length);
    const target = path.join(LOCAL_DIR, relative);
    if (!target.startsWith(LOCAL_DIR + path.sep)) throw new HttpError('File not found.', 404);
    try {
      const bytes = await fs.readFile(target);
      return new Response(new Uint8Array(bytes), { headers });
    } catch {
      throw new HttpError('The file could not be found.', 404);
    }
  }

  if (!/^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//i.test(stored)) {
    throw new HttpError('The file could not be found.', 404);
  }
  const upstream = await fetch(stored);
  if (!upstream.ok || !upstream.body) throw new HttpError('The file could not be loaded.', 502);
  return new Response(upstream.body, { headers });
}

/** Kept for older imports. */
export const pdfResponse = fileResponse;
