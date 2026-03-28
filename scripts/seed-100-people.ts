import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

/**
 * Realistic Indian names for OBSPerson seed data
 * Mix of common first and last names from various regions
 */
const firstNames = [
  "Rajesh", "Priya", "Arjun", "Anaya", "Vikram", "Deepika", "Arun", "Neha", "Sanjay", "Pooja",
  "Rohit", "Shreya", "Nikhil", "Anjali", "Ashish", "Divya", "Vivek", "Ritika", "Harsh", "Saanvi",
  "Gaurav", "Meera", "Yash", "Aisha", "Kunal", "Simran", "Abhishek", "Sneha", "Rohan", "Vaanya",
  "Karan", "Isha", "Adnan", "Nisha", "Suresh", "Pallavi", "Aditya", "Kareena", "Manoj", "Sakshi",
  "Rahul", "Manisha", "Harshit", "Ruhi", "Siddharth", "Avni", "Anand", "Riya", "Jatin", "Shreya",
  "Akash", "Priya", "Mohit", "Tanvi", "Naresh", "Swati", "Aryan", "Aparna", "Deepak", "Minal",
  "Ravi", "Esha", "Manish", "Aadhya", "Rajat", "Nandini", "Vishal", "Zoya", "Saurav", "Anya",
  "Pankaj", "Anu", "Bhavesh", "Diya", "Vimal", "Gina", "Yogesh", "Hina", "Sandeep", "Ila",
  "Chandan", "Jiya", "Dinesh", "Kiya", "Emran", "Lima", "Farhan", "Mia", "Gautam", "Naina",
  "Harsh", "Olivia", "Ishan", "Priya", "Javed", "Qiyana", "Kapil", "Raina", "Lalit", "Sara"
];

const lastNames = [
  "Sharma", "Patel", "Kumar", "Singh", "Verma", "Gupta", "Nair", "Reddy", "Rao", "Iyer",
  "Desai", "Mishra", "Saxena", "Joshi", "Menon", "Agarwal", "Chopra", "Malhotra", "Kapoor", "Bhat",
  "Pandey", "Sinha", "Yadav", "Tripathi", "Dwivedi", "Trivedi", "Srivastava", "Bhattacharya", "Sen", "Das",
  "Roy", "Bose", "Mukherjee", "Banerjee", "Chatterjee", "Ghosh", "Dutta", "Mitra", "Roy", "Saha",
  "Khan", "Ali", "Ahmed", "Hassan", "Ibrahim", "Malik", "Hussain", "Mohammad", "Saleem", "Siddiqui",
  "Mathew", "Thomas", "Joseph", "George", "Varghese", "Sebastian", "Kurian", "Carvalho", "D'Souza", "Fernandes",
  "Gowda", "Hegde", "Bhaskar", "Upadhyay", "Chaubey", "Shrivastav", "Trivedi", "Jaiswal", "Choudhury", "Banerjee"
];

/**
 * Generate realistic Indian email patterns
 */
