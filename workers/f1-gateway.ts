import { DurableObject } from "cloudflare:workers";

type WorkerEnv = Env & {
  OPENF1_AUTHORIZATION?: string;
  ACCESS_AUD?: string;
  ACCESS_TEAM_DOMAIN?: string;
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

interface SocketIdentity {
  email: string;
  role: "owner" | "friend";
  lastMessageAt?: number;
}

interface SocketTicket extends SocketIdentity {
  expiresAt: number;
}

interface JsonWebKeyWithKid extends JsonWebKey {
  kid: string;
}

let accessKeys: { expiresAt: number; keys: JsonWebKeyWithKid[] } | null = null;

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
  const response = await fetch(`https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`);
  if (!response.ok) throw new Error("Access signing keys are unavailable");
  const body = await response.json<{ keys: JsonWebKeyWithKid[] }>();
  accessKeys = { expiresAt: Date.now() + 5 * 60 * 1000, keys: body.keys };
  return body.keys;
}

async function authenticateAccess(request: Request, env: WorkerEnv) {
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

  constructor(context: DurableObjectState, env: WorkerEnv) {
    super(context, env);
    context.blockConcurrencyWhile(async () => {
      this.meta = (await context.storage.get<RoomMeta>("meta")) ?? null;
      this.roomState = (await context.storage.get<RoomState>("state")) ?? this.roomState;
    });
  }

  private members() {
    const identities = this.ctx.getWebSockets().map((socket) => socket.deserializeAttachment() as SocketIdentity | null);
    return Array.from(new Map(identities.filter(Boolean).map((identity) => [identity!.email, identity!])).values());
  }

  private snapshot() {
    return {
      roomId: this.meta?.id,
      owner: this.meta?.owner,
      state: this.roomState,
      members: this.members(),
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
    await this.ctx.storage.put(`ticket:${digest}`, { ...identity, expiresAt: Date.now() + 60_000 } satisfies SocketTicket);
    return value;
  }

  private async consumeSocketTicket(email: string, value: string | null) {
    if (!value) return null;
    const key = `ticket:${await sha256(value)}`;
    const ticket = await this.ctx.storage.get<SocketTicket>(key);
    await this.ctx.storage.delete(key);
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
      await this.ctx.storage.put({ meta: this.meta, state: this.roomState });
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
      const tickets = await this.ctx.storage.list({ prefix: "ticket:" });
      if (tickets.size) await this.ctx.storage.delete([...tickets.keys()]);
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
    const receivedAt = Date.now();
    if (identity.lastMessageAt && receivedAt - identity.lastMessageAt < 250) return;
    identity.lastMessageAt = receivedAt;
    socket.serializeAttachment(identity);
    try {
      const body = JSON.parse(message) as { type?: string; sessionKey?: number; selectedTime?: number; selectedDrivers?: number[] };
      if (
        body.type !== "sync" ||
        !Number.isInteger(body.sessionKey) ||
        Number(body.sessionKey) <= 0 ||
        Number(body.sessionKey) > 1_000_000_000 ||
        !Number.isFinite(body.selectedTime) ||
        Number(body.selectedTime) <= 0 ||
        Number(body.selectedTime) > 4_102_444_800_000
      ) return;
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
        checkedAt: new Date().toISOString(),
      });
    }

    if (incoming.pathname === "/f1/api/rooms" || incoming.pathname.startsWith("/f1/api/rooms/")) {
      return handleRooms(request, env);
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
      upstream = await fetch(upstreamUrl, { headers, signal: request.signal });
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
