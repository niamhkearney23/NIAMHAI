// Spots personal details in pasted text before it leaves the lawyer's hands.
//
// This is pattern matching, not understanding. It catches identity numbers,
// phone numbers and emails reliably, and names only when there is a clue
// (an honorific, "bin" or "a/l", "my client", a company suffix or "X v Y").
// The UI says so: the lawyer still reads the text.

export type PiiKind =
  | "my_ic"
  | "sg_nric"
  | "phone"
  | "email"
  | "name"
  | "company"
  | "case_title";

export interface PiiFinding {
  id: string;
  kind: PiiKind;
  value: string;
  count: number;
  /** Selected for stripping by default. */
  defaultStrip: boolean;
}

export const PII_LABEL: Record<PiiKind, string> = {
  my_ic: "MyKad number",
  sg_nric: "NRIC or FIN",
  phone: "Phone number",
  email: "Email address",
  name: "Possible name",
  company: "Company name",
  case_title: "Case title",
};

const PLACEHOLDER: Record<PiiKind, string> = {
  my_ic: "IC number",
  sg_nric: "NRIC number",
  phone: "Phone number",
  email: "Email",
  name: "Name",
  company: "Company",
  case_title: "Case name",
};

const ORDER: PiiKind[] = ["my_ic", "sg_nric", "phone", "email", "name", "company", "case_title"];

// A capitalised word, including all-caps names used in judgments.
const WORD = String.raw`[A-Z][A-Za-z'’\-]+`;
const CONNECTOR = String.raw`(?:bin|binti|bte|bt|a\/l|a\/p|s\/o|d\/o|BIN|BINTI|BTE|A\/L|A\/P|S\/O|D\/O|@)`;
const HONORIFIC = String.raw`(?:Mr|Mrs|Ms|Miss|Mdm|Madam|Dr|Prof|Encik|En|Cik|Puan|Pn|Tuan|Tn|Dato['’]?\s?Sri|Dato['’]?|Datuk\s?Seri|Datuk|Datin\s?Paduka|Datin|Tan\s?Sri|Puan\s?Sri|Toh\s?Puan|Tun|Haji|Hajjah|Hj)`;

// Words that start a sentence or name a role, not a person.
const STOP = new Set(
  [
    "a", "an", "and", "as", "at", "also", "applying", "but", "by", "cf", "following", "for",
    "from", "here", "if", "in", "of", "on", "per", "see", "so", "that", "the", "then", "there",
    "this", "under", "when", "where", "whether", "while", "with", "accused", "appellant",
    "appellants", "applicant", "applicants", "claimant", "claimants", "client", "court",
    "defendant", "defendants", "employee", "employer", "judge", "justice", "petitioner",
    "plaintiff", "plaintiffs", "respondent", "respondents", "tribunal", "learned", "my", "our",
    "their", "his", "her", "its",
  ].map((w) => w.toLowerCase()),
);

function trimLeadingStopWords(phrase: string): string {
  const words = phrase.split(/\s+/);
  while (words.length && STOP.has(words[0].replace(/[^A-Za-z]/g, "").toLowerCase())) words.shift();
  return words.join(" ");
}

function validMyKadDate(digits: string): boolean {
  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

interface RawMatch {
  kind: PiiKind;
  value: string;
}

function* matches(re: RegExp, text: string) {
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    yield m;
    if (m[0].length === 0) re.lastIndex++;
  }
}

