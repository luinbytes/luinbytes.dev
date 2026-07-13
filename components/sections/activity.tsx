"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { ActivityCalendar } from "react-activity-calendar";
import { GitCommit, AlertCircle, RefreshCcw } from "lucide-react";
import { format } from "date-fns";
import { fetchWithRetry, fetchGitHub, clearCache, type ApiError } from "@/lib/api";

// GitHub API types
interface GitHubEvent {
  id: string;
  type: string;
  repo: { name: string };
  created_at: string;
  payload: {
    commits?: Array<{
      sha: string;
      message: string;
    }>;
  };
}

interface GitHubRepo {
  fork: boolean;
  language: string | null;
}

interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface ContributionsResponse {
  contributions: ContributionDay[];
}

interface CommitItem {
  id: string;
  repo: string;
  message: string;
  commitCount: number;
  commitUrl: string;
  date: string;
  type: string;
}

export function Activity() {
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [calendarData2026, setCalendarData2026] = useState<ContributionDay[]>([]);
  const [calendarData2025, setCalendarData2025] = useState<ContributionDay[]>([]);

  const [repoCount, setRepoCount] = useState<number>(0);
  const [languages, setLanguages] = useState<{ name: string; percentage: number; color: string }[]>([]);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [yearlyCommits, setYearlyCommits] = useState<number>(0);
  const [statsLoaded, setStatsLoaded] = useState<boolean>(false);

  const [eventsError, setEventsError] = useState<ApiError | null>(null);
  const [contributionsError, setContributionsError] = useState<ApiError | null>(null);
  const [reposError, setReposError] = useState<ApiError | null>(null);

  const languageColors = useMemo<Record<string, string>>(
    () => ({
      TypeScript: "var(--color-paper)",
      JavaScript: "var(--color-mustard)",
      Python: "var(--color-nd-text-secondary)",
      Rust: "var(--color-nd-text-display)",
      "C#": "var(--color-mustard)",
      Java: "var(--color-nd-text-secondary)",
      Go: "var(--color-paper)",
      Ruby: "var(--color-mustard)",
      PHP: "var(--color-nd-text-disabled)",
      CSS: "var(--color-nd-text-secondary)",
      HTML: "var(--color-paper)",
    }),
    []
  );

  const calculateLanguages = useCallback(
    (repos: GitHubRepo[]) => {
      const langCount: Record<string, number> = {};
      repos.forEach((repo) => {
        if (repo.language) {
          langCount[repo.language] = (langCount[repo.language] || 0) + 1;
        }
      });

      const total = Object.values(langCount).reduce((a, b) => a + b, 0);
      if (total === 0) return [];

      return Object.entries(langCount)
        .map(([lang, count]) => ({
          name: lang,
          percentage: Math.round((count / total) * 100),
          color: languageColors[lang] || "var(--color-nd-text-disabled)",
        }))
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 5);
    },
    [languageColors]
  );

  const calculateStreak = useCallback((contributions: ContributionDay[]) => {
    if (!contributions || contributions.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sorted = [...contributions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    for (const day of sorted) {
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (today.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === streak && day.count > 0) {
        streak++;
      } else if (daysDiff > streak) {
        break;
      }
    }

    return streak;
  }, []);

  // No JS scaling — calendars scroll horizontally on narrow screens

  const retryEventsRef = useRef<() => void>(() => {});
  const retryContributionsRef = useRef<() => void>(() => {});
  const retryReposRef = useRef<() => void>(() => {});

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        clearCache("https://api.github.com/users/luinbytes/events/public");
        const data = await fetchGitHub<GitHubEvent[]>(
          "/users/luinbytes/events/public",
          {
            cacheTTL: 5 * 60 * 1000,
            onRetry: (attempt) =>
              console.log(`Retrying events API (attempt ${attempt})`),
          }
        );

        const pushEvents = data
          .filter((event) => event.type === "PushEvent")
          .slice(0, 5)
          .map((event) => {
            const commits = event.payload.commits || [];
            const commitCount = commits.length;
            const firstCommit = commits[0];
            const commitMessage =
              firstCommit?.message?.split("\n")[0] || "Pushed updates";
            const commitUrl = firstCommit?.sha
              ? `https://github.com/${event.repo.name}/commit/${firstCommit.sha}`
              : `https://github.com/${event.repo.name}`;

            return {
              id: event.id,
              repo: event.repo.name,
              message: commitMessage,
              commitCount,
              commitUrl,
              date: format(new Date(event.created_at), "MMM d, yyyy"),
              type: "contribution",
            };
          });
        setCommits(pushEvents);
        setEventsError(null);
      } catch (err) {
        console.error("Failed to fetch events:", err);
        setEventsError(err as ApiError);
      }
    };

    const fetchContributions = async () => {
      try {
        clearCache("https://github-contributions-api.jogruber.de/v4/luinbytes?y=2026");
        clearCache("https://github-contributions-api.jogruber.de/v4/luinbytes?y=2025");
        const [data2026, data2025] = await Promise.all([
          fetchWithRetry<ContributionsResponse>(
            `https://github-contributions-api.jogruber.de/v4/luinbytes?y=2026`,
            {
              cacheTTL: 30 * 60 * 1000,
              onRetry: (attempt) =>
                console.log(
                  `Retrying 2026 contributions API (attempt ${attempt})`
                ),
            }
          ),
          fetchWithRetry<ContributionsResponse>(
            `https://github-contributions-api.jogruber.de/v4/luinbytes?y=2025`,
            {
              cacheTTL: 30 * 60 * 1000,
              onRetry: (attempt) =>
                console.log(
                  `Retrying 2025 contributions API (attempt ${attempt})`
                ),
            }
          ),
        ]);

        if (data2026.contributions) {
          const formatted: ContributionDay[] = data2026.contributions.map(
            (day) => ({
              date: day.date,
              count: day.count,
              level: day.level,
            })
          );
          setCalendarData2026(formatted);

          const streak = calculateStreak(formatted);
          setCurrentStreak(streak);

          const thisYearContributions = formatted.reduce(
            (sum, day) => sum + day.count,
            0
          );
          setYearlyCommits(thisYearContributions);
        }

        if (data2025.contributions) {
          const formatted: ContributionDay[] = data2025.contributions.map(
            (day) => ({
              date: day.date,
              count: day.count,
              level: day.level,
            })
          );
          setCalendarData2025(formatted);
        }

        setContributionsError(null);
      } catch (err) {
        console.error("Failed to fetch contributions:", err);
        setContributionsError(err as ApiError);
      }
    };

    const fetchRepos = async () => {
      try {
        clearCache("https://api.github.com/users/luinbytes/repos?per_page=100");
        const repos = await fetchGitHub<GitHubRepo[]>(
          "/users/luinbytes/repos?per_page=100",
          {
            cacheTTL: 30 * 60 * 1000,
            onRetry: (attempt) =>
              console.log(`Retrying repos API (attempt ${attempt})`),
          }
        );

        if (Array.isArray(repos)) {
          const ownRepos = repos.filter((repo) => !repo.fork);
          setRepoCount(ownRepos.length);

          const langs = calculateLanguages(ownRepos);
          setLanguages(langs);

          setStatsLoaded(true);
        }
        setReposError(null);
      } catch (err) {
        console.error("Failed to fetch repos:", err);
        setReposError(err as ApiError);
        setStatsLoaded(true);
      }
    };

    retryEventsRef.current = fetchEvents;
    retryContributionsRef.current = fetchContributions;
    retryReposRef.current = fetchRepos;

    fetchEvents();
    fetchContributions();
    fetchRepos();
  }, [calculateLanguages, calculateStreak]);

  // Canonical ink-and-paper contribution theme.
  const monoTheme = {
    light: [
      "var(--color-paper)",
      "var(--color-nd-text-secondary)",
      "var(--color-mustard)",
      "var(--color-nd-surface-raised)",
      "var(--color-ink)",
    ],
    dark: [
      "var(--color-dark-brown)",
      "var(--color-nd-surface)",
      "var(--color-mustard)",
      "var(--color-nd-text-secondary)",
      "var(--color-paper)",
    ],
  };

  return (
    <section id="activity" className="py-24 md:py-32 border-b border-nd-border">
      <div className="container px-4 mx-auto max-w-6xl grid lg:grid-cols-2 gap-16">
        {/* Left Column: Contributions */}
        <div>
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            06 / Activity
          </span>

          {/* 2026 Contributions */}
          <div className="bg-nd-surface border border-nd-border p-6 mb-4">
            <div className="flex justify-between items-end mb-4">
              <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-secondary">
                2026
              </span>
              <span className="font-mono text-[10px] text-nd-text-disabled">
                {calendarData2026.reduce((acc, curr) => acc + curr.count, 0)} contributions
              </span>
            </div>

            {contributionsError ? (
              <div className="h-[100px] flex flex-col items-center justify-center gap-3 text-center px-4">
                <div className="flex items-center gap-2 text-nd-accent">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-mono text-[11px] tracking-[0.06em] uppercase">
                    Failed to load
                  </span>
                </div>
                <button
                  onClick={() => retryContributionsRef.current()}
                  className="flex items-center gap-1.5 font-mono text-[10px] text-nd-interactive nd-transition"
                >
                  <RefreshCcw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            ) : calendarData2026.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <ActivityCalendar
                  data={calendarData2026}
                  theme={monoTheme}
                  labels={{
                    totalCount: "{{count}} contributions in {{year}}",
                  }}
                  colorScheme="dark"
                  blockSize={8}
                  blockMargin={2}
                  fontSize={10}
                />
              </div>
            ) : (
              <div className="h-[100px] flex items-center justify-center font-mono text-[11px] text-nd-text-disabled tracking-[0.08em] uppercase">
                [LOADING…]
              </div>
            )}
          </div>

          {/* 2025 Contributions */}
          <div className="bg-nd-surface border border-nd-border p-6 mb-10">
            <div className="flex justify-between items-end mb-4">
              <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-secondary">
                2025
              </span>
              <span className="font-mono text-[10px] text-nd-text-disabled">
                {calendarData2025.reduce((acc, curr) => acc + curr.count, 0)} contributions
              </span>
            </div>

            {calendarData2025.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <ActivityCalendar
                  data={calendarData2025}
                  theme={monoTheme}
                  labels={{
                    totalCount: "{{count}} contributions in {{year}}",
                  }}
                  colorScheme="dark"
                  blockSize={8}
                  blockMargin={2}
                  fontSize={10}
                />
              </div>
            ) : (
              <div className="h-[100px] flex items-center justify-center font-mono text-[11px] text-nd-text-disabled tracking-[0.08em] uppercase">
                [LOADING…]
              </div>
            )}
          </div>

          {/* Recent Commits */}
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            Recent Public Commits
          </span>
          {eventsError ? (
            <div className="border border-nd-accent/30 p-6 text-center">
              <div className="flex items-center justify-center gap-2 text-nd-accent mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="font-mono text-[11px] tracking-[0.06em] uppercase">
                  Failed to load commits
                </span>
              </div>
              <button
                onClick={() => retryEventsRef.current()}
                className="flex items-center gap-1.5 font-mono text-[10px] text-nd-interactive nd-transition mx-auto"
              >
                <RefreshCcw className="w-3 h-3" />
                Retry
              </button>
            </div>
          ) : commits.length > 0 ? (
            <div className="border-t border-nd-border">
              {commits.map((item) => (
                <a
                  key={item.id}
                  href={item.commitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4 group cursor-pointer py-3 border-b border-nd-border nd-transition hover:bg-nd-surface"
                >
                  <div className="mt-0.5 w-7 h-7 bg-nd-surface border border-nd-border flex items-center justify-center shrink-0 group-hover:border-nd-border-visible">
                    <GitCommit className="w-3 h-3 text-nd-text-secondary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-nd-text-primary text-sm font-medium group-hover:text-nd-text-display nd-transition truncate">
                      {item.message}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[11px] text-nd-text-secondary truncate">
                        {item.repo.replace("luinbytes/", "")}
                      </span>
                      {item.commitCount > 1 && (
                        <span className="font-mono text-[10px] text-nd-text-disabled border border-nd-border px-1 py-0.5">
                          +{item.commitCount - 1} more
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-nd-text-disabled mt-1 block">
                      {item.date}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="font-mono text-[11px] text-nd-text-disabled tracking-[0.06em] uppercase py-4">
              No recent public commits found.
            </p>
          )}
        </div>

        {/* Right Column: Quick Stats */}
        <div>
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            Quick Stats / Live
          </span>

          {reposError ? (
            <div className="bg-nd-surface border border-nd-border p-8 h-[300px] flex flex-col items-center justify-center gap-4">
              <div className="flex items-center gap-2 text-nd-accent">
                <AlertCircle className="w-5 h-5" />
                <span className="font-mono text-[11px] tracking-[0.06em] uppercase">
                  Failed to load stats
                </span>
              </div>
              <button
                onClick={() => retryReposRef.current()}
                className="flex items-center gap-1.5 px-4 py-2 border border-nd-border font-mono text-[11px] text-nd-interactive nd-transition"
              >
                <RefreshCcw className="w-3 h-3" />
                Retry
              </button>
            </div>
          ) : !statsLoaded ? (
            <div className="bg-nd-surface border border-nd-border p-8 h-[300px] flex items-center justify-center">
              <span className="font-mono text-[11px] text-nd-text-disabled tracking-[0.08em] uppercase">
                [LOADING…]
              </span>
            </div>
          ) : (
            <>
              {/* Hero stat cards */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-nd-surface border border-nd-border p-6 nd-transition hover:border-nd-border-visible">
                  <div className="font-display text-4xl font-bold text-nd-text-display mb-1 tracking-[-0.02em]">
                    {repoCount}
                  </div>
                  <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled">
                    Public Repos
                  </span>
                </div>
                <div className="bg-nd-surface border border-nd-border p-6 nd-transition hover:border-nd-border-visible">
                  <div className="font-display text-4xl font-bold text-nd-text-display mb-1 tracking-[-0.02em]">
                    {yearlyCommits}
                  </div>
                  <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled">
                    This Year
                  </span>
                </div>
              </div>

              {/* Language Breakdown — segmented progress bars */}
              <div className="bg-nd-surface border border-nd-border p-6 mb-4">
                <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
                  Top Languages
                </span>
                <div className="space-y-4">
                  {languages.map((lang, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-nd-text-secondary font-body">
                          {lang.name}
                        </span>
                        <span className="font-mono text-[11px] text-nd-text-disabled">
                          {lang.percentage}%
                        </span>
                      </div>
                      {/* Segmented progress bar */}
                      <div className="flex gap-[2px] h-1.5">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex-1"
                            style={{
                              background:
                                i / 20 < lang.percentage / 100
                                  ? "var(--color-nd-text-display)"
                                  : "var(--color-nd-border)",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Streak */}
              {currentStreak > 0 && (
                <div className="bg-nd-surface border border-nd-accent/30 p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-3xl font-bold text-nd-accent tracking-[-0.02em]">
                      {currentStreak}
                    </span>
                    <div>
                      <div className="text-sm text-nd-text-display font-medium font-body">
                        day streak
                      </div>
                      <div className="font-mono text-[10px] text-nd-text-disabled tracking-[0.06em] uppercase">
                        Keep the momentum going
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-6 border border-nd-border">
                <span className="text-nd-text-display text-sm font-medium font-body block mb-2">
                  Real-time data.
                </span>
                <p className="text-nd-text-secondary text-sm mb-4 font-body">
                  These stats are pulled live from the GitHub API.
                </p>
                <a
                  href="https://github.com/luinbytes"
                  target="_blank"
                  className="font-mono text-[11px] tracking-[0.06em] uppercase text-nd-interactive nd-transition"
                >
                  Visit GitHub Profile →
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
