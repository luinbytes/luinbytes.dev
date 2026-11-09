import base64
import hashlib
import http.client
import json
import math
import os
import re
import signal
import socket
import subprocess
import tempfile
import time
import unittest
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlparse

from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError, expect, sync_playwright


SCREENSHOTS = Path("test-results")
SERVER_LOG = SCREENSHOTS / "dev-server.log"
READY_PATTERN = re.compile(r"\bReady in\b", re.IGNORECASE)
ANSI_COLOR_PATTERN = re.compile(r"\x1b\[[0-9;]*m")
LEGACY_ROUTES = (
    "/pip",
    "/pip.html",
    "/concepts/signal-desk",
    "/concepts/signal-field",
    "/concepts/trace",
    "/ballhammer",
    "/brc-trainer",
    "/dagger-fall",
    "/linux-sonar",
    "/meteor",
    "/meteor/privacy",
    "/risk-of-anticheat",
    "/sleepr",
    "/super-hacker-golf",
)
PORTFOLIO_NAV_LINKS = (
    ("Work", "#work"),
    ("About", "#about"),
    ("Contact", "#contact"),
)


def wait_for_condition(page: Page, expression: str, *, arg=None, timeout=30_000):
    deadline = time.monotonic() + timeout / 1000
    while time.monotonic() < deadline:
        result = page.evaluate(expression, arg)
        if result:
            return result
        time.sleep(0.05)
    raise PlaywrightTimeoutError(f"Condition did not become true: {expression}")


def control_contrast(locator):
    return locator.evaluate(
        """element => {
            const style = getComputedStyle(element);
            const channel = value => {
                const parts = value.match(/[\\d.]+/g)?.map(Number) ?? [];
                return parts.length >= 3 ? parts.slice(0, 3) : null;
            };
            const luminance = value => {
                const rgb = channel(value);
                if (!rgb) return null;
                const linear = rgb.map(component => {
                    const value = component / 255;
                    return value <= 0.04045
                        ? value / 12.92
                        : ((value + 0.055) / 1.055) ** 2.4;
                });
                return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
            };
            const foreground = luminance(style.color);
            const background = luminance(style.backgroundColor);
            if (foreground === null || background === null) return null;
            return (Math.max(foreground, background) + 0.05)
                / (Math.min(foreground, background) + 0.05);
        }"""
    )



def find_open_water(page: Page, pond, preferred=()):
    viewport = page.viewport_size
    candidates = list(preferred)
    candidates.extend(
        (x, y)
        for y in range(90, viewport["height"] - 30, 55)
        for x in range(30, viewport["width"] - 30, 55)
    )
    for x, y in candidates:
        if not (4 <= x < viewport["width"] - 4 and 4 <= y < viewport["height"] - 4):
            continue
        page.mouse.move(x, y)
        if pond.get_attribute("data-food-affordance") == "true":
            return float(x), float(y)
    raise AssertionError("No unobstructed water point found in the rendered pond")


def record_console_issue(bucket, message) -> None:
    if (
        message.type == "warning"
        and message.text == "WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost"
    ):
        return
    ignored = ("GL Driver Message", "was preloaded using link preload but not used")
    if (
        message.type == "warning"
        and "context" not in message.text.lower()
        and any(item in message.text for item in ignored)
    ):
        return
    if message.type in ("warning", "error"):
        bucket.append(f"{message.type}: {message.text}")


def test_port() -> int:
    configured_port = os.environ.get("E2E_PORT")
    if configured_port:
        return int(configured_port)

    with socket.socket() as available_port:
        available_port.bind(("127.0.0.1", 0))
        return available_port.getsockname()[1]


def wait_for_owned_server(server, server_log: Path, base_url: str) -> None:
    deadline = time.monotonic() + 90
    saw_ready = False

    while time.monotonic() < deadline:
        if server.poll() is not None:
            raise RuntimeError(
                f"Test server exited before becoming ready; see {server_log}"
            )

        if not saw_ready:
            saw_ready = READY_PATTERN.search(
                ANSI_COLOR_PATTERN.sub("", server_log.read_text(errors="replace"))
            ) is not None

        if saw_ready:
            try:
                with urllib.request.urlopen(base_url, timeout=5):
                    pass
                if server.poll() is not None:
                    raise RuntimeError(
                        f"Test server exited before becoming ready; see {server_log}"
                    )
                return
            except OSError:
                pass

        time.sleep(0.25)

    raise RuntimeError(
        f"Test server did not become ready at {base_url}; see {server_log}"
    )


class ServerStartupTests(unittest.TestCase):
    def test_colored_ready_log_still_checks_the_owned_server_over_http(self) -> None:
        class RunningServer:
            def poll(self):
                return None

        with tempfile.TemporaryDirectory() as directory:
            server_log = Path(directory) / "dev-server.log"
            server_log.write_text("\x1b[32mVITE v8.3.3\x1b[39m  \x1b[2mready in \x1b[1m104\x1b[22m ms\x1b[22m\n")
            with (
                patch("time.monotonic", side_effect=[0, 1, 91]),
                patch("time.sleep"),
                patch("urllib.request.urlopen") as request,
            ):
                wait_for_owned_server(RunningServer(), server_log, "http://127.0.0.1:1")
            request.assert_called_once_with("http://127.0.0.1:1", timeout=5)

    def test_exited_child_reports_its_owned_log_without_probing_http(self) -> None:
        class ExitedServer:
            def poll(self):
                return 1

        with tempfile.TemporaryDirectory() as directory:
            server_log = Path(directory) / "dev-server.log"
            server_log.write_text("Error: listen EADDRINUSE\n")

            with self.assertRaisesRegex(RuntimeError, re.escape(str(server_log))):
                wait_for_owned_server(
                    ExitedServer(), server_log, "http://127.0.0.1:1"
                )


class GeneratedArtifactTests(unittest.TestCase):
    def test_exported_internal_links_resolve(self) -> None:
        class Links(HTMLParser):
            def __init__(self):
                super().__init__()
                self.hrefs = []
                self.ids = set()

            def handle_starttag(self, tag, attrs):
                attrs = dict(attrs)
                if attrs.get("id"):
                    self.ids.add(attrs["id"])
                if tag == "a" and attrs.get("href"):
                    self.hrefs.append(attrs["href"])

        root = Path("out")
        for source in root.glob("*.html"):
            document = Links()
            document.feed(source.read_text())
            for href in document.hrefs:
                url = urlparse(href)
                if url.scheme or url.netloc:
                    continue
                target = root / (url.path.lstrip("/") or source.name)
                if url.path == "/":
                    target = root / "index.html"
                elif url.path and not target.suffix:
                    target = target.with_suffix(".html")
                with self.subTest(source=source, href=href):
                    self.assertTrue(target.is_file())
                    if url.fragment and target.is_file() and target.suffix == ".html":
                        destination = Links()
                        destination.feed(target.read_text())
                        self.assertIn(url.fragment, destination.ids)

    def test_sitemap_exposes_the_portfolio_and_privacy(self) -> None:
        root = ET.parse("public/sitemap.xml").getroot()
        locations = [
            location.text
            for location in root.findall(
                "{http://www.sitemaps.org/schemas/sitemap/0.9}url/"
                "{http://www.sitemaps.org/schemas/sitemap/0.9}loc"
            )
        ]

        self.assertEqual(
            locations,
            [
                "https://luinbytes.dev",
                "https://luinbytes.dev/privacy",
            ],
        )

    def test_privacy_export_serves_the_policy_page(self) -> None:
        html = Path("out/privacy.html").read_text()
        self.assertIn("<title>Privacy Policy | Lu</title>", html)
        self.assertIn('content="noindex"', html)
        self.assertIn("https://luinbytes.dev/privacy", html)
        self.assertIn("Privacy Policy", html)
        self.assertIn("Lumi Health", html)
        self.assertIn("0x6c75@gmail.com", html)
        self.assertIn("26 Oct 2026", html)
        self.assertNotIn("Nothing surfaced here.", html)


class MetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.metadata = []

    def handle_starttag(self, tag, attrs) -> None:
        attributes = dict(attrs)
        if tag == "meta" or (tag == "link" and attributes.get("rel") == "canonical"):
            self.metadata.append(attributes)


class ShareCardStaticExportTests(unittest.TestCase):
    preserved_copy = (
        "INDEPENDENT SOFTWARE / FIELD NOTES",
        "ROOT / 01",
        "luinbytes.dev",
        "I get annoyed, then I build the missing thing.",
        "ANDROID APPS · LINUX TOOLS · GAME SYSTEMS · AUTOMATION",
        "6c75",
        "LU / SOFTWARE ENGINEER",
        "BUILD / VERIFY / SHIP",
    )
    route_cards = {
        "/": "/share-cards/luinbytes-dev-pond.png",
    }
    expected_sha256 = {
        "/share-cards/luinbytes-dev-pond.png": "f2f09d3711b27c857c74eb34d8420354dfec2635e30153fe884d3095d24b3583",
    }
    route_alts = {
        "/": "Lu | Software Engineer",
    }

    def test_editable_source_contains_the_original_card_copy(self) -> None:
        source = re.sub(r"\s+", " ", Path("scripts/share-card.html").read_text())
        for text in self.preserved_copy:
            with self.subTest(text=text):
                self.assertIn(text, source)
        self.assertNotIn("I build tools that make stubborn systems behave.", source)
        self.assertNotIn("ORCHID.AI // MOBILE DEVELOPER", source)

    def test_every_scoped_route_exports_a_production_large_image_card(self) -> None:
        export_root = Path("out")

        for route, card_path in self.route_cards.items():
            with self.subTest(route=route):
                candidates = (
                    (export_root / "index.html",)
                    if route == "/"
                    else (
                        export_root / route.lstrip("/") / "index.html",
                        export_root / f"{route.lstrip('/')}.html",
                    )
                )
                exported_html = next(
                    (candidate for candidate in candidates if candidate.is_file()),
                    candidates[0],
                )
                html = exported_html.read_text()
                parser = MetadataParser()
                parser.feed(html)
                card_url = f"https://luinbytes.dev{card_path}"
                self.assertNotIn("luinbytes.github.io", html)
                properties = {
                    item.get("property"): item.get("content") for item in parser.metadata
                }
                names = {
                    item.get("name"): item.get("content") for item in parser.metadata
                }

                self.assertEqual(properties.get("og:image"), card_url)
                self.assertEqual(properties.get("og:image:width"), "1200")
                self.assertEqual(properties.get("og:image:height"), "630")
                self.assertEqual(properties.get("og:image:type"), "image/png")
                self.assertEqual(properties.get("og:image:alt"), self.route_alts[route])
                self.assertEqual(names.get("twitter:card"), "summary_large_image")
                self.assertEqual(names.get("twitter:image"), card_url)
                self.assertEqual(names.get("twitter:image:alt"), self.route_alts[route])

                if route == "/":
                    self.assertEqual(
                        next(
                            item.get("href")
                            for item in parser.metadata
                            if item.get("rel") == "canonical"
                        ),
                        "https://luinbytes.dev",
                    )
                for attribute, key in (("property", "og:image"), ("name", "twitter:image")):
                    self.assertEqual(
                        sum(item.get(attribute) == key for item in parser.metadata), 1
                    )

                png = (export_root / card_path.lstrip("/")).read_bytes()
                self.assertEqual(png[:8], b"\x89PNG\r\n\x1a\n")
                self.assertEqual(png[12:16], b"IHDR")
                self.assertEqual(
                    hashlib.sha256(png).hexdigest(), self.expected_sha256[card_path]
                )
                self.assertEqual(
                    (
                        int.from_bytes(png[16:20], "big"),
                        int.from_bytes(png[20:24], "big"),
                    ),
                    (1200, 630),
                )
                self.assertLess(len(png), 5 * 1024 * 1024)

        for exported_html in export_root.rglob("*.html"):
            with self.subTest(no_stale_card=exported_html):
                self.assertNotIn("luinbytes-dev-pink-print.png", exported_html.read_text())

        self.assertTrue((export_root / "404.html").is_file())
        for route in LEGACY_ROUTES:
            with self.subTest(removed_route=route):
                route_path = export_root / route.lstrip("/")
                self.assertFalse(route_path.with_suffix(".html").exists())
                self.assertFalse((route_path / "index.html").exists())


