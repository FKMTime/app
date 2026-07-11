"use client";

import { useState, useTransition } from "react";
import type { CompetitionStatus } from "@prisma/client";
import {
  Cable,
  Eye,
  Info,
  KeyRound,
  RefreshCw,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    if (
      !window.confirm(
        "This revokes the current key immediately and mints a new one. The instance will stop syncing until the organizer copies the new key. Continue?",
      )
    )
      return;
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
    if (
      !window.confirm(
        "Revoke this key? Any instance using it will start getting 403s and stop syncing.",
      )
    )
      return;
    startTransition(async () => {
      const res = await revokeApiKey(id);
      if (!res.ok) window.alert(res.error);
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="space-y-0.5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Cable className="h-4 w-4 text-muted-foreground" aria-hidden />
            Proxy tunnel
          </h2>
          <p className="text-sm text-muted-foreground">
            The FKMTime instance connects out through fkm-proxy so this app can
            reach it from the internet. The <strong>URL</strong> is the public
            entry point; the <strong>secret</strong> is the per-tunnel password
            (stored encrypted at rest). Both are set automatically on approval.
          </p>
        </div>
        {provisioned ? (
          <div className="space-y-2 rounded-md border p-3 text-sm">
            <div>
              <span className="text-muted-foreground">URL:</span>{" "}
              {proxyTunnelUrl ? (
                <span className="font-mono">{proxyTunnelUrl}</span>
              ) : (
                <span className="text-muted-foreground">not set</span>
              )}
            </div>
            <div className="flex items-center gap-2">
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
                  title="Decrypts and shows the tunnel secret. It stays visible for this page load only."
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden /> Reveal
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="p-3 text-sm text-muted-foreground">
              Tunnel hasn&apos;t been provisioned yet. Approving the request
              creates the tunnel and mints a key.
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <KeyRound
                className="h-4 w-4 text-muted-foreground"
                aria-hidden
              />
              API keys
            </h2>
            <p className="text-sm text-muted-foreground">
              Bearer tokens the FKMTime instance uses to push sync data. A key
              is scoped to <em>this</em> competition — a leaked key cannot
              write to any other. Only the SHA-256 hash is stored; the plaintext
              is shown once on creation and never again.
            </p>
          </div>
          {provisioned && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={handleRegenerate}
              title="Revokes the current active key and mints a new one. Use if a key was leaked or a re-provision is needed."
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Rotate key
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
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/40">
            <Info className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              A newly-minted key is waiting for one-time reveal. It disappears
              from this screen after it is shown once.
            </span>
            <Button
              size="sm"
              className="ml-auto"
              disabled={pending}
              onClick={handleRevealKey}
            >
              Reveal now
            </Button>
          </div>
        )}

        {apiKeys.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="p-3 text-sm text-muted-foreground">
              No API keys yet.
            </CardContent>
          </Card>
        ) : (
          <ul className="divide-y rounded-md border">
            {apiKeys.map((k) => {
              const revoked = Boolean(k.revokedAt);
              const expired = new Date(k.expiresAt) < new Date();
              const active = !revoked && !expired;
              return (
                <li key={k.id} className="flex items-center gap-3 p-3 text-sm">
                  <Shield
                    className={`h-4 w-4 ${active ? "text-emerald-500" : "text-muted-foreground"}`}
                    aria-hidden
                  />
                  <span className="font-mono" title="Last 4 characters of the plaintext (for identification only)">
                    …{k.lastFour}
                  </span>
                  <span className="text-muted-foreground" title="Automatic expiry (competition end + N days)">
                    expires {k.expiresAt.slice(0, 10)}
                  </span>
                  {k.lastUsedAt && (
                    <span className="text-muted-foreground" title="Last time this key was used in a sync request">
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
                      title="Immediately revoke this key. The instance will get 403 on its next sync request."
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
