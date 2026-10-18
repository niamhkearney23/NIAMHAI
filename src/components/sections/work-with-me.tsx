import { services } from "@/lib/services";
import { site } from "@/lib/site";
import { SectionHeading } from "@/components/ui/section-heading";

export function WorkWithMe() {
  return (
    <section
      id="work-with-me"
      className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-5 py-16 sm:px-8 sm:py-24"
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
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Hire me on Fiverr →
          </a>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.title}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-6"
            >
              <h3 className="text-lg font-semibold tracking-tight">{service.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
