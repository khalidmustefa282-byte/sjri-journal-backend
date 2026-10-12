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
async function askHidden(question) {
  let muted = false;
  const write = rl._writeToOutput?.bind(rl);
  rl._writeToOutput = (text) => {
    if (!muted || text.includes('\n')) write?.(muted ? '\n' : text);
  };
  const promise = rl.question(question);
  muted = true;
  const answer = await promise;
  muted = false;
  rl._writeToOutput = write;
  return answer;
}

let password = process.env.ADMIN_PASSWORD || '';
if (!password) {
  password = await askHidden('New password (min 12 characters, hidden while typing): ');
  const again = await askHidden('Type the same password again: ');
  if (again !== password) {
    rl.close();
    console.error('The two passwords are different. Nothing was changed. Please run npm run create-admin again.');
    process.exit(1);
  }
}
rl.close();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('That is not a valid email address.');
if (!name) throw new Error('Name is required.');
if (password.length < 12) {
  console.error(`That password has ${password.length} characters. It needs at least 12. Nothing was changed. Please run npm run create-admin again.`);
  process.exit(1);
}

const prisma = new PrismaClient();
const hash = await bcrypt.hash(password, 10);
const user = await prisma.user.upsert({
  where: { email },
  update: { password: hash, role: 'ADMIN', name },
  create: { email, name, password: hash, role: 'ADMIN' },
});
console.log(`Admin ready: ${user.email} (id ${user.id}). You can now log in on the website.`);
await prisma.$disconnect();
