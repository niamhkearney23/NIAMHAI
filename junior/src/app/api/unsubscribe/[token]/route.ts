import { NextResponse } from "next/server";
import { unsubscribe } from "@/app/subscribe/actions";

// One-click unsubscribe from the inbox (RFC 8058: List-Unsubscribe-Post).
export async function POST(_request: Request, ctx: RouteContext<"/api/unsubscribe/[token]">) {
  const { token } = await ctx.params;
  await unsubscribe(token);
  return new NextResponse(null, { status: 200 });
}
