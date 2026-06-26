"use client";

import Link from "next/link";
import { SectionRail, SegmentedStats, useActiveSection } from "@/components/case-page-parts";
import {
  Github,
  ShoppingCart,
  Image as ImageIcon,
  Hash,
  Zap,
  ShieldCheck,
  Globe,
  Terminal,
  ExternalLink,
} from "lucide-react";

const SECTION_NAV = [
  { id: "overview", label: "Overview" },
  { id: "why", label: "Why" },
  { id: "algorithms", label: "Algorithms" },
  { id: "features", label: "Features" },
  { id: "tech", label: "Tech" },
  { id: "get-it", label: "Get it" },
] as const;

const algorithms = [
  {
    name: "dHash",
    full: "Difference Hash",
    summary:
      "Compares brightness gradients between adjacent pixels in a downsampled grid. Fast and surprisingly resilient to compression and resizing.",
    bestFor: "Resizes, JPEG re-encodes, mild crops",
  },
  {
    name: "aHash",
    full: "Average Hash",
    summary:
      "Computes the mean luminance of a tiny grid and emits one bit per cell relative to the mean. The simplest hash — fastest and a good first-pass filter.",
    bestFor: "Quick coarse filtering before dHash/pHash",
  },
  {
    name: "pHash",
    full: "Perceptual Hash",
    summary:
      "Runs a 2D DCT over the downsampled image and hashes the low-frequency band. The most robust against rotation, color shifts, and heavy edits.",
    bestFor: "Aggressive edits, watermarks, color grades",
  },
] as const;

