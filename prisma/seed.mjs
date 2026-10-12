// LOCAL DEVELOPMENT ONLY: creates demo accounts in a local database so you can test the site.
//
//   SEED_PASSWORD="choose-a-password" npm run seed
//
// Safety rules (do not remove):
// - Refuses to run when NODE_ENV=production.
// - Refuses to run unless DATABASE_URL points at localhost / 127.0.0.1.
// - Never deletes existing data.
// - Never contains a password: you choose it with SEED_PASSWORD (min 12 characters).
// To create the real admin on the live database, use `npm run create-admin` instead.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const url = process.env.DATABASE_URL ?? '';
let host = '';
try {
  host = new URL(url).hostname;
} catch {
  host = '';
}
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '::1'].includes(host)) {
  console.error('Refusing to seed: this script only runs against a local database (DATABASE_URL host must be localhost).');
  process.exit(1);
}
const password = process.env.SEED_PASSWORD ?? '';
if (password.length < 12) {
  console.error('Set SEED_PASSWORD (at least 12 characters) to choose the password for the local demo accounts.');
  process.exit(1);
}

const prisma = new PrismaClient();
const hash = await bcrypt.hash(password, 10);
const accounts = [
  ['demo-admin@localhost.test', 'Demo Admin', 'ADMIN'],
  ['demo-editor@localhost.test', 'Demo Editor', 'EDITOR'],
  ['demo-reviewer@localhost.test', 'Demo Reviewer', 'REVIEWER'],
  ['demo-author@localhost.test', 'Demo Author', 'AUTHOR'],
];
for (const [email, name, role] of accounts) {
  await prisma.user.upsert({ where: { email }, update: {}, create: { email, name, role, password: hash } });
  console.log(`  ${role.padEnd(8)} ${email}`);
}
console.log('Local demo accounts ready (password = SEED_PASSWORD).');
await prisma.$disconnect();
