import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { VerifiedIcon } from "./verified-icon";

describe("VerifiedIcon", () => {
  it("renders with aria-hidden", () => {
    const { container } = render(<VerifiedIcon />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.getAttribute("aria-hidden")).toBe("true");
  });

  it("contains an SVG", () => {
    const { container } = render(<VerifiedIcon />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("contains a checkmark path with stroke-dasharray", () => {
    const { container } = render(<VerifiedIcon />);
    const path = container.querySelector("path");
    expect(path?.getAttribute("stroke-dasharray")).toBe("24");
  });
});
