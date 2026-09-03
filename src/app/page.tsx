import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { GuidesGrid } from "@/components/sections/guides-grid";

export default function Home() {
  return (
    <>
      <Hero />
      <About />
      <GuidesGrid />
    </>
  );
}
