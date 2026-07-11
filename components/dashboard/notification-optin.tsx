"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

// One-click opt-in for the currently signed-in user across a set of comps.
// The flow: register SW → get VAPID key → PushManager.subscribe → POST to
// /api/push/subscribe with the endpoint & keys.

type Status = "idle" | "checking" | "granted" | "denied" | "unsupported" | "subscribed";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function NotificationOptIn({
  competitionIds,
}: {
  competitionIds: string[];
}) {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    (async () => {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const existing = await reg?.pushManager.getSubscription();
      if (existing) setStatus("subscribed");
      else if (Notification.permission === "denied") setStatus("denied");
      else setStatus("idle");
    })().catch(() => setStatus("idle"));
  }, []);

  async function subscribe() {
    setError(null);
    startTransition(async () => {
      try {
        const reg =
          (await navigator.serviceWorker.getRegistration("/sw.js")) ??
          (await navigator.serviceWorker.register("/sw.js"));
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus("denied");
          return;
        }
        const keyRes = await fetch("/api/push/public-key");
        if (!keyRes.ok) throw new Error("Push not configured on the server");
        const { publicKey } = (await keyRes.json()) as { publicKey: string };
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        const body = sub.toJSON();
        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: body.endpoint,
            keys: body.keys,
            competitionIds,
          }),
        });
        if (!res.ok) throw new Error(`Server rejected subscription: ${res.status}`);
        setStatus("subscribed");
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  async function unsubscribe() {
    startTransition(async () => {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("idle");
    });
  }

  if (status === "checking") return null;
  if (status === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground">
        Push notifications aren&apos;t supported on this browser. On iOS,
        install the app to your home screen first.
      </p>
    );
  }
  if (status === "denied") {
    return (
      <p className="text-sm text-muted-foreground">
        Notifications are blocked. Enable them in your browser settings, then
        reload.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "subscribed" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={unsubscribe}>
          {pending ? "…" : "Turn off group notifications"}
        </Button>
      ) : (
        <Button size="sm" disabled={pending || competitionIds.length === 0} onClick={subscribe}>
          {pending ? "…" : "Notify me when my group starts"}
        </Button>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
