import { zipSync } from "fflate";
import { NextResponse } from "next/server";
import { brandOf, getProfile, getUser } from "@/lib/dal";
import { renderCard } from "@/lib/publish/cards";
import { createClient } from "@/lib/supabase/server";
import type { Card } from "@/lib/types";

export const maxDuration = 60;

// The approved carousel as JPEGs in the lawyer's colours: ?n=1 for one card,
// otherwise a zip of all of them. For posting by hand.
export async function GET(request: Request, ctx: RouteContext<"/api/posts/[id]/cards">) {
  const { id } = await ctx.params;
  if (!(await getUser())) return new NextResponse("Sign in first", { status: 401 });
  const profile = await getProfile();
  if (!profile) return new NextResponse("Sign in first", { status: 401 });

  const supabase = await createClient();
  const { data: post } = await supabase.from("posts").select("id, channel, status, cards").eq("id", id).maybeSingle();
  if (!post || post.channel !== "instagram") return new NextResponse("Not found", { status: 404 });
  if (post.status === "to_review") return new NextResponse("Approve the carousel first", { status: 403 });

  const cards = post.cards as Card[];
  const brand = brandOf(profile);
  const n = Number(new URL(request.url).searchParams.get("n"));
  const name = (i: number) => `card-${String(i + 1).padStart(2, "0")}.jpg`;

  if (n >= 1 && n <= cards.length) {
    const jpeg = await renderCard(cards[n - 1], n - 1, cards.length, profile.firm, brand);
    return new NextResponse(new Uint8Array(jpeg), {
      headers: { "Content-Type": "image/jpeg", "Content-Disposition": `attachment; filename="${name(n - 1)}"`, "Cache-Control": "private, no-store" },
    });
  }

  const files: Record<string, Uint8Array> = {};
  for (const [i, card] of cards.entries()) files[name(i)] = new Uint8Array(await renderCard(card, i, cards.length, profile.firm, brand));
  return new NextResponse(new Uint8Array(zipSync(files, { level: 0 })), {
    headers: { "Content-Type": "application/zip", "Content-Disposition": 'attachment; filename="carousel.zip"', "Cache-Control": "private, no-store" },
  });
}
