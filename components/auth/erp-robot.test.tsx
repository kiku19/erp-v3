import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Mock @react-three/fiber — Canvas doesn't work in jsdom
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="three-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ size: { width: 800, height: 600 } })),
}));

vi.mock("@react-three/drei", () => ({
  Environment: () => null,
  ContactShadows: () => null,
  Float: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { ErpRobot } from "./erp-robot";

afterEach(cleanup);

describe("ErpRobot", () => {
  it("renders the 3D canvas container", () => {
    render(<ErpRobot />);
    expect(screen.getByTestId("erp-robot-container")).toBeDefined();
  });

  it("renders the Three.js canvas", () => {
    render(<ErpRobot />);
    expect(screen.getByTestId("three-canvas")).toBeDefined();
  });

  it("container is hidden from assistive technologies", () => {
    render(<ErpRobot />);
    const container = screen.getByTestId("erp-robot-container");
    expect(container.getAttribute("aria-hidden")).toBe("true");
  });

  it("accepts className prop for container styling", () => {
    render(<ErpRobot className="custom-class" />);
    const container = screen.getByTestId("erp-robot-container");
    expect(container.className).toContain("custom-class");
  });
});
