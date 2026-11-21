import type { Metadata } from "next";
import { GoPro } from "@/components/screens/go-pro";

export const metadata: Metadata = { title: "Go Pro" };

export default function Page() {
  return <GoPro />;
}
