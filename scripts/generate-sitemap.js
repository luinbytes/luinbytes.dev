#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Keep in sync with site.config.ts
const siteUrl = 'https://luinbytes.dev';
const projectRoot = path.join(__dirname, '..');
const outputPath = path.join(projectRoot, 'public/sitemap.xml');

// Static pages
const staticPages = [
  '',
  '/concepts/signal-desk',
  '/concepts/signal-field',
  '/concepts/trace',
  '/ballhammer',
  '/brc-trainer',
  '/dagger-fall',
  '/linux-sonar',
  '/meteor',
  '/meteor/privacy',
  '/risk-of-anticheat',
  '/sleepr',
  '/super-hacker-golf',
];

function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];

  const urlElements = staticPages.map(url => {
    return `  <url>
    <loc>${siteUrl}${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}

// Generate and write sitemap
const sitemap = generateSitemap();
fs.writeFileSync(outputPath, sitemap);

console.log(`Generated sitemap with ${sitemap.split('<url>').length - 1} URLs to ${outputPath}`);