class BrowserTestCase(unittest.TestCase):
    server_command = ("npm", "run", "preview", "--")

    @classmethod
    def setUpClass(cls) -> None:
        SCREENSHOTS.mkdir(exist_ok=True)
        port = test_port()
        cls.server_log = SERVER_LOG.open("w")
        try:
            cls.server = subprocess.Popen(
                [
                    *cls.server_command,
                    "--host",
                    "127.0.0.1",
                    "--port",
                    str(port),
                ],
                stdout=cls.server_log,
                stderr=subprocess.STDOUT,
                start_new_session=True,
            )
        except BaseException:
            cls.server_log.close()
            raise
        cls.base_url = f"http://127.0.0.1:{port}"
        cls.playwright = None
        try:
            wait_for_owned_server(cls.server, SERVER_LOG, cls.base_url)
            cls.playwright = sync_playwright().start()
        except BaseException:
            cls.stop_server()
            raise

    @classmethod
    def stop_server(cls) -> None:
        if cls.server.poll() is None:
            os.killpg(cls.server.pid, signal.SIGTERM)
            try:
                cls.server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(cls.server.pid, signal.SIGKILL)
                cls.server.wait(timeout=10)
        cls.server_log.close()

    def pond_page(self, owner, **options) -> Page:
        page = owner.new_page(**options)
        page.add_init_script("window.__POND_TEST_DIAGNOSTICS__ = true")
        return page

    @classmethod
    def tearDownClass(cls) -> None:
        if cls.playwright is not None:
            cls.playwright.stop()
        cls.stop_server()


class DevelopmentRoutingTests(BrowserTestCase):
    server_command = ("npm", "run", "dev", "--")

    def test_html_navigations_keep_their_page_and_status(self) -> None:
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        page = browser.new_page(reduced_motion="reduce")
        for path, status, entry in (
            ("/", 200, "entry-client.tsx"),
            ("/pip", 404, "entry-not-found.tsx"),
            ("/pip.html", 404, "entry-not-found.tsx"),
            ("/privacy", 200, "entry-privacy.tsx"),
            ("/privacy.html", 200, "entry-privacy.tsx"),
            ("/missing.html", 404, "entry-not-found.tsx"),
            ("/nested/missing.file", 404, "entry-not-found.tsx"),
        ):
            with self.subTest(path=path):
                response = page.goto(f"{self.base_url}{path}", wait_until="networkidle")
                self.assertEqual(response.status, status)
                self.assertIn(f'/app/{entry}', response.text())
                expect(page.locator("h1")).to_be_visible()



