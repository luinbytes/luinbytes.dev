"use client";

import {
  Activity,
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Cloud,
  CloudRain,
  Flag,
  Gauge,
  Home,
  Info,
  Lightbulb,
  Map as MapIcon,
  Moon,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Users,
  Volume2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import {
  bestLap,
  formatClock,
  formatGap,
  formatLapTime,
  lapsAt,
  latestAt,
  latestByDriver,
  loadFrameData,
  loadGatewayHealth,
  loadSeason,
  loadSessionData,
  loadTrackPath,
  type CarDataPoint,
  type Driver,
  type FrameData,
  type GatewayHealth,
  type Lap,
  type LocationPoint,
  type Meeting,
  type Session,
  type SessionData,
  type SessionResult,
  type Stint,
} from "@/lib/f1";
import { cn } from "@/lib/utils";
import styles from "./f1.module.css";

type View =
  | "live"
  | "calendar"
  | "replay"
  | "drivers"
  | "strategy"
  | "rooms"
  | "ai"
  | "settings"
  | "diagnostics";
type Theme = "dark" | "light" | "system";
type Effects = "full" | "balanced" | "reduced" | "reduced-motion";
type EventFilter = "all" | "race-control" | "radio";
type TimingSort = "position" | "last" | "gap" | "tyre" | "team";

interface Preferences {
  theme: Theme;
  effects: Effects;
  highContrast: boolean;
  favourites: number[];
  units: "metric" | "imperial";
}

interface TrackGeometry {
  path: string;
  project: (point: Pick<LocationPoint, "x" | "y">) => { x: number; y: number };
}

interface TimingRow {
  driver: Driver;
  result?: SessionResult;
  lap?: Lap;
  position: number;
  gap?: number | string | null;
  stint?: Stint;
  fastest?: Lap;
}

const CURRENT_YEAR = new Date().getUTCFullYear();
const PREFERENCES_KEY = "f1-command-centre:preferences";
const DEFAULT_PREFERENCES: Preferences = {
  theme: "dark",
  effects: "full",
  highContrast: false,
  favourites: [],
  units: "metric",
};
const SPEEDS = [1, 2, 5, 10] as const;

const NAV_ITEMS: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "live", label: "Live", icon: CircleGauge },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "replay", label: "Replay", icon: RotateCcw },
  { id: "drivers", label: "Drivers", icon: Users },
  { id: "strategy", label: "Strategy", icon: Lightbulb },
  { id: "rooms", label: "Rooms", icon: ShieldCheck },
  { id: "ai", label: "AI", icon: Bot },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "diagnostics", label: "Health", icon: Activity },
];

function trackGeometry(points: LocationPoint[]): TrackGeometry | null {
  if (points.length < 3) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const scale = Math.min(620 / width, 340 / height);
  const offsetX = (720 - width * scale) / 2;
  const offsetY = (420 - height * scale) / 2;
  const project = (point: Pick<LocationPoint, "x" | "y">) => ({
    x: offsetX + (point.x - minX) * scale,
    y: 420 - (offsetY + (point.y - minY) * scale),
  });
  const step = Math.max(1, Math.floor(points.length / 420));
  const sampled = points.filter((_, index) => index % step === 0);
  const path = sampled
    .map((point, index) => {
      const projected = project(point);
      return `${index ? "L" : "M"}${projected.x.toFixed(1)},${projected.y.toFixed(1)}`;
    })
    .join(" ");
  return { path, project };
}

