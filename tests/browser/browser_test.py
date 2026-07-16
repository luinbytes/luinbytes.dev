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
from pathlib import Path

from playwright.sync_api import Page, sync_playwright


SCREENSHOTS = Path("test-results")
SERVER_LOG = SCREENSHOTS / "dev-server.log"
READY_PATTERN = re.compile(r"\bReady in\b")


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
    def test_sitemap_includes_ballhammer(self) -> None:
        root = ET.parse("public/sitemap.xml").getroot()
        locations = [
            location.text
            for location in root.findall(
                "{http://www.sitemaps.org/schemas/sitemap/0.9}url/"
                "{http://www.sitemaps.org/schemas/sitemap/0.9}loc"
            )
        ]

        self.assertEqual(len(locations), 10)
        self.assertEqual(locations.count("https://luinbytes.github.io/ballhammer"), 1)


class BrowserTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        SCREENSHOTS.mkdir(exist_ok=True)
        port = test_port()
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

    @classmethod
    def tearDownClass(cls) -> None:
        if cls.playwright is not None:
            cls.playwright.stop()
        cls.stop_server()


PRODUCTS = (
    ("Meteor", "/meteor"),
    ("Sleepr", "/sleepr"),
    ("BallHammer", "/ballhammer"),
    ("Risk of Anticheat", "/risk-of-anticheat"),
    ("BrcTrainer", "/brc-trainer"),
    ("DaggerFall", "/dagger-fall"),
    ("SuperHackerGolf", "/super-hacker-golf"),
)

EXTERNAL_PRODUCTS = (
    ("Minecrooft", "https://github.com/luinbytes/minecrooft"),
    ("Cursor Barrier", "https://github.com/luinbytes/cursor-barrier"),
    ("Raycast automation", "https://github.com/luinbytes/extensions"),
)

PRODUCT_ROUTES = PRODUCTS + (("linux-sonar", "/linux-sonar"),)

CORE_PRODUCT_ROUTES = (
    (
        "Meteor",
        "/meteor",
        (
            ("Privacy Policy", "/meteor/privacy"),
        ),
    ),
    ("Sleepr", "/sleepr", (("Get Sleepr", "#get-it"),)),
    (
        "linux-sonar",
        "/linux-sonar",
        (("View on GitHub", "https://github.com/luinbytes/linux-sonar"),),
    ),
)

GAME_TOOLING_ROUTES = (
    ("DaggerFall", "/dagger-fall", "https://github.com/luinbytes/dagger-fall"),
    (
        "SuperHackerGolf",
        "/super-hacker-golf",
        "https://github.com/luinbytes/SuperHackerGolf",
    ),
)

UNAVAILABLE_GAME_TOOLING_ROUTES = (
    (
        "Risk of Anticheat",
        "/risk-of-anticheat",
        "https://github.com/luinbytes/risk-of-anticheat",
    ),
    ("BrcTrainer", "/brc-trainer", "https://github.com/luinbytes/brc-trainer"),
)


def open_products_navigation(page: Page, mobile: bool) -> None:
    if mobile:
        page.get_by_role("button", name="Open menu").click()
    else:
        page.get_by_role("button", name="/products").click()


def product_link(page: Page, name: str, path: str, mobile: bool):
    accessible_name = path if mobile else re.compile(rf"^{re.escape(name)}")
    return page.get_by_role("link", name=accessible_name)


