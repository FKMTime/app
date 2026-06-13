import { getUpcomingManageableCompetitions } from "@/actions/getUpcomingManageableCompetitions";

export default async function ManageableCompetitionsPage() {
  const competitions = await getUpcomingManageableCompetitions();

  if (competitions.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Manageable competitions</h1>
        <p className="text-muted-foreground">
          You don&apos;t have any upcoming competitions you manage on WCA.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Manageable competitions</h1>
      <ul className="divide-y rounded-md border">
        {competitions.map((c) => (
          <li key={c.id} className="p-4">
            <div className="font-medium">{c.name}</div>
            <div className="text-sm text-muted-foreground">
              {c.start_date} → {c.end_date}
              {c.city ? ` · ${c.city}` : ""}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
