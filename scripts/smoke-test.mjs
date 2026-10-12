// API smoke test for the SJRI backend.
//
// SAFETY: runs ONLY against a local, throwaway database and a local server.
// It creates and deletes test users, so never point it at the live site or the Railway database.
//
// How to run (local only):
//   1. Start a local Postgres and create an empty database, then: DATABASE_URL=<local url> npx prisma db push
//   2. npm run build && NEXTAUTH_SECRET=<any 32+ chars> ALLOWED_ORIGINS=http://localhost:5173 npx next start -p 3100
//   3. npm i --no-save pg && SMOKE_API=http://localhost:3100 DATABASE_URL=<local url> node scripts/smoke-test.mjs

const B = process.env.SMOKE_API || 'http://localhost:3100';
const DB = process.env.DATABASE_URL || '';
const isLocal = (u) => {
  try {
    return ['localhost', '127.0.0.1', '::1'].includes(new URL(u).hostname);
  } catch {
    return false;
  }
};
if (!isLocal(B) || !isLocal(DB)) {
  console.error('Refusing to run: SMOKE_API and DATABASE_URL must both point at localhost.');
  process.exit(1);
}

const ORIGIN = 'http://localhost:5173';
let pass = 0;
let fail = 0;
const ok = (cond, msg, extra) => {
  if (cond) pass++;
  else {
    fail++;
    console.log('FAIL:', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : '');
  }
};

async function call(method, path, { token, json, form, origin = ORIGIN } = {}) {
  const headers = { Origin: origin };
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = typeof json === 'string' ? json : JSON.stringify(json);
  }
  if (form) body = form;
  const res = await fetch(B + path, { method, headers, body });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.arrayBuffer();
  return { status: res.status, data, headers: res.headers };
}

