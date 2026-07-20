import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

const source = "out";
const destination = ".f1-worker-assets";
const assetPrefix = "/f1-assets/_next/";
const textExtensions = new Set([".css", ".html", ".js", ".json", ".svg", ".txt", ".webmanifest"]);

if (!existsSync(join(source, "f1.html")) || !existsSync(join(source, "_next"))) {
  throw new Error("Run `npm run build` before packaging F1 Worker assets.");
}

rmSync(destination, { force: true, recursive: true });
mkdirSync(join(destination, "f1-assets"), { recursive: true });
cpSync(join(source, "f1.html"), join(destination, "f1.html"));
cpSync(join(source, "f1"), join(destination, "f1"), { recursive: true });
cpSync(join(source, "f1-sw.js"), join(destination, "f1-sw.js"));
cpSync(join(source, "_next"), join(destination, "f1-assets", "_next"), { recursive: true });

function rewriteAssetPaths(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      rewriteAssetPaths(path);
      continue;
    }
    if (!textExtensions.has(extname(entry.name))) continue;
    const content = readFileSync(path, "utf8");
    const rewritten = content.replaceAll("/_next/", assetPrefix);
    if (rewritten !== content) writeFileSync(path, rewritten);
  }
}

rewriteAssetPaths(destination);
writeFileSync(
  join(destination, "_headers"),
  `/f1\n  Cache-Control: private, no-store\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n/f1/*\n  Cache-Control: private, no-store\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n/f1-assets/*\n  Cache-Control: public, max-age=31536000, immutable\n  X-Content-Type-Options: nosniff\n`,
);

console.log(`Packaged F1 Worker assets in ${destination}`);
