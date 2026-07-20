import { DurableObject } from "cloudflare:workers";
import { validateAiAnalysis } from "./f1-ai-contract.mts";

type WorkerEnv = Env & {
  OPENF1_AUTHORIZATION?: string;
  ACCESS_AUD?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_DEV_EMAIL?: string;
  ENVIRONMENT?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_MODEL?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  OLLAMA_BASE_URL?: string;
  OLLAMA_API_KEY?: string;
  OLLAMA_MODEL?: string;
  AI_COMPATIBLE_BASE_URL?: string;
  AI_COMPATIBLE_API_KEY?: string;
  AI_COMPATIBLE_MODEL?: string;
  F1_ROOMS: DurableObjectNamespace<F1Room>;
};

interface AccessClaims {
  aud: string | string[];
  email: string;
  exp: number;
  iss: string;
  nbf?: number;
  sub: string;
}

interface RoomMeta {
  id: string;
  owner: string;
  createdAt: string;
  inviteHash: string;
  inviteExpiresAt: string;
}

interface RoomState {
  sessionKey: number | null;
  selectedTime: number | null;
  selectedDrivers: number[];
  updatedAt: string;
  updatedBy: string | null;
}

interface RoomReaction {
  id: string;
  emoji: "🔥" | "👀" | "😮" | "🏁";
  email: string;
  selectedTime: number;
  createdAt: string;
}

interface RoomPrediction {
  id: string;
  sessionKey?: number;
  market: "race-winner" | "safety-car" | "fastest-lap" | "next-pit";
  choice: string;
  confidence: number;
  assumption: string;
  email: string;
  createdAt: string;
  lockAt: string;
  result: string | null;
  score: number | null;
}

interface RoomSocialState {
  readOnly: boolean;
  reactions: RoomReaction[];
  predictions: RoomPrediction[];
}

interface SocketIdentity {
  email: string;
  role: "owner" | "friend";
  lastMessageAt?: Record<string, number>;
}

interface SocketTicket extends SocketIdentity {
  digest: string;
  expiresAt: number;
}

interface JsonWebKeyWithKid extends JsonWebKey {
  kid: string;
}

let accessKeys: { expiresAt: number; keys: JsonWebKeyWithKid[] } | null = null;
const requestLimits = new Map<string, { count: number; resetsAt: number }>();
const activeAiUsers = new Set<string>();
const MAX_SELECTED_TIME = 4_102_444_800_000;
let openF1Queue: Promise<void> = Promise.resolve();
let lastOpenF1RequestAt = 0;

async function scheduleOpenF1<T>(operation: () => Promise<T>) {
  const run = openF1Queue.then(async () => {
    const delay = Math.max(0, 375 - (Date.now() - lastOpenF1RequestAt));
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    lastOpenF1RequestAt = Date.now();
    return operation();
  });
  openF1Queue = run.then(() => undefined, () => undefined);
  return run;
}

function rateLimit(key: string, maximum: number, windowMs: number) {
  const now = Date.now();
  if (requestLimits.size > 1000) {
    for (const [candidate, value] of requestLimits) if (value.resetsAt <= now) requestLimits.delete(candidate);
  }
  const current = requestLimits.get(key);
  if (!current || current.resetsAt <= now) {
    requestLimits.set(key, { count: 1, resetsAt: now + windowMs });
    return true;
  }
  if (current.count >= maximum) return false;
  current.count += 1;
  return true;
}

function rateLimitedResponse(seconds: number) {
  const response = json({ error: "Rate limit exceeded. Try again shortly." }, 429);
  response.headers.set("Retry-After", String(seconds));
  return response;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("Upstream timeout"), timeoutMs);
  const abort = () => controller.abort(init.signal?.reason);
  init.signal?.addEventListener("abort", abort, { once: true });
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener("abort", abort);
  }
}

const ALLOWED_ENDPOINTS = new Set([
  "car_data",
  "championship_drivers",
  "championship_teams",
  "drivers",
  "intervals",
  "laps",
  "location",
  "meetings",
  "overtakes",
  "pit",
  "position",
  "race_control",
  "session_result",
  "sessions",
  "starting_grid",
  "stints",
  "team_radio",
  "weather",
]);

const SHORT_CACHE_ENDPOINTS = new Set(["car_data", "intervals", "location", "position"]);
const MEDIUM_CACHE_ENDPOINTS = new Set(["race_control", "team_radio", "weather"]);
const MCP_TOOLS = [
  ["get_current_session", "Get the current or requested OpenF1 session.", { session_key: { type: "integer" } }],
  ["get_driver_state", "Get a driver's classification, lap, stint, and telemetry state.", { session_key: { type: "integer" }, driver_number: { type: "integer" }, timestamp: { type: "string" } }],
  ["compare_drivers", "Compare two drivers using timing, tyres, and telemetry summaries.", { session_key: { type: "integer" }, driver_numbers: { type: "array", items: { type: "integer" }, minItems: 2, maxItems: 2 } }],
  ["get_recent_race_control", "Get recent race-control messages.", { session_key: { type: "integer" }, limit: { type: "integer", minimum: 1, maximum: 50 } }],
  ["get_recent_radio", "Get recent official team-radio metadata.", { session_key: { type: "integer" }, driver_number: { type: "integer" }, limit: { type: "integer", minimum: 1, maximum: 50 } }],
  ["get_current_battles", "Find close on-track battles from interval data.", { session_key: { type: "integer" }, threshold_seconds: { type: "number", minimum: 0.1, maximum: 10 } }],
  ["get_strategy_options", "Estimate transparent pit and tyre options from session evidence.", { session_key: { type: "integer" }, driver_number: { type: "integer" }, pit_lap: { type: "integer" } }],
  ["get_session_summary", "Summarise classification, incidents, weather, and radio availability.", { session_key: { type: "integer" } }],
  ["seek_replay_timestamp", "Return a synchronized replay snapshot around an ISO timestamp.", { session_key: { type: "integer" }, timestamp: { type: "string" }, driver_numbers: { type: "array", items: { type: "integer" }, maxItems: 2 } }],
  ["get_source_health", "Report source, Access, room, live-feed, and AI provider health.", {}],
] as const;
const MCP_REQUIRED_ARGUMENTS: Record<string, string[]> = {
  get_driver_state: ["driver_number"],
  compare_drivers: ["driver_numbers"],
  get_strategy_options: ["driver_number"],
  seek_replay_timestamp: ["timestamp"],
};

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function configuredAiProviders(env: WorkerEnv) {
  return [
    env.OPENAI_API_KEY && "openai",
    env.ANTHROPIC_API_KEY && "anthropic",
    env.GEMINI_API_KEY && "gemini",
    env.DEEPSEEK_API_KEY && "deepseek",
    env.OPENROUTER_API_KEY && "openrouter",
    env.OLLAMA_BASE_URL && env.OLLAMA_MODEL && "ollama",
    env.AI_COMPATIBLE_BASE_URL && env.AI_COMPATIBLE_MODEL && "compatible",
  ].filter((provider): provider is string => Boolean(provider));
}

