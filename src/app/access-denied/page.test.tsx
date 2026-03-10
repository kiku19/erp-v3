export {};

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccessDeniedPage from "./page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe("AccessDeniedPage — Rendering", () => {
  it("renders the Access Denied heading", () => {
    render(<AccessDeniedPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Access Denied");
  });

  it("renders the access denied message", () => {
    render(<AccessDeniedPage />);
    expect(screen.getByText(/do not have permission to access this page/i)).toBeInTheDocument();
  });

  it("renders the Go to Dashboard button", () => {
    render(<AccessDeniedPage />);
    expect(screen.getByRole("button", { name: /go to dashboard/i })).toBeInTheDocument();
  });
});

// ── Navigation ──────────────────────────────────────────────────────────────

describe("AccessDeniedPage — Navigation", () => {
  it("redirects to /dashboard when Go to Dashboard button is clicked", async () => {
    const user = userEvent.setup();
    render(<AccessDeniedPage />);

    await user.click(screen.getByRole("button", { name: /go to dashboard/i }));
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });
});
