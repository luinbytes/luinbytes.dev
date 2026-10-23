import { readFile, writeFile } from "node:fs/promises";
import { renderPage, siteRoutes } from "../.prerender/entry-server.js";

const outputDirectory = new URL("../out/", import.meta.url);

for (const route of siteRoutes) {
  const output = new URL(route.output, outputDirectory);
  const template = await readFile(output, "utf8");
  await writeFile(output, renderPage(template, route.path));
}

console.log(`Prerendered ${siteRoutes.length} pages to out.`);
