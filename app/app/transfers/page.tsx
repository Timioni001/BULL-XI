import type { Metadata } from "next";
import { Transfers } from "@/components/screens/transfers";

export const metadata: Metadata = { title: "Transfers" };

export default function Page() {
  return <Transfers />;
}
