import type { Metadata } from "next";
import { Chips } from "@/components/screens/chips";

export const metadata: Metadata = { title: "Chips" };

export default function Page() {
  return <Chips />;
}
