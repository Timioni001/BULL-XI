import { Suspense } from "react";
import { SideNav } from "@/components/layout/side-nav";
import { StockSheetsProvider } from "@/components/stock/stock-sheets";
import { MotionProvider } from "@/components/providers/motion-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
    <StockSheetsProvider>
      <div className="min-h-dvh lg:flex">
        <Suspense fallback={<div className="hidden w-[248px] shrink-0 border-r border-hairline lg:block" />}>
          <SideNav />
        </Suspense>
        <div className="relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col lg:max-w-[1160px] lg:px-6">{children}</div>
      </div>
    </StockSheetsProvider>
    </MotionProvider>
  );
}
