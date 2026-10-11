import { readFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function prerenderDevelopment(): Plugin {
  return {
    name: "site-prerender-development",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.method !== "GET" || !request.headers.accept?.includes("text/html")) return next();
        const url = request.url ?? "/";
        const pathname = new URL(url, "http://localhost").pathname;
        if (pathname.startsWith("/@") || (/\.[^/]+$/.test(pathname) && !/^\/(index|pip|404)\.html$/.test(pathname))) return next();

        try {
          const template = await readFile(fileURLToPath(new URL("./index.html", import.meta.url)), "utf8");
          const { renderPage, routeForPath } = await server.ssrLoadModule("/app/entry-server.tsx");
          const html = await server.transformIndexHtml(url, renderPage(template, pathname));
          response.statusCode = routeForPath(pathname).path === "/404" ? 404 : 200;
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.end(html);
        } catch (error) {
          if (error instanceof Error) server.ssrFixStacktrace(error);
          next(error);
        }
      });
    },
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss(), prerenderDevelopment()],
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  build: {
    outDir: isSsrBuild ? ".prerender" : "out",
    emptyOutDir: true,
    copyPublicDir: !isSsrBuild,
    ...(isSsrBuild ? { rolldownOptions: { output: { entryFileNames: "entry-server.js" } } } : {}),
  },
}));
