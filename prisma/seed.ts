import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "admin@erp.com";

  const existing = await prisma.tenant.findFirst({
    where: { email, isDeleted: false },
  });

  if (existing) {
    console.log(`Tenant already exists: ${email}`);
    return;
  }

  const password = await bcrypt.hash("admin1234", 12);

  const tenant = await prisma.tenant.create({
    data: {
      tenantName: "ERP Demo",
      email,
      password,
      role: "admin",
    },
  });

  console.log(`Seeded tenant: ${tenant.email} (id: ${tenant.id})`);
  console.log("Credentials → email: admin@erp.com | password: admin1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
