import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import test from "node:test";
import { validateAiAnalysis } from "../workers/f1-ai-contract.mts";

test("AI evidence contract rejects unsupported and malformed provider output", () => {
  const evidence = new Set(["lap:4:12"]);
  assert.throws(() => validateAiAnalysis({
    answer: "Norris is leading.",
    facts: ["Norris is leading."],
    inferences: [],
    evidenceReferences: ["classification:4"],
    confidence: 0.9,
    assumptions: [],
  }, evidence), /outside the verified race snapshot/);
  assert.throws(() => validateAiAnalysis({
    answer: "Norris is leading.",
    facts: [{ claim: "Norris is leading." }],
    inferences: [],
    evidenceReferences: ["lap:4:12"],
    confidence: 2,
    assumptions: [],
  }, evidence), /invalid evidence contract/);
  assert.deepEqual(validateAiAnalysis({
    answer: "Norris completed lap 12.",
    facts: ["Norris completed lap 12."],
    inferences: [],
    evidenceReferences: ["lap:4:12"],
    confidence: 0.92,
    assumptions: [],
  }, evidence).evidenceReferences, ["lap:4:12"]);
});

async function availablePort() {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not reserve a test port");
  const port = address.port;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForWorker(url: string, process: ChildProcess) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (process.exitCode != null) throw new Error(`Wrangler exited with code ${process.exitCode}`);
    try {
      const response = await fetch(`${url}/f1/api/health`);
      if (response.ok) return response;
    } catch {
      // The local Worker is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Timed out waiting for the local F1 gateway");
}

async function waitForCondition<T>(read: () => T | undefined, label: string) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const value = read();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

test("F1 gateway keeps private room endpoints behind Access", { timeout: 30_000 }, async () => {
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  const worker = spawn(
    "npx",
    ["wrangler", "dev", "--local", "--ip", "127.0.0.1", "--port", String(port), "--var", "ACCESS_AUD:test-audience", "--var", "ACCESS_TEAM_DOMAIN:test-team", "--var", "ACCESS_DEV_EMAIL:test@example.com", "--var", "ENVIRONMENT:test"],
    { stdio: "ignore" },
  );

  try {
    const health = await waitForWorker(origin, worker);
    const gatewayHealth = await health.json() as {
      status: string;
      upstream: string;
      realtimeCredentials: boolean;
      roomsConfigured: boolean;
      aiProviders: string[];
      mcpConfigured: boolean;
      checkedAt: string;
    };
    assert.deepEqual({ ...gatewayHealth, checkedAt: undefined }, {
      status: "ok",
      upstream: "api.openf1.org",
      realtimeCredentials: false,
      roomsConfigured: true,
      aiProviders: [],
      mcpConfigured: true,
      checkedAt: undefined,
    });
    assert.match(gatewayHealth.checkedAt, /^\d{4}-\d{2}-\d{2}T/);

    const missing = await fetch(`${origin}/f1/api/rooms`);
    assert.equal(missing.status, 401);
    assert.deepEqual(await missing.json(), { error: "Authentication required" });

    const malformed = await fetch(`${origin}/f1/api/rooms`, {
      headers: { "Cf-Access-Jwt-Assertion": "not.a.jwt" },
    });
    assert.equal(malformed.status, 401);
    assert.deepEqual(await malformed.json(), { error: "Authentication could not be verified" });

    for (const endpoint of ["mcp", "ai"]) {
      const protectedResponse = await fetch(`${origin}/f1/api/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      assert.equal(protectedResponse.status, 401, endpoint);
      assert.deepEqual(await protectedResponse.json(), { error: "Authentication required" }, endpoint);
    }

    const toolsResponse = await fetch(`${origin}/f1/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-F1-Dev-Email": "test@example.com",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    assert.equal(toolsResponse.status, 200);
    const toolsBody = await toolsResponse.json() as { result?: { tools?: Array<{ name: string }> } };
    assert.deepEqual(
      toolsBody.result?.tools?.map((tool) => tool.name),
      [
        "get_current_session",
        "get_driver_state",
        "compare_drivers",
        "get_recent_race_control",
        "get_recent_radio",
        "get_current_battles",
        "get_strategy_options",
        "get_session_summary",
        "seek_replay_timestamp",
        "get_source_health",
      ],
    );

    const healthToolResponse = await fetch(`${origin}/f1/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-F1-Dev-Email": "test@example.com",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "get_source_health", arguments: {} },
      }),
    });
    assert.equal(healthToolResponse.status, 200);
    const healthToolBody = await healthToolResponse.json() as { result?: { content?: Array<{ text?: string }> } };
    const sourceHealth = JSON.parse(healthToolBody.result?.content?.[0]?.text ?? "null") as {
      authenticatedAs?: string;
      roomsConfigured?: boolean;
      aiProviders?: string[];
    };
    assert.deepEqual(sourceHealth, {
      authenticatedAs: "test@example.com",
      upstream: "api.openf1.org",
      realtimeCredentials: false,
      roomsConfigured: true,
      aiProviders: [],
    });

    const aiResponse = await fetch(`${origin}/f1/api/ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-F1-Dev-Email": "test@example.com",
      },
      body: JSON.stringify({
        question: "Who is leading?",
        sessionKey: 9999,
        selectedTime: "2026-07-19T14:00:00Z",
        selectedDrivers: [1],
      }),
    });
    assert.equal(aiResponse.status, 503);
    assert.deepEqual(await aiResponse.json(), { error: "No AI provider configured", providers: [] });

    const createRoomResponse = await fetch(`${origin}/f1/api/rooms`, {
      method: "POST",
      headers: { "X-F1-Dev-Email": "test@example.com" },
    });
    assert.equal(createRoomResponse.status, 201);
    const createdRoom = await createRoomResponse.json() as { roomId: string; inviteToken: string };
    const roomSnapshotResponse = await fetch(`${origin}/f1/api/rooms/${createdRoom.roomId}`, {
      headers: {
        "X-F1-Dev-Email": "test@example.com",
        "X-F1-Room-Invite": createdRoom.inviteToken,
      },
    });
    assert.equal(roomSnapshotResponse.status, 200);
    const roomSnapshot = await roomSnapshotResponse.json() as {
      socketTicket: string;
      social?: { readOnly: boolean; reactions: unknown[]; predictions: unknown[]; leaderboard: unknown[] };
    };
    assert.deepEqual(roomSnapshot.social, {
      readOnly: false,
      reactions: [],
      predictions: [],
      leaderboard: [],
    });

    const socket = new WebSocket(
      `${origin.replace("http:", "ws:")}/f1/api/rooms/${createdRoom.roomId}/socket?__test_email=test%40example.com`,
      ["f1-room", roomSnapshot.socketTicket],
    );
    const socketMessages: Array<Record<string, unknown>> = [];
    socket.addEventListener("message", (event) => socketMessages.push(JSON.parse(String(event.data)) as Record<string, unknown>));
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener("error", () => reject(new Error("Room socket failed to open")), { once: true });
    });
    socket.send(JSON.stringify({
      type: "prediction",
      sessionKey: 9999,
      market: "race-winner",
      choice: "NOR",
      confidence: 0.72,
      assumption: "Track position remains decisive",
      lockAt: "2099-01-01T00:00:00.000Z",
    }));
    const predictionState = await waitForCondition(() => socketMessages.find((message) => {
      const predictions = (message.social as { predictions?: unknown[] } | undefined)?.predictions;
      return Array.isArray(predictions) && predictions.length === 1;
    }), "persisted room prediction");
    const prediction = ((predictionState.social as { predictions: Array<Record<string, unknown>> }).predictions)[0];
    assert.equal(prediction.sessionKey, 9999);
    assert.equal(prediction.choice, "NOR");
    const lockDelay = Date.parse(String(prediction.lockAt)) - Date.now();
    assert.ok(lockDelay > 295_000 && lockDelay <= 300_000, `server lock delay was ${lockDelay}`);

    await new Promise((resolve) => setTimeout(resolve, 800));
    socket.send(JSON.stringify({
      type: "prediction",
      sessionKey: 9999,
      market: "race-winner",
      choice: "PIA",
      confidence: 0.65,
      assumption: "The tyre offset changes the order",
      lockAt: "2099-01-01T00:00:00.000Z",
    }));
    const editedState = await waitForCondition(() => socketMessages.find((message) => {
      const predictions = (message.social as { predictions?: Array<Record<string, unknown>> } | undefined)?.predictions;
      return predictions?.some((item) => item.choice === "PIA") ? message : undefined;
    }), "edited room prediction");
    const editedPrediction = ((editedState.social as { predictions: Array<Record<string, unknown>> }).predictions)[0];
    assert.equal(editedPrediction.id, prediction.id);
    assert.equal(editedPrediction.lockAt, prediction.lockAt);

    socket.send(JSON.stringify({ type: "reaction", emoji: "🔥", selectedTime: 1_750_000_000_000 }));
    const reactionState = await waitForCondition(() => socketMessages.find((message) => {
      const reactions = (message.social as { reactions?: unknown[] } | undefined)?.reactions;
      return Array.isArray(reactions) && reactions.length === 1;
    }), "persisted room reaction");
    const reaction = ((reactionState.social as { reactions: Array<Record<string, unknown>> }).reactions)[0];
    assert.equal(reaction.emoji, "🔥");
    assert.equal(reaction.selectedTime, 1_750_000_000_000);
    socket.close(1000, "Test complete");

    for (let index = 0; index < 28; index += 1) {
      const withinLimit = await fetch(`${origin}/f1/api/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-F1-Dev-Email": "test@example.com" },
        body: JSON.stringify({ jsonrpc: "2.0", id: index + 10, method: "tools/list" }),
      });
      assert.equal(withinLimit.status, 200, `MCP request ${index + 3}`);
    }
    const rateLimited = await fetch(`${origin}/f1/api/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-F1-Dev-Email": "test@example.com" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 99, method: "tools/list" }),
    });
    assert.equal(rateLimited.status, 429);
    assert.equal(rateLimited.headers.get("Retry-After"), "60");

    const mutation = await fetch(`${origin}/f1/api/v1/drivers`, { method: "POST" });
    assert.equal(mutation.status, 405);
  } finally {
    worker.kill("SIGTERM");
  }
});