function aiModel(provider: string, env: WorkerEnv) {
  if (provider === "openai") return env.OPENAI_MODEL ?? "gpt-4o-mini";
  if (provider === "anthropic") return env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
  if (provider === "gemini") return env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
  if (provider === "deepseek") return env.DEEPSEEK_MODEL ?? "deepseek-chat";
  if (provider === "openrouter") return env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
  if (provider === "ollama") return env.OLLAMA_MODEL ?? "";
  return env.AI_COMPATIBLE_MODEL ?? "";
}

function configuredProviderUrl(value: string, path: string) {
  const base = new URL(value);
  if (base.protocol !== "https:") throw new Error("Configured AI provider URL must use HTTPS");
  return new URL(path, `${base.toString().replace(/\/$/, "")}/`).toString();
}

function mcpToolResult(id: string | number | null | undefined, value: unknown) {
  return json({
    jsonrpc: "2.0",
    id: id ?? null,
    result: {
      content: [{ type: "text", text: JSON.stringify(value) }],
      structuredContent: value,
    },
  });
}

async function openF1Json(env: WorkerEnv, endpoint: string, parameters: Record<string, unknown>) {
  const url = new URL(`/v1/${endpoint}`, env.OPENF1_ORIGIN);
  for (const [key, value] of Object.entries(parameters)) {
    if (value == null || value === "") continue;
    if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, String(item)));
    else url.searchParams.set(key, String(value));
  }
  const headers = new Headers({ Accept: "application/json" });
  if (env.OPENF1_AUTHORIZATION) headers.set("Authorization", env.OPENF1_AUTHORIZATION);
  const response = await scheduleOpenF1(() => fetchWithTimeout(url, { headers }));
  if (!response.ok) throw new Error(`OpenF1 ${endpoint} request failed (${response.status})`);
  return response.json<unknown[]>();
}

type JsonRecord = Record<string, unknown>;

function records(value: unknown[]) {
  return value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item));
}

function limited(value: unknown, fallback: number, maximum = 50) {
  return Number.isInteger(value) ? Math.max(1, Math.min(maximum, Number(value))) : fallback;
}

function latestRecords(items: JsonRecord[], key: string) {
  return Array.from(new Map(items.map((item) => [String(item[key] ?? ""), item])).values());
}

async function callMcpTool(name: string, args: Record<string, unknown>, env: WorkerEnv, email: string) {
  const sessionKey = Number.isInteger(args.session_key) ? Number(args.session_key) : "latest";
  if (name === "get_source_health") {
    return {
      authenticatedAs: email,
      upstream: new URL(env.OPENF1_ORIGIN).hostname,
      realtimeCredentials: Boolean(env.OPENF1_AUTHORIZATION),
      roomsConfigured: Boolean(env.ACCESS_AUD && env.ACCESS_TEAM_DOMAIN),
      aiProviders: configuredAiProviders(env),
    };
  }
  if (name === "get_current_session") {
    const sessions = await openF1Json(env, "sessions", { session_key: sessionKey });
    return sessions[0] ?? null;
  }
  if (name === "get_recent_race_control") {
    const events = records(await openF1Json(env, "race_control", { session_key: sessionKey }));
    return events.slice(-limited(args.limit, 20)).reverse();
  }
  if (name === "get_recent_radio") {
    const radio = records(await openF1Json(env, "team_radio", {
      session_key: sessionKey,
      driver_number: Number.isInteger(args.driver_number) ? args.driver_number : undefined,
    }));
    return radio.slice(-limited(args.limit, 20)).reverse();
  }
  if (name === "get_driver_state") {
    if (!Number.isInteger(args.driver_number)) throw new Error("driver_number is required");
    const driverNumber = Number(args.driver_number);
    const [drivers, results, laps, stints, telemetry] = await Promise.all([
      openF1Json(env, "drivers", { session_key: sessionKey, driver_number: driverNumber }),
      openF1Json(env, "session_result", { session_key: sessionKey, driver_number: driverNumber }),
      openF1Json(env, "laps", { session_key: sessionKey, driver_number: driverNumber }),
      openF1Json(env, "stints", { session_key: sessionKey, driver_number: driverNumber }),
      openF1Json(env, "car_data", { session_key: sessionKey, driver_number: driverNumber, date: args.timestamp }),
    ]);
    return {
      driver: drivers[0] ?? null,
      classification: results[0] ?? null,
      latestLap: laps.at(-1) ?? null,
      currentStint: stints.at(-1) ?? null,
      telemetry: telemetry.at(-1) ?? null,
      evidence: ["drivers", "session_result", "laps", "stints", "car_data"],
    };
  }
  if (name === "compare_drivers") {
    const driverNumbers = Array.isArray(args.driver_numbers)
      ? args.driver_numbers.filter((value) => Number.isInteger(value)).slice(0, 2).map(Number)
      : [];
    if (driverNumbers.length !== 2) throw new Error("Exactly two driver_numbers are required");
    const [drivers, results, laps, stints] = await Promise.all([
      openF1Json(env, "drivers", { session_key: sessionKey }),
      openF1Json(env, "session_result", { session_key: sessionKey }),
      openF1Json(env, "laps", { session_key: sessionKey }),
      openF1Json(env, "stints", { session_key: sessionKey }),
    ]);
    const lapRecords = records(laps);
    return driverNumbers.map((driverNumber) => {
      const driverLaps = lapRecords.filter((lap) => lap.driver_number === driverNumber);
      const timed = driverLaps.map((lap) => Number(lap.lap_duration)).filter((value) => Number.isFinite(value) && value > 0);
      return {
        driver: records(drivers).find((driver) => driver.driver_number === driverNumber) ?? null,
        classification: records(results).find((result) => result.driver_number === driverNumber) ?? null,
        latestLap: driverLaps.at(-1) ?? null,
        bestLapSeconds: timed.length ? Math.min(...timed) : null,
        averageLapSeconds: timed.length ? timed.reduce((sum, value) => sum + value, 0) / timed.length : null,
        currentStint: records(stints).filter((stint) => stint.driver_number === driverNumber).at(-1) ?? null,
      };
    });
  }
  if (name === "get_current_battles") {
    const threshold = typeof args.threshold_seconds === "number" ? Math.max(0.1, Math.min(10, args.threshold_seconds)) : 2;
    const intervals = latestRecords(records(await openF1Json(env, "intervals", { session_key: sessionKey })), "driver_number");
    return intervals.filter((item) => {
      const value = typeof item.interval === "number" ? item.interval : Number.parseFloat(String(item.interval ?? ""));
      return Number.isFinite(value) && value > 0 && value <= threshold;
    });
  }
  if (name === "get_strategy_options") {
    if (!Number.isInteger(args.driver_number)) throw new Error("driver_number is required");
    const driverNumber = Number(args.driver_number);
    const [pits, stints, laps] = await Promise.all([
      openF1Json(env, "pit", { session_key: sessionKey }),
      openF1Json(env, "stints", { session_key: sessionKey, driver_number: driverNumber }),
      openF1Json(env, "laps", { session_key: sessionKey, driver_number: driverNumber }),
    ]);
    const pitDurations = records(pits)
      .map((pit) => Number(pit.lane_duration ?? pit.stop_duration ?? pit.pit_duration))
      .filter((value) => Number.isFinite(value) && value > 0 && value < 120);
    const lapDurations = records(laps).map((lap) => Number(lap.lap_duration)).filter((value) => Number.isFinite(value) && value > 0);
    const pitLoss = pitDurations.length ? pitDurations.reduce((sum, value) => sum + value, 0) / pitDurations.length : 22;
    const evidenceCount = pitDurations.length + lapDurations.length;
    return {
      driver_number: driverNumber,
      pit_lap: Number.isInteger(args.pit_lap) ? args.pit_lap : null,
      observedPitLossSeconds: Number(pitLoss.toFixed(2)),
      compoundsUsed: [...new Set(records(stints).map((stint) => stint.compound).filter(Boolean))],
      options: [
        { mode: "green", estimatedLossSeconds: Number(pitLoss.toFixed(2)) },
        { mode: "safety_car", estimatedLossSeconds: Number((pitLoss * 0.62).toFixed(2)) },
        { mode: "undercut", estimatedLossSeconds: Number((pitLoss - 1.4).toFixed(2)) },
      ],
      confidence: evidenceCount >= 12 ? 0.68 : evidenceCount >= 5 ? 0.54 : 0.35,
      assumptions: ["Pit loss is the session median proxy", "No unobserved damage or penalty", "Tyre availability is not known"],
      evidence: { pitSamples: pitDurations.length, timedLaps: lapDurations.length },
    };
  }
  if (name === "get_session_summary") {
    const [session, results, control, weather, radio] = await Promise.all([
      openF1Json(env, "sessions", { session_key: sessionKey }),
      openF1Json(env, "session_result", { session_key: sessionKey }),
      openF1Json(env, "race_control", { session_key: sessionKey }),
      openF1Json(env, "weather", { session_key: sessionKey }),
      openF1Json(env, "team_radio", { session_key: sessionKey }),
    ]);
    return {
      session: session[0] ?? null,
      classification: results.slice(0, 10),
      latestWeather: weather.at(-1) ?? null,
      recentRaceControl: control.slice(-10),
      radioClips: radio.length,
      evidence: ["sessions", "session_result", "weather", "race_control", "team_radio"],
    };
  }
  if (name === "seek_replay_timestamp") {
    const timestamp = typeof args.timestamp === "string" && Number.isFinite(Date.parse(args.timestamp)) ? args.timestamp : null;
    if (!timestamp) throw new Error("A valid ISO timestamp is required");
    const center = Date.parse(timestamp);
    const windowQuery = {
      "date>": new Date(center - 3000).toISOString(),
      "date<": new Date(center + 3000).toISOString(),
    };
    const driverNumbers = Array.isArray(args.driver_numbers)
      ? args.driver_numbers.filter((value) => Number.isInteger(value)).slice(0, 2)
      : [];
    const [positions, locations, telemetry, control, radio] = await Promise.all([
      openF1Json(env, "position", { session_key: sessionKey, ...windowQuery }),
      openF1Json(env, "location", { session_key: sessionKey, ...windowQuery }),
      openF1Json(env, "car_data", { session_key: sessionKey, ...windowQuery }),
      openF1Json(env, "race_control", { session_key: sessionKey, ...windowQuery }),
      openF1Json(env, "team_radio", { session_key: sessionKey, ...windowQuery }),
    ]);
    const filterDrivers = (items: unknown[]) => driverNumbers.length
      ? records(items).filter((item) => driverNumbers.includes(Number(item.driver_number)))
      : items;
    return { timestamp, positions: filterDrivers(positions), locations: filterDrivers(locations), telemetry: filterDrivers(telemetry), raceControl: control, radio };
  }
  throw new Error(`Unknown tool: ${name}`);
}

