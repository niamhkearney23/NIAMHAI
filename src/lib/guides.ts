export type CalloutKind = "why" | "do" | "dont" | "note" | "warning" | "try-next";

export type GuideBlock =
  | { type: "text"; heading?: string; paragraphs: string[] }
  | { type: "prompt"; label?: string; prompt: string }
  | { type: "callout"; kind: CalloutKind; heading?: string; body: string };

export type Category =
  | "CHATGPT"
  | "CLAUDE"
  | "PROMPTS"
  | "AUTOMATION"
  | "RESEARCH"
  | "WORK"
  | "LIFE"
  | "BUILDING";

export type Difficulty = "EASY" | "MEDIUM" | "ADVANCED";

export type Intent =
  | "save-time"
  | "sort-life"
  | "research"
  | "write-better"
  | "automate"
  | "build"
  | "decide"
  | "unsure";

export type Guide = {
  slug: string;
  title: string;
  outcome: string;
  teaser: string;
  category: Category;
  tools: string[];
  time: string;
  setupTime?: string;
  difficulty: Difficulty;
  intents: Intent[];
  stealLine: string;
  blocks: GuideBlock[];
};

export const guides: Guide[] = [
  {
    slug: "the-five-minute-chatgpt-setup",
    title: "The Five-Minute ChatGPT Setup",
    outcome: "Stop starting from zero in every new chat.",
    teaser:
      "The three settings and one saved-instructions block that make every conversation start already knowing who you are and how you work.",
    category: "CHATGPT",
    tools: ["ChatGPT"],
    time: "3 min read",
    setupTime: "5 min setup",
    difficulty: "EASY",
    intents: ["unsure", "save-time"],
    stealLine: "Steal the exact custom-instructions block",
    blocks: [
      {
        type: "text",
        heading: "The problem with a fresh chat",
        paragraphs: [
          "By default, every new conversation starts from nothing. You explain your job, your tone, your context — again — before you can ask the actual question. Custom instructions fix that once, permanently, for every new chat after.",
        ],
      },
      {
        type: "prompt",
        label: "Custom instructions — what should ChatGPT know about you?",
        prompt:
          "I work as [role]. I mostly use you for [top 2-3 tasks]. Skip the disclaimers and the \"as an AI\" preamble. Give me the direct answer first, reasoning after, only if I ask for it.",
      },
      {
        type: "callout",
        kind: "why",
        body: "It changes the default, not just one answer — every future chat inherits it, which is the entire point of setting it up once.",
      },
      {
        type: "callout",
        kind: "do",
        body: "Keep it to three or four sentences. The longer it is, the more of it gets ignored on any given reply.",
      },
      {
        type: "callout",
        kind: "dont",
        body: "Don't paste your entire job description in. Specific and short beats thorough and long here.",
      },
      {
        type: "text",
        heading: "The second setting worth knowing about",
        paragraphs: [
          "Turn on memory if it's available on your plan. It's the difference between re-explaining a project every session and picking up where you left off. Turn it off for anything you wouldn't want summarized back to you later.",
        ],
      },
      {
        type: "callout",
        kind: "warning",
        body: "Memory persists across chats by default once it's on. Review what it's stored occasionally — it's editable, not just a black box.",
      },
      {
        type: "callout",
        kind: "note",
        body: "This setup takes longer to read about than to actually do. Five minutes, and you never start from zero again.",
      },
    ],
  },
  {
    slug: "the-inbox-triage-prompt",
    title: "The Prompt That Sorts Your Inbox Before You Open It",
    outcome: "Three lists instead of one dread-inducing inbox.",
    teaser:
      "One prompt that turns a messy inbox into three lists: reply now, reply later, ignore — plus the export step that makes it repeatable every morning.",
    category: "WORK",
    tools: ["ChatGPT", "Claude"],
    time: "4 min read",
    setupTime: "2 min setup",
    difficulty: "EASY",
    intents: ["save-time", "sort-life"],
    stealLine: "Steal the sorting prompt",
    blocks: [
      {
        type: "text",
        heading: "What it actually does",
        paragraphs: [
          "You paste in a day or a week of subject lines and senders, and it hands back three short lists instead of one long inbox: reply now, reply later, and safe to archive. No summarizing every email — just a sorting pass so you know where to spend the next ten minutes.",
          "It works because triage is a narrower job than 'read my email.' You're not asking it to understand your business, just to weigh urgency, sender, and whether a reply is actually owed.",
        ],
      },
      {
        type: "prompt",
        label: "The sort",
        prompt:
          "Sort these into three lists: REPLY TODAY (something is blocked on my answer), REPLY THIS WEEK (owed, not urgent), and NO REPLY NEEDED. For each item in the first two lists, write a one-line reason. Don't draft replies yet — just sort.",
      },
      {
        type: "callout",
        kind: "why",
        body: "Sorting and writing are different jobs. Asking for both at once is where it starts guessing tone and gets pushy or generic.",
      },
      {
        type: "callout",
        kind: "do",
        body: "Run it first thing, before you've read anything — that's what keeps you from triaging by scroll-anxiety instead of by the actual list.",
      },
      {
        type: "callout",
        kind: "dont",
        body: "Don't let it draft replies in the same pass. Sort first, come back for drafts on the three or four that actually need one.",
      },
      {
        type: "callout",
        kind: "try-next",
        body: "Once triage is a habit, pair it with the calendar-aware daily brief so mornings start with both lists at once.",
      },
    ],
  },
  {
    slug: "calendar-aware-assistant",
    title: "Give Your Assistant Read Access To Your Calendar",
    outcome: "A morning brief that catches tomorrow's landmines before you do.",
    teaser:
      "The permissions to grant, the boundaries to set, and the daily briefing prompt that checks tomorrow before you do.",
    category: "LIFE",
    tools: ["ChatGPT", "Google Calendar"],
    time: "5 min read",
    setupTime: "10 min setup",
    difficulty: "MEDIUM",
    intents: ["sort-life", "automate"],
    stealLine: "Steal the morning-brief prompt",
    blocks: [
      {
        type: "text",
        heading: "What to actually connect",
        paragraphs: [
          "Read-only calendar access is enough for almost everything worth doing here: a morning brief, conflict checks, and 'do I have room for this' answers. Don't grant write access until you've watched it get the read-only stuff right for a week.",
        ],
      },
      {
        type: "prompt",
        label: "The daily brief",
        prompt:
          "Look at tomorrow. Flag anything back-to-back with no buffer, anything before 9am, and any meeting with no agenda in the description. Tell me what to move.",
      },
      {
        type: "callout",
        kind: "why",
        body: "It replaces the habit of scrolling tomorrow yourself with a pass that actually flags the specific things worth catching.",
      },
      {
        type: "callout",
        kind: "do",
        body: "Run it the night before, not the morning of — you still have time to actually move something.",
      },
      {
        type: "callout",
        kind: "warning",
        body: "Tell it explicitly not to accept, decline, or move anything without asking first, even once write access is on.",
      },
      {
        type: "callout",
        kind: "note",
        body: "A wrong summary is annoying. A wrongly booked meeting is a problem. Keep the two risks in mind separately.",
      },
    ],
  },
  {
    slug: "stop-ai-agreeing-with-you",
    title: "Make It Argue Back",
    outcome: "A model that pressure-tests your decision instead of clapping for it.",
    teaser:
      "A short system prompt that stops AI from rubber-stamping your ideas and makes it push back, cite the weak points, and hold its position.",
    category: "PROMPTS",
    tools: ["ChatGPT", "Claude"],
    time: "3 min read",
    setupTime: "1 min setup",
    difficulty: "EASY",
    intents: ["decide", "write-better"],
    stealLine: "Steal the disagreement prompt",
    blocks: [
      {
        type: "text",
        heading: "The problem with the default",
        paragraphs: [
          "Left alone, most models lean toward agreeing with whatever framing you hand them. That's fine for brainstorming, and useless for decisions — you end up hearing your own idea back with better formatting.",
        ],
      },
      {
        type: "prompt",
        label: "The instruction",
        prompt:
          "Don't agree with me by default. Find the strongest argument against what I just said and lead with that. If you still think I'm right after making that case, say so — but make the case first.",
      },
      {
        type: "callout",
        kind: "why",
        body: "Naming the strongest counter-argument first forces a real objection instead of a hedge like 'consider the risks.'",
      },
      {
        type: "callout",
        kind: "do",
        body: "Push it further if the pushback still feels generic: ask it to name the exact assumption it thinks is shakiest.",
      },
      {
        type: "callout",
        kind: "dont",
        body: "Don't use this on a first brainstorm — it's a decision-pressure tool, not an idea-generation one. Diverge first, argue second.",
      },
      {
        type: "callout",
        kind: "try-next",
        body: "Pair with the five saved prompts below — the decision test asks a related but different question.",
      },
    ],
  },
  {
    slug: "five-prompts-worth-saving",
    title: "Five Prompts I Reuse Every Single Week",
    outcome: "A saved-prompts list short enough that you'll actually remember it.",
    teaser:
      "The short list that actually earns a spot in your saved prompts, from a rewrite pass to a decision-pressure test.",
    category: "PROMPTS",
    tools: ["ChatGPT", "Claude"],
    time: "6 min read",
    difficulty: "EASY",
    intents: ["write-better", "research"],
    stealLine: "Steal all five",
    blocks: [
      {
        type: "text",
        heading: "Why five, not fifty",
        paragraphs: [
          "A saved-prompts folder with forty entries is the same as having none — you won't remember what's in it. These five cover most of what comes up in an ordinary week, and each one earns its place by being reused, not just clever once.",
        ],
      },
      { type: "prompt", label: "The cut pass", prompt: "Cut this by a third without losing the argument. Show me what you removed." },
      { type: "prompt", label: "The decision test", prompt: "What would have to be true for this decision to be wrong?" },
      { type: "prompt", label: "The plain-English pass", prompt: "Rewrite this for someone with no background in the topic, in half the words." },
      { type: "prompt", label: "The gap check", prompt: "What question would a skeptical reader ask that this doesn't answer?" },
      { type: "prompt", label: "The naming pass", prompt: "Give me ten names for this. Rank them. Tell me why the top one wins." },
      {
        type: "callout",
        kind: "do",
        body: "Once a month, cut whatever you haven't used since the last review. Unused prompts are clutter with a bigger vocabulary.",
      },
      {
        type: "callout",
        kind: "note",
        body: "None of these are clever on their own — they're useful because they get reused, which is the actual bar for 'worth saving.'",
      },
    ],
  },
  {
    slug: "the-repeat-work-finder",
    title: "The Skill That Finds The Work You Keep Repeating",
    outcome: "Three tasks worth automating, pulled from your own week.",
    teaser:
      "Feed it a week of your own messages and tasks, and it hands back the three things you do on autopilot and what to automate instead.",
    category: "AUTOMATION",
    tools: ["ChatGPT", "Claude"],
    time: "5 min read",
    setupTime: "5 min setup",
    difficulty: "MEDIUM",
    intents: ["automate", "build"],
    stealLine: "Steal the pattern-finder prompt",
    blocks: [
      {
        type: "text",
        heading: "The setup",
        paragraphs: [
          "Export a week of your sent messages, completed tasks, or calendar titles — whatever record of your actual work you have lying around. Feed the raw list in, unedited.",
        ],
      },
      {
        type: "prompt",
        label: "The pattern check",
        prompt:
          "Look at this list of what I actually did this week. Find the three tasks that show up in some form more than twice. For each, tell me: could this be a template, a saved reply, or a rule instead of something I do from scratch every time?",
      },
      {
        type: "callout",
        kind: "why",
        body: "You're too close to your own week to spot the pattern — that's exactly the kind of noticing this is good at.",
      },
      {
        type: "callout",
        kind: "note",
        body: "It's rarely the big project work — it's the small stuff: the same status update, the same clarifying question, the same file renamed by hand.",
      },
      {
        type: "callout",
        kind: "try-next",
        body: "Once you've got a candidate, see the daily agent guide for what running one actually costs.",
      },
    ],
  },
  {
    slug: "a-daily-agent-that-pays-for-itself",
    title: "The Agent I Run Every Morning",
    outcome: "A three-check morning routine that costs less than a coffee a month.",
    teaser:
      "What it actually checks, what it costs to run, and the one guardrail that keeps it from making a call it shouldn't.",
    category: "AUTOMATION",
    tools: ["ChatGPT", "n8n"],
    time: "5 min read",
    setupTime: "20 min setup",
    difficulty: "ADVANCED",
    intents: ["automate", "build"],
    stealLine: "Steal the guardrail rule",
    blocks: [
      {
        type: "text",
        heading: "What it checks",
        paragraphs: [
          "Every morning it runs through three things: yesterday's numbers against a target, any overnight messages that mention a deadline, and whether anything on today's list depends on something that hasn't shipped yet.",
        ],
      },
      {
        type: "text",
        heading: "What it costs",
        paragraphs: [
          "A handful of API calls against a small, well-scoped prompt, run once a day — a few dollars a month, not a subscription line item.",
        ],
      },
      {
        type: "callout",
        kind: "warning",
        body: "It flags and drafts, it never sends and never spends. Anything that would email someone, post somewhere, or move money gets written up as a suggestion, not executed.",
      },
      {
        type: "callout",
        kind: "why",
        body: "The time it saves is in not having to check three places yourself — not in removing the last look before something goes out.",
      },
      {
        type: "callout",
        kind: "do",
        body: "Start with one check, not three. Add the second only once you trust the first one's output without re-verifying it.",
      },
    ],
  },
];

export function getGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}

export function relatedGuides(slug: string, count = 2) {
  const current = getGuide(slug);
  if (!current) return [];
  return guides
    .filter((g) => g.slug !== slug)
    .map((g) => ({
      guide: g,
      score: g.intents.filter((i) => current.intents.includes(i)).length + (g.category === current.category ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((r) => r.guide);
}

export const categories: Category[] = [
  "CHATGPT",
  "CLAUDE",
  "PROMPTS",
  "AUTOMATION",
  "RESEARCH",
  "WORK",
  "LIFE",
  "BUILDING",
];
