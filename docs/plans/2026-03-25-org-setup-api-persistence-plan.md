# Org Setup — API Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace localStorage-based org setup with full API persistence, event-driven backend, and inline validation warnings. Remove "Save & Continue" button, cost centres, and completion overlay.

**Architecture:** Per-entity CRUD APIs under `/api/org-setup/`. An in-process event bus emits domain events after DB writes. The React context fetches state from API on mount (with loader), and each user action dispatches optimistically then calls the API. On error, the context rolls back and shows a toast.

**Tech Stack:** Next.js API routes, Prisma ORM, Zod validation, React context + useReducer, TypeScript EventEmitter.

---

## Task 1: Prisma Schema — Add OBS Models

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add the four new models to `prisma/schema.prisma`**

Add after the `Role` model at end of file:

```prisma
model OBSNode {
  id               String   @id @default(cuid())
  tenantId         String
  parentId         String?
  name             String
  code             String
  type             String   @default("DIVISION")
  nodeHeadPersonId String?
  calendarId       String?
  assignedRoles    Json     @default("[]")
  isActive         Boolean  @default(true)
  sortOrder        Int      @default(0)
  isDeleted        Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  parentNode OBSNode?  @relation("OBSNodeTree", fields: [parentId], references: [id])
  childNodes OBSNode[] @relation("OBSNodeTree")
  people     OBSPerson[]
  equipment  OBSEquipment[]
  materials  OBSMaterial[]

  @@unique([tenantId, code])
  @@index([tenantId, isDeleted])
  @@index([tenantId, parentId, isDeleted])
}

model OBSPerson {
  id              String    @id @default(cuid())
  tenantId        String
  nodeId          String
  name            String
  employeeId      String
  email           String
  roleId          String?
  payType         String    @default("hourly")
  standardRate    Float?
  overtimeRate    Float?
  overtimePay     Boolean   @default(false)
  monthlySalary   Float?
  dailyAllocation Float?
  contractAmount  Float?
  employmentType  String    @default("full-time")
  joinDate        DateTime?
  photoUrl        String?
  isDeleted       Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  node OBSNode @relation(fields: [nodeId], references: [id])

  @@unique([tenantId, employeeId])
  @@index([tenantId, isDeleted])
  @@index([tenantId, nodeId, isDeleted])
}

model OBSEquipment {
  id               String    @id @default(cuid())
  tenantId         String
  nodeId           String
  name             String
  code             String
  category         String    @default("other")
  ownershipType    String    @default("owned")
  billingType      String    @default("owned-internal")
  standardRate     Float     @default(0)
  idleRate         Float?
  mobilizationCost Float?
  rentalStart      DateTime?
  rentalEnd        DateTime?
  isDeleted        Boolean   @default(false)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  node OBSNode @relation(fields: [nodeId], references: [id])

  @@unique([tenantId, code])
  @@index([tenantId, isDeleted])
  @@index([tenantId, nodeId, isDeleted])
}

model OBSMaterial {
  id                  String   @id @default(cuid())
  tenantId            String
  nodeId              String
  name                String
  sku                 String
  category            String   @default("consumable")
  uom                 String   @default("piece")
  standardCostPerUnit Float    @default(0)
  costBasis           String   @default("fixed")
  wastageStandardPct  Float    @default(0)
  leadTimeDays        Int?
  reorderPointQty     Int?
  isDeleted           Boolean  @default(false)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  node OBSNode @relation(fields: [nodeId], references: [id])

  @@unique([tenantId, sku])
  @@index([tenantId, isDeleted])
  @@index([tenantId, nodeId, isDeleted])
}
```

**Step 2: Run migration**

IMPORTANT: Only run this in the main working directory (`/home/kishore/Project/erp-v3`), NEVER in a worktree.

```bash
npx prisma migrate dev --name add-obs-models
```

Expected: Migration created, Prisma Client regenerated.

**Step 3: Verify by running generate**

```bash
npx prisma generate
```

Expected: ✓ Generated Prisma Client

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add OBSNode, OBSPerson, OBSEquipment, OBSMaterial models"
```

---

## Task 2: Event Bus

**Files:**
- Create: `lib/events/event-bus.ts`
- Create: `lib/events/org-events.ts`
- Test: `lib/events/event-bus.test.ts`

**Step 1: Write the failing test**

Create `lib/events/event-bus.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { eventBus, type DomainEvent } from "./event-bus";

