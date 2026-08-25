"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download, ExternalLink, Mail, Shuffle } from "lucide-react";
import {
  commandFilters,
  contactLinks,
  originLines,
  problemBuilds,
  proofLoopSteps,
  workbenchItems,
} from "@/lib/homepage";
import { DotCutCanvas } from "@/components/dotcut/dotcut-canvas";
import styles from "./anomaly-home.module.css";

function HeroSignalPlate() {
  return (
    <div className={styles.heroSignalPlate} aria-hidden="true">
      <div className={styles.plateHeader}>
        <span>BUILD / VERIFY / SHIP</span>
        <span className={styles.hexStamp}>6c75</span>
      </div>
      <div className={styles.dotCut}>
        <DotCutCanvas />
      </div>
      <div className={styles.signalRail}>
        <span>APK</span>
        <svg viewBox="0 0 360 54" preserveAspectRatio="none" role="presentation">
          <path className={styles.signalGuide} d="M0 27H360" />
          <path className={styles.signalWave} d="M0 27h34V12h28v30h32V22h34v5h38V8h30v38h36V27h30V16h30v22h36V27h52" />
        </svg>
        <span>BIN</span>
      </div>
      <div className={styles.plateFooter}>
        <span>ANDROID · LINUX · RUNTIME</span>
        <span>OUTPUT / VERIFIED</span>
      </div>
    </div>
  );
}

function ProjectWorldAtlas({ plate }: { plate: string }) {
  return (
    <div className={styles.worldAtlas} aria-hidden="true">
      <div className={styles.atlasMeta}>
        <span>FIELD KIT / PLATE {plate}</span>
        <span>LU</span>
      </div>
      <svg viewBox="0 0 760 300" role="presentation">
        <path className={styles.atlasOrbit} d="M34 231C132 105 201 264 303 119S489 56 561 161s100 66 165-61" />
        <g className={styles.linuxDesk}>
          <rect x="38" y="65" width="238" height="145" rx="3" />
          <path d="M38 91h238M83 238h148M125 210v28M189 210v28" />
          <path className={styles.atlasAccent} d="M62 118h42v12H62zm0 27h111v12H62zm0 27h72v12H62z" />
          <path className={styles.atlasPaper} d="M226 111h23v23h-23zm-14 37h37v9h-37zm-26 26h63v9h-63z" />
        </g>
        <g className={styles.androidPhone}>
          <rect x="317" y="34" width="132" height="232" rx="18" />
          <path className={styles.atlasPaper} d="M360 52h46v7h-46zM337 82h92v42h-92zm0 57h92v20h-92zm0 34h43v62h-43zm49 0h43v62h-43z" />
          <circle className={styles.atlasAccent} cx="383" cy="249" r="7" />
        </g>
        <g className={styles.reverseLens}>
          <circle cx="565" cy="116" r="69" />
          <path d="M614 165l72 72M668 219l18 18" />
          <path className={styles.atlasPaper} d="M528 79h27v27h-27zm34 0h27v27h-27zm-34 34h27v27h-27zm34 34h27v27h-27z" />
          <path className={styles.atlasAccent} d="M562 113h27v27h-27z" />
        </g>
        <g className={styles.atlasSparks}>
          <path d="M291 45v23M280 56h23M476 210v30M461 225h30M688 54v24M676 66h24" />
        </g>
      </svg>
      <div className={styles.atlasLegend}>
        <span>LINUX / ROUTE</span><span>ANDROID / SHIP</span><span>REVERSE / READ</span>
      </div>
    </div>
  );
}