const AI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    facts: { type: "array", items: { type: "string" } },
    inferences: { type: "array", items: { type: "string" } },
    evidenceReferences: { type: "array", items: { type: "string" } },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    assumptions: { type: "array", items: { type: "string" } },
  },
  required: ["answer", "facts", "inferences", "evidenceReferences", "confidence", "assumptions"],
  additionalProperties: false,
} as const;

const AI_SYSTEM_PROMPT = `You are a Formula 1 race analyst. Use only the supplied structured race state. Separate sourced facts from inferences. Cite supplied evidence identifiers. State assumptions and a confidence from 0 to 1. Return JSON matching the requested schema.`;

function recordTime(item: JsonRecord, key: string) {
  const value = item[key];
  return typeof value === "string" ? Date.parse(value) : NaN;
}

async function buildAiRaceState(
  env: WorkerEnv,
  sessionKey: number,
  selectedTime: number,
  selectedDrivers: number[],
) {
  const windowQuery = {
    "date>": new Date(selectedTime - 10_000).toISOString(),
    "date<": new Date(selectedTime + 2_000).toISOString(),
  };
  const [sessionValues, driverValues, lapValues, stintValues, controlValues, positionValues, weatherValues] = await Promise.all([
    openF1Json(env, "sessions", { session_key: sessionKey }),
    openF1Json(env, "drivers", { session_key: sessionKey }),
    openF1Json(env, "laps", { session_key: sessionKey }),
    openF1Json(env, "stints", { session_key: sessionKey }),
    openF1Json(env, "race_control", { session_key: sessionKey }),
    openF1Json(env, "position", { session_key: sessionKey, ...windowQuery }),
    openF1Json(env, "weather", { session_key: sessionKey }),
  ]);
  const session = records(sessionValues)[0];
  if (!session || Number(session.session_key) !== sessionKey) throw new Error("Session could not be verified");
  const sessionStart = Date.parse(String(session.date_start ?? ""));
  const sessionEnd = Date.parse(String(session.date_end ?? ""));
  if (!Number.isFinite(sessionStart) || !Number.isFinite(sessionEnd) || selectedTime < sessionStart || selectedTime > sessionEnd + 10 * 60_000) {
    throw new Error("Replay timestamp does not belong to the requested session");
  }
  const drivers = records(driverValues).filter((driver) => selectedDrivers.includes(Number(driver.driver_number)));
  if (drivers.length !== selectedDrivers.length) throw new Error("One or more selected drivers do not belong to the requested session");
  const laps = records(lapValues)
    .filter((lap) => selectedDrivers.includes(Number(lap.driver_number)) && recordTime(lap, "date_start") <= selectedTime);
  const currentLap = laps.reduce((maximum, lap) => Math.max(maximum, Number(lap.lap_number) || 0), 0);
  const positions = latestRecords(
    records(positionValues).filter((position) => selectedDrivers.includes(Number(position.driver_number)) && recordTime(position, "date") <= selectedTime),
    "driver_number",
  );
  const stints = records(stintValues).filter((stint) =>
    selectedDrivers.includes(Number(stint.driver_number)) &&
    Number(stint.lap_start) <= currentLap &&
    (stint.lap_end == null || Number(stint.lap_end) >= currentLap),
  );
  const raceControl = records(controlValues).filter((event) => recordTime(event, "date") <= selectedTime).slice(-6);
  const weather = records(weatherValues).filter((item) => recordTime(item, "date") <= selectedTime).at(-1) ?? null;
  const evidence: Array<{ id: string; source: string; data: JsonRecord }> = [
    { id: `session:${sessionKey}`, source: "sessions", data: session },
    ...drivers.map((driver) => ({ id: `driver:${driver.driver_number}`, source: "drivers", data: driver })),
    ...positions.map((position) => ({ id: `position:${position.driver_number}:${position.position}`, source: "position", data: position })),
    ...selectedDrivers.flatMap((driverNumber) => laps.filter((lap) => Number(lap.driver_number) === driverNumber).slice(-3).map((lap) => ({
      id: `lap:${driverNumber}:${lap.lap_number}`,
      source: "laps",
      data: lap,
    }))),
    ...stints.map((stint) => ({ id: `stint:${stint.driver_number}:${stint.stint_number}`, source: "stints", data: stint })),
    ...raceControl.map((event, index) => ({ id: `race-control:${String(event.date ?? index)}`, source: "race_control", data: event })),
    ...(weather ? [{ id: `weather:${String(weather.date)}`, source: "weather", data: weather }] : []),
  ];
  const observedTimes = [
    ...laps.map((item) => recordTime(item, "date_start")),
    ...positions.map((item) => recordTime(item, "date")),
    ...raceControl.map((item) => recordTime(item, "date")),
    ...(weather ? [recordTime(weather, "date")] : []),
  ].filter(Number.isFinite);
  const latestObserved = observedTimes.length ? Math.max(...observedTimes) : NaN;
  const freshnessSeconds = Number.isFinite(latestObserved) ? Math.max(0, Math.round((selectedTime - latestObserved) / 1000)) : null;
  if (freshnessSeconds == null || freshnessSeconds > 300) throw new Error("Race evidence is too stale for a verified answer");
  return {
    sessionTimestamp: new Date(selectedTime).toISOString(),
    sessionKey,
    currentLap,
    freshnessSeconds,
    drivers: drivers.map((driver) => `${driver.driver_number} ${driver.name_acronym} / ${driver.team_name}`),
    evidence,
  } satisfies JsonRecord;
}

