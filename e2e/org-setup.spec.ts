import { test, expect } from "@playwright/test";
import {
  sampleRoles,
  sampleCostCenters,
  samplePeople,
  technologyDepartment,
  productDepartment,
  hrDepartment,
  engineeringTeamAlpha,
  engineeringTeamBeta,
} from "./fixtures/org-setup-data";

/**
 * E2E tests for the Organisation Setup feature.
 *
 * Tests the full API lifecycle:
 *   1. Auth setup (signup → verify → login)
 *   2. Roles CRUD + DB verification
 *   3. Cost Centers CRUD + DB verification
 *   4. Org Nodes (hierarchical) CRUD + DB verification
 *   5. People CRUD + DB verification
 *   6. Aggregate fetch endpoint returns all entities
 *   7. Org structure hierarchy is correct
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

test.describe.serial("Organisation Setup — Full API E2E", () => {
  let token: string;
  let tenantId: string;

  const testEmail = `org-e2e-${Date.now()}@test.com`;
  const testPassword = "TestPass123!";

  // Track created IDs for cross-test references
  const roleIds: Record<string, string> = {};
  const costCenterIds: Record<string, string> = {};
  let rootNodeId: string;
  const nodeIds: Record<string, string> = {};
  const personIds: Record<string, string> = {};

  /* ─────────────────── Auth Setup ─────────────────── */

  test("setup: signup, verify email, and login", async ({ request }) => {
    const signupRes = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        fullName: "Org E2E Tester",
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
      },
    });
    expect(signupRes.status()).toBe(201);

    const verifyRes = await request.post(
      `${BASE_URL}/api/test-helpers/verify-email`,
      { data: { email: testEmail } },
    );
    expect(verifyRes.status()).toBe(200);

    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: testEmail, password: testPassword },
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    token = loginBody.accessToken;
    tenantId = loginBody.tenant.id;

    expect(token).toBeTruthy();
    expect(tenantId).toBeTruthy();
  });

  /* ─────────────────── Roles ─────────────────── */

  test("POST /api/roles — creates all sample roles", async ({ request }) => {
    for (const role of sampleRoles) {
      const res = await request.post(`${BASE_URL}/api/roles`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          name: role.name,
          level: role.level,
          defaultPayType: role.defaultPayType,
          overtimeEligible: role.overtimeEligible,
          skillTags: role.skillTags,
          costRateMin: role.costRateMin,
          costRateMax: role.costRateMax,
          costRateCurrency: role.costRateCurrency,
        },
      });

      expect(res.status()).toBe(201);
      const body = await res.json();

      expect(body.role).toBeDefined();
      expect(body.role.name).toBe(role.name);
      expect(body.role.tenantId).toBe(tenantId);
      expect(body.role.isDeleted).toBe(false);
      expect(body.role.createdAt).toBeTruthy();

      roleIds[role.code] = body.role.id;
    }

    expect(Object.keys(roleIds)).toHaveLength(sampleRoles.length);
  });

  test("GET /api/roles — lists all created roles", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.roles.length).toBeGreaterThanOrEqual(sampleRoles.length);

    for (const role of sampleRoles) {
      const found = body.roles.find(
        (r: { id: string }) => r.id === roleIds[role.code],
      );
      expect(found).toBeDefined();
      expect(found.name).toBe(role.name);
      expect(found.tenantId).toBe(tenantId);
    }
  });

  test("GET /api/roles?q= — search filter works", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/roles?q=engineer`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.roles.length).toBeGreaterThanOrEqual(1);
    expect(
      body.roles.some((r: { name: string }) =>
        r.name.toLowerCase().includes("engineer"),
      ),
    ).toBe(true);
  });

  /* ─────────────────── Cost Centers ─────────────────── */

  test("POST /api/cost-centers — creates all sample cost centers", async ({
    request,
  }) => {
    for (const cc of sampleCostCenters) {
      const res = await request.post(`${BASE_URL}/api/cost-centers`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          name: cc.name,
          code: cc.code,
          description: cc.description,
        },
      });

      expect(res.status()).toBe(201);
      const body = await res.json();

      expect(body.costCenter).toBeDefined();
      expect(body.costCenter.name).toBe(cc.name);
      expect(body.costCenter.code).toBe(cc.code);
      expect(body.costCenter.tenantId).toBe(tenantId);
      expect(body.costCenter.isDeleted).toBe(false);

      costCenterIds[cc.code] = body.costCenter.id;
    }

    expect(Object.keys(costCenterIds)).toHaveLength(sampleCostCenters.length);
  });

  test("GET /api/cost-centers — lists all created cost centers", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/cost-centers`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.costCenters.length).toBeGreaterThanOrEqual(
      sampleCostCenters.length,
    );

    for (const cc of sampleCostCenters) {
      const found = body.costCenters.find(
        (c: { id: string }) => c.id === costCenterIds[cc.code],
      );
      expect(found).toBeDefined();
      expect(found.name).toBe(cc.name);
    }
  });

  /* ─────────────────── Org Nodes (Hierarchy) ─────────────────── */

  test("GET /api/org-setup/nodes — root node auto-created for tenant", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/org-setup/nodes`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    // Root node is auto-created by the provider on first load
    // If not, we create it
    if (body.nodes && body.nodes.length > 0) {
      const root = body.nodes.find(
        (n: { type: string }) => n.type === "COMPANY_ROOT",
      );
      if (root) {
        rootNodeId = root.id;
      }
    }

    // If no root exists, create one
    if (!rootNodeId) {
      const createRes = await request.post(`${BASE_URL}/api/org-setup/nodes`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          name: "Acme Corporation",
          code: "ORG-ROOT",
          type: "COMPANY_ROOT",
          parentId: null,
        },
      });
      expect(createRes.status()).toBe(201);
      const createBody = await createRes.json();
      rootNodeId = createBody.node.id;
    }

    expect(rootNodeId).toBeTruthy();
  });

  test("POST /api/org-setup/nodes — creates Level 1 departments", async ({
    request,
  }) => {
    const departments = [
      technologyDepartment,
      productDepartment,
      hrDepartment,
    ];

    for (const dept of departments) {
      const res = await request.post(`${BASE_URL}/api/org-setup/nodes`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          name: dept.name,
          code: dept.code,
          type: "DIVISION",
          parentId: rootNodeId,
        },
      });

      expect(res.status()).toBe(201);
      const body = await res.json();

      expect(body.node).toBeDefined();
      expect(body.node.name).toBe(dept.name);
      expect(body.node.code).toBe(dept.code);
      expect(body.node.parentId).toBe(rootNodeId);
      expect(body.node.tenantId).toBe(tenantId);
      expect(body.node.isDeleted).toBe(false);

      nodeIds[dept.code] = body.node.id;
    }
  });

  test("POST /api/org-setup/nodes — creates Level 2 teams under Technology", async ({
    request,
  }) => {
    const techNodeId = nodeIds["TECH-001"];
    expect(techNodeId).toBeTruthy();

    const teams = [engineeringTeamAlpha, engineeringTeamBeta];

    for (const team of teams) {
      const res = await request.post(`${BASE_URL}/api/org-setup/nodes`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          name: team.name,
          code: team.code,
          type: "DEPARTMENT",
          parentId: techNodeId,
        },
      });

      expect(res.status()).toBe(201);
      const body = await res.json();

      expect(body.node.name).toBe(team.name);
      expect(body.node.parentId).toBe(techNodeId);

      nodeIds[team.code] = body.node.id;
    }
  });

  test("POST /api/org-setup/nodes — creates Level 3 positions under teams", async ({
    request,
  }) => {
    const alphaNodeId = nodeIds["ENG-ALPHA-001"];
    const betaNodeId = nodeIds["ENG-BETA-001"];
    expect(alphaNodeId).toBeTruthy();
    expect(betaNodeId).toBeTruthy();

    const positions = [
      { name: "Senior Developer - Backend", code: "SR-DEV-ALPHA-001", parentId: alphaNodeId },
      { name: "Senior Developer - Frontend", code: "SR-DEV-ALPHA-002", parentId: alphaNodeId },
      { name: "Senior Developer - DevOps", code: "SR-DEV-BETA-001", parentId: betaNodeId },
    ];

    for (const pos of positions) {
      const res = await request.post(`${BASE_URL}/api/org-setup/nodes`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          name: pos.name,
          code: pos.code,
          type: "TEAM",
          parentId: pos.parentId,
        },
      });

      expect(res.status()).toBe(201);
      const body = await res.json();

      expect(body.node.name).toBe(pos.name);
      expect(body.node.parentId).toBe(pos.parentId);

      nodeIds[pos.code] = body.node.id;
    }
  });

  test("GET /api/org-setup/nodes — verifies full hierarchy in DB", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/org-setup/nodes`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    // Should have root + 3 departments + 2 teams + 3 positions = 9 nodes
    expect(body.nodes.length).toBeGreaterThanOrEqual(9);

    // Verify parent-child relationships
    const techNode = body.nodes.find(
      (n: { id: string }) => n.id === nodeIds["TECH-001"],
    );
    expect(techNode).toBeDefined();
    expect(techNode.parentId).toBe(rootNodeId);

    const alphaNode = body.nodes.find(
      (n: { id: string }) => n.id === nodeIds["ENG-ALPHA-001"],
    );
    expect(alphaNode).toBeDefined();
    expect(alphaNode.parentId).toBe(nodeIds["TECH-001"]);

    const backendDev = body.nodes.find(
      (n: { id: string }) => n.id === nodeIds["SR-DEV-ALPHA-001"],
    );
    expect(backendDev).toBeDefined();
    expect(backendDev.parentId).toBe(nodeIds["ENG-ALPHA-001"]);
  });

  /* ─────────────────── People ─────────────────── */

  test("POST /api/org-setup/people — creates people assigned to nodes", async ({
    request,
  }) => {
    // Map people to nodes based on the org structure
    const peopleNodeMap: { person: (typeof samplePeople)[number]; nodeCode: string }[] = [
      { person: samplePeople[0], nodeCode: "ORG-ROOT" },     // James Richardson → Root (CEO)
      { person: samplePeople[1], nodeCode: "TECH-001" },     // Sarah Chen → Technology (CTO)
      { person: samplePeople[2], nodeCode: "ENG-ALPHA-001" },// Michael Torres → Eng Alpha
      { person: samplePeople[3], nodeCode: "SR-DEV-ALPHA-001" }, // Jennifer Liu → Backend Dev
      { person: samplePeople[4], nodeCode: "SR-DEV-ALPHA-002" }, // David Kowalski → Frontend Dev
      { person: samplePeople[5], nodeCode: "HR-001" },       // Amanda Watson → HR
      { person: samplePeople[6], nodeCode: "ENG-BETA-001" }, // Robert Patel → Eng Beta
      { person: samplePeople[7], nodeCode: "PROD-001" },     // Patricia Johnson → Product
      { person: samplePeople[8], nodeCode: "SR-DEV-BETA-001" }, // Christopher Blake → DevOps
    ];

    // ORG-ROOT maps to rootNodeId
    const nodeCodeToId: Record<string, string> = {
      "ORG-ROOT": rootNodeId,
      ...nodeIds,
    };

    for (const { person, nodeCode } of peopleNodeMap) {
      const targetNodeId = nodeCodeToId[nodeCode];
      expect(targetNodeId).toBeTruthy();

      const res = await request.post(`${BASE_URL}/api/org-setup/people`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          nodeId: targetNodeId,
          name: person.name,
          employeeId: person.employeeId,
          email: person.email,
          payType: person.payType,
          standardRate: person.standardRate,
          overtimeRate: person.overtimeRate,
          overtimePay: person.overtimePay,
          monthlySalary: person.monthlySalary,
          dailyAllocation: person.dailyAllocation,
          contractAmount: person.contractAmount,
          employmentType: person.employmentType,
          joinDate: person.joinDate,
          photoUrl: person.photoUrl,
        },
      });

      expect(res.status()).toBe(201);
      const body = await res.json();

      expect(body.person).toBeDefined();
      expect(body.person.name).toBe(person.name);
      expect(body.person.employeeId).toBe(person.employeeId);
      expect(body.person.email).toBe(person.email);
      expect(body.person.nodeId).toBe(targetNodeId);
      expect(body.person.isDeleted).toBe(false);

      personIds[person.employeeId] = body.person.id;
    }

    expect(Object.keys(personIds)).toHaveLength(samplePeople.length);
  });

  test("GET /api/org-setup/nodes/:id/people — returns people for specific node", async ({
    request,
  }) => {
    // Check Engineering Team Alpha has Michael Torres
    const alphaNodeId = nodeIds["ENG-ALPHA-001"];
    const res = await request.get(
      `${BASE_URL}/api/org-setup/nodes/${alphaNodeId}/people`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.people).toBeDefined();
    expect(body.people.length).toBeGreaterThanOrEqual(1);

    const michael = body.people.find(
      (p: { employeeId: string }) => p.employeeId === "EMP-003",
    );
    expect(michael).toBeDefined();
    expect(michael.name).toBe("Michael Torres");
  });

  test("PATCH /api/org-setup/people/:id — updates person", async ({
    request,
  }) => {
    const personId = personIds["EMP-005"]; // David Kowalski
    expect(personId).toBeTruthy();

    const res = await request.patch(
      `${BASE_URL}/api/org-setup/people/${personId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          standardRate: 100000,
          overtimeRate: 15.0,
        },
      },
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.person.standardRate).toBe(100000);
    expect(body.person.overtimeRate).toBe(15.0);
  });

  /* ─────────────────── Node Updates ─────────────────── */

  test("PATCH /api/org-setup/nodes/:id — assigns node head", async ({
    request,
  }) => {
    // Assign James Richardson as head of root node
    const jamesId = personIds["EMP-001"];

    const res = await request.patch(
      `${BASE_URL}/api/org-setup/nodes/${rootNodeId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          nodeHeadPersonId: jamesId,
        },
      },
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.node.nodeHeadPersonId).toBe(jamesId);
  });

  test("PATCH /api/org-setup/nodes/:id — assigns role rates to Technology node", async ({
    request,
  }) => {
    const techNodeId = nodeIds["TECH-001"];
    const ctoRoleId = roleIds["CTO"];

    const res = await request.patch(
      `${BASE_URL}/api/org-setup/nodes/${techNodeId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          assignedRoles: [
            { roleId: ctoRoleId, standardRate: 185000, overtimeRate: null },
          ],
        },
      },
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.node.assignedRoles).toHaveLength(1);
    expect(body.node.assignedRoles[0].roleId).toBe(ctoRoleId);
    expect(body.node.assignedRoles[0].standardRate).toBe(185000);
  });

  /* ─────────────────── Aggregate Fetch ─────────────────── */

  test("GET /api/org-setup — returns all entities for tenant", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/org-setup`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    // Verify roles are present
    expect(body.roles).toBeDefined();
    expect(body.roles.length).toBeGreaterThanOrEqual(sampleRoles.length);

    // Verify cost centers are present
    expect(body.costCenters).toBeDefined();
    expect(body.costCenters.length).toBeGreaterThanOrEqual(
      sampleCostCenters.length,
    );

    // Verify nodes are present
    expect(body.nodes).toBeDefined();
    expect(body.nodes.length).toBeGreaterThanOrEqual(9);

    // Verify people are present
    expect(body.people).toBeDefined();
    expect(body.people.length).toBeGreaterThanOrEqual(samplePeople.length);
  });

  /* ─────────────────── Auth Guard ─────────────────── */

  test("all endpoints return 401 without auth token", async ({ request }) => {
    const endpoints = [
      { method: "GET", url: `${BASE_URL}/api/org-setup` },
      { method: "GET", url: `${BASE_URL}/api/org-setup/nodes` },
      { method: "GET", url: `${BASE_URL}/api/roles` },
      { method: "GET", url: `${BASE_URL}/api/cost-centers` },
    ];

    for (const ep of endpoints) {
      const res = await request.get(ep.url);
      expect(res.status()).toBe(401);
    }
  });

  /* ─────────────────── Soft Delete ─────────────────── */

  test("DELETE /api/org-setup/people/:id — soft deletes person", async ({
    request,
  }) => {
    // Delete Christopher Blake (EMP-009)
    const blakeId = personIds["EMP-009"];
    expect(blakeId).toBeTruthy();

    const res = await request.delete(
      `${BASE_URL}/api/org-setup/people/${blakeId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(res.status()).toBe(200);

    // Verify no longer appears in node people listing
    const betaNodeId = nodeIds["SR-DEV-BETA-001"];
    const listRes = await request.get(
      `${BASE_URL}/api/org-setup/nodes/${betaNodeId}/people`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const listBody = await listRes.json();
    const found = listBody.people?.find(
      (p: { id: string }) => p.id === blakeId,
    );
    expect(found).toBeUndefined();
  });

  test("DELETE /api/roles/:id — soft deletes a role", async ({ request }) => {
    const hrRoleId = roleIds["HR-MGR"];
    expect(hrRoleId).toBeTruthy();

    const res = await request.delete(`${BASE_URL}/api/roles/${hrRoleId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);

    // Verify no longer in listing
    const listRes = await request.get(`${BASE_URL}/api/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listBody = await listRes.json();
    const found = listBody.roles.find(
      (r: { id: string }) => r.id === hrRoleId,
    );
    expect(found).toBeUndefined();
  });

  test("DELETE /api/cost-centers/:id — soft deletes a cost center", async ({
    request,
  }) => {
    const generalCCId = costCenterIds["CC-GENERAL"];
    expect(generalCCId).toBeTruthy();

    const res = await request.delete(
      `${BASE_URL}/api/cost-centers/${generalCCId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status()).toBe(200);

    // Verify no longer in listing
    const listRes = await request.get(`${BASE_URL}/api/cost-centers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listBody = await listRes.json();
    const found = listBody.costCenters.find(
      (c: { id: string }) => c.id === generalCCId,
    );
    expect(found).toBeUndefined();
  });
});
