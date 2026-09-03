#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { siteUrl } = require('../site.config.json');

const projectRoot = path.join(__dirname, '..');
const outputPath = path.join(projectRoot, 'public/sitemap.xml');

const staticPages = [''];

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
