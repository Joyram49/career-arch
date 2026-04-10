import { PrismaClient } from '@prisma/client';

export default async function globalTeardown(): Promise<void> {
  // Disconnect Prisma so Jest can exit cleanly
  // (prevents "open handle" warnings after integration tests)
  const prisma = new PrismaClient();

  try {
    await prisma.$disconnect();
  } catch {
    // Ignore disconnect errors during teardown
  }
}
