/// <reference lib="webworker" />
const worker = self;
worker.addEventListener("install", () => worker.skipWaiting());
worker.addEventListener("activate", (event) => {
    event.waitUntil(worker.clients.claim());
});
worker.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(worker.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        const existing = clients.find((client) => new URL(client.url).pathname.startsWith("/f1"));
        const destination = event.notification.data?.url ?? "/f1";
        if (existing) {
            return existing.navigate(destination).then((client) => client?.focus());
        }
        return worker.clients.openWindow(destination);
    }));
});
