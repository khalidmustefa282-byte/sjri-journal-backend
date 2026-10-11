// Removes the old demo accounts that were created with weak passwords:
//   admin@sjrijournal.org, editor@sjrijournal.org, reviewer1@sjrijournal.org, author@sjrijournal.org
//
//   npm run remove-test-accounts            -> shows what would happen (changes nothing)
//   npm run remove-test-accounts -- --yes   -> really does it
//
// Accounts that own papers or reviews are NOT deleted (that would delete real data);
// instead their password is replaced with a long random one and they are made AUTHOR,
// so nobody can log in with them any more.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

const EMAILS = ['admin@sjrijournal.org', 'editor@sjrijournal.org', 'reviewer1@sjrijournal.org', 'author@sjrijournal.org'];
const apply = process.argv.includes('--yes');
const prisma = new PrismaClient();

const users = await prisma.user.findMany({
  where: { email: { in: EMAILS } },
  select: { id: true, email: true, role: true, _count: { select: { papers: true, reviews: true, decisions: true } } },
});
if (!users.length) console.log('None of the old test accounts exist. Nothing to do.');

for (const u of users) {
  const owns = u._count.papers + u._count.reviews + u._count.decisions;
  if (owns === 0) {
    console.log(`${apply ? 'Deleting' : 'Would delete'} ${u.email} (${u.role}, no papers/reviews)`);
    if (apply) await prisma.user.delete({ where: { id: u.id } });
  } else {
    console.log(`${apply ? 'Locking' : 'Would lock'} ${u.email} (${u.role}, owns ${owns} records): random password + role AUTHOR`);
    if (apply) {
      const hash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
      await prisma.user.update({ where: { id: u.id }, data: { password: hash, role: 'AUTHOR' } });
    }
  }
}
if (!apply && users.length) console.log('\nNothing changed yet. Run again with --yes to apply.');
await prisma.$disconnect();
