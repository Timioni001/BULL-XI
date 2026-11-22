"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ManagerProfile } from "@/components/screens/manager-profile";
import { Shimmer } from "@/components/states/states";

function ManagerFromQuery() {
  const id = useSearchParams().get("id") ?? "";
  return <ManagerProfile key={id} address={id} />;
}

export default function Page() {
  return (
    <Suspense fallback={<Shimmer className="m-4 h-80 rounded-3xl" />}>
      <ManagerFromQuery />
    </Suspense>
  );
}
