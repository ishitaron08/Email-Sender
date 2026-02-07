import { prisma } from "../src/db/client";

/**
 * Seed script — creates a test user for local development
 * so you can skip Google OAuth while developing.
 *
 * Run with: npm run db:seed
 */
async function seed(): Promise<void> {
  const testUser = await prisma.identity.upsert({
    where: { googleId: "dev-test-user-001" },
    update: {},
    create: {
      googleId: "dev-test-user-001",
      email: "dev@dispatch-engine.local",
      displayName: "Dev Tester",
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
    },
  });

  console.log("✅ Seeded test user:", testUser.id, testUser.email);
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
