import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { brandColours, DEFAULT_BRAND, type Brand } from "@/lib/brand";
import type { Card } from "@/lib/types";

// Instagram carousel cards as 1080 x 1350 JPEGs (Instagram only accepts
// JPEG), in the lawyer's brand colours.

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

const FONT_DIR = path.join(process.cwd(), "src/assets/fonts");

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 500 | 600; style: "normal" }[]> | null = null;

function loadFonts() {
  fonts ??= Promise.all([
    readFile(path.join(FONT_DIR, "Newsreader-500.ttf")).then((data) => ({ name: "Newsreader", data, weight: 500 as const, style: "normal" as const })),
    readFile(path.join(FONT_DIR, "Instrument-Sans-400.ttf")).then((data) => ({ name: "Instrument Sans", data, weight: 400 as const, style: "normal" as const })),
    readFile(path.join(FONT_DIR, "IBM-Plex-Mono-500.ttf")).then((data) => ({ name: "IBM Plex Mono", data, weight: 500 as const, style: "normal" as const })),
  ]);
  return fonts;
}

function headingSize(text: string, first: boolean): number {
  const n = text.length;
  if (first) return n > 60 ? 84 : n > 36 ? 100 : 120;
  return n > 60 ? 64 : n > 36 ? 76 : 88;
}

function CardImage({ card, index, total, firm, brand }: { card: Card; index: number; total: number; firm: string; brand: Brand }) {
  const first = index === 0;
  const c = brandColours(brand);
  const fg = first ? c.coverInk : c.cardInk;
  const label = first ? c.coverLabel : c.cardLabel;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: first ? c.cover : c.card,
        color: fg,
        padding: "96px 92px 84px",
        fontFamily: "Instrument Sans",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontFamily: "IBM Plex Mono", fontSize: 28, letterSpacing: 4, color: label }}>
          {`${pad(index + 1)} / ${pad(total)}`}
        </div>
        {first ? null : <div style={{ display: "flex", height: 3, backgroundColor: c.accent, marginTop: 36 }} />}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Newsreader",
            fontSize: headingSize(card.heading, first),
            lineHeight: 1.08,
            letterSpacing: -1,
          }}
        >
          {card.heading}
        </div>
        {card.body ? (
          <div style={{ display: "flex", marginTop: 44, fontSize: 44, lineHeight: 1.35, opacity: first ? 0.88 : 0.82 }}>
            {card.body}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "IBM Plex Mono",
          fontSize: 24,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: label,
          opacity: first ? 0.75 : 1,
        }}
      >
        <span>{firm}</span>
        <span>{index < total - 1 ? "Swipe" : ""}</span>
      </div>
    </div>
  );
}

/** One card as a JPEG. */
export async function renderCard(
  card: Card,
  index: number,
  total: number,
  firm: string,
  brand: Brand = DEFAULT_BRAND,
): Promise<Buffer> {
  const png = await new ImageResponse(<CardImage card={card} index={index} total={total} firm={firm} brand={brand} />, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    fonts: await loadFonts(),
  }).arrayBuffer();
  return sharp(Buffer.from(png)).jpeg({ quality: 90, chromaSubsampling: "4:4:4" }).toBuffer();
}
