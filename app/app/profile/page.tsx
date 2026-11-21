import type { Metadata } from "next";
import { Profile } from "@/components/screens/profile";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return <Profile />;
}
