import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface SeedStats {
  epsList: number;
  nodes: number;
  projects: number;
  wbsNodes: number;
  activities: number;
}

const stats: SeedStats = {
  epsList: 0,
  nodes: 0,
  projects: 0,
  wbsNodes: 0,
  activities: 0,
};

// Helper to add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

// Helper to generate activity IDs: A10, A20, A30...
function generateActivityId(index: number): string {
  return `A${(index + 1) * 10}`;
}

// Helper to generate WBS codes
function generateWbsCode(parentCode: string, index: number): string {
  if (parentCode) {
    return `${parentCode}.${index + 1}`;
  }
  return `${index + 1}`;
}

// Seed EPS, Nodes, Projects, WBS, and Activities
async function seedPlanner(tenantId: string) {
  console.log("\n=== Seeding Planner Data ===\n");

  // Clean old planner data for this tenant
  console.log("Cleaning existing planner data...");
  await prisma.activity.deleteMany({ where: { tenantId } });
  await prisma.wbsNode.deleteMany({ where: { tenantId } });
  await prisma.plannerEvent.deleteMany({ where: { tenantId } });
  await prisma.plannerSnapshot.deleteMany({ where: { tenantId } });
  await prisma.project.deleteMany({ where: { tenantId } });
  await prisma.node.deleteMany({ where: { tenantId } });
  await prisma.eps.deleteMany({ where: { tenantId } });
  console.log("Cleaned old data.\n");

  // Define EPS structure
  const epsData = [
    {
      name: "Infrastructure",
      nodes: ["Roads & Highways", "Bridges", "Tunnels"],
    },
    {
      name: "Commercial",
      nodes: ["Shopping Malls", "Office Towers", "Hotels"],
    },
    {
      name: "Residential",
      nodes: ["Apartments", "Villas", "Townships"],
    },
  ];

  // Seed EPS and Nodes
  const epsList: { id: string; name: string; nodes: { id: string; name: string }[] }[] = [];
  for (const epsItem of epsData) {
    const eps = await prisma.eps.create({
      data: {
        tenantId,
        name: epsItem.name,
      },
    });
    stats.epsList++;

    const nodesList = [];
    for (const nodeName of epsItem.nodes) {
      const node = await prisma.node.create({
        data: {
          tenantId,
          epsId: eps.id,
          name: nodeName,
        },
      });
      stats.nodes++;
      nodesList.push({ id: node.id, name: node.name });
    }
    epsList.push({ id: eps.id, name: eps.name, nodes: nodesList });
  }

  console.log(`✓ Created ${stats.epsList} EPS structures with ${stats.nodes} nodes`);

  // Define Projects (8 projects across EPS nodes)
  const projectsConfig = [
    {
      projectId: "PRJ-2026-0001",
      name: "Metro Rail Phase 2",
      epsName: "Infrastructure",
      nodeName: "Roads & Highways",
      status: "Active",
      startDate: new Date("2024-06-01"),
      daysToFinish: 540,
      budget: 2500000,
      percentDone: 45,
      largeWbs: true, // 15 root WBS nodes
    },
    {
      projectId: "PRJ-2026-0002",
      name: "Downtown Bridge Expansion",
      epsName: "Infrastructure",
      nodeName: "Bridges",
      status: "Active",
      startDate: new Date("2024-09-15"),
      daysToFinish: 360,
      budget: 1800000,
      percentDone: 35,
      largeWbs: false,
    },
    {
      projectId: "PRJ-2026-0003",
      name: "Mountain Tunnel Complex",
      epsName: "Infrastructure",
      nodeName: "Tunnels",
      status: "Planning",
      startDate: new Date("2026-04-01"),
      daysToFinish: 720,
      budget: 3200000,
      percentDone: 0,
      largeWbs: false,
    },
    {
      projectId: "PRJ-2026-0004",
      name: "Central City Mall",
      epsName: "Commercial",
      nodeName: "Shopping Malls",
      status: "Active",
      startDate: new Date("2024-03-10"),
      daysToFinish: 450,
      budget: 1600000,
      percentDone: 62,
      largeWbs: false,
    },
    {
      projectId: "PRJ-2026-0005",
      name: "Tech Park Tower A",
      epsName: "Commercial",
      nodeName: "Office Towers",
      status: "Completed",
      startDate: new Date("2022-06-01"),
      daysToFinish: 480,
      budget: 2100000,
      percentDone: 100,
      largeWbs: false,
    },
    {
      projectId: "PRJ-2026-0006",
      name: "Grand Hotel Suites",
      epsName: "Commercial",
      nodeName: "Hotels",
      status: "On Hold",
      startDate: new Date("2025-02-01"),
      daysToFinish: 390,
      budget: 1400000,
      percentDone: 15,
      largeWbs: false,
    },
    {
      projectId: "PRJ-2026-0007",
      name: "Riverside Apartments",
      epsName: "Residential",
      nodeName: "Apartments",
      status: "Active",
      startDate: new Date("2024-08-20"),
      daysToFinish: 420,
      budget: 1200000,
      percentDone: 48,
      largeWbs: false,
    },
    {
      projectId: "PRJ-2026-0008",
      name: "Smart City Township",
      epsName: "Residential",
      nodeName: "Townships",
      status: "Active",
      startDate: new Date("2024-11-01"),
      daysToFinish: 600,
      budget: 3500000,
      percentDone: 28,
      largeWbs: true, // 10 root WBS nodes
    },
  ];

  // Map EPS and Node IDs for quick lookup
  const epsMap = new Map(epsList.map((e) => [e.name, e]));

  // Seed Projects and WBS structures
  for (const projConfig of projectsConfig) {
    const epsItem = epsMap.get(projConfig.epsName);
    if (!epsItem) {
      console.warn(`EPS not found: ${projConfig.epsName}`);
      continue;
    }

    const nodeItem = epsItem.nodes.find((n) => n.name === projConfig.nodeName);
    if (!nodeItem) {
      console.warn(`Node not found: ${projConfig.nodeName}`);
      continue;
    }

    // Create project
    const project = await prisma.project.upsert({
      where: {
        tenantId_projectId: {
          tenantId,
          projectId: projConfig.projectId,
        },
      },
      create: {
        tenantId,
        projectId: projConfig.projectId,
        name: projConfig.name,
        epsId: epsItem.id,
        nodeId: nodeItem.id,
        status: projConfig.status,
        startDate: projConfig.startDate,
        finishDate: addDays(projConfig.startDate, projConfig.daysToFinish),
        budget: projConfig.budget,
        percentDone: projConfig.percentDone,
      },
      update: {
        status: projConfig.status,
        percentDone: projConfig.percentDone,
      },
    });
    stats.projects++;

    // Seed WBS structures based on config
    const wbsRootCount = projConfig.largeWbs ? (projConfig.name === "Metro Rail Phase 2" ? 15 : 10) : 4;
    const wbsChildCountRange = projConfig.largeWbs ? [3, 5] : [1, 3];
    const activityPerLeafRange = projConfig.largeWbs ? [5, 10] : [2, 5];

    let activityCounter = 0;

    for (let rootIdx = 0; rootIdx < wbsRootCount; rootIdx++) {
      const rootWbsName = getWbsRootName(projConfig.name, rootIdx, wbsRootCount);
      const rootWbsCode = generateWbsCode("", rootIdx);

      const rootWbs = await prisma.wbsNode.upsert({
        where: {
          tenantId_projectId_wbsCode: {
            tenantId,
            projectId: project.id,
            wbsCode: rootWbsCode,
          },
        },
        create: {
          tenantId,
          projectId: project.id,
          wbsCode: rootWbsCode,
          name: rootWbsName,
        },
        update: {},
      });
      stats.wbsNodes++;

      // Create child WBS nodes
      const childCount =
        wbsChildCountRange[0] +
        Math.floor(Math.random() * (wbsChildCountRange[1] - wbsChildCountRange[0] + 1));

      for (let childIdx = 0; childIdx < childCount; childIdx++) {
        const childWbsName = `${rootWbsName} - Phase ${childIdx + 1}`;
        const childWbsCode = generateWbsCode(rootWbsCode, childIdx);

        const childWbs = await prisma.wbsNode.upsert({
          where: {
            tenantId_projectId_wbsCode: {
              tenantId,
              projectId: project.id,
              wbsCode: childWbsCode,
            },
          },
          create: {
            tenantId,
            projectId: project.id,
            parentId: rootWbs.id,
            wbsCode: childWbsCode,
            name: childWbsName,
          },
          update: {},
        });
        stats.wbsNodes++;

        // Create Activities under this leaf WBS
        const activityCount =
          activityPerLeafRange[0] +
          Math.floor(Math.random() * (activityPerLeafRange[1] - activityPerLeafRange[0] + 1));

        let dayOffset = rootIdx * 60 + childIdx * 20; // Stagger activities

        for (let actIdx = 0; actIdx < activityCount; actIdx++) {
          const activityId = generateActivityId(activityCounter);
          const isMilestone = Math.random() < 0.15; // 15% milestones
          const duration = isMilestone ? 0 : 5 + Math.floor(Math.random() * 56); // 5-60 days
          const activityStartDate = addDays(project.startDate!, dayOffset);
          const activityFinishDate = isMilestone
            ? activityStartDate
            : addDays(activityStartDate, duration);

          const activityName = getActivityName(rootWbsName, actIdx, isMilestone);

          await prisma.activity.upsert({
            where: {
              tenantId_projectId_activityId: {
                tenantId,
                projectId: project.id,
                activityId,
              },
            },
            create: {
              tenantId,
              projectId: project.id,
              wbsNodeId: childWbs.id,
              activityId,
              name: activityName,
              activityType: isMilestone ? "milestone" : "task",
              duration,
              startDate: activityStartDate,
              finishDate: activityFinishDate,
              percentComplete:
                projConfig.status === "Completed"
                  ? 100
                  : projConfig.status === "Active"
                    ? Math.floor(Math.random() * 81) + 20 // 20-100
                    : 0,
            },
            update: {},
          });
          stats.activities++;
          activityCounter++;
          dayOffset += duration + Math.floor(Math.random() * 5); // Add gap between activities
        }
      }
    }

    console.log(
      `✓ Created project "${project.name}" (${wbsRootCount} WBS roots, ${stats.activities} activities total so far)`
    );
  }

  console.log("\n=== Seed Summary ===");
  console.log(`Total EPS created: ${stats.epsList}`);
  console.log(`Total Nodes created: ${stats.nodes}`);
  console.log(`Total Projects created: ${stats.projects}`);
  console.log(`Total WBS Nodes created: ${stats.wbsNodes}`);
  console.log(`Total Activities created: ${stats.activities}`);
  console.log("\n");
}

