import type { Metadata } from "next";
import { History } from "@/components/screens/history";

export const metadata: Metadata = { title: "History" };

export default function Page() {
  return <History />;
}
