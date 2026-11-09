// Turning a received email into the text a lawyer would have pasted into Junior,
// and deciding whether to trust it. Pure functions, no network.

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…",
};

/** Plain text from an HTML email body. Enough for prose, not a browser. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote|table)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (entity[0] === "#") {
        const code = entity[1].toLowerCase() === "x" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match;
      }
      return ENTITIES[entity.toLowerCase()] ?? match;
    });
}

const HEADER_LINE = /^(from|to|cc|bcc|date|sent|subject|reply-to):\s/i;
const FORWARD_MARKER = /^\s*(-{2,}\s*(forwarded message|original message)\s*-{2,}|begin forwarded message:?|_{8,})\s*$/i;
const DEVICE_FOOTER = /^\s*(sent from my .+|get outlook for .+|sent from (outlook|mail|yahoo mail|proton mail).*)\s*$/i;

/**
 * Remove what a forward adds around the real text: the "Forwarded message"
 * banner and its From/Date/Subject block, quote arrows, the signature after
 * "-- " and "Sent from my iPhone" footers.
 */
export function cleanEmailText(raw: string): string {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n").map((line) => line.replace(/^(\s*>\s?)+/, "").replace(/[ \t]+$/, ""));

  const kept: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (FORWARD_MARKER.test(line)) continue;

    // A block of From/To/Date/Subject lines is the forward's own header.
    if (HEADER_LINE.test(line)) {
      let end = i;
      const kinds = new Set<string>();
      while (end < lines.length && (HEADER_LINE.test(lines[end]) || (end > i && /^\s+\S/.test(lines[end])))) {
        const kind = lines[end].match(HEADER_LINE)?.[1]?.toLowerCase();
        if (kind) kinds.add(kind);
        end++;
      }
      if (kinds.has("from") && (kinds.has("subject") || kinds.has("sent") || kinds.has("date"))) {
        i = end - 1;
        if (lines[end]?.trim() === "") i = end; // and the blank line after it
        continue;
      }
    }
    if (DEVICE_FOOTER.test(line)) continue;

    // The signature starts at "-- " on its own line, once there is real text above it.
    if (/^--\s?$/.test(line) && kept.join("\n").trim().length >= 40) break;
    kept.push(line);
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** "Anna Tan <Anna@Example.com>" and "anna@example.com" both give "anna@example.com". */
export function bareAddress(value: string): string {
  const inBrackets = value.match(/<([^>]+)>/)?.[1];
  return (inBrackets ?? value).trim().toLowerCase();
}

export function domainOf(address: string): string {
  return bareAddress(address).split("@")[1] ?? "";
}

/** Out-of-office replies, bounces and mailing lists. Never answered, never drafted from. */
export function isAutoReply(headers: Record<string, string> | null | undefined): boolean {
  const h = Object.fromEntries(Object.entries(headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v).toLowerCase()]));
  if (h["auto-submitted"] && h["auto-submitted"] !== "no") return true;
  if (/^(bulk|junk|list|auto_reply)/.test(h["precedence"] ?? "")) return true;
  return "x-autoreply" in h || "x-autorespond" in h;
}

export interface ReceivingAuth {
  spf?: string;
  dkim?: string;
  dmarc?: string;
}

/**
 * Resend's receiving server checks the sender and reports it; the sender cannot
 * forge this. DKIM "pass" means the message was signed by the From domain, and
 * DMARC "pass" means SPF or DKIM lined up with it. SPF alone proves nothing
 * about the From address, so it is not enough.
 */
export function isAuthenticated(auth: ReceivingAuth | null | undefined): boolean {
  return auth?.dmarc === "pass" || auth?.dkim === "pass";
}

export interface AttachmentInfo {
  id: string;
  filename: string;
  content_type: string;
  size?: number;
}

export function isPdf(a: Pick<AttachmentInfo, "filename" | "content_type">): boolean {
  return a.content_type.toLowerCase() === "application/pdf" || /\.pdf$/i.test(a.filename);
}
