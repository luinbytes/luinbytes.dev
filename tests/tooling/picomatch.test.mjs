import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { createServer } from "vite";

const require = createRequire(import.meta.url);
const fromTypeScriptEstree = createRequire(require.resolve("@typescript-eslint/typescript-estree"));
const { globSync } = fromTypeScriptEstree("tinyglobby");

test("recursive TypeScript globs preserve file selection", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-tooling-"));
  let server;

  try {
    const paths = ["src/direct.ts", "src/ordinary/nested.ts", "src/ordinary/ignored.js"];
    if (process.platform !== "win32") {
      paths.push("src/first\nsecond/file.ts");
    }
    for (const path of paths) {
      const file = join(root, path);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, "export const value = 1;");
    }
    await writeFile(
      join(root, "entry.js"),
      'export const files = Object.keys(import.meta.glob("./src/**/*.ts"));',
    );
    server = await createServer({
      configFile: false,
      root,
      server: { middlewareMode: true, watch: null, ws: false },
    });

    const { files } = await server.ssrLoadModule("/entry.js");
    const expected = ["src/direct.ts", "src/ordinary/nested.ts"];
    assert.deepEqual(
      {
        vite: files.map(path => path.slice(2)).sort(),
        tinyglobby: globSync("src/**/*.ts", { cwd: root }).sort(),
      },
      { vite: expected, tinyglobby: expected },
    );
  } finally {
    try {
      await server?.close();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});
