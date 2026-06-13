"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  plaintextKey: string;
  note?: string;
  onDismiss?: () => void;
};

export function ApiKeyReveal({ plaintextKey, note, onDismiss }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(plaintextKey);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-700 dark:bg-emerald-950/60">
      <div className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
        API key — copy it now. We won&apos;t show it again.
      </div>
      <div className="mt-2 break-all rounded bg-background p-2 font-mono text-sm">
        {plaintextKey}
      </div>
      {note && (
        <div className="mt-2 text-xs text-emerald-900/80 dark:text-emerald-100/80">
          {note}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={copy}>
          {copied ? "Copied ✓" : "Copy"}
        </Button>
        {onDismiss && (
          <Button size="sm" variant="outline" onClick={onDismiss}>
            Done
          </Button>
        )}
      </div>
    </div>
  );
}
