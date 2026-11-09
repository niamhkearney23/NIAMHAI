import { siteUrl } from "@/lib/env";
import type { SampleDraft } from "@/lib/junior/sample";
import type { Check } from "@/lib/types";

// The two emails of the free sample. Plain, short, no tracking.

export interface Mail {
  subject: string;
  text: string;
  html: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const FONT = "font-family:Helvetica,Arial,sans-serif;color:#171B28";
const p = (html: string, extra = "") => `<p style="${FONT};font-size:16px;line-height:1.5;${extra}">${html}</p>`;

export function linkEmail(link: string): Mail {
  return {
    subject: "Confirm your free draft from Junior",
    text: `You asked Junior for a free draft. Open this link and press the button to get it:\n\n${link}\n\nThe link works for three days. If you did not ask for this, ignore this email and nothing will happen.\n\nJunior by Lawgistics`,
    html:
      p("You asked Junior for a free draft. Open this link and press the button to get it.") +
      p(`<a href="${esc(link)}" style="${FONT}">Get my free draft</a>`) +
      p("The link works for three days. If you did not ask for this, ignore this email and nothing will happen.", "font-size:13px;color:#555"),
  };
}

export function alreadyEmail(): Mail {
  const link = `${siteUrl()}/login`;
  return {
    subject: "You have already had your free draft from Junior",
    text: `The free draft is one per person, and this email address has already had its draft. To write more, sign up here:\n\n${link}\n\nJunior by Lawgistics`,
    html:
      p("The free draft is one per person, and this email address has already had its draft.") +
      p(`To write more, <a href="${esc(link)}" style="${FONT}">sign up here</a>.`),
  };
}

function checkLines(checks: Check[]): Check[] {
  return [...checks.filter((c) => !c.pass), ...checks.filter((c) => c.pass)];
}

export function draftEmail(draft: SampleDraft): Mail {
  const link = `${siteUrl()}/login`;
  const checks = checkLines(draft.checks);
  const text = [
    "Here is the LinkedIn post Junior wrote from the text you sent.",
    "",
    draft.body,
    "",
    "What Junior checked:",
    ...checks.map((c) => `- ${c.pass ? "Passed" : "Look closely"}: ${c.item}. ${c.note}`),
    "",
    "This is a first draft. Check every fact against your source before you use it.",
    "",
    `To edit, approve and schedule posts like this, sign up with this email address: ${link}`,
    "",
    "Junior by Lawgistics",
  ].join("\n");

  const html =
    p("Here is the LinkedIn post Junior wrote from the text you sent.") +
    `<div style="${FONT};font-size:16px;line-height:1.55;border:1px solid #d9d4c7;padding:16px;margin:0 0 16px">${draft.body
      .split(/\n{2,}/)
      .map((para) => `<p style="margin:0 0 12px">${esc(para).replace(/\n/g, "<br>")}</p>`)
      .join("")}</div>` +
    p("<strong>What Junior checked</strong>", "margin-bottom:4px") +
    `<ul style="${FONT};font-size:15px;line-height:1.5;margin:0 0 16px;padding-left:20px">${checks
      .map((c) => `<li><strong>${c.pass ? "Passed" : "Look closely"}:</strong> ${esc(c.item)}. ${esc(c.note)}</li>`)
      .join("")}</ul>` +
    p("This is a first draft. Check every fact against your source before you use it.") +
    p(`To edit, approve and schedule posts like this, <a href="${esc(link)}" style="${FONT}">sign up with this email address</a>.`);

  return { subject: "Your free LinkedIn draft from Junior", text, html };
}
