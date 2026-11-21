import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { ComingNext } from "@/components/screens/coming-next";
import { DemoControls } from "@/components/screens/demo-controls";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return <ComingNext title="Profiles" body="Team name, season rank, badges and Go Pro land in the next build." icon={<UserRound className="size-7 text-muted-foreground" />} extra={<DemoControls />} />;
}
