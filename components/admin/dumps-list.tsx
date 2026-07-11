"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { getDumpDownloadUrl } from "@/actions/dumpDownload";

type Dump = {
  id: string;
  objectKey: string;
  sizeBytes: string;
  uploadedAt: string;
};

export function DumpsList({ dumps }: { dumps: Dump[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function fetchAndOpen(id: string) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const res = await getDumpDownloadUrl(id);
      setBusyId(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.open(res.url, "_blank", "noopener");
    });
  }

  if (dumps.length === 0) {
    return <p className="text-sm text-muted-foreground">No dumps uploaded yet.</p>;
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y rounded-md border">
        {dumps.map((d) => (
          <li key={d.id} className="flex items-center gap-3 p-3 text-sm">
            <div className="flex-1">
              <div className="font-mono text-xs">{d.objectKey}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(d.uploadedAt).toISOString().replace("T", " ").slice(0, 19)} ·{" "}
                {formatBytes(Number(d.sizeBytes))}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={pending && busyId === d.id}
              onClick={() => fetchAndOpen(d.id)}
            >
              {pending && busyId === d.id ? "…" : "Download"}
            </Button>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MiB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
}