const features = [
  {
    icon: ImageIcon,
    title: "Perceptual image similarity",
    description:
      "The headline feature. Find duplicates that survived a re-encode, a rename, a watermark, or a crop. dHash + aHash + pHash run in parallel and you tune the similarity threshold per-run.",
    details: [
      "dHash, aHash, pHash all available — pick one, mix them, or run all three",
      "Adjustable Hamming-distance threshold for similarity match",
      "Runs alongside SHA256 — exact and perceptual results in the same pass",
    ],
  },
  {
    icon: Zap,
    title: "Parallel by default",
    description:
      "Go's goroutines fan out the hashing work across every CPU core. Hashing a 100k-image library is bound by disk read, not by CPU.",
    details: [
      "Worker pool sized to runtime.NumCPU()",
      "Streaming SHA256 — no full-file buffering for byte-exact mode",
      "Backpressure on the result channel keeps memory flat",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Safe by default",
    description:
      "Dry-run is the default. Destructive deletes are opt-in. Even when you say delete, the default action is to move duplicates to a quarantine directory so you can audit before they're gone.",
    details: [
      "--dry-run is default — see what would happen first",
      "Move to quarantine instead of unlink, by default",
      "--delete is the explicit opt-in for hard removal",
    ],
  },
  {
    icon: Globe,
    title: "Cross-platform",
    description:
      "Single static binary on Linux, macOS, and Windows. No Python runtime, no node_modules — just a binary you drop into PATH and run.",
    details: [
      "Static Go binary — no runtime dependencies",
      "Linux x86_64 + arm64, macOS Intel + Apple Silicon, Windows x86_64",
      "Same flags, same behavior on every platform",
    ],
  },
] as const;

const techStack = [
  {
    name: "Go",
    description:
      "Static binaries, native concurrency, and great file-system primitives",
  },
  {
    name: "SHA256",
    description: "Streaming byte-exact hash for the trivial-duplicate path",
  },
  {
    name: "dHash / aHash / pHash",
    description: "Three perceptual algorithms — different trade-offs, all parallel",
  },
  {
    name: "CLI",
    description: "Flag-driven, scriptable, pipe-friendly",
  },
] as const;

const SOURCE_URL = "https://github.com/luinbytes/file-deduplicator";
const PURCHASE_URL = "https://luinbytes.gumroad.com/l/file-deduplicator";
const DEMO_URL = "https://luinbytes.github.io/file-deduplicator/";

export function FileDedupPage() {
  const activeSection = useActiveSection(SECTION_NAV);

  return (
    <div className="min-h-screen bg-nd-black scroll-smooth">
      <SectionRail sections={SECTION_NAV} activeSection={activeSection} />

      {/* Hero */}
      <section id="overview" className="relative border-b border-nd-border">
        <div className="absolute inset-0 dot-grid-subtle opacity-30 pointer-events-none" />
        <div className="container px-4 mx-auto max-w-5xl relative z-10 py-24 md:py-40">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
            {/* Left column — copy */}
            <div>
              <Link
                href="/#builds"
                className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled hover:text-nd-text-display nd-transition mb-12"
              >
                ← Back to projects
              </Link>

              <div className="flex items-center gap-3 mb-6">
                <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled border border-nd-border px-2 py-1 rounded-full">
                  CLI Tool
                </span>
                <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-success border border-nd-success/30 px-2 py-1 rounded-full">
                  Open Source
                </span>
                <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-accent border border-nd-accent/30 px-2 py-1 rounded-full">
                  Released
                </span>
              </div>

              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-nd-text-display leading-[1.0] tracking-[-0.03em] mb-6">
                file-deduplicator<span className="text-nd-accent">.</span>
              </h1>

              <p className="text-nd-text-secondary text-base md:text-lg max-w-2xl leading-relaxed mb-6">
                The only CLI tool that finds <span className="text-nd-text-display">similar</span> images,
                not just byte-for-byte duplicates.
              </p>

              <p className="text-nd-text-secondary text-base md:text-lg max-w-2xl leading-relaxed mb-10">
                Re-encoded? Renamed? Slightly cropped? Watermarked? It still
                finds them. Three perceptual hash algorithms (dHash, aHash,
                pHash) run in parallel on top of byte-exact SHA256 — for cleaning
                up massive photo libraries that survived years of edits and
                exports.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={PURCHASE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-nd-text-display text-nd-black font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:opacity-80 min-h-[44px]"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Buy on Gumroad
                </a>
                <a
                  href={SOURCE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent border border-nd-border-visible text-nd-text-primary font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:border-nd-text-secondary min-h-[44px]"
                >
                  <Github className="w-4 h-4" />
                  Source on GitHub
                </a>
              </div>

              <p className="font-mono text-[11px] text-nd-text-disabled mt-4">
                Source is free under MIT. Paid binaries on Gumroad save you the
                build step.
              </p>
            </div>

            {/* Right column — terminal example */}
            <div className="hidden lg:block relative">
              <div className="absolute inset-0 dot-grid-subtle opacity-20 pointer-events-none" />
              <div className="relative">
                <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-nd-text-disabled mb-6">
                  EXAMPLE.RUN
                </p>

                <div className="bg-nd-surface border border-nd-border rounded-sm overflow-hidden">
                  <div className="bg-nd-black/50 border-b border-nd-border px-4 py-2 flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-nd-text-disabled" />
                    <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-nd-text-disabled">
                      ~/photos
                    </span>
                  </div>
                  <div className="p-4 font-mono text-[12px] leading-relaxed">
                    <p>
                      <span className="text-nd-text-disabled">$</span>{" "}
                      <span className="text-nd-text-display">file-deduplicator</span>{" "}
                      <span className="text-nd-accent">--phash</span>{" "}
                      <span className="text-nd-text-secondary">~/photos</span>
                    </p>
                    <p className="text-nd-text-disabled mt-3">
                      scanning 12,847 images...
                    </p>
                    <p className="text-nd-text-disabled">
                      hashing in parallel (12 workers)...
                    </p>
                    <p className="text-nd-text-display mt-3">
                      found 432 similar groups
                    </p>
                    <p className="text-nd-success">
                      — IMG_2451.jpg ≈ IMG_2451-edit.png
                    </p>
                    <p className="text-nd-success">
                      — vacation.jpg ≈ vacation-resized.jpg
                    </p>
                    <p className="text-nd-success">
                      — sunset.heic ≈ sunset-export.jpg
                    </p>
                    <p className="text-nd-text-disabled mt-3">
                      dry-run: nothing was deleted
                    </p>
                    <p className="text-nd-accent mt-3">
                      $ _
                      <span className="inline-block w-2 h-3.5 bg-nd-accent ml-0.5 align-baseline animate-pulse" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-10 border-t border-nd-border">
            <SegmentedStats stats={[
                {
                  label: "Hash algorithms",
                  value: "3",
                  total: 3,
                  filled: 3,
                  accentFrom: -1,
                },
                {
                  label: "Platforms",
                  value: "3",
                  total: 3,
                  filled: 3,
                  accentFrom: -1,
                },
                {
                  label: "Runtime deps",
                  value: "0",
                  total: 5,
                  filled: 0,
                  accentFrom: -1,
                },
                {
                  label: "Default mode",
                  value: "Dry",
                  total: 4,
                  filled: 4,
                  accentFrom: 0,
                },
              ] as const
            } />
          </div>
        </div>
      </section>

      {/* Why */}
      <section id="why" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            01 / Why
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-6">
            Every other CLI dedup tool stops at the byte level.
          </h2>
          <p className="text-nd-text-secondary text-base max-w-2xl mb-12 leading-relaxed">
            <code className="font-mono text-nd-text-display">fdupes</code>,{" "}
            <code className="font-mono text-nd-text-display">rdfind</code>,{" "}
            <code className="font-mono text-nd-text-display">jdupes</code>,{" "}
            <code className="font-mono text-nd-text-display">rmlint</code> — all
            excellent for byte-exact matches. None of them find{" "}
            <span className="text-nd-text-display">visually identical</span>{" "}
            files. Re-export a JPEG at a different quality, save a PNG as HEIC,
            crop one pixel — they go silent. Your library still has the
            duplicates.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-nd-surface border border-nd-border p-6">
              <h3 className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-display mb-3">
                What other tools see
              </h3>
              <ul className="space-y-2.5">
                {[
                  "Identical bytes only — SHA256/SHA1 match",
                  "A re-encode at JPEG q=85 vs q=90 = different file",
                  "Same image as PNG vs HEIC = different file",
                  "Cropped 1 pixel = different file",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-nd-text-secondary"
                  >
                    <span className="w-1 h-1 rounded-full bg-nd-text-disabled mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-nd-surface border border-nd-accent/40 p-6">
              <h3 className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-accent mb-3">
                What file-deduplicator sees
              </h3>
              <ul className="space-y-2.5">
                {[
                  "Visual similarity within configurable Hamming distance",
                  "Re-encodes catch as duplicates",
                  "Format conversions catch as duplicates",
                  "Crops, watermarks, color grades — still caught",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-nd-text-secondary"
                  >
                    <span className="w-1 h-1 rounded-full bg-nd-accent mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Algorithms */}
      <section
        id="algorithms"
        className="py-24 md:py-32 border-b border-nd-border"
      >
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            02 / Algorithms
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-6">
            <Hash className="inline-block w-6 h-6 mr-2 text-nd-accent align-baseline" />
            Three perceptual hashes, one parallel pass
          </h2>
          <p className="text-nd-text-secondary text-base max-w-2xl mb-12 leading-relaxed">
            Each algorithm gives you a different trade-off between speed and
            robustness. Run one, run all three, and tune the Hamming-distance
            threshold for how loose &quot;similar&quot; should mean.
          </p>

          <div className="space-y-3">
            {algorithms.map((algo, i) => (
              <div
                key={algo.name}
                className="bg-nd-surface border border-nd-border p-6 grid md:grid-cols-[140px_1fr_180px] gap-6 items-start"
              >
                <div>
                  <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-1">
                    {String(i + 1).padStart(2, "0")} / {algo.name}
                  </span>
                  <span className="font-mono text-sm text-nd-text-display">
                    {algo.full}
                  </span>
                </div>
                <p className="text-sm text-nd-text-secondary leading-relaxed">
                  {algo.summary}
                </p>
                <div>
                  <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-1">
                    Best for
                  </span>
                  <span className="font-mono text-[12px] text-nd-accent leading-relaxed">
                    {algo.bestFor}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="py-24 md:py-32 border-b border-nd-border"
      >
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            03 / Features
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-6">
            What ships in the binary
          </h2>
          <p className="text-nd-text-secondary text-base max-w-xl mb-16">
            Fast, parallel, safe by default, and the same flags everywhere.
          </p>

          <div className="space-y-16">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="grid md:grid-cols-[1fr_1.5fr] gap-8 md:gap-12"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 flex items-center justify-center border border-nd-border-visible text-nd-text-secondary">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-nd-text-disabled">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="font-body text-lg font-bold text-nd-text-display mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-nd-text-secondary leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  <div className="bg-nd-surface border border-nd-border p-6">
                    <ul className="space-y-2.5">
                      {feature.details.map((detail) => (
                        <li
                          key={detail}
                          className="flex items-start gap-3 text-sm text-nd-text-secondary"
                        >
                          <span className="w-1 h-1 rounded-full bg-nd-text-disabled mt-2 shrink-0" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tech */}
      <section id="tech" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            04 / Tech
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-12">
            How it&apos;s built
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-4">
            {techStack.map((tech) => (
              <div
                key={tech.name}
                className="bg-nd-surface border border-nd-border p-6"
              >
                <span className="font-mono text-[11px] tracking-[0.06em] uppercase text-nd-text-display block mb-2">
                  {tech.name}
                </span>
                <p className="text-sm text-nd-text-secondary">
                  {tech.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-nd-surface border border-nd-border p-6">
            <h3 className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-display mb-3">
              Why Go
            </h3>
            <p className="text-sm text-nd-text-secondary leading-relaxed">
              Single static binary, native concurrency, fast file-system
              operations, and trivial cross-compilation to Linux, macOS, and
              Windows. The same source compiles to every platform with a single{" "}
              <code className="font-mono text-nd-text-display">go build</code>{" "}
              flag flip — no Python interpreter, no Node runtime, no
              dependencies for end users to install.
            </p>
          </div>
        </div>
      </section>

      {/* Get it */}
      <section id="get-it" className="py-24 md:py-32">
        <div className="container px-4 mx-auto max-w-5xl text-center">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            05 / Get it
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-4">
            Two ways in.
          </h2>
          <p className="text-nd-text-secondary text-base max-w-lg mx-auto mb-10">
            Source is free and MIT-licensed. Paid binaries on Gumroad save you
            the build step and support continued development.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={PURCHASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-nd-text-display text-nd-black font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:opacity-80 min-h-[44px]"
            >
              <ShoppingCart className="w-4 h-4" />
              Buy on Gumroad
            </a>
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent border border-nd-border-visible text-nd-text-primary font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:border-nd-text-secondary min-h-[44px]"
            >
              <Github className="w-4 h-4" />
              Source on GitHub
            </a>
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent border border-nd-border-visible text-nd-text-primary font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:border-nd-text-secondary min-h-[44px]"
            >
              <ExternalLink className="w-4 h-4" />
              Project Site
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default FileDedupPage;
