import type { Metadata } from "next";
import { DeadlineLock } from "@/components/screens/deadline-lock";

export const metadata: Metadata = { title: "Deadline" };

export default function Page() {
  return <DeadlineLock />;
}
