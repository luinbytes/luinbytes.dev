import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.argv[2] ?? "out");
const pages = {};
for (const name of (await readdir(root)).filter((name) => name.endsWith(".html")).sort()) {
  const html = await readFile(resolve(root, name), "utf8");
  const scripts = new Set();
  const styles = new Set();
  for (const [tag] of html.matchAll(/<(?:script|link)\b[^>]*>/g)) {
    const url = tag.match(/\b(?:src|href)="([^"]+)"/)?.[1];
    if (!url?.startsWith("/assets/")) continue;
    if (tag.startsWith("<script") || /\brel="modulepreload"/.test(tag)) scripts.add(url);
    if (/\brel="stylesheet"/.test(tag)) styles.add(url);
  }
  const size = async (paths) => {
    let bytes = 0;
    for (const path of paths) bytes += (await readFile(resolve(root, `.${path}`))).length;
    return bytes;
  };
  pages[name] = {
    initialJavaScriptBytes: await size(scripts),
    stylesheetBytes: await size(styles),
    scripts: [...scripts],
    styles: [...styles],
  };
}
console.log(JSON.stringify({ root, pages }, null, 2));
