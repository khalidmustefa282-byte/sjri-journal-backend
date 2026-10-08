import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.review.deleteMany();
  await prisma.editorialDecision.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.paper.deleteMany();
  await prisma.user.deleteMany();

  // Create test users
  const adminPassword = await bcrypt.hash('admin123456', 10);
  const editorPassword = await bcrypt.hash('editor123456', 10);
  const reviewerPassword = await bcrypt.hash('reviewer123456', 10);
  const authorPassword = await bcrypt.hash('author123456', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@sjrijournal.org',
      password: adminPassword,
      name: 'Admin User',
      role: Role.ADMIN,
      affiliation: 'SJRI',
      country: 'South Sudan',
    },
  });

  const editor = await prisma.user.create({
    data: {
      email: 'editor@sjrijournal.org',
      password: editorPassword,
      name: 'Editor User',
      role: Role.EDITOR,
      affiliation: 'SJRI Editorial Board',
      country: 'South Sudan',
    },
  });

  const reviewer = await prisma.user.create({
    data: {
      email: 'reviewer1@sjrijournal.org',
      password: reviewerPassword,
      name: 'Reviewer One',
      role: Role.REVIEWER,
      affiliation: 'University',
      country: 'Kenya',
    },
  });

  const author = await prisma.user.create({
    data: {
      email: 'author@sjrijournal.org',
      password: authorPassword,
      name: 'Author User',
      role: Role.AUTHOR,
      affiliation: 'Research Institute',
      country: 'South Sudan',
    },
  });

  console.log('✓ Created test users');
  console.log(`  - Admin: admin@sjrijournal.org / admin123456`);
  console.log(`  - Editor: editor@sjrijournal.org / editor123456`);
  console.log(`  - Reviewer: reviewer1@sjrijournal.org / reviewer123456`);
  console.log(`  - Author: author@sjrijournal.org / author123456`);

  // Create test paper
  const paper = await prisma.paper.create({
    data: {
      title: 'Test Research Paper',
      abstract: 'This is a test abstract for verification purposes.',
      keywords: ['research', 'test', 'innovation'],
      authors: JSON.stringify([
        { name: 'John Doe', email: 'john@example.com' },
      ]),
      field: 'Computer Science',
      submittedBy: author.id,
      status: 'SUBMITTED',
    },
  });

  // Create submission record
  await prisma.submission.create({
    data: {
      paperId: paper.id,
      version: 'v1',
      status: 'RECEIVED',
    },
  });

  console.log('✓ Created test paper');

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
