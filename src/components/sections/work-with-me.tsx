import { services } from "@/lib/services";
import { demos } from "@/lib/demos";
import { site } from "@/lib/site";
import { SectionHeading } from "@/components/ui/section-heading";
import { DemoCard } from "@/components/sections/demo-card";

export function WorkWithMe() {
  return (
    <section
      id="work-with-me"
      className="border-b border-[var(--color-line)] bg-[var(--color-cream-dim)] px-5 py-16 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            kicker="If you'd rather I just did it"
            title="Work with"
            accentWord="me."
            description="Everything on this site is free to steal. If you want it set up for you specifically, that's a gig, not a guide."
          />
          <a
            href={site.fiverrUrl}
            target="_blank"
            rel="noreferrer"
            className="text-mono inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-xs font-bold uppercase tracking-wide text-[var(--color-cream)] transition-transform duration-150 hover:-translate-y-0.5"
          >
            Hire me on Fiverr →
          </a>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.title}
              className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6"
            >
              <h3 className="text-display text-xl">{service.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink)]/75">
                {service.description}
              </p>
            </div>
          ))}
        </div>

        <div id="demos" className="mt-16 scroll-mt-20 border-t border-[var(--color-line)] pt-12 sm:mt-20">
          <p className="text-mono text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-accent)]">
            Concept demos
          </p>
          <h3 className="text-display mt-3 text-3xl sm:text-4xl">
            Things I&apos;ve built{" "}
            <span className="text-accent-serif text-[1.05em] normal-case">with AI.</span>
          </h3>
          <p className="mt-4 max-w-xl text-base text-[var(--color-ink)]/70 sm:text-lg">
            Not client work. Three small, working examples of what I can make for you: a
            dashboard, an automation and a website. The businesses, people and numbers are made
            up. Open one and click around.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {demos.map((demo, index) => (
              <DemoCard key={demo.slug} demo={demo} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
