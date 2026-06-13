"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteManualIncident } from "@/actions/panelIncident";

export function IncidentDeleteButton({
  wcaId,
  incidentId,
}: {
  wcaId: string;
  incidentId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Delete this manual incident?")) return;
        startTransition(async () => {
          const res = await deleteManualIncident(wcaId, incidentId);
          if (!res.ok) window.alert(res.error);
        });
      }}
    >
      {pending ? "…" : "Delete"}
    </Button>
  );
}
