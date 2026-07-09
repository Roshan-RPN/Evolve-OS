import webpush from "web-push";
import { createServerClient } from "@/lib/supabase/server";

let configured = false;
let configError: string | null = null;
// setVapidDetails throws synchronously on a malformed key. Catch it here so a
// bad/missing VAPID key fails just this push (as an error result) instead of
// crashing the whole cron route for every user in the loop.
function ensureConfigured(): string | null {
  if (configured) return null;
  if (configError) return configError;
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:you@example.com",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    configured = true;
    return null;
  } catch (err) {
    configError = err instanceof Error ? err.message : String(err);
    console.error("[push] VAPID config invalid", configError);
    return configError;
  }
}

type PushPayload = { title: string; body: string; url?: string };

type SubRow = { endpoint: string; p256dh: string; auth: string };

export type PushResult = { subs: number; sent: number; errors: string[] };

async function send(subs: SubRow[], payload: PushPayload): Promise<PushResult> {
  const err = ensureConfigured();
  if (err) return { subs: subs.length, sent: 0, errors: subs.map(() => `vapid config: ${err}`) };
  const supabase = createServerClient();
  const errors: string[] = [];
  let sent = 0;
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
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        // Dead subscription — drop it so it stops counting as a device.
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${statusCode ?? "?"}: ${msg}`);
        // Surface it in server logs too, instead of swallowing.
        console.error("[push] send failed", statusCode, msg);
      }
    })
  );
  return { subs: subs.length, sent, errors };
}

// One profile's devices only — reminders are personal now that the app is multi-user.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<PushResult> {
  const supabase = createServerClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs?.length) return { subs: 0, sent: 0, errors: [] };
  return send(subs, payload);
}

export async function sendPushToAll(payload: PushPayload): Promise<PushResult> {
  const supabase = createServerClient();
  const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (!subs?.length) return { subs: 0, sent: 0, errors: [] };
  return send(subs, payload);
}
