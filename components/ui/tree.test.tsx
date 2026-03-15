import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Tree,
  TreeHeader,
  TreeContent,
  TreeNode,
  TreeShortcuts,
  TreeFooter,
  InteractiveTree,
  insertNodeNear,
  removeNodeById,
  type TreeNodeData,
} from "./tree";

afterEach(() => {
  cleanup();
});

/* ─────────────────────── Tree (container) ─────────────────────── */

describe("Tree", () => {
  it("renders as a vertical flex container with card background", () => {
    render(
      <Tree data-testid="org-tree">
        <div>content</div>
      </Tree>,
    );
    const el = screen.getByTestId("org-tree");
    expect(el).toBeDefined();
    expect(el.className).toContain("flex");
    expect(el.className).toContain("flex-col");
    expect(el.className).toContain("bg-card");
  });

  it("applies right border", () => {
    render(
      <Tree data-testid="org-tree">
        <div>content</div>
      </Tree>,
    );
    const el = screen.getByTestId("org-tree");
    expect(el.className).toContain("border-r");
    expect(el.className).toContain("border-border");
  });

  it("merges custom className", () => {
    render(
      <Tree data-testid="org-tree" className="w-80">
        <div>content</div>
      </Tree>,
    );
    const el = screen.getByTestId("org-tree");
    expect(el.className).toContain("w-80");
  });
});

/* ─────────────────────── TreeHeader ───────────────────────────── */

describe("TreeHeader", () => {
  it("renders the title text", () => {
    render(<TreeHeader title="Organization Tree" />);
    expect(screen.getByText("Organization Tree")).toBeDefined();
  });

  it("renders action button when provided", () => {
    const onAddPerson = vi.fn();
    render(
      <TreeHeader
        title="Organization Tree"
        onAddPerson={onAddPerson}
      />,
    );
    const personBtn = screen.getByTestId("tree-add-person");
    expect(personBtn).toBeDefined();
  });

  it("calls onAddPerson when person button is clicked", async () => {
    const user = userEvent.setup();
    const onAddPerson = vi.fn();
    render(
      <TreeHeader
        title="Organization Tree"
        onAddPerson={onAddPerson}
      />,
    );
    await user.click(screen.getByTestId("tree-add-person"));
    expect(onAddPerson).toHaveBeenCalledOnce();
  });

  it("has bottom border", () => {
    render(<TreeHeader title="Test" data-testid="tree-header" />);
    const el = screen.getByTestId("tree-header");
    expect(el.className).toContain("border-b");
  });
});

/* ─────────────────────── TreeContent ──────────────────────────── */

describe("TreeContent", () => {
  it("renders children in scrollable area", () => {
    render(
      <TreeContent data-testid="tree-content">
        <div>tree nodes</div>
      </TreeContent>,
    );
    const el = screen.getByTestId("tree-content");
    expect(el.className).toContain("overflow-y-auto");
    expect(screen.getByText("tree nodes")).toBeDefined();
  });

  it("takes remaining vertical space with flex-1", () => {
    render(
      <TreeContent data-testid="tree-content">
        <div>nodes</div>
      </TreeContent>,
    );
    const el = screen.getByTestId("tree-content");
    expect(el.className).toContain("flex-1");
  });
});

/* ─────────────────────── TreeNode ─────────────────────────────── */

