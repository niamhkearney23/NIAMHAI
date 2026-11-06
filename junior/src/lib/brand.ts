// A lawyer's carousel colours, and the checks that keep text readable.

export interface Brand {
  /** Background of the first card. */
  cover: string;
  /** Background of every other card. */
  card: string;
  /** Lines and page numbers. */
  accent: string;
}

export const DEFAULT_BRAND: Brand = { cover: "#171B28", card: "#F1EBDE", accent: "#A8C0EA" };

const NAVY = "#171B28";
const CREAM = "#F1EBDE";

export function isHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Readable text on a background: navy or cream when they pass WCAG AA, else black or white. */
export function inkOn(background: string): string {
  const brand = contrast(NAVY, background) >= contrast(CREAM, background) ? NAVY : CREAM;
  if (contrast(brand, background) >= 4.5) return brand;
  return contrast("#000000", background) >= contrast("#FFFFFF", background) ? "#000000" : "#FFFFFF";
}

/** Page numbers in the accent when it is readable, otherwise in the text colour. */
export function labelOn(background: string, accent: string): string {
  return contrast(accent, background) >= 3 ? accent : inkOn(background);
}

export interface BrandColours extends Brand {
  coverInk: string;
  cardInk: string;
  coverLabel: string;
  cardLabel: string;
}

export function brandColours(brand: Brand): BrandColours {
  return {
    ...brand,
    coverInk: inkOn(brand.cover),
    cardInk: inkOn(brand.card),
    coverLabel: labelOn(brand.cover, brand.accent),
    cardLabel: labelOn(brand.card, brand.accent),
  };
}

export function brandWarnings(brand: Brand): string[] {
  const out: string[] = [];
  if (![brand.cover, brand.card, brand.accent].every(isHex)) return ["Use colours like #171B28."];
  // Black or white always reach 4.5:1, so warn below the stricter 7:1.
  if (contrast(inkOn(brand.cover), brand.cover) < 7) out.push("Text on the first card may be hard to read on a phone. A darker or lighter colour works better.");
  if (contrast(inkOn(brand.card), brand.card) < 7) out.push("Text on the other cards may be hard to read on a phone. A darker or lighter colour works better.");
  if (contrast(brand.accent, brand.card) < 1.5) out.push("The accent barely shows on the other cards.");
  return out;
}