function generateEmail(firstName: string, lastName: string, empId: string): string {
  const patterns = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}@company.com`,
    `${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}@company.com`,
    `${firstName.toLowerCase()}.${empId}@company.com`,
  ];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

/**
 * Generate a random person record
 */
function generatePerson(index: number, tenantId: string) {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const employeeId = `EMP-${101 + index}`;

  const payTypes = ["hourly", "salaried", "contract"] as const;
  const employmentTypes = ["full-time", "part-time", "contract", "consultant"] as const;

  const payType = payTypes[Math.floor(Math.random() * payTypes.length)];
  const employmentType = employmentTypes[Math.floor(Math.random() * employmentTypes.length)];

  // Distribute join dates over past 3 years
  const today = new Date();
  const threeYearsAgo = new Date(today);
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const joinDate = new Date(threeYearsAgo.getTime() + Math.random() * (today.getTime() - threeYearsAgo.getTime()));

  // Generate rates based on pay type and employment type
  let standardRate: number | null = null;
  let overtimeRate: number | null = null;
  let monthlySalary: number | null = null;
  let contractAmount: number | null = null;
  let overtimePay = false;

  if (payType === "hourly") {
    // Hourly rates: ₹200-1500 (realistic Indian market)
    standardRate = Math.floor(Math.random() * 1300) + 200;
    overtimePay = Math.random() > 0.5;
    if (overtimePay) {
      overtimeRate = standardRate * 1.5; // 1.5x standard rate
    }
  } else if (payType === "salaried") {
    // Monthly salaries: ₹30,000 - ₹150,000
    monthlySalary = Math.floor(Math.random() * 120000) + 30000;
  } else if (payType === "contract") {
    // Contract amounts: ₹100,000 - ₹1,000,000
    contractAmount = Math.floor(Math.random() * 900000) + 100000;
  }

  // Daily allocation: 1-8 hours per day
  const dailyAllocation = Math.floor(Math.random() * 8) + 1;

  return {
    tenantId,
    nodeId: null, // All unassigned for testing pagination
    name: `${firstName} ${lastName}`,
    employeeId,
    email: generateEmail(firstName, lastName, employeeId),
    roleId: null, // All unassigned
    payType,
    standardRate,
    overtimeRate,
    overtimePay,
    monthlySalary,
    dailyAllocation,
    contractAmount,
    employmentType,
    joinDate,
    photoUrl: null,
    isDeleted: false,
  };
}

/**
 * Main seed function for 100 people
 */
async function main() {
  console.log("\n=== Seeding 100 OBSPerson Records ===\n");

  // Get the first tenant (or any existing tenant)
  const tenant = await prisma.tenant.findFirst({
    where: { isDeleted: false },
  });

  if (!tenant) {
    console.error("❌ No tenant found. Please seed tenants first with: npx prisma db seed");
    process.exit(1);
  }

  const tenantId = tenant.id;
  console.log(`Using tenant: ${tenant.tenantName} (${tenant.email})`);

  // Check if EMP-101 already exists (idempotency check)
  const existingPerson = await prisma.oBSPerson.findFirst({
    where: { tenantId, employeeId: "EMP-101", isDeleted: false },
  });

  if (existingPerson) {
    console.log("✓ EMP-101 already exists. Skipping seed to maintain idempotency.\n");
    process.exit(0);
  }

  // Generate 100 people records
  const peopleData = [];
  for (let i = 0; i < 100; i++) {
    peopleData.push(generatePerson(i, tenantId));
  }

  // Insert all people using createMany (efficient batch insert)
  const result = await prisma.oBSPerson.createMany({
    data: peopleData,
    skipDuplicates: true, // Skip if unique constraint violated
  });

  console.log(`✓ Created ${result.count} OBSPerson records`);
  console.log(`\nEmployee ID Range: EMP-101 → EMP-200`);
  console.log(`\nStatus Distribution:`);

  // Query to show distribution
  const payTypeDistribution = await prisma.oBSPerson.groupBy({
    by: ["payType"],
    where: { tenantId, isDeleted: false },
    _count: true,
  });

  const employmentTypeDistribution = await prisma.oBSPerson.groupBy({
    by: ["employmentType"],
    where: { tenantId, isDeleted: false },
    _count: true,
  });

  console.log("\nPay Type Distribution:");
  payTypeDistribution.forEach((group) => {
    console.log(`  ${group.payType}: ${group._count}`);
  });

  console.log("\nEmployment Type Distribution:");
  employmentTypeDistribution.forEach((group) => {
    console.log(`  ${group.employmentType}: ${group._count}`);
  });

  // Show a few sample records
  const samples = await prisma.oBSPerson.findMany({
    where: { tenantId, isDeleted: false, employeeId: { in: ["EMP-101", "EMP-102", "EMP-103"] } },
    take: 3,
  });

  console.log("\nSample Records:");
  samples.forEach((person) => {
    console.log(
      `  ${person.employeeId}: ${person.name} | ${person.payType} | ${person.employmentType} | Email: ${person.email}`
    );
  });

  console.log("\n✅ Seed completed successfully!\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
