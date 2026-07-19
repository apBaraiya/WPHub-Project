import { prisma } from './repositories/prisma';
import { hashPassword } from '@wphub/utils';
import { Role } from '@prisma/client';

async function main() {
  const email = 'login@wphub.cloud';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Default user already exists in the database.');
    return;
  }

  const passwordHash = await hashPassword('SecurePassword1!');
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.USER,
      isEmailVerified: true,
      profile: {
        create: {
          firstName: 'WPHub',
          lastName: 'Tester',
        },
      },
      settings: {
        create: {},
      },
      preferences: {
        create: {},
      },
    },
  });
  console.log('Default test user seeded successfully.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