describe("TreeNode", () => {
  const personNode: TreeNodeData = {
    id: "1",
    name: "Rajesh Kumar",
    initials: "RK",
    role: "CEO",
    roleColor: "accent",
  };

  const managerNode: TreeNodeData = {
    id: "2",
    name: "Mike Torres",
    initials: "MT",
    role: "Manager",
    roleColor: "info",
    expanded: true,
    children: [
      {
        id: "3",
        name: "Lisa Park",
        initials: "LP",
        role: "Sr. Eng.",
      },
    ],
  };

  it("renders person node with name, initials, and role", () => {
    render(<TreeNode node={personNode} level={0} />);
    expect(screen.getByText("Rajesh Kumar")).toBeDefined();
    expect(screen.getByText("RK")).toBeDefined();
    expect(screen.getByText("CEO")).toBeDefined();
  });

  it("applies indentation based on level", () => {
    render(<TreeNode node={personNode} level={2} data-testid="tree-node" />);
    const el = screen.getByTestId("tree-node");
    expect(el.style.paddingLeft).toBeTruthy();
  });

  it("shows chevron when node has children", () => {
    render(<TreeNode node={managerNode} level={0} />);
    const chevron = screen.getByTestId("tree-chevron-2");
    expect(chevron).toBeDefined();
  });

  it("does not show chevron for leaf nodes", () => {
    render(<TreeNode node={personNode} level={0} />);
    expect(screen.queryByTestId("tree-chevron-1")).toBeNull();
  });

  it("calls onToggle when chevron is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<TreeNode node={managerNode} level={0} onToggle={onToggle} />);
    await user.click(screen.getByTestId("tree-chevron-2"));
    expect(onToggle).toHaveBeenCalledWith("2");
  });

  it("renders drag handle when draggable", () => {
    render(<TreeNode node={personNode} level={0} draggable />);
    expect(screen.getByTestId("tree-drag-1")).toBeDefined();
  });

  it("highlights selected node with active state tokens", () => {
    render(<TreeNode node={personNode} level={0} active data-testid="tree-node" />);
    const el = screen.getByTestId("tree-node");
    expect(el.className).toContain("bg-primary-active");
    expect(el.className).toContain("text-primary-active-foreground");
  });

  it("renders children when expanded", () => {
    render(
      <TreeNode node={managerNode} level={0}>
        <TreeNode node={managerNode.children![0]} level={1} />
      </TreeNode>,
    );
    expect(screen.getByText("Lisa Park")).toBeDefined();
  });

  it("shows rename input when renaming prop is true", () => {
    render(<TreeNode node={personNode} level={0} renaming />);
    const input = screen.getByTestId("tree-rename-input");
    expect(input).toBeDefined();
    expect((input as HTMLInputElement).value).toBe("Rajesh Kumar");
  });

  it("calls onRenameSubmit with new name on Enter", async () => {
    const user = userEvent.setup();
    const onRenameSubmit = vi.fn();
    render(
      <TreeNode
        node={personNode}
        level={0}
        renaming
        onRenameSubmit={onRenameSubmit}
      />,
    );
    const input = screen.getByTestId("tree-rename-input");
    await user.clear(input);
    await user.type(input, "New Name{Enter}");
    expect(onRenameSubmit).toHaveBeenCalledWith("1", "New Name");
  });

  it("calls onRenameCancel on Escape during rename", async () => {
    const user = userEvent.setup();
    const onRenameCancel = vi.fn();
    render(
      <TreeNode
        node={personNode}
        level={0}
        renaming
        onRenameCancel={onRenameCancel}
      />,
    );
    const input = screen.getByTestId("tree-rename-input");
    await user.type(input, "{Escape}");
    expect(onRenameCancel).toHaveBeenCalled();
  });

  it("shows add-child input when addingChild prop is true", () => {
    render(<TreeNode node={personNode} level={0} addingChild />);
    const input = screen.getByTestId("tree-add-child-input");
    expect(input).toBeDefined();
  });

  it("calls onAddChildSubmit with name on Enter in add-child input", async () => {
    const user = userEvent.setup();
    const onAddChildSubmit = vi.fn();
    render(
      <TreeNode
        node={personNode}
        level={0}
        addingChild
        onAddChildSubmit={onAddChildSubmit}
      />,
    );
    const input = screen.getByTestId("tree-add-child-input");
    await user.type(input, "Jane Doe{Enter}");
    expect(onAddChildSubmit).toHaveBeenCalledWith("1", "Jane Doe");
  });

  it("calls onAddChildCancel on Escape in add-child input", async () => {
    const user = userEvent.setup();
    const onAddChildCancel = vi.fn();
    render(
      <TreeNode
        node={personNode}
        level={0}
        addingChild
        onAddChildCancel={onAddChildCancel}
      />,
    );
    const input = screen.getByTestId("tree-add-child-input");
    await user.type(input, "{Escape}");
    expect(onAddChildCancel).toHaveBeenCalled();
  });

  it("shows inside-drop indicator when dropPosition is inside", () => {
    render(<TreeNode node={personNode} level={0} dragOver dropPosition="inside" data-testid="tree-node" />);
    const el = screen.getByTestId("tree-node");
    expect(el.className).toContain("ring-2");
    expect(el.className).toContain("ring-ring");
  });

  it("shows before-drop indicator when dropPosition is before", () => {
    render(<TreeNode node={personNode} level={0} dragOver dropPosition="before" data-testid="tree-node" />);
    const el = screen.getByTestId("tree-node");
    expect(el.querySelector("[data-testid='drop-line-before']")).toBeDefined();
  });

  it("shows after-drop indicator when dropPosition is after", () => {
    render(<TreeNode node={personNode} level={0} dragOver dropPosition="after" data-testid="tree-node" />);
    const el = screen.getByTestId("tree-node");
    expect(el.querySelector("[data-testid='drop-line-after']")).toBeDefined();
  });
});

