"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { requestCompetition } from "@/actions/requestCompetition";

export function RequestCompetitionButton({ wcaId }: { wcaId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const res = await requestCompetition(wcaId);
          if (!res.ok) {
            window.alert(res.error);
          }
        });
      }}
    >
      {pending ? "Requesting…" : "Request FKMTime"}
    </Button>
  );
}