class ProductNavigationTests(BrowserTestCase):
    def test_ballhammer_product_at_desktop_and_mobile(self) -> None:
        viewports = (
            {"width": 1440, "height": 900},
            {"width": 412, "height": 915},
        )

        for viewport in viewports:
            with self.subTest(viewport=viewport):
                browser = self.playwright.chromium.launch()
                page = browser.new_page(viewport=viewport)
                mobile = viewport["width"] == 412
                page.goto(self.base_url)

                open_products_navigation(page, mobile)
                link = product_link(page, "BallHammer", "/ballhammer", mobile)
                self.assertTrue(link.is_visible())
                link.click()
                page.wait_for_url("**/ballhammer")

                lede = page.get_by_text(
                    "Enemy overlays and configurable aim controls for Darktide.",
                    exact=True,
                )
                lede.wait_for(state="visible")
                self.assertTrue(lede.is_visible())
                source = page.get_by_role("link", name="View source on GitHub")
                self.assertEqual(
                    source.get_attribute("href"),
                    "https://github.com/luinbytes/BallHammer",
                )
                capabilities = (
                    "All-enemy ESP with bone-projected boxes",
                    "Distinct special-enemy names, SPECIAL flags, distances, outlines, and health bars",
                    "Distance fading and visibility behavior",
                    "Compact world-space horde grouping with separate horizontal and elevation limits, buffered off-screen membership, aim-bone dots, and reversible join/split animation",
                    "A configurable normal aimbot chooses the visible target closest to the crosshair",
                    "Target lock holds while the target remains alive and visible, with immediate replacement on death or occlusion",
                    "Head or torso aim, configurable distance and field of view, interpolated smoothing, and aim curvature",
                    "Activate with left mouse, right mouse, either mouse button, or a custom keyboard key",
                    "Weighted Arbites and Skitarii companion orders prioritize special type, distance, and remaining health without moving the camera",
                    "Normal retargeting waits for companion damage, with a distance-based timeout for rejected orders",
                    "Triggerbot and rage modes are not included",
                    "Configuration has separate ESP, Aimbot, and Companion sections in Darktide Mod Options.",
                )
                for capability in capabilities:
                    self.assertTrue(page.get_by_text(capability, exact=True).is_visible())
                get_it = page.get_by_role("region", name="Get it")
                self.assertTrue(
                    get_it.get_by_text("Darktide Mod Loader", exact=True).is_visible()
                )
                self.assertTrue(
                    get_it.get_by_text("Darktide Mod Framework", exact=True).is_visible()
                )
                self.assertTrue(
                    get_it.get_by_text(
                        "Copy the repository to the game mods directory as BallHammer.",
                        exact=True,
                    ).is_visible()
                )
                self.assertTrue(
                    get_it.get_by_text(
                        "Add BallHammer to mod_load_order.txt.", exact=True
                    ).is_visible()
                )
                self.assertTrue(
                    get_it.get_by_text(
                        "Restart Darktide after installing or replacing mod files.",
                        exact=True,
                    ).is_visible()
                )
                self.assertTrue(
                    get_it.get_by_text(
                        "Configure BallHammer in Darktide mod options.", exact=True
                    ).is_visible()
                )

                hero = page.get_by_role(
                    "img", name="Darktide gameplay with BallHammer enemy overlays"
                )
                self.assertTrue(hero.is_visible())
                self.assertTrue(
                    hero.evaluate(
                        "element => element.complete && element.naturalWidth > 0"
                    )
                )
                self.assertEqual(hero.evaluate("element => getComputedStyle(element).objectFit"), "contain")
                if not mobile:
                    heading_box = page.get_by_role("heading", name="BallHammer.").bounding_box()
                    hero_box = hero.bounding_box()
                    self.assertIsNotNone(heading_box)
                    self.assertIsNotNone(hero_box)
                    self.assertLessEqual(
                        heading_box["x"] + heading_box["width"], hero_box["x"]
                    )
                self.assertLessEqual(
                    page.evaluate("document.documentElement.scrollWidth"),
                    viewport["width"],
                )

                page.goto(f"{self.base_url}/#builds")
                builds = page.locator("#builds")
                builds.scroll_into_view_if_needed()
                self.assertNotIn(
                    "BallHammer",
                    "\n".join(
                        builds.locator("ol[data-build-list] small").all_text_contents()
                    ),
                )

                browser.close()

    def test_products_navigation_at_desktop_and_mobile(self) -> None:
        viewports = {
            "desktop": {"width": 1440, "height": 900},
            "mobile": {"width": 412, "height": 915},
        }

        for viewport_name, viewport in viewports.items():
            with self.subTest(viewport=viewport_name):
                browser = self.playwright.chromium.launch()
                page = browser.new_page(viewport=viewport)
                mobile = viewport_name == "mobile"
                page.goto(self.base_url)

                open_products_navigation(page, mobile)
                for name, path in PRODUCTS:
                    link = product_link(page, name, path, mobile)
                    self.assertTrue(link.is_visible())
                    link.click()
                    page.wait_for_url(f"**{path}")
                    self.assertEqual(page.url, f"{self.base_url}{path}")
                    heading = page.get_by_role(
                        "heading", level=1, name=f"{name}."
                    )
                    heading.wait_for(state="visible")
                    self.assertTrue(heading.is_visible())
                    open_products_navigation(page, mobile)

                for name, href in EXTERNAL_PRODUCTS:
                    link = page.get_by_role(
                        "link", name=re.compile(rf"^{re.escape(name)}")
                    )
                    self.assertTrue(link.is_visible())
                    self.assertEqual(link.get_attribute("href"), href)
                    self.assertEqual(link.get_attribute("target"), "_blank")
                    self.assertEqual(link.get_attribute("rel"), "noopener noreferrer")

                page.screenshot(
                    path=SCREENSHOTS / f"products-navigation-{viewport_name}.png",
                    full_page=True,
                )

                browser.close()

    def test_homepage_shows_current_builds(self) -> None:
        browser = self.playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(self.base_url)

        builds = page.locator("#builds")
        builds.scroll_into_view_if_needed()

        self.assertTrue(
            builds.get_by_role(
                "heading", level=2, name="Problems made tangible."
            ).is_visible()
        )
        self.assertTrue(
            builds.locator("ol[data-build-list]").get_by_role("button").first.is_visible()
        )
        build_names = builds.locator("ol[data-build-list] small").all_text_contents()
        self.assertEqual(
            [name.split(" / ", 1)[0] for name in build_names],
            ["Linux Sonar", "Meteor", "Poke Android", "Sleepr", "Game Systems"],
        )
        for removed_name in ("Minecrooft", "Cursor Barrier", "Raycast automation"):
            self.assertNotIn(removed_name, "\n".join(build_names))

        browser.close()

    def test_dedicated_product_routes_render_at_desktop_and_mobile(self) -> None:
        viewports = (
            {"width": 1440, "height": 900},
            {"width": 412, "height": 915},
        )

        for viewport in viewports:
            with self.subTest(viewport=viewport):
                browser = self.playwright.chromium.launch()
                page = browser.new_page(viewport=viewport)

                for name, path in PRODUCT_ROUTES:
                    page.goto(f"{self.base_url}{path}")
                    heading = page.get_by_role(
                        "heading", level=1, name=f"{name}."
                    )
                    heading.wait_for(state="visible")
                    self.assertTrue(heading.is_visible())

                browser.close()

    def test_core_product_pages_are_compact_and_obtainable_at_desktop_and_mobile(self) -> None:
        viewports = (
            {"width": 1440, "height": 900},
            {"width": 412, "height": 915},
        )

        for viewport in viewports:
            for name, path, destinations in CORE_PRODUCT_ROUTES:
                with self.subTest(viewport=viewport, path=path):
                    browser = self.playwright.chromium.launch()
                    page = browser.new_page(viewport=viewport)
                    page.goto(f"{self.base_url}{path}")

                    self.assertTrue(
                        page.get_by_role(
                            "heading", level=1, name=f"{name}."
                        ).is_visible()
                    )
                    self.assertEqual(
                        page.get_by_role(
                            "complementary", name=f"{name} case interface"
                        ).count(),
                        0,
                    )
                    self.assertEqual(
                        page.get_by_role("navigation", name="Case sections").count(),
                        0,
                    )
                    for section_name in ("What it does", "Under the hood", "Get it"):
                        section = page.get_by_role("region", name=section_name)
                        self.assertTrue(section.is_visible())

                    for link_name, href in destinations:
                        link = page.get_by_role("link", name=link_name).last
                        self.assertTrue(link.is_visible())
                        self.assertEqual(link.get_attribute("href"), href)

                    if path == "/meteor":
                        self.assertTrue(
                            page.get_by_text(
                                "A public Google Play listing is not currently available.",
                                exact=False,
                            ).is_visible()
                        )
                        self.assertEqual(
                            page.locator(
                                'a[href="https://play.google.com/store/apps/details?id=com.luinbytes.meteor"]'
                            ).count(),
                            0,
                        )

                    self.assertLessEqual(
                        page.evaluate("document.documentElement.scrollWidth"),
                        viewport["width"],
                    )
                    browser.close()

    def test_unavailable_game_tooling_has_no_dead_source_or_release_links(self) -> None:
        for name, path, source_href in UNAVAILABLE_GAME_TOOLING_ROUTES:
            with self.subTest(path=path):
                browser = self.playwright.chromium.launch()
                page = browser.new_page(viewport={"width": 1440, "height": 900})
                page.goto(f"{self.base_url}{path}")

                self.assertTrue(
                    page.get_by_text(
                        "Public source and releases are not currently available.",
                        exact=True,
                    ).is_visible()
                )
                self.assertEqual(page.locator(f'a[href="{source_href}"]').count(), 0)
                self.assertEqual(
                    page.locator(f'a[href="{source_href}/releases"]').count(), 0
                )
                browser.close()

    def test_game_tooling_pages_are_compact_and_source_backed_at_desktop_and_mobile(self) -> None:
        viewports = (
            {"width": 1440, "height": 900},
            {"width": 412, "height": 915},
        )

        for viewport in viewports:
            for name, path, source_href in GAME_TOOLING_ROUTES:
                with self.subTest(viewport=viewport, path=path):
                    browser = self.playwright.chromium.launch()
                    page = browser.new_page(viewport=viewport)
                    page.goto(f"{self.base_url}{path}")

                    self.assertTrue(
                        page.get_by_role(
                            "heading", level=1, name=f"{name}."
                        ).is_visible()
                    )
                    for section_name in ("What it does", "Under the hood", "Get it"):
                        self.assertTrue(
                            page.get_by_role("region", name=section_name).is_visible()
                        )
                    source = page.get_by_role("link", name="View source on GitHub").last
                    self.assertTrue(source.is_visible())
                    self.assertEqual(source.get_attribute("href"), source_href)
                    self.assertEqual(
                        page.get_by_role(
                            "complementary", name=f"{name} case interface"
                        ).count(),
                        0,
                    )
                    self.assertEqual(
                        page.get_by_role("navigation", name="Case sections").count(),
                        0,
                    )
                    self.assertLessEqual(
                        page.evaluate("document.documentElement.scrollWidth"),
                        viewport["width"],
                    )
                    browser.close()

    def test_linux_sonar_channel_labels_use_dark_ink(self) -> None:
        browser = self.playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(f"{self.base_url}/linux-sonar")

        labels = page.get_by_label("Five virtual audio channels").locator("span")
        self.assertEqual(
            labels.all_text_contents(), ["Game", "Chat", "Media", "Aux", "Mic"]
        )
        for label in labels.all():
            self.assertEqual(
                label.evaluate("element => getComputedStyle(element).color"),
                "rgb(7, 19, 18)",
            )

        browser.close()
