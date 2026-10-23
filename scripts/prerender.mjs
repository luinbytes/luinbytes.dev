import { readFile, writeFile } from "node:fs/promises";
import { renderPage, siteRoutes } from "../.prerender/entry-server.js";
import { contentSecurityPolicy } from "./security-policy.mjs";

const outputDirectory = new URL("../out/", import.meta.url);

for (const route of siteRoutes) {
  const output = new URL(route.output, outputDirectory);
  const template = await readFile(output, "utf8");
  const html = renderPage(template, route.path).replace(
    "<!--app-policy-->",
    `<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}" />`,
  );
  await writeFile(output, html);
}

console.log(`Prerendered ${siteRoutes.length} pages to out.`);
