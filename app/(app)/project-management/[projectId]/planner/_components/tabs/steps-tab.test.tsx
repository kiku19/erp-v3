import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StepsTab } from "./steps-tab";

describe("StepsTab", () => {
  afterEach(() => cleanup());
  it("renders coming soon placeholder", () => {
    render(<StepsTab />);
    expect(screen.getByText("Steps coming soon")).toBeDefined();
  });

  it("has the correct test id", () => {
    render(<StepsTab />);
    expect(screen.getByTestId("steps-tab")).toBeDefined();
  });
});