function extractOpenAiText(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const response = value as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> };
  if (typeof response.output_text === "string") return response.output_text;
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) if (typeof content.text === "string") return content.text;
  }
  return null;
}

async function runAiProvider(provider: string, question: string, raceState: JsonRecord, env: WorkerEnv) {
  const userPrompt = `Question: ${question}\nStructured race state: ${JSON.stringify(raceState)}`;
  let response: Response;
  let text: string | null = null;
  if (provider === "openai" && env.OPENAI_API_KEY) {
    response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.OPENAI_MODEL ?? "gpt-4o-mini",
        input: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        text: { format: { type: "json_schema", name: "f1_analysis", strict: true, schema: AI_RESPONSE_SCHEMA } },
      }),
    });
    const value = await response.json<unknown>();
    if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
    text = extractOpenAiText(value);
  } else if (provider === "anthropic" && env.ANTHROPIC_API_KEY) {
    response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
        max_tokens: 1200,
        system: AI_SYSTEM_PROMPT,
        messages: [{ role: "user", content: `${userPrompt}\nReturn only valid JSON.` }],
      }),
    });
    const value = await response.json<{ content?: Array<{ text?: string }> }>();
    if (!response.ok) throw new Error(`Anthropic request failed (${response.status})`);
    text = value.content?.find((item) => typeof item.text === "string")?.text ?? null;
  } else if (provider === "gemini" && env.GEMINI_API_KEY) {
    const model = aiModel(provider, env);
    response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": env.GEMINI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: AI_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { responseMimeType: "application/json", responseJsonSchema: AI_RESPONSE_SCHEMA },
      }),
    });
    const value = await response.json<{ candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }>();
    if (!response.ok) throw new Error(`Gemini request failed (${response.status})`);
    text = value.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === "string")?.text ?? null;
  } else if (provider === "deepseek" && env.DEEPSEEK_API_KEY) {
    response = await fetchWithTimeout("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: aiModel(provider, env),
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          { role: "user", content: `${userPrompt}\nReturn only valid JSON.` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const value = await response.json<{ choices?: Array<{ message?: { content?: string } }> }>();
    if (!response.ok) throw new Error(`DeepSeek request failed (${response.status})`);
    text = value.choices?.[0]?.message?.content ?? null;
  } else if (provider === "openrouter" && env.OPENROUTER_API_KEY) {
    response = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://luinbytes.dev/f1",
        "X-Title": "F1 Command Centre",
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_schema", json_schema: { name: "f1_analysis", strict: true, schema: AI_RESPONSE_SCHEMA } },
      }),
    });
    const value = await response.json<{ choices?: Array<{ message?: { content?: string } }> }>();
    if (!response.ok) throw new Error(`OpenRouter request failed (${response.status})`);
    text = value.choices?.[0]?.message?.content ?? null;
  } else if (provider === "ollama" && env.OLLAMA_BASE_URL && env.OLLAMA_MODEL) {
    const headers = new Headers({ "Content-Type": "application/json" });
    if (env.OLLAMA_API_KEY) headers.set("Authorization", `Bearer ${env.OLLAMA_API_KEY}`);
    response = await fetchWithTimeout(configuredProviderUrl(env.OLLAMA_BASE_URL, "/api/chat"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        format: AI_RESPONSE_SCHEMA,
        stream: false,
      }),
    }, 30_000);
    const value = await response.json<{ message?: { content?: string } }>();
    if (!response.ok) throw new Error(`Ollama request failed (${response.status})`);
    text = value.message?.content ?? null;
  } else if (provider === "compatible" && env.AI_COMPATIBLE_BASE_URL && env.AI_COMPATIBLE_MODEL) {
    const headers = new Headers({ "Content-Type": "application/json" });
    if (env.AI_COMPATIBLE_API_KEY) headers.set("Authorization", `Bearer ${env.AI_COMPATIBLE_API_KEY}`);
    response = await fetchWithTimeout(configuredProviderUrl(env.AI_COMPATIBLE_BASE_URL, "/v1/chat/completions"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: env.AI_COMPATIBLE_MODEL,
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          { role: "user", content: `${userPrompt}\nReturn only valid JSON.` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const value = await response.json<{ choices?: Array<{ message?: { content?: string } }> }>();
    if (!response.ok) throw new Error(`Compatible provider request failed (${response.status})`);
    text = value.choices?.[0]?.message?.content ?? null;
  } else {
    throw new Error("Requested AI provider is not configured");
  }
  if (!text) throw new Error("AI provider returned no analysis");
  const parsed = JSON.parse(text) as unknown;
  const evidence = Array.isArray(raceState.evidence)
    ? new Set(raceState.evidence.flatMap((item) => item && typeof item === "object" && typeof (item as JsonRecord).id === "string" ? [(item as JsonRecord).id as string] : []))
    : new Set<string>();
  return validateAiAnalysis(parsed, evidence);
}

async function handleAi(request: Request, env: WorkerEnv) {
  const auth = await authenticateAccess(request, env);
  if (auth.error || !auth.claims) return auth.error;
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const providers = configuredAiProviders(env);
  if (!providers.length) return json({ error: "No AI provider configured", providers }, 503);
  if (!rateLimit(`ai:${auth.claims.email}`, 10, 5 * 60_000)) return rateLimitedResponse(300);
  if (activeAiUsers.has(auth.claims.email)) return json({ error: "An AI request is already running for this user" }, 409);
  let body: { question?: unknown; provider?: unknown; sessionKey?: unknown; selectedTime?: unknown; selectedDrivers?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 65_536) return json({ error: "AI request is too large" }, 413);
    body = JSON.parse(raw) as typeof body;
  } catch {
    return json({ error: "Invalid JSON request" }, 400);
  }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (question.length < 3 || question.length > 1000) return json({ error: "Question must be between 3 and 1000 characters" }, 400);
  const sessionKey = Number(body.sessionKey);
  const selectedTime = typeof body.selectedTime === "string" ? Date.parse(body.selectedTime) : Number(body.selectedTime);
  const selectedDrivers = Array.isArray(body.selectedDrivers)
    ? body.selectedDrivers.filter((driver) => Number.isInteger(driver) && Number(driver) > 0 && Number(driver) < 100).slice(0, 2).map(Number)
    : [];
  if (!Number.isInteger(sessionKey) || sessionKey <= 0 || sessionKey > 1_000_000_000) return json({ error: "A valid sessionKey is required" }, 400);
  if (!Number.isFinite(selectedTime) || selectedTime <= 0 || selectedTime > MAX_SELECTED_TIME) return json({ error: "A valid selectedTime is required" }, 400);
  if (!selectedDrivers.length) return json({ error: "At least one valid selected driver is required" }, 400);
  const provider = typeof body.provider === "string" ? body.provider : providers[0];
  if (!providers.includes(provider)) return json({ error: "Requested AI provider is not configured", providers }, 400);
  activeAiUsers.add(auth.claims.email);
  try {
    const raceState = await buildAiRaceState(env, sessionKey, selectedTime, selectedDrivers);
    const analysis = await runAiProvider(provider, question, raceState, env);
    return json({
      provider,
      model: aiModel(provider, env),
      analysis,
      context: {
        sessionTimestamp: raceState.sessionTimestamp ?? null,
        currentLap: raceState.currentLap ?? null,
        freshnessSeconds: raceState.freshnessSeconds ?? null,
        driversConsidered: raceState.drivers ?? [],
      },
      verification: {
        checked: true,
        evidenceMatched: analysis.evidenceReferences.length,
        unsupportedClaims: [],
      },
    });
  } catch (reason) {
    return json({ error: reason instanceof Error ? reason.message : "AI analysis failed", provider }, 502);
  } finally {
    activeAiUsers.delete(auth.claims.email);
  }
}

function base64UrlBytes(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function parseJwtPart<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlBytes(value))) as T;
}