/* ─────────────────────── TreeShortcuts ────────────────────────── */

describe("TreeShortcuts", () => {
  const shortcuts = [
    { key: "Ctrl+U", label: "User" },
    { key: "F2", label: "Rename" },
  ];

  it("renders all shortcut items", () => {
    render(<TreeShortcuts shortcuts={shortcuts} />);
    expect(screen.getByText("Ctrl+U")).toBeDefined();
    expect(screen.getByText("User")).toBeDefined();
    expect(screen.getByText("F2")).toBeDefined();
    expect(screen.getByText("Rename")).toBeDefined();
  });

  it("has muted background", () => {
    render(<TreeShortcuts shortcuts={shortcuts} data-testid="tree-shortcuts" />);
    const el = screen.getByTestId("tree-shortcuts");
    expect(el.className).toContain("bg-muted");
  });
});

/* ─────────────────────── TreeFooter ───────────────────────────── */

describe("TreeFooter", () => {
  const stats = [
    { label: "People", value: 30 },
    { label: "Managers", value: 5, color: "success" as const },
  ];

  it("renders all stat items", () => {
    render(<TreeFooter stats={stats} />);
    expect(screen.getByText("30")).toBeDefined();
    expect(screen.getByText("People")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getByText("Managers")).toBeDefined();
  });

  it("has top border", () => {
    render(<TreeFooter stats={stats} data-testid="tree-footer" />);
    const el = screen.getByTestId("tree-footer");
    expect(el.className).toContain("border-t");
  });

  it("applies color to value when specified", () => {
    render(<TreeFooter stats={stats} />);
    const successValue = screen.getByText("5");
    expect(successValue.className).toContain("text-success");
  });
});

/* ─────────────────────── InteractiveTree ──────────────────────── */

const sampleTree: TreeNodeData[] = [
  {
    id: "ceo",
    name: "Rajesh Kumar",
    initials: "RK",
    role: "CEO",
    roleColor: "accent",
    expanded: true,
    children: [
      {
        id: "cto",
        name: "Sarah Chen",
        initials: "SC",
        role: "CTO",
        roleColor: "accent",
        expanded: true,
        children: [
          {
            id: "p1",
            name: "Lisa Park",
            initials: "LP",
            role: "Sr. Eng.",
          },
        ],
      },
      {
        id: "p2",
        name: "Alex Rivera",
        initials: "AR",
        role: "Engineer",
      },
    ],
  },
];

