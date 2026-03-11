import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Avatar } from "./avatar";

afterEach(cleanup);

describe("Avatar", () => {
  it("renders initials text", () => {
    render(<Avatar initials="JD" />);
    expect(screen.getByText("JD")).toBeDefined();
  });

  it("renders with default size (40x40)", () => {
    render(<Avatar initials="AB" data-testid="avatar" />);
    const avatar = screen.getByTestId("avatar");
    expect(avatar.className).toContain("h-10");
    expect(avatar.className).toContain("w-10");
  });

  it("renders with sm size (32x32)", () => {
    render(<Avatar initials="SM" size="sm" data-testid="avatar" />);
    const avatar = screen.getByTestId("avatar");
    expect(avatar.className).toContain("h-8");
    expect(avatar.className).toContain("w-8");
  });

  it("renders with lg size (56x56)", () => {
    render(<Avatar initials="LG" size="lg" data-testid="avatar" />);
    const avatar = screen.getByTestId("avatar");
    expect(avatar.className).toContain("h-14");
    expect(avatar.className).toContain("w-14");
  });

  it("renders with rounded-full, bg-muted, and overflow-hidden", () => {
    render(<Avatar initials="AB" data-testid="avatar" />);
    const avatar = screen.getByTestId("avatar");
    expect(avatar.className).toContain("rounded-full");
    expect(avatar.className).toContain("bg-muted");
    expect(avatar.className).toContain("overflow-hidden");
  });

  it("renders text-muted-foreground and font-semibold", () => {
    render(<Avatar initials="AB" data-testid="avatar" />);
    const avatar = screen.getByTestId("avatar");
    expect(avatar.className).toContain("text-muted-foreground");
    expect(avatar.className).toContain("font-semibold");
  });

  it("renders an image when src is provided", () => {
    render(<Avatar initials="AB" src="/photo.jpg" alt="User photo" />);
    const img = screen.getByRole("img");
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("/photo.jpg");
    expect(img.getAttribute("alt")).toBe("User photo");
  });

  it("merges custom className", () => {
    render(<Avatar initials="AB" className="custom-cls" data-testid="avatar" />);
    const avatar = screen.getByTestId("avatar");
    expect(avatar.className).toContain("custom-cls");
    expect(avatar.className).toContain("rounded-full");
  });

  it("uses correct font size for each size variant", () => {
    const { unmount: unmount1 } = render(
      <Avatar initials="SM" size="sm" data-testid="avatar" />,
    );
    expect(screen.getByTestId("avatar").className).toContain("text-xs");
    unmount1();

    const { unmount: unmount2 } = render(
      <Avatar initials="MD" size="default" data-testid="avatar" />,
    );
    expect(screen.getByTestId("avatar").className).toContain("text-sm");
    unmount2();

    const { unmount: unmount3 } = render(
      <Avatar initials="LG" size="lg" data-testid="avatar" />,
    );
    expect(screen.getByTestId("avatar").className).toContain("text-xl");
    unmount3();
  });
});
