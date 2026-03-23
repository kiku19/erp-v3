import { describe, it, expect } from "vitest";
import { forwardPass } from "./forward-pass";
import type { ForwardPassActivity, ForwardPassRelationship } from "./forward-pass";
import { DEFAULT_CALENDAR } from "./calendar-types";
import type { CalendarData, CalendarExceptionData } from "./calendar-types";

const PROJECT_START = "2026-01-01T00:00:00.000Z"; // Thursday

function makeAct(id: string, duration: number, calendarId?: string): ForwardPassActivity {
  return { id, duration, calendarId };
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
    // Jan 1 (Thu) + 10 working days = Thu(1),Fri(2),[Sat,Sun],Mon(5)..Fri(9),[Sat,Sun],Mon(12)..Wed(14) → finish = Jan 15
    // Jan 1 (Thu) + 5 working days = Thu(1),Fri(2),[Sat,Sun],Mon(5),Tue(6),Wed(7) → finish = Jan 8
    const acts = [makeAct("a1", 10), makeAct("a2", 5)];
    const result = forwardPass(acts, [], PROJECT_START);

    expect(result.get("a1")).toEqual({
      startDate: "2026-01-01T00:00:00.000Z",
      finishDate: "2026-01-15T00:00:00.000Z",
    });
    expect(result.get("a2")).toEqual({
      startDate: "2026-01-01T00:00:00.000Z",
      finishDate: "2026-01-08T00:00:00.000Z",
    });
  });

  it("schedules successor after predecessor finishes", () => {
    const acts = [makeAct("a1", 10), makeAct("a2", 5)];
    const rels = [makeRel("a1", "a2")];
    const result = forwardPass(acts, rels, PROJECT_START);

    // a1: start=Jan1, finish=Jan15
    // a2: start=Jan15 (Thu), finish=Jan22
    expect(result.get("a2")).toEqual({
      startDate: "2026-01-15T00:00:00.000Z",
      finishDate: "2026-01-22T00:00:00.000Z",
    });
  });

  it("handles a three-activity chain", () => {
    const acts = [makeAct("a1", 5), makeAct("a2", 10), makeAct("a3", 3)];
    const rels = [makeRel("a1", "a2"), makeRel("a2", "a3")];
    const result = forwardPass(acts, rels, PROJECT_START);

    // a1: Jan1→Jan8, a2: Jan8→Jan22, a3: Jan22→Jan27
    expect(result.get("a3")).toEqual({
      startDate: "2026-01-22T00:00:00.000Z",
      finishDate: "2026-01-27T00:00:00.000Z",
    });
  });

  it("takes max predecessor finish for convergent paths", () => {
    // a1(10d) ──┐
    //           ├──→ a3(5d)
    // a2(20d) ──┘
    const acts = [makeAct("a1", 10), makeAct("a2", 20), makeAct("a3", 5)];
    const rels = [makeRel("a1", "a3"), makeRel("a2", "a3")];
    const result = forwardPass(acts, rels, PROJECT_START);

    // a1 finish = Jan15, a2 finish = Jan29 (longer), so a3 starts Jan29
    expect(result.get("a3")).toEqual({
      startDate: "2026-01-29T00:00:00.000Z",
      finishDate: "2026-02-05T00:00:00.000Z",
    });
  });

  it("handles divergent paths (one predecessor, multiple successors)", () => {
    // a1 ──→ a2(5d)
    //   └──→ a3(10d)
    const acts = [makeAct("a1", 10), makeAct("a2", 5), makeAct("a3", 10)];
    const rels = [makeRel("a1", "a2"), makeRel("a1", "a3")];
    const result = forwardPass(acts, rels, PROJECT_START);

    expect(result.get("a2")!.startDate).toBe("2026-01-15T00:00:00.000Z");
    expect(result.get("a3")!.startDate).toBe("2026-01-15T00:00:00.000Z");
  });

  it("applies positive lag (in working days)", () => {
    const acts = [makeAct("a1", 10), makeAct("a2", 5)];
    const rels = [makeRel("a1", "a2", 3)]; // 3 working day lag
    const result = forwardPass(acts, rels, PROJECT_START);

    // a1 finish = Jan 15, lag 3 working days → Jan 20 (Tue), a2 finish = Jan 27
    expect(result.get("a2")).toEqual({
      startDate: "2026-01-20T00:00:00.000Z",
      finishDate: "2026-01-27T00:00:00.000Z",
    });
  });

  it("applies negative lag (lead) using calendar days", () => {
    const acts = [makeAct("a1", 10), makeAct("a2", 5)];
    const rels = [makeRel("a1", "a2", -2)];
    const result = forwardPass(acts, rels, PROJECT_START);

    // a1 finish = Jan 15, a2 start = Jan 15 - 2 calendar days = Jan 13 (Tue)
    expect(result.get("a2")).toEqual({
      startDate: "2026-01-13T00:00:00.000Z",
      finishDate: "2026-01-20T00:00:00.000Z",
    });
  });

  it("handles zero-duration milestones", () => {
    const acts = [makeAct("a1", 10), makeAct("m1", 0)];
    const rels = [makeRel("a1", "m1")];
    const result = forwardPass(acts, rels, PROJECT_START);

    expect(result.get("m1")).toEqual({
      startDate: "2026-01-15T00:00:00.000Z",
      finishDate: "2026-01-15T00:00:00.000Z",
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

    // a1: Jan1→Jan8, a2: Jan8→Jan22, a3: Jan8→Jan13
    // a4: max(Jan22, Jan13) = Jan22 → Jan22+7wd = Jan31
    expect(result.get("a4")).toEqual({
      startDate: "2026-01-22T00:00:00.000Z",
      finishDate: "2026-01-31T00:00:00.000Z",
    });
  });

  it("schedules activities not in relationship graph at project start", () => {
    // a3 is an island — no relationships
    const acts = [makeAct("a1", 5), makeAct("a2", 10), makeAct("a3", 8)];
    const rels = [makeRel("a1", "a2")];
    const result = forwardPass(acts, rels, PROJECT_START);

    expect(result.get("a3")).toEqual({
      startDate: "2026-01-01T00:00:00.000Z",
      finishDate: "2026-01-13T00:00:00.000Z",
    });
  });

  /* ─── Calendar-specific tests ─── */

  it("uses a custom calendar with holidays", () => {
    const holiday: CalendarExceptionData = {
      id: "h1",
      name: "Holiday",
      date: "2026-01-02T00:00:00.000Z",
      endDate: null,
      exceptionType: "Holiday",
      startTime: null,
      endTime: null,
      reason: null,
      workHours: null,
    };
    const cal: CalendarData = { ...DEFAULT_CALENDAR, id: "cal-h", exceptions: [holiday] };
    const calendars = new Map([["cal-h", cal]]);

    const acts = [makeAct("a1", 5, "cal-h")];
    const result = forwardPass(acts, [], PROJECT_START, { calendars });

    // Jan 1 (Thu), skip Jan 2 (Holiday), Jan 5 (Mon), Jan 6, Jan 7, Jan 8
    // 5 working days: Thu(1), Mon(5), Tue(6), Wed(7), Thu(8) → finish=Jan 9
    expect(result.get("a1")!.finishDate).toBe("2026-01-09T00:00:00.000Z");
  });

  it("uses defaultCalendarId when activity has no calendarId", () => {
    const cal: CalendarData = { ...DEFAULT_CALENDAR, id: "default-cal" };
    const calendars = new Map([["default-cal", cal]]);

    const acts = [makeAct("a1", 5)]; // no calendarId
    const result = forwardPass(acts, [], PROJECT_START, {
      calendars,
      defaultCalendarId: "default-cal",
    });

    // Same as default 5-day calendar
    expect(result.get("a1")!.finishDate).toBe("2026-01-08T00:00:00.000Z");
  });

  it("falls back to DEFAULT_CALENDAR when no calendars provided", () => {
    const acts = [makeAct("a1", 5)];
    const result = forwardPass(acts, [], PROJECT_START);

    expect(result.get("a1")!.finishDate).toBe("2026-01-08T00:00:00.000Z");
  });
});