describe("InteractiveTree", () => {
  it("renders the full tree", () => {
    render(<InteractiveTree data={sampleTree} />);
    expect(screen.getByText("Rajesh Kumar")).toBeDefined();
    expect(screen.getByText("Sarah Chen")).toBeDefined();
    expect(screen.getByText("Lisa Park")).toBeDefined();
    expect(screen.getByText("Alex Rivera")).toBeDefined();
  });

  it("toggles a node with children on click", async () => {
    const user = userEvent.setup();
    render(<InteractiveTree data={sampleTree} />);
    // Sarah Chen is expanded, Lisa Park visible
    expect(screen.getByText("Lisa Park")).toBeDefined();
    // Click Sarah Chen to collapse
    await user.click(screen.getByText("Sarah Chen"));
    expect(screen.queryByText("Lisa Park")).toBeNull();
    // Click again to expand
    await user.click(screen.getByText("Sarah Chen"));
    expect(screen.getByText("Lisa Park")).toBeDefined();
  });

  it("selects a node on click with active state tokens", async () => {
    const user = userEvent.setup();
    render(<InteractiveTree data={sampleTree} />);
    await user.click(screen.getByText("Alex Rivera"));
    const row = screen.getByTestId("tree-row-p2");
    expect(row.className).toContain("bg-primary-active");
    expect(row.className).toContain("text-primary-active-foreground");
  });

  it("enters rename mode on F2 after selecting a node", async () => {
    const user = userEvent.setup();
    render(<InteractiveTree data={sampleTree} />);
    await user.click(screen.getByText("Alex Rivera"));
    await user.keyboard("{F2}");
    const input = screen.getByTestId("tree-rename-input");
    expect(input).toBeDefined();
    expect((input as HTMLInputElement).value).toBe("Alex Rivera");
  });

  it("renames a node on Enter after F2", async () => {
    const user = userEvent.setup();
    render(<InteractiveTree data={sampleTree} />);
    await user.click(screen.getByText("Alex Rivera"));
    await user.keyboard("{F2}");
    const input = screen.getByTestId("tree-rename-input");
    await user.clear(input);
    await user.type(input, "Alex R. Updated{Enter}");
    expect(screen.getByText("Alex R. Updated")).toBeDefined();
    expect(screen.queryByTestId("tree-rename-input")).toBeNull();
  });

  it("cancels rename on Escape", async () => {
    const user = userEvent.setup();
    render(<InteractiveTree data={sampleTree} />);
    await user.click(screen.getByText("Alex Rivera"));
    await user.keyboard("{F2}");
    await user.type(screen.getByTestId("tree-rename-input"), "{Escape}");
    expect(screen.getByText("Alex Rivera")).toBeDefined();
    expect(screen.queryByTestId("tree-rename-input")).toBeNull();
  });

  it("adds a person child with Ctrl+U on any selected node", async () => {
    const user = userEvent.setup();
    render(<InteractiveTree data={sampleTree} />);
    // Select Alex Rivera (a leaf node — should still allow adding a report)
    await user.click(screen.getByText("Alex Rivera"));
    await user.keyboard("{Control>}u{/Control}");
    const input = screen.getByTestId("tree-add-child-input");
    expect(input).toBeDefined();
    await user.type(input, "New Report{Enter}");
    // New person should appear as child of Alex Rivera
    expect(screen.getByText("New Report")).toBeDefined();
    expect(screen.queryByTestId("tree-add-child-input")).toBeNull();
  });

  it("cancels add-child on Escape", async () => {
    const user = userEvent.setup();
    render(<InteractiveTree data={sampleTree} />);
    await user.click(screen.getByText("Alex Rivera"));
    await user.keyboard("{Control>}u{/Control}");
    await user.type(screen.getByTestId("tree-add-child-input"), "{Escape}");
    expect(screen.queryByTestId("tree-add-child-input")).toBeNull();
  });

  it("drops a user onto another user, making the target a manager", () => {
    const onTreeChange = vi.fn();
    render(<InteractiveTree data={sampleTree} onTreeChange={onTreeChange} />);

    // Drag p1 (Lisa Park) onto p2 (Alex Rivera)
    const dragSource = screen.getByTestId("tree-row-p1");
    const dropTarget = screen.getByTestId("tree-row-p2");

    fireEvent.dragStart(dragSource, {
      dataTransfer: { setData: vi.fn(), effectAllowed: "" },
    });
    fireEvent.dragOver(dropTarget, {
      dataTransfer: { types: ["text/plain"] },
    });
    fireEvent.drop(dropTarget, {
      dataTransfer: { getData: () => "p1" },
    });

    expect(onTreeChange).toHaveBeenCalled();
    const newTree = onTreeChange.mock.calls[0][0] as TreeNodeData[];
    // Alex Rivera should now have Lisa Park as a child
    const findNode = (nodes: TreeNodeData[], id: string): TreeNodeData | null => {
      for (const n of nodes) {
        if (n.id === id) return n;
        if (n.children) {
          const f = findNode(n.children, id);
          if (f) return f;
        }
      }
      return null;
    };
    const alex = findNode(newTree, "p2");
    expect(alex?.children?.some((c) => c.id === "p1")).toBe(true);
    // Lisa Park should be removed from Sarah Chen's children
    const sarah = findNode(newTree, "cto");
    expect(sarah?.children?.some((c) => c.id === "p1")).toBe(false);
  });

  it("does not allow dropping a node onto itself", () => {
    const onTreeChange = vi.fn();
    render(<InteractiveTree data={sampleTree} onTreeChange={onTreeChange} />);

    const row = screen.getByTestId("tree-row-p2");
    fireEvent.dragStart(row, {
      dataTransfer: { setData: vi.fn(), effectAllowed: "" },
    });
    fireEvent.drop(row, {
      dataTransfer: { getData: () => "p2" },
    });
    expect(onTreeChange).not.toHaveBeenCalled();
  });

  it("does not allow dropping a parent into its own descendant", () => {
    const onTreeChange = vi.fn();
    render(<InteractiveTree data={sampleTree} onTreeChange={onTreeChange} />);

    const dragSource = screen.getByTestId("tree-row-cto");
    const dropTarget = screen.getByTestId("tree-row-p1");
    fireEvent.dragStart(dragSource, {
      dataTransfer: { setData: vi.fn(), effectAllowed: "" },
    });
    fireEvent.drop(dropTarget, {
      dataTransfer: { getData: () => "cto" },
    });
    expect(onTreeChange).not.toHaveBeenCalled();
  });

  it("calls onTreeChange callback on rename", async () => {
    const user = userEvent.setup();
    const onTreeChange = vi.fn();
    render(<InteractiveTree data={sampleTree} onTreeChange={onTreeChange} />);
    await user.click(screen.getByText("Alex Rivera"));
    await user.keyboard("{F2}");
    const input = screen.getByTestId("tree-rename-input");
    await user.clear(input);
    await user.type(input, "Renamed{Enter}");
    expect(onTreeChange).toHaveBeenCalled();
  });

  it("reorders via insertNodeNear — before target", () => {
    // Tree: CEO > [CTO > [p1], p2]
    // Move p2 before CTO → CEO > [p2, CTO > [p1]]
    const { nodes: afterRemove, removed } = removeNodeById(sampleTree, "p2");
    expect(removed).not.toBeNull();
    const result = insertNodeNear(afterRemove, "cto", removed!, "before");
    const ceoChildren = result[0].children!;
    expect(ceoChildren[0].id).toBe("p2");
    expect(ceoChildren[1].id).toBe("cto");
  });

  it("reorders via insertNodeNear — after target", () => {
    // Tree: CEO > [CTO > [p1], p2]
    // Move CTO after p2 → CEO > [p2, CTO > [p1]]
    const { nodes: afterRemove, removed } = removeNodeById(sampleTree, "cto");
    expect(removed).not.toBeNull();
    const result = insertNodeNear(afterRemove, "p2", removed!, "after");
    const ceoChildren = result[0].children!;
    expect(ceoChildren[0].id).toBe("p2");
    expect(ceoChildren[1].id).toBe("cto");
  });

  it("reorders via insertNodeNear — into a nested level", () => {
    // Move p2 before p1 (inside CTO's children)
    const { nodes: afterRemove, removed } = removeNodeById(sampleTree, "p2");
    expect(removed).not.toBeNull();
    const result = insertNodeNear(afterRemove, "p1", removed!, "before");
    const ctoChildren = result[0].children![0].children!;
    expect(ctoChildren[0].id).toBe("p2");
    expect(ctoChildren[1].id).toBe("p1");
  });

  it("adds a root-level person when nothing is selected", async () => {
    const user = userEvent.setup();
    const onTreeChange = vi.fn();
    render(<InteractiveTree data={sampleTree} onTreeChange={onTreeChange} />);
    // No selection — click header add button
    await user.click(screen.getByTestId("tree-add-person"));
    const input = screen.getByTestId("tree-add-child-input");
    expect(input).toBeDefined();
    await user.type(input, "New Root User{Enter}");
    expect(screen.getByText("New Root User")).toBeDefined();
    // Should be at root level
    expect(onTreeChange).toHaveBeenCalled();
    const newTree = onTreeChange.mock.calls[0][0] as TreeNodeData[];
    expect(newTree[newTree.length - 1].name).toBe("New Root User");
  });

  it("adds a person after the selected user as a sibling", async () => {
    const user = userEvent.setup();
    const onTreeChange = vi.fn();
    render(<InteractiveTree data={sampleTree} onTreeChange={onTreeChange} />);
    // Select Lisa Park (child of CTO)
    await user.click(screen.getByText("Lisa Park"));
    // Click header add button — should add after Lisa Park at same level
    await user.click(screen.getByTestId("tree-add-person"));
    const input = screen.getByTestId("tree-add-child-input");
    await user.type(input, "New Colleague{Enter}");
    expect(screen.getByText("New Colleague")).toBeDefined();
    // Should be a sibling of Lisa Park under CTO
    expect(onTreeChange).toHaveBeenCalled();
    const newTree = onTreeChange.mock.calls[0][0] as TreeNodeData[];
    const findNode = (nodes: TreeNodeData[], id: string): TreeNodeData | null => {
      for (const n of nodes) {
        if (n.id === id) return n;
        if (n.children) { const f = findNode(n.children, id); if (f) return f; }
      }
      return null;
    };
    const cto = findNode(newTree, "cto");
    // Lisa Park at index 0, new person at index 1
    expect(cto?.children?.[0].id).toBe("p1");
    expect(cto?.children?.[1].name).toBe("New Colleague");
  });

  it("cancels add-person on Escape", async () => {
    const user = userEvent.setup();
    render(<InteractiveTree data={sampleTree} />);
    await user.click(screen.getByTestId("tree-add-person"));
    const input = screen.getByTestId("tree-add-child-input");
    await user.type(input, "{Escape}");
    expect(screen.queryByTestId("tree-add-child-input")).toBeNull();
  });

  it("newly created child becomes visible (parent auto-expanded)", async () => {
    const user = userEvent.setup();
    render(<InteractiveTree data={sampleTree} />);
    // Alex Rivera has no children (leaf)
    await user.click(screen.getByText("Alex Rivera"));
    await user.keyboard("{Control>}u{/Control}");
    await user.type(screen.getByTestId("tree-add-child-input"), "First Report{Enter}");
    // Should be visible — parent auto-expanded
    expect(screen.getByText("First Report")).toBeDefined();
    // Alex Rivera should now show a chevron (has children)
    expect(screen.getByTestId("tree-chevron-p2")).toBeDefined();
  });
});

