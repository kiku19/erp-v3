import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardActions,
} from "./card";

afterEach(cleanup);

describe("Card", () => {
  it("renders with bg-card and rounded-lg", () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("bg-card");
    expect(card.className).toContain("rounded-lg");
  });

  it("renders with border", () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("border");
    expect(card.className).toContain("border-border");
  });

  it("merges custom className", () => {
    render(
      <Card data-testid="card" className="my-custom">
        Content
      </Card>,
    );
    const card = screen.getByTestId("card");
    expect(card.className).toContain("my-custom");
    expect(card.className).toContain("bg-card");
  });

  it("renders children", () => {
    render(<Card>Hello World</Card>);
    expect(screen.getByText("Hello World")).toBeDefined();
  });
});

describe("CardHeader", () => {
  it("renders with vertical layout and gap-1 and p-6", () => {
    render(<CardHeader data-testid="header">Header</CardHeader>);
    const header = screen.getByTestId("header");
    expect(header.className).toContain("flex");
    expect(header.className).toContain("flex-col");
    expect(header.className).toContain("gap-1");
    expect(header.className).toContain("p-6");
  });

  it("merges custom className", () => {
    render(
      <CardHeader data-testid="header" className="extra">
        Header
      </CardHeader>,
    );
    const header = screen.getByTestId("header");
    expect(header.className).toContain("extra");
  });
});

describe("CardTitle", () => {
  it("renders with text-card-foreground, text-lg, and font-semibold", () => {
    render(<CardTitle data-testid="title">Title</CardTitle>);
    const title = screen.getByTestId("title");
    expect(title.className).toContain("text-card-foreground");
    expect(title.className).toContain("text-lg");
    expect(title.className).toContain("font-semibold");
  });

  it("renders as an h3 element", () => {
    render(<CardTitle data-testid="title">Title</CardTitle>);
    const title = screen.getByTestId("title");
    expect(title.tagName).toBe("H3");
  });
});

describe("CardDescription", () => {
  it("renders with text-muted-foreground and text-sm", () => {
    render(<CardDescription data-testid="desc">Desc</CardDescription>);
    const desc = screen.getByTestId("desc");
    expect(desc.className).toContain("text-muted-foreground");
    expect(desc.className).toContain("text-sm");
  });

  it("renders as a p element", () => {
    render(<CardDescription data-testid="desc">Desc</CardDescription>);
    const desc = screen.getByTestId("desc");
    expect(desc.tagName).toBe("P");
  });
});

describe("CardContent", () => {
  it("renders with gap-4 and correct padding", () => {
    render(<CardContent data-testid="content">Body</CardContent>);
    const content = screen.getByTestId("content");
    expect(content.className).toContain("flex");
    expect(content.className).toContain("flex-col");
    expect(content.className).toContain("gap-4");
    expect(content.className).toContain("px-6");
    expect(content.className).toContain("pb-6");
  });
});

describe("CardActions", () => {
  it("renders with horizontal layout, gap-3, justify-end, and correct padding", () => {
    render(<CardActions data-testid="actions">Actions</CardActions>);
    const actions = screen.getByTestId("actions");
    expect(actions.className).toContain("flex");
    expect(actions.className).toContain("gap-3");
    expect(actions.className).toContain("justify-end");
    expect(actions.className).toContain("px-6");
    expect(actions.className).toContain("pb-6");
  });
});

describe("Card composition", () => {
  it("renders a fully composed card", () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>My Title</CardTitle>
          <CardDescription>My Description</CardDescription>
        </CardHeader>
        <CardContent>Content here</CardContent>
        <CardActions>
          <button>Cancel</button>
          <button>Save</button>
        </CardActions>
      </Card>,
    );
    expect(screen.getByText("My Title")).toBeDefined();
    expect(screen.getByText("My Description")).toBeDefined();
    expect(screen.getByText("Content here")).toBeDefined();
    expect(screen.getByText("Cancel")).toBeDefined();
    expect(screen.getByText("Save")).toBeDefined();
  });
});
