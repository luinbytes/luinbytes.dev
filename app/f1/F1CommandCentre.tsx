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
  Copy,
  Flag,
  Gauge,
  Home,
  Info,
  Lightbulb,
  LogOut,
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
  UserPlus,
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
type TelemetryMetric = "speed" | "throttle" | "brake" | "rpm" | "n_gear";
type MapView = "whole" | "leader" | "selected";
type MapLayer = "none" | "events" | "weather" | "battles";
type DashboardLayout = "balanced" | "timing" | "map" | "broadcast";
type HideablePanel = "telemetry" | "events";
type Timezone = "local" | "utc";
type NotificationKind = "safety" | "red-flag" | "favourite-radio" | "favourite-pit";

interface Preferences {
  theme: Theme;
  effects: Effects;
  highContrast: boolean;
  favourites: number[];
  favouriteTeams: string[];
  units: "metric" | "imperial";
  timezone: Timezone;
  spoilerMode: boolean;
  notifications: NotificationKind[];
  telemetryMetric: TelemetryMetric;
  radioBookmarks: string[];
  audioSpeed: number;
  audioVolume: number;
  dashboardLayout: DashboardLayout;
  hiddenPanels: HideablePanel[];
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
  interval?: number | string | null;
  positionChange: number;
  pitDuration?: number | null;
  drs?: number;
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
  favouriteTeams: [],
  units: "metric",
  timezone: "local",
  spoilerMode: false,
  notifications: [],
  telemetryMetric: "speed",
  radioBookmarks: [],
  audioSpeed: 1,
  audioVolume: 0.8,
  dashboardLayout: "balanced",
  hiddenPanels: [],
};
const SPEEDS = [1, 2, 5, 10] as const;
const TELEMETRY_METRICS: Array<{ value: TelemetryMetric; label: string }> = [
  { value: "speed", label: "Speed" },
  { value: "throttle", label: "Throttle" },
  { value: "brake", label: "Brake" },
  { value: "rpm", label: "RPM" },
  { value: "n_gear", label: "Gear" },
];
const NOTIFICATION_KINDS: Array<{ value: NotificationKind; label: string }> = [
  { value: "safety", label: "Safety car" },
  { value: "red-flag", label: "Red flag" },
  { value: "favourite-radio", label: "Favourite radio" },
  { value: "favourite-pit", label: "Favourite pit stop" },
];

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

