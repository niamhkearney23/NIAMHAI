import { describe, expect, it } from "vitest";
import { detectPii, stripPii } from "./pii";

const sample = `My client, Lim Wei Ming, was dismissed by Seri Mutiara Holdings Sdn Bhd in March.
His IC is 880412-14-5567 and his mobile is 012-345 6789. He emailed wei.ming@example.com.
Encik Ahmad Faiz bin Rahman, the HR manager, gave evidence. The Singapore office contact
was Mdm Tan Siew Lan (S8812345D, +65 9123 4567). The Court applied Lim Kok Wah v Public Prosecutor.`;

describe("detectPii", () => {
  const findings = detectPii(sample);
  const values = (kind: string) => findings.filter((f) => f.kind === kind).map((f) => f.value);

  it("finds identity numbers", () => {
    expect(values("my_ic")).toEqual(["880412-14-5567"]);
    expect(values("sg_nric")).toEqual(["S8812345D"]);
  });

  it("finds phone numbers and emails", () => {
    expect(values("phone")).toEqual(expect.arrayContaining(["012-345 6789", "+65 9123 4567"]));
    expect(values("email")).toEqual(["wei.ming@example.com"]);
  });

  it("finds names with a clue", () => {
    const names = values("name");
    expect(names).toEqual(expect.arrayContaining(["Lim Wei Ming", "Mdm Tan Siew Lan"]));
    expect(names.some((n) => n.includes("Ahmad Faiz bin Rahman"))).toBe(true);
  });

  it("finds companies and case titles", () => {
    expect(values("company")).toEqual(["Seri Mutiara Holdings Sdn Bhd"]);
    expect(values("case_title")).toEqual(["Lim Kok Wah v Public Prosecutor"]);
    expect(findings.find((f) => f.kind === "case_title")?.defaultStrip).toBe(false);
  });

  it("ignores ordinary numbers and dates", () => {
    expect(detectPii("Damages of RM120,000 were awarded on 12 March 2024 under section 20.")).toEqual([]);
    expect(detectPii("Case no. WA-22NCvC-123-03/2020 was heard in 2021.")).toEqual([]);
  });

  it("does not flag an invalid MyKad date", () => {
    expect(detectPii("Reference 881345-14-5567").filter((f) => f.kind === "my_ic")).toEqual([]);
  });
});

describe("stripPii", () => {
  it("replaces selected details with numbered labels", () => {
    const findings = detectPii(sample).filter((f) => f.defaultStrip);
    const { text, replaced } = stripPii(sample, findings);
    expect(text).not.toContain("880412-14-5567");
    expect(text).not.toContain("Lim Wei Ming");
    expect(text).toContain("[IC number]");
    expect(text).toMatch(/\[Name \d\]/);
    expect(text).toContain("Lim Kok Wah v Public Prosecutor");
    expect(replaced).toBeGreaterThanOrEqual(findings.length);
  });

  it("keeps the same label for repeated names", () => {
    const text = "Mr Tan Ah Kow signed. Later Mr Tan Ah Kow resigned.";
    const out = stripPii(text, detectPii(text)).text;
    expect(out).toBe("[Name] signed. Later [Name] resigned.");
  });
});
