import { describe, it, expect } from "vitest";
import { forwardPass } from "./forward-pass";
import type { ForwardPassActivity, ForwardPassRelationship } from "./forward-pass";

const PROJECT_START = "2026-01-01T00:00:00.000Z";

function makeAct(id: string, duration: number): ForwardPassActivity {
  return { id, duration };
}

function makeRel(
  predecessorId: string,
  successorId: string,
  lag = 0,
): ForwardPassRelationship {
  return { predecessorId, successorId, lag };
}

describe("forwardPass", () => {
  it("assigns project start date to activities with no predecessors", () => {
    const acts = [makeAct("a1", 10), makeAct("a2", 5)];
    const result = forwardPass(acts, [], PROJECT_START);

    expect(result.get("a1")).toEqual({
      startDate: "2026-01-01T00:00:00.000Z",
      finishDate: "2026-01-11T00:00:00.000Z",
    });
    expect(result.get("a2")).toEqual({
      startDate: "2026-01-01T00:00:00.000Z",
      finishDate: "2026-01-06T00:00:00.000Z",
    });
  });

  it("schedules successor after predecessor finishes", () => {
    const acts = [makeAct("a1", 10), makeAct("a2", 5)];
    const rels = [makeRel("a1", "a2")];
    const result = forwardPass(acts, rels, PROJECT_START);

    // a1: start=Jan1, finish=Jan11
    // a2: start=Jan11 (a1 finish), finish=Jan16
    expect(result.get("a2")).toEqual({
      startDate: "2026-01-11T00:00:00.000Z",
      finishDate: "2026-01-16T00:00:00.000Z",
    });
  });

  it("handles a three-activity chain", () => {
    const acts = [makeAct("a1", 5), makeAct("a2", 10), makeAct("a3", 3)];
    const rels = [makeRel("a1", "a2"), makeRel("a2", "a3")];
    const result = forwardPass(acts, rels, PROJECT_START);

    // a1: 1→6, a2: 6→16, a3: 16→19
    expect(result.get("a3")).toEqual({
      startDate: "2026-01-16T00:00:00.000Z",
      finishDate: "2026-01-19T00:00:00.000Z",
    });
  });

  it("takes max predecessor finish for convergent paths", () => {
    // a1(10d) ──┐
    //           ├──→ a3(5d)
    // a2(20d) ──┘
    const acts = [makeAct("a1", 10), makeAct("a2", 20), makeAct("a3", 5)];
    const rels = [makeRel("a1", "a3"), makeRel("a2", "a3")];
    const result = forwardPass(acts, rels, PROJECT_START);

    // a2 finishes at Jan 21 (longer), so a3 starts Jan 21
    expect(result.get("a3")).toEqual({
      startDate: "2026-01-21T00:00:00.000Z",
      finishDate: "2026-01-26T00:00:00.000Z",
    });
  });

  it("handles divergent paths (one predecessor, multiple successors)", () => {
    // a1 ──→ a2(5d)
    //   └──→ a3(10d)
    const acts = [makeAct("a1", 10), makeAct("a2", 5), makeAct("a3", 10)];
    const rels = [makeRel("a1", "a2"), makeRel("a1", "a3")];
    const result = forwardPass(acts, rels, PROJECT_START);

    expect(result.get("a2")!.startDate).toBe("2026-01-11T00:00:00.000Z");
    expect(result.get("a3")!.startDate).toBe("2026-01-11T00:00:00.000Z");
  });

  it("applies positive lag", () => {
    const acts = [makeAct("a1", 10), makeAct("a2", 5)];
    const rels = [makeRel("a1", "a2", 3)]; // 3 day lag
    const result = forwardPass(acts, rels, PROJECT_START);

    // a1 finish = Jan 11, a2 start = Jan 11 + 3 = Jan 14
    expect(result.get("a2")).toEqual({
      startDate: "2026-01-14T00:00:00.000Z",
      finishDate: "2026-01-19T00:00:00.000Z",
    });
  });

  it("applies negative lag (lead)", () => {
    const acts = [makeAct("a1", 10), makeAct("a2", 5)];
    const rels = [makeRel("a1", "a2", -2)];
    const result = forwardPass(acts, rels, PROJECT_START);

    // a1 finish = Jan 11, a2 start = Jan 11 - 2 = Jan 9
    expect(result.get("a2")).toEqual({
      startDate: "2026-01-09T00:00:00.000Z",
      finishDate: "2026-01-14T00:00:00.000Z",
    });
  });

  it("handles zero-duration milestones", () => {
    const acts = [makeAct("a1", 10), makeAct("m1", 0)];
    const rels = [makeRel("a1", "m1")];
    const result = forwardPass(acts, rels, PROJECT_START);

    expect(result.get("m1")).toEqual({
      startDate: "2026-01-11T00:00:00.000Z",
      finishDate: "2026-01-11T00:00:00.000Z",
    });
  });

  it("returns empty map for empty input", () => {
    const result = forwardPass([], [], PROJECT_START);
    expect(result.size).toBe(0);
  });

  it("detects cycles and throws", () => {
    const acts = [makeAct("a1", 5), makeAct("a2", 5)];
    const rels = [makeRel("a1", "a2"), makeRel("a2", "a1")];

    expect(() => forwardPass(acts, rels, PROJECT_START)).toThrow(/cycle/i);
  });

  it("detects self-referencing cycle", () => {
    const acts = [makeAct("a1", 5)];
    const rels = [makeRel("a1", "a1")];

    expect(() => forwardPass(acts, rels, PROJECT_START)).toThrow(/cycle/i);
  });

  it("handles complex diamond network", () => {
    //       a1(5)
    //      /     \
    //   a2(10)  a3(3)
    //      \     /
    //       a4(7)
    const acts = [makeAct("a1", 5), makeAct("a2", 10), makeAct("a3", 3), makeAct("a4", 7)];
    const rels = [
      makeRel("a1", "a2"),
      makeRel("a1", "a3"),
      makeRel("a2", "a4"),
      makeRel("a3", "a4"),
    ];
    const result = forwardPass(acts, rels, PROJECT_START);

    // a1: 1→6, a2: 6→16, a3: 6→9
    // a4: max(16, 9) = 16 → 16→23
    expect(result.get("a4")).toEqual({
      startDate: "2026-01-16T00:00:00.000Z",
      finishDate: "2026-01-23T00:00:00.000Z",
    });
  });

  it("schedules activities not in relationship graph at project start", () => {
    // a3 is an island — no relationships
    const acts = [makeAct("a1", 5), makeAct("a2", 10), makeAct("a3", 8)];
    const rels = [makeRel("a1", "a2")];
    const result = forwardPass(acts, rels, PROJECT_START);

    expect(result.get("a3")).toEqual({
      startDate: "2026-01-01T00:00:00.000Z",
      finishDate: "2026-01-09T00:00:00.000Z",
    });
  });
});