function OriginJourney() {
  return (
    <div className={styles.originJourney} aria-hidden="true">
      <div className={styles.journeyTag}><span>6c75</span><span>ORIGIN STORY / USEFUL CURIOSITY</span></div>
      <svg viewBox="0 0 620 330" role="presentation">
        <path className={styles.journeyRibbonShadow} d="M34 246C132 304 190 173 278 213s125 34 168-54 88-82 145-50" />
        <path className={styles.journeyRibbon} d="M34 232C132 290 190 159 278 199s125 34 168-54 88-82 145-50" />
        <g className={styles.controllerGlyph}>
          <path d="M54 84c8-29 27-42 58-42h84c31 0 50 13 58 42l20 85c5 23-5 41-24 41-13 0-22-7-31-22l-23-37h-84l-23 37c-9 15-18 22-31 22-19 0-29-18-24-41z" />
          <path className={styles.journeyPaper} d="M93 88h18V70h16v18h18v16h-18v18h-16v-18H93z" />
          <circle className={styles.journeyPaper} cx="214" cy="83" r="10" />
          <circle className={styles.journeyAccent} cx="234" cy="105" r="10" />
        </g>
        <g className={styles.openBoxGlyph}>
          <path d="M289 134l58-29 58 29-58 29zM289 134v73l58 31 58-31v-73M347 163v75" />
          <path className={styles.journeyAccent} d="M289 134l-28-39 57 11 29 57zm116 0l29-39-58 11-29 57z" />
          <path className={styles.journeyPaper} d="M328 130h38v12h-38zm9 20h20v12h-20z" />
        </g>
        <g className={styles.utilityGlyph}>
          <path d="M475 64h106v146H475z" />
          <path className={styles.journeyPaper} d="M494 84h68v20h-68zm0 40h46v12h-46zm0 23h68v12h-68zm0 23h54v12h-54z" />
          <path className={styles.journeyAccent} d="M553 190h28v20h-28z" />
        </g>
        <g className={styles.journeySparks}>
          <path d="M277 61v24M265 73h24M441 53v30M426 68h30M91 242v24M79 254h24" />
        </g>
      </svg>
      <div className={styles.journeyLegend}>
        <span>MOD</span><span>TAKE APART</span><span>SHIP THE USEFUL VERSION</span>
      </div>
    </div>
  );
}

