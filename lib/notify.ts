import type { Decision } from '@prisma/client';
import { editorialAddresses, mid, sendEmail, siteUrl, type Attachment } from './email';

// All journal notification emails in one place, in plain English.

type PaperInfo = { id: string; title: string };
type Person = { name: string; email: string };

export async function notifySubmission(paper: PaperInfo & { field: string; abstract: string; authorsLine: string }, author: Person, file: Attachment) {
  const id = mid(paper.id);
  await Promise.all([
    sendEmail({
      to: author.email,
      subject: `${id}: we received your manuscript`,
      text: `Dear ${author.name},

Thank you for submitting your manuscript to the South Journal of Research and Innovation.

Manuscript ID: ${id}
Title: ${paper.title}

The editorial office will screen your manuscript and send it for double-blind peer review. You can follow its status at any time in the author centre:
${siteUrl()}/submission

There is no submission fee. A publication charge applies only after acceptance.

Kind regards,
SJRI Editorial Office`,
    }),
    sendEmail({
      to: editorialAddresses(),
      replyTo: author.email,
      subject: `New submission ${id}: ${paper.title}`,
      text: `A new manuscript has been submitted.

Manuscript ID: ${id}
Title: ${paper.title}
Field: ${paper.field}
Authors: ${paper.authorsLine}
Submitted by: ${author.name} <${author.email}>

Abstract:
${paper.abstract}

The Word file is attached. Open the editor dashboard to assign reviewers or make a decision:
${siteUrl()}/editor`,
      attachments: [file],
    }),
  ]);
}

export async function notifyRevision(paper: PaperInfo, author: Person, version: string, notes: string | null, file: Attachment) {
  const id = mid(paper.id);
  await Promise.all([
    sendEmail({
      to: author.email,
      subject: `${id}: we received your revised manuscript`,
      text: `Dear ${author.name},

Thank you. We received the revised version (${version}) of "${paper.title}" (${id}). The editors will review it and contact you.

You can follow its status here:
${siteUrl()}/submission

Kind regards,
SJRI Editorial Office`,
    }),
    sendEmail({
      to: editorialAddresses(),
      replyTo: author.email,
      subject: `Revision received ${id} (${version}): ${paper.title}`,
      text: `The author has uploaded a revised manuscript.

Manuscript ID: ${id}
Title: ${paper.title}
Version: ${version}
Author: ${author.name} <${author.email}>
${notes ? `\nResponse to reviewers:\n${notes}\n` : ''}
The Word file is attached. Editor dashboard:
${siteUrl()}/editor`,
      attachments: [file],
    }),
  ]);
}

export async function notifyReviewerAssigned(paper: PaperInfo & { abstract: string }, reviewer: Person) {
  const id = mid(paper.id);
  await sendEmail({
    to: reviewer.email,
    subject: `Review invitation ${id}: ${paper.title}`,
    text: `Dear ${reviewer.name},

The editors of the South Journal of Research and Innovation have assigned you a manuscript to review.

Manuscript ID: ${id}
Title: ${paper.title}

Abstract:
${paper.abstract}

Please log in to download the manuscript and send your recommendation:
${siteUrl()}/reviewer

SJRI uses double-blind review: please do not include your name in your comments.

Thank you for supporting research quality.
SJRI Editorial Office`,
  });
}

export async function notifyReviewSubmitted(paper: PaperInfo, reviewerName: string, decision: string) {
  const id = mid(paper.id);
  await sendEmail({
    to: editorialAddresses(),
    subject: `Review received ${id}: ${paper.title}`,
    text: `${reviewerName} has submitted a review.

Manuscript ID: ${id}
Title: ${paper.title}
Recommendation: ${decision.replace(/_/g, ' ').toLowerCase()}

Read the full review in the editor dashboard:
${siteUrl()}/editor`,
  });
}

const decisionText: Record<Decision, { subject: string; body: string }> = {
  ACCEPT: {
    subject: 'your manuscript has been accepted',
    body: 'Congratulations! Your manuscript has been accepted for publication in the South Journal of Research and Innovation.\n\nThe editorial office will contact you with the publication charge and payment instructions. Please use your manuscript ID as the payment reference.',
  },
  REQUEST_REVISIONS: {
    subject: 'revisions requested',
    body: 'The editors have reviewed your manuscript and request revisions before a final decision.\n\nPlease log in to read the editor\'s message and the reviewers\' comments, then upload your revised manuscript as a Word document.',
  },
  REJECT: {
    subject: 'decision on your manuscript',
    body: 'Thank you for submitting your work to SJRI. After careful consideration, the editors have decided not to accept this manuscript for publication.\n\nYou can read the editor\'s message and the reviewers\' comments in the author centre. We hope you will consider SJRI for future work.',
  },
  SCHEDULE: {
    subject: 'scheduled for publication',
    body: 'Your accepted manuscript has been scheduled for an upcoming issue of SJRI.',
  },
  PUBLISH: {
    subject: 'your article is published',
    body: 'Congratulations! Your article is now published and freely available online.',
  },
};

export async function notifyDecision(
  paper: PaperInfo & { volume?: number | null; issue?: number | null; publishedDate?: Date | null },
  author: Person,
  decision: Decision,
  notes: string | null,
) {
  const id = mid(paper.id);
  const d = decisionText[decision];
  const extra: string[] = [];
  if ((decision === 'SCHEDULE' || decision === 'PUBLISH') && paper.volume && paper.issue) {
    extra.push(`Issue: Volume ${paper.volume}, Issue ${paper.issue}`);
  }
  if (decision === 'SCHEDULE' && paper.publishedDate) extra.push(`Planned date: ${paper.publishedDate.toISOString().slice(0, 10)}`);
  const link = decision === 'PUBLISH' ? `${siteUrl()}/papers/${paper.id}` : `${siteUrl()}/submission`;
  await sendEmail({
    to: author.email,
    subject: `${id}: ${d.subject}`,
    text: `Dear ${author.name},

Manuscript ID: ${id}
Title: ${paper.title}
${extra.length ? extra.join('\n') + '\n' : ''}
${d.body}
${notes ? `\nMessage from the editor:\n${notes}\n` : ''}
${decision === 'PUBLISH' ? 'Read and share your article:' : 'Author centre:'}
${link}

Kind regards,
SJRI Editorial Office`,
  });
}

export async function notifyPasswordReset(user: Person, link: string) {
  await sendEmail({
    to: user.email,
    subject: 'Reset your SJRI password',
    text: `Dear ${user.name},

We received a request to reset the password for your SJRI account.

To choose a new password, open this link within 1 hour:
${link}

If you did not ask for this, you can ignore this email. Your password will not change.

SJRI Editorial Office`,
  });
}
