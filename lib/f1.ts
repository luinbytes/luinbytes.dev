export const OPENF1_BASE_URL = "https://api.openf1.org/v1";

function openF1BaseUrl() {
  if (typeof window !== "undefined" && window.location.hostname === "luinbytes.dev") {
    return "/f1/api/v1";
  }
  return OPENF1_BASE_URL;
}

export interface GatewayHealth {
  status: "ok";
  upstream: string;
  realtimeCredentials: boolean;
  checkedAt: string;
}

export async function loadGatewayHealth(signal?: AbortSignal): Promise<GatewayHealth | null> {
  if (typeof window === "undefined" || window.location.hostname !== "luinbytes.dev") return null;
  const response = await fetch("/f1/api/health", {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`F1 gateway health request failed (${response.status})`);
  return response.json() as Promise<GatewayHealth>;
}

export interface Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_name: string;
  country_code: string;
  circuit_short_name: string;
  date_start: string;
  year: number;
}

export interface Session {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  location: string;
  country_name: string;
  country_code: string;
  circuit_short_name: string;
  gmt_offset: string;
  year: number;
}

export interface Driver {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  headshot_url: string;
  first_name: string;
  last_name: string;
}

export interface SessionResult {
  position: number | null;
  driver_number: number;
  number_of_laps: number;
  points: number;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  duration: number | null;
  gap_to_leader: number | null;
}

export interface Lap {
  driver_number: number;
  lap_number: number;
  date_start: string;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  lap_duration: number | null;
  is_pit_out_lap: boolean;
  segments_sector_1: Array<number | null>;
  segments_sector_2: Array<number | null>;
  segments_sector_3: Array<number | null>;
  st_speed: number | null;
}

export interface Stint {
  driver_number: number;
  stint_number: number;
  lap_start: number;
  lap_end: number;
  compound: string;
  tyre_age_at_start: number;
}

export interface RaceControlEvent {
  date: string;
  driver_number: number | null;
  lap_number: number | null;
  category: string;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  message: string;
}

export interface RadioMessage {
  driver_number: number;
  date: string;
  recording_url: string;
}

export interface Weather {
  date: string;
  track_temperature: number;
  air_temperature: number;
  humidity: number;
  rainfall: number;
  wind_speed: number;
  wind_direction: number;
  pressure: number;
}

export interface LocationPoint {
  date: string;
  driver_number: number;
  x: number;
  y: number;
  z: number;
}

export interface PositionPoint {
  date: string;
  driver_number: number;
  position: number;
}

export interface IntervalPoint {
  date: string;
  driver_number: number;
  gap_to_leader: number | string | null;
  interval: number | string | null;
}

export interface CarDataPoint {
  date: string;
  driver_number: number;
  brake: number;
  drs: number;
  n_gear: number;
  rpm: number;
  speed: number;
  throttle: number;
}

export interface SessionData {
  drivers: Driver[];
  results: SessionResult[];
  laps: Lap[];
  stints: Stint[];
  raceControl: RaceControlEvent[];
  radio: RadioMessage[];
  weather: Weather[];
}

export interface FrameData {
  locations: LocationPoint[];
  positions: PositionPoint[];
  intervals: IntervalPoint[];
  telemetry: CarDataPoint[];
  fetchedAt: number;
}

const CACHE_PREFIX = "f1-command-centre:";
const CACHE_MAX_AGE = 15 * 60 * 1000;
let lastRequestAt = 0;

function wait(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Request aborted", "AbortError"));
      return;
    }

    const timeout = window.setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeout);
        reject(new DOMException("Request aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

async function openF1<T>(
  endpoint: string,
  params: Record<string, string | number>,
  signal?: AbortSignal,
  cache = true,
): Promise<T[]> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => query.append(key, String(value)));
  const url = `${openF1BaseUrl()}/${endpoint}?${query}`;
  const cacheKey = `${CACHE_PREFIX}${url}`;

  if (cache) {
    try {
      const stored = localStorage.getItem(cacheKey) ?? sessionStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored) as { at: number; value: T[] };
        if (Date.now() - parsed.at < CACHE_MAX_AGE) return parsed.value;
      }
    } catch {
      // Storage is an optional speed-up. A failed cache must not block live data.
    }
  }

  let response: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const delay = Math.max(0, 360 - (Date.now() - lastRequestAt));
    if (delay) await wait(delay, signal);
    lastRequestAt = Date.now();

    response = await fetch(url, {
      headers: { Accept: "application/json" },
      referrerPolicy: "strict-origin-when-cross-origin",
      signal,
    });

    if (response.status !== 429 || attempt === 2) break;
    const retryAfter = Number(response.headers.get("Retry-After"));
    await wait(
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 900 * 2 ** attempt,
      signal,
    );
  }

  if (!response) throw new Error(`OpenF1 ${endpoint} request did not complete`);
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`OpenF1 ${endpoint} request failed (${response.status})`);
  }

  const value = (await response.json()) as T[];
  if (cache) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), value }));
    } catch {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), value }));
      } catch {
        // Large responses may exceed storage quota; the data is still usable.
      }
    }
  }
  return value;
}

