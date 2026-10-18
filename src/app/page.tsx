import { Hero } from "@/components/sections/hero";
import { GuidesSection } from "@/components/sections/guides-section";
import { WorkWithMe } from "@/components/sections/work-with-me";
import { AIStack } from "@/components/sections/ai-stack";
import { About } from "@/components/sections/about";
import { NewsletterSignup } from "@/components/sections/newsletter-signup";

export default function Home() {
  return (
    <>
      <Hero />
      <GuidesSection />
      <WorkWithMe />
      <AIStack />
      <About />
      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <NewsletterSignup />
      </section>
    </>
  );
}