function collect(text: string): RawMatch[] {
  const out: RawMatch[] = [];

  // Identity numbers
  for (const m of matches(/(?<![\w-])\d{6}-\d{2}-\d{4}(?![\w-])/g, text)) {
    if (validMyKadDate(m[0])) out.push({ kind: "my_ic", value: m[0] });
  }
  for (const m of matches(/(?<![\w-])\d{12}(?![\w-])/g, text)) {
    if (validMyKadDate(m[0])) out.push({ kind: "my_ic", value: m[0] });
  }
  for (const m of matches(/(?<![\w])[STFGM]\d{7}[A-Z](?![\w])/gi, text)) {
    out.push({ kind: "sg_nric", value: m[0] });
  }

  // Contact details
  for (const m of matches(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, text)) {
    out.push({ kind: "email", value: m[0] });
  }
  const phonePatterns = [
    // Malaysian mobile: 012-345 6789, +6012 3456789
    /(?<![\w+])(?:\+?60[\s-]?|0)1\d[\s-]?\d{3,4}[\s-]?\d{4}(?![\w])/g,
    // Malaysian landline: 03-2161 1234
    /(?<![\w+])(?:\+?60[\s-]?|0)[3-9][\s-]?\d{3,4}[\s-]?\d{4}(?![\w])/g,
    // Singapore: +65 9123 4567, 6123 4567
    /(?<![\w+])(?:\+65[\s-]?)?[3689]\d{3}[\s-]?\d{4}(?![\w])/g,
  ];
  for (const re of phonePatterns) {
    for (const m of matches(re, text)) out.push({ kind: "phone", value: m[0].trim() });
  }

  // Names with an honorific: Encik Ahmad Faiz, Mdm Tan Siew Lan
  const honorific = new RegExp(
    String.raw`\b${HONORIFIC}\.?\s+${WORD}(?:\s+(?:${CONNECTOR}|${WORD})){0,4}`,
    "g",
  );
  for (const m of matches(honorific, text)) out.push({ kind: "name", value: m[0].trim() });

  // Malay and Indian patronymic names: Ahmad bin Ali, Muthu a/l Rajan
  const patronymic = new RegExp(
    String.raw`\b${WORD}(?:\s+${WORD}){0,3}\s+${CONNECTOR}\s+${WORD}(?:\s+${WORD}){0,3}`,
    "g",
  );
  for (const m of matches(patronymic, text)) {
    const value = trimLeadingStopWords(m[0].trim());
    if (value.split(/\s+/).length >= 3) out.push({ kind: "name", value });
  }

  // "my client, Lim Wei Ming"
  const client = new RegExp(String.raw`\b(?:my|our|the)\s+client,?\s+(${WORD}(?:\s+${WORD}){0,3})`, "gi");
  for (const m of matches(client, text)) {
    const value = trimLeadingStopWords(m[1]);
    if (value && /^[A-Z]/.test(value)) out.push({ kind: "name", value });
  }

  // Companies: Seri Mutiara Holdings Sdn Bhd, Lion Pte Ltd
  const company =
    /\b((?:[A-Z0-9][A-Za-z0-9&'’.\-]*\s+){1,6})(Sdn\.?\s+Bhd\.?|Sdn\.?\s+Berhad|Berhad|Bhd\.?|Pte\.?\s+Ltd\.?|Private\s+Limited|Limited|Ltd\.?|LLP|PLT)(?![A-Za-z])/g;
  for (const m of matches(company, text)) {
    const value = trimLeadingStopWords(m[0].trim());
    if (value.split(/\s+/).length >= 2) out.push({ kind: "company", value });
  }

  // Case titles: Lim Kok Wah v Public Prosecutor
  const part = String.raw`[A-Z][A-Za-z0-9&'’.\-]*(?:\s+(?:[A-Z][A-Za-z0-9&'’.\-]*|${CONNECTOR}|&|and|of)){0,6}`;
  const caseTitle = new RegExp(String.raw`\b(${part})\s+v\.?\s+(${part})`, "g");
  for (const m of matches(caseTitle, text)) {
    const left = trimLeadingStopWords(m[1]);
    if (!left) continue;
    out.push({ kind: "case_title", value: `${left} v ${m[2]}`.replace(/\s+/g, " ").trim() });
  }

  return out;
}

/** Find personal details. Each distinct value is listed once, with a count. */
export function detectPii(text: string): PiiFinding[] {
  const raw = collect(text);
  const byId = new Map<string, PiiFinding>();

  for (const { kind, value } of raw) {
    const clean = value.replace(/[.,;:]+$/, "");
    if (clean.length < 3) continue;
    const id = `${kind}:${clean.toLowerCase()}`;
    if (byId.has(id)) continue;
    // Skip a name that is part of a longer name already found.
    const covered = [...byId.values()].some(
      (f) => f.kind === kind && f.value.toLowerCase().includes(clean.toLowerCase()),
    );
    if (covered) continue;
    // A longer value replaces shorter ones it contains.
    for (const [otherId, f] of byId) {
      if (f.kind === kind && clean.toLowerCase().includes(f.value.toLowerCase())) byId.delete(otherId);
    }
    byId.set(id, {
      id,
      kind,
      value: clean,
      count: countOccurrences(text, clean),
      defaultStrip: kind !== "case_title",
    });
  }

  return [...byId.values()].sort(
    (a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || text.indexOf(a.value) - text.indexOf(b.value),
  );
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countOccurrences(text: string, value: string): number {
  return text.match(new RegExp(escapeRegExp(value), "g"))?.length ?? 0;
}

/**
 * Replace the selected findings with neutral labels such as [Name 1].
 * Longer values go first so "Tan Sri Lim" is not split by "Lim".
 */
export function stripPii(text: string, selected: PiiFinding[]): { text: string; replaced: number } {
  const perKind = new Map<PiiKind, PiiFinding[]>();
  for (const f of selected) perKind.set(f.kind, [...(perKind.get(f.kind) ?? []), f]);

  const labels = new Map<string, string>();
  for (const [kind, list] of perKind) {
    list
      .sort((a, b) => text.indexOf(a.value) - text.indexOf(b.value))
      .forEach((f, i) => {
        labels.set(f.id, list.length > 1 ? `[${PLACEHOLDER[kind]} ${i + 1}]` : `[${PLACEHOLDER[kind]}]`);
      });
  }

  let out = text;
  let replaced = 0;
  for (const f of [...selected].sort((a, b) => b.value.length - a.value.length)) {
    const re = new RegExp(escapeRegExp(f.value), "g");
    out = out.replace(re, () => {
      replaced++;
      return labels.get(f.id)!;
    });
  }
  return { text: out, replaced };
}

/** Identity numbers only. Used by the house rules on finished drafts. */
export function findIdentityNumbers(text: string): string[] {
  return detectPii(text)
    .filter((f) => f.kind === "my_ic" || f.kind === "sg_nric")
    .map((f) => f.value);
}

export function findContactDetails(text: string): string[] {
  return detectPii(text)
    .filter((f) => f.kind === "phone" || f.kind === "email")
    .map((f) => f.value);
}

export function findPossibleNames(text: string): string[] {
  return detectPii(text)
    .filter((f) => f.kind === "name" || f.kind === "company" || f.kind === "case_title")
    .map((f) => f.value);
}
