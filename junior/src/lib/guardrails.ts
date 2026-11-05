// House rules: deterministic checks that run on every draft, live in the
// editor and again on the server before approval. They back up Junior's own
// checks, which come from Claude and describe the first draft only.

import { GENERAL_INFO_LINE, NEEDS_GENERAL_INFO_LINE, PLATFORM_LIMITS } from "./channels";
import { findContactDetails, findIdentityNumbers, findPossibleNames } from "./pii";
import type { Card, Channel, Check, FixId, PostContent } from "./types";

export interface RuleInput extends PostContent {
  channel: Channel;
}

function allText({ title, body, cards }: PostContent): string {
  return [title, body, ...cards.flatMap((c) => [c.heading, c.body])].filter(Boolean).join("\n\n");
}

function unique(list: string[]): string[] {
  return [...new Set(list.map((s) => s.trim()).filter(Boolean))];
}

function quoteList(list: string[], max = 3): string {
  const shown = list.slice(0, max).map((s) => `"${s}"`);
  const more = list.length > max ? ` and ${list.length - max} more` : "";
  return shown.join(", ") + more;
}

function findAll(re: RegExp, text: string): string[] {
  return unique([...text.matchAll(re)].map((m) => m[0]));
}

// --- Patterns --------------------------------------------------------------

const PLACEHOLDER = /\[[^\]\n]{1,80}\]/g;

const EMOJI = /(?![©®™])\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|⃣/gu;

// Em dashes, horizontal bars, double hyphens and spaced en dashes.
const DASH = /—|―|\s–\s|\s--\s/g;

// Legal phrases that contain these words are fine: "best interests of the
// child", "leading case", "expert witness", "specialist tribunal".
const CLAIMS = new RegExp(
  [
    String.raw`(?<!\bat\s)\bbest\b(?!\s+(?:interests?|endeavours?|efforts?|practices?|evidence)\b)`,
    String.raw`\bleading\b(?!\s+(?:case|cases|authority|authorities|judgments?|decisions?|questions?)\b)`,
    String.raw`\bspecialists?\b(?!\s+(?:courts?|tribunals?|lists?|divisions?)\b)`,
    String.raw`\bspecialis(?:e|es|ed|ing)\s+in\b`,
    String.raw`\bspecializ(?:e|es|ed|ing)\s+in\b`,
    String.raw`\bexpert(?:s)?\b(?!\s+(?:witness(?:es)?|evidence|reports?|opinions?|testimony|determination)\b)`,
    String.raw`\bexpertise\b`,
    String.raw`\btop(?:-|\s)(?:tier|rated|ranked|lawyers?|firms?|law\s+firms?)\b`,
    String.raw`\b(?:no\.?\s?1|number\s+one|premier|foremost|pre-?eminent|renowned|award-winning|unrivalled|unrivaled|unmatched|unparalleled|finest|first-class|go-to|most\s+experienced)\b`,
  ].join("|"),
  "gi",
);

