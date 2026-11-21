import { Suspense } from "react";
import type { Metadata } from "next";
import { LeagueDetail } from "@/components/screens/league-detail";
import { Shimmer } from "@/components/states/states";

export const metadata: Metadata = { title: "League" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Shimmer className="m-4 h-80 rounded-3xl" />}>
      {params.then(({ id }) => (
        <LeagueDetail id={decodeURIComponent(id)} />
      ))}
    </Suspense>
  );
}
