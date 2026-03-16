import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RelationshipsTab } from "./relationships-tab";
import type { ActivityData, ActivityRelationshipData } from "../types";

const mockActivities: ActivityData[] = [
  { id: "act-1", wbsNodeId: "w1", activityId: "A10", name: "Site Preparation", activityType: "task", duration: 10, startDate: null, finishDate: null, totalFloat: 0, percentComplete: 0, sortOrder: 0 },
  { id: "act-2", wbsNodeId: "w1", activityId: "A20", name: "Soil Testing", activityType: "task", duration: 5, startDate: null, finishDate: null, totalFloat: 0, percentComplete: 0, sortOrder: 1 },
  { id: "act-3", wbsNodeId: "w1", activityId: "A30", name: "Concrete Pouring", activityType: "task", duration: 15, startDate: null, finishDate: null, totalFloat: 0, percentComplete: 0, sortOrder: 2 },
  { id: "act-4", wbsNodeId: "w1", activityId: "A40", name: "Rebar Installation", activityType: "task", duration: 8, startDate: null, finishDate: null, totalFloat: 0, percentComplete: 0, sortOrder: 3 },
];

const mockRelationships: ActivityRelationshipData[] = [
  { id: "r1", predecessorId: "act-1", successorId: "act-2", relationshipType: "FS", lag: 0 },
  { id: "r2", predecessorId: "act-1", successorId: "act-3", relationshipType: "FS", lag: 2 },
  { id: "r3", predecessorId: "act-2", successorId: "act-4", relationshipType: "FS", lag: 0 },
];

describe("RelationshipsTab", () => {
  afterEach(() => cleanup());
  it("renders predecessors section", () => {
    render(
      <RelationshipsTab
        activityId="act-2"
        activities={mockActivities}
        relationships={mockRelationships}
      />,
    );
    expect(screen.getByText("Predecessors")).toBeDefined();
  });

  it("renders successors section", () => {
    render(
      <RelationshipsTab
        activityId="act-2"
        activities={mockActivities}
        relationships={mockRelationships}
      />,
    );
    expect(screen.getByText("Successors")).toBeDefined();
  });

  it("shows predecessor activities for the selected activity", () => {
    render(
      <RelationshipsTab
        activityId="act-2"
        activities={mockActivities}
        relationships={mockRelationships}
      />,
    );
    // act-2 has predecessor act-1 (Site Preparation)
    expect(screen.getByText("Site Preparation")).toBeDefined();
  });

  it("shows successor activities for the selected activity", () => {
    render(
      <RelationshipsTab
        activityId="act-2"
        activities={mockActivities}
        relationships={mockRelationships}
      />,
    );
    // act-2 has successor act-4 (Rebar Installation)
    expect(screen.getByText("Rebar Installation")).toBeDefined();
  });

  it("shows relationship type badge", () => {
    render(
      <RelationshipsTab
        activityId="act-2"
        activities={mockActivities}
        relationships={mockRelationships}
      />,
    );
    const fsBadges = screen.getAllByText("FS");
    expect(fsBadges.length).toBeGreaterThan(0);
  });

  it("shows lag value", () => {
    render(
      <RelationshipsTab
        activityId="act-1"
        activities={mockActivities}
        relationships={mockRelationships}
      />,
    );
    // act-1 → act-3 has lag 2
    expect(screen.getByText("2d")).toBeDefined();
  });

  it("shows empty state when no relationships", () => {
    render(
      <RelationshipsTab
        activityId="act-4"
        activities={mockActivities}
        relationships={[]}
      />,
    );
    expect(screen.getByText("No predecessors")).toBeDefined();
    expect(screen.getByText("No successors")).toBeDefined();
  });

  it("has the correct test id", () => {
    render(
      <RelationshipsTab
        activityId="act-2"
        activities={mockActivities}
        relationships={mockRelationships}
      />,
    );
    expect(screen.getByTestId("relationships-tab")).toBeDefined();
  });
});
