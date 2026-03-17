import { describe, it, expect } from "vitest";
import { backwardPass, type BackwardPassResult } from "./backward-pass";
import { forwardPass } from "./forward-pass";

/* ─── helpers ─── */

const PROJECT_START = "2024-06-01T00:00:00.000Z";

function makeActs(...items: { id: string; duration: number }[]) {
  return items.map((a) => ({ id: a.id, duration: a.duration }));
}

function makeRels(...items: [string, string, number?][]) {
  return items.map(([predecessorId, successorId, lag]) => ({
    predecessorId,
    successorId,
    lag: lag ?? 0,
  }));
}

describe("backwardPass", () => {
  it("returns empty map for empty activities", () => {
    const result = backwardPass([], [], new Map());
    expect(result.size).toBe(0);
  });

  it("computes single activity with zero float", () => {
    const acts = makeActs({ id: "A", duration: 5 });
    const rels = makeRels();
    const fp = forwardPass(acts, rels, PROJECT_START);
    const bp = backwardPass(acts, rels, fp);

    const a = bp.get("A")!;
    expect(a).toBeDefined();
    expect(a.totalFloat).toBe(0);
    expect(a.lateStart).toBe(fp.get("A")!.startDate);
    expect(a.lateFinish).toBe(fp.get("A")!.finishDate);
  });

  it("computes critical path (two sequential activities)", () => {
    const acts = makeActs({ id: "A", duration: 5 }, { id: "B", duration: 3 });
    const rels = makeRels(["A", "B"]);
    const fp = forwardPass(acts, rels, PROJECT_START);
    const bp = backwardPass(acts, rels, fp);

    // Both on critical path → float = 0
    expect(bp.get("A")!.totalFloat).toBe(0);
    expect(bp.get("B")!.totalFloat).toBe(0);
  });

  it("computes float for parallel paths", () => {
    // A(5) → C(2)
    // B(3) → C(2)
    // Critical path: A→C (7 days), B has 2 days float
    const acts = makeActs(
      { id: "A", duration: 5 },
      { id: "B", duration: 3 },
      { id: "C", duration: 2 },
    );
    const rels = makeRels(["A", "C"], ["B", "C"]);
    const fp = forwardPass(acts, rels, PROJECT_START);
    const bp = backwardPass(acts, rels, fp);

    expect(bp.get("A")!.totalFloat).toBe(0);
    expect(bp.get("C")!.totalFloat).toBe(0);
    expect(bp.get("B")!.totalFloat).toBe(2);
  });

  it("handles lag correctly", () => {
    // A(5) --FS+2--> B(3)
    // Project end = 5 + 2 + 3 = 10
    const acts = makeActs({ id: "A", duration: 5 }, { id: "B", duration: 3 });
    const rels = makeRels(["A", "B", 2]);
    const fp = forwardPass(acts, rels, PROJECT_START);
    const bp = backwardPass(acts, rels, fp);

    expect(bp.get("A")!.totalFloat).toBe(0);
    expect(bp.get("B")!.totalFloat).toBe(0);
  });

  it("computes correct late dates for non-critical activity", () => {
    // A(10) → C(5)
    // B(3)  → C(5)
    // Project end = 15 days
    // B: ES=0, EF=3, LS=7, LF=10, TF=7
    const acts = makeActs(
      { id: "A", duration: 10 },
      { id: "B", duration: 3 },
      { id: "C", duration: 5 },
    );
    const rels = makeRels(["A", "C"], ["B", "C"]);
    const fp = forwardPass(acts, rels, PROJECT_START);
    const bp = backwardPass(acts, rels, fp);

    expect(bp.get("B")!.totalFloat).toBe(7);
    // B late finish should be same as C late start
    expect(bp.get("B")!.lateFinish).toBe(bp.get("C")!.lateStart);
  });

  it("handles multiple terminal activities", () => {
    // A(5) → B(3)
    // A(5) → C(7)
    // Both B and C are terminal. Project end = max(EF_B=8, EF_C=12) = 12
    // B float = 12 - 8 = 4
    const acts = makeActs(
      { id: "A", duration: 5 },
      { id: "B", duration: 3 },
      { id: "C", duration: 7 },
    );
    const rels = makeRels(["A", "B"], ["A", "C"]);
    const fp = forwardPass(acts, rels, PROJECT_START);
    const bp = backwardPass(acts, rels, fp);

    expect(bp.get("A")!.totalFloat).toBe(0);
    expect(bp.get("C")!.totalFloat).toBe(0);
    expect(bp.get("B")!.totalFloat).toBe(4);
  });

  it("handles disconnected activities (no relationships)", () => {
    const acts = makeActs(
      { id: "A", duration: 5 },
      { id: "B", duration: 10 },
    );
    const rels = makeRels();
    const fp = forwardPass(acts, rels, PROJECT_START);
    const bp = backwardPass(acts, rels, fp);

    // Project end = max(5, 10) = 10
    // A float = 10 - 5 = 5
    expect(bp.get("A")!.totalFloat).toBe(5);
    expect(bp.get("B")!.totalFloat).toBe(0);
  });
});
