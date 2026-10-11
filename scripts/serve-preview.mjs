import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const args = process.argv.slice(2);
const argument = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};
const host = argument("--host", "127.0.0.1");
const port = Number(argument("--port", "3004"));
const root = resolve("out");
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  const route = pathname.replace(/\/$/, "") || "/";
  let file = resolve(root, `.${route === "/" ? "/index.html" : route === "/pip" ? "/pip.html" : pathname}`);
  if (!file.startsWith(`${root}${sep}`) || pathname.includes("\0") || pathname.includes("\\")) {
    response.writeHead(400).end();
    return;
  }
  let status = 200;
  try {
    if (!(await stat(file)).isFile()) throw new Error("not-file");
  } catch {
    file = resolve(root, "404.html");
    status = 404;
  }
  try {
    const body = await readFile(file);
    response.writeHead(status, {
      "Content-Type": contentTypes[extname(file)] ?? "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": "no-cache",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(503, { "Content-Type": "text/plain" }).end("Build the site with npm run build first.");
  }
});

server.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, host, () => console.log(`Ready in 0ms at http://${host}:${port}`));
