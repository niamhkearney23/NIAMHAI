export type StartHereStep = {
  n: number;
  title: string;
  slug: string;
};

export const startHereSteps: StartHereStep[] = [
  { n: 1, title: "Set ChatGPT up properly", slug: "the-five-minute-chatgpt-setup" },
  { n: 2, title: "Give it context", slug: "calendar-aware-assistant" },
  { n: 3, title: "Make it challenge you", slug: "stop-ai-agreeing-with-you" },
  { n: 4, title: "Connect your actual work", slug: "the-inbox-triage-prompt" },
  { n: 5, title: "Automate one boring thing", slug: "a-daily-agent-that-pays-for-itself" },
];