function telemetryPath(points: CarDataPoint[], key: TelemetryMetric) {
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

function displaySpeed(speed: number | undefined, units: Preferences["units"]) {
  const value = speed ?? 0;
  return Math.round(units === "imperial" ? value * 0.621371 : value);
}

function displayTemperature(value: number | undefined, units: Preferences["units"]) {
  if (value == null) return "--";
  return (units === "imperial" ? value * 1.8 + 32 : value).toFixed(1);
}

function LiquidAtmosphere({ pulse }: { pulse: number }) {
  return (
    <div className={styles.liquidAtmosphere} aria-hidden="true" key={pulse}>
      <svg className={styles.liquidFilter} width="0" height="0">
        <defs>
          <filter id="f1-liquid-refraction" x="-45%" y="-45%" width="190%" height="190%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.009 0.014" numOctaves={2} seed={7} result="surface" />
            <feGaussianBlur in="surface" stdDeviation="1.8" result="softSurface" />
            <feDisplacementMap in="SourceGraphic" in2="softSurface" scale={34} xChannelSelector="R" yChannelSelector="B" />
          </filter>
        </defs>
      </svg>
      <i className={cn(styles.liquidBubble, styles.liquidBubbleOne)} />
      <i className={cn(styles.liquidBubble, styles.liquidBubbleTwo)} />
      <i className={cn(styles.liquidBubble, styles.liquidBubbleThree)} />
      <i className={cn(styles.liquidBubble, styles.liquidBubbleFour)} />
    </div>
  );
}

function formatRaceTime(value: string | number, timezone: Timezone) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: timezone === "utc" ? "UTC" : undefined,
  });
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
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [eventDriver, setEventDriver] = useState("all");
  const [importantOnly, setImportantOnly] = useState(false);
  const [timingSort, setTimingSort] = useState<TimingSort>("position");
  const [timingCompact, setTimingCompact] = useState(true);
  const [mapView, setMapView] = useState<MapView>("whole");
  const [mapLayer, setMapLayer] = useState<MapLayer>("events");
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
  const seenNotificationEvents = useRef<Set<string> | null>(null);
  const currentView = useRef<View>(view);
  const pendingRoomState = useRef<{ sessionKey: number; selectedTime: number; selectedDrivers: number[] } | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const resolvedTheme = useSystemTheme(preferences.theme);

  useEffect(() => {
    currentView.current = view;
  }, [view]);

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
    const localHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!("serviceWorker" in navigator) || (window.location.protocol !== "https:" && !localHost)) return;
    navigator.serviceWorker.register("/f1-sw.js", { scope: "/f1", updateViaCache: "none" }).catch(() => {
      // Installation is progressive enhancement and must not block race data.
    });
  }, []);

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
        const active = nextSessions.find(
          (item) => Date.parse(item.date_start) <= now && Date.parse(item.date_end) >= now,
        );
        const completed = nextSessions
          .filter((item) => Date.parse(item.date_end) < now)
          .sort((a, b) => Date.parse(b.date_end) - Date.parse(a.date_end));
        setMeetings(nextMeetings);
        setSessions(nextSessions);
        setSession(active ?? completed[0] ?? nextSessions[0] ?? null);
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
        const upcoming = Date.parse(session.date_start) > Date.now();
        if (!upcoming && (!nextData.drivers.length || !nextData.laps.length)) {
          throw new Error("This session has no published timing data yet.");
        }
        const shared = pendingRoomState.current?.sessionKey === session.session_key ? pendingRoomState.current : null;
        const winner = nextData.results.find((result) => result.position === 1)?.driver_number;
        const primary = shared?.selectedDrivers[0] ?? winner ?? nextData.grid[0]?.driver_number ?? nextData.drivers[0]?.driver_number;
        setData(nextData);
        setSelectedDrivers(shared?.selectedDrivers.length ? shared.selectedDrivers.slice(0, 2) : primary ? [primary] : []);
        if (upcoming) {
          setSelectedTime(shared?.selectedTime ?? Date.parse(session.date_start));
          if (shared) pendingRoomState.current = null;
          return;
        }
        const end = raceEnd(nextData.laps, session);
        const primaryEnd = nextData.laps.reduce((latest, lap) => {
          if (lap.driver_number !== primary || !lap.lap_duration) return latest;
          return Math.max(latest, Date.parse(lap.date_start) + lap.lap_duration * 1000);
        }, Date.parse(session.date_start));
        const outlineLap =
          nextData.laps.find(
            (lap) => lap.driver_number === primary && lap.lap_duration && lap.lap_number > 1,
          ) ?? bestLap(nextData.laps, primary);

        if (!primary) throw new Error("This session has no published driver data yet.");
        setSelectedTime(shared ? Math.min(end, Math.max(Date.parse(session.date_start), shared.selectedTime)) : Math.min(end, primaryEnd) - 1000);
        if (shared) pendingRoomState.current = null;
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
  const activeSession = Boolean(session && now >= Date.parse(session.date_start) && now <= Date.parse(session.date_end));
  const frameWindow = 3000 * playbackSpeed;
  const frameTimestamp = playing ? Math.floor(selectedTime / frameWindow) * frameWindow : selectedTime;

  useEffect(() => {
    if (
      !session ||
      !data ||
      Date.now() < Date.parse(session.date_start) ||
      !frameTimestamp ||
      !selectedDrivers.length ||
      !timelineEnd
    ) return;
    const requestId = ++frameRequest.current;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setFrameLoading(true);
      loadFrameData(
        session.session_key,
        Math.min(frameTimestamp, timelineEnd),
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
    }, playing ? 0 : 260);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [data, frameTimestamp, playing, selectedDrivers, session, timelineEnd]);

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

  useEffect(() => {
    if (!session || !activeSession) return;
    const controller = new AbortController();
    let refreshing = false;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const nextData = await loadSessionData(session.session_key, controller.signal, true);
        setData(nextData);
        setError(null);
        if (currentView.current === "live") setSelectedTime(raceEnd(nextData.laps, session));
      } catch (reason) {
        if ((reason as Error).name !== "AbortError") setError(reason instanceof Error ? reason.message : "Live timing refresh failed.");
      } finally {
        refreshing = false;
      }
    };
    const interval = window.setInterval(refresh, 30_000);
    return () => {
      window.clearInterval(interval);
      controller.abort();
    };
  }, [activeSession, session]);

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
  const currentTelemetry = useMemo(
    () => latestByDriver(frame?.telemetry ?? [], selectedTime + 2000),
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

  const pitsByDriver = useMemo(() => {
    const grouped = new Map<number, SessionData["pits"]>();
    for (const pit of data?.pits ?? []) {
      const driverPits = grouped.get(pit.driver_number) ?? [];
      driverPits.push(pit);
      grouped.set(pit.driver_number, driverPits);
    }
    return grouped;
  }, [data]);

  const gridByDriver = useMemo(
    () => new Map(data?.grid.map((entry) => [entry.driver_number, entry.position]) ?? []),
    [data],
  );

  const timingRows = useMemo<TimingRow[]>(() => {
    if (!data) return [];
    const resultByDriver = new Map(data.results.map((result) => [result.driver_number, result]));
    const favourites = new Set(preferences.favourites);
    return data.drivers
      .map((driver) => {
        const result = preferences.spoilerMode ? undefined : resultByDriver.get(driver.driver_number);
        const lap = currentLaps.get(driver.driver_number);
        const position = currentPositions.get(driver.driver_number)?.position ?? result?.position ?? 99;
        const interval = currentIntervals.get(driver.driver_number);
        const pit = pitsByDriver.get(driver.driver_number)
          ?.filter((item) => Date.parse(item.date) <= selectedTime)
          .at(-1);
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
          interval: interval?.interval,
          positionChange: position === 99 ? 0 : (gridByDriver.get(driver.driver_number) ?? position) - position,
          pitDuration: pit?.stop_duration ?? pit?.lane_duration,
          drs: currentTelemetry.get(driver.driver_number)?.drs,
          stint,
          fastest: fastestByDriver.get(driver.driver_number),
        };
      })
      .sort((a, b) => {
        const aFavourite = favourites.has(a.driver.driver_number) || preferences.favouriteTeams.includes(a.driver.team_name);
        const bFavourite = favourites.has(b.driver.driver_number) || preferences.favouriteTeams.includes(b.driver.team_name);
        const favouriteOrder = Number(bFavourite) - Number(aFavourite);
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
  }, [currentIntervals, currentLaps, currentPositions, currentTelemetry, data, fastestByDriver, gridByDriver, pitsByDriver, preferences.favouriteTeams, preferences.favourites, preferences.spoilerMode, selectedTime, stintsByDriver, timingSort]);

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
      important: /RED|DOUBLE YELLOW|SAFETY CAR|PENALTY|INVESTIGATION|SUSPEND/i.test(`${event.flag} ${event.category} ${event.message}`),
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
      important: preferences.favourites.includes(event.driver_number),
    }));
    const pits = data.pits.map((event, index) => ({
      id: `pit-${index}`,
      type: "pit" as const,
      date: event.date,
      lap: event.lap_number,
      title: `${driverByNumber.get(event.driver_number)?.name_acronym ?? event.driver_number} pit stop`,
      detail: `${event.stop_duration?.toFixed(1) ?? "--"}s stationary / ${event.lane_duration?.toFixed(1) ?? "--"}s lane`,
      driverNumber: event.driver_number,
      audio: null,
      important: preferences.favourites.includes(event.driver_number),
    }));
    const overtakes = data.overtakes.map((event, index) => ({
      id: `overtake-${index}`,
      type: "overtake" as const,
      date: event.date,
      lap: null,
      title: "Overtake",
      detail: `${driverByNumber.get(event.overtaking_driver_number)?.name_acronym ?? event.overtaking_driver_number} passed ${driverByNumber.get(event.overtaken_driver_number)?.name_acronym ?? event.overtaken_driver_number} for P${event.position}`,
      driverNumber: event.overtaking_driver_number,
      audio: null,
      important: preferences.favourites.includes(event.overtaking_driver_number),
    }));
    return [...controls, ...radios, ...pits, ...overtakes].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  }, [data, driverByNumber, preferences.favourites]);

  const visibleEvents = useMemo(
    () =>
      events
        .filter((event) => Date.parse(event.date) <= selectedTime)
        .filter((event) => eventFilter === "all" || event.type === eventFilter)
        .filter((event) => eventDriver === "all" || event.driverNumber === Number(eventDriver))
        .filter((event) => !importantOnly || event.important)
        .slice(-14)
        .reverse(),
    [eventDriver, eventFilter, events, importantOnly, selectedTime],
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

  const applyRoomState = useCallback((time: number, drivers: number[], sessionKey: number) => {
    if (sessionKey !== session?.session_key) {
      const sharedSession = sessions.find((candidate) => candidate.session_key === sessionKey);
      if (!sharedSession) return;
      pendingRoomState.current = { sessionKey, selectedTime: time, selectedDrivers: drivers };
      setFrame(null);
      setTrackPoints([]);
      setSession(sharedSession);
      return;
    }
    seekTo(time);
    if (drivers.length) setSelectedDrivers(drivers.slice(0, 2));
  }, [seekTo, session?.session_key, sessions]);

  useEffect(() => {
    const currentIds = new Set(events.map((event) => event.id));
    if (!activeSession || !seenNotificationEvents.current) {
      seenNotificationEvents.current = currentIds;
      return;
    }
    const newEvents = events.filter((event) => !seenNotificationEvents.current!.has(event.id));
    seenNotificationEvents.current = currentIds;
    if (!newEvents.length || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    for (const event of newEvents) {
      const favourite = event.driverNumber != null && preferences.favourites.includes(event.driverNumber);
      const enabled =
        (event.type === "radio" && favourite && preferences.notifications.includes("favourite-radio")) ||
        (event.type === "pit" && favourite && preferences.notifications.includes("favourite-pit")) ||
        (event.type === "race-control" && /SAFETY CAR|VSC/i.test(event.detail) && preferences.notifications.includes("safety")) ||
        (event.type === "race-control" && /RED FLAG/i.test(`${event.title} ${event.detail}`) && preferences.notifications.includes("red-flag"));
      if (!enabled) continue;
      navigator.serviceWorker.ready
        .then((registration) => registration.showNotification(event.title, {
          body: event.detail,
          tag: event.id,
          data: { url: `/f1#time=${Date.parse(event.date)}` },
        }))
        .catch(() => {
          // Notifications are optional and must not interrupt live timing.
        });
    }
  }, [activeSession, events, preferences.favourites, preferences.notifications, seekTo]);

  const jumpEvent = (direction: -1 | 1) => {
    const eventTimes = events.map((event) => Date.parse(event.date));
    const candidate =
      direction < 0
        ? eventTimes.filter((time) => time < selectedTime - 500).at(-1)
        : eventTimes.find((time) => time > selectedTime + 500);
    if (candidate) seekTo(candidate);
  };

  const jumpLap = (direction: -1 | 1) => {
    const lapTimes = (data?.laps ?? [])
      .filter((lap) => lap.driver_number === selectedDrivers[0])
      .map((lap) => Date.parse(lap.date_start))
      .sort((a, b) => a - b);
    const candidate = direction < 0
      ? lapTimes.filter((time) => time < selectedTime - 500).at(-1)
      : lapTimes.find((time) => time > selectedTime + 500);
    if (candidate) seekTo(candidate);
  };

  const skipQuiet = () => {
    const next = events.find((event) => Date.parse(event.date) > selectedTime + 15_000);
    seekTo(next ? Date.parse(next.date) : selectedTime + 60_000);
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

  const toggleRadioBookmark = (eventId: string) => {
    setPreferences((current) => ({
      ...current,
      radioBookmarks: current.radioBookmarks.includes(eventId)
        ? current.radioBookmarks.filter((id) => id !== eventId)
        : [...current.radioBookmarks, eventId],
    }));
  };

  const chooseSession = (next: Session) => {
    setLoading(true);
    setError(null);
    setData(null);
    setFrame(null);
    setTrackPoints([]);
    setSession(next);
    setView("live");
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
            onClick={() => {
              setView(id);
              if (id === "live" && timelineEnd) {
                setPlaying(false);
                setSelectedTime(timelineEnd);
              }
            }}
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
        <span>OpenF1<br />{activeSession ? "live feed" : "historical"}</span>
      </div>
    </nav>
  );

  if (loading) {
    return (
      <div ref={shellRef} className={styles.shell} data-theme={resolvedTheme} data-effects={preferences.effects}>
        <LiquidAtmosphere pulse={timelinePulse} />
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
        <LiquidAtmosphere pulse={timelinePulse} />
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
  const selectedTiming = timingRows.find((row) => row.driver.driver_number === selectedDrivers[0]);
  const primaryDriver = driverByNumber.get(selectedDrivers[0]);
  const leaderNumber = timingRows.find((row) => row.position === 1)?.driver.driver_number;
  const meeting = meetings.find((item) => item.meeting_key === session.meeting_key);
  const upcoming = now > 0 && now < Date.parse(session.date_start);
  const trackStatus = data.raceControl
    .filter((event) => Date.parse(event.date) <= selectedTime && ["Flag", "SafetyCar", "SessionStatus", "Drs"].includes(event.category))
    .at(-1);
  const mapEvents = events.filter((event) => event.driverNumber != null && Math.abs(Date.parse(event.date) - selectedTime) <= 15_000);
  const battlingDrivers = new Set(
    Array.from(currentIntervals.entries())
      .filter(([, interval]) => typeof interval.interval === "number" && interval.interval > 0 && interval.interval < 1)
      .map(([driverNumber]) => driverNumber),
  );
  const frameAge = frame ? Math.max(0, Math.round((now - frame.fetchedAt) / 1000)) : null;
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
      data-layout={preferences.dashboardLayout}
      data-playing={playing}
    >
      <LiquidAtmosphere pulse={timelinePulse} />
      {navigation}

      <header className={styles.sessionBar}>
        <div className={styles.sessionIdentity}>
          <span className={styles.livePill}>{view === "live" ? activeSession ? "LIVE" : "REPLAY" : view.toUpperCase()}</span>
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
          <span>{displayTemperature(currentWeather?.air_temperature, preferences.units)}°{preferences.units === "imperial" ? "F" : "C"} air</span>
          <span>{displayTemperature(currentWeather?.track_temperature, preferences.units)}°{preferences.units === "imperial" ? "F" : "C"} track</span>
          <span>{currentWeather?.wind_speed == null ? "--" : (preferences.units === "imperial" ? currentWeather.wind_speed * 2.23694 : currentWeather.wind_speed).toFixed(1)} {preferences.units === "imperial" ? "mph" : "m/s"}</span>
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
          {Date.parse(session.date_end) >= now && (
            <option value={session.session_key}>{sessionLabel(session)}</option>
          )}
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

      <main
        className={styles.workspace}
        data-hide-telemetry={preferences.hiddenPanels.includes("telemetry")}
        data-hide-events={preferences.hiddenPanels.includes("events")}
      >
        {(view === "live" || view === "replay") && upcoming && (
          <PreSessionView session={session} meeting={meeting} data={data} now={now} preferences={preferences} />
        )}
        {(view === "live" || view === "replay") && !upcoming && (
          <>
            <section className={cn(styles.panel, styles.trackPanel)} aria-labelledby="track-title">
              <div className={styles.panelHeader}>
                <div>
                  <span>Track position / sourced</span>
                  <h1 id="track-title">{session.circuit_short_name}</h1>
                </div>
                <div className={styles.panelActions}>
                  <select className={styles.mapViewSelect} value={mapView} onChange={(event) => setMapView(event.target.value as MapView)} aria-label="Track map view">
                    <option value="whole">Whole track</option>
                    <option value="leader">Leader follow</option>
                    <option value="selected">Selected drivers</option>
                  </select>
                  <select className={styles.mapViewSelect} value={mapLayer} onChange={(event) => setMapLayer(event.target.value as MapLayer)} aria-label="Track overlay">
                    <option value="none">No overlay</option>
                    <option value="events">Event markers</option>
                    <option value="weather">Weather</option>
                    <option value="battles">Battles</option>
                  </select>
                  <span className={cn(styles.dataFreshness, frameAge != null && frameAge > 15 && styles.dataStale)}><Wifi aria-hidden="true" /> {frameAge == null ? "waiting" : `${frameAge}s old`}</span>
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
                          className={cn(styles.driverMarker, selected && styles.driverMarkerSelected, mapLayer === "battles" && battlingDrivers.has(point.driver_number) && styles.driverMarkerBattle)}
                          key={point.driver_number}
                          transform={`translate(${projected.x} ${projected.y})`}
                          style={{ opacity: mapView === "whole" || selected || (mapView === "leader" && point.driver_number === leaderNumber) ? 1 : 0.16 }}
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
                    {mapLayer === "events" && mapEvents.map((event) => {
                      const point = currentLocations.get(event.driverNumber!);
                      if (!point) return null;
                      const projected = geometry.project(point);
                      return (
                        <g className={styles.mapEventMarker} key={event.id} transform={`translate(${projected.x} ${projected.y})`} aria-label={event.title}>
                          <circle r="22" />
                          <text y="4">{event.type === "pit" ? "PIT" : event.type === "overtake" ? "OVR" : "!"}</text>
                        </g>
                      );
                    })}
                  </svg>
                ) : (
                  <div className={styles.emptyPanel}><MapIcon aria-hidden="true" />Building circuit trace</div>
                )}
                <div className={styles.trackTelemetry}>
                  <span>{primaryDriver?.name_acronym ?? "--"}</span>
                  <strong>{displaySpeed(selectedTelemetry[0]?.points.at(-1)?.speed, preferences.units)}<small> {preferences.units === "imperial" ? "mph" : "km/h"}</small></strong>
                  <em>Selected car / sourced telemetry</em>
                </div>
                {trackStatus && (
                  <div className={styles.trackStatus} data-flag={trackStatus.flag?.toLowerCase().replaceAll(" ", "-") ?? trackStatus.category.toLowerCase()}>
                    <strong>{trackStatus.flag ?? trackStatus.category}</strong>
                    <span>{trackStatus.scope}{trackStatus.sector ? ` / sector ${trackStatus.sector}` : ""}</span>
                  </div>
                )}
                {mapLayer === "weather" && currentWeather && (
                  <div className={styles.mapWeather}>
                    {currentWeather.rainfall ? <CloudRain aria-hidden="true" /> : <Cloud aria-hidden="true" />}
                    <strong>{displayTemperature(currentWeather.track_temperature, preferences.units)}°{preferences.units === "imperial" ? "F" : "C"}</strong>
                    <span>{currentWeather.rainfall ? "Wet track" : "Dry track"} / {currentWeather.humidity}% humidity</span>
                  </div>
                )}
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
                  <button
                    type="button"
                    className={styles.compactButton}
                    aria-pressed={!timingCompact}
                    onClick={() => setTimingCompact((current) => !current)}
                  >
                    {timingCompact ? "Expand" : "Compact"}
                  </button>
                  <span className={styles.compareCount}>{selectedDrivers.length}/2</span>
                </div>
              </div>
              <div className={styles.timingHead} aria-hidden="true">
                <span>POS</span><span>DRIVER</span><span>TYRE</span><span>LAST</span><span>GAP</span>
              </div>
              <div className={cn(styles.timingRows, !timingCompact && styles.timingRowsExpanded)}>
                {timingRows.map(({ driver, result, lap, position, gap, interval, positionChange, pitDuration, drs, stint, fastest }) => (
                  <button
                    type="button"
                    className={cn(
                      styles.timingRow,
                      selectedDrivers.includes(driver.driver_number) && styles.timingRowSelected,
                      typeof interval === "number" && interval > 0 && interval < 1 && styles.timingRowBattle,
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
                    {!timingCompact && (
                      <span className={styles.timingDetails}>
                        <i>S1 {formatLapTime(lap?.duration_sector_1)}</i>
                        <i>S2 {formatLapTime(lap?.duration_sector_2)}</i>
                        <i>S3 {formatLapTime(lap?.duration_sector_3)}</i>
                        <i>INT {formatGap(interval)}</i>
                        <i>{drs != null && [10, 12, 14].includes(drs) ? "DRS ON" : "DRS OFF"}</i>
                        <i>{positionChange > 0 ? `+${positionChange}` : positionChange} POS</i>
                        <i>PIT {pitDuration?.toFixed(1) ?? "--"}s</i>
                        <i>STINT {stint?.stint_number ?? "--"}</i>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {!preferences.hiddenPanels.includes("telemetry") && <section className={cn(styles.panel, styles.telemetryPanel)} aria-labelledby="telemetry-title">
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
                      <span><small>Speed</small><strong>{displaySpeed(latest?.speed, preferences.units)}</strong><em>{preferences.units === "imperial" ? "mph" : "km/h"}</em></span>
                      <span><small>Throttle</small><strong>{latest?.throttle ?? 0}</strong><em>%</em></span>
                      <span><small>Brake</small><strong>{latest?.brake ? "ON" : "OFF"}</strong><em>state</em></span>
                      <span><small>Gear</small><strong>{latest?.n_gear ?? 0}</strong><em>selected</em></span>
                      <span><small>RPM</small><strong>{latest?.rpm ?? 0}</strong><em>engine</em></span>
                      <span><small>DRS</small><strong>{(latest?.drs ?? 0) >= 10 ? "OPEN" : "CLOSED"}</strong><em>state</em></span>
                    </div>
                  );
                })}
                <div className={styles.traceChart}>
                  <div className={styles.chartToolbar}>
                    {TELEMETRY_METRICS.map((metric) => (
                      <button
                        key={metric.value}
                        type="button"
                        aria-pressed={preferences.telemetryMetric === metric.value}
                        onClick={() => setPreference("telemetryMetric", metric.value)}
                      >
                        {metric.label}
                      </button>
                    ))}
                  </div>
                  <svg viewBox="0 0 600 150" preserveAspectRatio="none" aria-label={`${preferences.telemetryMetric} telemetry trace`}>
                    <g className={styles.chartGrid}><path d="M0 25H600M0 75H600M0 125H600" /></g>
                    {selectedTelemetry.map(({ driver, points }) => (
                      <path
                        className={styles.traceLine}
                        d={telemetryPath(points, preferences.telemetryMetric)}
                        key={driver?.driver_number}
                        style={{ stroke: `#${driver?.team_colour ?? "ffffff"}` }}
                      />
                    ))}
                  </svg>
                  <span>{preferences.telemetryMetric.replace("n_", "")} / lap {selectedLap?.lap_number ?? "--"} / {selectedTiming?.stint?.compound ?? "no tyre"} / {selectedTiming?.interval == null ? "no interval" : `${formatGap(selectedTiming.interval)} ahead`}</span>
                </div>
              </div>
            </section>}

            {!preferences.hiddenPanels.includes("events") && <section className={cn(styles.panel, styles.eventsPanel)} aria-labelledby="events-title">
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
              </div>
              <div className={styles.eventControls}>
                <select value={eventDriver} onChange={(event) => setEventDriver(event.target.value)} aria-label="Filter events by driver">
                  <option value="all">All drivers</option>
                  {data.drivers.map((driver) => <option key={driver.driver_number} value={driver.driver_number}>{driver.name_acronym} / {driver.team_name}</option>)}
                </select>
                <button type="button" aria-pressed={importantOnly} onClick={() => setImportantOnly((current) => !current)}>Important</button>
                <select value={preferences.audioSpeed} onChange={(event) => setPreference("audioSpeed", Number(event.target.value))} aria-label="Radio playback speed">
                  <option value={1}>1x</option><option value={1.25}>1.25x</option><option value={1.5}>1.5x</option><option value={2}>2x</option>
                </select>
                <label>Volume<input type="range" min={0} max={1} step={0.1} value={preferences.audioVolume} onChange={(event) => setPreference("audioVolume", Number(event.target.value))} /></label>
              </div>
              <div className={styles.eventList}>
                {visibleEvents.map((event) => (
                  <article className={cn(styles.eventItem, event.important && styles.eventImportant)} key={event.id}>
                    <button type="button" onClick={() => seekTo(Date.parse(event.date))}>
                      {event.type === "radio" ? <Radio aria-hidden="true" /> : <Flag aria-hidden="true" />}
                      <span><strong>{event.title}</strong><small>{formatRaceTime(event.date, preferences.timezone)}{event.lap ? ` / lap ${event.lap}` : ""} / received {formatRaceTime(data.fetchedAt, preferences.timezone)}</small></span>
                      <p>{event.detail}</p>
                    </button>
                    {event.type === "radio" && (
                      <button
                        type="button"
                        className={styles.bookmarkButton}
                        aria-label={preferences.radioBookmarks.includes(event.id) ? `Remove ${event.title} bookmark` : `Bookmark ${event.title}`}
                        aria-pressed={preferences.radioBookmarks.includes(event.id)}
                        onClick={() => toggleRadioBookmark(event.id)}
                      >
                        <Star aria-hidden="true" />
                      </button>
                    )}
                    {event.audio && (
                      <audio controls preload="none" src={event.audio} onLoadedMetadata={(e) => { e.currentTarget.playbackRate = preferences.audioSpeed; e.currentTarget.volume = preferences.audioVolume; }}>
                        Official team radio audio
                      </audio>
                    )}
                  </article>
                ))}
                {!visibleEvents.length && <div className={styles.emptyPanel}><Radio aria-hidden="true" />No matching timeline events</div>}
              </div>
            </section>}
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
            currentLap={selectedLap?.lap_number ?? 1}
            lap={strategyLap}
            compound={strategyCompound}
            onLap={setStrategyLap}
            onCompound={setStrategyCompound}
          />
        )}
        <RoomsView
          visible={view === "rooms"}
          enabled={Boolean(gatewayHealth?.roomsConfigured)}
          sessionKey={session.session_key}
          selectedTime={selectedTime}
          selectedDrivers={selectedDrivers}
          onRemoteState={applyRoomState}
        />
        {view === "ai" && <AiView data={data} selectedDrivers={selectedDrivers} />}
        {view === "settings" && (
          <SettingsView preferences={preferences} setPreference={setPreference} data={data} />
        )}
        {view === "diagnostics" && (
          <DiagnosticsView data={data} frame={frame} error={error} gateway={gatewayHealth} session={session} trackPoints={trackPoints} now={now} selectedTime={selectedTime} />
        )}
      </main>

      {(view === "live" || view === "replay") && !upcoming && (
        <footer className={styles.timeline}>
          <div className={styles.playControls}>
            <button type="button" onClick={() => jumpLap(-1)} aria-label="Previous lap">L-</button>
            <button type="button" onClick={() => jumpEvent(-1)} aria-label="Previous event"><ChevronLeft /></button>
            <button type="button" onClick={() => seekTo(selectedTime - 5000)} aria-label="Step backward five seconds">-5</button>
            <button className={styles.playButton} type="button" onClick={() => setPlaying((current) => !current)} aria-label={playing ? "Pause replay" : "Play replay"}>
              {playing ? <Pause /> : <Play />}
            </button>
            <button type="button" onClick={() => seekTo(selectedTime + 5000)} aria-label="Step forward five seconds">+5</button>
            <button type="button" onClick={() => jumpEvent(1)} aria-label="Next event"><ChevronRight /></button>
            <button type="button" onClick={() => jumpLap(1)} aria-label="Next lap">L+</button>
            <button type="button" onClick={skipQuiet} aria-label="Skip quiet section">SKIP</button>
          </div>
          <span className={styles.timelineTime}>{formatRaceTime(selectedTime, preferences.timezone)}</span>
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
      <div className={styles.viewIntro}><span>2026 championship</span><h1>Race calendar</h1><p>Times are shown in your local timezone. Select an upcoming session for its countdown and weekend context, or a completed session for the sourced replay archive.</p></div>
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
              <div>{meetingSessions.map((item) => <button key={item.session_key} onClick={() => onSelect(item)} type="button">{item.session_name}</button>)}</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PreSessionView({ session, meeting, data, now, preferences }: { session: Session; meeting?: Meeting; data: SessionData; now: number; preferences: Preferences }) {
  const remaining = Math.max(0, Date.parse(session.date_start) - now);
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const drivers = new Map(data.drivers.map((driver) => [driver.driver_number, driver]));
  const weather = data.weather.at(-1);
  return (
    <section className={cn(styles.panel, styles.fullView, styles.preSessionView)}>
      <div className={styles.viewIntro}>
        <span>Weekend context / upcoming</span>
        <h1>{meeting?.meeting_name ?? session.location}</h1>
        <p>{session.session_name} starts {new Date(session.date_start).toLocaleString([], { weekday: "long", hour: "2-digit", minute: "2-digit", timeZoneName: "short", timeZone: preferences.timezone === "utc" ? "UTC" : undefined })}.</p>
      </div>
      <div className={styles.preSessionGrid}>
        <article className={styles.countdownCard}>
          <small>Session countdown</small>
          <strong>{days ? `${days}d ` : ""}{String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}</strong>
          <span>{session.circuit_short_name} / {session.country_name}</span>
        </article>
        <article>
          <small>Circuit</small>
          <strong>{session.location}</strong>
          <span>{session.session_type} / local time shown</span>
        </article>
        <article>
          <small>Weather snapshot</small>
          <strong>{weather ? `${displayTemperature(weather.air_temperature, preferences.units)}°${preferences.units === "imperial" ? "F" : "C"} air` : "Awaiting forecast"}</strong>
          <span>{weather ? `${displayTemperature(weather.track_temperature, preferences.units)}°${preferences.units === "imperial" ? "F" : "C"} track / ${weather.rainfall ? "rain" : "dry"}` : "Provider data not published"}</span>
        </article>
        <article className={styles.contextList}>
          <small>Provisional grid</small>
          {data.grid.length ? data.grid.slice(0, 5).map((entry) => <span key={entry.driver_number}><b>P{entry.position}</b>{drivers.get(entry.driver_number)?.name_acronym ?? entry.driver_number}</span>) : <span>Not published yet</span>}
        </article>
        <article className={styles.contextList}>
          <small>Championship</small>
          {data.championship.length ? data.championship.slice().sort((a, b) => a.position_current - b.position_current).slice(0, 5).map((entry) => <span key={entry.driver_number}><b>P{entry.position_current}</b>{drivers.get(entry.driver_number)?.name_acronym ?? entry.driver_number}<em>{entry.points_current} pts</em></span>) : <span>Snapshot arrives with race data</span>}
        </article>
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

function StrategyView({ data, driver, currentLap, lap, compound, onLap, onCompound }: { data: SessionData; driver?: Driver; currentLap: number; lap: number; compound: string; onLap: (lap: number) => void; onCompound: (compound: string) => void }) {
  const totalLaps = data.results[0]?.number_of_laps ?? 44;
  const result = data.results.find((item) => item.driver_number === driver?.driver_number);
  const averageLap = data.laps.filter((item) => item.driver_number === driver?.driver_number && item.lap_duration && !item.is_pit_out_lap).reduce((sum, item, _, values) => sum + (item.lap_duration ?? 0) / values.length, 0);
  const pitSamples = data.pits.map((pit) => pit.lane_duration).filter((duration): duration is number => duration != null && duration > 0);
  const pitLoss = pitSamples.length ? pitSamples.reduce((sum, duration) => sum + duration, 0) / pitSamples.length : 22.4;
  const compoundLaps = data.stints
    .filter((stint) => stint.driver_number === driver?.driver_number && stint.compound === compound)
    .flatMap((stint) => data.laps.filter((item) => item.driver_number === stint.driver_number && item.lap_number >= stint.lap_start && item.lap_number <= stint.lap_end && item.lap_duration && !item.is_pit_out_lap));
  const observedDegradation = compoundLaps.length > 3
    ? Math.max(0, ((compoundLaps.at(-1)?.lap_duration ?? 0) - (compoundLaps[0].lap_duration ?? 0)) / (compoundLaps.length - 1))
    : null;
  const tyrePenalty = observedDegradation ?? (compound === "SOFT" ? 0.18 : compound === "HARD" ? 0.46 : 0.3);
  const lapsRemaining = Math.max(0, totalLaps - lap);
  const estimatedLoss = pitLoss + tyrePenalty * Math.max(0, lapsRemaining - (compound === "SOFT" ? 14 : compound === "MEDIUM" ? 24 : 34));
  const positionsLost = Math.max(1, Math.round(estimatedLoss / 2.3));
  const evidenceCount = pitSamples.length + compoundLaps.length;
  const confidence = evidenceCount >= 12 ? "68% / medium" : evidenceCount >= 5 ? "54% / guarded" : "35% / low";
  return (
    <section className={cn(styles.panel, styles.fullView)}>
      <div className={styles.viewIntro}><span>Derived model / not official</span><h1>Strategy desk</h1><p>Explore a transparent pit-stop scenario built from this session&apos;s lap count and the selected driver&apos;s observed pace.</p></div>
      <div className={styles.strategyLayout}>
        <div className={styles.strategyControls}><div className={styles.strategyShortcuts}><button type="button" onClick={() => onLap(Math.max(2, currentLap))}>Pit now</button><button type="button" onClick={() => onLap(Math.min(totalLaps - 1, Math.max(2, currentLap + 1)))}>Next lap</button><button type="button" onClick={() => onLap(Math.min(totalLaps - 1, Math.max(2, currentLap + 5)))}>Extend 5</button></div><label>Pit on lap <strong>{lap}</strong><input type="range" min={2} max={Math.max(3, totalLaps - 1)} value={lap} onChange={(event) => onLap(Number(event.target.value))} /></label><fieldset><legend>Fit compound</legend>{["SOFT", "MEDIUM", "HARD"].map((item) => <button type="button" aria-pressed={compound === item} key={item} onClick={() => onCompound(item)}>{item}</button>)}</fieldset><div className={styles.strategyDriver}><span style={{ background: `#${driver?.team_colour ?? "fff"}` }} /><div><small>Scenario car</small><strong>{driver?.full_name ?? "Select a driver"}</strong></div></div></div>
        <div className={styles.strategyOutput}><span>Projected outcome</span><div className={styles.strategyHero}><small>Estimated rejoin</small><strong>P{Math.min(22, (result?.position ?? 1) + positionsLost)}</strong><em>range P{Math.max(1, (result?.position ?? 1) + positionsLost - 1)} to P{Math.min(22, (result?.position ?? 1) + positionsLost + 2)}</em></div><dl><div><dt>Observed pit loss</dt><dd>{pitLoss.toFixed(1)}s</dd></div><div><dt>Estimated impact</dt><dd>+{estimatedLoss.toFixed(1)}s</dd></div><div><dt>Observed average</dt><dd>{formatLapTime(averageLap || null)}</dd></div><div><dt>Confidence</dt><dd>{confidence}</dd></div></dl><p><Info aria-hidden="true" /> Uses {pitSamples.length || "no"} sourced pit-lane samples and {compoundLaps.length || "no"} selected-compound laps. Assumes a green-flag stop and constant traffic. Degradation and rejoin are derived estimates, not team data.</p></div>
      </div>
    </section>
  );
}

interface RoomMember {
  email: string;
  role: "owner" | "friend";
}

interface RoomConnection {
  roomId: string;
  inviteToken: string;
  role: "owner" | "friend";
  inviteExpiresAt?: string;
}

function RoomsView({ visible, enabled, sessionKey, selectedTime, selectedDrivers, onRemoteState }: { visible: boolean; enabled: boolean; sessionKey: number; selectedTime: number; selectedDrivers: number[]; onRemoteState: (time: number, drivers: number[], sessionKey: number) => void }) {
  const [connection, setConnection] = useState<RoomConnection | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [roomStatus, setRoomStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [roomError, setRoomError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const remoteSignature = useRef("");
  const connectRef = useRef<((next: RoomConnection) => Promise<void>) | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const intentionalClose = useRef(false);
  const lastSentAt = useRef(0);
  const pendingSend = useRef<number | null>(null);

  const connect = useCallback(async (next: RoomConnection) => {
    intentionalClose.current = false;
    setRoomStatus("connecting");
    setRoomError(null);
    const response = await fetch(`/f1/api/rooms/${next.roomId}`, { headers: { Accept: "application/json", "X-F1-Room-Invite": next.inviteToken } });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(body?.error ?? `Room connection failed (${response.status})`);
    }
    const snapshot = await response.json() as { role: RoomConnection["role"]; members: RoomMember[]; state: { sessionKey: number | null; selectedTime: number | null; selectedDrivers: number[] }; socketTicket: string; inviteExpiresAt?: string };
    if (!snapshot.socketTicket) throw new Error("Room socket authorization was not issued");
    const resolved = { ...next, role: snapshot.role, inviteExpiresAt: snapshot.inviteExpiresAt };
    setConnection(resolved);
    setMembers(snapshot.members);
    if (snapshot.state.sessionKey && snapshot.state.selectedTime) onRemoteState(snapshot.state.selectedTime, snapshot.state.selectedDrivers, snapshot.state.sessionKey);
    sessionStorage.setItem("f1-room", JSON.stringify(resolved));
    if (window.location.hash.startsWith("#room=")) window.history.replaceState(null, "", window.location.pathname);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/f1/api/rooms/${next.roomId}/socket`, ["f1-room", snapshot.socketTicket]);
    socketRef.current = socket;
    socket.addEventListener("open", () => setRoomStatus("connected"));
    socket.addEventListener("message", (event) => {
      let message: { type?: string; members?: RoomMember[]; state?: { sessionKey: number | null; selectedTime: number | null; selectedDrivers: number[] } };
      try {
        message = JSON.parse(String(event.data)) as typeof message;
      } catch {
        setRoomError("The room sent an unreadable update.");
        return;
      }
      if (message.type !== "room-state") return;
      setMembers(message.members ?? []);
      if (message.state?.sessionKey && message.state.selectedTime) {
        remoteSignature.current = `${message.state.sessionKey}:${message.state.selectedTime}:${message.state.selectedDrivers.join(",")}`;
        onRemoteState(message.state.selectedTime, message.state.selectedDrivers, message.state.sessionKey);
      }
    });
    socket.addEventListener("close", () => {
      if (socketRef.current !== socket || intentionalClose.current) return;
      setRoomStatus("connecting");
      reconnectTimer.current = window.setTimeout(() => {
        connectRef.current?.(resolved).catch((reason: unknown) => {
          setRoomStatus("error");
          setRoomError(reason instanceof Error ? reason.message : "Room reconnection failed");
        });
      }, 1500);
    });
    socket.addEventListener("error", () => {
      setRoomStatus("error");
      setRoomError("The shared room connection was interrupted.");
    });
  }, [onRemoteState]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (!enabled) return;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const roomId = params.get("room");
    const inviteToken = params.get("invite");
    let saved: RoomConnection | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem("f1-room") ?? "null") as RoomConnection | null;
    } catch {
      sessionStorage.removeItem("f1-room");
    }
    const target = roomId && inviteToken ? { roomId, inviteToken, role: "friend" as const } : saved;
    if (!target) return;
    connect(target).catch((reason: unknown) => {
      setRoomStatus("error");
      setRoomError(reason instanceof Error ? reason.message : "Room connection failed");
    });
    return () => {
      intentionalClose.current = true;
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
      if (pendingSend.current) window.clearTimeout(pendingSend.current);
      socketRef.current?.close(1000, "Room closed");
    };
  }, [connect, enabled]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!connection || !socket || socket.readyState !== WebSocket.OPEN) return;
    const signature = `${sessionKey}:${selectedTime}:${selectedDrivers.join(",")}`;
    if (signature === remoteSignature.current) {
      remoteSignature.current = "";
      return;
    }
    const delay = Math.max(0, 600 - (Date.now() - lastSentAt.current));
    if (pendingSend.current) window.clearTimeout(pendingSend.current);
    pendingSend.current = window.setTimeout(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "sync", sessionKey, selectedTime, selectedDrivers }));
        lastSentAt.current = Date.now();
      }
    }, delay);
    return () => {
      if (pendingSend.current) window.clearTimeout(pendingSend.current);
    };
  }, [connection, roomStatus, selectedDrivers, selectedTime, sessionKey]);

  const createRoom = async () => {
    setRoomStatus("connecting");
    setRoomError(null);
    try {
      const response = await fetch("/f1/api/rooms", { method: "POST", headers: { Accept: "application/json" } });
      const body = await response.json() as { roomId?: string; inviteToken?: string; role?: "owner"; error?: string };
      if (!response.ok || !body.roomId || !body.inviteToken) throw new Error(body.error ?? "Room creation failed");
      await connect({ roomId: body.roomId, inviteToken: body.inviteToken, role: "owner" });
    } catch (reason) {
      setRoomStatus("error");
      setRoomError(reason instanceof Error ? reason.message : "Room creation failed");
    }
  };

  const joinRoom = async () => {
    const [roomId, inviteToken] = joinCode.trim().split(".", 2);
    if (!roomId || !inviteToken) {
      setRoomError("Paste a room code in the form room.invite.");
      return;
    }
    try {
      await connect({ roomId, inviteToken, role: "friend" });
    } catch (reason) {
      setRoomStatus("error");
      setRoomError(reason instanceof Error ? reason.message : "Room connection failed");
    }
  };

  const leaveRoom = () => {
    intentionalClose.current = true;
    if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
    socketRef.current?.close(1000, "Left room");
    socketRef.current = null;
    sessionStorage.removeItem("f1-room");
    setConnection(null);
    setMembers([]);
    setRoomStatus("idle");
    setRoomError(null);
    window.history.replaceState(null, "", window.location.pathname);
  };

  const rotateInvite = async () => {
    if (!connection || connection.role !== "owner") return;
    try {
      const response = await fetch(`/f1/api/rooms/${connection.roomId}/invite`, { method: "POST", headers: { Accept: "application/json" } });
      const body = await response.json() as { inviteToken?: string; error?: string };
      if (!response.ok || !body.inviteToken) throw new Error(body.error ?? "Invite rotation failed");
      const updated = { ...connection, inviteToken: body.inviteToken };
      setConnection(updated);
      sessionStorage.setItem("f1-room", JSON.stringify(updated));
    } catch (reason) {
      setRoomError(reason instanceof Error ? reason.message : "Invite rotation failed");
    }
  };

  const copyInvite = async () => {
    if (!connection) return;
    const url = new URL("/f1", window.location.origin);
    url.hash = new URLSearchParams({ room: connection.roomId, invite: connection.inviteToken }).toString();
    await navigator.clipboard.writeText(url.toString());
  };

  if (!visible) return null;

  return (
    <section className={cn(styles.panel, styles.fullView)}>
      <div className={styles.viewIntro}><span>Access-controlled sharing</span><h1>Private rooms</h1><p>Share the selected drivers and replay cursor with up to eight invited viewers. Cloudflare Access verifies every member before the room service accepts them.</p></div>
      {!enabled ? (
        <div className={styles.lockedFeature}><ShieldCheck aria-hidden="true" /><h2>Room service locked</h2><p>The room worker is ready, but it stays closed until Cloudflare Access is configured for this route.</p><button type="button" disabled>Create private room</button></div>
      ) : connection ? (
        <div className={styles.roomActive}>
          <div className={styles.roomSummary}><span>Connected room</span><strong>{connection.roomId}</strong><p>{roomStatus === "connected" ? "Replay and driver selection are synchronized." : roomStatus === "connecting" ? "Reconnecting shared race state..." : "Room connection needs attention."}</p><div><button type="button" onClick={copyInvite}><Copy aria-hidden="true" />Copy invite link</button>{connection.role === "owner" && <button type="button" onClick={rotateInvite}><ShieldCheck aria-hidden="true" />Rotate invite</button>}<button type="button" onClick={leaveRoom}><LogOut aria-hidden="true" />Leave room</button></div></div>
          <div className={styles.roomMembers}><span>People here / {members.length}</span>{members.map((member) => <article key={member.email}><Users aria-hidden="true" /><div><strong>{member.email}</strong><small>{member.role}</small></div></article>)}</div>
        </div>
      ) : (
        <div className={styles.roomLobby}>
          <button type="button" className={styles.roomCreate} onClick={createRoom} disabled={roomStatus === "connecting"}><ShieldCheck aria-hidden="true" /><span><strong>Create private room</strong><small>Start from the current replay position</small></span></button>
          <div className={styles.roomJoin}><UserPlus aria-hidden="true" /><div><strong>Join an invite</strong><p>Paste the compact room code from a friend.</p></div><input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="room.invite" aria-label="Room invite code" /><button type="button" onClick={joinRoom} disabled={roomStatus === "connecting"}>Join room</button></div>
        </div>
      )}
      {roomError && <p className={styles.roomError} role="alert">{roomError}</p>}
    </section>
  );
}

function AiView({ data, selectedDrivers }: { data: SessionData; selectedDrivers: number[] }) {
  const drivers = selectedDrivers.map((number) => data.drivers.find((driver) => driver.driver_number === number)?.name_acronym).filter(Boolean);
  return <section className={cn(styles.panel, styles.fullView)}><div className={styles.viewIntro}><span>Optional provider</span><h1>Pit-wall copilot</h1><p>AI remains off until a secure server-side provider is configured. Race data never sends itself to a model.</p></div><div className={styles.aiGrid}><div className={styles.aiPrompt}><Bot aria-hidden="true" /><h2>Ask the race</h2><textarea disabled value={`Compare ${drivers.join(" and ") || "the selected drivers"} while accounting for tyre age.`} readOnly /><button type="button" disabled>Run with evidence</button></div><div className={styles.aiContract}><span>Every answer must include</span>{["Session timestamp", "Current lap", "Source freshness", "Drivers considered", "Evidence references", "Confidence", "Assumptions", "Facts vs inference"].map((item) => <p key={item}><i />{item}</p>)}</div></div></section>;
}

function SettingsView({ preferences, setPreference, data }: { preferences: Preferences; setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void; data: SessionData }) {
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  const notificationsSupported = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
  const togglePanel = (panel: HideablePanel) => setPreference(
    "hiddenPanels",
    preferences.hiddenPanels.includes(panel)
      ? preferences.hiddenPanels.filter((item) => item !== panel)
      : [...preferences.hiddenPanels, panel],
  );
  const teams = Array.from(new Map(data.drivers.map((driver) => [driver.team_name, driver.team_colour])).entries()).sort(([a], [b]) => a.localeCompare(b));
  const toggleTeam = (team: string) => setPreference(
    "favouriteTeams",
    preferences.favouriteTeams.includes(team)
      ? preferences.favouriteTeams.filter((item) => item !== team)
      : [...preferences.favouriteTeams, team],
  );
  const toggleNotification = async (kind: NotificationKind) => {
    if (!notificationsSupported) {
      setNotificationStatus("This browser does not support service-worker notifications.");
      return;
    }
    const enabled = preferences.notifications.includes(kind);
    if (!enabled && Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotificationStatus("Notification permission was not granted. No alert preference was saved.");
        return;
      }
    }
    setNotificationStatus(null);
    setPreference("notifications", enabled ? preferences.notifications.filter((item) => item !== kind) : [...preferences.notifications, kind]);
  };
  return (
    <section className={cn(styles.panel, styles.fullView)}>
      <div className={styles.viewIntro}><span>Local preferences</span><h1>Display settings</h1><p>These choices are stored only in this browser and apply immediately.</p></div>
      <div className={styles.settingsGrid}>
        <SettingGroup title="Theme">{(["dark", "light", "system"] as Theme[]).map((value) => <button key={value} type="button" aria-pressed={preferences.theme === value} onClick={() => setPreference("theme", value)}>{value === "dark" ? <Moon /> : value === "light" ? <Sun /> : <CircleGauge />}{value}</button>)}</SettingGroup>
        <SettingGroup title="Glass and motion">{(["full", "balanced", "reduced", "reduced-motion"] as Effects[]).map((value) => <button key={value} type="button" aria-pressed={preferences.effects === value} onClick={() => setPreference("effects", value)}><Sparkles />{value === "reduced-motion" ? "reduced motion" : value}</button>)}</SettingGroup>
        <SettingGroup title="Accessibility"><button type="button" aria-pressed={preferences.highContrast} onClick={() => setPreference("highContrast", !preferences.highContrast)}><Activity />high contrast</button>{(["metric", "imperial"] as const).map((value) => <button key={value} type="button" aria-pressed={preferences.units === value} onClick={() => setPreference("units", value)}><Gauge />{value}</button>)}</SettingGroup>
        <SettingGroup title="Dashboard">
          {(["balanced", "timing", "map", "broadcast"] as DashboardLayout[]).map((value) => <button key={value} type="button" aria-pressed={preferences.dashboardLayout === value} onClick={() => setPreference("dashboardLayout", value)}><CircleGauge />{value}</button>)}
          {(["telemetry", "events"] as HideablePanel[]).map((panel) => <button key={panel} type="button" aria-pressed={!preferences.hiddenPanels.includes(panel)} onClick={() => togglePanel(panel)}><Activity />{panel} panel</button>)}
        </SettingGroup>
        <SettingGroup title="Race view">
          <button type="button" aria-pressed={preferences.spoilerMode} onClick={() => setPreference("spoilerMode", !preferences.spoilerMode)}><ShieldCheck />spoiler protection</button>
          {(["local", "utc"] as Timezone[]).map((value) => <button key={value} type="button" aria-pressed={preferences.timezone === value} onClick={() => setPreference("timezone", value)}><CircleGauge />{value === "local" ? "local time" : "UTC"}</button>)}
        </SettingGroup>
        <SettingGroup title="Favourite teams">
          {teams.map(([team, colour]) => <button key={team} type="button" aria-pressed={preferences.favouriteTeams.includes(team)} onClick={() => toggleTeam(team)}><span className={styles.teamSwatch} style={{ background: `#${colour}` }} />{team}</button>)}
        </SettingGroup>
        <SettingGroup title="Browser notifications">
          {NOTIFICATION_KINDS.map((item) => <button key={item.value} type="button" disabled={!notificationsSupported} aria-pressed={preferences.notifications.includes(item.value)} onClick={() => toggleNotification(item.value)}><Radio />{item.label}</button>)}
          {notificationStatus && <small role="status">{notificationStatus}</small>}
        </SettingGroup>
      </div>
    </section>
  );
}

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className={styles.settingGroup}><legend>{title}</legend>{children}</fieldset>;
}

function DiagnosticsView({ data, frame, error, gateway, session, trackPoints, now, selectedTime }: { data: SessionData; frame: FrameData | null; error: string | null; gateway: GatewayHealth | null; session: Session; trackPoints: LocationPoint[]; now: number; selectedTime: number }) {
  const latestPositionTime = frame?.locations.reduce((latest, point) => Math.max(latest, Date.parse(point.date)), 0) ?? 0;
  const replayDelay = latestPositionTime ? Math.max(0, Math.round((selectedTime - latestPositionTime) / 1000)) : null;
  const archiveAge = Math.max(0, Math.round((now - data.fetchedAt) / 1000));
  const checks = [
    ["Provider", error ? "degraded" : gateway ? "edge cached" : "direct", error ? "warn" : "ok"],
    ["Backend", gateway ? "gateway online" : "browser direct", gateway ? "ok" : "warn"],
    ["Live transport", gateway?.realtimeCredentials ? "provider enabled" : "historical only", gateway?.realtimeCredentials ? "ok" : "warn"],
    ["Session archive", `${session.session_key}`, "ok"],
    ["Archive freshness", `${archiveAge}s since read`, archiveAge < 900 ? "ok" : "warn"],
    ["Drivers", `${data.drivers.length} loaded`, data.drivers.length ? "ok" : "warn"],
    ["Lap records", `${data.laps.length} events`, data.laps.length ? "ok" : "warn"],
    ["Circuit trace", `${trackPoints.length} points`, trackPoints.length ? "ok" : "warn"],
    ["Map interpolation", frame?.locations.length ? `${frame.locations.length} valid points` : "waiting", frame?.locations.length ? "ok" : "warn"],
    ["Race control", `${data.raceControl.length} events`, data.raceControl.length ? "ok" : "warn"],
    ["Radio", `${data.radio.length} clips`, data.radio.length ? "ok" : "warn"],
    ["Replay frame", frame ? `${replayDelay ?? "--"}s source delay` : "waiting", frame ? "ok" : "warn"],
    ["Pit archive", `${data.pits.length} stops`, data.pits.length ? "ok" : "warn"],
    ["Edge cache", gateway ? "available" : "not in local mode", gateway ? "ok" : "warn"],
    ["AI provider", "disabled", "warn"],
    ["Persistent database", "not configured", "warn"],
  ];
  return <section className={cn(styles.panel, styles.fullView)}><div className={styles.viewIntro}><span>Source health</span><h1>Diagnostics</h1><p>Direct readback of the current browser, provider, archive, and replay-frame state.</p></div><div className={styles.diagnosticsGrid}>{checks.map(([label, value, state]) => <article key={label}><span data-state={state} /><small>{label}</small><strong>{value}</strong></article>)}</div><div className={styles.sourceNote}><Wifi aria-hidden="true" /><div><strong>{gateway ? "Luinbytes edge gateway / OpenF1" : "OpenF1 historical API"}</strong><p>Real sourced data with persistent browser caching{gateway ? " and a same-origin edge cache" : ""}. Replay-frame requests are serialized. Live session-window access depends on provider entitlement{gateway ? gateway.realtimeCredentials ? " and is configured at the gateway" : "; no real-time credential is configured" : ""}.</p></div></div></section>;
}
