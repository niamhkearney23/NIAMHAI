import type { Card } from "@/lib/types";

/**
 * A quick look at the carousel in Lawgistics colours, at the 4:5 shape of a
 * 1080 x 1350 Instagram card. Rendered images come later.
 */
export function CarouselPreview({ cards, firm }: { cards: Card[]; firm: string }) {
  if (!cards.length) return null;
  return (
    <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2" aria-label="Carousel preview">
      {cards.map((card, i) => {
        const first = i === 0;
        return (
          <figure
            key={i}
            className={`relative flex aspect-[4/5] w-44 shrink-0 snap-start flex-col justify-between rounded-[3px] border p-4 ${
              first ? "border-navy bg-navy text-cream" : "border-line bg-cream text-navy"
            }`}
          >
            <span className={`font-mono text-[9px] uppercase tracking-[0.12em] ${first ? "text-periwinkle" : "text-steel"}`}>
              {String(i + 1).padStart(2, "0")} / {String(cards.length).padStart(2, "0")}
            </span>
            <div>
              <p className={`font-serif leading-[1.1] ${first ? "text-[22px]" : "text-[17px]"}`}>{card.heading || "Heading"}</p>
              {card.body ? <p className={`mt-2 text-[10.5px] leading-snug ${first ? "text-cream/85" : "text-navy/80"}`}>{card.body}</p> : null}
            </div>
            <figcaption className={`flex items-center justify-between font-mono text-[8.5px] uppercase tracking-[0.1em] ${first ? "text-cream/70" : "text-steel"}`}>
              <span className="truncate">{firm}</span>
              {i < cards.length - 1 ? <span aria-hidden="true">Swipe</span> : null}
            </figcaption>
            {!first ? <span className="absolute inset-x-4 top-9 h-px bg-periwinkle" aria-hidden="true" /> : null}
          </figure>
        );
      })}
    </div>
  );
}