const pdf = (name = 'paper.pdf') =>
  new File([Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF')], name, { type: 'application/pdf' });
// Minimal bytes with the .docx (ZIP) signature; enough for the server's file-type check.
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const docx = (name = 'paper.docx') => new File([Buffer.from('PK\u0003\u0004word/document.xml test')], name, { type: DOCX_TYPE });

const { default: pg } = await import('pg');
const db = new pg.Client({ connectionString: DB });
await db.connect();

// --- Root, health, CORS ---
let r = await call('GET', '/');
ok(r.status === 200 && r.data.status === 'running', 'root URL says the API is running', r);
r = await call('GET', '/api/health');
ok(r.status === 200 && r.data.database === 'ok', 'health check', r.data);
r = await call('OPTIONS', '/api/auth/token');
ok(r.status === 204 && r.headers.get('access-control-allow-origin') === ORIGIN, 'CORS preflight for allowed origin');
r = await call('OPTIONS', '/api/auth/token', { origin: 'https://evil.example' });
ok(r.status === 403 && !r.headers.get('access-control-allow-origin'), 'CORS preflight blocks unknown origin');
r = await call('GET', '/api/publications/current', { origin: 'https://evil.example' });
ok(!r.headers.get('access-control-allow-origin'), 'no CORS header for unknown origin');
r = await call('GET', '/api/publications/current', { origin: 'https://sjri-publish-hub-git-release-publish-ready-khalid-994d.vercel.app' });
ok(!!r.headers.get('access-control-allow-origin'), 'frontend preview origin allowed');
ok(r.headers.get('access-control-allow-origin') !== '*', 'never *');

// --- Registration ---
r = await call('POST', '/api/auth/register', { json: { name: 'Eve', email: 'Eve@Example.com', password: 'longpassword1', role: 'ADMIN' } });
ok(r.status === 201 && r.data.user.role === 'AUTHOR' && r.data.user.email === 'eve@example.com', 'register ignores role and lowercases email', r.data);
r = await call('POST', '/api/auth/register', { json: { name: 'Eve', email: 'eve@example.com', password: 'longpassword1' } });
ok(r.status === 409, 'duplicate email rejected', r);
r = await call('POST', '/api/auth/register', { json: { name: 'X', email: 'bad', password: 'longpassword1' } });
ok(r.status === 400, 'invalid email rejected');
r = await call('POST', '/api/auth/register', { json: { name: 'X', email: 'x@y.com', password: 'short' } });
ok(r.status === 400, 'short password rejected');
r = await call('POST', '/api/auth/register', { json: '{not json' });
ok(r.status === 400, 'bad JSON gives 400 not 500', r.data);

// --- Accounts for each role ---
const mk = async (email, role) => {
  await call('POST', '/api/auth/register', { json: { name: email.split('@')[0], email, password: 'longpassword1', country: 'South Sudan' } });
  if (role !== 'AUTHOR') await db.query('UPDATE "User" SET role=$1 WHERE email=$2', [role, email]);
  const t = await call('POST', '/api/auth/token', { json: { email: email.toUpperCase(), password: 'longpassword1' } });
  ok(t.status === 200 && t.data.token, 'login (case-insensitive email) ' + email, t.data);
  return { token: t.data.token, id: t.data.user.id };
};
const admin = await mk('admin@smoke.localhost', 'ADMIN');
const editor = await mk('editor@smoke.localhost', 'EDITOR');
const rev1 = await mk('rev1@smoke.localhost', 'REVIEWER');
const rev2 = await mk('rev2@smoke.localhost', 'REVIEWER');
const author = await mk('author@smoke.localhost', 'AUTHOR');
const other = await mk('other@smoke.localhost', 'AUTHOR');
r = await call('POST', '/api/auth/token', { json: { email: 'author@smoke.localhost', password: 'wrongpassword' } });
ok(r.status === 401, 'wrong password rejected');
r = await call('GET', '/api/auth/me', { token: admin.token });
ok(r.data.user?.role === 'ADMIN', '/me returns current role');

// --- Role protection ---
r = await call('GET', '/api/admin/users', { token: author.token });
ok(r.status === 403, 'author cannot list users');
r = await call('GET', '/api/admin/users');
ok(r.status === 401, 'anonymous gets 401');
r = await call('GET', '/api/admin/users', { token: admin.token });
ok(r.status === 200 && r.data.users.length >= 6 && !('password' in r.data.users[0]), 'admin lists users without passwords');
r = await call('PATCH', `/api/admin/users/${other.id}`, { token: editor.token, json: { role: 'ADMIN' } });
ok(r.status === 403, 'editor cannot change roles');
r = await call('PATCH', `/api/admin/users/${admin.id}`, { token: admin.token, json: { role: 'AUTHOR' } });
ok(r.status === 409, 'admin cannot remove own admin role');
r = await call('PATCH', `/api/admin/users/${other.id}`, { token: admin.token, json: { role: 'REVIEWER' } });
ok(r.status === 200 && r.data.user.role === 'REVIEWER', 'admin changes a role');
r = await call('PATCH', `/api/admin/users/${other.id}`, { token: admin.token, json: { role: 'AUTHOR' } });
ok(r.data.user?.role === 'AUTHOR', 'admin changes it back');
r = await call('PATCH', `/api/admin/users/${other.id}`, { token: admin.token, json: { password: 'brand-new-pass' } });
ok(r.status === 200, 'admin sets a new password', r.data);
r = await call('POST', '/api/auth/token', { json: { email: 'other@smoke.localhost', password: 'brand-new-pass' } });
ok(r.status === 200, 'user logs in with the new password');
r = await call('PATCH', `/api/admin/users/${other.id}`, { token: admin.token, json: { password: 'short' } });
ok(r.status === 400, 'short new password rejected');
r = await call('PATCH', `/api/admin/users/${other.id}`, { token: author.token, json: { password: 'hijack-password' } });
ok(r.status === 403, 'non-admin cannot set passwords');
r = await call('GET', '/api/editor/dashboard', { token: rev1.token });
ok(r.status === 403, 'reviewer cannot open editor dashboard');

// --- Author submits ---
const f = new FormData();
f.set('title', 'Water access in Juba');
f.set('abstract', 'Abstract text');
f.set('keywords', 'water, juba, water');
f.set('field', 'Public Health');
f.set('authors', JSON.stringify([{ name: 'Author A', email: 'a@x.com', affiliation: 'University of Juba', corresponding: true }]));
f.set('file', docx());
r = await call('POST', '/api/papers/submit', { token: author.token, form: f });
ok(r.status === 201 && r.data.paper.status === 'SUBMITTED' && r.data.paper.hasFile && r.data.paper.fileType === 'docx' && !r.data.paper.hasPdf, 'author submits paper as Word', r.data);
const paperId = r.data.paper?.id;
ok(JSON.stringify(r.data.paper?.keywords) === '["water","juba"]', 'keywords cleaned and de-duplicated', r.data.paper?.keywords);

const f2 = new FormData();
f2.set('title', 'x');
f2.set('abstract', 'y');
f2.set('keywords', 'k');
f2.set('field', 'f');
f2.set('authors', '[{"name":"A"}]');
f2.set('file', pdf());
r = await call('POST', '/api/papers/submit', { token: author.token, form: f2 });
ok(r.status === 400 && /Word/.test(r.data.error), 'PDF manuscript rejected (Word required)', r.data);
f2.set('file', new File([Buffer.from('hello')], 'fake.docx', { type: DOCX_TYPE }));
r = await call('POST', '/api/papers/submit', { token: author.token, form: f2 });
ok(r.status === 400, 'file that is not really a Word document is rejected', r.data);
f2.set('file', docx());
f2.set('authors', 'not json');
r = await call('POST', '/api/papers/submit', { token: author.token, form: f2 });
ok(r.status === 400, 'invalid authors list rejected', r.data);
r = await call('POST', '/api/papers/submit', { form: f });
ok(r.status === 401, 'must be logged in to submit');

r = await call('GET', '/api/papers/my-submissions', { token: author.token });
ok(r.data.papers?.length === 1 && !('pdfUrl' in r.data.papers[0]), 'my submissions listed, storage URL not exposed', r.data);
r = await call('GET', `/api/papers/${paperId}`, { token: other.token });
ok(r.status === 404, "another author cannot open someone else's paper");
r = await call('GET', `/api/papers/${paperId}/pdf`, { token: author.token });
ok(r.status === 200 && r.headers.get('content-type') === DOCX_TYPE && /attachment; filename=".*\.docx"/.test(r.headers.get('content-disposition')), 'author downloads own Word file', r.status);
r = await call('GET', `/api/papers/${paperId}/pdf`, { token: other.token });
ok(r.status === 404, "another author cannot download the PDF");
r = await call('GET', `/api/publications/${paperId}`);
ok(r.status === 404, 'unpublished paper is not public');
r = await call('GET', `/api/publications/${paperId}/pdf`);
ok(r.status === 404, 'unpublished PDF is not public');

// --- Review workflow ---
r = await call('POST', '/api/reviewer/submit-review', { token: rev1.token, json: { paperId, decision: 'ACCEPT', comments: 'ok' } });
ok(r.status === 403, 'reviewer cannot review a paper they were not assigned', r.data);
r = await call('GET', '/api/editor/reviewers', { token: editor.token });
ok(r.data.reviewers?.length === 2, 'editor sees reviewer accounts', r.data);
r = await call('POST', '/api/editor/assign-reviewer', { token: editor.token, json: { paperId, reviewerIds: [rev1.id, author.id] } });
ok(r.status === 400, 'only Reviewer accounts can be assigned', r.data);
r = await call('POST', '/api/editor/assign-reviewer', { token: editor.token, json: { paperId, reviewerIds: [rev1.id, rev2.id] } });
ok(r.status === 201 && r.data.assigned === 2, 'editor assigns two reviewers', r.data);
r = await call('POST', '/api/editor/assign-reviewer', { token: editor.token, json: { paperId, reviewerIds: [rev1.id] } });
ok(r.status === 201 && r.data.assigned === 0, 'assigning the same reviewer twice is ignored', r.data);

r = await call('GET', '/api/reviewer/assignments', { token: rev1.token });
ok(r.data.assignments?.length === 1 && !('authors' in r.data.assignments[0]), 'reviewer sees assignment without author names', r.data);
r = await call('GET', `/api/papers/${paperId}`, { token: rev1.token });
ok(r.data.access === 'reviewer' && !r.data.paper.authors, 'reviewer paper view is anonymous', r.data);
r = await call('GET', `/api/papers/${paperId}/pdf`, { token: rev1.token });
ok(r.status === 200 && r.headers.get('content-type') === DOCX_TYPE, 'assigned reviewer downloads Word file');
r = await call('POST', '/api/reviewer/submit-review', { token: rev1.token, json: { paperId, decision: 'MAYBE', comments: 'x' } });
ok(r.status === 400, 'invalid recommendation rejected');
r = await call('POST', '/api/reviewer/submit-review', { token: rev1.token, json: { paperId, decision: 'REQUEST_REVISIONS', comments: 'Please clarify methods', rating: 4 } });
ok(r.status === 201, 'reviewer submits review', r.data);

r = await call('GET', `/api/papers/${paperId}`, { token: author.token });
ok(r.data.paper.reviews.length === 0, 'author does not see reviews before the editor decides', r.data.paper.reviews);
r = await call('POST', '/api/editor/decision', { token: editor.token, json: { paperId, decision: 'PUBLISH', volume: 1, issue: 1 } });
ok(r.status === 409, 'cannot publish a paper that is still under review', r.data);
r = await call('POST', '/api/editor/decision', { token: editor.token, json: { paperId, decision: 'REQUEST_REVISIONS', notes: 'Address reviewer 1' } });
ok(r.status === 201, 'editor requests revisions', r.data);
r = await call('GET', `/api/papers/${paperId}`, { token: author.token });
ok(
  r.data.paper.reviews.length === 1 && r.data.paper.reviews[0].label === 'Reviewer 1' && !JSON.stringify(r.data.paper.reviews).includes(rev1.id),
  'author sees review comments anonymously',
  r.data.paper.reviews,
);

// --- Revision ---
const rf = new FormData();
rf.set('file', docx('rev.docx'));
rf.set('notes', 'Fixed');
r = await call('POST', `/api/papers/${paperId}/revision`, { token: other.token, form: rf });
ok(r.status === 404, 'another author cannot upload a revision');
const rfPdf = new FormData();
rfPdf.set('file', pdf('rev.pdf'));
r = await call('POST', `/api/papers/${paperId}/revision`, { token: author.token, form: rfPdf });
ok(r.status === 400, 'PDF revision rejected (Word required)', r.data);
const rf2 = new FormData();
rf2.set('file', docx('rev.docx'));
rf2.set('notes', 'Fixed');
r = await call('POST', `/api/papers/${paperId}/revision`, { token: author.token, form: rf2 });
ok(r.status === 201 && r.data.paper.status === 'REVISIONS_SUBMITTED' && r.data.paper.submissions.length === 2, 'author uploads revision (v2)', r.data);

// --- Accept, schedule, publish ---
r = await call('POST', '/api/editor/decision', { token: editor.token, json: { paperId, decision: 'ACCEPT' } });
ok(r.status === 201, 'editor accepts');
r = await call('POST', '/api/editor/decision', { token: editor.token, json: { paperId, decision: 'SCHEDULE' } });
ok(r.status === 400, 'scheduling needs volume and issue');
r = await call('POST', '/api/editor/decision', { token: editor.token, json: { paperId, decision: 'SCHEDULE', volume: 1, issue: 2, publishedDate: '2026-12-01' } });
ok(r.status === 201, 'editor schedules for volume 1 issue 2', r.data);
r = await call('GET', '/api/publications/schedule');
ok(r.data.papers?.length === 1 && r.data.papers[0].issue === 2 && !r.data.papers[0].authors[0].email, 'public schedule shows no emails', r.data);
r = await call('GET', '/api/publications/overview');
ok(r.data.overview?.scheduled === 1, 'public stage counts', r.data);

const pf = new FormData();
pf.set('title', 'Back issue paper');
pf.set('abstract', 'Old abstract');
pf.set('keywords', 'history');
pf.set('field', 'Social Sciences & Humanities');
pf.set('authors', JSON.stringify([{ name: 'Dr Old' }]));
pf.set('volume', '1');
pf.set('issue', '1');
pf.set('publishedDate', '2025-06-01');
pf.set('pdf', pdf('old.pdf'));
r = await call('POST', '/api/admin/publish', { token: author.token, form: pf });
ok(r.status === 403, 'author cannot use admin publish');
r = await call('POST', '/api/admin/publish', { token: admin.token, form: pf });
ok(r.status === 201 && r.data.paper.status === 'PUBLISHED', 'admin publishes a PDF directly', r.data);
const oldId = r.data.paper?.id;
r = await call('POST', '/api/editor/decision', { token: editor.token, json: { paperId, decision: 'PUBLISH', volume: 1, issue: 2 } });
ok(r.status === 409, 'cannot publish while the file is still the Word manuscript', r.data);
r = await call('GET', `/api/publications/${paperId}/pdf`);
ok(r.status === 404, 'Word manuscript never served publicly');
const fin = new FormData();
fin.set('paperId', paperId);
fin.set('volume', '1');
fin.set('issue', '2');
fin.set('pages', '1-12');
fin.set('doi', '10.0000/test');
r = await call('POST', '/api/admin/publish', { token: editor.token, form: fin });
ok(r.status === 400, 'publishing an accepted paper requires the final PDF', r.data);
fin.set('pdf', docx('final.docx'));
r = await call('POST', '/api/admin/publish', { token: editor.token, form: fin });
ok(r.status === 400, 'final file must be a PDF', r.data);
fin.set('pdf', pdf('final.pdf'));
r = await call('POST', '/api/admin/publish', { token: editor.token, form: fin });
ok(r.status === 200 && r.data.paper.status === 'PUBLISHED' && r.data.paper.hasPdf, 'editor publishes the scheduled paper with its final PDF', r.data);

// --- Public pages ---
r = await call('GET', '/api/publications/current');
ok(r.data.issue?.volume === 1 && r.data.issue?.issue === 2 && r.data.papers.length === 1 && r.data.papers[0].id === paperId, 'current issue = newest volume/issue', r.data);
ok(!JSON.stringify(r.data).includes('pdfUrl') && !JSON.stringify(r.data).includes('.uploads'), 'no storage location leaked');
r = await call('GET', '/api/publications/archive');
ok(r.data.totalPapers === 2 && r.data.archive.length === 2, 'archive grouped by year', r.data);
r = await call('GET', '/api/publications/search?q=juba');
ok(r.data.count === 1, 'search by title', r.data);
r = await call('GET', '/api/publications/search?q=dr%20old');
ok(r.data.count === 1 && r.data.papers[0].id === oldId, 'search by author name', r.data);
r = await call('GET', '/api/publications/search?year=2025');
ok(r.data.count === 1, 'filter by year');
r = await call('GET', `/api/publications/${paperId}`);
ok(r.status === 200 && r.data.paper.doi === '10.0000/test', 'public paper detail');
r = await call('GET', `/api/publications/${paperId}/pdf`);
ok(r.status === 200 && r.headers.get('content-type') === 'application/pdf', 'public PDF download');
r = await call('GET', '/api/publications/stats');
ok(r.status === 200 && r.data.stats.totalPublished === 2 && r.data.stats.countriesCount === 1, 'homepage stats from real data', r.data);
r = await call('GET', '/api/editor/dashboard', { token: editor.token });
ok(r.data.stats?.published === 2, 'editor dashboard counts', r.data);
r = await call('GET', '/api/editor/submissions?status=PUBLISHED', { token: editor.token });
ok(r.data.papers?.length === 2 && r.data.papers.some((p) => p.reviews.length === 2), 'editor submissions list', r.data?.papers?.length);
r = await call('GET', '/api/editor/submissions?status=NOPE', { token: editor.token });
ok(r.status === 400, 'unknown status filter rejected');
r = await call('POST', '/api/reviewer/submit-review', { token: rev2.token, json: { paperId, decision: 'ACCEPT', comments: 'late' } });
ok(r.status === 409, 'reviews are closed after publication', r.data);

// --- Deleted account ---
await db.query('DELETE FROM "User" WHERE email=$1', ['other@smoke.localhost']);
r = await call('GET', '/api/papers/my-submissions', { token: other.token });
ok(r.status === 401, "a deleted account's old login token stops working");

await db.end();
console.log(`\nSMOKE RESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
