import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { ComingNext } from "@/components/screens/coming-next";

export const metadata: Metadata = { title: "Leagues" };

export default function Page() {
  return <ComingNext title="Leagues" body="Mini-league tables, invite codes and head-to-heads land in the next build." icon={<Trophy className="size-7 text-muted-foreground" />} />;
}
