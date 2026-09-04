import type { Metadata } from "next";
import { About } from "@/components/sections/about";
import { AIStack } from "@/components/sections/ai-stack";
import { NewsletterSignup } from "@/components/sections/newsletter-signup";

export const metadata: Metadata = {
  title: "About",
  description: "I'm not an AI expert. Which is kind of the point.",
};

export default function AboutPage() {
  return (
    <div>
      <About />
      <AIStack />
      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <NewsletterSignup />
      </section>
    </div>
  );
}
