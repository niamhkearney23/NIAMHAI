import { siteUrl } from "@/lib/env";
import type { Mail } from "@/lib/sample-email";

// What Junior writes back to a lawyer who emailed it. Only ever sent to the
// address of a signed-in lawyer, never to an unknown sender.

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const FONT = "font-family:Helvetica,Arial,sans-serif;color:#171B28";
const p = (html: string, extra = "") => `<p style="${FONT};font-size:16px;line-height:1.5;${extra}">${html}</p>`;

export function draftedMail({ briefId, title, redactions }: { briefId: string; title: string; redactions: number }): Mail {
  const link = `${siteUrl()}/briefs/${briefId}`;
  const removed = redactions
    ? `Junior removed ${redactions} personal detail${redactions === 1 ? "" : "s"} (such as names, IC numbers or phone numbers) before drafting. Read each post once more.`
    : "";
  return {
    subject: "Junior has drafted your posts",
    text: [
      `Junior drafted a LinkedIn post, an Instagram carousel, a Facebook post and a newsletter piece from your email${title ? `: ${title}` : ""}.`,
      "",
      `Review them here: ${link}`,
      "",
      removed,
      "Nothing is posted until you approve it.",
      "",
      "Junior by Lawgistics",
    ]
      .filter((line, i, all) => line !== "" || all[i - 1] !== "")
      .join("\n"),
    html:
      p(`Junior drafted a LinkedIn post, an Instagram carousel, a Facebook post and a newsletter piece from your email${title ? `: ${esc(title)}` : ""}.`) +
      p(`<a href="${esc(link)}" style="${FONT}">Review them in Junior</a>`) +
      (removed ? p(esc(removed)) : "") +
      p("Nothing is posted until you approve it.", "font-size:13px;color:#555"),
  };
}

export function couldNotUseMail(reason: string): Mail {
  return {
    subject: "Junior could not use your email",
    text: `${reason}\n\nJunior by Lawgistics`,
    html: p(esc(reason)),
  };
}
