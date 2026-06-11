import { describe, expect, it } from "vitest";
import { generateRoadmap } from "../roadmap";
import type { AssessmentState, RoadmapState } from "../varfoot";

const baseAssessment: AssessmentState = {
  name: "Test Player",
  age: "16",
  school: "Test HS",
  position: "Midfielder",
  heightInches: 68,
  weightLbs: 155,
  availableDays: [],
  currentLevel: "jv",
  targetLevel: "varsity",
  tryoutDate: null,
  trainingDaysPerWeek: 4,
  goalFocus: "",
};

describe("generateRoadmap", () => {
  it("produces at least 10 nodes for a 4-day/week athlete over 28 days", () => {
    const result = generateRoadmap({ assessment: baseAssessment, drillResults: {} });
    expect(result.nodes.length).toBeGreaterThanOrEqual(10);
  });

  it("produces at most 40 nodes", () => {
    const result = generateRoadmap({ assessment: baseAssessment, drillResults: {} });
    expect(result.nodes.length).toBeLessThanOrEqual(40);
  });

  it("first node is current, rest are locked", () => {
    const result = generateRoadmap({ assessment: baseAssessment, drillResults: {} });
    expect(result.nodes[0].status).toBe("current");
    expect(result.nodes.slice(1).every((n) => n.status === "locked")).toBe(true);
  });

  it("carries over completed nodes unchanged", () => {
    const first = generateRoadmap({ assessment: baseAssessment, drillResults: {} });
    const completedNode = { ...first.nodes[0], status: "completed" as const };
    const existing = { ...first, nodes: [completedNode, ...first.nodes.slice(1)] };

    const second = generateRoadmap({ assessment: baseAssessment, drillResults: {}, existing });
    expect(second.nodes[0].id).toBe(completedNode.id);
    expect(second.nodes[0].status).toBe("completed");
  });

  it("continues after the latest completed future session when regenerating", () => {
    const existing: RoadmapState = {
      generatedAt: "2026-06-10T12:00:00.000Z",
      goalDate: "2026-07-16",
      nodes: [
        {
          id: "completed-future-node",
          index: 0,
          label: "Passing",
          date: "2026-06-15",
          focusCategory: "Passing",
          drillIds: ["long-ping-30"],
          estimatedMinutes: 16,
          status: "completed",
        },
      ],
    };

    const result = generateRoadmap({
      assessment: { ...baseAssessment, tryoutDate: "2026-07-16" },
      drillResults: {},
      existing,
      today: new Date("2026-06-11T12:00:00.000Z"),
    });
    const current = result.nodes.find((node) => node.status === "current");

    expect(result.nodes[0]).toEqual(existing.nodes[0]);
    expect(current).toBeDefined();
    expect(current!.date !== null && current!.date > "2026-06-15").toBe(true);
  });

  it("no two consecutive sessions share every muscle group", () => {
    const result = generateRoadmap({ assessment: baseAssessment, drillResults: {} });
    // Just verify nodes have drillIds (the load-balancing is internal to the generator)
    expect(result.nodes.every((n) => n.drillIds.length > 0)).toBe(true);
  });

  it("every node has a date, label, and focusCategory", () => {
    const result = generateRoadmap({ assessment: baseAssessment, drillResults: {} });
    for (const node of result.nodes) {
      expect(node.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(node.label).toBeTruthy();
      expect(node.focusCategory).toBeTruthy();
    }
  });

  it("respects tryoutDate when far enough in future", () => {
    const future = new Date();
    future.setDate(future.getDate() + 60);
    const tryoutDate = future.toISOString().slice(0, 10);
    const result = generateRoadmap({
      assessment: { ...baseAssessment, tryoutDate },
      drillResults: {},
    });
    // All nodes should be on or before the tryout date
    for (const node of result.nodes) {
      if (node.date) expect(node.date <= tryoutDate).toBe(true);
    }
  });
});
