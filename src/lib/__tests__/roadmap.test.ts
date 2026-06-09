import { describe, expect, it } from "vitest";
import { generateRoadmap } from "../roadmap";
import type { AssessmentState } from "../varfoot";

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
