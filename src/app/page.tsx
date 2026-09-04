import { Hero } from "@/components/sections/hero";
import { Marquee } from "@/components/ui/marquee";
import { WhatAreYouTryingToDo } from "@/components/sections/what-are-you-trying-to-do";
import { StealPrompt } from "@/components/sections/steal-prompt";
import { GuidesPreview } from "@/components/sections/guides-preview";
import { AIStack } from "@/components/sections/ai-stack";
import { LabPreview } from "@/components/sections/lab-preview";
import { StartHerePreview } from "@/components/sections/start-here-preview";
import { About } from "@/components/sections/about";
import { NewsletterSignup } from "@/components/sections/newsletter-signup";

const marqueeItems = [
  "TESTED BY NIAMH",
  "REAL PROMPTS",
  "NO FLUFF",
  "REAL WORKFLOWS",
  "AI THAT ACTUALLY HELPS",
];

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee items={marqueeItems} />
      <WhatAreYouTryingToDo />
      <StealPrompt />
      <GuidesPreview />
      <AIStack />
      <LabPreview />
      <StartHerePreview />
      <About />
      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <NewsletterSignup />
      </section>
    </>
  );
}
