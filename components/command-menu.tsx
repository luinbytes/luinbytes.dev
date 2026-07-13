"use client";

import * as React from "react";
import { Command } from "cmdk";
import { usePathname, useRouter } from "next/navigation";
import {
  Coffee,
  ExternalLink,
  Folder,
  Github,
  Mail,
  Search,
  User,
  type LucideIcon,
} from "lucide-react";
import { commandFilters, problemBuilds } from "@/lib/homepage";
import { caseStudies } from "@/lib/case-studies";

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const openerRef = React.useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const openMenu = React.useCallback(() => {
    openerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setOpen(true);
  }, []);

  const closeMenu = React.useCallback(() => {
    const opener = openerRef.current;
    openerRef.current = null;
    setOpen(false);
    window.requestAnimationFrame(() => {
      if (opener?.isConnected) opener.focus();
    });
  }, []);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const isCommandK =
        (e.key.toLowerCase() === "k" || e.code === "KeyK") &&
        (e.metaKey || e.ctrlKey) &&
        !e.altKey;

      if (isCommandK) {
        e.preventDefault();
        e.stopPropagation();
        if (open) {
          closeMenu();
        } else {
          openMenu();
        }
      }
    };

    window.addEventListener("keydown", down, { capture: true });
    return () => window.removeEventListener("keydown", down, { capture: true });
  }, [closeMenu, open, openMenu]);

  React.useEffect(() => {
    window.addEventListener("lu:open-command-menu", openMenu);
    return () => window.removeEventListener("lu:open-command-menu", openMenu);
  }, [openMenu]);

  const runCommand = React.useCallback((command: () => void) => {
    closeMenu();
    command();
  }, [closeMenu]);

  const scrollToSection = React.useCallback(
    (id: string) => {
      if (pathname !== "/") {
        router.push(`/#${id}`);
        return;
      }

      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    },
    [pathname, router]
  );

  const openHref = React.useCallback((href: string) => {
    if (href.startsWith("http")) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    window.location.href = href;
  }, []);

  const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
      return;
    }

    if (e.key !== "Tab") return;

    const focusable = menuRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command menu"
      className="fixed inset-0 z-[99] flex items-start justify-center bg-dark-brown/80 px-4 pt-[14vh]"
      onClick={closeMenu}
      onKeyDown={handleDialogKeyDown}
    >
      <div
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl"
      >
        <Command className="registration-plate print-dither print-shadow-lg overflow-hidden border-2 border-paper bg-dark-brown text-nd-text-primary">
          <div className="flex items-center gap-3 border-b-2 border-nd-border-visible px-4 py-3 focus-within:border-nd-accent">
            <Command.Input
              aria-label="Type a command or search"
              autoFocus
              placeholder="Type a command or search…"
              className="min-h-[40px] w-full bg-transparent font-mono text-[13px] text-nd-text-display outline-none placeholder:text-nd-text-disabled"
            />
            <kbd className="hidden h-6 shrink-0 select-none items-center border border-nd-border-visible bg-nd-black px-2 font-mono text-[10px] text-nd-text-disabled sm:inline-flex">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[420px] overflow-y-auto p-3">
            <Command.Empty className="p-4 text-center font-mono text-[11px] uppercase tracking-label text-nd-text-disabled">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="mb-2 px-1 pt-1 font-mono text-[10px] uppercase tracking-label text-nd-text-disabled">
              <Item icon={Folder} onSelect={() => runCommand(() => scrollToSection("builds"))}>
                Builds
              </Item>
              <Item icon={User} onSelect={() => runCommand(() => scrollToSection("about"))}>
                About
              </Item>
              <Item icon={Search} onSelect={() => runCommand(() => scrollToSection("status"))}>
                Status
              </Item>
              <Item icon={Mail} onSelect={() => runCommand(() => scrollToSection("contact"))}>
                Contact
              </Item>
            </Command.Group>

            <Command.Group heading="Quick filters" className="mb-2 px-1 pt-4 font-mono text-[10px] uppercase tracking-label text-nd-text-disabled">
              {commandFilters.map((filter) => (
                <Item
                  key={filter.value}
                  icon={filter.icon}
                  keywords={[filter.value]}
                  onSelect={() => runCommand(() => scrollToSection("builds"))}
                >
                  {filter.label}
                </Item>
              ))}
            </Command.Group>

            <Command.Group heading="Builds" className="mb-2 px-1 pt-4 font-mono text-[10px] uppercase tracking-label text-nd-text-disabled">
              {problemBuilds.map((build) => (
                <Item
                  key={build.id}
                  icon={build.icon}
                  keywords={[build.shortName, ...build.filters]}
                  onSelect={() => runCommand(() => openHref(build.href))}
                >
                  {build.buildName}
                </Item>
              ))}
            </Command.Group>

            <Command.Group heading="Case pages" className="mb-2 px-1 pt-4 font-mono text-[10px] uppercase tracking-label text-nd-text-disabled">
              {caseStudies.map((study) => (
                <Item
                  key={study.route}
                  icon={Folder}
                  keywords={[study.category, study.signal, ...study.tags]}
                  onSelect={() => runCommand(() => openHref(study.route))}
                >
                  {study.title}
                </Item>
              ))}
            </Command.Group>

            <Command.Group heading="Social" className="mb-2 px-1 pt-4 font-mono text-[10px] uppercase tracking-label text-nd-text-disabled">
              <Item icon={Github} onSelect={() => runCommand(() => openHref("https://github.com/luinbytes"))}>
                GitHub
              </Item>
              <Item icon={ExternalLink} onSelect={() => runCommand(() => openHref("https://x.com/x6c75"))}>
                X / Twitter
              </Item>
              <Item
                icon={Coffee}
                onSelect={() => runCommand(() => openHref("https://buymeacoffee.com/luinbytes"))}
              >
                Buy Me a Coffee
              </Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function Item({
  children,
  icon: Icon,
  keywords,
  onSelect,
}: {
  children: React.ReactNode;
  icon: LucideIcon;
  keywords?: string[];
  onSelect: () => void;
}) {
  return (
    <Command.Item
      keywords={keywords}
      onSelect={onSelect}
      className="group mt-1 flex min-h-[42px] cursor-pointer items-center gap-3 border border-transparent px-3 py-2 font-mono text-[13px] text-nd-text-secondary outline-none nd-transition aria-selected:border-nd-border-visible aria-selected:bg-nd-text-display aria-selected:text-nd-black"
    >
      <Icon className="h-4 w-4 text-nd-text-disabled nd-transition group-aria-selected:text-nd-accent" strokeWidth={1.5} />
      {children}
    </Command.Item>
  );
}
