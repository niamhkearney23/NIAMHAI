export type StealablePrompt = {
  id: string;
  tag: string;
  prompt: string;
  why: string;
  whenNot: string;
  guideSlug: string;
};

export const stealablePrompts: StealablePrompt[] = [
  {
    id: "inbox-triage",
    tag: "INBOX / TRIAGE",
    prompt:
      "Sort these into three lists: REPLY TODAY (something is blocked on my answer), REPLY THIS WEEK (owed, not urgent), and NO REPLY NEEDED. For each item in the first two lists, write a one-line reason. Don't draft replies yet — just sort.",
    why: "Sorting and writing are different jobs — this only asks for one of them, so it doesn't start guessing tone.",
    whenNot: "If your inbox is already under twenty unread, you don't need this — just read it.",
    guideSlug: "the-inbox-triage-prompt",
  },
  {
    id: "argue-back",
    tag: "DECISIONS",
    prompt:
      "Don't agree with me by default. Find the strongest argument against what I just said and lead with that. If you still think I'm right after making that case, say so — but make the case first.",
    why: "Naming the strongest counter-argument first forces a real objection instead of a polite hedge.",
    whenNot: "Skip it on a first brainstorm — it's a pressure test, not an idea generator. Diverge first, argue second.",
    guideSlug: "stop-ai-agreeing-with-you",
  },
  {
    id: "cut-pass",
    tag: "WRITING",
    prompt: "Cut this by a third without losing the argument. Show me what you removed.",
    why: "Seeing exactly what got cut teaches you what was padding, so your next draft has less of it.",
    whenNot: "Don't run it on something already tight — you'll just lose nuance for the sake of a number.",
    guideSlug: "five-prompts-worth-saving",
  },
  {
    id: "repeat-finder",
    tag: "AUTOMATION",
    prompt:
      "Look at this list of what I actually did this week. Find the three tasks that show up in some form more than twice. For each, tell me: could this be a template, a saved reply, or a rule instead of something I do from scratch every time?",
    why: "You're too close to your own week to spot the pattern yourself — that's exactly what this is good at.",
    whenNot: "Needs a real week of raw data to work on. A vague summary of your job won't surface anything useful.",
    guideSlug: "the-repeat-work-finder",
  },
  {
    id: "calendar-brief",
    tag: "LIFE",
    prompt:
      "Look at tomorrow. Flag anything back-to-back with no buffer, anything before 9am, and any meeting with no agenda in the description. Tell me what to move.",
    why: "It catches the specific, boring landmines — no buffer, no agenda — instead of a vague 'busy day ahead.'",
    whenNot: "Only useful once it can actually see your calendar. Read-only access first.",
    guideSlug: "calendar-aware-assistant",
  },
];