function telemetryPath(points: CarDataPoint[], key: "speed" | "throttle" | "rpm") {
  if (points.length < 2) return "";
  const values = points.map((point) => point[key]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 600;
      const y = 130 - ((point[key] - min) / span) * 112;
      return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function raceEnd(laps: Lap[], session: Session) {
  const finish = laps.reduce((latest, lap) => {
    if (!lap.lap_duration) return latest;
    return Math.max(latest, Date.parse(lap.date_start) + lap.lap_duration * 1000);
  }, Date.parse(session.date_start));
  return Math.min(finish, Date.parse(session.date_end));
}

function sessionLabel(session: Session) {
  return `${session.location} / ${session.session_name}`;
}

function useSystemTheme(theme: Theme) {
  const [systemDark, setSystemDark] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return theme === "system" ? (systemDark ? "dark" : "light") : theme;
}

export default function F1CommandCentre() {
  const [view, setView] = useState<View>("live");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<SessionData | null>(null);
  const [trackPoints, setTrackPoints] = useState<LocationPoint[]>([]);
  const [frame, setFrame] = useState<FrameData | null>(null);
  const [selectedTime, setSelectedTime] = useState(0);
  const [selectedDrivers, setSelectedDrivers] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [timingSort, setTimingSort] = useState<TimingSort>("position");
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [frameLoading, setFrameLoading] = useState(false);
  const [gatewayHealth, setGatewayHealth] = useState<GatewayHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strategyLap, setStrategyLap] = useState(30);
  const [strategyCompound, setStrategyCompound] = useState("MEDIUM");
  const [timelinePulse, setTimelinePulse] = useState(0);
  const [now, setNow] = useState(0);
  const frameRequest = useRef(0);
  const shellRef = useRef<HTMLDivElement>(null);
  const resolvedTheme = useSystemTheme(preferences.theme);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(PREFERENCES_KEY);
        if (stored) {
          const saved = JSON.parse(stored) as Omit<Partial<Preferences>, "effects"> & {
            effects?: Effects | "motion";
          };
          if (saved.effects === "motion") saved.effects = "reduced-motion";
          setPreferences({ ...DEFAULT_PREFERENCES, ...saved } as Preferences);
        }
      } catch {
        // Defaults are a complete fallback when storage is blocked.
      } finally {
        setPreferencesReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      // Preferences remain usable for the current session.
    }
  }, [preferences, preferencesReady]);

  useEffect(() => {
    const node = shellRef.current;
    if (!node || preferences.effects === "reduced" || preferences.effects === "reduced-motion") return;
    let frameId = 0;
    const updateReflection = (event: PointerEvent) => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        node.style.setProperty("--liquid-x", `${(event.clientX / window.innerWidth) * 100}%`);
        node.style.setProperty("--liquid-y", `${(event.clientY / window.innerHeight) * 100}%`);
      });
    };
    node.addEventListener("pointermove", updateReflection, { passive: true });
    return () => {
      window.cancelAnimationFrame(frameId);
      node.removeEventListener("pointermove", updateReflection);
    };
  }, [loading, preferences.effects]);

  useEffect(() => {
    const controller = new AbortController();
    loadGatewayHealth(controller.signal)
      .then(setGatewayHealth)
      .catch(() => setGatewayHealth(null));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadSeason(CURRENT_YEAR, controller.signal)
      .then(({ meetings: nextMeetings, sessions: nextSessions }) => {
        const now = Date.now();
        const completed = nextSessions
          .filter((item) => Date.parse(item.date_end) < now)
          .sort((a, b) => Date.parse(b.date_end) - Date.parse(a.date_end));
        setMeetings(nextMeetings);
        setSessions(nextSessions);
        setSession(completed[0] ?? nextSessions[0] ?? null);
      })
      .catch((reason: unknown) => {
        if ((reason as Error).name !== "AbortError") {
          setError(reason instanceof Error ? reason.message : "Could not load the F1 season.");
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();

    loadSessionData(session.session_key, controller.signal)
      .then(async (nextData) => {
        if (!nextData.drivers.length || !nextData.laps.length) {
          throw new Error("This session has no published timing data yet.");
        }
        const winner = nextData.results.find((result) => result.position === 1)?.driver_number;
        const primary = winner ?? nextData.drivers[0].driver_number;
        const end = raceEnd(nextData.laps, session);
        const primaryEnd = nextData.laps.reduce((latest, lap) => {
          if (lap.driver_number !== primary || !lap.lap_duration) return latest;
          return Math.max(latest, Date.parse(lap.date_start) + lap.lap_duration * 1000);
        }, Date.parse(session.date_start));
        const outlineLap =
          nextData.laps.find(
            (lap) => lap.driver_number === primary && lap.lap_duration && lap.lap_number > 1,
          ) ?? bestLap(nextData.laps, primary);

        setData(nextData);
        setSelectedDrivers([primary]);
        setSelectedTime(Math.min(end, primaryEnd) - 1000);
        setStrategyLap(Math.max(2, Math.round((nextData.results[0]?.number_of_laps ?? 44) * 0.6)));
        if (outlineLap) {
          const points = await loadTrackPath(
            session.session_key,
            primary,
            outlineLap,
            controller.signal,
          );
          setTrackPoints(points);
        }
      })
      .catch((reason: unknown) => {
        if ((reason as Error).name !== "AbortError") {
          setError(reason instanceof Error ? reason.message : "Could not load session data.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [session]);

  const timelineStart = session ? Date.parse(session.date_start) : 0;
  const timelineEnd = useMemo(
    () => (session && data ? raceEnd(data.laps, session) : 0),
    [data, session],
  );

  useEffect(() => {
    if (!session || !data || !selectedTime || !selectedDrivers.length || !timelineEnd) return;
    const requestId = ++frameRequest.current;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setFrameLoading(true);
      loadFrameData(
        session.session_key,
        Math.min(selectedTime, timelineEnd),
        selectedDrivers,
        controller.signal,
      )
        .then((nextFrame) => {
          if (requestId === frameRequest.current) {
            setFrame(nextFrame);
            setError(null);
          }
        })
        .catch((reason: unknown) => {
          if ((reason as Error).name !== "AbortError" && requestId === frameRequest.current) {
            setError(reason instanceof Error ? reason.message : "Could not load replay frame.");
          }
        })
        .finally(() => {
          if (requestId === frameRequest.current) setFrameLoading(false);
        });
    }, playing ? 900 : 260);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [data, playing, selectedDrivers, selectedTime, session, timelineEnd]);

  useEffect(() => {
    if (!playing || !timelineEnd) return;
    const interval = window.setInterval(() => {
      setSelectedTime((current) => {
        const next = current + 250 * playbackSpeed;
        if (next >= timelineEnd) {
          setPlaying(false);
          return timelineEnd;
        }
        return next;
      });
    }, 250);
    return () => window.clearInterval(interval);
  }, [playing, playbackSpeed, timelineEnd]);

  const driverByNumber = useMemo(
    () => new Map(data?.drivers.map((driver) => [driver.driver_number, driver]) ?? []),
    [data],
  );
  const geometry = useMemo(() => trackGeometry(trackPoints), [trackPoints]);
  const currentLaps = useMemo(
    () => {
      if (!data) return new Map<number, Lap>();
      const maximum = new Map(
        data.results.map((result) => [result.driver_number, result.number_of_laps]),
      );
      return lapsAt(
        data.laps.filter(
          (lap) => lap.lap_number <= (maximum.get(lap.driver_number) ?? lap.lap_number),
        ),
        selectedTime,
      );
    },
    [data, selectedTime],
  );
  const currentPositions = useMemo(
    () => latestByDriver(frame?.positions ?? [], selectedTime + 2000),
    [frame, selectedTime],
  );
  const currentIntervals = useMemo(
    () => latestByDriver(frame?.intervals ?? [], selectedTime + 2000),
    [frame, selectedTime],
  );
  const currentLocations = useMemo(
    () => latestByDriver(frame?.locations ?? [], selectedTime + 2000),
    [frame, selectedTime],
  );
  const currentWeather = useMemo(
    () => (data ? latestAt(data.weather, selectedTime) ?? data.weather.at(-1) : undefined),
    [data, selectedTime],
  );

  const fastestByDriver = useMemo(() => {
    const fastest = new Map<number, Lap>();
    for (const lap of data?.laps ?? []) {
      if (!lap.lap_duration) continue;
      const current = fastest.get(lap.driver_number);
      if (!current?.lap_duration || lap.lap_duration < current.lap_duration) {
        fastest.set(lap.driver_number, lap);
      }
    }
    return fastest;
  }, [data]);

  const stintsByDriver = useMemo(() => {
    const grouped = new Map<number, Stint[]>();
    for (const stint of data?.stints ?? []) {
      const driverStints = grouped.get(stint.driver_number) ?? [];
      driverStints.push(stint);
      grouped.set(stint.driver_number, driverStints);
    }
    return grouped;
  }, [data]);

  const timingRows = useMemo<TimingRow[]>(() => {
    if (!data) return [];
    const resultByDriver = new Map(data.results.map((result) => [result.driver_number, result]));
    const favourites = new Set(preferences.favourites);
    return data.drivers
      .map((driver) => {
        const result = resultByDriver.get(driver.driver_number);
        const lap = currentLaps.get(driver.driver_number);
        const position = currentPositions.get(driver.driver_number)?.position ?? result?.position ?? 99;
        const interval = currentIntervals.get(driver.driver_number);
        const stint = stintsByDriver.get(driver.driver_number)?.find(
          (item) =>
            lap &&
            item.lap_start <= lap.lap_number &&
            item.lap_end >= lap.lap_number,
        );
        return {
          driver,
          result,
          lap,
          position,
          gap: interval?.gap_to_leader ?? result?.gap_to_leader,
          stint,
          fastest: fastestByDriver.get(driver.driver_number),
        };
      })
      .sort((a, b) => {
        const favouriteOrder = Number(favourites.has(b.driver.driver_number)) - Number(favourites.has(a.driver.driver_number));
        if (favouriteOrder) return favouriteOrder;
        if (timingSort === "last") return (a.lap?.lap_duration ?? Infinity) - (b.lap?.lap_duration ?? Infinity);
        if (timingSort === "gap") return Number(a.gap ?? Infinity) - Number(b.gap ?? Infinity);
        if (timingSort === "tyre") {
          const aAge = a.stint && a.lap ? a.lap.lap_number - a.stint.lap_start + a.stint.tyre_age_at_start : Infinity;
          const bAge = b.stint && b.lap ? b.lap.lap_number - b.stint.lap_start + b.stint.tyre_age_at_start : Infinity;
          return aAge - bAge;
        }
        if (timingSort === "team") return a.driver.team_name.localeCompare(b.driver.team_name);
        return a.position - b.position;
      });
  }, [currentIntervals, currentLaps, currentPositions, data, fastestByDriver, preferences.favourites, stintsByDriver, timingSort]);

  const events = useMemo(() => {
    if (!data) return [];
    const controls = data.raceControl.map((event, index) => ({
      id: `control-${index}`,
      type: "race-control" as const,
      date: event.date,
      lap: event.lap_number,
      title: event.flag || event.category,
      detail: event.message,
      driverNumber: event.driver_number,
      audio: null,
    }));
    const radios = data.radio.map((event, index) => ({
      id: `radio-${index}`,
      type: "radio" as const,
      date: event.date,
      lap: null,
      title: `${driverByNumber.get(event.driver_number)?.name_acronym ?? event.driver_number} radio`,
      detail: "Official team radio audio",
      driverNumber: event.driver_number,
      audio: event.recording_url,
    }));
    return [...controls, ...radios].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  }, [data, driverByNumber]);

  const visibleEvents = useMemo(
    () =>
      events
        .filter((event) => Date.parse(event.date) <= selectedTime)
        .filter((event) => eventFilter === "all" || event.type === eventFilter)
        .slice(-14)
        .reverse(),
    [eventFilter, events, selectedTime],
  );

  const selectedTelemetry = useMemo(
    () =>
      selectedDrivers.map((driverNumber) => ({
        driver: driverByNumber.get(driverNumber),
        points: (frame?.telemetry ?? [])
          .filter((point) => point.driver_number === driverNumber)
          .sort((a, b) => Date.parse(a.date) - Date.parse(b.date)),
      })),
    [driverByNumber, frame, selectedDrivers],
  );

  const toggleDriver = useCallback((driverNumber: number) => {
    setSelectedDrivers((current) => {
      if (current.includes(driverNumber)) {
        return current.length === 1 ? current : current.filter((number) => number !== driverNumber);
      }
      return current.length < 2 ? [...current, driverNumber] : [current[0], driverNumber];
    });
  }, []);

  const seekTo = useCallback(
    (time: number) => {
      setPlaying(false);
      setSelectedTime(Math.min(timelineEnd, Math.max(timelineStart, time)));
      setTimelinePulse((current) => current + 1);
    },
    [timelineEnd, timelineStart],
  );

  const jumpEvent = (direction: -1 | 1) => {
    const eventTimes = events.map((event) => Date.parse(event.date));
    const candidate =
      direction < 0
        ? eventTimes.filter((time) => time < selectedTime - 500).at(-1)
        : eventTimes.find((time) => time > selectedTime + 500);
    if (candidate) seekTo(candidate);
  };

  const setPreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    setPreferences((current) => ({ ...current, [key]: value }));

  const toggleFavourite = (driverNumber: number) => {
    setPreferences((current) => ({
      ...current,
      favourites: current.favourites.includes(driverNumber)
        ? current.favourites.filter((number) => number !== driverNumber)
        : [...current.favourites, driverNumber],
    }));
  };

  const chooseSession = (next: Session) => {
    setLoading(true);
    setError(null);
    setData(null);
    setFrame(null);
    setTrackPoints([]);
    setSession(next);
  };

  const navigation = (
    <nav className={styles.nav} aria-label="F1 Command Centre">
      <Link className={styles.brand} href="/" aria-label="Return to luinbytes.dev">
        <span className={styles.brandMark}>F1</span>
        <span className={styles.brandText}>Command<br />Centre</span>
      </Link>
      <div className={styles.navItems}>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            className={cn(styles.navButton, view === id && styles.navButtonActive)}
            key={id}
            onClick={() => setView(id)}
            type="button"
            aria-label={label}
            aria-pressed={view === id}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className={styles.sourceBadge}>
        <span className={cn(styles.statusDot, error && styles.statusDotError)} />
        <span>OpenF1<br />historical</span>
      </div>
    </nav>
  );

  if (loading) {
    return (
      <div ref={shellRef} className={styles.shell} data-theme={resolvedTheme} data-effects={preferences.effects}>
        {navigation}
        <div className={styles.loadingWorkspace} role="status" aria-live="polite">
          <header className={styles.loadingBar}>
            <div>
              <span>F1 Command Centre</span>
              <strong>Preparing race workspace</strong>
            </div>
            <span className={styles.loadingStatus}>OpenF1 / {CURRENT_YEAR}</span>
          </header>
          <section className={styles.loadingGrid} aria-hidden="true">
            <div className={styles.loadingTower}>
              <span className={styles.loadingLabel}>Classification</span>
              {Array.from({ length: 8 }, (_, index) => (
                <i key={index} style={{ "--row": index } as CSSProperties} />
              ))}
            </div>
            <div className={styles.loadingTrack}>
              <span className={styles.loadingLabel}>Track position</span>
              <svg viewBox="0 0 320 220" role="presentation">
                <path d="M70 181c-23-32 6-55 45-53 32 2 47-16 34-42-13-27-1-49 24-59 30-12 59 9 56 37-3 27 8 35 32 47 26 13 30 45 8 62-21 16-49 9-67-8-18-16-37-9-55 13-24 30-58 29-77 3Z" />
              </svg>
              <div className={styles.loadingDriver}><b>--</b><span>Loading race trace</span></div>
            </div>
            <div className={styles.loadingEvents}>
              <span className={styles.loadingLabel}>Shared timeline</span>
              {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
            </div>
            <div className={styles.loadingTelemetry}>
              <span className={styles.loadingLabel}>Telemetry</span>
              <div className={styles.loadingGraph} />
            </div>
          </section>
          <p className={styles.loadingCopy}>Connecting race state</p>
        </div>
      </div>
    );
  }

  if (!session || !data) {
    return (
      <div ref={shellRef} className={styles.shell} data-theme={resolvedTheme} data-effects={preferences.effects}>
        {navigation}
        <div className={styles.errorState} role="alert">
          <WifiOff aria-hidden="true" />
          <h1>Race state unavailable</h1>
          <p>{error ?? "No completed session is available."}</p>
          <button type="button" onClick={() => window.location.reload()}>Retry connection</button>
        </div>
      </div>
    );
  }

  const selectedLap = currentLaps.get(selectedDrivers[0]);
  const primaryDriver = driverByNumber.get(selectedDrivers[0]);
  const meeting = meetings.find((item) => item.meeting_key === session.meeting_key);
  const focusLocation = currentLocations.get(selectedDrivers.at(-1) ?? selectedDrivers[0]);
  const focusPoint = geometry && focusLocation ? geometry.project(focusLocation) : null;
  const timelinePosition = timelineEnd > timelineStart
    ? ((selectedTime - timelineStart) / (timelineEnd - timelineStart)) * 100
    : 0;

  return (
    <div
      ref={shellRef}
      className={cn(styles.shell, preferences.highContrast && styles.highContrast)}
      data-theme={resolvedTheme}
      data-effects={preferences.effects}
    >
      {navigation}

      <header className={styles.sessionBar}>
        <div className={styles.sessionIdentity}>
          <span className={styles.livePill}>{view === "live" ? "REPLAY" : view.toUpperCase()}</span>
          <div>
            <strong>{meeting?.meeting_name ?? session.location}</strong>
            <span>{session.session_name} / {session.circuit_short_name}</span>
          </div>
        </div>
        <div className={styles.sessionClock}>
          <span>RACE TIME</span>
          <strong>{formatClock(selectedTime, timelineStart)}</strong>
          <span>LAP {selectedLap?.lap_number ?? 0} / {data.results[0]?.number_of_laps ?? 0}</span>
        </div>
        <div className={styles.weatherStrip}>
          {currentWeather?.rainfall ? <CloudRain aria-hidden="true" /> : <Cloud aria-hidden="true" />}
          <span>{currentWeather?.air_temperature?.toFixed(1) ?? "--"}° air</span>
          <span>{currentWeather?.track_temperature?.toFixed(1) ?? "--"}° track</span>
          <span>{currentWeather?.wind_speed?.toFixed(1) ?? "--"} m/s</span>
        </div>
        <select
          className={styles.sessionSelect}
          value={session.session_key}
          onChange={(event) => {
            const next = sessions.find((item) => item.session_key === Number(event.target.value));
            if (next) chooseSession(next);
          }}
          aria-label="Select completed session"
        >
          {sessions
            .filter((item) => Date.parse(item.date_end) < now)
            .slice()
            .reverse()
            .slice(0, 24)
            .map((item) => (
              <option key={item.session_key} value={item.session_key}>{sessionLabel(item)}</option>
            ))}
        </select>
      </header>

      <main className={styles.workspace}>
        {(view === "live" || view === "replay") && (
          <>
            <section className={cn(styles.panel, styles.trackPanel)} aria-labelledby="track-title">
              <div className={styles.panelHeader}>
                <div>
                  <span>Track position / sourced</span>
                  <h1 id="track-title">{session.circuit_short_name}</h1>
                </div>
                <div className={styles.panelActions}>
                  <span className={styles.dataFreshness}><Wifi aria-hidden="true" /> replay frame</span>
                  {frameLoading && <span className={styles.syncing}>syncing</span>}
                </div>
              </div>
              <div className={styles.trackStage}>
                <div className={styles.trackGlow} />
                {focusPoint && (
                  <span
                    className={styles.selectionPull}
                    key={`track-${selectedDrivers.join("-")}`}
                    style={{
                      "--pull-x": `${(focusPoint.x / 720) * 100}%`,
                      "--pull-y": `${(focusPoint.y / 420) * 100}%`,
                    } as CSSProperties}
                    aria-hidden="true"
                  />
                )}
                {geometry ? (
                  <svg viewBox="0 0 720 420" role="img" aria-label={`Driver positions around ${session.circuit_short_name}`}>
                    <defs>
                      <filter id="track-glow"><feGaussianBlur stdDeviation="5" /></filter>
                      <linearGradient id="track-gradient" x1="0" x2="1">
                        <stop offset="0" stopColor="var(--f1-cyan)" />
                        <stop offset="0.52" stopColor="var(--f1-white)" />
                        <stop offset="1" stopColor="var(--f1-lime)" />
                      </linearGradient>
                    </defs>
                    <path className={styles.trackShadow} d={`${geometry.path} Z`} />
                    <path className={styles.trackLine} d={`${geometry.path} Z`} />
                    {Array.from(currentLocations.values()).map((point) => {
                      const driver = driverByNumber.get(point.driver_number);
                      if (!driver) return null;
                      const projected = geometry.project(point);
                      const selected = selectedDrivers.includes(point.driver_number);
                      return (
                        <g
                          className={cn(styles.driverMarker, selected && styles.driverMarkerSelected)}
                          key={point.driver_number}
                          transform={`translate(${projected.x} ${projected.y})`}
                          role="button"
                          tabIndex={0}
                          aria-label={`Select ${driver.full_name}`}
                          onClick={() => toggleDriver(point.driver_number)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") toggleDriver(point.driver_number);
                          }}
                        >
                          <circle r={selected ? 17 : 12} fill={`#${driver.team_colour}`} />
                          <text y="4">{driver.name_acronym.slice(0, 2)}</text>
                        </g>
                      );
                    })}
                  </svg>
                ) : (
                  <div className={styles.emptyPanel}><MapIcon aria-hidden="true" />Building circuit trace</div>
                )}
                <div className={styles.trackTelemetry}>
                  <span>{primaryDriver?.name_acronym ?? "--"}</span>
                  <strong>{selectedTelemetry[0]?.points.at(-1)?.speed ?? 0}<small> km/h</small></strong>
                  <em>Selected car / sourced telemetry</em>
                </div>
                <div className={styles.mapLegend}>
                  <span><i className={styles.legendSelected} /> Selected</span>
                  <span><i className={styles.legendField} /> Field</span>
                  <span><i className={styles.legendFinish} /> Start / finish</span>
                </div>
              </div>
            </section>

            <section className={cn(styles.panel, styles.timingPanel)} aria-labelledby="timing-title">
              <div className={styles.panelHeader}>
                <div>
                  <span>Classification / lap {selectedLap?.lap_number ?? 0}</span>
                  <h2 id="timing-title">Timing tower</h2>
                </div>
                <div className={styles.timingTools}>
                  <button
                    type="button"
                    className={styles.pinButton}
                    aria-label={preferences.favourites.includes(selectedDrivers[0]) ? "Unpin selected driver" : "Pin selected driver"}
                    aria-pressed={preferences.favourites.includes(selectedDrivers[0])}
                    onClick={() => toggleFavourite(selectedDrivers[0])}
                  >
                    <Star aria-hidden="true" />
                  </button>
                  <select aria-label="Sort timing tower" value={timingSort} onChange={(event) => setTimingSort(event.target.value as TimingSort)}>
                    <option value="position">Position</option>
                    <option value="last">Last lap</option>
                    <option value="gap">Gap</option>
                    <option value="tyre">Tyre age</option>
                    <option value="team">Team</option>
                  </select>
                  <span className={styles.compareCount}>{selectedDrivers.length}/2</span>
                </div>
              </div>
              <div className={styles.timingHead} aria-hidden="true">
                <span>POS</span><span>DRIVER</span><span>TYRE</span><span>LAST</span><span>GAP</span>
              </div>
              <div className={styles.timingRows}>
                {timingRows.map(({ driver, result, lap, position, gap, stint, fastest }) => (
                  <button
                    type="button"
                    className={cn(
                      styles.timingRow,
                      selectedDrivers.includes(driver.driver_number) && styles.timingRowSelected,
                      result?.dnf && styles.timingRowRetired,
                    )}
                    key={driver.driver_number}
                    onClick={() => toggleDriver(driver.driver_number)}
                    aria-pressed={selectedDrivers.includes(driver.driver_number)}
                  >
                    <strong>{position === 99 ? "-" : position}</strong>
                    <span className={styles.driverCell} style={{ "--team": `#${driver.team_colour}` } as CSSProperties}>
                      <b>{driver.name_acronym}</b><small>{driver.team_name}</small>
                    </span>
                    <span className={styles.tyreCell} data-compound={stint?.compound?.toLowerCase()}>
                      {stint?.compound?.slice(0, 1) ?? "-"}<small>{stint && lap ? lap.lap_number - stint.lap_start + stint.tyre_age_at_start : 0}L</small>
                    </span>
                    <span>{formatLapTime(lap?.lap_duration)}<small>best {formatLapTime(fastest?.lap_duration)}</small></span>
                    <span>{result?.dnf ? "OUT" : formatGap(gap)}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className={cn(styles.panel, styles.telemetryPanel)} aria-labelledby="telemetry-title">
              <span
                className={styles.telemetryReceive}
                key={`telemetry-${selectedDrivers.join("-")}`}
                aria-hidden="true"
              />
              <div className={styles.panelHeader}>
                <div>
                  <span>Telemetry / {selectedDrivers.length === 2 ? "comparison" : "focus"}</span>
                  <h2 id="telemetry-title">{selectedTelemetry.map((item) => item.driver?.name_acronym).join(" vs ")}</h2>
                </div>
                <Gauge aria-hidden="true" />
              </div>
              <div className={styles.metricGrid}>
                {selectedTelemetry.slice(0, 1).map(({ points }) => {
                  const latest = points.at(-1);
                  return (
                    <div className={styles.metrics} key="primary-metrics">
                      <span><small>Speed</small><strong>{latest?.speed ?? 0}</strong><em>km/h</em></span>
                      <span><small>Throttle</small><strong>{latest?.throttle ?? 0}</strong><em>%</em></span>
                      <span><small>Brake</small><strong>{latest?.brake ? "ON" : "OFF"}</strong><em>state</em></span>
                      <span><small>Gear</small><strong>{latest?.n_gear ?? 0}</strong><em>selected</em></span>
                      <span><small>RPM</small><strong>{latest?.rpm ?? 0}</strong><em>engine</em></span>
                      <span><small>DRS</small><strong>{(latest?.drs ?? 0) >= 10 ? "OPEN" : "CLOSED"}</strong><em>state</em></span>
                    </div>
                  );
                })}
                <div className={styles.traceChart}>
                  <svg viewBox="0 0 600 150" preserveAspectRatio="none" aria-label="Speed telemetry trace">
                    <g className={styles.chartGrid}><path d="M0 25H600M0 75H600M0 125H600" /></g>
                    {selectedTelemetry.map(({ driver, points }) => (
                      <path
                        className={styles.traceLine}
                        d={telemetryPath(points, "speed")}
                        key={driver?.driver_number}
                        style={{ stroke: `#${driver?.team_colour ?? "ffffff"}` }}
                      />
                    ))}
                  </svg>
                  <span>Speed trace / 14 second frame</span>
                </div>
              </div>
            </section>

            <section className={cn(styles.panel, styles.eventsPanel)} aria-labelledby="events-title">
              <div className={styles.panelHeader}>
                <div>
                  <span>Shared timeline events</span>
                  <h2 id="events-title">Radio + race control</h2>
                </div>
                <Volume2 aria-hidden="true" />
              </div>
              <div className={styles.segmented}>
                {(["all", "race-control", "radio"] as EventFilter[]).map((filter) => (
                  <button key={filter} type="button" onClick={() => setEventFilter(filter)} aria-pressed={eventFilter === filter}>
                    {filter === "race-control" ? "Control" : filter}
                  </button>
                ))}
                <select value={audioSpeed} onChange={(event) => setAudioSpeed(Number(event.target.value))} aria-label="Radio playback speed">
                  <option value={1}>1x audio</option><option value={1.25}>1.25x</option><option value={1.5}>1.5x</option><option value={2}>2x</option>
                </select>
              </div>
              <div className={styles.eventList}>
                {visibleEvents.map((event) => (
                  <article className={styles.eventItem} key={event.id}>
                    <button type="button" onClick={() => seekTo(Date.parse(event.date))}>
                      {event.type === "radio" ? <Radio aria-hidden="true" /> : <Flag aria-hidden="true" />}
                      <span><strong>{event.title}</strong><small>{new Date(event.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}{event.lap ? ` / lap ${event.lap}` : ""}</small></span>
                      <p>{event.detail}</p>
                    </button>
                    {event.audio && (
                      <audio controls preload="none" src={event.audio} onLoadedMetadata={(e) => { e.currentTarget.playbackRate = audioSpeed; }}>
                        Official team radio audio
                      </audio>
                    )}
                  </article>
                ))}
                {!visibleEvents.length && <div className={styles.emptyPanel}>No events before this timestamp</div>}
              </div>
            </section>
          </>
        )}

        {view === "calendar" && (
          <CalendarView meetings={meetings} sessions={sessions} now={now} onSelect={(next) => { chooseSession(next); setView("live"); }} />
        )}
        {view === "drivers" && (
          <DriversView rows={timingRows} selected={selectedDrivers} onSelect={toggleDriver} />
        )}
        {view === "strategy" && (
          <StrategyView
            data={data}
            driver={primaryDriver}
            lap={strategyLap}
            compound={strategyCompound}
            onLap={setStrategyLap}
            onCompound={setStrategyCompound}
          />
        )}
        {view === "rooms" && <RoomsView />}
        {view === "ai" && <AiView data={data} selectedDrivers={selectedDrivers} />}
        {view === "settings" && (
          <SettingsView preferences={preferences} setPreference={setPreference} />
        )}
        {view === "diagnostics" && (
          <DiagnosticsView data={data} frame={frame} error={error} gateway={gatewayHealth} session={session} trackPoints={trackPoints} />
        )}
      </main>

      {(view === "live" || view === "replay") && (
        <footer className={styles.timeline}>
          <div className={styles.playControls}>
            <button type="button" onClick={() => jumpEvent(-1)} aria-label="Previous event"><ChevronLeft /></button>
            <button className={styles.playButton} type="button" onClick={() => setPlaying((current) => !current)} aria-label={playing ? "Pause replay" : "Play replay"}>
              {playing ? <Pause /> : <Play />}
            </button>
            <button type="button" onClick={() => jumpEvent(1)} aria-label="Next event"><ChevronRight /></button>
          </div>
          <span className={styles.timelineTime}>{new Date(selectedTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          <div className={styles.scrubber}>
            <span
              className={styles.timelineWave}
              key={`timeline-${timelinePulse}`}
              style={{ left: `${timelinePosition}%` }}
              aria-hidden="true"
            />
            <input
              type="range"
              min={timelineStart}
              max={timelineEnd}
              step={1000}
              value={selectedTime}
              onChange={(event) => { setPlaying(false); setSelectedTime(Number(event.target.value)); }}
              aria-label="Shared race timeline"
            />
            <div className={styles.eventTicks} aria-hidden="true">
              {events.filter((_, index) => index % 8 === 0).map((event) => (
                <i key={event.id} style={{ left: `${((Date.parse(event.date) - timelineStart) / (timelineEnd - timelineStart)) * 100}%` }} />
              ))}
            </div>
          </div>
          <select value={playbackSpeed} onChange={(event) => setPlaybackSpeed(Number(event.target.value) as (typeof SPEEDS)[number])} aria-label="Replay speed">
            {SPEEDS.map((speed) => <option key={speed} value={speed}>{speed}x</option>)}
          </select>
          <span className={styles.timelineEnd}>{formatClock(timelineEnd, timelineStart)}</span>
        </footer>
      )}

      {error && data && (
        <div className={styles.toast} role="status"><Info aria-hidden="true" /><span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Dismiss"><X /></button></div>
      )}
    </div>
  );
}

function CalendarView({ meetings, sessions, now, onSelect }: { meetings: Meeting[]; sessions: Session[]; now: number; onSelect: (session: Session) => void }) {
  return (
    <section className={cn(styles.panel, styles.fullView)}>
      <div className={styles.viewIntro}><span>2026 championship</span><h1>Race calendar</h1><p>Times are shown in your local timezone. Select any completed session to load its real timing, telemetry, radio, and race-control archive.</p></div>
      <div className={styles.calendarGrid}>
        {meetings.filter((meeting) => meeting.meeting_name !== "Pre-Season Testing").map((meeting, index) => {
          const meetingSessions = sessions.filter((session) => session.meeting_key === meeting.meeting_key);
          const race = meetingSessions.find((item) => item.session_name === "Race");
          const completed = race && Date.parse(race.date_end) < now;
          return (
            <article key={meeting.meeting_key} className={cn(styles.calendarCard, completed && styles.calendarComplete)}>
              <span>R{String(index + 1).padStart(2, "0")}</span>
              <time>{new Date(meeting.date_start).toLocaleDateString([], { day: "2-digit", month: "short" })}</time>
              <h2>{meeting.country_name}</h2><p>{meeting.circuit_short_name}</p>
              <div>{meetingSessions.map((item) => <button disabled={Date.parse(item.date_end) >= now} key={item.session_key} onClick={() => onSelect(item)} type="button">{item.session_name}</button>)}</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DriversView({ rows, selected, onSelect }: { rows: TimingRow[]; selected: number[]; onSelect: (number: number) => void }) {
  return (
    <section className={cn(styles.panel, styles.fullView)}>
      <div className={styles.viewIntro}><span>Session field</span><h1>Drivers</h1><p>Select up to two drivers. The same selection follows you into timing, map, telemetry, replay, and strategy.</p></div>
      <div className={styles.driverGrid}>{rows.map(({ driver, result, fastest }) => (
        <button className={cn(styles.driverCard, selected.includes(driver.driver_number) && styles.driverCardSelected)} type="button" key={driver.driver_number} onClick={() => onSelect(driver.driver_number)}>
          <span className={styles.driverNumber} style={{ color: `#${driver.team_colour}` }}>{driver.driver_number}</span><div><small>{driver.team_name}</small><h2>{driver.first_name}<br /><strong>{driver.last_name}</strong></h2></div><dl><div><dt>Finish</dt><dd>{result?.dnf ? "DNF" : `P${result?.position ?? "-"}`}</dd></div><div><dt>Fastest</dt><dd>{formatLapTime(fastest?.lap_duration)}</dd></div><div><dt>Points</dt><dd>{result?.points ?? 0}</dd></div></dl>
        </button>
      ))}</div>
    </section>
  );
}

function StrategyView({ data, driver, lap, compound, onLap, onCompound }: { data: SessionData; driver?: Driver; lap: number; compound: string; onLap: (lap: number) => void; onCompound: (compound: string) => void }) {
  const totalLaps = data.results[0]?.number_of_laps ?? 44;
  const result = data.results.find((item) => item.driver_number === driver?.driver_number);
  const averageLap = data.laps.filter((item) => item.driver_number === driver?.driver_number && item.lap_duration && !item.is_pit_out_lap).reduce((sum, item, _, values) => sum + (item.lap_duration ?? 0) / values.length, 0);
  const pitLoss = 22.4;
  const tyrePenalty = compound === "SOFT" ? 0.18 : compound === "HARD" ? 0.46 : 0.3;
  const lapsRemaining = Math.max(0, totalLaps - lap);
  const estimatedLoss = pitLoss + tyrePenalty * Math.max(0, lapsRemaining - (compound === "SOFT" ? 14 : compound === "MEDIUM" ? 24 : 34));
  const positionsLost = Math.max(1, Math.round(estimatedLoss / 2.3));
  return (
    <section className={cn(styles.panel, styles.fullView)}>
      <div className={styles.viewIntro}><span>Derived model / not official</span><h1>Strategy desk</h1><p>Explore a transparent pit-stop scenario built from this session&apos;s lap count and the selected driver&apos;s observed pace.</p></div>
      <div className={styles.strategyLayout}>
        <div className={styles.strategyControls}><label>Pit on lap <strong>{lap}</strong><input type="range" min={2} max={Math.max(3, totalLaps - 1)} value={lap} onChange={(event) => onLap(Number(event.target.value))} /></label><fieldset><legend>Fit compound</legend>{["SOFT", "MEDIUM", "HARD"].map((item) => <button type="button" aria-pressed={compound === item} key={item} onClick={() => onCompound(item)}>{item}</button>)}</fieldset><div className={styles.strategyDriver}><span style={{ background: `#${driver?.team_colour ?? "fff"}` }} /><div><small>Scenario car</small><strong>{driver?.full_name ?? "Select a driver"}</strong></div></div></div>
        <div className={styles.strategyOutput}><span>Projected outcome</span><div className={styles.strategyHero}><small>Estimated rejoin</small><strong>P{Math.min(22, (result?.position ?? 1) + positionsLost)}</strong><em>range P{Math.max(1, (result?.position ?? 1) + positionsLost - 1)} to P{Math.min(22, (result?.position ?? 1) + positionsLost + 2)}</em></div><dl><div><dt>Modelled stop loss</dt><dd>{pitLoss.toFixed(1)}s</dd></div><div><dt>Estimated impact</dt><dd>+{estimatedLoss.toFixed(1)}s</dd></div><div><dt>Observed average</dt><dd>{formatLapTime(averageLap || null)}</dd></div><div><dt>Confidence</dt><dd>42% / low</dd></div></dl><p><Info aria-hidden="true" /> Assumes a green-flag stop, dry track, constant field spread, and no traffic model. This is a derived estimate, not team data.</p></div>
      </div>
    </section>
  );
}

function RoomsView() {
  return <section className={cn(styles.panel, styles.fullView)}><div className={styles.viewIntro}><span>Invite access</span><h1>Private rooms</h1><p>The dashboard is private by default. Room presence and shared replay cursors require the authenticated room service.</p></div><div className={styles.lockedFeature}><ShieldCheck aria-hidden="true" /><h2>No active room</h2><p>Create and invite controls stay disabled until the room service confirms an authenticated session. No local-only room is presented as shared.</p><button type="button" disabled>Create room</button></div></section>;
}

function AiView({ data, selectedDrivers }: { data: SessionData; selectedDrivers: number[] }) {
  const drivers = selectedDrivers.map((number) => data.drivers.find((driver) => driver.driver_number === number)?.name_acronym).filter(Boolean);
  return <section className={cn(styles.panel, styles.fullView)}><div className={styles.viewIntro}><span>Optional provider</span><h1>Pit-wall copilot</h1><p>AI remains off until a secure server-side provider is configured. Race data never sends itself to a model.</p></div><div className={styles.aiGrid}><div className={styles.aiPrompt}><Bot aria-hidden="true" /><h2>Ask the race</h2><textarea disabled value={`Compare ${drivers.join(" and ") || "the selected drivers"} while accounting for tyre age.`} readOnly /><button type="button" disabled>Run with evidence</button></div><div className={styles.aiContract}><span>Every answer must include</span>{["Session timestamp", "Current lap", "Source freshness", "Drivers considered", "Evidence references", "Confidence", "Assumptions", "Facts vs inference"].map((item) => <p key={item}><i />{item}</p>)}</div></div></section>;
}

function SettingsView({ preferences, setPreference }: { preferences: Preferences; setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void }) {
  return <section className={cn(styles.panel, styles.fullView)}><div className={styles.viewIntro}><span>Local preferences</span><h1>Display settings</h1><p>These choices are stored only in this browser and apply immediately.</p></div><div className={styles.settingsGrid}><SettingGroup title="Theme">{(["dark", "light", "system"] as Theme[]).map((value) => <button key={value} type="button" aria-pressed={preferences.theme === value} onClick={() => setPreference("theme", value)}>{value === "dark" ? <Moon /> : value === "light" ? <Sun /> : <CircleGauge />}{value}</button>)}</SettingGroup><SettingGroup title="Glass and motion">{(["full", "balanced", "reduced", "reduced-motion"] as Effects[]).map((value) => <button key={value} type="button" aria-pressed={preferences.effects === value} onClick={() => setPreference("effects", value)}><Sparkles />{value === "reduced-motion" ? "reduced motion" : value}</button>)}</SettingGroup><SettingGroup title="Accessibility"><button type="button" aria-pressed={preferences.highContrast} onClick={() => setPreference("highContrast", !preferences.highContrast)}><Activity />high contrast</button>{(["metric", "imperial"] as const).map((value) => <button key={value} type="button" aria-pressed={preferences.units === value} onClick={() => setPreference("units", value)}><Gauge />{value}</button>)}</SettingGroup></div></section>;
}

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className={styles.settingGroup}><legend>{title}</legend>{children}</fieldset>;
}

function DiagnosticsView({ data, frame, error, gateway, session, trackPoints }: { data: SessionData; frame: FrameData | null; error: string | null; gateway: GatewayHealth | null; session: Session; trackPoints: LocationPoint[] }) {
  const checks = [
    ["Provider", error ? "degraded" : gateway ? "edge cached" : "direct", error ? "warn" : "ok"],
    ["Session archive", `${session.session_key}`, "ok"],
    ["Drivers", `${data.drivers.length} loaded`, data.drivers.length ? "ok" : "warn"],
    ["Lap records", `${data.laps.length} events`, data.laps.length ? "ok" : "warn"],
    ["Circuit trace", `${trackPoints.length} points`, trackPoints.length ? "ok" : "warn"],
    ["Race control", `${data.raceControl.length} events`, data.raceControl.length ? "ok" : "warn"],
    ["Radio", `${data.radio.length} clips`, data.radio.length ? "ok" : "warn"],
    ["Replay frame", frame ? `${frame.locations.length} positions` : "waiting", frame ? "ok" : "warn"],
  ];
  return <section className={cn(styles.panel, styles.fullView)}><div className={styles.viewIntro}><span>Source health</span><h1>Diagnostics</h1><p>Direct readback of the current browser, provider, archive, and replay-frame state.</p></div><div className={styles.diagnosticsGrid}>{checks.map(([label, value, state]) => <article key={label}><span data-state={state} /><small>{label}</small><strong>{value}</strong></article>)}</div><div className={styles.sourceNote}><Wifi aria-hidden="true" /><div><strong>{gateway ? "Luinbytes edge gateway / OpenF1" : "OpenF1 historical API"}</strong><p>Real sourced data with persistent browser caching{gateway ? " and a same-origin edge cache" : ""}. Replay-frame requests are serialized. Live session-window access depends on provider entitlement{gateway ? gateway.realtimeCredentials ? " and is configured at the gateway" : "; no real-time credential is configured" : ""}.</p></div></div></section>;
}
