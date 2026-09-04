import type { Intent } from "@/lib/guides";

export const intents: { key: Intent; label: string }[] = [
  { key: "save-time", label: "Save me time" },
  { key: "sort-life", label: "Sort my life out" },
  { key: "research", label: "Research something" },
  { key: "write-better", label: "Write better" },
  { key: "automate", label: "Automate boring work" },
  { key: "build", label: "Build something" },
  { key: "decide", label: "Make a decision" },
  { key: "unsure", label: "I don't even know yet" },
];
