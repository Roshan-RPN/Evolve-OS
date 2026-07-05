import webpush from "web-push";
import { createServerClient } from "@/lib/supabase/server";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:you@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

type PushPayload = { title: string; body: string; url?: string };

type SubRow = { endpoint: string; p256dh: string; auth: string };

async function send(subs: SubRow[], payload: PushPayload) {
  ensureConfigured();
  const supabase = createServerClient();
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    })
  );
}

// One profile's devices only — reminders are personal now that the app is multi-user.
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const supabase = createServerClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (subs?.length) await send(subs, payload);
}

export async function sendPushToAll(payload: PushPayload) {
  const supabase = createServerClient();
  const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (subs?.length) await send(subs, payload);
}
