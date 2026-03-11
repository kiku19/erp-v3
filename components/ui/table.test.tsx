import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./table";

afterEach(() => {
  cleanup();
});

describe("Table", () => {
  it("renders a <table> element", () => {
    render(<Table data-testid="table">content</Table>);
    const table = screen.getByTestId("table");
    expect(table.tagName).toBe("TABLE");
  });

  it("applies w-full class to Table", () => {
    render(<Table data-testid="tbl-full">content</Table>);
    const table = screen.getByTestId("tbl-full");
    expect(table.className).toContain("w-full");
  });

  it("merges custom className on Table", () => {
    render(
      <Table data-testid="tbl-custom" className="my-custom">
        content
      </Table>,
    );
    const table = screen.getByTestId("tbl-custom");
    expect(table.className).toContain("my-custom");
  });

  it("renders TableHeader as <thead>", () => {
    render(
      <table>
        <TableHeader data-testid="thead">
          <tr>
            <th>Header</th>
          </tr>
        </TableHeader>
      </table>,
    );
    const thead = screen.getByTestId("thead");
    expect(thead.tagName).toBe("THEAD");
  });

  it("renders TableBody as <tbody>", () => {
    render(
      <table>
        <TableBody data-testid="tbody">
          <tr>
            <td>Cell</td>
          </tr>
        </TableBody>
      </table>,
    );
    const tbody = screen.getByTestId("tbody");
    expect(tbody.tagName).toBe("TBODY");
  });

  it("renders TableRow as <tr> with border-bottom", () => {
    render(
      <table>
        <tbody>
          <TableRow data-testid="row-border">
            <td>Cell</td>
          </TableRow>
        </tbody>
      </table>,
    );
    const row = screen.getByTestId("row-border");
    expect(row.tagName).toBe("TR");
    expect(row.className).toContain("border-b");
    expect(row.className).toContain("border-border");
  });

  it("renders TableHead as <th> with muted-foreground text", () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHead>Name</TableHead>
          </tr>
        </thead>
      </table>,
    );
    const th = screen.getByRole("columnheader", { name: "Name" });
    expect(th.tagName).toBe("TH");
    expect(th.className).toContain("text-muted-foreground");
  });

  it("renders TableHead with font-semibold and px-4", () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHead>Email</TableHead>
          </tr>
        </thead>
      </table>,
    );
    const th = screen.getByRole("columnheader", { name: "Email" });
    expect(th.className).toContain("font-semibold");
    expect(th.className).toContain("px-4");
  });

  it("renders TableCell as <td> with text-foreground", () => {
    render(
      <table>
        <tbody>
          <tr>
            <TableCell>John</TableCell>
          </tr>
        </tbody>
      </table>,
    );
    const td = screen.getByRole("cell", { name: "John" });
    expect(td.tagName).toBe("TD");
    expect(td.className).toContain("text-foreground");
  });

  it("renders TableCell with px-4", () => {
    render(
      <table>
        <tbody>
          <tr>
            <TableCell>Data</TableCell>
          </tr>
        </tbody>
      </table>,
    );
    const td = screen.getByRole("cell", { name: "Data" });
    expect(td.className).toContain("px-4");
  });

  it("forwards ref on Table", () => {
    let ref: HTMLTableElement | null = null;
    render(
      <Table ref={(el) => (ref = el)}>
        <tbody>
          <tr>
            <td>x</td>
          </tr>
        </tbody>
      </Table>,
    );
    expect(ref).not.toBeNull();
    expect(ref?.tagName).toBe("TABLE");
  });

  it("forwards ref on TableRow", () => {
    let ref: HTMLTableRowElement | null = null;
    render(
      <table>
        <tbody>
          <TableRow ref={(el) => (ref = el)}>
            <td>Cell</td>
          </TableRow>
        </tbody>
      </table>,
    );
    expect(ref).not.toBeNull();
    expect(ref?.tagName).toBe("TR");
  });

  it("renders a complete table with header and body", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Alice</TableCell>
            <TableCell>alice@example.com</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("table")).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeDefined();
    expect(screen.getByRole("cell", { name: "Alice" })).toBeDefined();
  });

  it("applies hover transition classes on TableRow", () => {
    render(
      <table>
        <tbody>
          <TableRow data-testid="row-hover">
            <td>Cell</td>
          </TableRow>
        </tbody>
      </table>,
    );
    const row = screen.getByTestId("row-hover");
    expect(row.className).toContain("transition-all");
  });

  it("TableHead has left text alignment by default", () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHead>Col</TableHead>
          </tr>
        </thead>
      </table>,
    );
    const th = screen.getByRole("columnheader", { name: "Col" });
    expect(th.className).toContain("text-left");
  });
});
