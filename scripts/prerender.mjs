import { readFile, writeFile } from "node:fs/promises";
import { renderPage, siteRoutes } from "../.prerender/entry-server.js";

const outputDirectory = new URL("../out/", import.meta.url);
const template = await readFile(new URL("index.html", outputDirectory), "utf8");

for (const route of siteRoutes) {
  await writeFile(new URL(route.output, outputDirectory), renderPage(template, route.path));
}

console.log(`Prerendered ${siteRoutes.length} pages to out.`);
