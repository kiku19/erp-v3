// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ─────────────────────── Auth Mock ──────────────────────────────── */

vi.mock("@/lib/api-auth", () => ({
  authenticateRequest: vi.fn().mockResolvedValue({
    tenantId: "tenant-1",
    userId: "user-1",
    email: "test@test.com",
    role: "admin",
  }),
  isAuthError: vi.fn((val: unknown) => val instanceof Response),
}));

/* ─────────────────────── Events Mock ────────────────────────────── */

const mockEmitOBSEvent = vi.fn();
vi.mock("@/lib/events/org-events", () => ({
  emitOBSEvent: (...args: unknown[]) => mockEmitOBSEvent(...args),
  OBS_EVENTS: {
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
  },
}));

/* ─────────────────────── In-Memory Store ────────────────────────── */

interface StoreRecord {
  [key: string]: unknown;
  id: string;
  tenantId: string;
  isDeleted: boolean;
}

let nodeStore: Record<string, StoreRecord> = {};
let personStore: Record<string, StoreRecord> = {};
let equipmentStore: Record<string, StoreRecord> = {};
let materialStore: Record<string, StoreRecord> = {};

let idCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

function matchesWhere(
  record: StoreRecord,
  where: Record<string, unknown>,
): boolean {
  for (const [key, value] of Object.entries(where)) {
    if (key === "id" && typeof value === "object" && value !== null && "in" in value) {
      if (!(value as { in: string[] }).in.includes(record.id)) return false;
    } else if (key === "nodeId" && typeof value === "object" && value !== null && "in" in value) {
      if (!(value as { in: string[] }).in.includes(record.nodeId as string)) return false;
    } else if (record[key] !== value) {
      return false;
    }
  }
  return true;
}

/* ─────────────────────── Prisma Mock ────────────────────────────── */

