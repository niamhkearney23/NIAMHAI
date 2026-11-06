import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { anthropicApiKey, anthropicBaseUrl, anthropicConfigured, demoDraftsEnabled } from "@/lib/env";
import type { Profile, SourceKind } from "@/lib/types";
import { demoDrafts } from "./demo";
import { lawyerContext, SYSTEM_PROMPT, sourceMessage } from "./prompt";
import { DraftSetSchema, type DraftSet } from "./schema";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const EFFORT = (process.env.ANTHROPIC_EFFORT || "medium") as "low" | "medium" | "high" | "xhigh" | "max";

/** A failure the lawyer can act on. The message is shown as is. */
export class DraftError extends Error {}

// The SDK builds a strict JSON schema from the Zod schema. We send it as a
// plain format and validate the reply ourselves, after checking why Claude
// stopped: the SDK's auto-parse would throw on a refusal before we could tell
// the lawyer what happened.
const { type: formatType, schema: formatSchema } = betaZodOutputFormat(DraftSetSchema);
const OUTPUT_FORMAT = { type: formatType, schema: formatSchema };

function parseDrafts(text: string): DraftSet | null {
  try {
    const result = DraftSetSchema.safeParse(JSON.parse(text));
    if (!result.success) console.error("Drafts failed validation", result.error.issues.slice(0, 5));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export interface DraftResult {
  drafts: DraftSet;
  draftedWith: string;
}

export async function draftPosts(profile: Profile, kind: SourceKind, source: string): Promise<DraftResult> {
  if (!anthropicConfigured()) {
    if (demoDraftsEnabled()) return { drafts: demoDrafts(profile, source), draftedWith: "demo" };
    throw new DraftError("Drafting is not set up yet. Add an Anthropic API key to the server settings.");
  }

  // Explicit key and URL: never pick up credentials or a base URL meant for
  // another tool from the environment.
  const client = new Anthropic({ apiKey: anthropicApiKey(), authToken: null, baseURL: anthropicBaseUrl() });

  try {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      // If a safety classifier declines, retry on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: EFFORT, format: OUTPUT_FORMAT },
      system: [
        { type: "text", text: SYSTEM_PROMPT },
        { type: "text", text: lawyerContext(profile), cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: sourceMessage(kind, source) }],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      throw new DraftError("Junior could not draft from this source. Try trimming it to the parts you want to write about.");
    }
    if (message.stop_reason === "max_tokens") {
      throw new DraftError("Junior ran out of room. Try a shorter source.");
    }
    const text = message.content.map((block) => (block.type === "text" ? block.text : "")).join("");
    const drafts = parseDrafts(text);
    if (!drafts) {
      throw new DraftError("Junior's drafts came back in the wrong shape. Please try again.");
    }
    return { drafts, draftedWith: message.model };
  } catch (error) {
    if (error instanceof DraftError) throw error;
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      throw new DraftError("Junior's Anthropic API key was rejected. Check the server settings.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new DraftError("Junior is handling a lot right now. Try again in a minute.");
    }
    if (error instanceof Anthropic.BadRequestError) {
      console.error("Anthropic rejected the drafting request", error.message);
      throw new DraftError("Junior could not read this source. Try a shorter extract.");
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new DraftError("Junior could not reach Claude. Check the connection and try again.");
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic error", error.status, error.message);
      throw new DraftError("Claude is busy at the moment. Try again shortly.");
    }
    console.error("Drafting failed", error);
    throw new DraftError("Junior's drafts came back in the wrong shape. Please try again.");
  }
}
