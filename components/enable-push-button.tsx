"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { enablePushNotifications } from "@/lib/push-client";

export function EnablePushButton() {
  const [status, setStatus] = useState<"checking" | "idle" | "enabled" | "error">("checking");
  const [error, setError] = useState<string | null>(null);

  // On mount, reflect the real state of THIS device: if permission is granted
  // and a push subscription already exists, don't nag to enable again.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          if (!cancelled) setStatus("idle");
          return;
        }
        if (Notification.permission !== "granted") {
          if (!cancelled) setStatus("idle");
          return;
        }
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (!cancelled) setStatus(sub ? "enabled" : "idle");
      } catch {
        if (!cancelled) setStatus("idle");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleClick() {
    try {
      await enablePushNotifications();
      setStatus("enabled");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "checking") return null;

  if (status === "enabled") {
    return <p className="text-center text-xs text-muted-foreground">Notifications enabled on this device.</p>;
  }

  return (
    <div className="space-y-1 text-center">
      <Button variant="ghost" size="sm" onClick={handleClick}>
        Enable reminders & check-ins
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
