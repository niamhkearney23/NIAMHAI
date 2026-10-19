export type Demo = {
  slug: string;
  kind: string;
  title: string;
  description: string;
  /** The working demo: a static page in public/demos/. */
  href: string;
  /** A short, silent screen recording of the demo being used, sped up 2x. */
  preview: {
    /** VP9: Chrome, Firefox, Edge, and Chromium builds without H.264. */
    webm: string;
    /** H.264: Safari and anything that can't play the WebM. */
    mp4: string;
    /** First frame of the video, shown until it plays. */
    poster: string;
  };
};

// Concept demos, not client work. The pages live in public/demos/ and are
// copied from niamhkearney23/cloak (demos/). Every business, person and number
// in them is invented, and each page says so.
export const demos: Demo[] = [
  {
    slug: "legal-dashboard",
    kind: "Dashboard",
    title: "A law firm dashboard",
    description:
      "Open a matter, see what's due and when, and hand a task to someone on the team.",
    href: "/demos/legal-dashboard/index.html",
    preview: {
      webm: "/demos/previews/legal-dashboard.webm",
      mp4: "/demos/previews/legal-dashboard.mp4",
      poster: "/demos/previews/legal-dashboard.jpg",
    },
  },
  {
    slug: "marketing-automation",
    kind: "Automation",
    title: "A follow-up automation",
    description:
      "Someone fills in the contact form. The welcome email, the team alert and the follow-up happen on their own.",
    href: "/demos/marketing-automation/index.html",
    preview: {
      webm: "/demos/previews/marketing-automation.webm",
      mp4: "/demos/previews/marketing-automation.mp4",
      poster: "/demos/previews/marketing-automation.jpg",
    },
  },
  {
    slug: "booking-site",
    kind: "Website",
    title: "A booking website",
    description:
      "For a small massage studio. Pick a treatment, pick a time, get a confirmation.",
    href: "/demos/booking-site/index.html",
    preview: {
      webm: "/demos/previews/booking-site.webm",
      mp4: "/demos/previews/booking-site.mp4",
      poster: "/demos/previews/booking-site.jpg",
    },
  },
];
