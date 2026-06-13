"use client";

import { useState, useTransition } from "react";
import type { IncidentKind } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createManualIncident } from "@/actions/panelIncident";

type PersonOption = {
  id: string;
  name: string;
  registrantId: number;
  wcaId: string | null;
};

const KINDS: IncidentKind[] = ["MANUAL", "NOTEWORTHY", "WARNING"];

export function IncidentForm({
  wcaId,
  persons,
}: {
  wcaId: string;
  persons: PersonOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<IncidentKind>("MANUAL");
  const [description, setDescription] = useState("");
  const [personId, setPersonId] = useState<string>("");

  function handleSubmit() {
    if (!description.trim()) {
      window.alert("Description is required");
      return;
    }
    startTransition(async () => {
      const res = await createManualIncident(wcaId, {
        kind,
        description,
        personId: personId || null,
      });
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      setDescription("");
      setPersonId("");
      setKind("MANUAL");
    });
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="text-sm font-medium">Log a new incident</div>
      <div className="grid gap-2 sm:grid-cols-[120px_1fr_200px]">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as IncidentKind)}
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
          disabled={pending}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened?"
          disabled={pending}
        />
        <select
          value={personId}
          onChange={(e) => setPersonId(e.target.value)}
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
          disabled={pending}
        >
          <option value="">No person</option>
          {persons.map((p) => (
            <option key={p.id} value={p.id}>
              #{p.registrantId} {p.name}
              {p.wcaId ? ` (${p.wcaId})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end">
        <Button size="sm" disabled={pending} onClick={handleSubmit}>
          {pending ? "Saving…" : "Log incident"}
        </Button>
      </div>
    </div>
  );
}
