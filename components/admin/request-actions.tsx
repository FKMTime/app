"use client";

import { useState, useTransition } from "react";
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
      window.alert("Reason is required");
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
        note="This is the new API key for the competition. The organizer can also reveal it once from their dashboard."
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
          placeholder="Reason for rejection (shown to requester)"
          disabled={pending}
          className="flex-1"
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
      <Button size="sm" disabled={pending} onClick={handleApprove}>
        {pending ? "Approving…" : "Approve"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => setRejecting(true)}
      >
        Reject
      </Button>
    </div>
  );
}
