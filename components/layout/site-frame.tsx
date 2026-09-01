"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CommandMenu } from "@/components/command-menu";
import { CaseInterfaceOverlay } from "@/components/case-interface-overlay";

export function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortfolioMvp = pathname === "/" || pathname.startsWith("/concepts/");

  if (isPortfolioMvp) {
    return <main id="main" tabIndex={-1}>{children}</main>;
  }

  return (
    <>
      <CommandMenu />
      <CaseInterfaceOverlay />
      <Header />
      <main id="main" tabIndex={-1} className="min-h-screen pt-16">
        {children}
      </main>
      <Footer />
    </>
  );
}