const mockPrisma = {
  oBSNode: {
    findMany: vi.fn((args?: { where?: Record<string, unknown>; select?: unknown; orderBy?: unknown }) => {
      const where = args?.where ?? {};
      return Promise.resolve(
        Object.values(nodeStore).filter((n) => matchesWhere(n, where)),
      );
    }),
    findFirst: vi.fn((args: { where: Record<string, unknown> }) => {
      const found = Object.values(nodeStore).find((n) =>
        matchesWhere(n, args.where),
      );
      return Promise.resolve(found ?? null);
    }),
    create: vi.fn((args: { data: Record<string, unknown> }) => {
      const id = nextId("node");
      const node: StoreRecord = {
        id,
        tenantId: "tenant-1",
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null,
        nodeHeadPersonId: null,
        calendarId: null,
        assignedRoles: [],
        sortOrder: 0,
        isActive: true,
        ...args.data,
      };
      nodeStore[id] = node;
      return Promise.resolve(node);
    }),
    update: vi.fn((args: { where: { id: string }; data: Record<string, unknown> }) => {
      const node = nodeStore[args.where.id];
      if (node) {
        Object.assign(node, args.data, { updatedAt: new Date() });
      }
      return Promise.resolve(node);
    }),
    updateMany: vi.fn((args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      let count = 0;
      for (const node of Object.values(nodeStore)) {
        if (matchesWhere(node, args.where)) {
          Object.assign(node, args.data);
          count++;
        }
      }
      return Promise.resolve({ count });
    }),
  },
  oBSPerson: {
    findMany: vi.fn((args?: { where?: Record<string, unknown>; orderBy?: unknown }) => {
      const where = args?.where ?? {};
      return Promise.resolve(
        Object.values(personStore).filter((p) => matchesWhere(p, where)),
      );
    }),
    findFirst: vi.fn((args: { where: Record<string, unknown> }) => {
      const found = Object.values(personStore).find((p) =>
        matchesWhere(p, args.where),
      );
      return Promise.resolve(found ?? null);
    }),
    create: vi.fn((args: { data: Record<string, unknown> }) => {
      const id = nextId("person");
      const person: StoreRecord = {
        id,
        tenantId: "tenant-1",
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        roleId: null,
        payType: "hourly",
        standardRate: null,
        overtimeRate: null,
        overtimePay: false,
        monthlySalary: null,
        dailyAllocation: null,
        contractAmount: null,
        employmentType: "full-time",
        joinDate: null,
        photoUrl: null,
        ...args.data,
      };
      personStore[id] = person;
      return Promise.resolve(person);
    }),
    update: vi.fn((args: { where: { id: string }; data: Record<string, unknown> }) => {
      const person = personStore[args.where.id];
      if (person) {
        Object.assign(person, args.data, { updatedAt: new Date() });
      }
      return Promise.resolve(person);
    }),
    updateMany: vi.fn((args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      let count = 0;
      for (const person of Object.values(personStore)) {
        if (matchesWhere(person, args.where)) {
          Object.assign(person, args.data);
          count++;
        }
      }
      return Promise.resolve({ count });
    }),
  },
  oBSEquipment: {
    findMany: vi.fn((args?: { where?: Record<string, unknown>; orderBy?: unknown }) => {
      const where = args?.where ?? {};
      return Promise.resolve(
        Object.values(equipmentStore).filter((e) => matchesWhere(e, where)),
      );
    }),
    updateMany: vi.fn((args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      let count = 0;
      for (const eq of Object.values(equipmentStore)) {
        if (matchesWhere(eq, args.where)) {
          Object.assign(eq, args.data);
          count++;
        }
      }
      return Promise.resolve({ count });
    }),
  },
  oBSMaterial: {
    findMany: vi.fn((args?: { where?: Record<string, unknown>; orderBy?: unknown }) => {
      const where = args?.where ?? {};
      return Promise.resolve(
        Object.values(materialStore).filter((m) => matchesWhere(m, where)),
      );
    }),
    updateMany: vi.fn((args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      let count = 0;
      for (const mat of Object.values(materialStore)) {
        if (matchesWhere(mat, args.where)) {
          Object.assign(mat, args.data);
          count++;
        }
      }
      return Promise.resolve({ count });
    }),
  },
  calendar: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  role: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  $transaction: vi.fn((fns: Promise<unknown>[]) => Promise.all(fns)),
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

/* ─────────────────────── Reset ──────────────────────────────────── */

beforeEach(() => {
  vi.clearAllMocks();
  nodeStore = {};
  personStore = {};
  equipmentStore = {};
  materialStore = {};
  idCounter = 0;

  // Re-wire mock implementations after clearAllMocks
  mockPrisma.oBSNode.findMany.mockImplementation(
    (args?: { where?: Record<string, unknown> }) => {
      const where = args?.where ?? {};
      return Promise.resolve(
        Object.values(nodeStore).filter((n) => matchesWhere(n, where)),
      );
    },
  );
  mockPrisma.oBSNode.findFirst.mockImplementation(
    (args: { where: Record<string, unknown> }) =>
      Promise.resolve(
        Object.values(nodeStore).find((n) => matchesWhere(n, args.where)) ??
          null,
      ),
  );
  mockPrisma.oBSNode.create.mockImplementation(
    (args: { data: Record<string, unknown> }) => {
      const id = nextId("node");
      const node: StoreRecord = {
        id,
        tenantId: "tenant-1",
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null,
        nodeHeadPersonId: null,
        calendarId: null,
        assignedRoles: [],
        sortOrder: 0,
        isActive: true,
        ...args.data,
      };
      nodeStore[id] = node;
      return Promise.resolve(node);
    },
  );
  mockPrisma.oBSNode.update.mockImplementation(
    (args: { where: { id: string }; data: Record<string, unknown> }) => {
      const node = nodeStore[args.where.id];
      if (node) Object.assign(node, args.data, { updatedAt: new Date() });
      return Promise.resolve(node);
    },
  );
  mockPrisma.oBSNode.updateMany.mockImplementation(
    (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      let count = 0;
      for (const node of Object.values(nodeStore)) {
        if (matchesWhere(node, args.where)) {
          Object.assign(node, args.data);
          count++;
        }
      }
      return Promise.resolve({ count });
    },
  );

  mockPrisma.oBSPerson.findMany.mockImplementation(
    (args?: { where?: Record<string, unknown> }) => {
      const where = args?.where ?? {};
      return Promise.resolve(
        Object.values(personStore).filter((p) => matchesWhere(p, where)),
      );
    },
  );
  mockPrisma.oBSPerson.findFirst.mockImplementation(
    (args: { where: Record<string, unknown> }) =>
      Promise.resolve(
        Object.values(personStore).find((p) => matchesWhere(p, args.where)) ??
          null,
      ),
  );
  mockPrisma.oBSPerson.create.mockImplementation(
    (args: { data: Record<string, unknown> }) => {
      const id = nextId("person");
      const person: StoreRecord = {
        id,
        tenantId: "tenant-1",
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        roleId: null,
        payType: "hourly",
        standardRate: null,
        overtimeRate: null,
        overtimePay: false,
        monthlySalary: null,
        dailyAllocation: null,
        contractAmount: null,
        employmentType: "full-time",
        joinDate: null,
        photoUrl: null,
        ...args.data,
      };
      personStore[id] = person;
      return Promise.resolve(person);
    },
  );
  mockPrisma.oBSPerson.update.mockImplementation(
    (args: { where: { id: string }; data: Record<string, unknown> }) => {
      const person = personStore[args.where.id];
      if (person) Object.assign(person, args.data, { updatedAt: new Date() });
      return Promise.resolve(person);
    },
  );
  mockPrisma.oBSPerson.updateMany.mockImplementation(
    (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      let count = 0;
      for (const person of Object.values(personStore)) {
        if (matchesWhere(person, args.where)) {
          Object.assign(person, args.data);
          count++;
        }
      }
      return Promise.resolve({ count });
    },
  );

  mockPrisma.oBSEquipment.findMany.mockImplementation(
    (args?: { where?: Record<string, unknown> }) => {
      const where = args?.where ?? {};
      return Promise.resolve(
        Object.values(equipmentStore).filter((e) => matchesWhere(e, where)),
      );
    },
  );
  mockPrisma.oBSEquipment.updateMany.mockImplementation(
    (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      let count = 0;
      for (const eq of Object.values(equipmentStore)) {
        if (matchesWhere(eq, args.where)) {
          Object.assign(eq, args.data);
          count++;
        }
      }
      return Promise.resolve({ count });
    },
  );

  mockPrisma.oBSMaterial.findMany.mockImplementation(
    (args?: { where?: Record<string, unknown> }) => {
      const where = args?.where ?? {};
      return Promise.resolve(
        Object.values(materialStore).filter((m) => matchesWhere(m, where)),
      );
    },
  );
  mockPrisma.oBSMaterial.updateMany.mockImplementation(
    (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      let count = 0;
      for (const mat of Object.values(materialStore)) {
        if (matchesWhere(mat, args.where)) {
          Object.assign(mat, args.data);
          count++;
        }
      }
      return Promise.resolve({ count });
    },
  );

  mockPrisma.calendar.findMany.mockResolvedValue([]);
  mockPrisma.role.findMany.mockResolvedValue([]);
  mockPrisma.$transaction.mockImplementation((fns: Promise<unknown>[]) =>
    Promise.all(fns),
  );
});

/* ─────────────────────── Helpers ────────────────────────────────── */

function makeRequest(
  url: string,
  options?: { method?: string; body?: unknown },
): NextRequest {
  const init: RequestInit = {
    method: options?.method ?? "GET",
    headers: {
      authorization: "Bearer valid-token",
      "content-type": "application/json",
    },
  };
  if (options?.body) {
    init.body = JSON.stringify(options.body);
  }
  return new NextRequest(url, init);
}

/* ─────────────────────── Integration Tests ──────────────────────── */

describe("Org Setup API Integration", () => {
  it("GET returns empty state for new tenant", async () => {
    const { GET } = await import("./route");

    const res = await GET(makeRequest("http://localhost/api/org-setup"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.nodes).toEqual([]);
    expect(body.people).toEqual([]);
    expect(body.equipment).toEqual([]);
    expect(body.materials).toEqual([]);
    expect(body.calendars).toEqual([]);
    expect(body.roles).toEqual([]);
  });

  it("POST node creates root, GET returns it", async () => {
    const { POST: createNode } = await import("./nodes/route");
    const { GET } = await import("./route");

    // Create a COMPANY_ROOT node
    const createRes = await createNode(
      makeRequest("http://localhost/api/org-setup/nodes", {
        method: "POST",
        body: {
          name: "Acme Corp",
          code: "ACME",
          type: "COMPANY_ROOT",
        },
      }),
    );
    const createBody = await createRes.json();

    expect(createRes.status).toBe(201);
    expect(createBody.node.name).toBe("Acme Corp");
    expect(createBody.node.code).toBe("ACME");
    expect(createBody.node.type).toBe("COMPANY_ROOT");

    // GET org-setup and verify node is returned
    const getRes = await GET(makeRequest("http://localhost/api/org-setup"));
    const getBody = await getRes.json();

    expect(getBody.nodes).toHaveLength(1);
    expect(getBody.nodes[0].name).toBe("Acme Corp");
    expect(getBody.nodes[0].code).toBe("ACME");
  });

  it("POST person under node, GET includes person", async () => {
    const { POST: createNode } = await import("./nodes/route");
    const { POST: createPerson } = await import("./people/route");
    const { GET } = await import("./route");

    // Create a node first
    const nodeRes = await createNode(
      makeRequest("http://localhost/api/org-setup/nodes", {
        method: "POST",
        body: { name: "Engineering", code: "ENG", type: "DEPARTMENT" },
      }),
    );
    const nodeBody = await nodeRes.json();
    const nodeId = nodeBody.node.id;

    // Create a person under that node
    const personRes = await createPerson(
      makeRequest("http://localhost/api/org-setup/people", {
        method: "POST",
        body: {
          nodeId,
          name: "Jane Doe",
          employeeId: "EMP-001",
          email: "jane@acme.com",
        },
      }),
    );
    const personBody = await personRes.json();

    expect(personRes.status).toBe(201);
    expect(personBody.person.name).toBe("Jane Doe");
    expect(personBody.person.nodeId).toBe(nodeId);

    // GET org-setup and verify person is included
    const getRes = await GET(makeRequest("http://localhost/api/org-setup"));
    const getBody = await getRes.json();

    expect(getBody.people).toHaveLength(1);
    expect(getBody.people[0].name).toBe("Jane Doe");
    expect(getBody.people[0].employeeId).toBe("EMP-001");
  });

  it("PATCH person rate, GET reflects change", async () => {
    const { POST: createNode } = await import("./nodes/route");
    const { POST: createPerson } = await import("./people/route");
    const { PATCH: patchPerson } = await import("./people/[id]/route");

    // Create node and person
    const nodeRes = await createNode(
      makeRequest("http://localhost/api/org-setup/nodes", {
        method: "POST",
        body: { name: "Operations", code: "OPS", type: "DIVISION" },
      }),
    );
    const nodeBody = await nodeRes.json();

    const personRes = await createPerson(
      makeRequest("http://localhost/api/org-setup/people", {
        method: "POST",
        body: {
          nodeId: nodeBody.node.id,
          name: "Bob Smith",
          employeeId: "EMP-002",
          email: "bob@acme.com",
          standardRate: 50,
        },
      }),
    );
    const personBody = await personRes.json();
    const personId = personBody.person.id;

    // PATCH to update standardRate
    const patchRes = await patchPerson(
      makeRequest(`http://localhost/api/org-setup/people/${personId}`, {
        method: "PATCH",
        body: { standardRate: 75 },
      }),
      { params: Promise.resolve({ id: personId }) },
    );
    const patchBody = await patchRes.json();

    expect(patchRes.status).toBe(200);
    expect(patchBody.person.standardRate).toBe(75);

    // Verify the store reflects the update
    const { GET } = await import("./route");
    const getRes = await GET(makeRequest("http://localhost/api/org-setup"));
    const getBody = await getRes.json();

    const updatedPerson = getBody.people.find(
      (p: { id: string }) => p.id === personId,
    );
    expect(updatedPerson.standardRate).toBe(75);
  });

  it("DELETE node cascades to children and people", async () => {
    const { POST: createNode } = await import("./nodes/route");
    const { POST: createPerson } = await import("./people/route");
    const { DELETE: deleteNode } = await import("./nodes/[id]/route");
    const { GET } = await import("./route");

    // Create parent node
    const parentRes = await createNode(
      makeRequest("http://localhost/api/org-setup/nodes", {
        method: "POST",
        body: { name: "Parent Div", code: "PAR", type: "DIVISION" },
      }),
    );
    const parentBody = await parentRes.json();
    const parentId = parentBody.node.id;

    // Create child node under parent
    const childRes = await createNode(
      makeRequest("http://localhost/api/org-setup/nodes", {
        method: "POST",
        body: {
          name: "Child Dept",
          code: "CHD",
          type: "DEPARTMENT",
          parentId,
        },
      }),
    );
    const childBody = await childRes.json();
    const childId = childBody.node.id;

    // Create a person under child node
    await createPerson(
      makeRequest("http://localhost/api/org-setup/people", {
        method: "POST",
        body: {
          nodeId: childId,
          name: "Alice Worker",
          employeeId: "EMP-003",
          email: "alice@acme.com",
        },
      }),
    );

    // Verify everything exists before deletion
    const beforeRes = await GET(makeRequest("http://localhost/api/org-setup"));
    const beforeBody = await beforeRes.json();
    expect(beforeBody.nodes).toHaveLength(2);
    expect(beforeBody.people).toHaveLength(1);

    // DELETE parent node — should cascade
    const deleteRes = await deleteNode(
      makeRequest(`http://localhost/api/org-setup/nodes/${parentId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: parentId }) },
    );

    expect(deleteRes.status).toBe(200);

    // GET again — all should be marked as deleted, so empty
    const afterRes = await GET(makeRequest("http://localhost/api/org-setup"));
    const afterBody = await afterRes.json();

    expect(afterBody.nodes).toHaveLength(0);
    expect(afterBody.people).toHaveLength(0);
  });

  it("emits domain events on mutations", async () => {
    const { POST: createNode } = await import("./nodes/route");
    const { POST: createPerson } = await import("./people/route");

    // Create a node
    const nodeRes = await createNode(
      makeRequest("http://localhost/api/org-setup/nodes", {
        method: "POST",
        body: { name: "Events Div", code: "EVT", type: "DIVISION" },
      }),
    );
    const nodeBody = await nodeRes.json();

    expect(mockEmitOBSEvent).toHaveBeenCalledWith(
      "obs.node.created",
      "tenant-1",
      nodeBody.node.id,
      expect.objectContaining({ node: expect.objectContaining({ name: "Events Div" }) }),
    );

    // Create a person
    const personRes = await createPerson(
      makeRequest("http://localhost/api/org-setup/people", {
        method: "POST",
        body: {
          nodeId: nodeBody.node.id,
          name: "Event Person",
          employeeId: "EMP-EVT",
          email: "evt@acme.com",
        },
      }),
    );
    const personBody = await personRes.json();

    expect(mockEmitOBSEvent).toHaveBeenCalledWith(
      "obs.person.created",
      "tenant-1",
      personBody.person.id,
      expect.objectContaining({
        person: expect.objectContaining({ name: "Event Person" }),
      }),
    );
  });
});
