import { Suspense } from "react";
import type { Metadata } from "next";
import { JoinLeague } from "@/components/screens/join-league";

export const metadata: Metadata = { title: "Join a league" };

export default function Page({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense fallback={null}>
      {params.then(({ code }) => (
        <JoinLeague code={decodeURIComponent(code).toUpperCase()} />
      ))}
    </Suspense>
  );
}
