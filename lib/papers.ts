import type { Paper, Review, EditorialDecision, Submission, User } from '@prisma/client';
import { fileKind } from './storage';

// Shapes paper records for each audience so private details never leak:
// - public readers: published papers only, no reviews, no internal ids
// - authors: their own papers, reviewer identities hidden (double-anonymous review)
// - reviewers: the manuscript without the submitting author's account details
// - editors/admins: everything

export type PaperAuthor = { name: string; email?: string; affiliation?: string; orcid?: string; corresponding?: boolean };

export function normalizeAuthors(value: unknown): PaperAuthor[] {
  let list: unknown = value;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object')
    .map((a) => ({
      name: String(a.name ?? '').trim(),
      ...(a.email ? { email: String(a.email).trim() } : {}),
      ...(a.affiliation ? { affiliation: String(a.affiliation).trim() } : {}),
      ...(a.orcid ? { orcid: String(a.orcid).trim() } : {}),
      ...(a.corresponding ? { corresponding: true } : {}),
    }))
    .filter((a) => a.name);
}

/** Parses the "authors" form field (JSON array) and validates it. */
export function parseAuthorsField(raw: unknown): PaperAuthor[] | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const authors = normalizeAuthors(JSON.parse(raw)).slice(0, 30);
    return authors.length ? authors : null;
  } catch {
    return null;
  }
}

export function parseKeywords(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  return Array.from(new Set(raw.split(',').map((k) => k.trim()).filter(Boolean))).slice(0, 15);
}

type PaperWith = Paper & {
  author?: Pick<User, 'id' | 'name' | 'email' | 'affiliation' | 'country'> | null;
  reviews?: (Review & { reviewer?: Pick<User, 'id' | 'name' | 'email'> | null })[];
  decisions?: EditorialDecision[];
  submissions?: Submission[];
};

const base = (p: PaperWith) => ({
  id: p.id,
  title: p.title,
  abstract: p.abstract,
  keywords: p.keywords,
  authors: normalizeAuthors(p.authors),
  field: p.field,
  status: p.status,
  submissionDate: p.submissionDate,
  publishedDate: p.publishedDate,
  doi: p.doi,
  volume: p.volume,
  issue: p.issue,
  pages: p.pages,
  pdfFileName: p.pdfFileName,
  // The current file: a Word manuscript during review, the final PDF once published.
  hasFile: Boolean(p.pdfUrl),
  fileType: p.pdfUrl ? (fileKind(p.pdfFileName) ?? fileKind(p.pdfUrl) ?? 'pdf') : null,
  hasPdf: Boolean(p.pdfUrl) && (fileKind(p.pdfFileName) ?? fileKind(p.pdfUrl)) === 'pdf',
});

export function publicPaper(p: PaperWith) {
  const { pdfFileName, ...rest } = base(p);
  return { ...rest, pdfFileName };
}

const DECIDED = ['REVISIONS_REQUESTED', 'REVISIONS_SUBMITTED', 'ACCEPTED', 'REJECTED', 'SCHEDULED', 'PUBLISHED'];

export function authorPaper(p: PaperWith) {
  // Reviewer comments are shared (anonymously) only after the editor has made a decision.
  const shareReviews = DECIDED.includes(p.status);
  const reviews = (p.reviews ?? [])
    .filter((r) => r.submittedDate && shareReviews)
    .map((r, i) => ({ id: r.id, label: `Reviewer ${i + 1}`, decision: r.decision, comments: r.comments, submittedDate: r.submittedDate }));
  return {
    ...base(p),
    reviews,
    decisions: (p.decisions ?? []).map((d) => ({ id: d.id, decisionType: d.decisionType, notes: d.notes, decisionDate: d.decisionDate })),
    submissions: (p.submissions ?? []).map((s) => ({ id: s.id, version: s.version, submissionDate: s.submissionDate, status: s.status, notes: s.notes })),
  };
}

export function reviewerPaper(p: PaperWith, reviewerId: string) {
  const own = (p.reviews ?? []).find((r) => r.reviewerId === reviewerId);
  return {
    // Double-anonymous: no author names, emails or affiliations for reviewers.
    id: p.id,
    title: p.title,
    abstract: p.abstract,
    keywords: p.keywords,
    field: p.field,
    status: p.status,
    submissionDate: p.submissionDate,
    hasFile: Boolean(p.pdfUrl),
    fileType: p.pdfUrl ? (fileKind(p.pdfFileName) ?? fileKind(p.pdfUrl) ?? 'pdf') : null,
    hasPdf: Boolean(p.pdfUrl) && (fileKind(p.pdfFileName) ?? fileKind(p.pdfUrl)) === 'pdf',
    myReview: own
      ? { id: own.id, decision: own.decision, comments: own.comments, rating: own.rating, submittedDate: own.submittedDate, assignedDate: own.createdAt }
      : null,
  };
}

export function editorPaper(p: PaperWith) {
  return {
    ...base(p),
    submittedBy: p.author ? { id: p.author.id, name: p.author.name, email: p.author.email, affiliation: p.author.affiliation, country: p.author.country } : null,
    reviews: (p.reviews ?? []).map((r) => ({
      id: r.id,
      reviewer: r.reviewer ? { id: r.reviewer.id, name: r.reviewer.name, email: r.reviewer.email } : { id: r.reviewerId, name: 'Reviewer', email: '' },
      decision: r.decision,
      comments: r.comments,
      rating: r.rating,
      submittedDate: r.submittedDate,
      assignedDate: r.createdAt,
    })),
    decisions: (p.decisions ?? []).map((d) => ({ id: d.id, decisionType: d.decisionType, notes: d.notes, decisionDate: d.decisionDate, decidedBy: d.decidedBy })),
    submissions: (p.submissions ?? []).map((s) => ({ id: s.id, version: s.version, submissionDate: s.submissionDate, status: s.status, notes: s.notes })),
  };
}

export function pdfDownloadName(p: Pick<Paper, 'id' | 'title' | 'pdfFileName' | 'pdfUrl'>) {
  const slug = p.title.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'paper';
  const ext = fileKind(p.pdfFileName) ?? fileKind(p.pdfUrl) ?? 'pdf';
  return `SJRI-${p.id.slice(-6).toUpperCase()}-${slug}.${ext}`;
}

export function isPdfPaper(p: Pick<Paper, 'pdfFileName' | 'pdfUrl'>) {
  return Boolean(p.pdfUrl) && (fileKind(p.pdfFileName) ?? fileKind(p.pdfUrl)) === 'pdf';
}
