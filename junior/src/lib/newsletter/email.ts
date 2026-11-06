import { brandColours, type Brand } from "@/lib/brand";

// Turns a newsletter draft (plain text, headings on their own lines) into an
// email: HTML with inline styles that survive email clients, and plain text.

export interface NewsletterEmail {
  subject: string;
  body: string;
  firm: string;
  footer: string;
  brand: Brand;
  unsubscribeUrl: string;
}

type Block = { kind: "heading" | "paragraph"; text: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A short single line with no closing punctuation reads as a heading. */
export function toBlocks(body: string): Block[] {
  return body
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((text) =>
      !text.includes("\n") && text.length <= 70 && !/[.!?:;,]$/.test(text)
        ? { kind: "heading" as const, text }
        : { kind: "paragraph" as const, text },
    );
}

export function renderNewsletter(e: NewsletterEmail): { html: string; text: string } {
  const c = brandColours(e.brand);
  const serif = "Georgia, 'Times New Roman', serif";
  const sans = "Helvetica, Arial, sans-serif";
  const blocks = toBlocks(e.body)
    .map((b) =>
      b.kind === "heading"
        ? `<h2 style="margin:28px 0 8px;font-family:${serif};font-size:20px;line-height:1.3;font-weight:normal;color:${c.cardInk}">${esc(b.text)}</h2>`
        : `<p style="margin:0 0 16px;font-family:${sans};font-size:16px;line-height:1.6;color:${c.cardInk}">${esc(b.text).replace(/\n/g, "<br>")}</p>`,
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(e.subject)}</title></head>
<body style="margin:0;padding:0;background:${c.card}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.card}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="background:${c.cover};padding:22px 28px;font-family:${serif};font-size:20px;color:${c.coverInk}">${esc(e.firm)}</td></tr>
<tr><td style="height:3px;background:${c.accent};font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 20px;font-family:${serif};font-size:28px;line-height:1.2;font-weight:normal;color:${c.cardInk}">${esc(e.subject)}</h1>
${blocks}
</td></tr>
<tr><td style="padding:20px 28px 8px;border-top:1px solid ${c.accent};font-family:${sans};font-size:12px;line-height:1.6;color:${c.cardInk}">
${e.footer ? `<p style="margin:0 0 8px">${esc(e.footer).replace(/\n/g, "<br>")}</p>` : ""}
<p style="margin:0 0 8px">You are getting this because you asked for updates from ${esc(e.firm)}.</p>
<p style="margin:0"><a href="${esc(e.unsubscribeUrl)}" style="color:${c.cardInk}">Unsubscribe</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`;

  const text = [
    e.firm,
    "",
    e.subject,
    "",
    ...toBlocks(e.body).flatMap((b) => (b.kind === "heading" ? [b.text.toUpperCase(), ""] : [b.text, ""])),
    "--",
    e.footer,
    `You are getting this because you asked for updates from ${e.firm}.`,
    `Unsubscribe: ${e.unsubscribeUrl}`,
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n");

  return { html, text };
}
