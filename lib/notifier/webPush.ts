import "server-only";

import webpush from "web-push";
import { prisma } from "@/prisma";
import type { Notifier, NotificationPayload } from "./index";

function configureVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@fkmtime.example.com";
  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are required for push",
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

let vapidConfigured = false;

export class WebPushNotifier implements Notifier {
  async send(userId: string, payload: NotificationPayload): Promise<void> {
    if (!vapidConfigured) {
      configureVapid();
      vapidConfigured = true;
    }

    const subs = await prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, p256dh: true, authKey: true },
    });
    if (subs.length === 0) return;

    const body = JSON.stringify(payload);
    const results = await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.authKey },
          },
          body,
        ),
      ),
    );

    // Clean up dead endpoints (410 Gone / 404 Not Found).
    const dead: string[] = [];
    const now = new Date();
    const alive: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const status = (r.reason as { statusCode?: number } | undefined)?.statusCode;
        if (status === 404 || status === 410) dead.push(subs[i].id);
      } else {
        alive.push(subs[i].id);
      }
    });
    if (dead.length > 0) {
      await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } });
    }
    if (alive.length > 0) {
      await prisma.pushSubscription.updateMany({
        where: { id: { in: alive } },
        data: { lastUsedAt: now },
      });
    }
  }
}
