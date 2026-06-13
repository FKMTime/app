"use client";

import { useState, useTransition } from "react";
import type { AttemptStatus, AttemptType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { editAttempt } from "@/actions/editAttempt";
import {
  attemptText,
  formatCentis,
  parseHumanTime,
} from "@/lib/format/time";

type AttemptRow = {
  id: string;
  attemptNumber: number;
  value: number;
  penalty: number;
  status: AttemptStatus;
  type: AttemptType;
  replacedBy: number | null;
  description: string | null;
  editedAt: string | null;
  editedBy: { id: string; name: string | null } | null;
};

const STATUSES: AttemptStatus[] = ["STANDARD", "EXTRA", "DNF", "DNS"];

export function AttemptEditRow({
  wcaId,
  attempt,
}: {
  wcaId: string;
  attempt: AttemptRow;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [valueText, setValueText] = useState(formatCentis(attempt.value));
  const [penalty, setPenalty] = useState<0 | 200>(attempt.penalty === 200 ? 200 : 0);
  const [status, setStatus] = useState<AttemptStatus>(attempt.status);
  const [description, setDescription] = useState(attempt.description ?? "");

  function handleSave() {
    let value = 0;
    if (status === "STANDARD" || status === "EXTRA") {
      const parsed = parseHumanTime(valueText);
      if (parsed === null) {
        window.alert("Couldn't parse the time (try e.g. 12.34 or 1:23.45)");
        return;
      }
      value = parsed;
    }
    startTransition(async () => {
      const res = await editAttempt(wcaId, attempt.id, {
        value,
        penalty,
        status,
        description: description.trim() || null,
      });
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <tr className="border-t align-top">
        <td className="px-3 py-2 font-mono">A{attempt.attemptNumber}</td>
        <td className="px-3 py-2 font-mono">{attemptText(attempt)}</td>
        <td className="px-3 py-2 text-xs">{attempt.description ?? "—"}</td>
        <td className="px-3 py-2 text-xs text-muted-foreground">
          {attempt.editedAt
            ? `by ${attempt.editedBy?.name ?? "unknown"} · ${attempt.editedAt.slice(0, 10)}`
            : "—"}
        </td>
        <td className="px-3 py-2 text-right">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t bg-muted/30 align-top">
      <td className="px-3 py-2 font-mono">A{attempt.attemptNumber}</td>
      <td className="px-3 py-2" colSpan={3}>
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-[150px_120px_140px]">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AttemptStatus)}
              className="rounded-md border bg-background px-2 py-1.5 text-sm"
              disabled={pending}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Input
              value={valueText}
              onChange={(e) => setValueText(e.target.value)}
              placeholder="12.34"
              disabled={pending || status === "DNF" || status === "DNS"}
              className="font-mono"
            />
            <select
              value={penalty}
              onChange={(e) => setPenalty(Number(e.target.value) as 0 | 200)}
              className="rounded-md border bg-background px-2 py-1.5 text-sm"
              disabled={pending || status === "DNF" || status === "DNS"}
            >
              <option value={0}>no penalty</option>
              <option value={200}>+2</option>
            </select>
          </div>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Delegate notes (extra reasons, etc.)"
            disabled={pending}
          />
        </div>
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button size="sm" disabled={pending} onClick={handleSave}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        </div>
      </td>
    </tr>
  );
}