async function getAccessKeys(teamDomain: string, force = false) {
  if (!force && accessKeys && accessKeys.expiresAt > Date.now()) return accessKeys.keys;
  const response = await fetchWithTimeout(`https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`);
  if (!response.ok) throw new Error("Access signing keys are unavailable");
  const body = await response.json<{ keys: JsonWebKeyWithKid[] }>();
  accessKeys = { expiresAt: Date.now() + 5 * 60 * 1000, keys: body.keys };
  return body.keys;
}

async function authenticateAccess(request: Request, env: WorkerEnv) {
  const devEmail = request.headers.get("X-F1-Dev-Email") ?? (env.ENVIRONMENT === "test" ? new URL(request.url).searchParams.get("__test_email") : null);
  if (
    env.ACCESS_DEV_EMAIL &&
    env.ENVIRONMENT === "test" &&
    devEmail === env.ACCESS_DEV_EMAIL
  ) {
    return {
      claims: {
        aud: env.ACCESS_AUD ?? "local",
        email: devEmail,
        exp: Math.floor(Date.now() / 1000) + 60,
        iss: "http://localhost",
        sub: devEmail,
      } satisfies AccessClaims,
    };
  }
  if (!env.ACCESS_AUD || !env.ACCESS_TEAM_DOMAIN) {
    return { error: json({ error: "Private room authentication is not configured" }, 503) };
  }
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return { error: json({ error: "Authentication required" }, 401) };
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    if (!encodedHeader || !encodedPayload || !encodedSignature) throw new Error("Malformed token");
    const header = parseJwtPart<{ alg: string; kid: string }>(encodedHeader);
    const claims = parseJwtPart<AccessClaims>(encodedPayload);
    if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported token");
    let key = (await getAccessKeys(env.ACCESS_TEAM_DOMAIN)).find((candidate) => candidate.kid === header.kid);
    if (!key) key = (await getAccessKeys(env.ACCESS_TEAM_DOMAIN, true)).find((candidate) => candidate.kid === header.kid);
    if (!key) throw new Error("Unknown signing key");
    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      key,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      base64UrlBytes(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
    const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const issuer = `https://${env.ACCESS_TEAM_DOMAIN}.cloudflareaccess.com`;
    const now = Date.now() / 1000;
    if (!valid || !audience.includes(env.ACCESS_AUD) || claims.iss !== issuer || claims.exp <= now || (claims.nbf != null && claims.nbf > now) || !claims.email) {
      throw new Error("Invalid token claims");
    }
    return { claims };
  } catch {
    return { error: json({ error: "Authentication could not be verified" }, 401) };
  }
}

