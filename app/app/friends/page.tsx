"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FriendsLeagueScreen } from "@/components/screens/friends-league";
import { Shimmer } from "@/components/states/states";

function FromQuery() {
  const code = (useSearchParams().get("code") ?? "").toUpperCase();
  return <FriendsLeagueScreen key={code} code={code} />;
}

export default function Page() {
  return (
    <Suspense fallback={<Shimmer className="m-4 h-80 rounded-3xl" />}>
      <FromQuery />
    </Suspense>
  );
}
