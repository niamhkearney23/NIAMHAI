import { z } from "zod";

export const JuniorCheckSchema = z.object({
  item: z.string().describe("What was checked, in a few words."),
  pass: z.boolean().describe("False when the lawyer should look closely before approving."),
  note: z.string().describe("One plain sentence explaining the result."),
});

const checks = z
  .array(JuniorCheckSchema)
  .min(4)
  .max(6)
  .describe("Between 4 and 6 checks on this draft.");

export const DraftSetSchema = z.object({
  brief_title: z
    .string()
    .describe("A neutral label for the lawyer's queue, at most 8 words, with no client names."),
  linkedin: z.object({
    body: z.string().describe("The full LinkedIn post, paragraphs separated by blank lines."),
    checks,
  }),
  instagram: z.object({
    cards: z
      .array(
        z.object({
          heading: z.string().describe("Card heading, at most 8 words."),
          body: z.string().describe("Card text, at most 30 words."),
        }),
      )
      .min(4)
      .max(6)
      .describe("Between 4 and 6 carousel cards."),
    caption: z.string().describe("The Instagram caption, ending with up to five hashtags."),
    checks,
  }),
  facebook: z.object({
    body: z.string().describe("The full Facebook post."),
    checks,
  }),
  newsletter: z.object({
    subject: z.string().describe("Subject line, at most 60 characters."),
    body: z.string().describe("The newsletter piece as plain text, headings on their own lines."),
    checks,
  }),
});

export type DraftSet = z.infer<typeof DraftSetSchema>;
export type JuniorCheck = z.infer<typeof JuniorCheckSchema>;
