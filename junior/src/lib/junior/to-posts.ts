import { runRuleChecks } from "@/lib/guardrails";
import type { Card, Channel, Check } from "@/lib/types";
import type { DraftSet, JuniorCheck } from "./schema";

export interface NewPost {
  brief_id: string;
  channel: Channel;
  title: string;
  body: string;
  cards: Card[];
  checks: Check[];
  rule_checks: Check[];
}

export function keyed(checks: JuniorCheck[]): Check[] {
  return checks.map((c, i) => ({ key: `junior:${i}`, item: c.item.trim(), pass: c.pass, note: c.note.trim() }));
}

/** Turn Claude's draft set into one row per channel, with house rules applied. */
export function draftsToPosts(briefId: string, drafts: DraftSet): NewPost[] {
  const rows: Omit<NewPost, "rule_checks">[] = [
    { brief_id: briefId, channel: "linkedin", title: "", body: drafts.linkedin.body.trim(), cards: [], checks: keyed(drafts.linkedin.checks) },
    {
      brief_id: briefId,
      channel: "instagram",
      title: "",
      body: drafts.instagram.caption.trim(),
      cards: drafts.instagram.cards.map((c) => ({ heading: c.heading.trim(), body: c.body.trim() })),
      checks: keyed(drafts.instagram.checks),
    },
    { brief_id: briefId, channel: "facebook", title: "", body: drafts.facebook.body.trim(), cards: [], checks: keyed(drafts.facebook.checks) },
    {
      brief_id: briefId,
      channel: "newsletter",
      title: drafts.newsletter.subject.trim(),
      body: drafts.newsletter.body.trim(),
      cards: [],
      checks: keyed(drafts.newsletter.checks),
    },
  ];
  return rows.map((row) => ({ ...row, rule_checks: runRuleChecks(row) }));
}
