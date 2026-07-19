interface Env {
  OPENF1_ORIGIN: string;
  OPENF1_AUTHORIZATION?: string;
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

function cacheSeconds(endpoint: string, query: URLSearchParams) {
  if (query.get("session_key") === "latest") return 2;
  if (SHORT_CACHE_ENDPOINTS.has(endpoint)) return 15;
  if (MEDIUM_CACHE_ENDPOINTS.has(endpoint)) return 120;
  if (endpoint === "meetings" || endpoint === "sessions") return 300;
  return 3600;
}

function gatewayResponse(upstream: Response, endpoint: string, query: URLSearchParams) {
  const headers = new Headers(upstream.headers);
  headers.set("Cache-Control", `public, max-age=${cacheSeconds(endpoint, query)}`);
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

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ error: "Method not allowed" }, 405);
    }

    const incoming = new URL(request.url);
    if (incoming.pathname === "/f1/api/health") {
      return json({
        status: "ok",
        upstream: new URL(env.OPENF1_ORIGIN).hostname,
        realtimeCredentials: Boolean(env.OPENF1_AUTHORIZATION),
        checkedAt: new Date().toISOString(),
      });
    }

    const prefix = "/f1/api/v1/";
    if (!incoming.pathname.startsWith(prefix)) {
      return json({ error: "Not found" }, 404);
    }

    const endpoint = incoming.pathname.slice(prefix.length);
    if (!ALLOWED_ENDPOINTS.has(endpoint)) {
      return json({ error: "Unsupported OpenF1 endpoint" }, 404);
    }

    const upstreamUrl = new URL(`/v1/${endpoint}`, env.OPENF1_ORIGIN);
    upstreamUrl.search = incoming.search;
    const cacheKey = new Request(incoming.toString(), { method: "GET" });
    const cached = await caches.default.match(cacheKey);
    if (cached) {
      const response = new Response(cached.body, cached);
      response.headers.set("X-F1-Cache", "HIT");
      return response;
    }

    const headers = new Headers({ Accept: "application/json" });
    if (env.OPENF1_AUTHORIZATION) headers.set("Authorization", env.OPENF1_AUTHORIZATION);

    let upstream: Response;
    try {
      upstream = await fetch(upstreamUrl, { headers, signal: request.signal });
    } catch {
      return json({ error: "OpenF1 is temporarily unreachable" }, 502);
    }

    const response = gatewayResponse(upstream, endpoint, incoming.searchParams);
    response.headers.set("X-F1-Cache", "MISS");
    if (upstream.ok && request.method === "GET") {
      context.waitUntil(caches.default.put(cacheKey, response.clone()));
    }
    return response;
  },
} satisfies ExportedHandler<Env>;
