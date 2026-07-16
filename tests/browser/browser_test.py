import os
import re
import signal
import socket
import subprocess
import tempfile
import time
import unittest
import urllib.request
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


def open_products_navigation(page: Page, mobile: bool) -> None:
    if mobile:
        page.get_by_role("button", name="Open menu").click()
    else:
        page.get_by_role("button", name="/products").click()


def product_link(page: Page, name: str, path: str, mobile: bool):
    accessible_name = path if mobile else re.compile(rf"^{re.escape(name)}")
    return page.get_by_role("link", name=accessible_name)


class ProductNavigationTests(BrowserTestCase):
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
                    self.assertTrue(
                        page.get_by_role(
                            "heading", level=1, name=f"{name}."
                        ).is_visible()
                    )
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
                    self.assertTrue(
                        page.get_by_role("heading", level=1, name=f"{name}.").is_visible()
                    )

                browser.close()
