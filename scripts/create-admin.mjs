// Create the journal's real admin account, or reset an existing account's password and make it admin.
// Run from your own computer with the live DATABASE_URL in .env:
//
//   npm run create-admin
//
// You will be asked for the email, name and password. Nothing is saved in the code.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({ input, output });
const email = (process.env.ADMIN_EMAIL || (await rl.question('Admin email: '))).trim().toLowerCase();
const name = (process.env.ADMIN_NAME || (await rl.question('Full name: '))).trim();

// Hide the password while typing (nothing appears on screen).
function askHidden(question) {
  return new Promise((resolve) => {
    output.write(question);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();
    let value = '';
    const onData = (chunk) => {
      for (const ch of chunk.toString('utf8')) {
        if (ch === '\r' || ch === '\n') {
          stdin.removeListener('data', onData);
          if (stdin.isTTY) stdin.setRawMode(Boolean(wasRaw));
          stdin.pause();
          output.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') process.exit(1); // Ctrl+C
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

rl.close();
let password = process.env.ADMIN_PASSWORD || '';
if (!password) {
  password = await askHidden('New password (min 12 characters, hidden while typing): ');
  const again = await askHidden('Type the same password again: ');
  if (again !== password) {
    console.error('The two passwords are different. Nothing was changed. Please run npm run create-admin again.');
    process.exit(1);
  }
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('That is not a valid email address.');
if (!name) throw new Error('Name is required.');
if (password.length < 12) {
  console.error(`That password has ${password.length} characters. It needs at least 12. Nothing was changed. Please run npm run create-admin again.`);
  process.exit(1);
}

const prisma = new PrismaClient();
const hash = await bcrypt.hash(password, 10);

// Find every account with this email, ignoring capital/small letters
// (an older website version could create "Name@x.com" and "name@x.com" as two accounts).
const matches = await prisma.user.findMany({
  where: { email: { equals: email, mode: 'insensitive' } },
  include: { _count: { select: { papers: true, reviews: true, decisions: true } } },
  orderBy: { createdAt: 'asc' },
});

if (matches.length === 0) {
  const user = await prisma.user.create({ data: { email, name, password: hash, role: 'ADMIN' } });
  console.log(`Admin ready: ${user.email} (id ${user.id}). You can now log in on the website.`);
} else {
  const owns = (u) => u._count.papers + u._count.reviews + u._count.decisions;
  // Keep the account that owns the most data (or the oldest one).
  const keeper = [...matches].sort((a, b) => owns(b) - owns(a))[0];
  for (const other of matches) {
    if (other.id === keeper.id) continue;
    if (owns(other) === 0) {
      await prisma.user.delete({ where: { id: other.id } });
      console.log(`Removed duplicate empty account: ${other.email}`);
    } else {
      await prisma.user.update({ where: { id: other.id }, data: { password: hash, role: 'ADMIN', name } });
      console.log(`Also made admin (it has papers/reviews, so it was kept): ${other.email}`);
    }
  }
  const stillTaken = await prisma.user.findFirst({ where: { email, NOT: { id: keeper.id } } });
  const user = await prisma.user.update({
    where: { id: keeper.id },
    data: { password: hash, role: 'ADMIN', name, ...(stillTaken ? {} : { email }) },
  });
  console.log(`Admin ready: ${user.email} (id ${user.id}). You can now log in on the website.`);
}
await prisma.$disconnect();
