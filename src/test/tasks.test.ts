import { describe, expect, it } from "vitest";
import { isOverdue, isDueToday, type Task } from "@/lib/store";

const t = (p: Partial<Task>): Task => ({ id: "1", title: "x", priority: "medium", done: false, createdAt: 0, ...p });

describe("task status rules", () => {
  it("unfinished task past its due date is overdue", () => {
    expect(isOverdue(t({ due: "2026-10-20" }), "2026-10-22")).toBe(true);
  });
  it("completed task is never overdue", () => {
    expect(isOverdue(t({ due: "2026-10-20", done: true }), "2026-10-22")).toBe(false);
  });
  it("task due today is not overdue but is due today", () => {
    expect(isOverdue(t({ due: "2026-10-22" }), "2026-10-22")).toBe(false);
    expect(isDueToday(t({ due: "2026-10-22" }), "2026-10-22")).toBe(true);
  });
});
