import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "admin@erp.com";
  const password = await bcrypt.hash("admin1234", 12);

  // Seed Tenant
  const existing = await prisma.tenant.findFirst({
    where: { email, isDeleted: false },
  });

  let tenantId: string;

  if (existing) {
    console.log(`Tenant already exists: ${email}`);
    tenantId = existing.id;
  } else {
    const tenant = await prisma.tenant.create({
      data: {
        tenantName: "ERP Demo",
        email,
        password,
        role: "admin",
      },
    });
    tenantId = tenant.id;
    console.log(`Seeded tenant: ${tenant.email} (id: ${tenant.id})`);
  }

  // Seed User (one-to-one with Tenant for now)
  const existingUser = await prisma.user.findFirst({
    where: { tenantId, email, isDeleted: false },
  });

  if (existingUser) {
    console.log(`User already exists: ${email}`);
  } else {
    const user = await prisma.user.create({
      data: {
        tenantId,
        email,
        name: "Admin",
        role: "admin",
        password,
      },
    });
    console.log(`Seeded user: ${user.email} (id: ${user.id})`);
  }

  // Seed CanvasSnapshot (version tracker)
  const existingSnapshot = await prisma.canvasSnapshot.findUnique({
    where: { tenantId },
  });

  if (!existingSnapshot) {
    await prisma.canvasSnapshot.create({
      data: { tenantId, version: 0 },
    });
    console.log("Seeded canvas snapshot (version: 0)");
  }

  console.log("Credentials → email: admin@erp.com | password: admin1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
