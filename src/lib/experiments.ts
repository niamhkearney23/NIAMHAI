export type ExperimentStatus = "TESTING" | "WORKS" | "CHAOTIC BUT YES" | "DIDN'T WORK";

export type Experiment = {
  id: string;
  question: string;
  status: ExperimentStatus;
  note: string;
  guideSlug?: string;
};

export const experiments: Experiment[] = [
  {
    id: "001",
    question: "Can AI actually organise my entire week?",
    status: "TESTING",
    note: "Good at flagging conflicts. Bad at knowing which meetings I'd actually cancel if I were honest.",
  },
  {
    id: "002",
    question: "I gave an AI read-only access to my calendar.",
    status: "WORKS",
    note: "The morning brief alone was worth it. Full write access is still a step too far for me.",
    guideSlug: "calendar-aware-assistant",
  },
  {
    id: "003",
    question: "Can I build software when I'm not a developer?",
    status: "CHAOTIC BUT YES",
    note: "Shipped three small internal tools. Also broke a fourth one in a way I still don't fully understand.",
  },
  {
    id: "004",
    question: "Making an AI argue with me on purpose.",
    status: "WORKS",
    note: "Uncomfortable at first. Now I don't trust a decision I haven't run through it.",
    guideSlug: "stop-ai-agreeing-with-you",
  },
];
