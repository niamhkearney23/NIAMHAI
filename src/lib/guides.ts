export type GuideSection = {
  heading: string;
  paragraphs: string[];
  list?: string[];
};

export type Guide = {
  slug: string;
  title: string;
  teaser: string;
  readTime: string;
  sections: GuideSection[];
};

export const guides: Guide[] = [
  {
    slug: "the-inbox-triage-prompt",
    title: "The Prompt That Sorts Your Inbox Before You Open It",
    teaser:
      "One prompt that turns a messy inbox into three lists: reply now, reply later, ignore — plus the export step that makes it repeatable every morning.",
    readTime: "4 min read",
    sections: [
      {
        heading: "What it actually does",
        paragraphs: [
          "You paste in a day or a week of subject lines and senders, and it hands back three short lists instead of one long inbox: reply now, reply later, and safe to archive. No summarizing every email — just a sorting pass so you know where to spend the next ten minutes.",
          "It works because triage is a narrower job than 'read my email.' You're not asking it to understand your business, just to weigh urgency, sender, and whether a reply is actually owed.",
        ],
      },
      {
        heading: "The prompt",
        paragraphs: [
          "Paste this in, then paste your inbox export or a screenshot transcript underneath it:",
        ],
        list: [
          "\"Sort these into three lists: REPLY TODAY (something is blocked on my answer), REPLY THIS WEEK (owed, not urgent), and NO REPLY NEEDED. For each item in the first two lists, write a one-line reason. Don't draft replies yet — just sort.\"",
        ],
      },
      {
        heading: "The setting to leave off",
        paragraphs: [
          "Don't let it draft replies in the same pass. Sorting and writing are different tasks, and asking for both at once is where it starts guessing tone and gets pushy or generic. Sort first, come back for drafts on the three or four that actually need one.",
        ],
      },
    ],
  },
  {
    slug: "calendar-aware-assistant",
    title: "Give Your Assistant Read Access To Your Calendar",
    teaser:
      "The permissions to grant, the boundaries to set, and the daily briefing prompt that checks tomorrow before you do.",
    readTime: "5 min read",
    sections: [
      {
        heading: "What to actually connect",
        paragraphs: [
          "Read-only calendar access is enough for almost everything worth doing here: a morning brief, conflict checks, and 'do I have room for this' answers. Don't grant write access until you've watched it get the read-only stuff right for a week — a wrong summary is annoying, a wrongly booked meeting is a problem.",
        ],
      },
      {
        heading: "The daily brief",
        paragraphs: [
          "Once it can see your calendar, one prompt run each morning replaces the habit of scrolling tomorrow to check for landmines:",
        ],
        list: [
          "\"Look at tomorrow. Flag anything back-to-back with no buffer, anything before 9am, and any meeting with no agenda in the description. Tell me what to move.\"",
        ],
      },
      {
        heading: "The boundary worth setting",
        paragraphs: [
          "Tell it explicitly not to accept, decline, or move anything without asking first, even once write access is on. The brief is where the value is — the actual changes should stay a confirm-first step for a while.",
        ],
      },
    ],
  },
  {
    slug: "stop-ai-agreeing-with-you",
    title: "Make It Argue Back",
    teaser:
      "A short system prompt that stops AI from rubber-stamping your ideas and makes it push back, cite the weak points, and hold its position.",
    readTime: "3 min read",
    sections: [
      {
        heading: "The problem with the default",
        paragraphs: [
          "Left alone, most models lean toward agreeing with whatever framing you hand them. That's fine for brainstorming, and useless for decisions — you end up hearing your own idea back with better formatting.",
        ],
      },
      {
        heading: "The instruction",
        paragraphs: ["Drop this in before you ask for feedback on a real decision:"],
        list: [
          "\"Don't agree with me by default. Find the strongest argument against what I just said and lead with that. If you still think I'm right after making that case, say so — but make the case first.\"",
        ],
      },
      {
        heading: "How to tell it's working",
        paragraphs: [
          "You'll know it's actually engaging, not performing disagreement, when it names a specific downside you hadn't mentioned rather than a generic 'consider the risks' hedge. If every response still ends in agreement, the prompt needs to be more specific about what a real objection looks like — ask it to name the exact assumption it thinks is shakiest.",
        ],
      },
    ],
  },
  {
    slug: "five-prompts-worth-saving",
    title: "Five Prompts I Reuse Every Single Week",
    teaser:
      "The short list that actually earns a spot in your saved prompts, from a rewrite pass to a decision-pressure test.",
    readTime: "6 min read",
    sections: [
      {
        heading: "Why five, not fifty",
        paragraphs: [
          "A saved-prompts folder with forty entries is the same as having none — you won't remember what's in it. These five cover most of what comes up in an ordinary week, and each one earns its place by being reused, not just clever once.",
        ],
      },
      {
        heading: "The five",
        paragraphs: [],
        list: [
          "The cut pass: \"Cut this by a third without losing the argument. Show me what you removed.\"",
          "The decision test: \"What would have to be true for this decision to be wrong?\"",
          "The plain-English pass: \"Rewrite this for someone with no background in the topic, in half the words.\"",
          "The gap check: \"What question would a skeptical reader ask that this doesn't answer?\"",
          "The naming pass: \"Give me ten names for this. Rank them. Tell me why the top one wins.\"",
        ],
      },
      {
        heading: "Keeping the list honest",
        paragraphs: [
          "Once a month, cut whatever you haven't used since the last review. A prompt that sits unused isn't a resource — it's clutter with a bigger vocabulary.",
        ],
      },
    ],
  },
  {
    slug: "the-repeat-work-finder",
    title: "The Skill That Finds The Work You Keep Repeating",
    teaser:
      "Feed it a week of your own messages and tasks, and it hands back the three things you do on autopilot and what to automate instead.",
    readTime: "5 min read",
    sections: [
      {
        heading: "The setup",
        paragraphs: [
          "Export a week of your sent messages, completed tasks, or calendar titles — whatever record of your actual work you have lying around. Feed the raw list in, unedited. The value is in the pattern, and you're not the one who's supposed to spot it; you're too close to it.",
        ],
      },
      {
        heading: "What to ask for",
        paragraphs: [],
        list: [
          "\"Look at this list of what I actually did this week. Find the three tasks that show up in some form more than twice. For each, tell me: could this be a template, a saved reply, or a rule instead of something I do from scratch every time?\"",
        ],
      },
      {
        heading: "What usually turns up",
        paragraphs: [
          "It's rarely the big, obvious project work — it's the small stuff: the same three-sentence status update written fresh each time, the same clarifying question asked in a slightly different way, the same file renamed by hand. None of it looks worth fixing on its own. Stacked over a month, it's the first thing worth automating.",
        ],
      },
    ],
  },
  {
    slug: "a-daily-agent-that-pays-for-itself",
    title: "The Agent I Run Every Morning",
    teaser:
      "What it actually checks, what it costs to run, and the one guardrail that keeps it from making a call it shouldn't.",
    readTime: "5 min read",
    sections: [
      {
        heading: "What it checks",
        paragraphs: [
          "Every morning it runs through three things: yesterday's numbers against a target, any overnight messages that mention a deadline, and whether anything on today's list depends on something that hasn't shipped yet. That's it — three checks, not a general assistant trying to do everything.",
        ],
      },
      {
        heading: "What it costs",
        paragraphs: [
          "It's a handful of API calls against a small, well-scoped prompt, run once a day — a few dollars a month, not a subscription line item. The cost isn't the reason to be careful with it; the guardrail below is.",
        ],
      },
      {
        heading: "The one guardrail",
        paragraphs: [
          "It flags and drafts, it never sends and never spends. Anything that would email someone, post somewhere, or move money gets written up as a suggestion in the morning brief, not executed. The time it saves is in not having to check three places yourself — not in removing the last look before something goes out.",
        ],
      },
    ],
  },
];

export function getGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}
