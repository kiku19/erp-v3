import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CodesTab } from "./codes-tab";

describe("CodesTab", () => {
  afterEach(() => cleanup());
  it("renders coming soon placeholder", () => {
    render(<CodesTab />);
    expect(screen.getByText("Codes coming soon")).toBeDefined();
  });

  it("has the correct test id", () => {
    render(<CodesTab />);
    expect(screen.getByTestId("codes-tab")).toBeDefined();
  });
});
