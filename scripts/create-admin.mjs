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
const password = process.env.ADMIN_PASSWORD || (await rl.question('New password (min 12 characters): '));
rl.close();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('That is not a valid email address.');
if (!name) throw new Error('Name is required.');
if (password.length < 12) throw new Error('Password must be at least 12 characters.');

const prisma = new PrismaClient();
const hash = await bcrypt.hash(password, 10);
const user = await prisma.user.upsert({
  where: { email },
  update: { password: hash, role: 'ADMIN', name },
  create: { email, name, password: hash, role: 'ADMIN' },
});
console.log(`Admin ready: ${user.email} (id ${user.id}). You can now log in on the website.`);
await prisma.$disconnect();
