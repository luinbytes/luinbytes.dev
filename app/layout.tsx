import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <main id="main" tabIndex={-1}>{children}</main>
    </>
  );
}
