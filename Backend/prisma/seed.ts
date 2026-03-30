import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? 'Admin';

  if (!email || !password) {
    console.log('Skip admin seed: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env');
  } else {
    if (password.length < 8) {
      console.warn('SEED_ADMIN_PASSWORD must be at least 8 characters; skipping admin seed');
    } else {
      const hash = await bcrypt.hash(password, 10);
      await prisma.user.upsert({
        where: { email },
        create: { email, name, password: hash, role: Role.ADMIN },
        update: { name, password: hash, role: Role.ADMIN },
      });
      console.log(`Seeded admin: ${email}`);
    }
  }

  const subjectCount = await prisma.subject.count();
  if (subjectCount === 0) {
    await prisma.subject.createMany({
      data: [
        { name: 'Data Structures', code: 'CS201' },
        { name: 'Database Systems', code: 'CS302' },
      ],
    });
    console.log('Seeded sample subjects');
  }

  const branchCount = await prisma.branch.count();
  if (branchCount === 0) {
    await prisma.branch.createMany({
      data: [
        { name: 'Computer Science & Engineering', code: 'CSE' },
        { name: 'Information Technology', code: 'IT' },
      ],
    });
    console.log('Seeded sample branches');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
