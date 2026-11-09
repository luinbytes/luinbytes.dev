import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link" onClick={() => document.getElementById("main")?.focus({ preventScroll: true })}>Skip to content</a>
      <main id="main" tabIndex={-1}>{children}</main>
    </>
  );
}
