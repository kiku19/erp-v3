import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: adapter });

// Default superadmin credentials (used if env vars not provided)
const DEFAULT_SUPERADMIN_USERNAME = "superadmin";
const DEFAULT_SUPERADMIN_PASSWORD = "superadmin123";
const DEFAULT_SUPERADMIN_ROLE = "superadmin";
const DEFAULT_SUPERADMIN_REDIRECT_PATH = "/admin-panel";

// Get seed config from environment variables (allows customization on startup)
const superadminConfig = {
  username: process.env.SEED_SUPERADMIN_USERNAME ?? DEFAULT_SUPERADMIN_USERNAME,
  password: process.env.SEED_SUPERADMIN_PASSWORD ?? DEFAULT_SUPERADMIN_PASSWORD,
  role: process.env.SEED_SUPERADMIN_ROLE ?? DEFAULT_SUPERADMIN_ROLE,
  redirectPath: process.env.SEED_SUPERADMIN_REDIRECT_PATH ?? DEFAULT_SUPERADMIN_REDIRECT_PATH,
  permissions: ["tenants:write", "users:write", "users:read", "settings:read", "settings:write"],
};

async function main() {
  console.log("Seeding database...");

  // Create development tenant (must exist before users due to FK constraint)
  await prisma.tenant.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Development Tenant",
      status: "active",
    },
  });
  console.log("Created dev tenant: 00000000-0000-0000-0000-000000000001");

  // Create superadmin user (can create additional users via admin panel)
  const passwordHash = await bcrypt.hash(superadminConfig.password, 10);
  await prisma.user.upsert({
    where: { username: superadminConfig.username },
    update: { defaultRedirectPath: superadminConfig.redirectPath },
    create: {
      username: superadminConfig.username,
      passwordHash,
      tenantId: "00000000-0000-0000-0000-000000000001",
      role: superadminConfig.role,
      permissions: superadminConfig.permissions,
      timezone: "UTC",
      defaultRedirectPath: superadminConfig.redirectPath,
    },
  });
  console.log(`Created superadmin user: ${superadminConfig.username}/${superadminConfig.password} (redirects to ${superadminConfig.redirectPath})`);
  console.log("Use this account to log in and create additional users via the admin panel.");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
