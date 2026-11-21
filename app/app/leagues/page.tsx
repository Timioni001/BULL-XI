import type { Metadata } from "next";
import { Leagues } from "@/components/screens/leagues";

export const metadata: Metadata = { title: "Leagues" };

export default function Page() {
  return <Leagues />;
}