/* ─────────────────────── Icon prop support ────────────────────────── */

describe("TreeNode with icon prop", () => {
  it("renders icon instead of avatar when icon prop is provided", () => {
    const node: TreeNodeData = {
      id: "eps-1",
      name: "Energy Division",
      icon: <span data-testid="custom-icon">IC</span>,
    };
    render(
      <Tree>
        <TreeContent>
          <TreeNode node={node} level={0} data-testid="node-eps-1" />
        </TreeContent>
      </Tree>,
    );
    expect(screen.getByTestId("custom-icon")).toBeDefined();
    expect(screen.getByText("Energy Division")).toBeDefined();
  });

  it("does not render avatar circle when icon is provided", () => {
    const node: TreeNodeData = {
      id: "eps-1",
      name: "Test",
      initials: "TE",
      icon: <span data-testid="icon">IC</span>,
    };
    render(
      <Tree>
        <TreeContent>
          <TreeNode node={node} level={0} data-testid="node-eps-1" />
        </TreeContent>
      </Tree>,
    );
    // Icon should be rendered, not the initials avatar
    expect(screen.getByTestId("icon")).toBeDefined();
  });

  it("still renders initials avatar when no icon is provided", () => {
    const node: TreeNodeData = {
      id: "p1",
      name: "Sarah Chen",
      initials: "SC",
    };
    render(
      <Tree>
        <TreeContent>
          <TreeNode node={node} level={0} data-testid="node-p1" />
        </TreeContent>
      </Tree>,
    );
    expect(screen.getByText("SC")).toBeDefined();
  });
});

/* ─────────────────────── Badge prop support ──────────────────────── */

describe("TreeNode with badge prop", () => {
  it("renders badge when badge prop is provided", () => {
    const node: TreeNodeData = {
      id: "proj-1",
      name: "Horizon LNG",
      icon: <span>F</span>,
      badge: { label: "Active", color: "success" },
    };
    render(
      <Tree>
        <TreeContent>
          <TreeNode node={node} level={0} data-testid="node-proj-1" />
        </TreeContent>
      </Tree>,
    );
    const badge = screen.getByText("Active");
    expect(badge).toBeDefined();
    expect(badge.closest("[data-badge]")!.className).toContain("bg-success-bg");
  });

  it("does not render badge when badge prop is absent", () => {
    const node: TreeNodeData = {
      id: "n1",
      name: "No Badge",
      icon: <span>N</span>,
    };
    render(
      <Tree>
        <TreeContent>
          <TreeNode node={node} level={0} data-testid="node-n1" />
        </TreeContent>
      </Tree>,
    );
    expect(screen.queryByText("Active")).toBeNull();
  });
});