export function AnomalyHome() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(problemBuilds[0].id);
  const selectedCaseRef = useRef<HTMLElement>(null);

  const visibleBuilds = useMemo(() => {
    const search = query.trim().toLowerCase();
    return problemBuilds.filter((build) => {
      const matchesFilter =
        activeFilter === "all" || build.filters.includes(activeFilter);
      const matchesSearch =
        !search ||
        [build.problem, build.buildName, build.summary, ...build.tech]
          .join(" ")
          .toLowerCase()
          .includes(search);
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, query]);

  const selected =
    visibleBuilds.find((build) => build.id === selectedId) ??
    visibleBuilds[0] ??
    problemBuilds[0];

  const chooseNext = () => {
    const pool = visibleBuilds.length ? visibleBuilds : problemBuilds;
    const alternatives = pool.filter((build) => build.id !== selected.id);
    const nextPool = alternatives.length ? alternatives : pool;
    const next = nextPool[Math.floor(Math.random() * nextPool.length)];
    setSelectedId(next.id);

    window.requestAnimationFrame(() => {
      const target = selectedCaseRef.current;
      if (!target) return;
      target.focus({ preventScroll: true });
      target.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "center",
      });
    });
  };

  return (
    <div className={styles.poster}>
      <section id="home" className={styles.hero} aria-labelledby="poster-title">
        <div className={styles.registrationFrame}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Lu / software engineer / issue 2026</p>
            <h1 id="poster-title">
              I get annoyed,
              <span>then I build</span>
              the missing thing.
            </h1>
            <p className={styles.intro}>
              AI-assisted execution across Android apps, Linux systems,
              reverse-engineering tools, automation, and utilities, turning
              messy technical work into verified shipped outcomes.
            </p>
            <div className={styles.actions}>
              <a href="#homebot" className={styles.primaryAction}>
                Explore HomeBot <ArrowRight aria-hidden="true" />
              </a>
              <button type="button" onClick={chooseNext} className={styles.secondaryAction}>
                Surprise me <Shuffle aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className={styles.posterMark}>
            <HeroSignalPlate />
          </div>
        </div>

        <ol className={styles.proofStrip} aria-label="Proof loop">
          {proofLoopSteps.map((step, index) => (
            <li key={step.label}>
              <span>{String(index + 1).padStart(2, "0")} / {step.label}</span>
              <p>{step.value}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="homebot" className={styles.homebotFeature} aria-labelledby="homebot-title">
        <div className={styles.sectionHeading}>
          <p>Open source / HomeBot / pre-v1</p>
          <h2 id="homebot-title">A home for persistent AI teammates.</h2>
          <p className={styles.homebotIntro}>
            Desktop, server, and Android clients for AI teammates that keep
            their conversations, routines, tools, and repository context under
            your control.
          </p>
          <div className={styles.actions}>
            <a href="https://github.com/luinbytes/HomeBot" target="_blank" rel="noopener noreferrer" className={styles.primaryAction}>
              View HomeBot on GitHub <ExternalLink aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className={styles.homebotCase}>
          <p className={styles.homebotStatus}>M6 / Packaging, Hardening &amp; v1 Parity Gate</p>
          <dl>
            <div><dt>Problem</dt><dd>Persistent AI teammates need a home that stays under your control.</dd></div>
            <div><dt>Build</dt><dd>An authenticated Rust HTTP/WebSocket server, native egui desktop, and Android client with Codex CLI, Claude Code, and OpenAI-compatible provider support.</dd></div>
            <div><dt>Outcome</dt><dd>Server-owned state keeps chats, tools, routines, and repository workspaces consistent across clients.</dd></div>
            <div><dt>Proof</dt><dd>Public source is in pre-v1 hardening. There are no supported release packages yet.</dd></div>
          </dl>
          <ul className={styles.homebotTech} aria-label="HomeBot technology">
            <li>Rust</li><li>egui</li><li>Android</li><li>HTTP</li><li>WebSocket</li>
          </ul>
        </div>
      </section>

      <section id="builds" className={styles.builds} aria-labelledby="builds-title">
        <div className={styles.sectionHeading}>
          <p>Project chapters / retained work</p>
          <h2 id="builds-title">Problems made tangible.</h2>
          <div className={styles.searchRow}>
            <label htmlFor="project-search">Search the print index</label>
            <input
              id="project-search"
              name="project-search"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Project, stack, or problem…"
            />
          </div>
          <ul className={styles.filters} aria-label="Filter projects">
            {[{ label: "All", value: "all" }, ...commandFilters].map((filter) => (
              <li key={filter.value}>
                <button
                  type="button"
                  aria-pressed={activeFilter === filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                >
                  {filter.label.replace("/", "")}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.projectIndex}>
          <ol data-build-list>
            {visibleBuilds.map((build) => (
              <li key={build.id}>
                <button
                  type="button"
                  aria-pressed={selected.id === build.id}
                  onClick={() => setSelectedId(build.id)}
                >
                  <span className={styles.projectNumber}>{build.index}</span>
                  <span>
                    <strong>{build.problem}</strong>
                    <small>{build.buildName} / {build.tech.join(" / ")}</small>
                  </span>
                  <ArrowRight aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
          {visibleBuilds.length === 0 && (
            <p className={styles.empty}>No projects match that print index.</p>
          )}
        </div>

        <article
          ref={selectedCaseRef}
          className={styles.selectedCase}
          aria-live="polite"
          aria-label={`Selected build: ${selected.buildName}`}
          tabIndex={-1}
        >
          <p>Active plate / {selected.index}</p>
          <h3>{selected.buildName}</h3>
          <p className={styles.selectedProblem}>{selected.summary}</p>
          <ProjectWorldAtlas plate={selected.index} />
          <dl>
            <div><dt>Problem</dt><dd>{selected.problem}</dd></div>
            <div><dt>Outcome</dt><dd>{selected.outcome}</dd></div>
            <div><dt>Proof</dt><dd>{selected.proof}</dd></div>
          </dl>
          <div className={styles.actions}>
            {selected.href.startsWith("http") ? (
              <a href={selected.href} target="_blank" rel="noopener noreferrer" className={styles.primaryAction}>
                Open project <ExternalLink aria-hidden="true" />
              </a>
            ) : (
              <Link href={selected.href} className={styles.primaryAction}>
                Open case <ArrowRight aria-hidden="true" />
              </Link>
            )}
            {selected.sourceHref && selected.sourceHref !== selected.href && (
              <a href={selected.sourceHref} target="_blank" rel="noopener noreferrer" className={styles.secondaryAction}>
                Source <ExternalLink aria-hidden="true" />
              </a>
            )}
          </div>
        </article>
      </section>

      <section id="about" className={styles.about} aria-labelledby="about-title">
        <div className={styles.sectionHeading}>
          <p>Origin / systems curiosity</p>
          <h2 id="about-title">Take apart. Understand. Rebuild.</h2>
        </div>
        <div className={styles.originNarrative}>
          <OriginJourney />
          <ol>
            {originLines.map((line, index) => (
              <li key={line}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{line}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="status" className={styles.status} aria-labelledby="status-title">
        <div className={styles.sectionHeading}>
          <p>Workbench / current state</p>
          <h2 id="status-title">Still building.</h2>
        </div>
        <dl>
          {workbenchItems.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="contact" className={styles.contact} aria-labelledby="contact-title">
        <div>
          <p className={styles.kicker}>Contact / handoff</p>
          <h2 id="contact-title">Send me a weird workflow.</h2>
          <p>If something is annoying enough to deserve a tool, I probably want to hear about it.</p>
        </div>
        <ul>
          {contactLinks.map((link) => {
            const external = link.external || link.href.startsWith("http");
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                >
                  {link.label}
                  {link.href.startsWith("mailto") ? <Mail aria-hidden="true" /> : <ExternalLink aria-hidden="true" />}
                </a>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
