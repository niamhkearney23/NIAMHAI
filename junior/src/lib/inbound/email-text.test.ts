import { describe, expect, it } from "vitest";
import { bareAddress, cleanEmailText, domainOf, htmlToText, isAuthenticated, isAutoReply, isPdf } from "./email-text";

describe("htmlToText", () => {
  it("keeps paragraphs, decodes entities and drops scripts and styles", () => {
    const text = htmlToText(
      "<style>p{color:red}</style><p>The Court held that O&apos;Brien&#39;s claim &amp; the appeal&nbsp;failed.</p><p>Second&#x20;point<br>on a new line</p><script>alert(1)</script>",
    );
    expect(text).toContain("The Court held that O'Brien's claim & the appeal failed.");
    expect(text).toContain("Second point\non a new line");
    expect(text).not.toMatch(/alert|color:red/);
  });

  it("leaves an entity it does not know alone", () => {
    expect(htmlToText("a &madeup; b &#0; c")).toBe("a &madeup; b &#0; c");
  });
});

describe("cleanEmailText", () => {
  it("removes Gmail's forwarded-message banner and header block", () => {
    const text = cleanEmailText(
      [
        "Worth a post?",
        "",
        "---------- Forwarded message ---------",
        "From: Registry <registry@court.example>",
        "Date: Mon, 3 Mar 2026 at 09:00",
        "Subject: Judgment",
        "To: Anna <anna@example.com>",
        "",
        "The Industrial Court held that an employee on probation is still protected.",
      ].join("\n"),
    );
    expect(text).toBe("Worth a post?\n\nThe Industrial Court held that an employee on probation is still protected.");
  });

  it("removes Outlook's header block, quote arrows, the signature and phone footers", () => {
    const text = cleanEmailText(
      [
        "________________________________",
        "From: Registry",
        "Sent: 3 March 2026 09:00",
        "To: Anna",
        "Subject: Judgment",
        "",
        "> > The employer gave no written assessment of the employee.",
        "> It ordered reinstatement with back wages and costs of the hearing.",
        "",
        "Sent from my iPhone",
        "-- ",
        "Anna Tan, Partner",
        "+60 12 345 6789",
      ].join("\n"),
    );
    expect(text).toBe("The employer gave no written assessment of the employee.\nIt ordered reinstatement with back wages and costs of the hearing.");
  });

  it("does not mistake a judgment's own header lines for a forward", () => {
    const text = cleanEmailText("Date: 3 March 2026\nThe appeal is dismissed with costs.\nSubject: to the following conditions the order stands.");
    expect(text).toContain("Date: 3 March 2026");
    expect(text).toContain("Subject: to the following conditions");
  });

  it("keeps a dash line when there is no text above it yet", () => {
    expect(cleanEmailText("--\nShort")).toContain("Short");
  });
});

describe("addresses", () => {
  it("reduces a sender to the bare, lower-case address", () => {
    expect(bareAddress("Anna Tan <Anna.Tan@Example.COM>")).toBe("anna.tan@example.com");
    expect(bareAddress(" anna@example.com ")).toBe("anna@example.com");
    expect(domainOf("Anna <a@Mail.Example.com>")).toBe("mail.example.com");
  });
});

describe("isAutoReply", () => {
  it("catches out-of-office replies, bulk mail and bounces, whatever the header case", () => {
    expect(isAutoReply({ "Auto-Submitted": "auto-replied" })).toBe(true);
    expect(isAutoReply({ precedence: "bulk" })).toBe(true);
    expect(isAutoReply({ "X-Autoreply": "yes" })).toBe(true);
  });
  it("lets ordinary mail through", () => {
    expect(isAutoReply({ "auto-submitted": "no", from: "a@b.c" })).toBe(false);
    expect(isAutoReply(null)).toBe(false);
  });
});

describe("isAuthenticated", () => {
  it("trusts a From address that is signed or aligned", () => {
    expect(isAuthenticated({ spf: "pass", dkim: "pass", dmarc: "pass" })).toBe(true);
    expect(isAuthenticated({ spf: "fail", dkim: "pass", dmarc: "gray" })).toBe(true);
    expect(isAuthenticated({ spf: "gray", dkim: "gray", dmarc: "pass" })).toBe(true);
  });
  it("does not trust SPF alone, or a missing result", () => {
    expect(isAuthenticated({ spf: "pass", dkim: "gray", dmarc: "gray" })).toBe(false);
    expect(isAuthenticated({ spf: "pass", dkim: "fail", dmarc: "fail" })).toBe(false);
    expect(isAuthenticated(null)).toBe(false);
    expect(isAuthenticated(undefined)).toBe(false);
  });
});

describe("isPdf", () => {
  it("goes by type or by name", () => {
    expect(isPdf({ filename: "Judgment.PDF", content_type: "application/octet-stream" })).toBe(true);
    expect(isPdf({ filename: "scan", content_type: "application/pdf" })).toBe(true);
    expect(isPdf({ filename: "notes.docx", content_type: "application/vnd.openxmlformats" })).toBe(false);
  });
});