async function handleMcp(request: Request, env: WorkerEnv) {
  const auth = await authenticateAccess(request, env);
  if (auth.error || !auth.claims) return auth.error;
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!rateLimit(`mcp:${auth.claims.email}`, 30, 60_000)) return rateLimitedResponse(60);
  let body: {
    jsonrpc?: string;
    id?: string | number | null;
    method?: string;
    params?: { name?: string; arguments?: Record<string, unknown> };
  };
  try {
    const raw = await request.text();
    if (raw.length > 32_768) return json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request too large" } }, 413);
    body = JSON.parse(raw) as typeof body;
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }
  if (body.jsonrpc !== "2.0") {
    return json({ jsonrpc: "2.0", id: body.id ?? null, error: { code: -32600, message: "Invalid Request" } }, 400);
  }
  if (body.method === "initialize") {
    return json({
      jsonrpc: "2.0",
      id: body.id ?? null,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "luinbytes-f1", version: "1.0.0" },
      },
    });
  }
  if (body.method === "notifications/initialized") return new Response(null, { status: 202 });
  if (body.method === "tools/list") {
    return json({
      jsonrpc: "2.0",
      id: body.id ?? null,
      result: {
        tools: MCP_TOOLS.map(([name, description, properties]) => ({
          name,
          description,
          inputSchema: { type: "object", properties, required: MCP_REQUIRED_ARGUMENTS[name] ?? [], additionalProperties: false },
          annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
        })),
      },
    });
  }
  if (body.method === "tools/call") {
    const toolName = body.params?.name ?? "";
    const audit = { event: "f1.mcp.tool_call", email: auth.claims.email, tool: toolName, at: new Date().toISOString() };
    try {
      const value = await callMcpTool(
        toolName,
        body.params?.arguments ?? {},
        env,
        auth.claims.email,
      );
      console.log(JSON.stringify({ ...audit, outcome: "success" }));
      return mcpToolResult(body.id, value);
    } catch (reason) {
      console.log(JSON.stringify({ ...audit, outcome: "error" }));
      return json({
        jsonrpc: "2.0",
        id: body.id ?? null,
        result: {
          content: [{ type: "text", text: reason instanceof Error ? reason.message : "Tool call failed" }],
          isError: true,
        },
      });
    }
  }
  return json({ jsonrpc: "2.0", id: body.id ?? null, error: { code: -32601, message: "Method not found" } }, 404);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function token(bytes = 18) {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...values)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function handleRooms(request: Request, env: WorkerEnv) {
  const auth = await authenticateAccess(request, env);
  if (auth.error || !auth.claims) return auth.error;
  const incoming = new URL(request.url);
  const suffix = incoming.pathname.slice("/f1/api/rooms".length);

  if ((suffix === "" || suffix === "/") && request.method === "POST") {
    const roomId = token(9).toLowerCase();
    const inviteToken = token();
    const stub = env.F1_ROOMS.getByName(roomId);
    const response = await stub.fetch("https://room.internal/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: roomId, email: auth.claims.email, inviteToken }),
    });
    if (!response.ok) return response;
    return json({ roomId, inviteToken, role: "owner" }, 201);
  }

  const match = suffix.match(/^\/([a-z0-9_-]{8,32})(?:\/(socket|invite))?$/);
  if (!match) return json({ error: "Room not found" }, 404);
  const [, roomId, action] = match;
  const stub = env.F1_ROOMS.getByName(roomId);
  if (action === "invite" && request.method === "POST") {
    const inviteToken = token();
    const response = await stub.fetch(`https://room.internal/invite?email=${encodeURIComponent(auth.claims.email)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteToken }),
    });
    if (!response.ok) return response;
    return json({ roomId, inviteToken }, 200);
  }
  if (action === "invite") return json({ error: "Method not allowed" }, 405);
  const roomUrl = new URL(action === "socket" ? "https://room.internal/socket" : "https://room.internal/state");
  roomUrl.searchParams.set("email", auth.claims.email);
  const protocols = request.headers.get("Sec-WebSocket-Protocol")?.split(",").map((value) => value.trim()) ?? [];
  const credential = request.headers.get("X-F1-Room-Invite") ?? protocols.find((value) => value !== "f1-room") ?? null;
  if (credential) roomUrl.searchParams.set(action === "socket" ? "ticket" : "invite", credential);
  return stub.fetch(new Request(roomUrl, request));
}

function cacheSeconds(endpoint: string, query: URLSearchParams) {
  if (query.get("session_key") === "latest") return 2;
  if (SHORT_CACHE_ENDPOINTS.has(endpoint)) return 15;
  if (MEDIUM_CACHE_ENDPOINTS.has(endpoint)) return 120;
  if (endpoint === "meetings" || endpoint === "sessions") return 300;
  return 3600;
}

function gatewayResponse(upstream: Response, endpoint: string, query: URLSearchParams, fresh = false) {
  const headers = new Headers(upstream.headers);
  headers.set("Cache-Control", fresh ? "no-store" : `public, max-age=${cacheSeconds(endpoint, query)}`);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-F1-Gateway", "luinbytes");
  headers.delete("Set-Cookie");
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

export class F1Room extends DurableObject<WorkerEnv> {
  private meta: RoomMeta | null = null;
  private roomState: RoomState = {
    sessionKey: null,
    selectedTime: null,
    selectedDrivers: [],
    updatedAt: new Date(0).toISOString(),
    updatedBy: null,
  };
  private socialState: RoomSocialState = {
    readOnly: false,
    reactions: [],
    predictions: [],
  };

  constructor(context: DurableObjectState, env: WorkerEnv) {
    super(context, env);
    context.blockConcurrencyWhile(async () => {
      this.meta = (await context.storage.get<RoomMeta>("meta")) ?? null;
      this.roomState = (await context.storage.get<RoomState>("state")) ?? this.roomState;
      this.socialState = (await context.storage.get<RoomSocialState>("social")) ?? this.socialState;
    });
  }

  private members() {
    const identities = this.ctx.getWebSockets().map((socket) => socket.deserializeAttachment() as SocketIdentity | null);
    return Array.from(new Map(identities.filter(Boolean).map((identity) => [identity!.email, identity!])).values());
  }

  private snapshot() {
    const scores = new Map<string, { email: string; score: number; resolved: number }>();
    for (const prediction of this.socialState.predictions) {
      const current = scores.get(prediction.email) ?? { email: prediction.email, score: 0, resolved: 0 };
      if (prediction.score != null) {
        current.score += prediction.score;
        current.resolved += 1;
      }
      scores.set(prediction.email, current);
    }
    return {
      roomId: this.meta?.id,
      owner: this.meta?.owner,
      state: this.roomState,
      members: this.members(),
      social: {
        ...this.socialState,
        leaderboard: [...scores.values()].sort((a, b) => b.score - a.score || a.email.localeCompare(b.email)),
      },
    };
  }

  private broadcast() {
    const payload = JSON.stringify({ type: "room-state", ...this.snapshot() });
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(payload);
      } catch {
        socket.close(1011, "Room update failed");
      }
    }
  }

  private async roleFor(email: string, inviteToken: string | null): Promise<SocketIdentity["role"] | null> {
    if (!this.meta) return null;
    if (email === this.meta.owner) return "owner";
    if (Date.parse(this.meta.inviteExpiresAt) <= Date.now()) return null;
    if (!inviteToken || (await sha256(inviteToken)) !== this.meta.inviteHash) return null;
    return "friend";
  }

  private async issueSocketTicket(identity: SocketIdentity) {
    const value = token();
    const digest = await sha256(value);
    const now = Date.now();
    const tickets = ((await this.ctx.storage.get<SocketTicket[]>("socket-tickets")) ?? [])
      .filter((ticket) => ticket.expiresAt > now)
      .slice(-15);
    tickets.push({ ...identity, digest, expiresAt: now + 60_000 });
    await this.ctx.storage.put("socket-tickets", tickets);
    const legacyTickets = await this.ctx.storage.list({ prefix: "ticket:", limit: 32 });
    if (legacyTickets.size) await this.ctx.storage.delete([...legacyTickets.keys()]);
    return value;
  }

  private async consumeSocketTicket(email: string, value: string | null) {
    if (!value) return null;
    const digest = await sha256(value);
    const tickets = (await this.ctx.storage.get<SocketTicket[]>("socket-tickets")) ?? [];
    const ticket = tickets.find((item) => item.digest === digest);
    await this.ctx.storage.put("socket-tickets", tickets.filter((item) => item.digest !== digest && item.expiresAt > Date.now()));
    if (!ticket || ticket.email !== email || ticket.expiresAt <= Date.now()) return null;
    return { email: ticket.email, role: ticket.role } satisfies SocketIdentity;
  }

  async fetch(request: Request) {
    const incoming = new URL(request.url);
    if (incoming.pathname === "/create" && request.method === "POST") {
      if (this.meta) return json({ error: "Room already exists" }, 409);
      const body = await request.json<{ id?: string; email?: string; inviteToken?: string }>();
      if (!body.id || !body.email || !body.inviteToken) return json({ error: "Invalid room request" }, 400);
      this.meta = {
        id: body.id,
        owner: body.email,
        createdAt: new Date().toISOString(),
        inviteHash: await sha256(body.inviteToken),
        inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      await this.ctx.storage.put({ meta: this.meta, state: this.roomState, social: this.socialState });
      return json({ roomId: body.id }, 201);
    }

    const email = incoming.searchParams.get("email") ?? "";

    if (incoming.pathname === "/invite" && request.method === "POST") {
      if (!this.meta) return json({ error: "Room not found" }, 404);
      if (email !== this.meta.owner) return json({ error: "Only the room owner can rotate invites" }, 403);
      const body = await request.json<{ inviteToken?: string }>();
      if (!body.inviteToken) return json({ error: "Invalid invite request" }, 400);
      this.meta = {
        ...this.meta,
        inviteHash: await sha256(body.inviteToken),
        inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      await this.ctx.storage.put("meta", this.meta);
      await this.ctx.storage.delete("socket-tickets");
      return json({ ok: true });
    }

    if (incoming.pathname === "/state" && request.method === "GET") {
      const role = await this.roleFor(email, incoming.searchParams.get("invite"));
      if (!role) return json({ error: this.meta ? "Room invitation is invalid or expired" : "Room not found" }, this.meta ? 403 : 404);
      const socketTicket = await this.issueSocketTicket({ email, role });
      return json({ ...this.snapshot(), role, socketTicket, inviteExpiresAt: this.meta?.inviteExpiresAt });
    }

    if (incoming.pathname === "/socket" && request.headers.get("Upgrade") === "websocket") {
      const identity = await this.consumeSocketTicket(email, incoming.searchParams.get("ticket"));
      if (!identity) return json({ error: "Room socket ticket is invalid or expired" }, 403);
      if (this.ctx.getWebSockets().length >= 8) return json({ error: "Room is full" }, 409);
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.serializeAttachment(identity);
      this.ctx.acceptWebSocket(server, [identity.role, `user:${email}`]);
      server.send(JSON.stringify({ type: "room-state", ...this.snapshot(), role: identity.role }));
      this.broadcast();
      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: request.headers.get("Sec-WebSocket-Protocol") ? { "Sec-WebSocket-Protocol": "f1-room" } : undefined,
      });
    }

    return json({ error: "Method not allowed" }, 405);
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string" || message.length > 4096) {
      socket.close(1009, "Message too large");
      return;
    }
    const identity = socket.deserializeAttachment() as SocketIdentity | null;
    if (!identity) {
      socket.close(1008, "Missing room identity");
      return;
    }
    try {
      const body = JSON.parse(message) as {
        type?: string;
        sessionKey?: number;
        selectedTime?: number;
        selectedDrivers?: number[];
        emoji?: string;
        market?: string;
        choice?: string;
        confidence?: number;
        assumption?: string;
        lockAt?: string;
        result?: string;
        readOnly?: boolean;
      };
      const receivedAt = Date.now();
      const messageClass = body.type === "sync" ? "sync" : body.type === "reaction" ? "reaction" : "action";
      const minimumInterval = messageClass === "sync" ? 250 : messageClass === "reaction" ? 500 : 750;
      const lastMessages = identity.lastMessageAt && typeof identity.lastMessageAt === "object" ? identity.lastMessageAt : {};
      if (lastMessages[messageClass] && receivedAt - lastMessages[messageClass] < minimumInterval) {
        socket.send(JSON.stringify({ type: "room-error", error: "That room action was sent too quickly. Try again." }));
        return;
      }
      identity.lastMessageAt = { ...lastMessages, [messageClass]: receivedAt };
      socket.serializeAttachment(identity);
      if (body.type === "reaction") {
        const emoji = body.emoji;
        if (
          !["🔥", "👀", "😮", "🏁"].includes(emoji ?? "") ||
          !Number.isFinite(body.selectedTime) ||
          Number(body.selectedTime) <= 0 ||
          Number(body.selectedTime) > MAX_SELECTED_TIME
        ) {
          socket.send(JSON.stringify({ type: "room-error", error: "Invalid reaction timestamp." }));
          return;
        }
        if (this.socialState.readOnly && identity.role !== "owner") {
          socket.send(JSON.stringify({ type: "room-error", error: "This room is read-only." }));
          return;
        }
        this.socialState.reactions = [...this.socialState.reactions, {
          id: token(8),
          emoji: emoji as RoomReaction["emoji"],
          email: identity.email,
          selectedTime: Number(body.selectedTime),
          createdAt: new Date().toISOString(),
        }].slice(-40);
        await this.ctx.storage.put("social", this.socialState);
        this.broadcast();
        return;
      }
      if (body.type === "prediction") {
        const markets = ["race-winner", "safety-car", "fastest-lap", "next-pit"] as const;
        const market = markets.find((item) => item === body.market);
        const choice = typeof body.choice === "string" ? body.choice.trim().slice(0, 60) : "";
        const assumption = typeof body.assumption === "string" ? body.assumption.trim().slice(0, 240) : "";
        const confidence = typeof body.confidence === "number" ? Math.max(0, Math.min(1, body.confidence)) : NaN;
        if (!market || !choice || !assumption || !Number.isFinite(confidence) || !Number.isInteger(body.sessionKey) || Number(body.sessionKey) <= 0 || Number(body.sessionKey) > 1_000_000_000) {
          socket.send(JSON.stringify({ type: "room-error", error: "Prediction details are invalid." }));
          return;
        }
        if (this.socialState.readOnly && identity.role !== "owner") {
          socket.send(JSON.stringify({ type: "room-error", error: "This room is read-only." }));
          return;
        }
        const now = Date.now();
        if (this.socialState.predictions.some((item) => item.market === market && item.result != null)) {
          socket.send(JSON.stringify({ type: "room-error", error: "That prediction market is closed." }));
          return;
        }
        const existing = this.socialState.predictions.find((item) => item.email === identity.email && item.market === market && item.result == null);
        if (existing && Date.parse(existing.lockAt) <= now) {
          socket.send(JSON.stringify({ type: "room-error", error: "That prediction is locked and can no longer be edited." }));
          return;
        }
        const prediction: RoomPrediction = {
          id: existing?.id ?? token(8),
          sessionKey: Number(body.sessionKey),
          market,
          choice,
          confidence,
          assumption,
          email: identity.email,
          createdAt: existing?.createdAt ?? new Date(now).toISOString(),
          lockAt: existing?.lockAt ?? new Date(now + 5 * 60_000).toISOString(),
          result: null,
          score: null,
        };
        this.socialState.predictions = [
          ...this.socialState.predictions.filter((item) => !(item.email === identity.email && item.market === market && item.result == null)),
          prediction,
        ].slice(-100);
        await this.ctx.storage.put("social", this.socialState);
        this.broadcast();
        return;
      }
      if (body.type === "resolve-prediction") {
        if (identity.role !== "owner") {
          socket.send(JSON.stringify({ type: "room-error", error: "Only the room owner can resolve predictions." }));
          return;
        }
        const result = typeof body.result === "string" ? body.result.trim().slice(0, 60) : "";
        const unresolved = this.socialState.predictions.filter((prediction) => prediction.market === body.market && prediction.result == null);
        if (!body.market || !result || !unresolved.length) {
          socket.send(JSON.stringify({ type: "room-error", error: "That prediction market cannot be resolved." }));
          return;
        }
        if (unresolved.some((prediction) => Date.parse(prediction.lockAt) > Date.now())) {
          socket.send(JSON.stringify({ type: "room-error", error: "Wait until the market locks before resolving it." }));
          return;
        }
        this.socialState.predictions = this.socialState.predictions.map((prediction) => {
          if (prediction.market !== body.market || prediction.result != null) return prediction;
          const correct = prediction.choice.localeCompare(result, undefined, { sensitivity: "base" }) === 0;
          return { ...prediction, result, score: correct ? 10 + Math.round(prediction.confidence * 10) : 0 };
        });
        await this.ctx.storage.put("social", this.socialState);
        this.broadcast();
        return;
      }
      if (body.type === "room-mode") {
        if (identity.role !== "owner" || typeof body.readOnly !== "boolean") {
          socket.send(JSON.stringify({ type: "room-error", error: "Only the room owner can change participation mode." }));
          return;
        }
        this.socialState.readOnly = body.readOnly;
        await this.ctx.storage.put("social", this.socialState);
        this.broadcast();
        return;
      }
      if (
        body.type !== "sync" ||
        !Number.isInteger(body.sessionKey) ||
        Number(body.sessionKey) <= 0 ||
        Number(body.sessionKey) > 1_000_000_000 ||
        !Number.isFinite(body.selectedTime) ||
        Number(body.selectedTime) <= 0 ||
        Number(body.selectedTime) > 4_102_444_800_000
      ) return;
      if (this.socialState.readOnly && identity.role !== "owner") return;
      const drivers = Array.isArray(body.selectedDrivers)
        ? body.selectedDrivers.filter((driver) => Number.isInteger(driver) && driver > 0 && driver < 100).slice(0, 2)
        : [];
      this.roomState = {
        sessionKey: Number(body.sessionKey),
        selectedTime: Number(body.selectedTime),
        selectedDrivers: drivers,
        updatedAt: new Date().toISOString(),
        updatedBy: identity.email,
      };
      await this.ctx.storage.put("state", this.roomState);
      this.broadcast();
    } catch {
      socket.send(JSON.stringify({ type: "room-error", error: "Invalid room update" }));
    }
  }

  webSocketClose() {
    this.broadcast();
  }

  webSocketError(socket: WebSocket) {
    socket.close(1011, "Room connection failed");
    this.broadcast();
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv, context: ExecutionContext): Promise<Response> {

    const incoming = new URL(request.url);
    if (incoming.pathname === "/f1/api/health") {
      return json({
        status: "ok",
        upstream: new URL(env.OPENF1_ORIGIN).hostname,
        realtimeCredentials: Boolean(env.OPENF1_AUTHORIZATION),
        roomsConfigured: Boolean(env.ACCESS_AUD && env.ACCESS_TEAM_DOMAIN),
        aiProviders: configuredAiProviders(env),
        mcpConfigured: Boolean(env.ACCESS_AUD && env.ACCESS_TEAM_DOMAIN),
        checkedAt: new Date().toISOString(),
      });
    }

    if (incoming.pathname === "/f1/api/rooms" || incoming.pathname.startsWith("/f1/api/rooms/")) {
      return handleRooms(request, env);
    }

    if (incoming.pathname === "/f1/api/mcp") {
      return handleMcp(request, env);
    }

    if (incoming.pathname === "/f1/api/ai") {
      return handleAi(request, env);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ error: "Method not allowed" }, 405);
    }

    const prefix = "/f1/api/v1/";
    if (!incoming.pathname.startsWith(prefix)) {
      return json({ error: "Not found" }, 404);
    }

    const endpoint = incoming.pathname.slice(prefix.length);
    if (!ALLOWED_ENDPOINTS.has(endpoint)) {
      return json({ error: "Unsupported OpenF1 endpoint" }, 404);
    }

    const fresh = request.headers.get("X-F1-Fresh") === "1";
    const upstreamUrl = new URL(`/v1/${endpoint}`, env.OPENF1_ORIGIN);
    upstreamUrl.search = incoming.search;
    const cacheKey = new Request(incoming.toString(), { method: "GET" });
    const cached = fresh ? null : await caches.default.match(cacheKey);
    if (cached) {
      const response = new Response(cached.body, cached);
      response.headers.set("X-F1-Cache", "HIT");
      return response;
    }

    const headers = new Headers({ Accept: "application/json" });
    if (env.OPENF1_AUTHORIZATION) headers.set("Authorization", env.OPENF1_AUTHORIZATION);

    let upstream: Response;
    try {
      upstream = await fetchWithTimeout(upstreamUrl, { headers, signal: request.signal });
    } catch {
      return json({ error: "OpenF1 is temporarily unreachable" }, 502);
    }

    const response = gatewayResponse(upstream, endpoint, incoming.searchParams, fresh);
    response.headers.set("X-F1-Cache", "MISS");
    if (!fresh && upstream.ok && request.method === "GET") {
      context.waitUntil(caches.default.put(cacheKey, response.clone()));
    }
    return response;
  },
} satisfies ExportedHandler<Env>;