describe("EventBus", () => {
  it("emits events to registered handlers", async () => {
    const handler = vi.fn();
    eventBus.on("test.event", handler);

    const event: DomainEvent = {
      type: "test.event",
      tenantId: "t1",
      entityId: "e1",
      payload: { foo: "bar" },
      timestamp: new Date(),
    };

    eventBus.emit(event);

    expect(handler).toHaveBeenCalledWith(event);

    eventBus.off("test.event", handler);
  });

  it("does not call unregistered handlers", () => {
    const handler = vi.fn();
    eventBus.on("test.event2", handler);
    eventBus.off("test.event2", handler);

    eventBus.emit({
      type: "test.event2",
      tenantId: "t1",
      entityId: "e1",
      payload: {},
      timestamp: new Date(),
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("catches handler errors without throwing", () => {
    const badHandler = vi.fn(() => { throw new Error("handler error"); });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    eventBus.on("test.error", badHandler);

    expect(() => {
      eventBus.emit({
        type: "test.error",
        tenantId: "t1",
        entityId: "e1",
        payload: {},
        timestamp: new Date(),
      });
    }).not.toThrow();

    expect(consoleError).toHaveBeenCalled();
    eventBus.off("test.error", badHandler);
    consoleError.mockRestore();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run lib/events/event-bus.test.ts
```

Expected: FAIL — Cannot find module `./event-bus`

**Step 3: Write event bus implementation**

Create `lib/events/event-bus.ts`:

```ts
/* ─────────────────────── Types ────────────────────────────────── */

interface DomainEvent {
  type: string;
  tenantId: string;
  entityId: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

type EventHandler = (event: DomainEvent) => void | Promise<void>;

/* ─────────────────────── EventBus ─────────────────────────────── */

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  off(eventType: string, handler: EventHandler): void {
    this.handlers.get(eventType)?.delete(handler);
  }

  emit(event: DomainEvent): void {
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`[EventBus] Handler error for ${event.type}:`, error);
      }
    }
  }
}

/* ─────────────────────── Singleton ─────────────────────────────── */

const globalForEvents = globalThis as unknown as { eventBus: EventBus | undefined };
const eventBus = globalForEvents.eventBus ?? new EventBus();
if (typeof globalThis !== "undefined") globalForEvents.eventBus = eventBus;

export { eventBus, EventBus, type DomainEvent, type EventHandler };
```

**Step 4: Write org event type definitions**

Create `lib/events/org-events.ts`:

```ts
import { eventBus, type DomainEvent } from "./event-bus";

/* ─────────────────────── Event Types ──────────────────────────── */

const OBS_EVENTS = {
  NODE_CREATED: "obs.node.created",
  NODE_UPDATED: "obs.node.updated",
  NODE_DELETED: "obs.node.deleted",

  PERSON_CREATED: "obs.person.created",
  PERSON_UPDATED: "obs.person.updated",
  PERSON_DELETED: "obs.person.deleted",

  EQUIPMENT_CREATED: "obs.equipment.created",
  EQUIPMENT_UPDATED: "obs.equipment.updated",
  EQUIPMENT_DELETED: "obs.equipment.deleted",

  MATERIAL_CREATED: "obs.material.created",
  MATERIAL_UPDATED: "obs.material.updated",
  MATERIAL_DELETED: "obs.material.deleted",
} as const;

/* ─────────────────────── Emit Helper ──────────────────────────── */

function emitOBSEvent(
  type: (typeof OBS_EVENTS)[keyof typeof OBS_EVENTS],
  tenantId: string,
  entityId: string,
  payload: Record<string, unknown>,
): void {
  const event: DomainEvent = {
    type,
    tenantId,
    entityId,
    payload,
    timestamp: new Date(),
  };
  eventBus.emit(event);
}

export { OBS_EVENTS, emitOBSEvent };
```

**Step 5: Run test to verify it passes**

```bash
npx vitest run lib/events/event-bus.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add lib/events/
git commit -m "feat: add in-process event bus with OBS domain event definitions"
```

---

## Task 3: Zod Validation Schemas

**Files:**
- Create: `lib/validations/org-setup.ts`
- Test: `lib/validations/org-setup.test.ts`

**Step 1: Write the failing test**

Create `lib/validations/org-setup.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  createNodeSchema,
  updateNodeSchema,
  createPersonSchema,
  updatePersonSchema,
  createEquipmentSchema,
  updateEquipmentSchema,
  createMaterialSchema,
  updateMaterialSchema,
} from "./org-setup";

describe("createNodeSchema", () => {
  it("accepts valid node input", () => {
    const result = createNodeSchema.safeParse({
      name: "Engineering",
      code: "ENG-01",
      type: "DIVISION",
      parentId: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createNodeSchema.safeParse({
      name: "",
      code: "ENG-01",
      type: "DIVISION",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createNodeSchema.safeParse({
      name: "Engineering",
      code: "ENG-01",
      type: "INVALID",
    });
    expect(result.success).toBe(false);
  });
});

describe("createPersonSchema", () => {
  it("accepts valid person input", () => {
    const result = createPersonSchema.safeParse({
      nodeId: "node-1",
      name: "John Doe",
      employeeId: "EMP-001",
      email: "john@example.com",
      payType: "hourly",
      employmentType: "full-time",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = createPersonSchema.safeParse({
      nodeId: "node-1",
      name: "John Doe",
      employeeId: "EMP-001",
      email: "not-an-email",
      payType: "hourly",
      employmentType: "full-time",
    });
    expect(result.success).toBe(false);
  });
});

describe("createEquipmentSchema", () => {
  it("accepts valid equipment input", () => {
    const result = createEquipmentSchema.safeParse({
      nodeId: "node-1",
      name: "Excavator",
      code: "EXC-01",
      category: "machinery",
      ownershipType: "owned",
      billingType: "owned-internal",
      standardRate: 150,
    });
    expect(result.success).toBe(true);
  });
});

describe("createMaterialSchema", () => {
  it("accepts valid material input", () => {
    const result = createMaterialSchema.safeParse({
      nodeId: "node-1",
      name: "Cement",
      sku: "CEM-50KG",
      category: "raw-material",
      uom: "bag",
      standardCostPerUnit: 350,
      costBasis: "fixed",
      wastageStandardPct: 5,
    });
    expect(result.success).toBe(true);
  });
});

describe("update schemas are partial", () => {
  it("updateNodeSchema accepts partial input", () => {
    const result = updateNodeSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("updatePersonSchema accepts partial input", () => {
    const result = updatePersonSchema.safeParse({ standardRate: 50 });
    expect(result.success).toBe(true);
  });

  it("updateEquipmentSchema accepts partial input", () => {
    const result = updateEquipmentSchema.safeParse({ standardRate: 200 });
    expect(result.success).toBe(true);
  });

  it("updateMaterialSchema accepts partial input", () => {
    const result = updateMaterialSchema.safeParse({ standardCostPerUnit: 400 });
    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run lib/validations/org-setup.test.ts
```

Expected: FAIL — Cannot find module

**Step 3: Write validation schemas**

Create `lib/validations/org-setup.ts`:

```ts
import { z } from "zod";

/* ─────────────────────── Enums ────────────────────────────────── */

const NODE_TYPES = ["COMPANY_ROOT", "DIVISION", "DEPARTMENT", "TEAM"] as const;
const PAY_TYPES = ["hourly", "salaried", "contract"] as const;
const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "consultant"] as const;
const EQUIPMENT_CATEGORIES = ["safety", "power-tool", "hand-tool", "machinery", "vehicle", "other"] as const;
const OWNERSHIP_TYPES = ["owned", "rented", "leased"] as const;
const BILLING_TYPES = ["daily-rental", "hourly-rental", "pay-per-use", "owned-internal", "fixed-hire"] as const;
const MATERIAL_CATEGORIES = ["consumable", "raw-material", "component", "chemical"] as const;
const UOM_OPTIONS = ["litre", "kg", "bag", "piece", "m2", "m3", "box", "roll", "set"] as const;
const COST_BASIS_OPTIONS = ["fixed", "market-rate", "contract-rate"] as const;

/* ─────────────────────── Assigned Role ────────────────────────── */

const assignedRoleSchema = z.object({
  roleId: z.string().min(1),
  standardRate: z.number().nullable(),
  overtimeRate: z.number().nullable(),
});

/* ─────────────────────── Node ─────────────────────────────────── */

const createNodeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z.string().min(1, "Code is required").max(20),
  type: z.enum(NODE_TYPES),
  parentId: z.string().nullable().default(null),
  nodeHeadPersonId: z.string().nullable().default(null),
  calendarId: z.string().nullable().default(null),
  assignedRoles: z.array(assignedRoleSchema).default([]),
  sortOrder: z.number().int().default(0),
});

const updateNodeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(20).optional(),
  type: z.enum(NODE_TYPES).optional(),
  parentId: z.string().nullable().optional(),
  nodeHeadPersonId: z.string().nullable().optional(),
  calendarId: z.string().nullable().optional(),
  assignedRoles: z.array(assignedRoleSchema).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

/* ─────────────────────── Person ───────────────────────────────── */

const createPersonSchema = z.object({
  nodeId: z.string().min(1),
  name: z.string().min(1, "Name is required").max(100),
  employeeId: z.string().min(1, "Employee ID is required").max(50),
  email: z.string().email("Invalid email"),
  roleId: z.string().nullable().default(null),
  payType: z.enum(PAY_TYPES).default("hourly"),
  standardRate: z.number().nullable().default(null),
  overtimeRate: z.number().nullable().default(null),
  overtimePay: z.boolean().default(false),
  monthlySalary: z.number().nullable().default(null),
  dailyAllocation: z.number().nullable().default(null),
  contractAmount: z.number().nullable().default(null),
  employmentType: z.enum(EMPLOYMENT_TYPES).default("full-time"),
  joinDate: z.string().nullable().default(null),
  photoUrl: z.string().nullable().default(null),
});

const updatePersonSchema = z.object({
  nodeId: z.string().min(1).optional(),
  name: z.string().min(1).max(100).optional(),
  employeeId: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  roleId: z.string().nullable().optional(),
  payType: z.enum(PAY_TYPES).optional(),
  standardRate: z.number().nullable().optional(),
  overtimeRate: z.number().nullable().optional(),
  overtimePay: z.boolean().optional(),
  monthlySalary: z.number().nullable().optional(),
  dailyAllocation: z.number().nullable().optional(),
  contractAmount: z.number().nullable().optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  joinDate: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
});

/* ─────────────────────── Equipment ────────────────────────────── */

const createEquipmentSchema = z.object({
  nodeId: z.string().min(1),
  name: z.string().min(1, "Name is required").max(100),
  code: z.string().min(1, "Code is required").max(20),
  category: z.enum(EQUIPMENT_CATEGORIES).default("other"),
  ownershipType: z.enum(OWNERSHIP_TYPES).default("owned"),
  billingType: z.enum(BILLING_TYPES).default("owned-internal"),
  standardRate: z.number().default(0),
  idleRate: z.number().nullable().default(null),
  mobilizationCost: z.number().nullable().default(null),
  rentalStart: z.string().nullable().default(null),
  rentalEnd: z.string().nullable().default(null),
});

const updateEquipmentSchema = z.object({
  nodeId: z.string().min(1).optional(),
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(20).optional(),
  category: z.enum(EQUIPMENT_CATEGORIES).optional(),
  ownershipType: z.enum(OWNERSHIP_TYPES).optional(),
  billingType: z.enum(BILLING_TYPES).optional(),
  standardRate: z.number().optional(),
  idleRate: z.number().nullable().optional(),
  mobilizationCost: z.number().nullable().optional(),
  rentalStart: z.string().nullable().optional(),
  rentalEnd: z.string().nullable().optional(),
});

/* ─────────────────────── Material ─────────────────────────────── */

const createMaterialSchema = z.object({
  nodeId: z.string().min(1),
  name: z.string().min(1, "Name is required").max(100),
  sku: z.string().min(1, "SKU is required").max(30),
  category: z.enum(MATERIAL_CATEGORIES).default("consumable"),
  uom: z.enum(UOM_OPTIONS).default("piece"),
  standardCostPerUnit: z.number().default(0),
  costBasis: z.enum(COST_BASIS_OPTIONS).default("fixed"),
  wastageStandardPct: z.number().min(0).max(100).default(0),
  leadTimeDays: z.number().int().nullable().default(null),
  reorderPointQty: z.number().int().nullable().default(null),
});

const updateMaterialSchema = z.object({
  nodeId: z.string().min(1).optional(),
  name: z.string().min(1).max(100).optional(),
  sku: z.string().min(1).max(30).optional(),
  category: z.enum(MATERIAL_CATEGORIES).optional(),
  uom: z.enum(UOM_OPTIONS).optional(),
  standardCostPerUnit: z.number().optional(),
  costBasis: z.enum(COST_BASIS_OPTIONS).optional(),
  wastageStandardPct: z.number().min(0).max(100).optional(),
  leadTimeDays: z.number().int().nullable().optional(),
  reorderPointQty: z.number().int().nullable().optional(),
});

/* ─────────────────────── Exports ──────────────────────────────── */

export {
  createNodeSchema,
  updateNodeSchema,
  createPersonSchema,
  updatePersonSchema,
  createEquipmentSchema,
  updateEquipmentSchema,
  createMaterialSchema,
  updateMaterialSchema,
  assignedRoleSchema,
  NODE_TYPES,
  PAY_TYPES,
  EMPLOYMENT_TYPES,
  EQUIPMENT_CATEGORIES,
  OWNERSHIP_TYPES,
  BILLING_TYPES,
  MATERIAL_CATEGORIES,
  UOM_OPTIONS,
  COST_BASIS_OPTIONS,
};
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run lib/validations/org-setup.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add lib/validations/org-setup.ts lib/validations/org-setup.test.ts
git commit -m "feat: add Zod validation schemas for OBS entities"
```

---

## Task 4: API Route — GET /api/org-setup (Aggregate Fetch)

**Files:**
- Create: `app/api/org-setup/route.ts`
- Test: `app/api/org-setup/route.test.ts`

**Step 1: Write the failing test**

Create `app/api/org-setup/route.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  authenticateRequest: vi.fn().mockResolvedValue({
    tenantId: "tenant-1",
    userId: "user-1",
    email: "test@test.com",
    role: "admin",
  }),
  isAuthError: vi.fn((val: unknown) => val instanceof Response),
}));

const mockPrisma = {
  oBSNode: { findMany: vi.fn() },
  oBSPerson: { findMany: vi.fn() },
  oBSEquipment: { findMany: vi.fn() },
  oBSMaterial: { findMany: vi.fn() },
  calendar: { findMany: vi.fn() },
  role: { findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

beforeEach(() => vi.clearAllMocks());

describe("GET /api/org-setup", () => {
  it("returns all org entities for tenant", async () => {
    const { GET } = await import("./route");

    mockPrisma.oBSNode.findMany.mockResolvedValue([{ id: "n1", name: "Root" }]);
    mockPrisma.oBSPerson.findMany.mockResolvedValue([]);
    mockPrisma.oBSEquipment.findMany.mockResolvedValue([]);
    mockPrisma.oBSMaterial.findMany.mockResolvedValue([]);
    mockPrisma.calendar.findMany.mockResolvedValue([]);
    mockPrisma.role.findMany.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/org-setup", {
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.nodes).toHaveLength(1);
    expect(body).toHaveProperty("people");
    expect(body).toHaveProperty("equipment");
    expect(body).toHaveProperty("materials");
    expect(body).toHaveProperty("calendars");
    expect(body).toHaveProperty("roles");
  });

  it("filters calendars to global only (projectId null)", async () => {
    const { GET } = await import("./route");

    mockPrisma.oBSNode.findMany.mockResolvedValue([]);
    mockPrisma.oBSPerson.findMany.mockResolvedValue([]);
    mockPrisma.oBSEquipment.findMany.mockResolvedValue([]);
    mockPrisma.oBSMaterial.findMany.mockResolvedValue([]);
    mockPrisma.calendar.findMany.mockResolvedValue([]);
    mockPrisma.role.findMany.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/org-setup", {
      headers: { authorization: "Bearer valid-token" },
    });
    await GET(req);

    expect(mockPrisma.calendar.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-1",
          isDeleted: false,
          projectId: null,
        }),
      }),
    );
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run app/api/org-setup/route.test.ts
```

Expected: FAIL

**Step 3: Write the route implementation**

Create `app/api/org-setup/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";

/**
 * @swagger
 * /api/org-setup:
 *   get:
 *     summary: Get full organization setup state for the authenticated tenant
 *     description: Returns all OBS nodes, people, equipment, materials, global calendars, and roles in a single response.
 *     responses:
 *       200:
 *         description: Full org setup state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nodes:
 *                   type: array
 *                   items:
 *                     type: object
 *                 people:
 *                   type: array
 *                   items:
 *                     type: object
 *                 equipment:
 *                   type: array
 *                   items:
 *                     type: object
 *                 materials:
 *                   type: array
 *                   items:
 *                     type: object
 *                 calendars:
 *                   type: array
 *                   items:
 *                     type: object
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;

    const [nodes, people, equipment, materials, calendars, roles] =
      await Promise.all([
        prisma.oBSNode.findMany({
          where: { tenantId, isDeleted: false },
          orderBy: { sortOrder: "asc" },
        }),
        prisma.oBSPerson.findMany({
          where: { tenantId, isDeleted: false },
          orderBy: { createdAt: "asc" },
        }),
        prisma.oBSEquipment.findMany({
          where: { tenantId, isDeleted: false },
          orderBy: { createdAt: "asc" },
        }),
        prisma.oBSMaterial.findMany({
          where: { tenantId, isDeleted: false },
          orderBy: { createdAt: "asc" },
        }),
        prisma.calendar.findMany({
          where: { tenantId, isDeleted: false, projectId: null },
          include: { exceptions: { where: { isDeleted: false } } },
          orderBy: { createdAt: "asc" },
        }),
        prisma.role.findMany({
          where: { tenantId, isDeleted: false },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    return NextResponse.json({ nodes, people, equipment, materials, calendars, roles });
  } catch (error) {
    console.error("GET /api/org-setup error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run app/api/org-setup/route.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add app/api/org-setup/route.ts app/api/org-setup/route.test.ts
git commit -m "feat: add GET /api/org-setup aggregate fetch endpoint"
```

---

## Task 5: API Route — Nodes CRUD

**Files:**
- Create: `app/api/org-setup/nodes/route.ts`
- Create: `app/api/org-setup/nodes/[id]/route.ts`
- Test: `app/api/org-setup/nodes/route.test.ts`
- Test: `app/api/org-setup/nodes/[id]/route.test.ts`

Follow the same pattern as `/api/roles`:
- `POST /api/org-setup/nodes` — validate with `createNodeSchema`, check duplicate code per tenant, create with `tenantId`, emit `obs.node.created`
- `PATCH /api/org-setup/nodes/[id]` — validate with `updateNodeSchema`, find existing (tenantId + isDeleted: false), update, emit `obs.node.updated`
- `DELETE /api/org-setup/nodes/[id]` — find existing, collect all descendant IDs via recursive query, soft-delete node + all descendants + their people/equipment/materials in a `prisma.$transaction`, emit `obs.node.deleted`

**Important for DELETE cascade:**

```ts
// Collect descendant IDs recursively
async function collectDescendantIds(tenantId: string, nodeId: string): Promise<string[]> {
  const children = await prisma.oBSNode.findMany({
    where: { tenantId, parentId: nodeId, isDeleted: false },
    select: { id: true },
  });

  const descendantIds: string[] = [];
  for (const child of children) {
    descendantIds.push(child.id);
    const grandchildren = await collectDescendantIds(tenantId, child.id);
    descendantIds.push(...grandchildren);
  }
  return descendantIds;
}

// In DELETE handler — use transaction:
const allIds = [id, ...await collectDescendantIds(tenantId, id)];
await prisma.$transaction([
  prisma.oBSNode.updateMany({ where: { id: { in: allIds }, tenantId }, data: { isDeleted: true } }),
  prisma.oBSPerson.updateMany({ where: { nodeId: { in: allIds }, tenantId }, data: { isDeleted: true } }),
  prisma.oBSEquipment.updateMany({ where: { nodeId: { in: allIds }, tenantId }, data: { isDeleted: true } }),
  prisma.oBSMaterial.updateMany({ where: { nodeId: { in: allIds }, tenantId }, data: { isDeleted: true } }),
]);
```

All routes must have full `@swagger` JSDoc. Follow exact patterns from `app/api/roles/route.ts` and `app/api/roles/[id]/route.ts`.

Tests should cover: successful CRUD, validation errors (400), not found (404), duplicate code (409 for POST), and cascade delete.

**Commit after tests pass:**

```bash
git add app/api/org-setup/nodes/
git commit -m "feat: add CRUD API routes for OBS nodes with cascade delete"
```

---

## Task 6: API Route — People CRUD

**Files:**
- Create: `app/api/org-setup/people/route.ts`
- Create: `app/api/org-setup/people/[id]/route.ts`
- Test: `app/api/org-setup/people/route.test.ts`
- Test: `app/api/org-setup/people/[id]/route.test.ts`

Same pattern as nodes:
- `POST` — validate with `createPersonSchema`, check nodeId exists and belongs to tenant, check duplicate employeeId per tenant, create, emit `obs.person.created`
- `PATCH` — validate with `updatePersonSchema`, find existing, update, emit `obs.person.updated`
- `DELETE` — find existing, soft-delete, clear `nodeHeadPersonId` on any nodes referencing this person, emit `obs.person.deleted`

**Important for DELETE:** Clear node head references in same transaction:

```ts
await prisma.$transaction([
  prisma.oBSPerson.update({ where: { id }, data: { isDeleted: true } }),
  prisma.oBSNode.updateMany({
    where: { tenantId, nodeHeadPersonId: id, isDeleted: false },
    data: { nodeHeadPersonId: null },
  }),
]);
```

Full `@swagger` JSDoc on every handler. Tests cover happy path, validation errors, not found, duplicate employeeId.

**Commit:**

```bash
git add app/api/org-setup/people/
git commit -m "feat: add CRUD API routes for OBS people"
```

---

## Task 7: API Routes — Equipment & Materials CRUD

**Files:**
- Create: `app/api/org-setup/equipment/route.ts`
- Create: `app/api/org-setup/equipment/[id]/route.ts`
- Create: `app/api/org-setup/materials/route.ts`
- Create: `app/api/org-setup/materials/[id]/route.ts`
- Tests for each (4 test files)

Same pattern as people. Simpler — no cascade side effects on delete.

- Equipment: check duplicate code per tenant on POST
- Materials: check duplicate SKU per tenant on POST
- Both: verify nodeId exists and belongs to tenant on POST
- Both: emit corresponding OBS events

**Commit:**

```bash
git add app/api/org-setup/equipment/ app/api/org-setup/materials/
git commit -m "feat: add CRUD API routes for OBS equipment and materials"
```

---

## Task 8: Calendar API Routes (if not existing)

**Files:**
- Create: `app/api/org-setup/calendars/route.ts` (POST, GET)
- Create: `app/api/org-setup/calendars/[id]/route.ts` (PATCH, DELETE)
- Tests for each

Calendar and CalendarException models already exist in the schema. These routes handle global calendars (`projectId: null`, `category: "global"`).

- `POST` — create calendar with `projectId: null, category: "global"`, include exceptions in request body
- `PATCH` — update calendar fields, handle exceptions add/remove
- `DELETE` — soft-delete calendar, clear `calendarId` on any OBSNodes referencing it

Follow the same auth + tenant isolation + swagger patterns.

**Commit:**

```bash
git add app/api/org-setup/calendars/
git commit -m "feat: add CRUD API routes for global calendars in org setup"
```

---

## Task 9: Remove Cost Centres from Frontend

**Files:**
- Delete: `components/org-setup/cost-centres-modal.tsx`
- Modify: `components/org-setup/types.ts` — remove `CostCentre`, `CostCentreType`, `costCentres` from `OBSNode` and `OrgSetupState`
- Modify: `components/org-setup/context.tsx` — remove `ADD_COST_CENTRE`, `UPDATE_COST_CENTRE`, cost centre state, cost centres from `createInitialState`
- Modify: `components/org-setup/settings-tab.tsx` — remove `CostCentresSection` accordion and the component
- Modify: `components/org-setup/header.tsx` — remove cost centres button
- Modify: `components/org-setup/org-setup-screen.tsx` — remove `CostCentresModal` import and usage
- Modify: `components/org-setup/node-card.tsx` — remove cost centre references if any

**Step 1:** Remove cost centre types from `types.ts` — delete `CostCentreType`, `CostCentre`, remove `costCentres` from `OBSNode` interface and `OrgSetupState`

**Step 2:** Remove cost centre actions and state from `context.tsx` — delete `ADD_COST_CENTRE`, `UPDATE_COST_CENTRE` actions, remove `costCentres` from `createInitialState` and reducer cases, remove from `REMOVE_NODE` cascade

**Step 3:** Remove `CostCentresSection` from `settings-tab.tsx` and the "Cost Centres" accordion

**Step 4:** Remove cost centres button from `header.tsx` (the `GlobalButton` for "Cost Centres" and the `"costcentres"` panel type)

**Step 5:** Remove `CostCentresModal` from `org-setup-screen.tsx`

**Step 6:** Delete `components/org-setup/cost-centres-modal.tsx`

**Step 7:** Update `GlobalPanelType` in `types.ts` to remove `"costcentres"` — becomes `"calendars" | "roles" | null`

**Step 8:** Run existing tests to verify nothing is broken:

```bash
npx vitest run components/org-setup/
```

**Step 9: Commit**

```bash
git add components/org-setup/
git commit -m "refactor: remove cost centres from org setup"
```

---

## Task 10: Remove localStorage & Save Button from Frontend

**Files:**
- Delete: `components/org-setup/use-org-autosave.ts`
- Delete: `components/org-setup/validation.ts`
- Delete: `components/org-setup/completion-overlay.tsx`
- Modify: `components/org-setup/context.tsx` — remove `LOAD_DRAFT` action, remove `saveDraft`, remove localStorage reads/writes, add `isLoading` to state
- Modify: `components/org-setup/org-setup-screen.tsx` — remove autosave hook, remove `CompletionOverlay`, remove `handleSaveAndContinue`, remove `handleContinueToDashboard`, remove `onComplete` prop
- Modify: `components/org-setup/header.tsx` — remove "Save & Continue" button, remove `AutosaveIndicator`, remove `saveStatus`/`lastSavedAt` props
- Modify: `app/(app)/organization-structure/page.tsx` — remove `onComplete` prop, just render `<OrgSetupScreen companyName={...} />`

**Step 1:** Remove localStorage code from `context.tsx`:
- Delete the `useEffect` that reads `opus_setup_draft` from localStorage (lines 520-532)
- Delete the `saveDraft` callback (lines 534-543)
- Remove `saveDraft` from context value
- Remove `LOAD_DRAFT` case from reducer
- Add `isLoading: boolean` to `UIState` in types, default `true`

**Step 2:** Delete `use-org-autosave.ts`, `validation.ts`, `completion-overlay.tsx`

**Step 3:** Simplify `org-setup-screen.tsx`:
- Remove imports for `useOrgAutosave`, `CompletionOverlay`, `validateOrgSetup`, `CostCentresModal`
- Remove `onComplete` prop from both `OrgSetupScreenInner` and `OrgSetupScreen`
- Remove `handleSaveAndContinue`, `handleContinueToDashboard`, `showCompletion` state
- Remove `saveStatus`/`lastSavedAt` props from `<Header>`

**Step 4:** Simplify `header.tsx`:
- Remove `saveStatus`/`lastSavedAt` props and `AutosaveIndicator`
- Remove "Save & Continue" button
- Keep the logo, title, and global settings buttons (Calendars, Roles)

**Step 5:** Simplify `page.tsx`:
- Remove `onComplete` and `useRouter`
- Just render `<OrgSetupScreen companyName={tenant.tenantName} />`

**Step 6: Commit**

```bash
git add components/org-setup/ app/\(app\)/organization-structure/
git commit -m "refactor: remove localStorage, save button, and completion overlay from org setup"
```

---

## Task 11: API Fetch Hook — `use-org-api.ts`

**Files:**
- Create: `hooks/use-org-api.ts`
- Test: `hooks/use-org-api.test.ts`

This hook provides:
- `fetchOrgSetup()` — GET /api/org-setup, returns full state
- `createNode(data)` — POST, returns created node
- `updateNode(id, data)` — PATCH, returns updated node
- `deleteNode(id)` — DELETE
- Same for people, equipment, materials, calendars

Each method:
1. Calls the API with auth token from cookie/header
2. Returns the response data on success
3. Throws on error (caller handles toast/rollback)

**Pattern:**

```ts
import { useCallback } from "react";

function useOrgApi() {
  const apiFetch = useCallback(async (url: string, options?: RequestInit) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      credentials: "include",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `API error: ${res.status}`);
    }

    return res.json();
  }, []);

  const fetchOrgSetup = useCallback(() => apiFetch("/api/org-setup"), [apiFetch]);

  const createNode = useCallback(
    (data: Record<string, unknown>) =>
      apiFetch("/api/org-setup/nodes", { method: "POST", body: JSON.stringify(data) }),
    [apiFetch],
  );

  // ... same pattern for updateNode, deleteNode, createPerson, etc.

  return {
    fetchOrgSetup,
    createNode,
    updateNode,
    deleteNode,
    createPerson,
    updatePerson,
    deletePerson,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    createMaterial,
    updateMaterial,
    deleteMaterial,
  };
}

export { useOrgApi };
```

**Commit:**

```bash
git add hooks/use-org-api.ts hooks/use-org-api.test.ts
git commit -m "feat: add useOrgApi hook for org setup API calls"
```

---

## Task 12: Wire Context to API — Fetch on Mount + Optimistic Mutations

**Files:**
- Modify: `components/org-setup/context.tsx` — add API fetch on mount, wire dispatch actions to API calls
- Modify: `components/org-setup/org-setup-screen.tsx` — show loader while `isLoading`

**Step 1:** Add `HYDRATE_FROM_API` action to reducer:

```ts
| { type: "HYDRATE_FROM_API"; data: { nodes: any[]; people: any[]; equipment: any[]; materials: any[]; calendars: any[]; roles: any[] } }
| { type: "SET_LOADING"; isLoading: boolean }
```

The `HYDRATE_FROM_API` handler converts the flat arrays from the API into the `Record<string, T>` shape used by context.

**Step 2:** In `OrgSetupProvider`, add `useEffect` to fetch on mount:

```ts
useEffect(() => {
  fetchOrgSetup()
    .then((data) => {
      dispatch({ type: "HYDRATE_FROM_API", data });
      dispatch({ type: "SET_LOADING", isLoading: false });
    })
    .catch((err) => {
      console.error("Failed to load org setup:", err);
      dispatch({ type: "SET_LOADING", isLoading: false });
    });
}, []);
```

**Step 3:** Create a root node via API if none exists (first-time setup):

In the fetch handler, after `HYDRATE_FROM_API`, if `nodes` array is empty, call `createNode` with the COMPANY_ROOT node, then dispatch `ADD_NODE` with the server-returned ID.

**Step 4:** In `org-setup-screen.tsx`, show a loader while `isLoading`:

```tsx
if (state.ui.isLoading) {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
```

**Step 5:** Wire each user-facing action to call the API after dispatch. Wrap dispatches in a helper that:
1. Dispatches optimistically
2. Calls API
3. On success — update with server-returned data (real IDs)
4. On error — rollback by re-fetching from API, show toast

**Step 6: Commit**

```bash
git add components/org-setup/context.tsx components/org-setup/org-setup-screen.tsx
git commit -m "feat: wire org setup context to API with fetch-on-mount and optimistic mutations"
```

---

## Task 13: Inline Validation Warnings on Node Cards

**Files:**
- Modify: `components/org-setup/node-card.tsx`

**Step 1:** Add warning indicators to node cards based on current state:

```tsx
// Inside NodeCard, compute warnings:
const warnings: string[] = [];

// Non-root nodes with people but no calendar
if (!isRoot && peopleCount > 0 && !node.calendarId) {
  warnings.push("No calendar assigned");
}

// Root node without a node head
if (isRoot && !node.nodeHeadPersonId) {
  warnings.push("No node head assigned");
}

// Any node with assigned roles that have null/zero rates
const badRates = node.assignedRoles.filter(
  (r) => r.standardRate === null || r.standardRate <= 0
);
if (badRates.length > 0) {
  warnings.push(`${badRates.length} role(s) missing rates`);
}
```

**Step 2:** Render warnings below stats section:

```tsx
{warnings.length > 0 && (
  <div className="flex flex-col gap-0.5 px-3 pb-1">
    {warnings.map((w) => (
      <span key={w} className="flex items-center gap-1 text-[11px] text-warning-foreground">
        <AlertTriangle size={10} className="shrink-0" />
        {w}
      </span>
    ))}
  </div>
)}
```

Import `AlertTriangle` from `lucide-react`.

**Step 3: Commit**

```bash
git add components/org-setup/node-card.tsx
git commit -m "feat: add inline validation warnings on org setup node cards"
```

---

## Task 14: Integration Testing — Full Flow

**Files:**
- Create: `app/api/org-setup/integration.test.ts`

Write integration tests that verify the full flow:
1. GET returns empty state for new tenant
2. POST node creates root → GET returns it
3. POST person under node → GET includes person
4. PATCH person rate → GET reflects change
5. DELETE node cascades to children and people
6. Events are emitted (mock the event bus)

These tests mock Prisma (same pattern as role tests) but test the full request/response cycle.

**Commit:**

```bash
git add app/api/org-setup/integration.test.ts
git commit -m "test: add integration tests for org setup API flow"
```

---

## Task 15: Final Cleanup & Verification

**Step 1:** Search for any remaining localStorage references:

```bash
npx grep -r "localStorage" components/org-setup/ --include="*.ts" --include="*.tsx"
npx grep -r "opus_setup" . --include="*.ts" --include="*.tsx"
```

Remove any found.

**Step 2:** Search for remaining cost centre references:

```bash
npx grep -ri "costcentre\|cost.centre\|cost_centre" components/org-setup/ --include="*.ts" --include="*.tsx"
```

Remove any found.

**Step 3:** Run all tests:

```bash
npx vitest run
```

Expected: All pass.

**Step 4:** Run TypeScript check:

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: final cleanup — remove stale localStorage and cost centre references"
```
