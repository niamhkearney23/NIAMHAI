export type StackItem = {
  name: string;
  rating: number | null;
  usage: string;
  hover: string;
  comment: string;
};

export const stack: StackItem[] = [
  {
    name: "ChatGPT",
    rating: 5,
    usage: "Daily.",
    hover: "thinking / planning / everyday brain",
    comment: "The default. Open before I know what I'm about to ask it.",
  },
  {
    name: "Claude",
    rating: 5,
    usage: "Building.",
    hover: "building / long documents",
    comment: "Where anything longer than a chat message actually gets written.",
  },
  {
    name: "Perplexity",
    rating: 4,
    usage: "Research.",
    hover: "research / fact-checking",
    comment: "Good first pass. I still check the sources it hands back.",
  },
  {
    name: "Gemini",
    rating: 3,
    usage: "Sometimes.",
    hover: "when I'm already inside Google",
    comment: "Convenient more than it is good. Convenient wins some days.",
  },
  {
    name: "n8n",
    rating: null,
    usage: "Currently breaking my brain.",
    hover: "automation / workflows / chaos",
    comment: "Powerful. Also the reason I've lost three evenings this month.",
  },
  {
    name: "Zapier",
    rating: 3,
    usage: "Automation.",
    hover: "the automations n8n hasn't broken yet",
    comment: "Boring and reliable, which after n8n is genuinely a compliment.",
  },
];
