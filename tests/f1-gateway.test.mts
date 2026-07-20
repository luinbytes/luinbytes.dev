import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import test from "node:test";

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

test("F1 gateway keeps private room endpoints behind Access", { timeout: 30_000 }, async () => {
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  const worker = spawn(
    "npx",
    ["wrangler", "dev", "--local", "--ip", "127.0.0.1", "--port", String(port), "--var", "ACCESS_AUD:test-audience", "--var", "ACCESS_TEAM_DOMAIN:test-team"],
    { stdio: "ignore" },
  );

  try {
    const health = await waitForWorker(origin, worker);
    assert.equal((await health.json() as { roomsConfigured: boolean }).roomsConfigured, true);

    const missing = await fetch(`${origin}/f1/api/rooms`);
    assert.equal(missing.status, 401);
    assert.deepEqual(await missing.json(), { error: "Authentication required" });

    const malformed = await fetch(`${origin}/f1/api/rooms`, {
      headers: { "Cf-Access-Jwt-Assertion": "not.a.jwt" },
    });
    assert.equal(malformed.status, 401);
    assert.deepEqual(await malformed.json(), { error: "Authentication could not be verified" });

    const mutation = await fetch(`${origin}/f1/api/v1/drivers`, { method: "POST" });
    assert.equal(mutation.status, 405);
  } finally {
    worker.kill("SIGTERM");
  }
});
