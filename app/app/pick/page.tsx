import type { Metadata } from "next";
import { PickTeam } from "@/components/screens/pick-team";

export const metadata: Metadata = { title: "Pick your team" };

export default function Page() {
  return <PickTeam />;
}
