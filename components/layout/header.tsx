"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Command,
  Gamepad2,
  Menu,
  Smartphone,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandShortcut } from "@/components/os-shortcut";

const navLinks = [
  { name: "Builds", href: "#builds" },
  { name: "About", href: "#about" },
  { name: "Status", href: "#status" },
  { name: "Contact", href: "#contact" },
];

const productGroups = [
  {
    label: "Android Apps",
    icon: Smartphone,
    items: [
      {
        name: "Meteor",
        href: "/meteor",
        description: "Tasks and habits in one local-first daily view.",
      },
      {
        name: "Sleepr",
        href: "/sleepr",
        description: "Sleep-cycle wake windows and on-device rhythm learning.",
      },
    ],
  },
  {
    label: "Game Mods",
    icon: Gamepad2,
    items: [
      {
        name: "Risk of Anticheat",
        href: "/risk-of-anticheat",
        description: "Risk of Rain 2 ESP, aim tools, and runtime systems.",
      },
      {
        name: "BrcTrainer",
        href: "/brc-trainer",
        description: "Bomb Rush Cyberfunk trainer with controller support.",
      },
      {
        name: "DaggerFall",
        href: "/dagger-fall",
        description: "External Linux trainer for Devil Daggers.",
      },
      {
        name: "SuperHackerGolf",
        href: "/super-hacker-golf",
        description: "Super Battle Golf assist, ESP, and physics tooling.",
      },
    ],
  },
] as const;

