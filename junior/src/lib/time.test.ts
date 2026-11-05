import { describe, expect, it } from "vitest";
import { mondayOf, utcToZonedInput, weekDays, zonedDateKey, zonedInputToUtc } from "./time";

describe("time zones", () => {
  it("converts Kuala Lumpur local time to UTC and back", () => {
    const utc = zonedInputToUtc("2026-11-10T09:30", "Asia/Kuala_Lumpur");
    expect(utc?.toISOString()).toBe("2026-11-10T01:30:00.000Z");
    expect(utcToZonedInput(utc!, "Asia/Kuala_Lumpur")).toBe("2026-11-10T09:30");
  });

  it("handles a time just after midnight", () => {
    expect(zonedDateKey("2026-11-09T16:30:00Z", "Asia/Singapore")).toBe("2026-11-10");
  });

  it("rejects malformed input", () => {
    expect(zonedInputToUtc("10/11/2026 9am", "Asia/Singapore")).toBeNull();
  });

  it("builds a Monday-first week", () => {
    expect(mondayOf("2026-11-05")).toBe("2026-11-02");
    expect(mondayOf("2026-11-08")).toBe("2026-11-02");
    const days = weekDays("2026-11-02", "Asia/Kuala_Lumpur");
    expect(days).toHaveLength(7);
    expect(days[0].start.toISOString()).toBe("2026-11-01T16:00:00.000Z");
    expect(days[6].key).toBe("2026-11-08");
    expect(days[0].label).toBe("Mon 2 Nov");
  });
});
