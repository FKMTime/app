"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  approveCompetition,
  rejectCompetition,
} from "@/actions/competitionAdmin";
import { ApiKeyReveal } from "@/components/admin/api-key-reveal";

export function RequestActions({ competitionId }: { competitionId: string }) {
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  function handleApprove() {
    startTransition(async () => {
      const res = await approveCompetition(competitionId);
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      setRevealedKey(res.plaintextKey);
    });
  }

  function handleReject() {
    if (!reason.trim()) {
      window.alert("Please write a short reason — it's shown to the organizer.");
      return;
    }
    startTransition(async () => {
      const res = await rejectCompetition(competitionId, reason);
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      setRejecting(false);
      setReason("");
    });
  }

  if (revealedKey) {
    return (
      <ApiKeyReveal
        plaintextKey={revealedKey}
        note="This is the initial API key for the competition. The organizer can also reveal it once from their dashboard — after that it disappears from both places."
        onDismiss={() => setRevealedKey(null)}
      />
    );
  }

  if (rejecting) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why you're rejecting — the organizer will see this"
          disabled={pending}
          className="flex-1"
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={handleReject}
          >
            {pending ? "Rejecting…" : "Confirm reject"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setRejecting(false);
              setReason("");
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={handleApprove}
        title="Provisions the proxy tunnel, mints the API key, and syncs WCA roles."
      >
        <Check className="h-3.5 w-3.5" aria-hidden />
        {pending ? "Approving…" : "Approve"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => setRejecting(true)}
        title="Closes the request with a reason shown to the organizer."
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        Reject
      </Button>
    </div>
  );
}
