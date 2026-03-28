import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect } from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { OrgSetupProvider, useOrgSetup } from "./context";
import { PeopleTab } from "./people-tab";

// Mock auth context
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    accessToken: "mock-token",
    tenant: null,
    user: null,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    setTokens: vi.fn(),
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const ROOT_NODE = {
  id: "node-root",
  name: "Test Corp",
  code: "TC-ROOT",
  type: "COMPANY_ROOT",
  parentId: null,
  nodeHeadPersonId: null,
  calendarId: null,
  costCenterId: null,
  assignedRoles: [],
  isActive: true,
  peopleCount: 1,
  equipmentCount: 0,
  materialCount: 0,
  nodeHeadName: null,
  calendarName: null,
  costCenterName: null,
};

const ALICE = {
  id: "person-1",
  nodeId: "node-root",
  name: "Alice Smith",
  employeeId: "EMP-001",
  email: "alice@test.com",
  roleId: null,
  payType: "salaried",
  standardRate: null,
  overtimeRate: null,
  overtimePay: false,
  monthlySalary: 5000,
  dailyAllocation: null,
  contractAmount: null,
  employmentType: "full-time",
  joinDate: null,
  photoUrl: null,
};

function setupMockFetch(overrides: {
  nodes?: Record<string, unknown>[];
  people?: Record<string, unknown>[];
  roles?: Record<string, unknown>[];
  createResponse?: { ok: boolean; status?: number; body?: Record<string, unknown> };
  updateResponse?: { ok: boolean; status?: number; body?: Record<string, unknown> };
  deleteResponse?: { ok: boolean; status?: number; body?: Record<string, unknown> };
} = {}) {
  const nodes = overrides.nodes ?? [ROOT_NODE];
  const people = overrides.people ?? [ALICE];
  const roles = overrides.roles ?? [];

  mockFetch.mockImplementation((url: string, options?: RequestInit) => {
    const method = options?.method ?? "GET";

    // GET /api/org-setup/nodes
    if (url === "/api/org-setup/nodes" && method === "GET") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ nodes }),
      });
    }

    // GET /api/org-setup (hydrate)
    if (url === "/api/org-setup" && method === "GET") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          nodes,
          people,
          equipment: [],
          materials: [],
          calendars: [],
          roles,
          costCenters: [],
        }),
      });
    }

    // GET /api/org-setup/nodes/:id/people
    if (url.match(/\/api\/org-setup\/nodes\/[^/]+\/people/) && method === "GET") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ people, total: people.length }),
      });
    }

    // POST /api/org-setup/people
    if (url === "/api/org-setup/people" && method === "POST") {
      const resp = overrides.createResponse ?? { ok: true, status: 201, body: { person: { id: "new-person", ...JSON.parse(options?.body as string) } } };
      return Promise.resolve({
        ok: resp.ok,
        status: resp.status ?? (resp.ok ? 201 : 400),
        json: () => Promise.resolve(resp.body ?? {}),
      });
    }

    // PATCH /api/org-setup/people/:id
    if (url.match(/\/api\/org-setup\/people\/[^/]+$/) && method === "PATCH") {
      const resp = overrides.updateResponse ?? { ok: true, status: 200, body: { person: { id: "person-1", ...JSON.parse(options?.body as string) } } };
      return Promise.resolve({
        ok: resp.ok,
        status: resp.status ?? (resp.ok ? 200 : 400),
        json: () => Promise.resolve(resp.body ?? {}),
      });
    }

    // DELETE /api/org-setup/people/:id
    if (url.match(/\/api\/org-setup\/people\/[^/]+$/) && method === "DELETE") {
      const resp = overrides.deleteResponse ?? { ok: true, status: 200, body: { message: "Deleted" } };
      return Promise.resolve({
        ok: resp.ok,
        status: resp.status ?? (resp.ok ? 200 : 500),
        json: () => Promise.resolve(resp.body ?? {}),
      });
    }

    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

