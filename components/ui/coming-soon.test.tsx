import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ComingSoon } from "./coming-soon";

afterEach(cleanup);

describe("ComingSoon", () => {
  it("renders the page name as heading", () => {
    render(<ComingSoon pageName="Dashboard" />);
    expect(screen.getByText("Dashboard").tagName).toBe("H1");
  });

  it("renders coming soon message", () => {
    render(<ComingSoon pageName="Orders" />);
    expect(screen.getByText("This page is coming soon.")).toBeTruthy();
  });

  it("has the correct test id", () => {
    render(<ComingSoon pageName="Settings" />);
    expect(screen.getByTestId("coming-soon")).toBeTruthy();
  });

  it("applies custom className", () => {
    render(<ComingSoon pageName="Reports" className="custom-class" />);
    expect(screen.getByTestId("coming-soon").className).toContain("custom-class");
  });
});
