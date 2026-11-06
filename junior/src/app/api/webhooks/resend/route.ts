import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhook } from "@/lib/newsletter/webhook";
import { createAdminClient } from "@/lib/supabase/admin";

// Delivery, opens, clicks, bounces and spam complaints from Resend.
// Bounces and complaints stop future sends to that person.
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const body = await request.text();
  const ok =
    secret &&
    verifyWebhook(
      { id: request.headers.get("svix-id"), timestamp: request.headers.get("svix-timestamp"), signature: request.headers.get("svix-signature") },
      body,
      secret,
    );
  if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const event = JSON.parse(body) as { type: string; created_at?: string; data?: { email_id?: string } };
  const emailId = event.data?.email_id;
  if (!emailId) return NextResponse.json({ ok: true });
  const at = event.created_at ?? new Date().toISOString();
  const admin = createAdminClient();
  const sends = admin.from("newsletter_sends");

  switch (event.type) {
    case "email.delivered":
      await sends.update({ status: "delivered", delivered_at: at }).eq("resend_id", emailId).eq("status", "sent");
      break;
    case "email.opened":
      await sends.update({ opened_at: at }).eq("resend_id", emailId).is("opened_at", null);
      break;
    case "email.clicked":
      await sends.update({ clicked_at: at }).eq("resend_id", emailId).is("clicked_at", null);
      break;
    case "email.bounced":
    case "email.complained": {
      const status = event.type === "email.bounced" ? "bounced" : "complained";
      const { data } = await sends.update({ status }).eq("resend_id", emailId).select("subscriber_id");
      const ids = (data ?? []).map((r) => r.subscriber_id).filter(Boolean) as string[];
      if (ids.length) await admin.from("subscribers").update({ status }).in("id", ids);
      break;
    }
  }
  return NextResponse.json({ ok: true });
}
