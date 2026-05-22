import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { logger } from '../src/config/logger';

const prisma = new PrismaClient();

// ── Plan feature shapes ────────────────────────────────────────────────────
const PLAN_FEATURES = {
  FREE: {
    jobBrowseLimit: 20, // first 20 jobs only
    applyMonthlyLimit: 5, // 5 applications per month
    saveJobsLimit: 5, // 5 saved jobs at a time
    canViewOrgProfile: false,
    resumeVersions: 1,
    canDownloadHistory: false,
    earlyJobAlerts: false,
    prioritySearch: false,
    aiResumeTips: false,
    badge: null,
  },
  BASIC: {
    jobBrowseLimit: -1, // unlimited
    applyMonthlyLimit: 30,
    saveJobsLimit: 50,
    canViewOrgProfile: true,
    resumeVersions: 3,
    canDownloadHistory: true,
    earlyJobAlerts: true,
    prioritySearch: false,
    aiResumeTips: false,
    badge: 'basic',
  },
  PREMIUM: {
    jobBrowseLimit: -1, // unlimited
    applyMonthlyLimit: -1, // unlimited
    saveJobsLimit: -1, // unlimited
    canViewOrgProfile: true,
    resumeVersions: -1, // unlimited
    canDownloadHistory: true,
    earlyJobAlerts: true,
    prioritySearch: true,
    aiResumeTips: true,
    badge: 'premium',
  },
} as const;

async function main(): Promise<void> {
  logger.info('🌱 Seeding database...');

  // ── Seed Plan Catalogue ──────────────────────────────────────────────────
  logger.info('📦 Seeding plan catalogue...');

  await prisma.planCatalogue.upsert({
    where: { key: 'FREE' },
    update: {
      displayName: 'Free',
      description: 'Get started with the basics. No credit card required.',
      monthlyPriceCents: 0,
      isActive: true,
      sortOrder: 0,
      features: PLAN_FEATURES.FREE,
    },
    create: {
      key: 'FREE',
      displayName: 'Free',
      description: 'Get started with the basics. No credit card required.',
      monthlyPriceCents: 0,
      stripeProductId: null,
      stripePriceId: null,
      isActive: true,
      sortOrder: 0,
      features: PLAN_FEATURES.FREE,
    },
  });

  // await prisma.planCatalogue.upsert({
  //   where: { key: 'BASIC' },
  //   update: {
  //     displayName: 'Basic',
  //     description: 'For active job seekers who want more reach and visibility.',
  //     monthlyPriceCents: 999,
  //     isActive: true,
  //     sortOrder: 1,
  //     features: PLAN_FEATURES.BASIC,
  //   },
  //   create: {
  //     key: 'BASIC',
  //     displayName: 'Basic',
  //     description: 'For active job seekers who want more reach and visibility.',
  //     monthlyPriceCents: 999,
  //     stripeProductId: null, // Admin sets via dashboard → synced to Stripe
  //     stripePriceId: null,
  //     isActive: true,
  //     sortOrder: 1,
  //     features: PLAN_FEATURES.BASIC,
  //   },
  // });

  // await prisma.planCatalogue.upsert({
  //   where: { key: 'PREMIUM' },
  //   update: {
  //     displayName: 'Premium',
  //     description: 'Unlimited access, AI tools, and top placement in search.',
  //     monthlyPriceCents: 2499,
  //     isActive: true,
  //     sortOrder: 2,
  //     features: PLAN_FEATURES.PREMIUM,
  //   },
  //   create: {
  //     key: 'PREMIUM',
  //     displayName: 'Premium',
  //     description: 'Unlimited access, AI tools, and top placement in search.',
  //     monthlyPriceCents: 2499,
  //     stripeProductId: null, // Admin sets via dashboard → synced to Stripe
  //     stripePriceId: null,
  //     isActive: true,
  //     sortOrder: 2,
  //     features: PLAN_FEATURES.PREMIUM,
  //   },
  // });

  logger.info('✅ Plan catalogue seeded (3 plans)');

  // ── Create default admin ─────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123456', 12);

  const admin = await prisma.admin.upsert({
    where: { email: 'admin@careerarch.com' },
    update: {},
    create: {
      email: 'admin@careerarch.com',
      password: adminPassword,
      name: 'Super Admin',
      role: 'ADMIN',
    },
  });

  logger.info(`✅ Admin created: ${admin.email}`);

  // ── Create demo user ─────────────────────────────────────────────────────
  // const userPassword = await bcrypt.hash('User@123456', 12);

  // const user = await prisma.user.upsert({
  //   where: { email: 'demo@careerarch.com' },
  //   update: {},
  //   create: {
  //     email: 'demo@careerarch.com',
  //     password: userPassword,
  //     isEmailVerified: true,
  //     profile: {
  //       create: {
  //         firstName: 'Demo',
  //         lastName: 'User',
  //         headline: 'Full Stack Developer',
  //         location: 'New York, USA',
  //         skills: ['TypeScript', 'Node.js', 'React'],
  //         experienceYears: 3,
  //       },
  //     },
  //     subscription: {
  //       create: {
  //         plan: 'FREE',
  //         status: 'ACTIVE',
  //         applyCountThisMonth: 0,
  //         applyCountResetAt: new Date(),
  //         savedJobCount: 0,
  //       },
  //     },
  //   },
  // });

  // logger.info(`✅ Demo user created: ${user.email}`);

  // ── Create demo organization ─────────────────────────────────────────────
  // const orgPassword = await bcrypt.hash('Org@123456', 12);

  // const org = await prisma.organization.upsert({
  //   where: { email: 'techcorp@careerarch.com' },
  //   update: {},
  //   create: {
  //     email: 'techcorp@careerarch.com',
  //     password: orgPassword,
  //     isEmailVerified: true,
  //     isApproved: true,
  //     profile: {
  //       create: {
  //         companyName: 'TechCorp Inc.',
  //         website: 'https://techcorp.example.com',
  //         industry: 'Technology',
  //         companySize: '51-200',
  //         foundedYear: 2015,
  //         description: 'A leading technology company building innovative solutions.',
  //         location: 'San Francisco, CA',
  //         country: 'USA',
  //       },
  //     },
  //   },
  // });

  // logger.info(`✅ Demo organization created: ${org.email}`);

  logger.info('\n🎉 Seeding complete!');
  logger.info('\nCredentials:');
  logger.info('  Admin:  admin@careerarch.com   / Admin@123456');
  logger.info('  User:   demo@careerarch.com    / User@123456');
  logger.info('  Org:    techcorp@careerarch.com / Org@123456');
  logger.info('\n⚠️  Note: BASIC and PREMIUM plans have no Stripe IDs yet.');
  logger.info('   Go to Admin Dashboard → Plans to connect them to Stripe.');
}

main()
  .catch((e) => {
    logger.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
