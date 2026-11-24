import type { Metadata } from "next";
import { ProofView } from "@/components/screens/proof";

export const metadata: Metadata = { title: "Proof" };

export default function ProofPage() {
  return <ProofView />;
}
