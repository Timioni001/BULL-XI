import type { Metadata } from "next";
import { SquadBuilder } from "@/components/screens/squad-builder";

export const metadata: Metadata = { title: "Build your squad" };

export default function Page() {
  return <SquadBuilder />;
}
