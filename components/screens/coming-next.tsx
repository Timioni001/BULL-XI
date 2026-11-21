"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/layout/top-bar";
import { TabBar } from "@/components/layout/tab-bar";
import { EmptyState } from "@/components/states/states";

/** Placeholder for screens scheduled after the hero-flow review. */
export function ComingNext({ title, body, icon, extra }: { title: string; body: string; icon: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <>
      <TopBar title={title} />
      <EmptyState
        className={extra ? "flex-1 justify-center" : "flex-1 justify-center pb-24"}
        icon={icon}
        title={`${title} are coming next`}
        body={body}
        action={
          <Button asChild size="cta" variant="secondary" className="w-full">
            <Link href="/live">Back to live</Link>
          </Button>
        }
      />
      {extra}
      <TabBar />
    </>
  );
}
