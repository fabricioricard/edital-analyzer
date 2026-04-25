import { describe, it, expect } from "vitest";
import { calculateDaysUntil, hasCriticalDeadlines } from "./editalAnalyzer";

describe("editalAnalyzer", () => {
  describe("calculateDaysUntil", () => {
    it("should calculate days correctly for future dates", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      futureDate.setHours(0, 0, 0, 0);

      const daysUntil = calculateDaysUntil(futureDate.toISOString().split("T")[0]);
      expect(daysUntil).toBeGreaterThanOrEqual(4);
      expect(daysUntil).toBeLessThanOrEqual(5);
    });

    it("should return 0 or negative for today (depending on timezone)", () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysUntil = calculateDaysUntil(today.toISOString().split("T")[0]);
      expect(daysUntil).toBeLessThanOrEqual(0);
    });

    it("should return negative for past dates", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const daysUntil = calculateDaysUntil(pastDate.toISOString().split("T")[0]);
      expect(daysUntil).toBeLessThan(0);
    });

    it("should return -1 for invalid dates", () => {
      const daysUntil = calculateDaysUntil("not-a-valid-date-format");
      expect(daysUntil).toBe(-1);
    });
  });

  describe("hasCriticalDeadlines", () => {
    it("should identify critical deadlines (> 0 and < 7 days)", () => {
      const deadlines = [
        { daysUntil: 3 },
        { daysUntil: 10 },
        { daysUntil: 6 },
      ];

      const hasCritical = hasCriticalDeadlines(deadlines);
      expect(hasCritical).toBe(true);
    });

    it("should return false when all deadlines are >= 7 days", () => {
      const deadlines = [
        { daysUntil: 10 },
        { daysUntil: 15 },
        { daysUntil: 20 },
      ];

      const hasCritical = hasCriticalDeadlines(deadlines);
      expect(hasCritical).toBe(false);
    });

    it("should return false for empty deadlines", () => {
      const hasCritical = hasCriticalDeadlines([]);
      expect(hasCritical).toBe(false);
    });

    it("should not consider zero or negative days as critical", () => {
      const deadlines = [
        { daysUntil: 0 },
        { daysUntil: -5 },
        { daysUntil: 10 },
      ];

      const hasCritical = hasCriticalDeadlines(deadlines);
      expect(hasCritical).toBe(false);
    });
  });
});
