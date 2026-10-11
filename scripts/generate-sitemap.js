#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const { siteUrl } = JSON.parse(fs.readFileSync(path.join(projectRoot, 'site.config.json'), 'utf8'));
const outputPath = path.join(projectRoot, 'public/sitemap.xml');

const staticPages = ['', '/pip'];

function generateSitemap() {
  const lastModified = execFileSync('git', ['log', '-1', '--format=%cs'], {
    cwd: projectRoot,
    encoding: 'utf8',
  }).trim();

  const urlElements = staticPages.map(url => {
    return `  <url>
    <loc>${siteUrl}${url}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}

const sitemap = generateSitemap();
fs.writeFileSync(outputPath, sitemap);

console.log(`Generated sitemap with ${sitemap.split('<url>').length - 1} URLs to ${outputPath}`);
