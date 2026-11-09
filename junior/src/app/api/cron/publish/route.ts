import { NextResponse, type NextRequest } from "next/server";
import { safeEqual } from "@/lib/crypto";
import { runInbound } from "@/lib/inbound/process";
import { runPublisher } from "@/lib/publish/publisher";

// Woken every minute by Supabase (pg_cron + pg_net) when something is due or an
// emailed judgment is waiting, or by Vercel Cron. Both send "Authorization: Bearer <CRON_SECRET>".
export const maxDuration = 300;

async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Publishing is not configured" }, { status: 503 });
  if (!safeEqual(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const results = await runPublisher();
  // Email that arrived but was not finished (the server stopped, Claude was busy).
  const inbound = await runInbound({ limit: 3 });
  return NextResponse.json({
    inbound: inbound.length,
    published: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results: results.map(({ postId, channel, ok, willRetry }) => ({ postId, channel, ok, willRetry })),
  });
}

export const GET = handle;
export const POST = handle;
