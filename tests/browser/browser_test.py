import base64
import hashlib
import json
import os
import re
import shutil
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
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError, expect, sync_playwright


SCREENSHOTS = Path("test-results")
SERVER_LOG = SCREENSHOTS / "dev-server.log"
READY_PATTERN = re.compile(r"\bReady in\b")
LEGACY_ROUTES = (
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
    ignored = ("GL Driver Message", "was preloaded using link preload but not used")
    if message.type in ("warning", "error") and not any(item in message.text for item in ignored):
        bucket.append(f"{message.type}: {message.text}")


def test_port() -> int:
    configured_port = os.environ.get("E2E_PORT")
    if configured_port:
        return int(configured_port)

    with socket.socket() as available_port:
        available_port.bind(("127.0.0.1", 0))
        return available_port.getsockname()[1]


def wait_for_owned_server(server, server_log: Path, base_url: str) -> None:
    deadline = time.monotonic() + 30
    saw_ready = False

    while time.monotonic() < deadline:
        if server.poll() is not None:
            raise RuntimeError(
                f"Test server exited before becoming ready; see {server_log}"
            )

        if not saw_ready:
            saw_ready = READY_PATTERN.search(
                server_log.read_text(errors="replace")
            ) is not None

        if saw_ready:
            try:
                with urllib.request.urlopen(base_url, timeout=1):
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
    def test_sitemap_exposes_the_portfolio_and_pip(self) -> None:
        root = ET.parse("public/sitemap.xml").getroot()
        locations = [
            location.text
            for location in root.findall(
                "{http://www.sitemaps.org/schemas/sitemap/0.9}url/"
                "{http://www.sitemaps.org/schemas/sitemap/0.9}loc"
            )
        ]

        self.assertEqual(locations, ["https://luinbytes.dev", "https://luinbytes.dev/pip"])


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
        "/pip": "/share-cards/luinbytes-dev-pond.png",
    }
    expected_sha256 = {
        "/share-cards/luinbytes-dev-pond.png": "60bddd42c8ecc43ac42f94933f15af50cb71c7039574b4d203be4fb2dc46b811",
    }

    def test_editable_source_contains_the_original_card_copy(self) -> None:
        source = re.sub(r"\s+", " ", Path("scripts/share-card.html").read_text())
        for text in self.preserved_copy:
            with self.subTest(text=text):
                self.assertIn(text, source)
        self.assertNotIn("I build tools that make stubborn systems behave.", source)
        self.assertNotIn("ORCHID.AI // MOBILE DEVELOPER", source)

    def test_every_scoped_route_exports_a_production_large_image_card(self) -> None:
        build = subprocess.run(["npm", "run", "build"], check=False)
        self.assertEqual(build.returncode, 0)
        export_root = Path(os.environ.get("NEXT_DIST_DIR", "out"))

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
                self.assertEqual(properties.get("og:image:alt"), "Lu | Software Engineer")
                self.assertEqual(names.get("twitter:card"), "summary_large_image")
                self.assertEqual(names.get("twitter:image"), card_url)
                self.assertEqual(names.get("twitter:image:alt"), "Lu | Software Engineer")

                if route == "/pip":
                    self.assertIn(
                        "<title>Pip — Your Telegram mate | Lu</title>",
                        html,
                    )
                    self.assertEqual(
                        properties.get("og:title"),
                        "Pip — Your Telegram mate",
                    )
                    self.assertEqual(
                        properties.get("og:description"),
                        "A little help, one message away. Pip is your warm, easygoing Telegram agent for questions, web searches, reminders, and everyday life. Built on Keiki.",
                    )
                    self.assertEqual(
                        properties.get("og:url"),
                        "https://luinbytes.dev/pip",
                    )
                    self.assertEqual(
                        names.get("description"),
                        "A little help, one message away. Pip is your warm, easygoing Telegram agent for questions, web searches, reminders, and everyday life. Built on Keiki.",
                    )
                    self.assertEqual(
                        next(
                            item.get("href")
                            for item in parser.metadata
                            if item.get("rel") == "canonical"
                        ),
                        "https://luinbytes.dev/pip",
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
    @classmethod
    def setUpClass(cls) -> None:
        SCREENSHOTS.mkdir(exist_ok=True)
        port = test_port()
        cls.dist_dir = Path(".next-e2e")
        shutil.rmtree(cls.dist_dir, ignore_errors=True)
        cls.server_log = SERVER_LOG.open("w")
        try:
            cls.server = subprocess.Popen(
                [
                    "npm",
                    "run",
                    "dev",
                    "--",
                    "--hostname",
                    "127.0.0.1",
                    "--port",
                    str(port),
                    "--webpack",
                ],
                stdout=cls.server_log,
                stderr=subprocess.STDOUT,
                start_new_session=True,
                env={
                    **os.environ,
                    "NEXT_DISABLE_WEBPACK_CACHE": "1",
                    "NEXT_DIST_DIR": str(cls.dist_dir),
                },
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
        shutil.rmtree(cls.dist_dir, ignore_errors=True)

    @classmethod
    def tearDownClass(cls) -> None:
        if cls.playwright is not None:
            cls.playwright.stop()
        cls.stop_server()


class PipRouteTests(BrowserTestCase):
    def test_pip_page_has_static_content_and_configured_telegram_contact(self) -> None:
        browser = self.playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        response = page.goto(f"{self.base_url}/pip", wait_until="networkidle")
        self.assertIsNotNone(response)
        self.assertEqual(response.status, 200)
        self.assertEqual(page.title(), "Pip — Your Telegram mate | Lu")
        self.assertTrue(
            page.get_by_role(
                "heading", name=re.compile(r"A little help\.\s*A little banter\.")
            ).is_visible()
        )
        self.assertTrue(page.get_by_role("figure", name="Example conversation").is_visible())
        contact = page.locator("#text-pip")
        self.assertTrue(contact.is_visible())
        self.assertTrue(page.get_by_role("heading", name="Say hey to Pip.").is_visible())
        self.assertTrue(contact.get_by_text("PIP’S TELEGRAM HANDLE", exact=True).is_visible())
        self.assertTrue(contact.get_by_text("@PIPSOFTWARE_BOT", exact=True).is_visible())
        self.assertTrue(contact.get_by_text("Opens Pip in Telegram.", exact=True).is_visible())
        self.assertTrue(page.get_by_text("Built on Keiki", exact=False).is_visible())

        self.assertGreaterEqual(
            page.get_by_role("link", name="Message Pip", exact=True).count(), 2
        )
        message_link = contact.get_by_role("link", name="Message Pip", exact=True)
        self.assertEqual(message_link.get_attribute("href"), "https://t.me/PIPSOFTWARE_BOT")
        copy_button = contact.get_by_role("button", name="Copy handle", exact=True)
        qr_button = contact.get_by_role("button", name="Show QR code", exact=True)
        self.assertFalse(copy_button.is_disabled())
        self.assertFalse(qr_button.is_disabled())
        self.assertEqual(qr_button.get_attribute("aria-expanded"), "false")
        page.screenshot(path=SCREENSHOTS / "pip-final-1440.png", full_page=True)

        browser.close()

    def test_telegram_contact_copy_reports_success_and_failure(self) -> None:
        browser = self.playwright.chromium.launch()

        success_context = browser.new_context(
            viewport={"width": 390, "height": 844},
            permissions=["clipboard-read", "clipboard-write"],
        )
        success_context.add_init_script(
            """window.__pipClipboardCalls = [];
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: { writeText: async value => window.__pipClipboardCalls.push(value) },
            });"""
        )
        success_page = success_context.new_page()
        success_page.goto(f"{self.base_url}/pip", wait_until="networkidle")
        success_page.locator("#text-pip").get_by_role(
            "button", name="Copy handle", exact=True
        ).click()
        success_page.get_by_text("Handle copied.", exact=True).wait_for(state="visible")
        self.assertTrue(success_page.get_by_text("Handle copied.", exact=True).is_visible())
        self.assertEqual(
            success_page.evaluate("window.__pipClipboardCalls"),
            ["@PIPSOFTWARE_BOT"],
        )
        success_context.close()

        failure_context = browser.new_context(viewport={"width": 390, "height": 844})
        failure_context.add_init_script(
            """Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: { writeText: async () => { throw new Error('blocked') } },
            });"""
        )
        failure_page = failure_context.new_page()
        failure_page.goto(f"{self.base_url}/pip", wait_until="networkidle")
        failure_page.locator("#text-pip").get_by_role(
            "button", name="Copy handle", exact=True
        ).click()
        failure_page.get_by_text(
            "Couldn’t copy. Select the handle above and copy it manually.", exact=True
        ).wait_for(state="visible")
        self.assertTrue(
            failure_page.get_by_text(
                "Couldn’t copy. Select the handle above and copy it manually.", exact=True
            ).is_visible()
        )
        failure_context.close()
        browser.close()

    def test_telegram_qr_uses_the_same_target_and_reports_remote_failure(self) -> None:
        browser = self.playwright.chromium.launch()
        transparent_png = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
        )
        qr_data = []
        fulfilled_context = browser.new_context(viewport={"width": 390, "height": 844})
        fulfilled_page = fulfilled_context.new_page()

        def fulfill_qr(route) -> None:
            qr_data.append(
                parse_qs(urlparse(route.request.url).query).get("data", [None])[0]
            )
            route.fulfill(status=200, content_type="image/png", body=transparent_png)

        fulfilled_page.route("https://api.qrserver.com/**", fulfill_qr)
        fulfilled_page.goto(f"{self.base_url}/pip", wait_until="networkidle")
        self.assertEqual(qr_data, [])
        contact = fulfilled_page.locator("#text-pip")
        qr_button = contact.get_by_role("button", name="Show QR code", exact=True)
        qr_button.click()
        image = contact.get_by_alt_text("Scan to message Pip on Telegram")
        image.wait_for(state="visible")
        self.assertEqual(
            contact.locator("button[aria-controls='pip-qr']").get_attribute("aria-expanded"),
            "true",
        )
        self.assertTrue(image.is_visible())
        self.assertEqual(qr_data, ["https://t.me/PIPSOFTWARE_BOT"])
        fulfilled_context.close()

        aborted_context = browser.new_context(viewport={"width": 390, "height": 844})
        aborted_page = aborted_context.new_page()
        aborted_page.route("https://api.qrserver.com/**", lambda route: route.abort())
        aborted_page.goto(f"{self.base_url}/pip", wait_until="networkidle")
        aborted_page.locator("#text-pip").get_by_role(
            "button", name="Show QR code", exact=True
        ).click()
        qr_failure = aborted_page.get_by_text(
            re.compile(r"QR code.*couldn.t load", re.IGNORECASE)
        )
        qr_failure.wait_for(state="visible")
        self.assertTrue(qr_failure.is_visible())
        aborted_context.close()
        browser.close()

    def test_pip_page_fits_mobile_viewports_and_exposes_keyboard_skip_and_nav(self) -> None:
        browser = self.playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.goto(f"{self.base_url}/pip", wait_until="networkidle")

        for width in (320, 390, 430):
            with self.subTest(viewport=width):
                page.set_viewport_size({"width": width, "height": 844})
                page.wait_for_timeout(80)
                self.assertLessEqual(
                    page.evaluate("document.documentElement.scrollWidth"), width
                )
                self.assertLessEqual(
                    page.evaluate("document.body.scrollWidth"), width
                )
                bounds = page.locator("#text-pip").bounding_box()
                self.assertIsNotNone(bounds)
                self.assertGreaterEqual(bounds["x"], -1)
                self.assertLessEqual(bounds["x"] + bounds["width"], width + 1)
                if width in (320, 390):
                    page.screenshot(
                        path=SCREENSHOTS / f"pip-final-{width}.png",
                        full_page=True,
                    )

        page.set_viewport_size({"width": 390, "height": 844})
        page.keyboard.press("Tab")
        self.assertEqual(
            page.evaluate(
                """() => ({
                    href: document.activeElement?.getAttribute('href'),
                    text: document.activeElement?.textContent?.trim(),
                })"""
            ),
            {"href": "#main", "text": "Skip to content"},
        )
        page.keyboard.press("Enter")
        self.assertEqual(page.evaluate("document.activeElement?.id"), "main")

        navigation = page.locator("header")
        self.assertTrue(navigation.is_visible())
        links = navigation.get_by_role("link")
        self.assertGreaterEqual(links.count(), 2)
        for index in range(links.count()):
            with self.subTest(nav_link=index):
                link = links.nth(index)
                link.focus()
                self.assertTrue(link.evaluate("element => document.activeElement === element"))

        browser.close()

    def test_pip_page_remains_readable_without_javascript(self) -> None:
        browser = self.playwright.chromium.launch()
        context = browser.new_context(
            java_script_enabled=False,
            viewport={"width": 390, "height": 844},
        )
        page = context.new_page()
        response = page.goto(f"{self.base_url}/pip", wait_until="domcontentloaded")
        self.assertIsNotNone(response)
        self.assertEqual(response.status, 200)
        self.assertTrue(
            page.get_by_role(
                "heading", name=re.compile(r"A little help\.\s*A little banter\.")
            ).is_visible()
        )
        self.assertTrue(page.get_by_role("figure", name="Example conversation").is_visible())
        self.assertTrue(page.get_by_role("heading", name="Say hey to Pip.").is_visible())
        self.assertTrue(page.get_by_text("@PIPSOFTWARE_BOT", exact=True).is_visible())
        self.assertTrue(page.get_by_text("Opens Pip in Telegram.", exact=True).is_visible())
        self.assertGreaterEqual(
            page.get_by_role("link", name="Message Pip", exact=True).count(), 2
        )
        self.assertTrue(page.locator("#text-pip").is_visible())
        self.assertLessEqual(page.evaluate("document.documentElement.scrollWidth"), 390)
        context.close()
        browser.close()


class PortfolioTests(BrowserTestCase):
    def test_homepage_is_responsive_and_routes_featured_work(self) -> None:
        for viewport_name, viewport in (
            ("desktop", {"width": 1440, "height": 900}),
            ("mobile", {"width": 390, "height": 844}),
        ):
            with self.subTest(viewport=viewport_name):
                browser = self.playwright.chromium.launch()
                self.addCleanup(browser.close)
                page = browser.new_page(viewport=viewport)
                page.goto(self.base_url, wait_until="networkidle")

                self.assertTrue(
                    page.get_by_role(
                        "heading", name="I make stubborn software behave."
                    ).is_visible()
                )
                expect(page.locator("#hero-title")).to_have_css("clip-path", "none")
                for project in ("Orchid.ai", "Rakazo", "linux-sonar", "HomeBot"):
                    self.assertTrue(
                        page.get_by_role("button", name=re.compile(project, re.I)).is_visible()
                    )

                page.wait_for_function(
                    "document.querySelector('[data-pixi-state]')?.dataset.pixiState === 'running'"
                )
                impact_count = page.locator("[data-pixi-state]").get_attribute(
                    "data-primary-impact-count"
                )
                self.assertTrue(
                    page.get_by_role("group", name="Featured projects").is_visible()
                )
                page.get_by_role("button", name=re.compile("Rakazo", re.I)).click()
                self.assertEqual(
                    page.locator("[data-pixi-state]").get_attribute(
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

    def test_homepage_pip_section_roundtrips_to_pip_and_back(self) -> None:
        browser = self.playwright.chromium.launch()
        try:
            for viewport_name, viewport in (
                ("desktop", {"width": 1440, "height": 900}),
                ("mobile", {"width": 390, "height": 844}),
            ):
                with self.subTest(viewport=viewport_name):
                    context = browser.new_context(viewport=viewport)
                    page = context.new_page()
                    console_issues = []
                    page.on(
                        "console",
                        lambda message: record_console_issue(console_issues, message),
                    )
                    page.goto(
                        f"{self.base_url}/?pond-seed=e2e-homepage-pip",
                        wait_until="networkidle",
                    )

                    section = page.locator("#pip")
                    self.assertTrue(section.is_visible())
                    self.assertTrue(
                        page.evaluate(
                            """() => {
                                const hero = document.querySelector('section[aria-labelledby="hero-title"]');
                                const pip = document.querySelector('section#pip');
                                const work = document.querySelector('section#work');
                                return hero?.nextElementSibling === pip && pip?.nextElementSibling === work;
                            }"""
                        )
                    )
                    self.assertTrue(
                        section.get_by_role(
                            "heading",
                            name=re.compile(r"A little help\.\s*A little banter\."),
                        ).is_visible()
                    )
                    self.assertTrue(
                        section.get_by_text(
                            "Meet Pip, your AI mate on Telegram. Quick questions, useful reminders, and a little everyday company.",
                            exact=True,
                        ).is_visible()
                    )

                    meet_pip = section.get_by_role("link", name="Meet Pip", exact=True)
                    self.assertTrue(meet_pip.is_visible())
                    self.assertEqual(meet_pip.get_attribute("href"), "/pip")
                    meet_bounds = meet_pip.bounding_box()
                    self.assertIsNotNone(meet_bounds)
                    self.assertGreaterEqual(meet_bounds["width"], 44)
                    self.assertGreaterEqual(meet_bounds["height"], 44)

                    section.scroll_into_view_if_needed()
                    page.wait_for_timeout(120)
                    page.screenshot(
                        path=SCREENSHOTS / f"homepage-pip-{viewport['width']}.png",
                        full_page=False,
                    )

                    if viewport["width"] > 820:
                        navigation = page.locator("header nav a")
                        self.assertEqual(navigation.count(), 4)
                        for index in range(navigation.count()):
                            link = navigation.nth(index)
                            self.assertTrue(link.is_visible())
                            bounds = link.bounding_box()
                            self.assertIsNotNone(bounds)
                            self.assertGreaterEqual(bounds["width"], 44)
                            self.assertGreaterEqual(bounds["height"], 44)

                    meet_pip.click()
                    page.wait_for_url(re.compile(rf"^{re.escape(self.base_url)}/pip$"))
                    self.assertEqual(urlparse(page.url).path, "/pip")

                    home_link = page.locator("header a[href='/']")
                    self.assertEqual(home_link.count(), 1)
                    self.assertTrue(home_link.is_visible())
                    home_bounds = home_link.bounding_box()
                    self.assertIsNotNone(home_bounds)
                    self.assertGreaterEqual(home_bounds["width"], 44)
                    self.assertGreaterEqual(home_bounds["height"], 44)

                    home_link.click()
                    page.wait_for_url(re.compile(rf"^{re.escape(self.base_url)}/$"))
                    self.assertEqual(urlparse(page.url).path, "/")
                    self.assertEqual(console_issues, [])
                    context.close()
        finally:
            browser.close()

    def test_homepage_pip_link_works_without_javascript(self) -> None:
        browser = self.playwright.chromium.launch()
        context = browser.new_context(
            java_script_enabled=False,
            viewport={"width": 390, "height": 844},
        )
        page = context.new_page()
        page.goto(f"{self.base_url}/", wait_until="domcontentloaded")

        section = page.locator("#pip")
        self.assertTrue(section.is_visible())
        meet_pip = section.get_by_role("link", name="Meet Pip", exact=True)
        self.assertTrue(meet_pip.is_visible())
        self.assertEqual(meet_pip.get_attribute("href"), "/pip")
        meet_pip.click()
        page.wait_for_url(re.compile(rf"^{re.escape(self.base_url)}/pip$"))
        self.assertEqual(urlparse(page.url).path, "/pip")
        self.assertTrue(
            page.get_by_role(
                "heading", name=re.compile(r"A little help\.\s*A little banter\.")
            ).is_visible()
        )
        self.assertLessEqual(page.evaluate("document.documentElement.scrollWidth"), 390)

        context.close()
        browser.close()

    def test_homepage_pip_section_fits_320px_with_reduced_motion(self) -> None:
        browser = self.playwright.chromium.launch()
        context = browser.new_context(
            reduced_motion="reduce",
            viewport={"width": 320, "height": 568},
        )
        page = context.new_page()
        page.goto(
            f"{self.base_url}/?pond-seed=e2e-homepage-pip-reduced",
            wait_until="networkidle",
        )

        section = page.locator("#pip")
        self.assertTrue(section.is_visible())
        self.assertTrue(
            section.get_by_role(
                "heading", name=re.compile(r"A little help\.\s*A little banter\.")
            ).is_visible()
        )
        self.assertLessEqual(page.evaluate("document.documentElement.scrollWidth"), 320)
        self.assertLessEqual(page.evaluate("document.body.scrollWidth"), 320)

        section.scroll_into_view_if_needed()
        page.wait_for_timeout(120)
        section_bounds = section.bounding_box()
        self.assertIsNotNone(section_bounds)
        self.assertGreaterEqual(section_bounds["x"], -1)
        self.assertLessEqual(section_bounds["x"] + section_bounds["width"], 321)
        meet_pip = section.get_by_role("link", name="Meet Pip", exact=True)
        self.assertTrue(meet_pip.is_visible())
        meet_bounds = meet_pip.bounding_box()
        self.assertIsNotNone(meet_bounds)
        self.assertGreaterEqual(meet_bounds["width"], 44)
        self.assertGreaterEqual(meet_bounds["height"], 44)
        page.screenshot(path=SCREENSHOTS / "homepage-pip-320.png", full_page=False)

        context.close()
        browser.close()

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
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page_errors = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.goto(f"{self.base_url}/?pond-seed=e2e-viewport-matrix", wait_until="networkidle")
        pond = page.locator("[data-pixi-state]")
        page.wait_for_function(
            "document.querySelector('[data-pixi-state]')?.dataset.fishWorldPositions"
        )

        for name, viewport in viewports:
            with self.subTest(viewport=name):
                previous_frame = pond.get_attribute("data-frame")
                previous_world = [
                    tuple(float(value) for value in point.split(","))
                    for point in pond.get_attribute("data-fish-world-positions").split(";")
                ]
                page.set_viewport_size(viewport)
                page.wait_for_function(
                    "frame => document.querySelector('[data-pixi-state]')?.dataset.frame !== frame",
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
                        const fish = document.querySelector('[data-pixi-state]').dataset.fishPositions
                            .split(';').map(point => point.split(',').map(Number));
                        return {
                            overflow: document.documentElement.scrollWidth - width,
                            headingInside: heading.left >= -1 && heading.right <= width + 1 && heading.width > 120,
                            headerInside: header.left >= -1 && header.right <= width + 1,
                            pondFits: Math.abs(pond.width - width) < 1 && Math.abs(pond.height - height) < 1,
                            projectTargets: buttons.length === 4 && buttons.every(button => button.width >= 44 && button.height >= 44),
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
                self.assertTrue(state["projectNamesFit"])
                self.assertTrue(state["aboutCardsCentered"])
                self.assertGreaterEqual(state["visibleFish"], 5)
                self.assertEqual(pond.get_attribute("data-fish-water-violation"), "false")
                self.assertEqual(pond.get_attribute("data-cat-water-violation"), "false")
                current_world = [
                    tuple(float(value) for value in point.split(","))
                    for point in pond.get_attribute("data-fish-world-positions").split(";")
                ]
                self.assertTrue(
                    all(
                        ((after[0] - before[0]) ** 2 + (after[1] - before[1]) ** 2) ** 0.5 < 80
                        for before, after in zip(previous_world, current_world)
                    )
                )

        self.assertEqual(page_errors, [])
        browser.close()

    def test_loading_shows_only_the_pond_then_fades_in_the_live_ecosystem(self) -> None:
        browser = self.playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        def delay_koi_atlas(route) -> None:
            time.sleep(0.7)
            route.continue_()

        page.route("**/pixel-koi-atlas.webp", delay_koi_atlas)
        page.goto(f"{self.base_url}/?pond-seed=e2e-loading", wait_until="domcontentloaded")
        pond = page.locator("[data-renderer]")
        host = page.locator("[data-pixi-state]")
        self.assertEqual(pond.get_attribute("data-renderer"), "fallback")
        self.assertEqual(host.locator("canvas").count(), 0)
        self.assertIn(
            "pixel-pond-world.webp",
            pond.locator(":scope > div").first.evaluate(
                "element => getComputedStyle(element).backgroundImage"
            ),
        )
        self.assertFalse(
            page.locator("div").evaluate_all(
                "elements => elements.some(element => /pixel-(koi|tabby)-atlas/.test(getComputedStyle(element).backgroundImage))"
            )
        )
        self.assertEqual(host.evaluate("element => getComputedStyle(element).opacity"), "0")
        page.wait_for_function(
            "document.querySelector('[data-renderer]')?.dataset.renderer === 'pixi'"
        )
        page.wait_for_timeout(820)
        self.assertEqual(host.evaluate("element => getComputedStyle(element).opacity"), "1")
        browser.close()

    def test_hero_copy_does_not_block_pointer_water_reaction(self) -> None:
        browser = self.playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto(f"{self.base_url}/?pond-seed=e2e-hero-pointer", wait_until="networkidle")
        pond = page.locator("[data-pixi-state]")
        page.wait_for_function(
            "document.querySelector('[data-pixi-state]')?.dataset.pixiState === 'running'"
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

        action = page.get_by_role("link", name="See the work").bounding_box()
        page.mouse.move(
            action["x"] + action["width"] / 2,
            action["y"] + action["height"] / 2,
        )
        self.assertEqual(pond.get_attribute("data-food-affordance"), "false")
        browser.close()

    def test_navigation_and_bordered_controls_keep_their_visual_hierarchy(self) -> None:
        browser = self.playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto(f"{self.base_url}/?pond-seed=e2e-control-polish", wait_until="networkidle")
        page.wait_for_timeout(1_200)

        hero = page.locator("section[aria-labelledby='hero-title']")
        hero_action = hero.get_by_role("link", name="Start a conversation")
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
        self.assertEqual(navigation.count(), 4)
        self.assertEqual(
            navigation.evaluate_all(
                "elements => elements.map(element => [element.textContent.trim(), element.getAttribute('href')])"
            ),
            [["Work", "#work"], ["Pip", "/pip"], ["About", "#about"], ["Contact", "#contact"]],
        )
        self.assertEqual(page.locator("header [class*='profileTilt']").count(), 1)
        self.assertEqual(page.locator("#about [class*='profileTilt']").count(), 0)
        self.assertTrue(
            page.locator("header [class*='profileTilt']").evaluate(
                """element => {
                    const card = element.getBoundingClientRect();
                    const header = element.closest('header').getBoundingClientRect();
                    return card.left >= header.left && card.right <= header.right
                        && card.top >= header.top && card.bottom <= header.bottom;
                }"""
            )
        )
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

        for project in ("Rakazo", "linux-sonar", "HomeBot"):
            page.get_by_role("button", name=re.compile(project, re.I)).click()
            page.locator("[class*='rakazoSignals']").wait_for(state="visible")
            self.assertTrue(
                page.locator("[class*='rakazoIdentity']").evaluate(
                    """identity => {
                        const identityBounds = identity.querySelector('strong').getBoundingClientRect();
                        const signalsBounds = identity.nextElementSibling.getBoundingClientRect();
                        return identityBounds.right <= signalsBounds.left + 0.5;
                    }"""
                ),
                f"{project} identity overlaps its signal list",
            )

        page.set_viewport_size({"width": 390, "height": 844})
        page.get_by_role("button", name=re.compile("HomeBot", re.I)).click()
        page.locator("[class*='rakazoSignals']").wait_for(state="visible")
        self.assertTrue(
            page.locator("[class*='rakazoSignals']").evaluate(
                """signals => {
                    const signalBounds = signals.getBoundingClientRect();
                    const captionBounds = signals.parentElement.querySelector('[class*=mediaCaption]').getBoundingClientRect();
                    return signalBounds.bottom <= captionBounds.top;
                }"""
            )
        )
        browser.close()

    def test_pointer_stirs_the_pond(self) -> None:
        browser = self.playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page_errors = []
        console_issues = []
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

        pond = page.locator("[data-pixi-state]")
        page.wait_for_function(
            """() => {
                const pond = document.querySelector('[data-pixi-state]');
                return pond?.dataset.pixiState === 'running' && pond.dataset.fishPositions;
            }"""
        )
        first_positions = pond.get_attribute("data-fish-positions")
        first_water_offset = pond.get_attribute("data-water-offset")
        self.assertGreaterEqual(int(pond.get_attribute("data-fish-count")), 18)
        self.assertGreater(float(pond.get_attribute("data-fish-average-speed")), 14)
        visible_anchors = pond.get_attribute("data-visible-anchor-ids").split(",")
        self.assertIn("fern-stone-top", visible_anchors)
        self.assertIn("east-island-top", visible_anchors)
        self.assertGreaterEqual(int(pond.get_attribute("data-pond-element-count")), 10)
        self.assertGreaterEqual(int(pond.get_attribute("data-insect-count")), 2)
        self.assertEqual(int(pond.get_attribute("data-cat-count")), 1)
        self.assertEqual(
            pond.get_attribute("data-fish-logic"),
            "authoritative-seeded-world-steering",
        )
        self.assertEqual(
            pond.get_attribute("data-world-model"),
            "seeded-routine-rock-target-food-environment",
        )
        page.wait_for_function(
            """initial => {
                const pond = document.querySelector('[data-pixi-state]');
                return pond?.dataset.waterOffset !== initial;
            }""",
            arg=first_water_offset,
        )
        self.assertNotEqual(pond.get_attribute("data-water-offset"), first_water_offset)
        cat_x, cat_y = (
            float(value)
            for value in pond.get_attribute("data-cat-position").split(",")
        )
        first_cat_position = pond.get_attribute("data-cat-position")
        first_cat_rock = pond.get_attribute("data-cat-rock")
        first_pounce_count = int(pond.get_attribute("data-cat-pounce-count"))
        self.assertEqual(pond.get_attribute("data-cat-over-water"), "false")
        self.assertEqual(pond.get_attribute("data-cat-water-violation"), "false")
        self.assertLess(abs(float(pond.get_attribute("data-cat-rotation"))), 0.12)
        page.wait_for_function(
            "document.querySelector('[data-pixi-state]')?.dataset.catTarget !== 'none'",
            timeout=20_000,
        )
        aim_x = float(pond.get_attribute("data-cat-aim-screen").split(",")[0])
        cat_x = float(pond.get_attribute("data-cat-position").split(",")[0])
        self.assertEqual(
            int(pond.get_attribute("data-cat-facing")),
            -1 if aim_x < cat_x else 1,
        )

        def disturb_water_near_cat(x, y) -> None:
            offsets = (
                (70, 0), (-70, 0), (0, 70), (0, -70),
                (105, 105), (-105, 105), (105, -105), (-105, -105),
                (210, 0), (-210, 0), (0, 210), (0, -210),
            )
            impact_x, impact_y = find_open_water(
                page,
                pond,
                ((x + offset_x, y + offset_y) for offset_x, offset_y in offsets),
            )
            self.assertLess(((impact_x - x) ** 2 + (impact_y - y) ** 2) ** 0.5, 280)
            page.mouse.click(impact_x, impact_y)

        disturb_water_near_cat(cat_x, cat_y)
        page.wait_for_function(
            """initial => {
                const pond = document.querySelector('[data-pixi-state]');
                return Number(pond?.dataset.catPounceCount) > initial;
            }""",
            arg=first_pounce_count,
        )
        self.assertNotEqual(pond.get_attribute("data-cat-state"), "idle")
        page.wait_for_function(
            "initial => document.querySelector('[data-pixi-state]')?.dataset.catPosition !== initial",
            arg=first_cat_position,
        )
        self.assertNotEqual(pond.get_attribute("data-cat-position"), first_cat_position)
        page.wait_for_function(
            """() => {
                const pond = document.querySelector('[data-pixi-state]');
                return pond?.dataset.catGrounded === 'true' && ['idle', 'observe'].includes(pond.dataset.catState);
            }"""
        )
        self.assertNotEqual(pond.get_attribute("data-cat-rock"), first_cat_rock)
        self.assertEqual(pond.get_attribute("data-cat-over-water"), "false")
        self.assertEqual(pond.get_attribute("data-cat-water-violation"), "false")
        self.assertEqual(pond.get_attribute("data-cat-empty-bap-count"), "0")
        self.assertLess(abs(float(pond.get_attribute("data-cat-rotation"))), 0.12)
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
        page.wait_for_function(
            "document.querySelector('[data-pixi-state]')?.dataset.fishReacting === 'true'"
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
        page.wait_for_function(
            "Number(document.querySelector('[data-pixi-state]')?.dataset.rippleCount) > 0",
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
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page_errors = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.goto(f"{self.base_url}/?pond-seed=e2e-food", wait_until="networkidle")
        pond = page.locator("[data-pixi-state]")
        page.wait_for_function(
            "document.querySelector('[data-pixi-state]')?.dataset.fishPositions"
        )
        food_before = int(pond.get_attribute("data-food-dropped-count"))
        context_suppressed_on_link = page.get_by_role("link", name="See the work").evaluate(
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
        page.wait_for_function(
            "initial => Number(document.querySelector('[data-pixi-state]')?.dataset.foodDroppedCount) > initial",
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
        page.wait_for_function(
            "document.querySelector('[data-pixi-state]')?.dataset.foodReservations",
            timeout=20_000,
        )
        try:
            page.wait_for_function(
                "Number(document.querySelector('[data-pixi-state]')?.dataset.fishFedCount) > 0",
                timeout=30_000,
            )
        except PlaywrightTimeoutError:
            detail = pond.evaluate(
                "element => ({ frame: element.dataset.frame, states: element.dataset.fishFoodStates, reservations: element.dataset.foodReservations, food: element.dataset.foodEntities, waterViolation: element.dataset.fishWaterViolation })"
            )
            browser.close()
            self.fail(f"Fish never completed the reserved feeding cycle: {detail}")
        self.assertLessEqual(int(pond.get_attribute("data-food-max-count")), 8)
        self.assertEqual(pond.get_attribute("data-cat-empty-bap-count"), "0")
        self.assertEqual(pond.get_attribute("data-fish-water-violation"), "false")
        self.assertEqual(page_errors, [])
        browser.close()

    def test_profile_card_foil_is_square_pointer_driven_and_motion_safe(self) -> None:
        browser = self.playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page_errors = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.goto(self.base_url, wait_until="networkidle")

        card = page.locator('[class*="profileTilt"]')
        card_surface = card.locator('[class*="profileLine"]')
        portrait = page.locator('[class*="profilePortrait"]')
        card.scroll_into_view_if_needed()
        page.wait_for_function(
            "document.querySelector('[class*=profilePortrait]')?.dataset.foilRenderer"
        )
        page.wait_for_timeout(700)
        card_box = card.bounding_box()
        portrait_box = portrait.bounding_box()
        canvas_box = portrait.locator("canvas").bounding_box()
        self.assertIsNotNone(card_box)
        self.assertIsNotNone(portrait_box)
        self.assertIsNotNone(canvas_box)
        self.assertAlmostEqual(portrait_box["width"], portrait_box["height"], delta=0.5)
        self.assertNotEqual(card_surface.evaluate("element => getComputedStyle(element).clipPath"), "none")
        self.assertEqual(card_surface.evaluate("element => getComputedStyle(element).backdropFilter"), "none")
        self.assertEqual(portrait.evaluate("element => getComputedStyle(element).overflow"), "hidden")
        self.assertEqual(portrait.evaluate("element => getComputedStyle(element).boxSizing"), "border-box")
        self.assertAlmostEqual(canvas_box["x"] - portrait_box["x"], 3, delta=0.25)
        self.assertAlmostEqual(canvas_box["y"] - portrait_box["y"], 3, delta=0.25)
        self.assertAlmostEqual(canvas_box["width"], portrait_box["width"] - 6, delta=0.25)
        self.assertNotEqual(
            portrait.evaluate("element => getComputedStyle(element, '::after').boxShadow"),
            "none",
        )
        self.assertIn(portrait.get_attribute("data-foil-renderer"), ("webgl", "fallback"))
        if portrait.get_attribute("data-foil-renderer") == "webgl":
            self.assertRegex(portrait.locator("canvas").get_attribute("data-foil-view"), r"^\d\.\d{3},\d\.\d{3}$")
        foil_background = portrait.evaluate(
            "element => getComputedStyle(element, '::before').backgroundImage"
        )
        self.assertIn("linear-gradient", foil_background)
        self.assertNotIn("radial-gradient", foil_background)
        self.assertNotIn("conic-gradient", foil_background)
        self.assertEqual(card.locator("a, button").count(), 0)
        self.assertEqual(
            card.locator("small").first.evaluate("element => getComputedStyle(element.parentElement).userSelect"),
            "text",
        )

        page.mouse.move(card_box["x"] + 12, card_box["y"] + 12)
        page.wait_for_timeout(100)
        self.assertNotEqual(card.evaluate("element => element.style.getPropertyValue('--profile-tilt-y')"), "0deg")
        page.mouse.move(card_box["x"] + card_box["width"] + 40, card_box["y"])
        page.wait_for_timeout(360)
        self.assertEqual(card.evaluate("element => element.style.getPropertyValue('--profile-tilt-y')"), "0deg")

        page.emulate_media(reduced_motion="reduce")
        page.reload(wait_until="networkidle")
        reduced_card = page.locator('[class*="profileTilt"]')
        reduced_card.scroll_into_view_if_needed()
        reduced_box = reduced_card.bounding_box()
        page.mouse.move(reduced_box["x"] + 12, reduced_box["y"] + 12)
        page.wait_for_timeout(100)
        self.assertEqual(
            reduced_card.locator('[class*="profileLine"]').evaluate("element => getComputedStyle(element).transform"),
            "none",
        )
        self.assertEqual(page_errors, [])
        browser.close()

    def test_reduced_motion_preserves_the_ecosystem_at_low_speed(self) -> None:
        browser = self.playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        console_issues = []
        page_errors = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on(
            "console",
            lambda message: record_console_issue(console_issues, message),
        )
        page.emulate_media(reduced_motion="reduce")
        page.goto(f"{self.base_url}/?pond-seed=e2e-reduced", wait_until="networkidle")

        pond = page.locator("[data-pixi-state]")
        page.wait_for_function(
            """() => {
                const pond = document.querySelector('[data-pixi-state]');
                return pond?.dataset.pixiState === 'running' && pond.dataset.fishPositions;
            }"""
        )
        first_positions = pond.get_attribute("data-fish-positions")
        first_offset = pond.get_attribute("data-water-offset")
        self.assertEqual(pond.get_attribute("data-motion"), "reduced")
        self.assertEqual(page.locator("[data-renderer]").get_attribute("data-renderer"), "pixi")
        self.assertEqual(pond.locator("canvas").count(), 1)
        page.wait_for_function(
            "initial => document.querySelector('[data-pixi-state]')?.dataset.fishPositions !== initial",
            arg=first_positions,
            timeout=5_000,
        )
        self.assertNotEqual(pond.get_attribute("data-fish-positions"), first_positions)
        self.assertNotEqual(pond.get_attribute("data-water-offset"), first_offset)
        fish_points = [
            tuple(float(value) for value in point.split(","))
            for point in pond.get_attribute("data-fish-positions").split(";")
        ]
        fish_x, fish_y = find_open_water(page, pond, fish_points)
        page.mouse.click(fish_x, fish_y, button="right")
        page.wait_for_function(
            "Number(document.querySelector('[data-pixi-state]')?.dataset.foodDroppedCount) > 0"
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
        page = context.new_page()
        page.goto(f"{self.base_url}/?pond-seed=e2e-touch", wait_until="networkidle")
        pond = page.locator("[data-pixi-state]")
        page.wait_for_function(
            "document.querySelector('[data-pixi-state]')?.dataset.pixiState === 'running' && document.querySelector('[data-pixi-state]')?.dataset.fishPositions"
        )
        fish_points = [
            tuple(float(value) for value in point.split(","))
            for point in pond.get_attribute("data-fish-positions").split(";")
        ]
        fish_x, fish_y = find_open_water(page, pond, fish_points)
        impacts_before = int(pond.get_attribute("data-primary-impact-count"))
        page.touchscreen.tap(fish_x, fish_y)
        page.wait_for_function(
            "document.querySelector('[data-pixi-state]')?.dataset.touchGesture === 'single-tap-impact'"
        )
        self.assertEqual(
            int(pond.get_attribute("data-primary-impact-count")),
            impacts_before + 1,
        )
        self.assertGreater(int(pond.get_attribute("data-ring-count")), 0)
        self.assertEqual(int(pond.get_attribute("data-food-dropped-count")), 0)
        impacts_before_food = int(pond.get_attribute("data-primary-impact-count"))
        page.touchscreen.tap(fish_x, fish_y)
        page.wait_for_timeout(120)
        page.touchscreen.tap(fish_x, fish_y)
        try:
            page.wait_for_function(
                "Number(document.querySelector('[data-pixi-state]')?.dataset.foodDroppedCount) > 0"
            )
        except PlaywrightTimeoutError:
            detail = pond.evaluate(
                "element => ({ gesture: element.dataset.touchGesture, requested: element.dataset.foodRequestedAt, frame: element.dataset.frame, state: element.dataset.pixiState })"
            )
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
        project_button = page.get_by_role("button", name=re.compile("Orchid.ai", re.I))
        project_button.scroll_into_view_if_needed()
        box = project_button.bounding_box()
        page.touchscreen.tap(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        page.wait_for_timeout(100)
        page.touchscreen.tap(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
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
        self.assertEqual(pond.get_attribute("data-cat-empty-bap-count"), "0")
        context.close()
        browser.close()

    def test_webgl_failure_uses_the_art_directed_fallback(self) -> None:
        browser = self.playwright.chromium.launch()
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        context.add_init_script(
            "HTMLCanvasElement.prototype.getContext = function () { return null; }"
        )
        page = context.new_page()
        page.goto(self.base_url, wait_until="networkidle")
        page.wait_for_function(
            "document.querySelector('[data-pixi-state]')?.dataset.pixiState === 'fallback'"
        )
        self.assertEqual(
            page.locator("[data-renderer]").get_attribute("data-renderer"),
            "fallback",
        )
        self.assertEqual(page.locator("[data-pixi-state] canvas").count(), 0)
        self.assertTrue(
            page.get_by_role(
                "heading", name="I make stubborn software behave."
            ).is_visible()
        )
        context.close()
        browser.close()

    def test_pause_resize_and_remount_keep_world_state_bounded(self) -> None:
        browser = self.playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto(f"{self.base_url}/?pond-seed=e2e-lifecycle", wait_until="networkidle")
        pond = page.locator("[data-pixi-state]")
        page.wait_for_function(
            "document.querySelector('[data-pixi-state]')?.dataset.fishWorldPositions"
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
        self.assertEqual(pond.get_attribute("data-pixi-state"), "paused")
        paused_frame = pond.get_attribute("data-frame")
        page.wait_for_timeout(350)
        self.assertEqual(pond.get_attribute("data-frame"), paused_frame)
        page.evaluate(
            """() => {
                Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
                document.dispatchEvent(new Event('visibilitychange'));
            }"""
        )
        page.wait_for_function(
            "initial => document.querySelector('[data-pixi-state]')?.dataset.frame !== initial",
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
        page.wait_for_function(
            "document.querySelector('[data-pixi-state]')?.dataset.pixiState === 'running'"
        )
        self.assertEqual(page.locator("[data-pixi-state] canvas").count(), 1)
        browser.close()

    def test_removed_routes_use_the_pond_not_found_page(self) -> None:
        browser = self.playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 800})
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
        self.assertEqual(page.locator("[data-renderer]").count(), 1)
        self.assertLessEqual(
            page.evaluate("document.documentElement.scrollWidth"), 1280
        )
        browser.close()


class PipShareCardExpectationTests:
    route_cards = {
        "/": "/share-cards/luinbytes-dev-pond.png",
        "/pip": "/share-cards/luinbytes-dev-pip.png",
    }
    route_alts = {
        "/": "Lu | Software Engineer",
        "/pip": "Pip — Your Telegram mate",
    }
    expected_sha256 = {
        "/share-cards/luinbytes-dev-pip.png": "e8ad43690346c7b2ff683e1da1676e82822ec0cc2498365dc095188b56e72789",
    }

    def test_pip_share_card_metadata_contract(self) -> None:
        assert self.route_cards["/pip"] == "/share-cards/luinbytes-dev-pip.png"
        assert self.route_alts["/pip"] == "Pip — Your Telegram mate"
        assert self.expected_sha256[self.route_cards["/pip"]].startswith("e8ad4369")
