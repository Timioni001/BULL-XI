import type { Metadata } from "next";
import { LiveGameweek } from "@/components/screens/live-gameweek";

export const metadata: Metadata = { title: "Live" };

export default function Page() {
  return <LiveGameweek />;
}