export async function loadSeason(year: number, signal?: AbortSignal) {
  const meetings = await openF1<Meeting>("meetings", { year }, signal);
  const sessions = await openF1<Session>("sessions", { year }, signal);
  return { meetings, sessions };
}

export async function loadSessionData(sessionKey: number, signal?: AbortSignal) {
  const read = <T,>(endpoint: string) =>
    openF1<T>(endpoint, { session_key: sessionKey }, signal);

  const drivers = await read<Driver>("drivers");
  const results = await read<SessionResult>("session_result");
  const laps = await read<Lap>("laps");
  const stints = await read<Stint>("stints");
  const raceControl = await read<RaceControlEvent>("race_control");
  const radio = await read<RadioMessage>("team_radio");
  const weather = await read<Weather>("weather");

  return { drivers, results, laps, stints, raceControl, radio, weather };
}

function windowParams(sessionKey: number, timestamp: number, seconds: number) {
  return {
    session_key: sessionKey,
    "date>": new Date(timestamp - seconds * 1000).toISOString(),
    "date<": new Date(timestamp + 2000).toISOString(),
  };
}

export async function loadFrameData(
  sessionKey: number,
  timestamp: number,
  driverNumbers: number[],
  signal?: AbortSignal,
): Promise<FrameData> {
  const params = windowParams(sessionKey, timestamp, 12);
  const locations = await openF1<LocationPoint>("location", params, signal);
  const telemetry: CarDataPoint[] = [];

  for (const driverNumber of driverNumbers) {
    telemetry.push(
      ...(await openF1<CarDataPoint>(
        "car_data",
        { ...params, driver_number: driverNumber },
        signal,
      )),
    );
  }

  return { locations, positions: [], intervals: [], telemetry, fetchedAt: Date.now() };
}

export async function loadTrackPath(
  sessionKey: number,
  driverNumber: number,
  lap: Lap,
  signal?: AbortSignal,
) {
  const start = Date.parse(lap.date_start);
  const duration = (lap.lap_duration ?? 120) * 1000;
  return openF1<LocationPoint>(
    "location",
    {
      session_key: sessionKey,
      driver_number: driverNumber,
      "date>": new Date(start).toISOString(),
      "date<": new Date(start + duration).toISOString(),
    },
    signal,
  );
}

export function latestAt<T extends { date: string }>(items: T[], timestamp: number) {
  let latest: T | undefined;
  for (const item of items) {
    if (Date.parse(item.date) <= timestamp && (!latest || item.date > latest.date)) {
      latest = item;
    }
  }
  return latest;
}

export function latestByDriver<T extends { date: string; driver_number: number }>(
  items: T[],
  timestamp: number,
) {
  const latest = new Map<number, T>();
  for (const item of items) {
    if (Date.parse(item.date) > timestamp) continue;
    const current = latest.get(item.driver_number);
    if (!current || item.date > current.date) latest.set(item.driver_number, item);
  }
  return latest;
}

export function lapsAt(laps: Lap[], timestamp: number) {
  const latest = new Map<number, Lap>();
  for (const lap of laps) {
    if (Date.parse(lap.date_start) > timestamp) continue;
    const current = latest.get(lap.driver_number);
    if (!current || lap.lap_number > current.lap_number) latest.set(lap.driver_number, lap);
  }
  return latest;
}

export function bestLap(laps: Lap[], driverNumber: number) {
  return laps
    .filter((lap) => lap.driver_number === driverNumber && lap.lap_duration)
    .sort((a, b) => (a.lap_duration ?? Infinity) - (b.lap_duration ?? Infinity))[0];
}

export function formatLapTime(seconds: number | null | undefined) {
  if (seconds == null) return "--";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toFixed(3).padStart(6, "0")}`;
}

export function formatGap(gap: number | string | null | undefined) {
  if (gap == null || gap === 0) return "LEADER";
  return typeof gap === "number" ? `+${gap.toFixed(3)}` : String(gap);
}

export function formatClock(timestamp: number, start: number) {
  const elapsed = Math.max(0, timestamp - start);
  const hours = Math.floor(elapsed / 3_600_000);
  const minutes = Math.floor((elapsed % 3_600_000) / 60_000);
  const seconds = Math.floor((elapsed % 60_000) / 1000);
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}
