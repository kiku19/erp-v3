import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PeopleModal } from "./people-modal";

/* ─────────────────────── Mocks ───────────────────────────────────── */

const mockFetchAllPeople = vi.fn();
const mockCreatePerson = vi.fn();
const mockUpdatePerson = vi.fn();
const mockDeletePerson = vi.fn();

vi.mock("@/hooks/use-org-api", () => ({
  useOrgApi: () => ({
    fetchAllPeople: mockFetchAllPeople,
    createPerson: mockCreatePerson,
    updatePerson: mockUpdatePerson,
    deletePerson: mockDeletePerson,
  }),
}));

const mockState = {
  nodes: {
    "n1": { id: "n1", name: "Engineering", code: "ENG", children: [] },
    "n2": { id: "n2", name: "Operations", code: "OPS", children: [] },
  },
  roles: {
    "r1": { id: "r1", name: "Engineer", code: "ENG", level: "Mid", defaultPayType: "hourly", overtimeEligible: true, skillTags: [] },
  },
  people: {},
  calendars: {},
  costCenters: {},
  equipment: {},
  materials: {},
  ui: { globalPanelOpen: null, isLoading: false, nodeLoading: {} },
};

vi.mock("./context", () => ({
  useOrgSetup: () => ({
    state: mockState,
    dispatch: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

/* ─────────────────────── Test Data ──────────────────────────────── */

const samplePeople = [
  {
    id: "p1", name: "Alice Smith", employeeId: "EMP-001", email: "alice@test.com",
    nodeId: "n1", roleId: "r1", payType: "hourly", employmentType: "full-time",
    standardRate: 500, overtimeRate: 750, overtimePay: true,
    monthlySalary: null, dailyAllocation: null, contractAmount: null,
    joinDate: "2025-06-15", photoUrl: null,
    node: { id: "n1", name: "Engineering" },
  },
  {
    id: "p2", name: "Bob Jones", employeeId: "EMP-002", email: "bob@test.com",
    nodeId: null, roleId: null, payType: "salaried", employmentType: "contract",
    standardRate: null, overtimeRate: null, overtimePay: false,
    monthlySalary: 80000, dailyAllocation: 3077, contractAmount: null,
    joinDate: null, photoUrl: null,
    node: null,
  },
  {
    id: "p3", name: "Charlie Brown", employeeId: "EMP-003", email: "charlie@test.com",
    nodeId: "n2", roleId: null, payType: "contract", employmentType: "contract",
    standardRate: null, overtimeRate: null, overtimePay: false,
    monthlySalary: null, dailyAllocation: null, contractAmount: 500000,
    joinDate: "2025-01-10", photoUrl: null,
    node: { id: "n2", name: "Operations" },
  },
];

/* ─────────────────────── Tests ──────────────────────────────────── */

describe("PeopleModal", () => {
  beforeEach(() => {
    mockFetchAllPeople.mockResolvedValue({ people: samplePeople, total: 3 });
  });

  it("renders split-panel layout (left list + right detail area)", async () => {
    render(<PeopleModal open onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId("people-modal-list")).toBeDefined();
    });
    expect(screen.getByTestId("people-modal-detail")).toBeDefined();
  });

  it("left list shows people with name, employeeId, email, pay, and badges", async () => {
    render(<PeopleModal open onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeDefined();
    });
    expect(screen.getByText("Bob Jones")).toBeDefined();
    expect(screen.getByText("Charlie Brown")).toBeDefined();

    // Employee IDs visible
    expect(screen.getByText("EMP-001")).toBeDefined();
    expect(screen.getByText("EMP-002")).toBeDefined();

    // Emails visible
    expect(screen.getByText("alice@test.com")).toBeDefined();
    expect(screen.getByText("bob@test.com")).toBeDefined();

    // Pay summaries visible
    expect(screen.getByText("₹500/hr")).toBeDefined();
    expect(screen.getByText("₹80,000/mo")).toBeDefined();
    expect(screen.getByText("₹5,00,000")).toBeDefined();
  });

  it("clicking a person opens edit form in right panel", async () => {
    const user = userEvent.setup();
    render(<PeopleModal open onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeDefined();
    });

    await user.click(screen.getByText("Alice Smith"));

    await waitFor(() => {
      expect(screen.getByText("Edit Person")).toBeDefined();
    });
  });

  it("add button opens create form", async () => {
    const user = userEvent.setup();
    mockCreatePerson.mockResolvedValue({ person: { id: "p-new", name: "New Person" } });

    render(<PeopleModal open onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId("people-modal-list")).toBeDefined();
    });

    await user.click(screen.getByLabelText("Add person"));

    await waitFor(() => {
      expect(screen.getByText("Add Person")).toBeDefined();
    });
  });

  it("shows Unassigned badge for people with no node", async () => {
    render(<PeopleModal open onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Bob Jones")).toBeDefined();
    });

    expect(screen.getByText("Unassigned")).toBeDefined();
  });

  it("shows spotlight search trigger button instead of inline search input", async () => {
    render(<PeopleModal open onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId("people-modal-list")).toBeDefined();
    });

    // Spotlight trigger button exists
    expect(screen.getByTestId("people-spotlight-trigger")).toBeDefined();

    // Old search input does NOT exist
    expect(screen.queryByPlaceholderText("Search people...")).toBeNull();
  });

  it("opens spotlight search when clicking the trigger", async () => {
    const user = userEvent.setup();
    render(<PeopleModal open onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId("people-spotlight-trigger")).toBeDefined();
    });

    await user.click(screen.getByTestId("people-spotlight-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("spotlight-search-input")).toBeDefined();
    });
  });

  it("fetches with limit=20 and offset=0 on open", async () => {
    render(<PeopleModal open onClose={() => {}} />);

    await waitFor(() => {
      expect(mockFetchAllPeople).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20, offset: 0 }),
      );
    });
  });

  it("shows pagination controls with page info", async () => {
    mockFetchAllPeople.mockResolvedValue({ people: samplePeople, total: 45 });
    render(<PeopleModal open onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId("people-pagination")).toBeDefined();
    });

    // Shows "1–20 of 45"
    expect(screen.getByText("1–20 of 45")).toBeDefined();
    // Shows "1 / 3"
    expect(screen.getByText("1 / 3")).toBeDefined();
  });

  it("navigates to next page and fetches with correct offset", async () => {
    const user = userEvent.setup();
    mockFetchAllPeople.mockResolvedValue({ people: samplePeople.slice(0, 2), total: 45 });

    render(<PeopleModal open onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId("people-pagination")).toBeDefined();
    });

    await user.click(screen.getByLabelText("Next page"));

    await waitFor(() => {
      expect(mockFetchAllPeople).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20, offset: 20 }),
      );
    });
  });

  it("disables previous button on first page", async () => {
    mockFetchAllPeople.mockResolvedValue({ people: samplePeople, total: 45 });
    render(<PeopleModal open onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId("people-pagination")).toBeDefined();
    });

    const prevBtn = screen.getByLabelText("Previous page");
    expect(prevBtn).toHaveProperty("disabled", true);
  });

  it("validates email format on save", async () => {
    const user = userEvent.setup();
    render(<PeopleModal open onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId("people-modal-list")).toBeDefined();
    });

    await user.click(screen.getByLabelText("Add person"));

    await waitFor(() => {
      expect(screen.getByText("Add Person")).toBeDefined();
    });

    // Fill form with invalid email
    await user.type(screen.getByPlaceholderText("Full name"), "Test Person");
    await user.type(screen.getByPlaceholderText("EMP-001"), "EMP-999");
    await user.type(screen.getByPlaceholderText("name@company.com"), "not-an-email");

    await user.click(screen.getByText("Save Person"));

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email address")).toBeDefined();
    });

    // Should NOT have called createPerson
    expect(mockCreatePerson).not.toHaveBeenCalled();
  });

  it("does not show pagination when no people exist", async () => {
    mockFetchAllPeople.mockResolvedValue({ people: [], total: 0 });
    render(<PeopleModal open onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("No people added yet")).toBeDefined();
    });

    expect(screen.queryByTestId("people-pagination")).toBeNull();
  });
});
