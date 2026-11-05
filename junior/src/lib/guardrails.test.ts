import { describe, expect, it } from "vitest";
import { applyFix, openChecks, runRuleChecks } from "./guardrails";
import type { Check } from "./types";

const clean = `The Court of Appeal has clarified when an employer can rely on a probation clause.

The court held that the employer still had to act in good faith. A probation period is not a free pass.

If you manage a team, it may be worth reviewing how probation reviews are recorded.

This is general information only and not legal advice.`;

function byKey(checks: Check[], key: string) {
  const c = checks.find((x) => x.key === `rule:${key}`);
  if (!c) throw new Error(`missing ${key}`);
  return c;
}

describe("runRuleChecks", () => {
  it("passes a clean LinkedIn post", () => {
    const checks = runRuleChecks({ channel: "linkedin", title: "", body: clean, cards: [] });
    expect(checks.filter((c) => !c.pass)).toEqual([]);
  });

  it("blocks unfilled placeholders", () => {
    const checks = runRuleChecks({ channel: "linkedin", title: "", body: `On [date of decision] the court ruled.\n\n${clean}`, cards: [] });
    const c = byKey(checks, "placeholders");
    expect(c.pass).toBe(false);
    expect(c.blocking).toBe(true);
    expect(c.note).toContain("[date of decision]");
  });

  it("flags publicity problems but allows legal phrases", () => {
    const body = `As a leading employment specialist, we guarantee results. Free consultation this week. Our clients say we are better than other firms 😀 — really.\n\n${clean}`;
    const checks = runRuleChecks({ channel: "facebook", title: "", body, cards: [] });
    for (const key of ["claims", "promises", "fees", "testimonials", "comparisons", "emojis", "dashes"]) {
      expect(byKey(checks, key).pass, key).toBe(false);
    }

    const legal = `The leading case on the best interests of the child was cited. The expert witness was a specialist tribunal member. The bank relied on a personal guarantee.\n\n${clean}`;
    const legalChecks = runRuleChecks({ channel: "facebook", title: "", body: legal, cards: [] });
    for (const key of ["claims", "promises"]) {
      expect(byKey(legalChecks, key).pass, key).toBe(true);
    }
  });

  it("requires the general information line on LinkedIn, Facebook and newsletters only", () => {
    const body = "A short update on the new rules.";
    expect(byKey(runRuleChecks({ channel: "linkedin", title: "", body, cards: [] }), "general_info").pass).toBe(false);
    expect(runRuleChecks({ channel: "instagram", title: "", body, cards: [] }).some((c) => c.key === "rule:general_info")).toBe(false);
    const withTags = `${clean}\n\n#EmploymentLaw #Malaysia`;
    expect(byKey(runRuleChecks({ channel: "linkedin", title: "", body: withTags, cards: [] }), "general_info").pass).toBe(true);
  });

  it("flags American spelling and fixes it", () => {
    const body = `We analyzed the defense and will prioritize the organization's behavior.\n\n${clean}`;
    const checks = runRuleChecks({ channel: "linkedin", title: "", body, cards: [] });
    expect(byKey(checks, "spelling").pass).toBe(false);
    const fixed = applyFix({ title: "", body, cards: [] }, "spelling").body;
    expect(fixed).toContain("analysed the defence and will prioritise the organisation's behaviour");
  });

  it("does not treat size or seize as American", () => {
    const body = `The goods were seized and the prize was reduced in size.\n\n${clean}`;
    expect(byKey(runRuleChecks({ channel: "linkedin", title: "", body, cards: [] }), "spelling").pass).toBe(true);
  });

  it("fixes emojis and dashes", () => {
    const content = { title: "", body: "Big news 🎉 — the court agreed – finally.", cards: [] };
    expect(applyFix(content, "emojis").body).toBe("Big news — the court agreed – finally.");
    expect(applyFix(content, "dashes").body).toBe("Big news 🎉, the court agreed, finally.");
  });

  it("blocks identity numbers", () => {
    const body = `The claimant (IC 880412-14-5567) appealed.\n\n${clean}`;
    const c = byKey(runRuleChecks({ channel: "linkedin", title: "", body, cards: [] }), "identity");
    expect(c.pass).toBe(false);
    expect(c.blocking).toBe(true);
  });

  it("checks carousel shape", () => {
    const cards = [{ heading: "One", body: "x" }, { heading: "Two", body: "y" }, { heading: "Three", body: "z" }];
    const c = byKey(runRuleChecks({ channel: "instagram", title: "", body: "Caption", cards }), "fit");
    expect(c.pass).toBe(false);
    expect(c.blocking).toBe(false);
    const none = byKey(runRuleChecks({ channel: "instagram", title: "", body: "Caption", cards: [cards[0]] }), "fit");
    expect(none.blocking).toBe(true);
  });

  it("needs a newsletter subject", () => {
    const c = byKey(runRuleChecks({ channel: "newsletter", title: "", body: clean, cards: [] }), "fit");
    expect(c.blocking).toBe(true);
  });
});

describe("openChecks", () => {
  it("keeps blocking checks open even when ticked", () => {
    const checks: Check[] = [
      { key: "a", item: "A", pass: false, note: "", blocking: true },
      { key: "b", item: "B", pass: false, note: "" },
      { key: "c", item: "C", pass: true, note: "" },
    ];
    expect(openChecks(checks, { a: {}, b: {} }).map((c) => c.key)).toEqual(["a"]);
    expect(openChecks(checks, {}).map((c) => c.key)).toEqual(["a", "b"]);
  });
});
