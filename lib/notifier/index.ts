import "server-only";

// The Notifier interface abstracts the delivery layer so future channels
// (native push, email) can slot in without touching the trigger code.
// Web push is the only implementation today.

export type NotificationPayload = {
  title: string;
  body: string;
  // Relative URL the SW should open on click. Kept path-only so the SW can
  // resolve it against the current origin without leaking absolute URLs.
  url?: string;
  // Grouping tag — later notifications with the same tag replace older ones.
  tag?: string;
};

export interface Notifier {
  send(userId: string, payload: NotificationPayload): Promise<void>;
}

// Lazy singleton; concrete impl chosen at import time.
let _instance: Notifier | null = null;
export async function getNotifier(): Promise<Notifier> {
  if (_instance) return _instance;
  const { WebPushNotifier } = await import("./webPush");
  _instance = new WebPushNotifier();
  return _instance;
}
