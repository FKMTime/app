"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";

type Competitor = {
  id: string;
  registrantId: number;
  name: string;
  wcaId: string | null;
  countryIso2: string | null;
};

export function CompetitorSearch({
  wcaId,
  competitors,
}: {
  wcaId: string;
  competitors: Competitor[];
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return competitors;
    return competitors.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        (c.wcaId ? c.wcaId.toLowerCase().includes(needle) : false) ||
        (c.countryIso2
          ? c.countryIso2.toLowerCase().includes(needle)
          : false),
    );
  }, [q, competitors]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Search by name, WCA ID, or country"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
          aria-label="Search competitors"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No competitors match &quot;{q}&quot;.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                href={`/competitions/${wcaId}/competitors/${c.registrantId}`}
                className="flex items-center gap-3 p-3 text-sm hover:bg-muted/50"
              >
                <UserRound
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c.wcaId ?? "newcomer"}
                    {c.countryIso2 ? ` · ${c.countryIso2}` : ""}
                  </div>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  #{c.registrantId}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {competitors.length}
      </p>
    </div>
  );
}