class SecurityBoundaryTests(BrowserTestCase):
    def test_pond_seed_is_bounded_at_the_url_boundary(self) -> None:
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        page = self.pond_page(browser, viewport={"width": 390, "height": 844}, reduced_motion="reduce")
        page.goto(f"{self.base_url}/?pond-seed={'a' * 1024}", wait_until="networkidle")
        pond = page.locator("[data-pond-seed]")
        expect(pond).to_have_attribute("data-pond-seed", "a" * 128)
        expect(pond).to_have_attribute("data-pond-state", "running")

    def test_export_blocks_inline_scripts_and_external_connections(self) -> None:
        def serve_without_policy_header(route):
            response = route.fetch()
            headers = dict(response.headers)
            headers.pop("content-security-policy", None)
            route.fulfill(response=response, headers=headers)

        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        for path in ("/", "/privacy", "/missing/nested/page"):
            with self.subTest(path=path):
                context = browser.new_context(reduced_motion="reduce")
                try:
                    page = context.new_page()
                    page.route(f"{self.base_url}{path}", serve_without_policy_header)
                    page.goto(f"{self.base_url}{path}", wait_until="networkidle")
                    self.assertEqual(page.locator('meta[name="referrer"]').get_attribute("content"), "no-referrer")
                    result = page.evaluate("""async () => {
                        const violations = [];
                        const onViolation = event => violations.push(event.effectiveDirective);
                        document.addEventListener('securitypolicyviolation', onViolation);
                        const script = document.createElement('script');
                        script.textContent = 'window.inlineScriptRan = true';
                        document.body.append(script);
                        let connectionBlocked = false;
                        try { await fetch('https://blocked.invalid/probe'); }
                        catch { connectionBlocked = true; }
                        await new Promise(resolve => setTimeout(resolve, 50));
                        document.removeEventListener('securitypolicyviolation', onViolation);
                        script.remove();
                        return {ran: window.inlineScriptRan === true, connectionBlocked, violations};
                    }""")
                    self.assertFalse(result["ran"])
                    self.assertTrue(result["connectionBlocked"])
                    self.assertIn("script-src-elem", result["violations"])
                    self.assertIn("connect-src", result["violations"])
                finally:
                    context.close()

    def request(self, path, method="GET"):
        parsed = urlparse(self.base_url)
        connection = http.client.HTTPConnection(parsed.hostname, parsed.port, timeout=10)
        try:
            connection.request(method, path)
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    def test_preview_rejects_escape_paths_and_unsupported_methods(self) -> None:
        for path in ("/%", "/%00", "/%5cprivate", "/%2e%2e%2fpackage.json"):
            with self.subTest(path=path):
                status, headers, _ = self.request(path)
                self.assertEqual(status, 400)
                self.assertEqual(headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(self.request("/", "POST")[0], 405)
        status, headers, body = self.request("/privacy", "HEAD")
        self.assertEqual(status, 200)
        self.assertEqual(body, b"")
        self.assertGreater(int(headers["Content-Length"]), 0)
        privacy_status, _, privacy_body = self.request("/privacy")
        self.assertEqual(privacy_status, 200)
        self.assertIn(b"Privacy Policy", privacy_body)
        self.assertIn(b"0x6c75@gmail.com", privacy_body)
        self.assertIn(b"Lumi Health", privacy_body)
        for path in ("/404", "/404.html", "/missing/nested/page"):
            self.assertEqual(self.request(path)[0], 404)
        self.assertEqual(self.request("/pip///")[0], 404)
        self.assertEqual(self.request("/privacy///")[0], 200)

    def test_preview_does_not_follow_symlinks_outside_the_export(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            secret = Path(directory) / "outside.txt"
            secret.write_text("outside-export-sentinel")
            with tempfile.TemporaryDirectory(dir="out", prefix="boundary-") as exported:
                link = Path(exported) / "escape.txt"
                link.symlink_to(secret)
                status, _, body = self.request("/" + str(link.relative_to(Path("out").resolve())))
                self.assertEqual(status, 403)
                self.assertNotIn(b"outside-export-sentinel", body)


class KoiAtlasBrowserTests(BrowserTestCase):
    def koi_page(self):
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        context.add_init_script(
            """(() => {
                const query = new URLSearchParams(location.search);
                const row = Number(query.get('test-koi-row'));
                const column = Number(query.get('test-koi-column'));
                const heading = Number(query.get('test-koi-heading') ?? 0);
                if (Number.isInteger(row) && Number.isInteger(column)) {
                    const feedingPulse = query.has('test-koi-feeding') ? 0 : undefined;
                    window.__POND_TEST_KOI__ = { row, column, heading, feedingPulse };
                }
            })()"""
        )
        return self.pond_page(context)

    def capture_koi(self, page, name):
        pond = page.locator("[data-pond-state]")
        expect(pond).to_have_attribute("data-pond-state", "running", timeout=15000)
        wait_for_condition(page, "document.querySelector('[data-pond-state]')?.dataset.koiTest")
        wait_for_condition(page, "Number(document.querySelector('[data-pond-state]').dataset.frame) >= 3")
        page.screenshot(path=SCREENSHOTS / f"{name}.png")
        canvas_image = pond.locator("canvas").evaluate("canvas => canvas.toDataURL('image/png')")
        (SCREENSHOTS / f"{name}-candidate.png").write_bytes(base64.b64decode(canvas_image.partition(",")[2]))
        return canvas_image

    def test_koi_preserve_source_silhouettes_and_swimming_pivot(self) -> None:
        page = self.koi_page()
        source_rows = (
            ((0, 300), (0, 307), (0, 304), (0, 308)),
            ((300, 606), (307, 608), (304, 608), (308, 608)),
            ((606, 909), (608, 911), (608, 912), (608, 910)),
            ((909, 1256), (911, 1256), (912, 1256), (910, 1256)),
        )
        poses = [(row, column, 0, False, False) for row in range(4) for column in range(4)]
        poses += [(2, column, heading, True, feeding)
                  for feeding in (False, True)
                  for column, heading in enumerate((0, math.pi / 4, math.pi / 2, -math.pi / 4))]
        for row, column, heading, mobile, feeding in poses:
            with self.subTest(row=row, column=column, heading=heading, mobile=mobile, feeding=feeding):
                page.set_viewport_size({"width": 390, "height": 844} if mobile else {"width": 1280, "height": 800})
                page.goto(
                    f"{self.base_url}/?pond-seed=koi-tail-61&test-koi-row={row}&test-koi-column={column}"
                    f"&test-koi-heading={heading}" + ("&test-koi-feeding=1" if feeding else ""),
                    wait_until="networkidle",
                )
                name = f"koi-source-row{row}-column{column}-{'mobile' if mobile else 'desktop'}-{'feeding' if feeding else 'swimming'}"
                self.capture_koi(page, name)
                result = page.evaluate(
                    """async ({ row, column, heading, feeding, top, bottom }) => {
                        const image = new Image();
                        image.src = '/images/portfolio/pixel-koi-atlas.webp';
                        await image.decode();
                        const source = document.createElement('canvas');
                        source.width = image.width;
                        source.height = image.height;
                        const sourceContext = source.getContext('2d');
                        sourceContext.drawImage(image, 0, 0);
                        const pixels = sourceContext.getImageData(0, 0, image.width, image.height).data;
                        const host = document.querySelector('[data-pond-state]');
                        const pose = JSON.parse(host.dataset.koiTest);
                        const actual = new Image();
                        actual.src = host.querySelector('canvas').toDataURL('image/png');
                        await actual.decode();
                        const surface = document.createElement('canvas');
                        surface.width = actual.width;
                        surface.height = actual.height;
                        const context = surface.getContext('2d');
                        context.drawImage(actual, 0, 0);
                        const rendered = context.getImageData(0, 0, surface.width, surface.height).data;
                        const angle = heading + Math.PI / 2;
                        const peck = feeding ? 0.945 : 1;
                        let different = 0;
                        let compared = 0;
                        const sourceMass = { weight: 0, x: 0, y: 0 };
                        const renderedMass = { weight: 0, x: 0, y: 0 };
                        for (let y = 0; y < surface.height; y += 1) {
                            for (let x = 0; x < surface.width; x += 1) {
                                const dx = (x + 0.5) * innerWidth / surface.width - pose.x;
                                const dy = (y + 0.5) * innerHeight / surface.height - pose.y;
                                const sourceX = column * 314 + 157 + (dx * Math.cos(angle) + dy * Math.sin(angle)) * 314 / (pose.size * peck);
                                const sx = Math.floor(sourceX);
                                const sourceY = row * 314 + 157 + (-dx * Math.sin(angle) + dy * Math.cos(angle)) * 314 / (pose.size * (2 - peck));
                                const sy = Math.floor(sourceY);
                                const expected = sx >= column * 314 && sx < (column + 1) * 314 && sy >= top && sy < bottom
                                    ? pixels[(sy * image.width + sx) * 4 + 3] : 0;
                                const alpha = rendered[(y * surface.width + x) * 4 + 3];
                                if (Math.max(expected, alpha) < 16) continue;
                                compared += 1;
                                sourceMass.weight += expected;
                                sourceMass.x += x * expected;
                                sourceMass.y += y * expected;
                                renderedMass.weight += alpha;
                                renderedMass.x += x * alpha;
                                renderedMass.y += y * alpha;
                                if (Math.abs(expected - alpha) <= 3) continue;
                                let matchesSource = false;
                                for (let ny = sy - 1; ny <= sy + 1; ny += 1) {
                                    for (let nx = sx - 1; nx <= sx + 1; nx += 1) {
                                        const neighbor = nx >= column * 314 && nx < (column + 1) * 314 && ny >= top && ny < bottom
                                            ? pixels[(ny * image.width + nx) * 4 + 3] : 0;
                                        if (Math.abs(neighbor - alpha) <= 3) matchesSource = true;
                                    }
                                }
                                if (!matchesSource) different += 1;
                            }
                        }
                        const centerError = Math.hypot(
                            (sourceMass.x / sourceMass.weight - renderedMass.x / renderedMass.weight) * innerWidth / surface.width,
                            (sourceMass.y / sourceMass.weight - renderedMass.y / renderedMass.weight) * innerHeight / surface.height,
                        );
                        return { compared, different, centerError };
                    }""",
                    {"row": row, "column": column, "heading": heading, "feeding": feeding,
                     "top": source_rows[row][column][0], "bottom": source_rows[row][column][1]},
                )
                print(f"source silhouette {name}: {result}")
                self.assertGreater(result["compared"], 200)
                self.assertEqual(result["different"], 0, f"{name}: {result}")
                self.assertLessEqual(result["centerError"], 0.1, f"{name}: {result}")

    def test_all_koi_atlas_frames_match_reviewed_references(self) -> None:
        page = self.koi_page()

        def compare_reference(actual: str, reference_name: str) -> dict:
            reference = Path(__file__).parent / "references" / reference_name
            encoded = base64.b64encode(reference.read_bytes()).decode("ascii")
            result = page.evaluate(
                """async ({ actual, reference }) => {
                    const decode = async source => {
                        const image = new Image();
                        image.src = source;
                        await image.decode();
                        const surface = document.createElement('canvas');
                        surface.width = image.width;
                        surface.height = image.height;
                        const context = surface.getContext('2d', { willReadFrequently: true });
                        context.drawImage(image, 0, 0);
                        return { width: image.width, height: image.height, pixels: context.getImageData(0, 0, image.width, image.height).data };
                    };
                    const [rendered, reviewed] = await Promise.all([decode(actual), decode(reference)]);
                    if (rendered.width !== reviewed.width || rendered.height !== reviewed.height) {
                        return { dimensionsMatch: false, compared: 0, different: 0 };
                    }
                    let compared = 0;
                    let different = 0;
                    for (let index = 0; index < rendered.pixels.length; index += 4) {
                        if (rendered.pixels[index + 3] === 0 && reviewed.pixels[index + 3] === 0) continue;
                        compared += 1;
                        if ([0, 1, 2, 3].some(channel => Math.abs(rendered.pixels[index + channel] - reviewed.pixels[index + channel]) > 3)) {
                            different += 1;
                        }
                    }
                    return { dimensionsMatch: true, compared, different };
                }""",
                {
                    "actual": actual,
                    "reference": f"data:image/png;base64,{encoded}",
                },
            )
            self.assertTrue(result["dimensionsMatch"], reference_name)
            self.assertLessEqual(
                result["different"],
                max(12, int(result["compared"] * 0.001)),
                f"{reference_name}: {result['different']} of {result['compared']} visible pixels differ",
            )
            return result

        for row in (2, 0, 1, 3):
            for column in range(4):
                page.goto(
                    f"{self.base_url}/?pond-seed=koi-tail-61&test-koi-row={row}&test-koi-column={column}",
                    wait_until="networkidle",
                )
                canvas_image = self.capture_koi(page, f"koi-row{row}-desktop-column{column}")
                reference_name = f"koi-row{row}-desktop-column{column}.png"
                print(f"desktop row {row} column {column} reference: {compare_reference(canvas_image, reference_name)}")

        page.set_viewport_size({"width": 390, "height": 844})
        headings = [0, math.pi / 4, math.pi / 2, -math.pi / 4]
        for column, heading in enumerate(headings):
            page.goto(
                f"{self.base_url}/?pond-seed=koi-tail-61&test-koi-row=2&test-koi-column={column}&test-koi-heading={heading}",
                wait_until="networkidle",
            )
            canvas_image = self.capture_koi(page, f"koi-row2-mobile-column{column}")
            print(
                f"mobile row 2 column {column} reference: "
                f"{compare_reference(canvas_image, f'koi-row2-mobile-column{column}.png')}"
            )




class PondProductionTests(BrowserTestCase):
    def test_pixel_food_pause_and_reduced_motion(self) -> None:
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        page = self.pond_page(browser, viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
        self.addCleanup(page.close)
        page.goto(f"{self.base_url}/?pond-seed=pixel-lifecycle", wait_until="networkidle")
        page.get_by_role("radio", name="Pixel").check()
        pond = page.locator("[data-pond-state]")
        expect(page.locator("[data-view]")).to_have_attribute("data-view", "pixel")
        expect(pond).to_have_attribute("data-pond-state", "running")
        expect(pond).to_have_attribute("data-motion", "reduced")
        wait_for_condition(page, "document.querySelector('[data-pond-state]')?.dataset.fishPositions")
        positions = pond.get_attribute("data-fish-positions")
        wait_for_condition(page, "before => document.querySelector('[data-pond-state]')?.dataset.fishPositions !== before", arg=positions)
        x, y = find_open_water(page, pond)
        before = int(pond.get_attribute("data-food-dropped-count"))
        page.mouse.click(x, y, button="right")
        wait_for_condition(page, "before => Number(document.querySelector('[data-pond-state]')?.dataset.foodDroppedCount) > before", arg=before)
        self.assertGreater(int(pond.get_attribute("data-food-count")), 0)
        page.evaluate("""() => {
            Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
            document.dispatchEvent(new Event('visibilitychange'));
        }""")
        expect(pond).to_have_attribute("data-pond-state", "paused")
        frame = pond.get_attribute("data-frame")
        page.wait_for_timeout(300)
        self.assertEqual(pond.get_attribute("data-frame"), frame)
        page.evaluate("""() => {
            Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
            document.dispatchEvent(new Event('visibilitychange'));
        }""")
        expect(pond).to_have_attribute("data-pond-state", "running")
        wait_for_condition(page, "before => document.querySelector('[data-pond-state]')?.dataset.frame !== before", arg=frame)

    def test_renderer_failure_and_context_loss_recover_by_switching_modes(self) -> None:
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        for failure in ("load", "context-loss"):
            for mode, other in (("ASCII", "Pixel"), ("Pixel", "ASCII")):
                with self.subTest(failure=failure, mode=mode):
                    page = self.pond_page(browser, viewport={"width": 1280, "height": 800})
                    try:
                        failed = []
                        if failure == "load":
                            token = "pond-renderer-" if mode == "ASCII" else "pond-pixel-renderer-"
                            def abort_renderer(route):
                                failed.append(route.request.url)
                                route.abort()
                            page.route(f"**/{token}*.js", abort_renderer)
                        page.goto(f"{self.base_url}/?pond-seed=recovery", wait_until="networkidle")
                        pond = page.locator("[data-pond-state]")
                        if mode == "Pixel":
                            expect(pond).to_have_attribute("data-pond-state", "running")
                            page.get_by_role("radio", name=mode).check()
                        if failure == "context-loss":
                            expect(page.locator("[data-view]")).to_have_attribute("data-view", mode.lower())
                            expect(pond).to_have_attribute("data-pond-state", "running")
                            pond.locator("canvas").evaluate("canvas => canvas.dispatchEvent(new Event('webglcontextlost', {cancelable: true}))")
                        expect(pond).to_have_attribute("data-pond-state", "fallback")
                        expect(page.locator("[data-pond-transition]")).to_have_count(0, timeout=10_000)
                        self.assertIsNone(page.locator("[data-renderer]").get_attribute("data-switching"))
                        if failure == "load":
                            self.assertTrue(failed)
                        self.assertTrue(page.get_by_role("group", name="Pond view").is_visible())
                        page.get_by_role("radio", name=other).check()
                        expect(page.locator("[data-view]")).to_have_attribute("data-view", other.lower())
                        expect(pond).to_have_attribute("data-pond-state", "running")
                        expect(page.locator("[data-renderer]")).to_have_attribute("data-renderer", "three")
                        expect(pond.locator("canvas")).to_have_count(1)
                    finally:
                        page.close()

    def test_rapid_switch_during_delayed_pixel_load_keeps_latest_mode(self) -> None:
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        page = self.pond_page(browser, viewport={"width": 1280, "height": 800})
        self.addCleanup(page.close)
        held = []
        page.route("**/pond-pixel-renderer-*.js", lambda route: held.append(route))
        page.goto(f"{self.base_url}/?pond-seed=delayed-switch", wait_until="networkidle")
        pond = page.locator("[data-pond-state]")
        expect(pond).to_have_attribute("data-pond-state", "running")
        page.get_by_role("radio", name="Pixel").check()
        wait_for_condition(page, "document.querySelector('[data-view]')?.dataset.view === 'pixel'")
        expect(pond).to_have_attribute("data-pond-state", "loading")
        expect(page.locator("[data-renderer]")).to_have_attribute("data-switching", "")
        for _ in range(100):
            if held:
                break
            page.wait_for_timeout(20)
        self.assertTrue(held)
        page.get_by_role("radio", name="ASCII").check()
        expect(pond).to_have_attribute("data-pond-state", "running")
        for route in held:
            route.continue_()
        page.unroute("**/pond-pixel-renderer-*.js")
        page.wait_for_load_state("networkidle")
        expect(page.locator("[data-view]")).to_have_attribute("data-view", "ascii")
        expect(pond).to_have_attribute("data-pond-state", "running")
        expect(pond.locator("canvas")).to_have_count(1)
        expect(page.locator("[data-pond-transition]")).to_have_count(0, timeout=10_000)
        self.assertIsNone(page.locator("[data-renderer]").get_attribute("data-switching"))
        page.get_by_role("radio", name="Pixel").check()
        expect(page.locator("[data-view]")).to_have_attribute("data-view", "pixel")
        expect(pond).to_have_attribute("data-pond-state", "running")
        expect(pond.locator("canvas")).to_have_count(1)

    def test_pond_view_switch_restarts_each_interactive_scene(self) -> None:
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        for motion in ("reduce", "no-preference"):
            with self.subTest(motion=motion):
                page = self.pond_page(browser, viewport={"width": 390, "height": 844}, reduced_motion=motion)
                try:
                    errors = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    page.goto(f"{self.base_url}/?pond-seed=view-switch", wait_until="networkidle")
                    pond = page.locator("[data-pond-state]")
                    expect(pond).to_have_attribute("data-pond-state", "running")
                    expect(pond).to_have_attribute("data-motion", "reduced" if motion == "reduce" else "full")
                    ascii_option = page.get_by_role("radio", name="ASCII")
                    pixel_option = page.get_by_role("radio", name="Pixel")
                    page.locator("[data-renderer]").evaluate("""element => {
                        window.pondTransitionCount = 0;
                        new MutationObserver(records => {
                            for (const record of records) for (const node of record.addedNodes) {
                                if (node.nodeType === Node.ELEMENT_NODE && node.matches('[data-pond-transition]')) window.pondTransitionCount++;
                            }
                        }).observe(element, {childList: true});
                    }""")
                    ascii_option.focus()
                    for key, option, view in (("ArrowRight", pixel_option, "pixel"), ("ArrowLeft", ascii_option, "ascii"), ("ArrowRight", pixel_option, "pixel"), ("ArrowLeft", ascii_option, "ascii")):
                        transitions = page.evaluate("window.pondTransitionCount")
                        page.keyboard.press(key)
                        expect(option).to_be_checked()
                        expect(page.locator("[data-view]")).to_have_attribute("data-view", view)
                        expect(pond).to_have_attribute("data-pond-state", "running")
                        expect(pond.locator("canvas")).to_have_count(1)
                        if motion == "no-preference":
                            wait_for_condition(page, "before => window.pondTransitionCount > before", arg=transitions)
                        else:
                            self.assertEqual(page.evaluate("window.pondTransitionCount"), transitions)
                        expect(page.locator("[data-pond-transition]")).to_have_count(0, timeout=10_000)
                        self.assertIsNone(page.locator("[data-renderer]").get_attribute("data-switching"))
                        self.assertGreater(int(pond.get_attribute("data-fish-count")), 0)
                        x, y = find_open_water(page, pond)
                        before = int(pond.get_attribute("data-primary-impact-count"))
                        page.mouse.click(x, y)
                        wait_for_condition(page, "before => Number(document.querySelector('[data-pond-state]')?.dataset.primaryImpactCount) > before", arg=before)
                        option.focus()
                    self.assertEqual(errors, [])
                finally:
                    page.close()

    def test_pixel_view_restores_original_fish_population(self) -> None:
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        for viewport, count in (({"width": 1440, "height": 900}, 20), ({"width": 390, "height": 844}, 14)):
            with self.subTest(viewport=viewport):
                page = self.pond_page(browser, viewport=viewport)
                try:
                    page.goto(f"{self.base_url}/?pond-seed=pixel-population", wait_until="networkidle")
                    page.get_by_role("radio", name="Pixel").check()
                    pond = page.locator("[data-pond-state]")
                    expect(pond).to_have_attribute("data-pond-state", "running")
                    expect(pond).to_have_attribute("data-fish-count", str(count))
                    wait_for_condition(page, "document.querySelector('[data-pond-state]')?.dataset.fishWorldPositions")
                    positions = pond.get_attribute("data-fish-world-positions")
                    self.assertEqual(len(positions.split(";")), count)
                    wait_for_condition(page, "before => document.querySelector('[data-pond-state]')?.dataset.fishWorldPositions !== before", arg=positions)
                    self.assertGreaterEqual(int(pond.get_attribute("data-insect-count")), 2)
                finally:
                    page.close()

    def test_pixel_view_accepts_input_only_on_masked_water(self) -> None:
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        page = self.pond_page(browser, viewport={"width": 1440, "height": 900})
        self.addCleanup(page.close)
        page.goto(f"{self.base_url}/?pond-seed=pixel-water-input", wait_until="networkidle")
        pond = page.locator("[data-pond-state]")
        expect(pond).to_have_attribute("data-pond-state", "running")
        page.get_by_role("radio", name="Pixel").check()
        expect(page.locator("[data-view]")).to_have_attribute("data-view", "pixel")
        points = page.evaluate("""async () => {
            const image = new Image();
            image.src = '/images/portfolio/pixel-pond-water-layer.webp';
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.width; canvas.height = image.height;
            const context = canvas.getContext('2d');
            context.drawImage(image, 0, 0);
            const pixels = context.getImageData(0, 0, image.width, image.height).data;
            const scale = Math.max(innerWidth / image.width, innerHeight / image.height) * 1.015;
            const centerX = image.width / 2 + (innerWidth < 720 ? 170 : 0);
            const found = {};
            for (let y = 30; y < innerHeight - 30; y += 17) {
                for (let x = 30; x < innerWidth - 30; x += 17) {
                    if (!document.elementFromPoint(x, y)?.matches('[class*="pondInput"]')) continue;
                    const wx = Math.round(centerX + (x - innerWidth / 2) / scale);
                    const wy = Math.round(image.height / 2 + (y - innerHeight / 2) / scale);
                    if (wx < 2 || wy < 2 || wx >= image.width - 2 || wy >= image.height - 2) continue;
                    const alpha = (dx, dy) => pixels[((wy + dy) * image.width + wx + dx) * 4 + 3];
                    const samples = [[0, 0], [-2, 0], [2, 0], [0, -2], [0, 2]].map(([dx, dy]) => alpha(dx, dy));
                    if (samples.every(value => value === 0)) found.land ??= {x, y};
                    if (samples.every(value => value > 200)) found.water ??= {x, y};
                    if (found.land && found.water) return found;
                }
            }
            return found;
        }""")
        self.assertIn("land", points)
        self.assertIn("water", points)
        for kind, expected in (("land", "false"), ("water", "true")):
            with self.subTest(surface=kind):
                point = points[kind]
                page.mouse.move(point["x"], point["y"])
                expect(pond).to_have_attribute("data-food-affordance", expected)
                before_impact = int(pond.get_attribute("data-primary-impact-count"))
                before_food = pond.get_attribute("data-food-requested-at")
                page.mouse.click(point["x"], point["y"])
                page.mouse.click(point["x"], point["y"], button="right")
                if kind == "water":
                    wait_for_condition(page, "before => Number(document.querySelector('[data-pond-state]').dataset.primaryImpactCount) > before", arg=before_impact)
                    wait_for_condition(page, "before => document.querySelector('[data-pond-state]').dataset.foodRequestedAt !== before", arg=before_food)
                else:
                    page.wait_for_timeout(150)
                    self.assertEqual(int(pond.get_attribute("data-primary-impact-count")), before_impact)
                    self.assertEqual(pond.get_attribute("data-food-requested-at"), before_food)

    def test_pond_animates_without_test_diagnostics(self) -> None:
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        for path, motion in (("/", "no-preference"), ("/missing/nested/page", "reduce")):
            with self.subTest(path=path, motion=motion):
                page = browser.new_page(viewport={"width": 390, "height": 844}, reduced_motion=motion)
                try:
                    errors = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    page.goto(f"{self.base_url}{path}", wait_until="networkidle")
                    pond = page.locator("[data-pond-state]")
                    expect(pond).to_have_attribute("data-pond-state", "running")
                    expect(page.locator('[data-renderer]')).to_have_attribute("data-renderer", "three")
                    canvas = pond.locator("canvas")
                    expect(canvas).to_be_visible()
                    wait_for_condition(page, "getComputedStyle(document.querySelector('[data-pond-state]')).opacity === '1'")
                    first_frame = canvas.screenshot()
                    mutations = pond.evaluate("""element => new Promise(resolve => {
                        const attributes = [];
                        const observer = new MutationObserver(records => {
                            attributes.push(...records.map(record => record.attributeName));
                        });
                        observer.observe(element, { attributes: true });
                        setTimeout(() => { observer.disconnect(); resolve(attributes); }, 3000);
                    })""")
                    self.assertEqual(mutations, [])
                    self.assertEqual(pond.evaluate("element => Object.keys(element.dataset).sort()"), ["motion", "pondState"])
                    self.assertNotEqual(first_frame, canvas.screenshot())
                    self.assertEqual(errors, [])
                finally:
                    page.close()


class PortfolioTests(BrowserTestCase):
    def test_copyright_year_hydrates_when_the_visitors_clock_differs(self) -> None:
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        page = self.pond_page(browser, reduced_motion="reduce")
        issues = []
        page.on("pageerror", lambda error: issues.append(str(error)))
        page.on("console", lambda message: record_console_issue(issues, message))
        page.add_init_script("Date.prototype.getFullYear = () => 2040")
        page.goto(self.base_url, wait_until="networkidle")
        rendered = re.sub(r"<[^>]+>", "", Path("out/index.html").read_text())
        expected = re.search(r"© (\d{4}) Lu / 6C75", rendered).group(0)
        expect(page.locator("footer")).to_contain_text(expected)
        self.assertEqual(issues, [])

    def test_homepage_is_responsive_and_routes_featured_work(self) -> None:
        for viewport_name, viewport in (
            ("desktop", {"width": 1440, "height": 900}),
            ("mobile", {"width": 390, "height": 844}),
        ):
            with self.subTest(viewport=viewport_name):
                browser = self.playwright.chromium.launch()
                self.addCleanup(browser.close)
                page = self.pond_page(browser, viewport=viewport)
                page.goto(self.base_url, wait_until="networkidle")

                self.assertTrue(
                    page.get_by_role(
                        "heading", name="I make stubborn software behave."
                    ).is_visible()
                )
                expect(page.locator("#hero-title")).to_have_css("clip-path", "none")
                for project in ("Rakazo", "linux-sonar", "HomeBot", "ConnectorMap"):
                    self.assertTrue(
                        page.get_by_role("button", name=re.compile(project, re.I)).is_visible()
                    )

                wait_for_condition(
                    page,
                    "document.querySelector('[data-pond-state]')?.dataset.pondState === 'running'"
                )
                impact_count = page.locator("[data-pond-state]").get_attribute(
                    "data-primary-impact-count"
                )
                self.assertTrue(
                    page.get_by_role("group", name="Featured projects").is_visible()
                )
                page.get_by_role("button", name=re.compile("Rakazo", re.I)).click()
                self.assertEqual(
                    page.locator("[data-pond-state]").get_attribute(
                        "data-primary-impact-count"
                    ),
                    impact_count,
                )
                proof = page.get_by_text("4 highlighted merged PRs", exact=True)
                proof.wait_for(state="visible")
                self.assertTrue(proof.is_visible())
                self.assertTrue(
                    page.get_by_role("link", name="Merged work").is_visible()
                )
                self.assertLessEqual(
                    page.evaluate("document.documentElement.scrollWidth"),
                    viewport["width"],
                )
                for section in ("#work", "#about", "#contact"):
                    page.locator(section).scroll_into_view_if_needed()
                    page.wait_for_timeout(120)
                page.screenshot(
                    path=SCREENSHOTS / f"portfolio-final-{viewport_name}.png",
                    full_page=True,
                )
                browser.close()

    def test_project_marker_is_centered_for_every_selection(self) -> None:
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        for width, height in ((1440, 900), (390, 844), (320, 800)):
            with self.subTest(width=width):
                page = browser.new_page(viewport={"width": width, "height": height})
                page.goto(self.base_url, wait_until="networkidle")
                buttons = page.get_by_role("group", name="Featured projects").get_by_role("button")
                for index in range(4):
                    button = buttons.nth(index)
                    button.click()
                    page.wait_for_timeout(400)
                    self.assertEqual(button.get_attribute("aria-pressed"), "true")
                    centers = button.evaluate("""async button => {
                        const marker = button.querySelector('i');
                        let previous = null;
                        let stable = 0;
                        const deadline = performance.now() + 5000;
                        while (performance.now() < deadline) {
                            await new Promise(requestAnimationFrame);
                            const bounds = button.getBoundingClientRect();
                            const dot = marker.getBoundingClientRect();
                            const centers = [bounds.y + bounds.height / 2, dot.y + dot.height / 2];
                            stable = previous && centers.every((value, index) => Math.abs(value - previous[index]) < 0.05) ? stable + 1 : 0;
                            if (stable >= 3) return centers;
                            previous = centers;
                        }
                        throw new Error('Project marker did not settle');
                    }""")
                    self.assertAlmostEqual(centers[0], centers[1], delta=0.75)
                    if width <= 390:
                        heading = page.locator("#work article h3")
                        expect(heading).to_have_text(button.locator("strong").inner_text())
                        heading.scroll_into_view_if_needed()
                        self.assertTrue(heading.evaluate("""element => {
                            const range = document.createRange();
                            range.selectNodeContents(element);
                            const lines = [...range.getClientRects()];
                            return lines.length === 1 && lines[0].width <= element.clientWidth;
                        }"""), f"Project heading wraps at {width}px")
                page.close()

    def test_mobile_navigation_hero_viewport_and_system_color_modes(self) -> None:
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        page = self.pond_page(browser, viewport={"width": 320, "height": 640})
        page.goto(f"{self.base_url}/?pond-seed=e2e-mobile-first-view", wait_until="networkidle")

        light_signature = None
        dark_signature = None

        for width, height in ((320, 640), (390, 844)):
            with self.subTest(viewport=width):
                page.set_viewport_size({"width": width, "height": height})
                page.wait_for_timeout(700)
                self.assertLessEqual(page.evaluate("document.documentElement.scrollWidth"), width)
                self.assertLessEqual(page.evaluate("document.body.scrollWidth"), width)

                navigation = page.get_by_role("navigation", name="Portfolio navigation")
                links = navigation.get_by_role("link")
                self.assertEqual(links.count(), len(PORTFOLIO_NAV_LINKS))
                for index, (name, href) in enumerate(PORTFOLIO_NAV_LINKS):
                    with self.subTest(nav_link=name):
                        link = links.nth(index)
                        self.assertEqual(link.inner_text().strip(), name)
                        self.assertEqual(link.get_attribute("href"), href)
                        self.assertTrue(link.is_visible())
                        bounds = link.bounding_box()
                        self.assertIsNotNone(bounds)
                        self.assertGreaterEqual(bounds["width"], 44)
                        self.assertGreaterEqual(bounds["height"], 44)
                        self.assertGreaterEqual(bounds["x"], -1)
                        self.assertLessEqual(bounds["x"] + bounds["width"], width + 1)
                        link.focus()
                        self.assertTrue(
                            link.evaluate("element => document.activeElement === element")
                        )

                hero = page.locator("section[aria-labelledby='hero-title']")
                hero_actions = (
                    hero.get_by_role("link", name="Things I’ve made", exact=True),
                    hero.get_by_role("link", name="Say hello", exact=True),
                )
                for action in hero_actions:
                    self.assertTrue(action.is_visible())
                    action_bounds = action.bounding_box()
                    self.assertIsNotNone(action_bounds)
                    self.assertGreaterEqual(action_bounds["width"], 44)
                    self.assertGreaterEqual(action_bounds["height"], 44)
                    action.scroll_into_view_if_needed()
                    visible_bounds = action.bounding_box()
                    self.assertGreaterEqual(visible_bounds["y"], -1)
                    self.assertLessEqual(visible_bounds["y"] + visible_bounds["height"], height + 1)

                for color_scheme in ("light", "dark"):
                    page.emulate_media(color_scheme=color_scheme)
                    page.wait_for_timeout(40)
                    self.assertTrue(navigation.is_visible())
                    self.assertTrue(all(action.is_visible() for action in hero_actions))
                    contrast = control_contrast(hero_actions[0])
                    self.assertIsNotNone(contrast)
                    self.assertGreaterEqual(contrast, 4.5)

                    signature = page.evaluate(
                        """() => {
                            const navigation = document.querySelector('header nav');
                            const title = document.querySelector('#hero-title');
                            const action = [...document.querySelectorAll('header nav a')]
                                .find(link => link.getAttribute('href') === '#work')
                                ?.closest('header') ?? document.querySelector('header');
                            const styles = [
                                getComputedStyle(document.body),
                                getComputedStyle(navigation),
                                getComputedStyle(title),
                                getComputedStyle(action),
                            ];
                            return styles.flatMap(style => [
                                style.color,
                                style.backgroundColor,
                                style.borderColor,
                            ]);
                        }"""
                    )
                    if color_scheme == "light":
                        light_signature = signature
                    else:
                        dark_signature = signature

                self.assertNotEqual(light_signature, dark_signature)




    def test_homepage_preserves_layout_and_world_state_across_viewport_matrix(self) -> None:
        viewports = (
            ("phone-320", {"width": 320, "height": 568}),
            ("phone-375", {"width": 375, "height": 667}),
            ("phone-390", {"width": 390, "height": 844}),
            ("phone-430", {"width": 430, "height": 932}),
            ("tablet-portrait", {"width": 768, "height": 1024}),
            ("tablet-landscape", {"width": 1024, "height": 768}),
            ("desktop-1280", {"width": 1280, "height": 800}),
            ("desktop-1440", {"width": 1440, "height": 900}),
            ("desktop-1920", {"width": 1920, "height": 1080}),
        )
        browser = self.playwright.chromium.launch()
        page = self.pond_page(browser, viewport={"width": 1440, "height": 900})
        page_errors = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.goto(f"{self.base_url}/?pond-seed=e2e-viewport-matrix", wait_until="networkidle")
        pond = page.locator("[data-pond-state]")
        wait_for_condition(
            page,
            "document.querySelector('[data-pond-state]')?.dataset.fishWorldPositions"
        )

        last_known = {}
        for name, viewport in viewports:
            with self.subTest(viewport=name):
                previous_frame = pond.get_attribute("data-frame")
                sampled_at = time.monotonic()
                before_snapshot = pond.evaluate("element => ({ids: element.dataset.fishIds, positions: element.dataset.fishWorldPositions})")
                previous_world = dict(zip(
                    before_snapshot["ids"].split(";"),
                    [tuple(float(value) for value in point.split(",")) for point in before_snapshot["positions"].split(";")],
                ))
                last_known.update({fish_id: (position, sampled_at) for fish_id, position in previous_world.items()})
                page.set_viewport_size(viewport)
                wait_for_condition(page, "viewport => document.querySelector('[data-pond-state]')?.dataset.resizeViewport === viewport", arg=f"{viewport['width']}x{viewport['height']}")
                self.assertEqual(float(pond.get_attribute("data-resize-fish-displacement")), 0, "resize moved fish")
                wait_for_condition(
                    page,
                    "frame => document.querySelector('[data-pond-state]')?.dataset.frame !== frame",
                    arg=previous_frame,
                )
                page.wait_for_timeout(260)
                state = page.evaluate(
                    """({ width, height }) => {
                        const heading = document.querySelector('#hero-title').getBoundingClientRect();
                        const header = document.querySelector('header').getBoundingClientRect();
                        const pond = document.querySelector('[data-renderer]').getBoundingClientRect();
                        const buttons = [...document.querySelectorAll('[aria-label="Featured projects"] button')]
                            .map(element => element.getBoundingClientRect());
                        const projectNames = [...document.querySelectorAll('[aria-label="Featured projects"] strong')];
                        const aboutCards = [...document.querySelectorAll('#about > article, #about > div:last-child')];
                        const layoutWidth = document.documentElement.clientWidth;
                        const fish = document.querySelector('[data-pond-state]').dataset.fishPositions
                            .split(';').map(point => point.split(',').map(Number));
                        return {
                            overflow: document.documentElement.scrollWidth - width,
                            headingInside: heading.left >= -1 && heading.right <= width + 1 && heading.width > 120,
                            headerInside: header.left >= -1 && header.right <= width + 1,
                            pondFits: Math.abs(pond.width - width) < 1 && Math.abs(pond.height - height) < 1,
                            projectTargets: buttons.length === 4 && buttons.every(button => button.width >= 44 && button.height >= 44),
                            projectDistribution: width <= 430 || (buttons.length === 4 && Math.abs(buttons[3].right - document.querySelector('[aria-label="Featured projects"]').getBoundingClientRect().right) < 2),
                            projectNamesFit: width > 430 || projectNames.every(element => {
                                const range = document.createRange();
                                range.selectNodeContents(element);
                                return range.getBoundingClientRect().width <= element.getBoundingClientRect().width + 1;
                            }),
                            aboutCardsCentered: width > 430 || aboutCards.every(element => {
                                const bounds = element.getBoundingClientRect();
                                return Math.abs(bounds.left - (layoutWidth - bounds.right)) <= 1;
                            }),
                            visibleFish: fish.filter(([x, y]) => x >= -12 && x <= width + 12 && y >= -12 && y <= height + 12).length,
                        };
                    }""",
                    viewport,
                )
                self.assertLessEqual(state["overflow"], 0)
                self.assertTrue(state["headingInside"])
                self.assertTrue(state["headerInside"])
                self.assertTrue(state["pondFits"])
                self.assertTrue(state["projectTargets"])
                self.assertTrue(state["projectDistribution"])
                self.assertTrue(state["projectNamesFit"])
                self.assertTrue(state["aboutCardsCentered"])
                self.assertGreaterEqual(state["visibleFish"], 1)
                self.assertEqual(pond.get_attribute("data-fish-water-violation"), "false")
                current_sampled_at = time.monotonic()
                snapshot = pond.evaluate("element => ({ids: element.dataset.fishIds, positions: element.dataset.fishWorldPositions, headings: element.dataset.fishHeadings, widths: element.dataset.fishWidths})")
                ids = snapshot["ids"].split(";")
                positions = [tuple(float(value) for value in point.split(",")) for point in snapshot["positions"].split(";")]
                headings = [float(value) for value in snapshot["headings"].split(";")]
                widths = [float(value) for value in snapshot["widths"].split(";")]
                self.assertEqual(len(ids), len(set(ids)))
                self.assertEqual(len(ids), len(positions))
                self.assertEqual(len(ids), len(headings))
                self.assertEqual(len(ids), len(widths))
                current_world = dict(zip(ids, positions))
                self.assertTrue(previous_world.keys() & current_world.keys(), "resize discarded every fish")
                for fish_id, after in current_world.items():
                    if fish_id in last_known:
                        before, seen_at = last_known[fish_id]
                        limit = 0.03 + (time.monotonic() - seen_at) * 126
                        self.assertLess(math.dist(before, after), limit, f"{fish_id} jumped on resize or readmission")
                for first in range(len(ids)):
                    for second in range(first):
                        for a in (-0.2, 0, 0.2):
                            for b in (-0.2, 0, 0.2):
                                distance = math.hypot(
                                    positions[first][0] + math.cos(headings[first]) * widths[first] * a - positions[second][0] - math.cos(headings[second]) * widths[second] * b,
                                    positions[first][1] + math.sin(headings[first]) * widths[first] * a - positions[second][1] - math.sin(headings[second]) * widths[second] * b,
                                )
                                self.assertGreaterEqual(distance + 0.5, (widths[first] + widths[second]) * 0.36, f"{ids[first]} overlapped {ids[second]}")
                last_known.update({fish_id: (position, current_sampled_at) for fish_id, position in current_world.items()})

        self.assertEqual(page_errors, [])
        browser.close()

    def test_entry_script_failure_keeps_the_static_pond(self) -> None:
        browser = self.playwright.chromium.launch()
        page = browser.new_page()
        page.route(re.compile(r".*/assets/index-[^/]+\.js$"), lambda route: route.abort())
        page.goto(self.base_url, wait_until="load")
        pond = page.locator("[data-renderer]")
        self.assertEqual(pond.get_attribute("data-renderer"), "fallback")
        self.assertEqual(pond.locator(":scope > div").first.evaluate("element => getComputedStyle(element).visibility"), "visible")
        browser.close()

    def test_pending_entry_script_does_not_flash_the_static_pond(self) -> None:
        browser = self.playwright.chromium.launch()
        page = browser.new_page()
        held = []
        page.route(re.compile(r".*/assets/index-[^/]+\.js$"), lambda route: held.append(route))
        page.goto(self.base_url, wait_until="commit")
        pond = page.locator("[data-renderer]")
        pond.wait_for()
        self.assertEqual(pond.locator(":scope > div").first.evaluate("element => getComputedStyle(element).visibility"), "hidden")
        for route in held:
            route.abort()
        browser.close()

    def test_reduced_motion_stops_the_loading_skeleton_animation(self) -> None:
        browser = self.playwright.chromium.launch()
        running = """() => {
          const rect = document.querySelector('[data-renderer] [skullet-layer]')
            ?.shadowRoot?.querySelector('[skullet-rect]');
          return rect?.getAnimations().some(animation => animation.playState === 'running');
        }"""
        for path in ("/", "/missing"):
            with self.subTest(path=path):
                page = self.pond_page(browser, viewport={"width": 1280, "height": 800})
                held = []
                page.route("**/pixel-koi-atlas.webp", lambda route: held.append(route))
                page.goto(f"{self.base_url}{path}?pond-seed=e2e-motion-loading", wait_until="domcontentloaded")
                wait_for_condition(page, running)
                page.wait_for_timeout(500)
                page.emulate_media(reduced_motion="reduce")
                wait_for_condition(page, "document.querySelector('[data-pond-state]')?.dataset.motion === 'reduced'")
                wait_for_condition(page, """() => {
                  const rect = document.querySelector('[data-renderer] [skullet-layer]')
                    ?.shadowRoot?.querySelector('[skullet-rect]');
                  return rect && !rect.getAnimations().some(animation => animation.playState === 'running');
                }""")
                for route in held:
                    route.abort()
                page.close()
        browser.close()

    def test_loading_shows_skeleton_then_fades_in_the_live_ecosystem(self) -> None:
        browser = self.playwright.chromium.launch()
        page = self.pond_page(browser, viewport={"width": 1280, "height": 800})

        held = []
        page.route("**/pixel-koi-atlas.webp", lambda route: held.append(route))
        page.goto(f"{self.base_url}/?pond-seed=e2e-loading", wait_until="domcontentloaded")
        pond = page.locator("[data-renderer]")
        host = page.locator("[data-pond-state]")
        self.assertEqual(pond.get_attribute("data-renderer"), "loading")
        self.assertEqual(host.locator("canvas").count(), 0)
        self.assertIn(
            "pixel-pond-world.webp",
            pond.locator(":scope > div").first.evaluate(
                "element => getComputedStyle(element).backgroundImage"
            ),
        )
        self.assertEqual(pond.locator(":scope > div").first.evaluate("element => getComputedStyle(element).visibility"), "hidden")
        self.assertTrue(pond.locator("[skullet-loading]").is_visible())
        self.assertFalse(
            page.locator("div").evaluate_all(
                "elements => elements.some(element => /pixel-(koi|tabby)-atlas/.test(getComputedStyle(element).backgroundImage))"
            )
        )
        self.assertEqual(host.evaluate("element => getComputedStyle(element).opacity"), "0")
        for _ in range(100):
            if held:
                break
            page.wait_for_timeout(20)
        self.assertTrue(held)
        for route in held:
            route.continue_()
        wait_for_condition(
            page,
            "document.querySelector('[data-renderer]')?.dataset.renderer === 'three'"
        )
        wait_for_condition(
            page,
            "getComputedStyle(document.querySelector('[data-pond-state]')).opacity === '1'",
            timeout=3_000,
        )
        self.assertEqual(host.evaluate("element => getComputedStyle(element).opacity"), "1")
        browser.close()

    def test_hero_copy_does_not_block_pointer_water_reaction(self) -> None:
        browser = self.playwright.chromium.launch()
        page = self.pond_page(browser, viewport={"width": 1280, "height": 800})
        page.goto(f"{self.base_url}/?pond-seed=e2e-hero-pointer", wait_until="networkidle")
        pond = page.locator("[data-pond-state]")
        wait_for_condition(
            page,
            "document.querySelector('[data-pond-state]')?.dataset.pondState === 'running'"
        )

        box = page.get_by_role(
            "heading", name="I make stubborn software behave."
        ).bounding_box()
        responsive = False
        for horizontal in (0.2, 0.5, 0.8):
            for vertical in (0.2, 0.5, 0.8):
                page.mouse.move(
                    box["x"] + box["width"] * horizontal,
                    box["y"] + box["height"] * vertical,
                )
                responsive |= pond.get_attribute("data-food-affordance") == "true"
        self.assertTrue(responsive)

        action = page.get_by_role("link", name="Things I’ve made").bounding_box()
        page.mouse.move(
            action["x"] + action["width"] / 2,
            action["y"] + action["height"] / 2,
        )
        self.assertEqual(pond.get_attribute("data-food-affordance"), "false")
        browser.close()

    def test_navigation_and_bordered_controls_keep_their_visual_hierarchy(self) -> None:
        browser = self.playwright.chromium.launch()
        page = self.pond_page(browser, viewport={"width": 1280, "height": 800})
        page.goto(f"{self.base_url}/?pond-seed=e2e-control-polish", wait_until="networkidle")
        page.wait_for_timeout(1_200)

        hero = page.locator("section[aria-labelledby='hero-title']")
        hero_action = hero.get_by_role("link", name="Say hello", exact=True)
        hero_action.hover()
        page.wait_for_timeout(180)
        clipping_ancestors = hero_action.evaluate(
            """element => {
                const rect = element.getBoundingClientRect();
                const failures = [];
                for (let parent = element.parentElement; parent; parent = parent.parentElement) {
                    const style = getComputedStyle(parent);
                    const bounds = parent.getBoundingClientRect();
                    const clips = ['hidden', 'clip'].includes(style.overflowY) || style.clipPath !== 'none';
                    if (clips && (rect.top < bounds.top - 0.1 || rect.bottom > bounds.bottom + 0.1)) {
                        failures.push({ className: parent.className, clipPath: style.clipPath });
                    }
                }
                return failures;
            }"""
        )
        self.assertEqual(clipping_ancestors, [])

        self.assertEqual(page.get_by_text("Building at Orchid.ai", exact=True).count(), 0)
        navigation = page.locator("header nav a")
        self.assertEqual(navigation.count(), 3)
        self.assertEqual(
            navigation.evaluate_all(
                "elements => elements.map(element => [element.textContent.trim(), element.getAttribute('href')])"
            ),
            [["Work", "#work"], ["About", "#about"], ["Contact", "#contact"]],
        )
        expect(hero.get_by_role("img", name="Lu's illustrated avatar wearing a pink cap")).to_be_visible()
        expect(hero.get_by_role("heading", level=1)).to_have_text("Hi, I’m Lu.")
        expect(page.locator("header a[href='#top']")).to_be_visible()
        category_labels = page.locator("[aria-label='Featured projects'] button small")
        self.assertEqual(category_labels.count(), 4)
        self.assertTrue(
            category_labels.evaluate_all(
                "elements => elements.every(element => parseFloat(getComputedStyle(element).fontSize) >= 10)"
            )
        )
        proof_labels = page.locator("[class*='proofRow'] span")
        self.assertGreater(proof_labels.count(), 0)
        self.assertTrue(
            proof_labels.evaluate_all(
                "elements => elements.every(element => parseFloat(getComputedStyle(element).fontSize) >= 11)"
            )
        )

        project_hrefs = {
            "Rakazo": "https://github.com/luinbytes/rakazo-android",
            "linux-sonar": "https://github.com/luinbytes/linux-sonar",
            "HomeBot": "https://github.com/luinbytes/HomeBot",
            "ConnectorMap": "https://connectormap.luinbytes.dev",
        }

        def assert_homebot_image_fits(panel) -> None:
            illustration = panel.locator('svg[aria-hidden="true"]').first
            expect(illustration).to_be_visible()
            self.assertGreater(illustration.bounding_box()["width"], 100)
            self.assertEqual(panel.locator("video, img").count(), 0)

        for project, href in project_hrefs.items():
            button = page.get_by_role("button", name=re.compile(project, re.I))
            button.click()
            self.assertEqual(button.get_attribute("aria-pressed"), "true")
            panel = page.locator("article").filter(
                has=page.get_by_role("heading", name=project, exact=True)
            )
            panel.wait_for(state="visible")
            self.assertEqual(
                panel.get_by_role("link", name="View project", exact=True).get_attribute(
                    "href"
                ),
                href,
            )
            if project == "HomeBot":
                assert_homebot_image_fits(panel)
            if project == "ConnectorMap":
                expect(panel.get_by_text("Which AI agents can actually use which apps.", exact=True)).to_be_visible()
                expect(panel.get_by_text(
                    "A directory comparing app connections across AI agents, with read and act capabilities, clearly marked inferences, and links to sources.",
                    exact=True,
                )).to_be_visible()
                for tag in ("Read + act", "Marked inferences", "Source links"):
                    expect(panel.locator("[class*='proofRow']").get_by_text(tag, exact=True)).to_be_visible()
                expect(panel.locator('svg[aria-hidden="true"]').first).to_be_visible()
                link = panel.get_by_role("link", name="View project", exact=True)
                expect(link).to_have_attribute("target", "_blank")
                expect(link).to_have_attribute("rel", "noreferrer")

        page.set_viewport_size({"width": 390, "height": 844})
        homebot_button = page.get_by_role("button", name=re.compile("HomeBot", re.I))
        homebot_button.click()
        self.assertEqual(homebot_button.get_attribute("aria-pressed"), "true")
        homebot_panel = page.locator("article").filter(
            has=page.get_by_role("heading", name="HomeBot", exact=True)
        )
        homebot_panel.wait_for(state="visible")
        assert_homebot_image_fits(homebot_panel)
        browser.close()

    def test_pointer_stirs_the_pond(self) -> None:
        browser = self.playwright.chromium.launch()
        page = self.pond_page(browser, viewport={"width": 1440, "height": 900})
        page_errors = []
        console_issues = []
        cat_requests = []
        page.on("request", lambda request: cat_requests.append(request.url) if "pixel-tabby" in request.url else None)
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on(
            "console",
            lambda message: record_console_issue(console_issues, message),
        )
        page.goto(f"{self.base_url}/?pond-seed=e2e-pointer", wait_until="networkidle")

        self.assertEqual(
            page.evaluate("getComputedStyle(document.querySelector('#top')).userSelect"),
            "none",
        )
        self.assertEqual(page.get_by_text("Touch the water", exact=True).count(), 0)

        pond = page.locator("[data-pond-state]")
        wait_for_condition(
            page,
            """() => {
                const pond = document.querySelector('[data-pond-state]');
                return pond?.dataset.pondState === 'running' && pond.dataset.fishPositions;
            }"""
        )
        first_positions = pond.get_attribute("data-fish-positions")
        first_water_offset = pond.get_attribute("data-water-offset")
        self.assertGreaterEqual(int(pond.get_attribute("data-fish-count")), 18)
        self.assertGreater(float(pond.get_attribute("data-fish-average-speed")), 14)
        pad_anchors = pond.get_attribute("data-pad-anchor-ids").split(",")
        self.assertIn("fern-stone-top", pad_anchors)
        self.assertIn("east-island-top", pad_anchors)
        self.assertGreaterEqual(int(pond.get_attribute("data-pond-element-count")), 10)
        self.assertGreaterEqual(int(pond.get_attribute("data-insect-count")), 2)
        self.assertEqual(cat_requests, [])
        self.assertEqual(pond.locator('[src*="pixel-tabby"]').count(), 0)
        self.assertFalse(pond.evaluate("element => [...element.attributes].some(attribute => attribute.name.startsWith('data-cat-'))"))
        self.assertEqual(
            pond.get_attribute("data-fish-logic"),
            "authoritative-seeded-world-steering",
        )
        self.assertEqual(
            pond.get_attribute("data-world-model"),
            "seeded-fish-food-environment",
        )
        wait_for_condition(
            page,
            """initial => {
                const pond = document.querySelector('[data-pond-state]');
                return pond?.dataset.waterOffset !== initial;
            }""",
            arg=first_water_offset,
        )
        self.assertNotEqual(pond.get_attribute("data-water-offset"), first_water_offset)
        self.assertLess(float(pond.get_attribute("data-fish-max-step")), 25)
        responsive_positions = [
            tuple(float(value) for value in pair.split(","))
            for pair in pond.get_attribute("data-fish-positions").split(";")
        ]
        fish_index = None
        fish_x = fish_y = 0.0
        for index, point in enumerate(responsive_positions):
            if not (40 < point[0] < 1400 and 40 < point[1] < 860):
                continue
            page.mouse.move(*point)
            if pond.get_attribute("data-food-affordance") == "true":
                fish_index = index
                fish_x, fish_y = point
                break
        self.assertIsNotNone(fish_index)
        pointer_x, pointer_y = fish_x, fish_y
        page.mouse.move(fish_x - 220, fish_y - 60)
        page.mouse.move(pointer_x, pointer_y, steps=2)
        wait_for_condition(
            page,
            "document.querySelector('[data-pond-state]')?.dataset.fishReacting === 'true'"
        )
        self.assertEqual(pond.get_attribute("data-fish-reacting"), "true")
        page.wait_for_timeout(320)
        reacted_x, reacted_y = [
            tuple(float(value) for value in pair.split(","))
            for pair in pond.get_attribute("data-fish-positions").split(";")
        ][fish_index]
        self.assertGreater(
            ((reacted_x - pointer_x) ** 2 + (reacted_y - pointer_y) ** 2) ** 0.5,
            6,
        )
        impact_x, impact_y = find_open_water(page, pond)
        page.mouse.move(impact_x - 120, impact_y - 40)
        page.mouse.move(impact_x, impact_y, steps=6)
        page.mouse.click(impact_x, impact_y)
        wait_for_condition(
            page,
            "Number(document.querySelector('[data-pond-state]')?.dataset.rippleCount) > 0",
            timeout=2_000,
        )
        self.assertGreater(int(pond.get_attribute("data-ripple-count")), 0)
        self.assertGreater(int(pond.get_attribute("data-ring-count")), 0)
        self.assertGreater(int(pond.get_attribute("data-wake-count")), 0)
        self.assertNotEqual(pond.get_attribute("data-fish-positions"), first_positions)
        self.assertEqual(page.evaluate("getSelection()?.toString()"), "")
        self.assertEqual(pond.get_attribute("data-fish-water-violation"), "false")
        self.assertEqual(page_errors, [])
        self.assertEqual(console_issues, [])
        browser.close()

    def test_food_drop_reservation_and_feeding(self) -> None:
        browser = self.playwright.chromium.launch()
        page = self.pond_page(browser, viewport={"width": 1440, "height": 900})
        page_errors = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.goto(f"{self.base_url}/?pond-seed=e2e-food", wait_until="networkidle")
        pond = page.locator("[data-pond-state]")
        wait_for_condition(
            page,
            "document.querySelector('[data-pond-state]')?.dataset.fishPositions"
        )
        food_before = int(pond.get_attribute("data-food-dropped-count"))
        context_suppressed_on_link = page.get_by_role("link", name="Things I’ve made").evaluate(
            """element => {
                const event = new MouseEvent('contextmenu', {
                    bubbles: true, cancelable: true, button: 2,
                    clientX: element.getBoundingClientRect().x + 4,
                    clientY: element.getBoundingClientRect().y + 4,
                });
                element.dispatchEvent(event);
                return event.defaultPrevented;
            }"""
        )
        self.assertFalse(context_suppressed_on_link)
        self.assertEqual(int(pond.get_attribute("data-food-dropped-count")), food_before)

        fish_points = [
            tuple(float(value) for value in point.split(","))
            for point in pond.get_attribute("data-fish-positions").split(";")
        ]
        fish_x, fish_y = find_open_water(page, pond, fish_points)
        page.evaluate(
            """() => window.addEventListener('contextmenu', event => {
                document.documentElement.dataset.pondContextPrevented = String(event.defaultPrevented);
            }, { once: true })"""
        )
        page.mouse.click(fish_x, fish_y, button="right")
        wait_for_condition(
            page,
            "initial => Number(document.querySelector('[data-pond-state]')?.dataset.foodDroppedCount) > initial",
            arg=food_before,
        )
        self.assertEqual(
            page.locator("html").get_attribute("data-pond-context-prevented"),
            "true",
        )
        camera_x, camera_y, scale_x, scale_y = (
            float(value) for value in pond.get_attribute("data-pond-camera").split(",")
        )
        dropped_x, dropped_y = (
            float(value) for value in pond.get_attribute("data-food-last-drop").split(",")
        )
        requested_x, requested_y = (
            float(value) for value in pond.get_attribute("data-food-requested-at").split(",")
        )
        self.assertEqual((dropped_x, dropped_y), (requested_x, requested_y))
        self.assertAlmostEqual(dropped_x, camera_x + (fish_x - 720) / scale_x, delta=1.2)
        self.assertAlmostEqual(dropped_y, camera_y + (fish_y - 450) / scale_y, delta=1.2)
        wait_for_condition(
            page,
            "document.querySelector('[data-pond-state]')?.dataset.foodReservations",
            timeout=20_000,
        )
        try:
            wait_for_condition(
                page,
                "Number(document.querySelector('[data-pond-state]')?.dataset.fishFedCount) > 0",
                timeout=30_000,
            )
        except PlaywrightTimeoutError:
            detail = pond.evaluate(
                "element => ({ frame: element.dataset.frame, states: element.dataset.fishFoodStates, reservations: element.dataset.foodReservations, food: element.dataset.foodEntities, waterViolation: element.dataset.fishWaterViolation })"
            )
            browser.close()
            self.fail(f"Fish never completed the reserved feeding cycle: {detail}")
        self.assertLessEqual(int(pond.get_attribute("data-food-max-count")), 8)
        self.assertEqual(pond.get_attribute("data-fish-water-violation"), "false")
        self.assertEqual(page_errors, [])
        browser.close()

    def test_hero_portrait_is_visible_square_and_motion_safe(self) -> None:
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        page = self.pond_page(browser, viewport={"width": 1280, "height": 800})
        page_errors = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.goto(self.base_url, wait_until="networkidle")
        portrait = page.get_by_role("img", name="Lu's illustrated avatar wearing a pink cap")
        for reduced in ("no-preference", "reduce"):
            page.emulate_media(reduced_motion=reduced)
            portrait.scroll_into_view_if_needed()
            expect(portrait).to_be_visible()
            self.assertGreater(portrait.evaluate("image => image.naturalWidth"), 0)
            box = portrait.bounding_box()
            self.assertAlmostEqual(box["width"], box["height"], delta=0.5)
            before = portrait.evaluate("image => getComputedStyle(image).transform")
            page.mouse.move(box["x"] + 5, box["y"] + 5)
            page.wait_for_timeout(100)
            self.assertEqual(portrait.evaluate("image => getComputedStyle(image).transform"), before)
        self.assertEqual(page_errors, [])

    def test_reduced_motion_preserves_the_ecosystem_at_low_speed(self) -> None:
        browser = self.playwright.chromium.launch()
        page = self.pond_page(browser, viewport={"width": 1440, "height": 900})
        console_issues = []
        page_errors = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on(
            "console",
            lambda message: record_console_issue(console_issues, message),
        )
        page.emulate_media(reduced_motion="reduce")
        page.goto(f"{self.base_url}/?pond-seed=e2e-reduced", wait_until="networkidle")

        pond = page.locator("[data-pond-state]")
        wait_for_condition(
            page,
            """() => {
                const pond = document.querySelector('[data-pond-state]');
                return pond?.dataset.pondState === 'running' && pond.dataset.fishPositions;
            }"""
        )
        first_positions = pond.get_attribute("data-fish-positions")
        first_offset = pond.get_attribute("data-water-offset")
        self.assertEqual(pond.get_attribute("data-motion"), "reduced")
        self.assertEqual(page.locator("[data-renderer]").get_attribute("data-renderer"), "three")
        self.assertEqual(pond.locator("canvas").count(), 1)
        wait_for_condition(
            page,
            "initial => document.querySelector('[data-pond-state]')?.dataset.fishPositions !== initial",
            arg=first_positions,
            timeout=5_000,
        )
        self.assertNotEqual(pond.get_attribute("data-fish-positions"), first_positions)
        wait_for_condition(
            page,
            "initial => document.querySelector('[data-pond-state]')?.dataset.waterOffset !== initial",
            arg=first_offset,
            timeout=5_000,
        )
        self.assertNotEqual(pond.get_attribute("data-water-offset"), first_offset)
        fish_points = [
            tuple(float(value) for value in point.split(","))
            for point in pond.get_attribute("data-fish-positions").split(";")
        ]
        fish_x, fish_y = find_open_water(page, pond, fish_points)
        page.mouse.click(fish_x, fish_y, button="right")
        wait_for_condition(
            page,
            "Number(document.querySelector('[data-pond-state]')?.dataset.foodDroppedCount) > 0"
        )
        self.assertGreater(int(pond.get_attribute("data-food-count")), 0)
        self.assertEqual(page_errors, [])
        self.assertEqual(console_issues, [])
        browser.close()

    def test_mobile_touch_disturbs_the_shared_pond(self) -> None:
        browser = self.playwright.chromium.launch()
        context = browser.new_context(
            viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True
        )
        page = self.pond_page(context)
        page.goto(f"{self.base_url}/?pond-seed=e2e-touch", wait_until="networkidle")
        pond = page.locator("[data-pond-state]")
        wait_for_condition(
            page,
            "document.querySelector('[data-pond-state]')?.dataset.pondState === 'running' && document.querySelector('[data-pond-state]')?.dataset.fishPositions"
        )
        fish_points = [
            tuple(float(value) for value in point.split(","))
            for point in pond.get_attribute("data-fish-positions").split(";")
        ]
        fish_x, fish_y = find_open_water(page, pond, fish_points)
        page.evaluate("""() => {
            window.__pondTouchEvents = [];
            for (const type of ['pointerdown', 'pointerup', 'pointercancel']) {
                document.addEventListener(type, event => {
                    if (event.pointerType === 'touch') window.__pondTouchEvents.push({
                        type, time: performance.now(), x: event.clientX, y: event.clientY,
                        target: event.target?.tagName,
                    });
                }, true);
            }
        }""")
        impacts_before = int(pond.get_attribute("data-primary-impact-count"))
        page.touchscreen.tap(fish_x, fish_y)
        wait_for_condition(
            page,
            "document.querySelector('[data-pond-state]')?.dataset.touchGesture === 'single-tap-impact'"
        )
        self.assertEqual(
            int(pond.get_attribute("data-primary-impact-count")),
            impacts_before + 1,
        )
        self.assertGreater(int(pond.get_attribute("data-ring-count")), 0)
        self.assertEqual(int(pond.get_attribute("data-food-dropped-count")), 0)
        impacts_before_food = int(pond.get_attribute("data-primary-impact-count"))
        touch_session = context.new_cdp_session(page)

        def double_tap(x, y):
            touch_session.send("Input.synthesizeTapGesture", {
                "x": x, "y": y, "duration": 100,
                "tapCount": 2, "gestureSourceType": "touch",
            })

        double_tap(fish_x, fish_y)
        try:
            wait_for_condition(
                page,
                "Number(document.querySelector('[data-pond-state]')?.dataset.foodDroppedCount) > 0"
            )
        except PlaywrightTimeoutError:
            detail = pond.evaluate(
                "element => ({ gesture: element.dataset.touchGesture, requested: element.dataset.foodRequestedAt, frame: element.dataset.frame, state: element.dataset.pondState })"
            )
            detail["touch_events"] = page.evaluate("window.__pondTouchEvents")
            context.close()
            browser.close()
            self.fail(f"Double-tap did not commit food: {detail}")
        camera_x, camera_y, scale_x, scale_y = (
            float(value) for value in pond.get_attribute("data-pond-camera").split(",")
        )
        dropped_x, dropped_y = (
            float(value) for value in pond.get_attribute("data-food-last-drop").split(",")
        )
        requested_x, requested_y = (
            float(value) for value in pond.get_attribute("data-food-requested-at").split(",")
        )
        self.assertEqual((dropped_x, dropped_y), (requested_x, requested_y))
        self.assertAlmostEqual(dropped_x, camera_x + (fish_x - 195) / scale_x, delta=1.2)
        self.assertAlmostEqual(dropped_y, camera_y + (fish_y - 422) / scale_y, delta=1.2)
        page.wait_for_timeout(500)
        self.assertEqual(
            int(pond.get_attribute("data-primary-impact-count")),
            impacts_before_food,
        )
        dropped_count = int(pond.get_attribute("data-food-dropped-count"))
        project_button = page.get_by_role("button", name=re.compile("Rakazo", re.I))
        project_button.scroll_into_view_if_needed()
        box = project_button.bounding_box()
        double_tap(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        page.wait_for_timeout(500)
        self.assertEqual(int(pond.get_attribute("data-food-dropped-count")), dropped_count)

        def pointer_sequence(events):
            page.evaluate(
                """({ x, y, events }) => {
                    const target = document.elementFromPoint(x, y);
                    for (const item of events) {
                        target.dispatchEvent(new PointerEvent(item.type, {
                            bubbles: true,
                            cancelable: true,
                            pointerType: 'touch',
                            pointerId: item.id,
                            isPrimary: item.primary,
                            clientX: x + (item.dx ?? 0),
                            clientY: y + (item.dy ?? 0),
                            button: 0,
                            buttons: item.type === 'pointerup' || item.type === 'pointercancel' ? 0 : 1,
                        }));
                    }
                }""",
                {"x": fish_x, "y": fish_y, "events": events},
            )

        pointer_sequence(
            [
                {"type": "pointerdown", "id": 21, "primary": True},
                {"type": "pointermove", "id": 21, "primary": True, "dy": 42},
                {"type": "pointerup", "id": 21, "primary": True, "dy": 42},
            ]
        )
        pointer_sequence(
            [
                {"type": "pointerdown", "id": 22, "primary": True},
                {"type": "pointercancel", "id": 22, "primary": True},
                {"type": "pointerup", "id": 22, "primary": True},
            ]
        )
        pointer_sequence(
            [
                {"type": "pointerdown", "id": 23, "primary": True},
                {"type": "pointerdown", "id": 24, "primary": False},
                {"type": "pointerup", "id": 24, "primary": False},
                {"type": "pointerup", "id": 23, "primary": True},
            ]
        )
        page.wait_for_timeout(500)
        self.assertEqual(int(pond.get_attribute("data-food-dropped-count")), dropped_count)
        self.assertEqual(
            int(pond.get_attribute("data-primary-impact-count")),
            impacts_before_food,
        )
        self.assertGreaterEqual(int(pond.get_attribute("data-fish-count")), 8)
        context.close()
        browser.close()

    def test_webgl_failure_uses_the_art_directed_fallback(self) -> None:
        browser = self.playwright.chromium.launch()
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        context.add_init_script(
            "HTMLCanvasElement.prototype.getContext = function () { return null; }"
        )
        page = self.pond_page(context)
        page.goto(self.base_url, wait_until="networkidle")
        wait_for_condition(
            page,
            "document.querySelector('[data-pond-state]')?.dataset.pondState === 'fallback'"
        )
        self.assertEqual(
            page.locator("[data-renderer]").get_attribute("data-renderer"),
            "fallback",
        )
        self.assertEqual(page.locator("[data-pond-state] canvas").count(), 0)
        self.assertTrue(page.get_by_role("group", name="Pond view").is_visible())
        self.assertTrue(
            page.get_by_role(
                "heading", name="I make stubborn software behave."
            ).is_visible()
        )
        context.close()
        browser.close()

    def test_context_loss_preserves_pond_view_control(self) -> None:
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        page = self.pond_page(browser, viewport={"width": 1440, "height": 900})
        page.goto(self.base_url, wait_until="networkidle")
        pond = page.locator("[data-pond-state]")
        expect(pond).to_have_attribute("data-pond-state", "running")
        self.assertTrue(page.get_by_role("group", name="Pond view").is_visible())
        pond.locator("canvas").evaluate("canvas => canvas.dispatchEvent(new Event('webglcontextlost', {cancelable: true}))")
        expect(pond).to_have_attribute("data-pond-state", "fallback")
        self.assertTrue(page.get_by_role("group", name="Pond view").is_visible())
        page.close()

    def test_pause_resize_and_remount_keep_world_state_bounded(self) -> None:
        browser = self.playwright.chromium.launch()
        page = self.pond_page(browser, viewport={"width": 1280, "height": 800})
        page.goto(f"{self.base_url}/?pond-seed=e2e-lifecycle", wait_until="networkidle")
        pond = page.locator("[data-pond-state]")
        wait_for_condition(
            page,
            "document.querySelector('[data-pond-state]')?.dataset.fishWorldPositions"
        )
        first = [
            tuple(float(value) for value in point.split(","))
            for point in pond.get_attribute("data-fish-world-positions").split(";")
        ]
        page.set_viewport_size({"width": 768, "height": 1024})
        page.wait_for_timeout(350)
        second = [
            tuple(float(value) for value in point.split(","))
            for point in pond.get_attribute("data-fish-world-positions").split(";")
        ]
        self.assertTrue(
            all(
                ((after[0] - before[0]) ** 2 + (after[1] - before[1]) ** 2) ** 0.5 < 80
                for before, after in zip(first, second)
            )
        )
        page.evaluate(
            """() => {
                Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
                document.dispatchEvent(new Event('visibilitychange'));
            }"""
        )
        self.assertEqual(pond.get_attribute("data-pond-state"), "paused")
        paused_frame = pond.get_attribute("data-frame")
        page.wait_for_timeout(350)
        self.assertEqual(pond.get_attribute("data-frame"), paused_frame)
        page.evaluate(
            """() => {
                Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
                document.dispatchEvent(new Event('visibilitychange'));
            }"""
        )
        wait_for_condition(
            page,
            "initial => document.querySelector('[data-pond-state]')?.dataset.frame !== initial",
            arg=paused_frame,
        )
        missing_response = page.goto(
            f"{self.base_url}/definitely-not-a-route", wait_until="networkidle"
        )
        self.assertEqual(missing_response.status, 404)
        self.assertTrue(
            page.get_by_role("heading", name="Nothing surfaced here.").is_visible()
        )
        page.go_back(wait_until="networkidle")
        wait_for_condition(
            page,
            "document.querySelector('[data-pond-state]')?.dataset.pondState === 'running'"
        )
        self.assertEqual(page.locator("[data-pond-state] canvas").count(), 1)
        browser.close()

    def test_removed_routes_use_the_pond_not_found_page(self) -> None:
        browser = self.playwright.chromium.launch()
        page = self.pond_page(browser, viewport={"width": 1280, "height": 800})
        for path in LEGACY_ROUTES:
            with self.subTest(path=path):
                response = page.request.get(f"{self.base_url}{path}")
                self.assertEqual(response.status, 404)

        response = page.goto(
            f"{self.base_url}/retired-route", wait_until="networkidle"
        )
        self.assertEqual(response.status, 404)
        self.assertTrue(
            page.get_by_role("heading", name="Nothing surfaced here.").is_visible()
        )
        self.assertTrue(
            page.get_by_role("link", name="Return to the pond").is_visible()
        )
        for theme in ("dark", "light"):
            page.emulate_media(color_scheme=theme)
            page.wait_for_timeout(40)
            self.assertGreaterEqual(control_contrast(page.get_by_role("link", name="Return to the pond")), 4.5)
        self.assertEqual(page.locator("[data-renderer]").count(), 1)
        self.assertLessEqual(
            page.evaluate("document.documentElement.scrollWidth"), 1280
        )
        browser.close()




class SkulletImageTests(BrowserTestCase):
    HERO_ALT = "Lu's illustrated avatar wearing a pink cap"
    SKULLET_WATCH = """
window.__skulletShown = false;
const markSkullet = () => {
  if (document.querySelector("[class*=heroPortrait] [skullet-loading]")) window.__skulletShown = true;
};
const armSkulletWatch = () => {
  if (window.__skulletArmed || !document.documentElement) return;
  window.__skulletArmed = true;
  new MutationObserver(markSkullet).observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true,
  });
  markSkullet();
};
armSkulletWatch();
document.addEventListener("readystatechange", armSkulletWatch);
"""
    BONE_STAYS = """
window.__boneHost = null;
window.__boneReplaced = false;
const armBoneWatch = () => {
  if (window.__boneArmed || !document.documentElement) return;
  window.__boneArmed = true;
  new MutationObserver(() => {
    const host = document.querySelector("[class*=heroPortrait] [skullet-loading]");
    if (!host) return;
    if (!window.__boneHost) window.__boneHost = host;
    else if (host !== window.__boneHost) window.__boneReplaced = true;
  }).observe(document.documentElement, { childList: true, subtree: true });
};
armBoneWatch();
document.addEventListener("readystatechange", armBoneWatch);
"""

    def hold_matching(self, page, token):
        held = []

        def handler(route):
            if token in route.request.url:
                held.append(route)
                return
            route.continue_()

        page.route("**/*", handler)
        return held

    def release(self, held):
        for route in held:
            route.continue_()

    def test_delayed_image_shows_a_skeleton_then_clears_it(self) -> None:
        browser = self.playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.add_init_script(self.SKULLET_WATCH)
        page.add_init_script(self.BONE_STAYS)
        license_text = page.request.get(f"{self.base_url}/third-party-licenses.txt").text()
        self.assertIn("Copyright (c) 2025 Lochie Axon", license_text)
        self.assertIn("Permission is hereby granted, free of charge", license_text)
        held = self.hold_matching(page, "lu-avatar.jpg")
        page.goto(f"{self.base_url}/", wait_until="domcontentloaded")
        page.wait_for_selector("[class*=heroPortrait] [skullet-loading]")
        self.assertIs(page.evaluate("window.__skulletShown"), True)
        image = page.get_by_alt_text(self.HERO_ALT)
        self.assertEqual(image.get_attribute("aria-hidden"), "true")
        page.wait_for_timeout(300)
        self.assertFalse(page.evaluate("window.__boneReplaced"))
        self.assertTrue(page.evaluate("""() => {
          const host = window.__boneHost;
          const layer = host && host.querySelector("[skullet-layer]");
          const bar = layer && layer.shadowRoot ? layer.shadowRoot.querySelector("[skullet-rect]") : null;
          const box = bar ? bar.getBoundingClientRect() : null;
          return !!(host && host.isConnected && box && box.width > 8 && box.height > 8);
        }"""))
        self.assertIn("Loading portrait", page.locator("[class*=heroPortrait] [skullet-status]").inner_text())
        self.release(held)
        page.wait_for_selector("[class*=heroPortrait] [skullet-loading]", state="detached")
        self.assertIsNone(image.get_attribute("aria-hidden"))
        self.assertGreater(image.evaluate("node => node.naturalWidth"), 0)
        browser.close()


    def test_image_error_clears_the_skeleton(self) -> None:
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        held = self.hold_matching(page, "lu-avatar.jpg")
        page.goto(f"{self.base_url}/", wait_until="domcontentloaded")
        page.wait_for_selector("[class*=heroPortrait] [skullet-loading]")
        image = page.get_by_alt_text(self.HERO_ALT)
        self.assertEqual(image.get_attribute("aria-hidden"), "true")
        for route in held:
            route.abort()
        page.wait_for_selector("[class*=heroPortrait] [skullet-loading]", state="detached")
        self.assertIsNone(image.get_attribute("aria-hidden"))
        self.assertEqual(image.evaluate("node => node.naturalWidth"), 0)

    def test_complete_image_never_shows_a_skeleton(self) -> None:
        browser = self.playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.add_init_script(self.SKULLET_WATCH)
        held_scripts = []

        def hold_scripts(route):
            if route.request.resource_type == "script":
                held_scripts.append(route)
                return
            route.continue_()

        page.route("**/*", hold_scripts)
        page.goto(f"{self.base_url}/", wait_until="commit")
        page.wait_for_function(
            """(alt) => {
              const image = document.querySelector(`img[alt="${alt}"]`);
              return !!image && image.complete && image.naturalWidth > 0;
            }""",
            arg=self.HERO_ALT,
        )
        for route in held_scripts:
            route.continue_()
        page.unroute("**/*", hold_scripts)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(250)
        image = page.get_by_alt_text(self.HERO_ALT)
        self.assertGreater(image.evaluate("node => node.naturalWidth"), 0)
        self.assertIsNone(image.get_attribute("aria-hidden"))
        self.assertIs(page.evaluate("window.__skulletShown"), False)
        self.assertEqual(page.locator("[class*=heroPortrait] [skullet-loading]").count(), 0)
        browser.close()

    def test_failed_skullet_chunk_still_shows_the_image(self) -> None:
        browser = self.playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page_errors = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        held = []
        aborted_chunks = []

        def handler(route):
            url = route.request.url
            if "skullet-overlay" in url and url.endswith(".js"):
                aborted_chunks.append(url)
                route.abort()
                return
            if "lu-avatar.jpg" in url:
                held.append(route)
                return
            route.continue_()

        page.route("**/*", handler)
        page.goto(f"{self.base_url}/", wait_until="domcontentloaded")
        for _ in range(50):
            if aborted_chunks:
                break
            page.wait_for_timeout(100)
        self.assertGreaterEqual(len(aborted_chunks), 1)
        self.assertTrue(page.get_by_role("heading", name="I make stubborn software behave.").is_visible())
        self.release(held)
        image = page.get_by_alt_text(self.HERO_ALT)
        image.wait_for(state="visible")
        self.assertGreater(image.evaluate("node => node.naturalWidth"), 0)
        self.assertIsNone(image.get_attribute("aria-hidden"))
        self.assertEqual(page_errors, [])
        browser.close()
