"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LeagueDetail } from "@/components/screens/league-detail";
import { Shimmer } from "@/components/states/states";

function LeagueFromQuery() {
  const id = useSearchParams().get("id") ?? "";
  return <LeagueDetail key={id} id={id} />;
}

export default function Page() {
  return (
    <Suspense fallback={<Shimmer className="m-4 h-80 rounded-3xl" />}>
      <LeagueFromQuery />
    </Suspense>
  );
}
