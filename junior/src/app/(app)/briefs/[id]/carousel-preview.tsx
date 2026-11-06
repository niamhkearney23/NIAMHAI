import { brandColours, type Brand } from "@/lib/brand";
import type { Card } from "@/lib/types";

/**
 * A live look at the carousel in the lawyer's colours, at the 4:5 shape of a
 * 1080 x 1350 Instagram card. The published images use the same layout.
 */
export function CarouselPreview({ cards, firm, brand }: { cards: Card[]; firm: string; brand: Brand }) {
  if (!cards.length) return null;
  const c = brandColours(brand);
  return (
    <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2" aria-label="Carousel preview">
      {cards.map((card, i) => {
        const first = i === 0;
        return (
          <figure
            key={i}
            className="relative flex aspect-[4/5] w-44 shrink-0 snap-start flex-col justify-between rounded-[3px] border border-line p-4"
            style={{ backgroundColor: first ? c.cover : c.card, color: first ? c.coverInk : c.cardInk }}
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: first ? c.coverLabel : c.cardLabel }}>
              {String(i + 1).padStart(2, "0")} / {String(cards.length).padStart(2, "0")}
            </span>
            <div>
              <p className={`font-serif leading-[1.1] ${first ? "text-[22px]" : "text-[17px]"}`}>{card.heading || "Heading"}</p>
              {card.body ? <p className="mt-2 text-[10.5px] leading-snug opacity-85">{card.body}</p> : null}
            </div>
            <figcaption
              className="flex items-center justify-between font-mono text-[8.5px] uppercase tracking-[0.1em]"
              style={{ color: first ? c.coverLabel : c.cardLabel, opacity: first ? 0.75 : 1 }}
            >
              <span className="truncate">{firm}</span>
              {i < cards.length - 1 ? <span aria-hidden="true">Swipe</span> : null}
            </figcaption>
            {!first ? <span className="absolute inset-x-4 top-9 h-px" style={{ backgroundColor: c.accent }} aria-hidden="true" /> : null}
          </figure>
        );
      })}
    </div>
  );
}
