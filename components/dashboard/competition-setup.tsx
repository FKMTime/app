"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  revealApiKey,
  revealProxySecret,
} from "@/actions/competitionAdmin";
import { ApiKeyReveal } from "@/components/admin/api-key-reveal";

type Props = {
  competitionId: string;
  proxyTunnelUrl: string | null;
  hasProxySecret: boolean;
  hasPendingApiKey: boolean;
};

export function CompetitionSetup({
  competitionId,
  proxyTunnelUrl,
  hasProxySecret,
  hasPendingApiKey,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [proxySecret, setProxySecret] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  function handleRevealApiKey() {
    startTransition(async () => {
      const res = await revealApiKey(competitionId);
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      setApiKey(res.plaintextKey);
    });
  }

  function handleRevealProxySecret() {
    startTransition(async () => {
      const res = await revealProxySecret(competitionId);
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      setProxySecret(res.secret);
    });
  }

  return (
    <div className="mt-3 space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
      <div className="font-medium">Setup instructions</div>
      <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
        <li>Install FKMTime on your competition machine.</li>
        <li>
          In its config, paste the proxy tunnel URL and secret below, then the
          API key.
        </li>
        <li>Start FKMTime. It will begin syncing to this central app.</li>
      </ol>

      <div className="space-y-2">
        <div>
          <span className="text-muted-foreground">Proxy tunnel URL:</span>{" "}
          {proxyTunnelUrl ? (
            <span className="font-mono">{proxyTunnelUrl}</span>
          ) : (
            <span className="text-muted-foreground">not provisioned</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Proxy secret:</span>
          {proxySecret ? (
            <span className="break-all rounded bg-background px-2 py-0.5 font-mono">
              {proxySecret}
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={!hasProxySecret || pending}
              onClick={handleRevealProxySecret}
            >
              Reveal
            </Button>
          )}
        </div>
      </div>

      {apiKey ? (
        <ApiKeyReveal plaintextKey={apiKey} onDismiss={() => setApiKey(null)} />
      ) : hasPendingApiKey ? (
        <div className="flex items-center gap-2">
          <span>Your API key is ready for one-time reveal.</span>
          <Button size="sm" disabled={pending} onClick={handleRevealApiKey}>
            Reveal API key
          </Button>
        </div>
      ) : (
        <div className="text-muted-foreground">
          API key already revealed. Ask an admin to regenerate it if you lost
          it.
        </div>
      )}
    </div>
  );
}