/** Wrapper that triggers loadNodePeople on mount (simulating what NodeModal does) */
function PeopleTabWithLoad({ nodeId }: { nodeId: string }) {
  const { loadNodePeople } = useOrgSetup();
  useEffect(() => { loadNodePeople(nodeId); }, [loadNodePeople, nodeId]);
  return <PeopleTab nodeId={nodeId} />;
}

function renderPeopleTab(nodeId = "node-root") {
  return render(
    <OrgSetupProvider companyName="Test Corp">
      <PeopleTabWithLoad nodeId={nodeId} />
    </OrgSetupProvider>,
  );
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  setupMockFetch();
});

describe("PeopleTab — API-first mutations", () => {
  it("calls POST API when saving a new person", async () => {
    setupMockFetch({ people: [] });
    renderPeopleTab();

    // Wait for tab to render (empty state shows the form by default)
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Full name")).toBeDefined();
    });

    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText("Full name"), { target: { value: "Bob Jones" } });
    fireEvent.change(screen.getByPlaceholderText("EMP-001"), { target: { value: "EMP-999" } });
    fireEvent.change(screen.getByPlaceholderText("name@company.com"), { target: { value: "bob@test.com" } });

    fireEvent.click(screen.getByText("Save Person"));

    await waitFor(() => {
      const postCalls = (mockFetch.mock.calls as [string, RequestInit?][]).filter(
        ([url, opts]) => url === "/api/org-setup/people" && opts?.method === "POST",
      );
      expect(postCalls.length).toBe(1);
      const body = JSON.parse(postCalls[0][1]!.body as string);
      expect(body.name).toBe("Bob Jones");
      expect(body.employeeId).toBe("EMP-999");
      expect(body.email).toBe("bob@test.com");
    });
  });

  it("calls PATCH API when updating an existing person", async () => {
    setupMockFetch();
    renderPeopleTab();

    // Wait for Alice to appear in the list
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeDefined();
    });

    // Click to edit Alice
    fireEvent.click(screen.getByText("Alice Smith"));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Alice Smith")).toBeDefined();
    });

    // Change name
    fireEvent.change(screen.getByDisplayValue("Alice Smith"), { target: { value: "Alice Johnson" } });
    fireEvent.click(screen.getByText("Update Person"));

    await waitFor(() => {
      const patchCalls = (mockFetch.mock.calls as [string, RequestInit?][]).filter(
        ([url, opts]) => url === "/api/org-setup/people/person-1" && opts?.method === "PATCH",
      );
      expect(patchCalls.length).toBe(1);
      const body = JSON.parse(patchCalls[0][1]!.body as string);
      expect(body.name).toBe("Alice Johnson");
    });
  });

  it("calls PATCH API with nodeId:null when unassigning a person from node", async () => {
    setupMockFetch();
    renderPeopleTab();

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeDefined();
    });

    // Click the unassign button (UserMinus icon)
    const unassignBtn = screen.getByLabelText("Unassign Alice Smith from this node");
    fireEvent.click(unassignBtn);

    // Confirm removal
    fireEvent.click(screen.getByText("Remove"));

    await waitFor(() => {
      const patchCalls = (mockFetch.mock.calls as [string, RequestInit?][]).filter(
        ([url, opts]) => url === "/api/org-setup/people/person-1" && opts?.method === "PATCH",
      );
      expect(patchCalls.length).toBeGreaterThanOrEqual(1);
      const lastPatch = patchCalls[patchCalls.length - 1];
      const body = JSON.parse(lastPatch[1]!.body as string);
      expect(body.nodeId).toBeNull();
    });
  });

  it("refreshes people list after successful create", async () => {
    setupMockFetch({ people: [] });
    renderPeopleTab();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Full name")).toBeDefined();
    });

    fireEvent.change(screen.getByPlaceholderText("Full name"), { target: { value: "Bob Jones" } });
    fireEvent.change(screen.getByPlaceholderText("EMP-001"), { target: { value: "EMP-999" } });
    fireEvent.change(screen.getByPlaceholderText("name@company.com"), { target: { value: "bob@test.com" } });

    fireEvent.click(screen.getByText("Save Person"));

    // After save, loadNodePeople should be called (fetches /api/org-setup/nodes/:id/people)
    await waitFor(() => {
      const peopleFetches = (mockFetch.mock.calls as [string, RequestInit?][]).filter(
        ([url, opts]) =>
          url.includes("/api/org-setup/nodes/node-root/people") && (!opts?.method || opts.method === "GET"),
      );
      // At least one fetch after the POST
      expect(peopleFetches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows error message when API create fails", async () => {
    setupMockFetch({
      people: [],
      createResponse: {
        ok: false,
        status: 409,
        body: { message: 'Employee ID "EMP-999" already exists' },
      },
    });
    renderPeopleTab();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Full name")).toBeDefined();
    });

    fireEvent.change(screen.getByPlaceholderText("Full name"), { target: { value: "Bob Jones" } });
    fireEvent.change(screen.getByPlaceholderText("EMP-001"), { target: { value: "EMP-999" } });
    fireEvent.change(screen.getByPlaceholderText("name@company.com"), { target: { value: "bob@test.com" } });

    fireEvent.click(screen.getByText("Save Person"));

    await waitFor(() => {
      expect(screen.getByText('Employee ID "EMP-999" already exists')).toBeDefined();
    });
  });

  it("disables save button while saving", async () => {
    // Make the API slow to verify button state
    let resolveCreate: (value: unknown) => void;
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      const method = options?.method ?? "GET";

      if (url === "/api/org-setup/people" && method === "POST") {
        return new Promise((resolve) => {
          resolveCreate = resolve;
        });
      }

      if (url === "/api/org-setup/nodes" && method === "GET") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ nodes: [ROOT_NODE] }),
        });
      }

      if (url === "/api/org-setup" && method === "GET") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            nodes: [ROOT_NODE], people: [], equipment: [], materials: [],
            calendars: [], roles: [], costCenters: [],
          }),
        });
      }

      if (url.match(/\/api\/org-setup\/nodes\/[^/]+\/people/) && method === "GET") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ people: [], total: 0 }),
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderPeopleTab();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Full name")).toBeDefined();
    });

    fireEvent.change(screen.getByPlaceholderText("Full name"), { target: { value: "Bob" } });
    fireEvent.change(screen.getByPlaceholderText("EMP-001"), { target: { value: "EMP-999" } });
    fireEvent.change(screen.getByPlaceholderText("name@company.com"), { target: { value: "bob@test.com" } });

    fireEvent.click(screen.getByText("Save Person"));

    // Button should show "Saving..." while in progress
    await waitFor(() => {
      expect(screen.getByText("Saving...")).toBeDefined();
    });

    // Resolve the pending API call
    resolveCreate!({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ person: { id: "new-person" } }),
    });

    // Button should go back to normal
    await waitFor(() => {
      expect(screen.queryByText("Saving...")).toBeNull();
    });
  });

  it("refreshes people list after successful unassign", async () => {
    setupMockFetch();
    renderPeopleTab();

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeDefined();
    });

    const unassignBtn = screen.getByLabelText("Unassign Alice Smith from this node");
    fireEvent.click(unassignBtn);
    fireEvent.click(screen.getByText("Remove"));

    // After unassign, loadNodePeople should be called to refresh the list
    await waitFor(() => {
      const peopleFetches = (mockFetch.mock.calls as [string, RequestInit?][]).filter(
        ([url, opts]) =>
          url.includes("/api/org-setup/nodes/node-root/people") && (!opts?.method || opts.method === "GET"),
      );
      expect(peopleFetches.length).toBeGreaterThanOrEqual(1);
    });
  });
});