const COMPARISONS =
  /\b(?:better\s+than|unlike\s+(?:other|most)\s+(?:lawyers|firms|law\s+firms|advocates|solicitors)|other\s+(?:lawyers|firms|law\s+firms)\s+(?:can'?t|cannot|won'?t|don'?t|will\s+not)|more\s+experienced\s+than|cheaper\s+than|than\s+any\s+other|the\s+only\s+(?:firm|lawyer|law\s+firm))\b/gi;

const PROMISES =
  /(?<!\b(?:personal|corporate|bank|banker'?s|performance|letter\s+of|deed\s+of|of)\s)\bguarantee(?:s|d)?\b|\bguaranteeing\b|\b(?:we|you)\s+will\s+win\b|\bwin\s+your\s+case\b|\bassured\s+(?:result|outcome|success)s?\b|\b100\s?%|\bcertain\s+to\s+win\b|\bno\s+win,?\s+no\s+fee\b|\brisk-free\b/gi;

const FEES =
  /\b(?:fees?|discount(?:s|ed)?|free\s+(?:first\s+|initial\s+)?(?:consultation|advice|session)s?|complimentary\s+(?:consultation|session)s?|promo(?:tion|tional)?\s+(?:code|price|rate)s?|special\s+(?:rate|price|offer)s?|(?:low|affordable|competitive|fixed)\s+(?:fees?|rates?|prices?)|pricing)\b|\d+\s?%\s+off\b/gi;

const TESTIMONIALS =
  /\b(?:testimonials?|reviews?\s+from|client\s+reviews?|our\s+clients\s+(?:say|said|love)|five[-\s]star|5[-\s]star|highly\s+recommended|recommend(?:ed)?\s+us)\b|★/gi;

// American spellings with a British form. "-ize" words are handled generally.
const US_TO_UK: Record<string, string> = {
  color: "colour", colors: "colours", favor: "favour", favors: "favours", favorable: "favourable",
  favorite: "favourite", honor: "honour", honors: "honours", labor: "labour", behavior: "behaviour",
  behaviors: "behaviours", neighbor: "neighbour", neighbors: "neighbours", center: "centre",
  centers: "centres", theater: "theatre", defense: "defence", defenses: "defences", offense: "offence",
  offenses: "offences", enroll: "enrol", enrollment: "enrolment", fulfill: "fulfil",
  fulfillment: "fulfilment", traveled: "travelled", traveling: "travelling", canceled: "cancelled",
  canceling: "cancelling", labeled: "labelled", labeling: "labelling", modeling: "modelling",
  counselor: "counsellor", counselors: "counsellors", counseling: "counselling", catalog: "catalogue",
  dialog: "dialogue", aging: "ageing", gray: "grey", skeptical: "sceptical", installment: "instalment",
  installments: "instalments", willful: "wilful", willfully: "wilfully", skillful: "skilful",
  percent: "per cent", afterward: "afterwards", judgement: "judgment", judgements: "judgments",
  analyze: "analyse", analyzed: "analysed", analyzing: "analysing", paralyze: "paralyse",
};

// "-ize" words where "-ise" would be wrong.
const IZE_KEEP = new Set([
  "size", "sizes", "sized", "sizing", "resize", "resized", "downsize", "downsized", "oversize",
  "oversized", "prize", "prizes", "prized", "seize", "seizes", "seized", "seizing", "capsize",
  "capsized", "maize", "baize",
]);

const IZE = /\b[A-Za-z]{2,}iz(?:e|es|ed|ing|ation|ations)\b/g;

function matchCase(original: string, replacement: string): string {
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (original[0] === original[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

function americanSpellings(text: string): { word: string; uk: string }[] {
  const found = new Map<string, string>();
  for (const m of text.matchAll(/\b[A-Za-z]+\b/g)) {
    const uk = US_TO_UK[m[0].toLowerCase()];
    if (uk) found.set(m[0], matchCase(m[0], uk));
  }
  for (const m of text.matchAll(IZE)) {
    if (IZE_KEEP.has(m[0].toLowerCase())) continue;
    found.set(m[0], m[0].replace(/iz(?=(?:e|es|ed|ing|ation|ations)$)/i, (z) => (z[0] === "I" ? "IS" : "is")));
  }
  return [...found].map(([word, uk]) => ({ word, uk }));
}

function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function endsWithGeneralInfoLine(body: string): boolean {
  const paras = paragraphs(body).filter((p) => !/^(#\S+\s*)+$/.test(p));
  const last = paras.at(-1) ?? "";
  return /general information/i.test(last) || /not legal advice/i.test(last);
}

function hashtags(text: string): string[] {
  return text.match(/(^|\s)#[\p{L}\p{N}_]+/gu) ?? [];
}

// --- Rules -----------------------------------------------------------------

function check(key: string, item: string, failures: string | null, passNote: string, extra: Partial<Check> = {}): Check {
  return failures
    ? { key: `rule:${key}`, item, pass: false, note: failures, ...extra }
    : { key: `rule:${key}`, item, pass: true, note: passNote };
}

export function runRuleChecks(input: RuleInput): Check[] {
  const text = allText(input);
  const checks: Check[] = [];

  const placeholders = findAll(PLACEHOLDER, text);
  checks.push(
    check(
      "placeholders",
      "No placeholders left",
      placeholders.length ? `Fill in or remove ${quoteList(placeholders)} before approving.` : null,
      "Every placeholder has been filled in.",
      { blocking: true },
    ),
  );

  const ids = findIdentityNumbers(text);
  checks.push(
    check(
      "identity",
      "No IC or NRIC numbers",
      ids.length ? `Remove ${quoteList(ids)}. Identity numbers never belong in a post.` : null,
      "No identity numbers found.",
      { blocking: true },
    ),
  );

  const names = findPossibleNames(text);
  checks.push(
    check(
      "names",
      "No client names",
      names.length
        ? `Check ${quoteList(names)} does not name or point to a client.`
        : null,
      "No names spotted. Junior can miss names, so read it once more.",
    ),
  );

  const contact = findContactDetails(text);
  checks.push(
    check(
      "contact",
      "No personal contact details",
      contact.length ? `Contains ${quoteList(contact)}. Fine if it is the firm's, not a client's.` : null,
      "No phone numbers or emails.",
    ),
  );

  const claims = findAll(CLAIMS, text);
  checks.push(
    check(
      "claims",
      `No "best", "leading" or "specialist" claims`,
      claims.length ? `Check ${quoteList(claims)} is not a claim about you or the firm.` : null,
      "No superlatives or specialist claims.",
    ),
  );

  const comparisons = findAll(COMPARISONS, text);
  checks.push(
    check(
      "comparisons",
      "No comparisons with other lawyers",
      comparisons.length ? `Remove the comparison: ${quoteList(comparisons)}.` : null,
      "No comparisons with other lawyers or firms.",
    ),
  );

  const promises = findAll(PROMISES, text);
  checks.push(
    check(
      "promises",
      "No promises about outcomes",
      promises.length ? `Check ${quoteList(promises)} does not promise a result.` : null,
      "No outcome promises.",
    ),
  );

  const fees = findAll(FEES, text);
  checks.push(
    check(
      "fees",
      "No fees or discounts",
      fees.length ? `Check ${quoteList(fees)} is not about your fees or an offer.` : null,
      "No fees, discounts or offers.",
    ),
  );

  const testimonials = findAll(TESTIMONIALS, text);
  checks.push(
    check(
      "testimonials",
      "No testimonials",
      testimonials.length ? `Remove ${quoteList(testimonials)}. Testimonials are not allowed.` : null,
      "No testimonials or reviews.",
    ),
  );

  const emojis = findAll(EMOJI, text);
  checks.push(
    check("emojis", "No emojis", emojis.length ? `Remove ${emojis.join(" ")}.` : null, "No emojis.", {
      fix: "emojis",
    }),
  );

  const dashes = text.match(DASH)?.length ?? 0;
  checks.push(
    check(
      "dashes",
      "No em dashes",
      dashes ? `${dashes} dash${dashes > 1 ? "es" : ""} to replace with a comma or full stop.` : null,
      "No em dashes.",
      { fix: "dashes" },
    ),
  );

  const spellings = americanSpellings(text);
  checks.push(
    check(
      "spelling",
      "British spelling",
      spellings.length
        ? `Use ${spellings.slice(0, 3).map((s) => `"${s.uk}" not "${s.word}"`).join(", ")}${spellings.length > 3 ? ` and ${spellings.length - 3} more` : ""}.`
        : null,
      "British spelling throughout.",
      { fix: "spelling" },
    ),
  );

  if (NEEDS_GENERAL_INFO_LINE[input.channel]) {
    checks.push(
      check(
        "general_info",
        "Ends with a general information line",
        endsWithGeneralInfoLine(input.body) ? null : `End with a line such as "${GENERAL_INFO_LINE}"`,
        "Ends with a general information line.",
      ),
    );
  }

  checks.push(fitCheck(input));
  return checks;
}

function fitCheck({ channel, title, body, cards }: RuleInput): Check {
  const hard: string[] = [];
  const soft: string[] = [];
  const L = PLATFORM_LIMITS;

  if (!body.trim()) hard.push(channel === "instagram" ? "Write a caption." : "Write the post.");

  if (channel === "linkedin" && body.length > L.linkedinChars) {
    hard.push(`LinkedIn allows ${L.linkedinChars} characters; this is ${body.length}.`);
  }
  if (channel === "instagram") {
    if (body.length > L.instagramCaptionChars) {
      hard.push(`Instagram captions allow ${L.instagramCaptionChars} characters; this is ${body.length}.`);
    }
    const tags = hashtags(body).length;
    if (tags > L.instagramHashtags) hard.push(`Instagram allows ${L.instagramHashtags} hashtags; this has ${tags}.`);
    if (cards.length < 2) hard.push("A carousel needs at least two cards.");
    else if (cards.length < L.instagramMinCards || cards.length > L.instagramMaxCards) {
      soft.push(`Junior aims for ${L.instagramMinCards} to ${L.instagramMaxCards} cards; this has ${cards.length}.`);
    }
    if (cards.some((c) => !c.heading.trim())) hard.push("Every card needs a heading.");
    const long = cards.findIndex((c: Card) => c.body.length > L.instagramCardChars);
    if (long >= 0) soft.push(`Card ${long + 1} is long for a phone screen. Aim for under ${L.instagramCardChars} characters.`);
  }
  if (channel === "newsletter") {
    if (!title.trim()) hard.push("Add a subject line.");
    if (title.length > L.newsletterSubjectChars) soft.push("The subject line is long and may be cut off in inboxes.");
  }

  const problems = [...hard, ...soft];
  return check("fit", "Fits the platform", problems.length ? problems.join(" ") : null, "Length and format fit the platform.", {
    blocking: hard.length > 0,
  });
}

// --- Fixes -----------------------------------------------------------------

function fixText(text: string, fix: FixId): string {
  switch (fix) {
    case "emojis":
      return text
        .replace(EMOJI, "")
        .replace(/[️‍]|[\u{1F3FB}-\u{1F3FF}]/gu, "")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/[ \t]+$/gm, "");
    case "dashes":
      return text
        .replace(/\s*[—―]\s*/g, ", ")
        .replace(/\s–\s/g, ", ")
        .replace(/\s--\s/g, ", ")
        .replace(/,\s*,/g, ",");
    case "spelling": {
      let out = text;
      for (const { word, uk } of americanSpellings(text)) {
        out = out.replace(new RegExp(String.raw`\b${word}\b`, "g"), uk);
      }
      return out;
    }
  }
}

export function applyFix(content: PostContent, fix: FixId): PostContent {
  return {
    title: fixText(content.title, fix),
    body: fixText(content.body, fix),
    cards: content.cards.map((c) => ({ heading: fixText(c.heading, fix), body: fixText(c.body, fix) })),
  };
}

/** Failed checks that still stand in the way of approval. */
export function openChecks(checks: Check[], acks: Record<string, unknown>): Check[] {
  return checks.filter((c) => !c.pass && (c.blocking || !(c.key in acks)));
}
