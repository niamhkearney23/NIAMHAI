// Development only: stand-in drafts so the review flow can be clicked through
// without an Anthropic key. They reuse sentences from the source and are
// clearly labelled. Production never uses this (see demoDraftsEnabled).

import { GENERAL_INFO_LINE } from "@/lib/channels";
import type { Profile } from "@/lib/types";
import type { DraftSet } from "./schema";

function sentences(source: string): string[] {
  return source
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30 && s.length <= 260 && !/\[[^\]]+\]/.test(s));
}

function words(text: string, n: number): string {
  const list = text.replace(/[^\p{L}\p{N}\s'-]/gu, "").split(/\s+/).filter(Boolean);
  return list.slice(0, n).join(" ");
}

function tag(area: string): string {
  return "#" + area.replace(/\band\b/gi, "").replace(/[^A-Za-z]/g, "");
}

export function demoDrafts(profile: Profile, source: string): DraftSet {
  const s = sentences(source);
  const first = s[0] ?? "[Key point from the source]";
  const second = s[1] ?? "[Second point from the source]";
  const third = s[2] ?? "[What this means for readers]";
  const tags = profile.practice_areas.slice(0, 2).map(tag).join(" ") || "#Law";
  const country = profile.jurisdiction === "SG" ? "Singapore" : "Malaysia";

  const demoCheck = {
    item: "Demo draft",
    pass: false,
    note: "This is a placeholder draft, not written by Claude. Add an Anthropic key for real drafts.",
  };
  const factCheck = { item: "Facts match the source", pass: true, note: "Every sentence is taken from the source." };
  const guardCheck = { item: "Publicity guardrails", pass: true, note: "No claims, comparisons, promises, fees or testimonials." };
  const styleCheck = { item: "Style rules", pass: true, note: "No emojis or em dashes." };
  const infoCheck = { item: "General information line", pass: true, note: "Ends with the general information line." };

  return {
    brief_title: first.split(/\s+/).length > 8 ? `${words(first, 8)}…` : words(first, 8) || "Untitled brief",
    linkedin: {
      body: [
        "[Opening line: why this matters to your readers]",
        first,
        second,
        `What this means in practice: ${third}`,
        `${tags} #${country}`,
        GENERAL_INFO_LINE,
      ].join("\n\n"),
      checks: [demoCheck, factCheck, guardCheck, styleCheck, infoCheck],
    },
    instagram: {
      cards: [
        { heading: words(first, 6) || "What changed", body: "A quick guide in four cards." },
        { heading: "What happened", body: words(first, 30) },
        { heading: "Why it matters", body: words(second, 30) },
        { heading: "The takeaway", body: words(third, 30) },
      ],
      caption: `${words(first, 25)}. Swipe through for the key points. ${tags}`,
      checks: [demoCheck, factCheck, guardCheck, styleCheck],
    },
    facebook: {
      body: [first, `${second} ${third}`, GENERAL_INFO_LINE].join("\n\n"),
      checks: [demoCheck, factCheck, guardCheck, styleCheck, infoCheck],
    },
    newsletter: {
      subject: (words(first, 8) || "This month's update").slice(0, 60),
      body: [
        first,
        "What happened",
        second,
        "What this means in practice",
        third,
        GENERAL_INFO_LINE,
      ].join("\n\n"),
      checks: [demoCheck, factCheck, guardCheck, styleCheck, infoCheck],
    },
  };
}
