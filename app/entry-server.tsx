import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { App } from "./app";
import { RouteHead, routeForPath, siteRoutes } from "./routes";

export { routeForPath, siteRoutes };

export function renderPage(template: string, pathname: string): string {
  const route = routeForPath(pathname);
  return template
    .replace("<!--app-head-->", renderToStaticMarkup(<RouteHead route={route} />))
    .replace("<!--app-html-->", renderToString(<App route={route} />));
}
