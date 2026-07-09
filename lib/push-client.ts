"use client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function enablePushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications aren't supported in this browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission denied.");

  await navigator.serviceWorker.register("/sw.js");
  // register() resolves before the worker is activated. Subscribing against a
  // not-yet-active worker throws "no active Service Worker", so wait for the
  // ready promise — it resolves with the registration once the SW controls the page.
  const registration = await navigator.serviceWorker.ready;

  // A subscription made under a previous VAPID key can't just be re-subscribed
  // over — the browser throws "different applicationServerKey already exists".
  // Drop any existing subscription first so this always ends up on the current key.
  const existing = await registration.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set.");

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });
  // Browser-level subscribe can succeed while the server-side save fails (not
  // logged in, DB error, etc). Without this check that failure was silent —
  // button says "enabled" forever, but no row ever lands in push_subscriptions.
  if (!res.ok) throw new Error(`Saving subscription failed (${res.status}). Try logging in again.`);

  return subscription;
}