export function Header() {
  const [activeSection, setActiveSection] = useState("home");
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productMenuPhase, setProductMenuPhase] = useState<
    "closed" | "opening" | "open" | "closing"
  >("closed");
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const productMenuRef = useRef<HTMLDivElement>(null);
  const productMenuOpenerRef = useRef<HTMLElement | null>(null);
  const productMenuFrameRef = useRef<number | null>(null);
  const pathname = usePathname();
  const isMainPage = pathname === "/";
  const productIsActive = productGroups.some((group) =>
    group.items.some((item) => pathname === item.href)
  );
  const productMenuOpen =
    productMenuPhase === "opening" || productMenuPhase === "open";
  const productMenuMounted = productMenuPhase !== "closed";

  const closeProductMenu = useCallback(() => {
    if (productMenuFrameRef.current !== null) {
      window.cancelAnimationFrame(productMenuFrameRef.current);
      productMenuFrameRef.current = null;
    }
    const opener = productMenuOpenerRef.current;
    productMenuOpenerRef.current = null;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProductMenuPhase("closed");
    } else {
      setProductMenuPhase((phase) =>
        phase === "closed" ? "closed" : "closing"
      );
    }
    window.requestAnimationFrame(() => {
      if (opener?.isConnected) opener.focus();
    });
  }, []);

  useEffect(() => {
    if (productMenuPhase !== "opening") return;

    productMenuFrameRef.current = window.requestAnimationFrame(() => {
      productMenuFrameRef.current = null;
      setProductMenuPhase("open");
    });

    return () => {
      if (productMenuFrameRef.current !== null) {
        window.cancelAnimationFrame(productMenuFrameRef.current);
        productMenuFrameRef.current = null;
      }
    };
  }, [productMenuPhase]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);

      if (!isMainPage) return;

      const sections = ["home", "builds", "about", "status", "contact"];
      const current = sections.find((section) => {
        const element = document.getElementById(section);
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return rect.top >= -160 && rect.top <= 320;
      });

      if (current) setActiveSection(current);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMainPage]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";

    if (!mobileMenuOpen) return;

    const focusableSelector = 'a[href], button:not([disabled])';
    const focusFirstMenuItem = window.setTimeout(() => {
      const firstFocusable =
        mobileMenuRef.current?.querySelector<HTMLElement>(focusableSelector);
      firstFocusable?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        mobileMenuButtonRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = Array.from(
        mobileMenuRef.current?.querySelectorAll<HTMLElement>(
          focusableSelector
        ) ?? []
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusFirstMenuItem);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!productMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        productMenuRef.current &&
        !productMenuRef.current.contains(event.target as Node)
      ) {
        closeProductMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeProductMenu();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeProductMenu, productMenuOpen]);

  const openCommandMenu = () => {
    window.dispatchEvent(new CustomEvent("lu:open-command-menu"));
    setMobileMenuOpen(false);
  };

  const toggleProductMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (productMenuOpen) {
      closeProductMenu();
      return;
    }

    productMenuOpenerRef.current = event.currentTarget;
    setProductMenuPhase(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "open"
        : "opening"
    );
  };

  const handleSectionClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (!isMainPage) {
      setMobileMenuOpen(false);
      return;
    }

    event.preventDefault();
    const targetId = href.replace("#", "");
    const element = document.getElementById(targetId);

    if (element) {
      const headerOffset = 64;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      setActiveSection(targetId);
      setMobileMenuOpen(false);
    }
  };

  const linkHref = (href: string) => (isMainPage ? href : `/${href}`);

  return (
    <header
      className={cn(
        "registration-plate !fixed left-0 right-0 top-0 z-50 border-b-2 nd-transition",
        scrolled || mobileMenuOpen
          ? "border-paper bg-dark-brown shadow-[0_6px_0_var(--color-mustard)]"
          : "border-nd-border-visible bg-ink/96"
      )}
    >
      <div className="mx-auto hidden h-5 max-w-[92rem] items-center justify-between border-b border-nd-border px-4 font-mono text-[8px] uppercase tracking-label text-nd-text-disabled md:flex">
        <span>Independent software / field notes</span>
        <span>Build · verify · ship / 2026</span>
      </div>
      <div className="mx-auto flex h-14 max-w-[92rem] items-center justify-between px-4 md:h-12">
        <Link
          href={isMainPage ? "#home" : "/"}
          onClick={(event) => isMainPage && handleSectionClick(event, "#home")}
          className="font-mono text-sm font-bold tracking-normal text-nd-text-display nd-focus nd-transition hover:text-nd-accent"
        >
          luinbytes<span className="text-nd-accent">.</span>dev
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <div ref={productMenuRef} className="relative">
            <button
              type="button"
              onClick={toggleProductMenu}
              aria-expanded={productMenuOpen}
              aria-controls="products-menu"
              className={cn(
                "inline-flex items-center gap-1 px-3 py-2 font-mono text-[11px] uppercase tracking-label nd-focus nd-transition",
                productIsActive
                  ? "text-nd-text-display"
                  : "text-nd-text-disabled hover:text-nd-text-secondary"
              )}
            >
              /products
              <ChevronDown
                className={cn(
                  "h-3 w-3 nd-transition",
                  productMenuOpen && "rotate-180"
                )}
              />
            </button>

            {productMenuMounted && (
              <div
                id="products-menu"
                data-state={productMenuPhase}
                onTransitionEnd={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    event.propertyName === "transform" &&
                    productMenuPhase === "closing"
                  ) {
                    setProductMenuPhase("closed");
                  }
                }}
                className="product-menu registration-plate print-dither print-shadow-lg !absolute left-0 top-full z-[60] max-h-[calc(100vh-5.5rem)] w-[min(360px,calc(100vw-2rem))] overflow-y-auto border-2 border-paper bg-dark-brown p-3"
              >
                <div className="grid gap-3">
                  {productGroups.map((group) => {
                    const Icon = group.icon;
                    return (
                      <div key={group.label}>
                        <div className="mb-2 flex items-center gap-2 px-2 font-mono text-[10px] uppercase tracking-label text-nd-text-disabled">
                          <Icon className="h-3.5 w-3.5" />
                          {group.label}
                        </div>
                        <div className="grid gap-1">
                          {group.items.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={closeProductMenu}
                              className={cn(
                                "block border border-transparent px-3 py-2 nd-focus nd-transition hover:border-nd-border-visible hover:bg-nd-surface-raised",
                                pathname === item.href &&
                                  "border-nd-border-visible bg-nd-surface-raised"
                              )}
                            >
                              <span className="block font-mono text-[12px] uppercase tracking-label-tight text-nd-text-display">
                                {item.name}
                              </span>
                              <span className="mt-1 block text-xs leading-relaxed text-nd-text-disabled">
                                {item.description}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {navLinks.map((link) => {
            const sectionId = link.href.replace("#", "");
            return (
              <Link
                key={link.name}
                href={linkHref(link.href)}
                onClick={(event) => handleSectionClick(event, link.href)}
                className={cn(
                  "px-3 py-2 font-mono text-[11px] uppercase tracking-label nd-focus nd-transition",
                  activeSection === sectionId
                    ? "text-nd-text-display"
                    : "text-nd-text-disabled hover:text-nd-text-secondary"
                )}
              >
                /{link.name.toLowerCase()}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={openCommandMenu}
            className="print-shadow-xs ml-3 inline-flex items-center gap-2 border border-nd-border-visible bg-nd-surface px-3 py-1.5 font-mono text-[11px] uppercase tracking-label-tight text-nd-text-secondary nd-focus nd-transition hover:-translate-y-0.5 hover:border-nd-text-display hover:text-nd-text-display"
          >
            <Command className="h-3.5 w-3.5" />
            <CommandShortcut />
          </button>
        </nav>

        <button
          ref={mobileMenuButtonRef}
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          className="p-2 text-nd-text-secondary nd-focus nd-transition hover:text-nd-text-display md:hidden"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          ref={mobileMenuRef}
          className="registration-plate max-h-[calc(100svh-3.5rem)] overflow-y-auto border-t-2 border-paper bg-dark-brown px-4 py-4 md:hidden"
        >
          <nav className="grid gap-1">
            {productGroups.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.label} className="border-b border-nd-border py-3">
                  <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-label text-nd-text-disabled">
                    <Icon className="h-3.5 w-3.5" />
                    {group.label}
                  </div>
                  <div className="grid gap-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="py-2 font-mono text-[12px] uppercase tracking-label text-nd-text-primary nd-focus"
                      >
                        {item.href}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={linkHref(link.href)}
                onClick={(event) => handleSectionClick(event, link.href)}
                className="border-b border-nd-border py-4 font-mono text-[12px] uppercase tracking-label text-nd-text-primary nd-focus"
              >
                /{link.name.toLowerCase()}
              </Link>
            ))}
            <button
              type="button"
              onClick={openCommandMenu}
              className="mt-3 inline-flex min-h-[44px] items-center justify-center gap-2 border-2 border-nd-border-visible bg-nd-text-display px-4 py-3 font-mono text-[12px] uppercase tracking-label text-nd-black nd-focus"
            >
              <span className="font-mono text-[13px] leading-none">
                <CommandShortcut />
              </span>
              Open Command Menu
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
