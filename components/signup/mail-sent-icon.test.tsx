import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MailSentIcon } from "./mail-sent-icon";

describe("MailSentIcon", () => {
  it("renders with aria-hidden", () => {
    const { container } = render(<MailSentIcon />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.getAttribute("aria-hidden")).toBe("true");
  });

  it("contains an SVG", () => {
    const { container } = render(<MailSentIcon />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
