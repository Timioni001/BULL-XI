"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { JoinLeague } from "@/components/screens/join-league";

function JoinFromQuery() {
  const code = (useSearchParams().get("code") ?? "").toUpperCase();
  return <JoinLeague key={code} code={code} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <JoinFromQuery />
    </Suspense>
  );
}