// Helper function to generate realistic WBS root names
function getWbsRootName(projectName: string, index: number, totalCount: number): string {
  const wbsNames: Record<string, string[]> = {
    "Metro Rail Phase 2": [
      "Civil Works",
      "Electrical Systems",
      "Signaling & Control",
      "Station Design",
      "Rolling Stock Procurement",
      "Track & Guideway",
      "Power Distribution",
      "Safety Systems",
      "Communication Network",
      "Testing & Commissioning",
      "Mechanical Systems",
      "HVAC & Ventilation",
      "Drainage & Utilities",
      "Landscaping & Finishes",
      "Project Management",
    ],
    "Smart City Township": [
      "Land Preparation",
      "Infrastructure Development",
      "Residential Blocks Phase 1",
      "Commercial Zone",
      "Community Facilities",
      "Smart Systems Integration",
      "Utilities & Services",
      "Transportation Network",
      "Environmental Compliance",
      "Final Inspection & Handover",
    ],
  };

  const nameList = wbsNames[projectName] || [
    "Foundation & Excavation",
    "Structural Works",
    "MEP Installation",
    "Finishing & Fit-out",
  ];

  return nameList[index % nameList.length];
}

// Helper function to generate realistic activity names
function getActivityName(wbsName: string, index: number, isMilestone: boolean): string {
  const taskSuffixes = [
    "Design & Planning",
    "Procurement",
    "Installation",
    "Testing & QA",
    "Integration",
    "Documentation",
    "Training",
    "Deployment",
    "Optimization",
    "Handover",
  ];

  const milestoneSuffixes = [
    "Design Complete",
    "Materials Delivered",
    "Installation Complete",
    "Testing Passed",
    "Sign-off",
    "Go-Live",
  ];

  const suffixes = isMilestone ? milestoneSuffixes : taskSuffixes;
  return `${wbsName} - ${suffixes[index % suffixes.length]}`;
}

// Main seed function
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

  // Seed planner data
  await seedPlanner(tenantId);

  console.log("Credentials → email: admin@erp.com | password: admin1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
