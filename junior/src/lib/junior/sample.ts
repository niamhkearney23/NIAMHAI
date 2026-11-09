import "server-only";
import { z } from "zod";
import { anthropicConfigured, demoDraftsEnabled } from "@/lib/env";
import { runRuleChecks } from "@/lib/guardrails";
import type { Check, Jurisdiction, Profile } from "@/lib/types";
import { DraftError, generate, outputFormat } from "./draft";
import { demoDrafts } from "./demo";
import { lawyerContext, SAMPLE_SYSTEM_PROMPT, sampleSourceMessage } from "./prompt";
import { DraftSetSchema } from "./schema";
import { keyed } from "./to-posts";

// The free sample is one LinkedIn post. It uses the same facts, style and
// publicity rules as the full draft set, and is checked the same two ways.

export const SampleDraftSchema = z.object({
  brief_title: DraftSetSchema.shape.brief_title,
  linkedin: DraftSetSchema.shape.linkedin,
});

const SAMPLE_FORMAT = outputFormat(SampleDraftSchema);

/** What is stored, shown on the page and emailed. */
export interface SampleDraft {
  title: string;
  body: string;
  /** Claude's own checks, then the house rules, each with its result. */
  checks: Check[];
}

export interface SampleResult {
  draft: SampleDraft;
  draftedWith: string;
}

/** Someone with no account has no profile, so give Claude a plain one. */
export function sampleProfile(jurisdiction: Jurisdiction): Profile {
  return {
    id: "sample",
    full_name: "",
    firm: "",
    jurisdiction,
    practice_areas: [],
    voice_samples: [],
    timezone: jurisdiction === "SG" ? "Asia/Singapore" : "Asia/Kuala_Lumpur",
    onboarded_at: null,
    brand_cover: "",
    brand_card: "",
    brand_accent: "",
    newsletter_enabled: false,
    newsletter_from_name: "",
    newsletter_reply_to: "",
    newsletter_footer: "",
    newsletter_slug: null,
  };
}

export function toSampleDraft(title: string, body: string, claudeChecks: Parameters<typeof keyed>[0]): SampleDraft {
  const text = body.trim();
  return {
    title: title.trim().slice(0, 200),
    body: text,
    checks: [...keyed(claudeChecks), ...runRuleChecks({ channel: "linkedin", title: "", body: text, cards: [] })],
  };
}

export async function draftSample(jurisdiction: Jurisdiction, source: string): Promise<SampleResult> {
  const profile = sampleProfile(jurisdiction);

  if (!anthropicConfigured()) {
    if (demoDraftsEnabled()) {
      const demo = demoDrafts(profile, source);
      return { draft: toSampleDraft(demo.brief_title, demo.linkedin.body, demo.linkedin.checks), draftedWith: "demo" };
    }
    throw new DraftError("Free samples are not switched on yet.");
  }

  const { value, draftedWith } = await generate({
    system: SAMPLE_SYSTEM_PROMPT,
    lawyer: lawyerContext(profile),
    user: sampleSourceMessage(source),
    schema: SampleDraftSchema,
    format: SAMPLE_FORMAT,
    maxTokens: 8000,
  });
  return { draft: toSampleDraft(value.brief_title, value.linkedin.body, value.linkedin.checks), draftedWith };
}
