import type { Metadata } from "next";
import { StartHerePreview } from "@/components/sections/start-here-preview";

export const metadata: Metadata = {
  title: "Start here",
  description: "New here? Five steps from a blank ChatGPT tab to actually using AI for real work.",
};

export default function StartHerePage() {
  return (
    <div>
      <StartHerePreview />
    </div>
  );
}
