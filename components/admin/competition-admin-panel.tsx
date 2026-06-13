"use client";

import { useState, useTransition } from "react";
import type { CompetitionStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ApiKeyReveal } from "@/components/admin/api-key-reveal";
import {
  regenerateApiKey,
  revealApiKey,
  revealProxySecret,
  revokeApiKey,
} from "@/actions/competitionAdmin";

type ApiKeyRow = {
  id: string;
  lastFour: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};

type Props = {
  competitionId: string;
  status: CompetitionStatus;
  proxyTunnelUrl: string | null;
  hasProxySecret: boolean;
  hasPendingApiKey: boolean;
  apiKeys: ApiKeyRow[];
};

export function CompetitionAdminPanel({
  competitionId,
  status,
  proxyTunnelUrl,
  hasProxySecret,
  hasPendingApiKey,
  apiKeys,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [proxySecret, setProxySecret] = useState<string | null>(null);

  const provisioned = status !== "REQUESTED" && status !== "REJECTED";

  function handleRevealKey() {
    startTransition(async () => {
      const res = await revealApiKey(competitionId);
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      setRevealedKey(res.plaintextKey);
    });
  }

  function handleRegenerate() {
    if (!window.confirm("Revoke the current key and mint a new one?")) return;
    startTransition(async () => {
      const res = await regenerateApiKey(competitionId);
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      setRevealedKey(res.plaintextKey);
    });
  }

  function handleRevealProxy() {
    startTransition(async () => {
      const res = await revealProxySecret(competitionId);
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      setProxySecret(res.secret);
    });
  }

  function handleRevoke(id: string) {
    if (!window.confirm("Revoke this key? Instances using it will stop syncing.")) return;
    startTransition(async () => {
      const res = await revokeApiKey(id);
      if (!res.ok) window.alert(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Proxy tunnel</h2>
        {provisioned ? (
          <div className="rounded-md border p-3 text-sm">
            <div>
              <span className="text-muted-foreground">URL:</span>{" "}
              {proxyTunnelUrl ? (
                <span className="font-mono">{proxyTunnelUrl}</span>
              ) : (
                <span className="text-muted-foreground">not set</span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-muted-foreground">Secret:</span>
              {proxySecret ? (
                <span className="break-all rounded bg-muted px-2 py-0.5 font-mono">
                  {proxySecret}
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hasProxySecret || pending}
                  onClick={handleRevealProxy}
                >
                  Reveal
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Tunnel hasn&apos;t been provisioned. Approve the request from the
            queue to provision it.
          </p>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">API keys</h2>
          {provisioned && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={handleRegenerate}
            >
              Generate new key
            </Button>
          )}
        </div>

        {revealedKey && (
          <ApiKeyReveal
            plaintextKey={revealedKey}
            onDismiss={() => setRevealedKey(null)}
          />
        )}

        {hasPendingApiKey && !revealedKey && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/40">
            A key is pending one-time reveal.
            <Button
              size="sm"
              className="ml-3"
              disabled={pending}
              onClick={handleRevealKey}
            >
              Reveal now
            </Button>
          </div>
        )}

        {apiKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {apiKeys.map((k) => {
              const revoked = Boolean(k.revokedAt);
              const expired = new Date(k.expiresAt) < new Date();
              return (
                <li key={k.id} className="flex items-center gap-3 p-3 text-sm">
                  <span className="font-mono">…{k.lastFour}</span>
                  <span className="text-muted-foreground">
                    expires {k.expiresAt.slice(0, 10)}
                  </span>
                  {k.lastUsedAt && (
                    <span className="text-muted-foreground">
                      last used {k.lastUsedAt.slice(0, 16).replace("T", " ")}
                    </span>
                  )}
                  <span className="flex-1" />
                  {revoked ? (
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      revoked
                    </span>
                  ) : expired ? (
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      expired
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => handleRevoke(k.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
