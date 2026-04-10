import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { logger } from '../src/config/logger';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  logger.info('🌱 Seeding database...');

  // ── Create default admin ─────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123456', 12);

  const admin = await prisma.admin.upsert({
    where: { email: 'admin@jobsphere.com' },
    update: {},
    create: {
      email: 'admin@jobsphere.com',
      password: adminPassword,
      name: 'Super Admin',
      role: 'ADMIN',
    },
  });

  logger.info(`✅ Admin created: ${admin.email}`);

  // ── Create demo user ─────────────────────────────────────────────────────
  const userPassword = await bcrypt.hash('User@123456', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@jobsphere.com' },
    update: {},
    create: {
      email: 'demo@jobsphere.com',
      password: userPassword,
      isEmailVerified: true,
      profile: {
        create: {
          firstName: 'Demo',
          lastName: 'User',
          headline: 'Full Stack Developer',
          location: 'New York, USA',
          skills: ['TypeScript', 'Node.js', 'React'],
          experienceYears: 3,
        },
      },
      subscription: {
        create: {
          plan: 'FREE',
          status: 'ACTIVE',
        },
      },
    },
  });

  logger.info(`✅ Demo user created: ${user.email}`);

  // ── Create demo organization ─────────────────────────────────────────────
  const orgPassword = await bcrypt.hash('Org@123456', 12);

  const org = await prisma.organization.upsert({
    where: { email: 'techcorp@jobsphere.com' },
    update: {},
    create: {
      email: 'techcorp@jobsphere.com',
      password: orgPassword,
      isEmailVerified: true,
      isApproved: true,
      profile: {
        create: {
          companyName: 'TechCorp Inc.',
          website: 'https://techcorp.example.com',
          industry: 'Technology',
          companySize: '51-200',
          foundedYear: 2015,
          description: 'A leading technology company building innovative solutions.',
          location: 'San Francisco, CA',
          country: 'USA',
        },
      },
    },
  });

  logger.info(`✅ Demo organization created: ${org.email}`);

  logger.info('\n🎉 Seeding complete!');
  logger.info('\nCredentials:');
  logger.info('  Admin:  admin@jobsphere.com / Admin@123456');
  logger.info('  User:   demo@jobsphere.com  / User@123456');
  logger.info('  Org:    techcorp@jobsphere.com / Org@123456');
}

main()
  .catch((e) => {
    logger.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
