import { PrismaClient, UserRole, SubscriptionPlan } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
function requireSeedEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Refusing to seed without ${name}. Set it in your environment or use the dev-only seeder (npm run db:seed:dev).`
    );
  }
  return v;
}
async function main() {
  console.log("Seeding database...");
  await prisma.featureFlag.upsert({
    where: { key: "enable_ocr" },
    update: {},
    create: {
      key: "enable_ocr",
      name: "Enable OCR",
      description: "Enable OCR for scanned PDF processing",
      isEnabled: false,
      rolloutPct: 0,
    },
  });

  await prisma.featureFlag.upsert({
    where: { key: "enable_team_workspace" },
    update: {},
    create: {
      key: "enable_team_workspace",
      name: "Team Workspace",
      description: "Enable team workspace features",
      isEnabled: true,
      rolloutPct: 100,
    },
  });

  await prisma.featureFlag.upsert({
    where: { key: "enable_career_recommendations" },
    update: {},
    create: {
      key: "enable_career_recommendations",
      name: "Career Recommendations",
      description: "Enable AI career recommendations",
      isEnabled: true,
      rolloutPct: 100,
    },
  });
  const adminEmail = requireSeedEnv("ADMIN_SEED_EMAIL");
  const adminPassword = requireSeedEnv("ADMIN_SEED_PASSWORD");
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { emailNormalized: adminEmail.toLowerCase() },
    update: {},
    create: {
      email: adminEmail,
      emailNormalized: adminEmail.toLowerCase(),
      name: "Platform Admin",
      role: UserRole.ADMIN,
      emailVerified: new Date(),
      passwordHash: adminPasswordHash,
      isActive: true,
    },
  });

  await prisma.profile.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      jobTitle: "Platform Administrator",
    },
  });

  await prisma.subscription.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      plan: SubscriptionPlan.PRO,
      analysesLimit: 999999,
    },
  });
  const demoEmail = requireSeedEnv("DEMO_SEED_EMAIL");
  const demoPassword = requireSeedEnv("DEMO_SEED_PASSWORD");
  const demoPasswordHash = await bcrypt.hash(demoPassword, 12);
  const demo = await prisma.user.upsert({
    where: { emailNormalized: demoEmail.toLowerCase() },
    update: {},
    create: {
      email: demoEmail,
      emailNormalized: demoEmail.toLowerCase(),
      name: "Demo User",
      role: UserRole.PRO,
      emailVerified: new Date(),
      passwordHash: demoPasswordHash,
      isActive: true,
    },
  });

  await prisma.profile.upsert({
    where: { userId: demo.id },
    update: {},
    create: {
      userId: demo.id,
      jobTitle: "Software Engineer",
      bio: "Demo account for ResumeRank AI",
    },
  });

  await prisma.subscription.upsert({
    where: { userId: demo.id },
    update: {},
    create: {
      userId: demo.id,
      plan: SubscriptionPlan.PRO,
      analysesLimit: 999,
    },
  });
  console.log("Database seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
