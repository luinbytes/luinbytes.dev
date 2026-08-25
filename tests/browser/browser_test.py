import hashlib
import json
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
        self.assertEqual(locations.count("https://luinbytes.dev/ballhammer"), 1)


class MetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.metadata = []

    def handle_starttag(self, tag, attrs) -> None:
        attributes = dict(attrs)
        if tag == "meta" or (tag == "link" and attributes.get("rel") == "canonical"):
            self.metadata.append(attributes)


class ShareCardStaticExportTests(unittest.TestCase):
    route_cards = {
        "/": "/share-cards/luinbytes-dev-pink-print.png",
        "/ballhammer": "/share-cards/ballhammer.png",
        "/super-hacker-golf": "/share-cards/super-hacker-golf.png",
        "/meteor": "/share-cards/meteor.png",
        "/meteor/privacy": "/share-cards/meteor-privacy.png",
        "/linux-sonar": "/share-cards/linux-sonar.png",
        "/sleepr": "/share-cards/sleepr.png",
        "/risk-of-anticheat": "/share-cards/risk-of-anticheat.png",
        "/brc-trainer": "/share-cards/brc-trainer.png",
        "/dagger-fall": "/share-cards/dagger-fall.png",
    }
    expected_sha256 = {
        "/share-cards/ballhammer.png": "66ffdaa908fa12d5b2ce7afc101168b3f6d613ce858b820021f3e9c9b27fdd6c",
        "/share-cards/brc-trainer.png": "81a0c985297a959d25f990a71cfc66c28b23468f8c9656ef42dd0ccebc75a784",
        "/share-cards/dagger-fall.png": "fac041426b34e062cbb23532f4da4730d78ee181923cf747d27d098d1f25a646",
        "/share-cards/linux-sonar.png": "d2ffacd26aacbc020f4210fa4c8a841a3f4af70e795ccf934021f76a264d933a",
        "/share-cards/luinbytes-dev-pink-print.png": "06bab5ee959d737dae537d7440c39a516c23e17ce976391dcbc68a7fe3a93548",
        "/share-cards/meteor.png": "5ce91084e679f7cf91a1d0a398c27f7a1f36fa8381697ffaf720102f31f14bf6",
        "/share-cards/meteor-privacy.png": "0bcafd678816b610a2a1bc88789c8b2d1c45796abcbcd46922780620c4c52e7e",
        "/share-cards/risk-of-anticheat.png": "11ff645c3355613d5c6195a61b3327a71882725cd1cfb95c6774439724e139ab",
        "/share-cards/sleepr.png": "c8335b54f4271d5a46e3ce3982a3d3f9471b339f616c2934a53ae486f6429283",
        "/share-cards/super-hacker-golf.png": "81a60de7534c679852a6e9f7422d8c3f1d52678b8606e3039f9df7f7d6c0e370",
    }

    def test_every_scoped_route_exports_a_production_large_image_card(self) -> None:
        build = subprocess.run(["npm", "run", "build"], check=False)
        self.assertEqual(build.returncode, 0)

        for route, card_path in self.route_cards.items():
            with self.subTest(route=route):
                exported_html = Path("out") / (
                    "index.html" if route == "/" else f"{route.lstrip('/')}.html"
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
                self.assertEqual(names.get("twitter:card"), "summary_large_image")
                self.assertEqual(names.get("twitter:image"), card_url)

                png = (Path("out") / card_path.lstrip("/")).read_bytes()
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
    ("Hermes Android", "https://github.com/luinbytes/hermes-android"),
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


class MotionTests(BrowserTestCase):
    def test_homepage_motion_uses_smooth_static_print_treatment(self) -> None:
        browser = self.playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(self.base_url, wait_until="networkidle")

        hero_plate = page.locator('[class*="heroSignalPlate"]')
        poster_mark = page.locator('[class*="posterMark"]')
        hero_timing = hero_plate.evaluate(
            """element => {
                const style = getComputedStyle(element);
                return {
                    duration: style.animationDuration,
                    timing: style.animationTimingFunction,
                };
            }"""
        )
        decoration_animation = poster_mark.evaluate(
            "element => getComputedStyle(element, '::before').animationName"
        )
        cssom_rules = page.evaluate(
            """() => {
                const rules = [];
                const collect = (ruleList) => {
                    for (const rule of ruleList) {
                        rules.push(rule.cssText);
                        if (rule.cssRules) collect(rule.cssRules);
                    }
                };
                for (const sheet of document.styleSheets) {
                    if (sheet.href && new URL(sheet.href).origin !== location.origin) continue;
                    try { collect(sheet.cssRules); } catch (_) {}
                }
                return rules.join('\\n');
            }"""
        )

        self.assertNotIn("steps", hero_timing["timing"])
        self.assertLessEqual(float(hero_timing["duration"].removesuffix("s")) * 1000, 220)
        self.assertIn("cubic-bezier(0.23, 1, 0.32, 1)", hero_timing["timing"])
        self.assertEqual(decoration_animation, "none")
        self.assertNotIn("steps(", cssom_rules)

        reduced_page = browser.new_page(viewport={"width": 1440, "height": 900})
        reduced_page.emulate_media(reduced_motion="reduce")
        reduced_page.goto(self.base_url, wait_until="networkidle")
        reduced_plate = reduced_page.locator('[class*="heroSignalPlate"]')
        self.assertEqual(
            reduced_plate.evaluate("element => getComputedStyle(element).animationName"),
            "none",
        )
        self.assertEqual(
            reduced_plate.evaluate("element => getComputedStyle(element).transform"),
            "none",
        )

        browser.close()


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
                if not mobile:
                    self.assertTrue(
                        page.get_by_text(
                            "Darktide ESP, aim and fire controls, and opt-in tactical systems.",
                            exact=True,
                        ).is_visible()
                    )
                link.click()
                page.wait_for_url("**/ballhammer")

                lede = page.get_by_text(
                    "All-enemy and pickup ESP, configurable aim and fire controls, and opt-in tactical systems for Darktide.",
                    exact=True,
                )
                lede.wait_for(state="visible")
                self.assertTrue(lede.is_visible())
                self.assertEqual(page.title(), "BallHammer | Lu")
                self.assertEqual(
                    page.locator('meta[name="description"]').get_attribute("content"),
                    "A Darktide mod with all-enemy and pickup ESP, configurable aim and fire controls, and opt-in tactical systems.",
                )
                self.assertEqual(
                    page.locator('meta[property="og:image:alt"]').get_attribute("content"),
                    "BallHammer — Darktide ESP, aim and fire controls, and tactical systems",
                )
                source = page.get_by_role("link", name="View source on GitHub")
                self.assertEqual(
                    source.get_attribute("href"),
                    "https://github.com/luinbytes/BallHammer",
                )
                capabilities = (
                    "Bone-projected boxes for all enemies, including enemies spawned or respawned after the mod loads",
                    "Distinct special-enemy names, SPECIAL flags, distances, outlines, and health bars",
                    "Distance fading and a visibility check that turns visible ESP white",
                    "Compact world-space horde grouping with separate horizontal and elevation limits, buffered off-screen membership, aim-bone dots, and reversible join/split animation",
                    "Collision-spaced pickup cards with compact stacking, fixed screen sizing, category accents, distance fading, category presets, custom per-pickup filters, and distinct Med, Concentration, Combat, and Celerity Stimm labels",
                    "Normal aimbot and triggerbot keep an in-FOV target locked, then replace it when it leaves the FOV, dies, or becomes occluded",
                    "Head or torso aim, configurable distance and field of view, interpolated smoothing, and aim curvature",
                    "Distance-scaled target preview follows the armor-aware or configured aim bone nearest the crosshair and becomes the activation target",
                    "Left mouse, right mouse, either mouse button, or a custom keyboard activation key",
                    "Configurable magnet triggerbot with aim radius, fire radius, and smoothing",
                    "Rage mode selects visible on-screen targets using danger, range, and crosshair weighting",
                    "Melee-aware aim range limits mouse-one targeting to enemies inside the current weapon sweep reach",
                    "Optional timed repeat fire for press-driven, non-automatic weapons whenever mouse one is held",
                    "Optional local weapon recoil and spread suppression without camera compensation",
                    "Weighted Arbites and Skitarii companion orders based on special type, distance, and remaining health without moving the camera; native companion-rescue states override normal weights, retargeting waits for companion damage, and an optional charged Arbites dog EMP sends its press, hold, and release through Darktide's networked input frames when the dog connects",
                    "Armor and Weakspot Director ranks visible hit zones using the current weapon damage profile, live armor overrides, shields, and weakspot finesse; triggerbot skips invulnerable shots and rage mode can choose another target",
                    "Threat Interceptor marks committed hound, trapper, mutant, rager, sniper, flamer, grenade, and verified overhead attacks while a HUD shows the planned reaction and impact countdown",
                    "Opt-in defensive reactions use bounded safe-window timing, preserve held attacks until the final dodge window, keep the player's movement direction, and dodge committed specialist, rager, and overhead attacks",
                    "Opt-in Guard Brain preserves a configurable stamina reserve and pushes only when at least three nearby melee threats cover the available retreat directions",
                    "Opt-in Warp and Heat Governor predicts the next resource increase, stops unsafe generated shots, and can use the current weapon's native quell or non-damaging vent input when no nearby threat exists",
                    "Diagnostic logging records threat timing and reaction decisions for live compatibility checks without changing the safe defaults",
                )
                for capability in capabilities:
                    self.assertTrue(page.get_by_text(capability, exact=True).is_visible())
                for heading in (
                    "Overlay and pickup intelligence",
                    "Aim and fire controls",
                    "Tactical systems",
                ):
                    self.assertTrue(
                        page.get_by_role("heading", name=heading, exact=True).is_visible()
                    )
                self.assertEqual(
                    page.get_by_text(
                        "Triggerbot and rage modes are not included", exact=True
                    ).count(),
                    0,
                )
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
        visible_build_names = "\n".join(build_names)
        self.assertIn("Hermes Android", visible_build_names)
        self.assertIn("HomeBot", visible_build_names)
        self.assertNotIn("Poke Android", visible_build_names)
        self.assertEqual(
            [name.split(" / ", 1)[0] for name in build_names],
            [
                "Hermes Android",
                "HomeBot",
                "Linux Sonar",
                "Meteor",
                "Sleepr",
                "Game Systems",
            ],
        )

        homebot_button = builds.get_by_role("button", name=re.compile(r"HomeBot"))
        homebot_button.click()
        selected_case = builds.get_by_role("article", name="Selected build: HomeBot")
        self.assertTrue(selected_case.is_visible())
        self.assertTrue(
            selected_case.get_by_text(
                "An open-source Rust desktop, server, and Android home for persistent AI teammates, with Codex, Claude Code, and OpenAI-compatible provider integrations.",
                exact=True,
            ).is_visible()
        )
        self.assertTrue(
            selected_case.get_by_text(
                "Public pre-v1 source in M6 Packaging, Hardening & v1 Parity Gate; no supported release packages yet.",
                exact=True,
            ).is_visible()
        )
        homebot_link = selected_case.get_by_role("link", name="Open project")
        self.assertEqual(
            homebot_link.get_attribute("href"),
            "https://github.com/luinbytes/HomeBot",
        )
        self.assertEqual(homebot_link.get_attribute("target"), "_blank")
        self.assertEqual(homebot_link.get_attribute("rel"), "noopener noreferrer")
        for removed_name in ("Minecrooft", "Cursor Barrier", "Raycast automation"):
            self.assertNotIn(removed_name, "\n".join(build_names))

        browser.close()

    def test_homepage_has_standalone_homebot_section_at_desktop_and_mobile(self) -> None:
        for viewport in ({"width": 1440, "height": 900}, {"width": 412, "height": 915}):
            with self.subTest(viewport=viewport):
                browser = self.playwright.chromium.launch()
                page = browser.new_page(viewport=viewport)
                page.goto(f"{self.base_url}/#homebot", wait_until="networkidle")

                homebot = page.get_by_role("region", name="A home for persistent AI teammates.")
                self.assertTrue(homebot.is_visible())
                self.assertEqual(homebot.get_attribute("id"), "homebot")
                self.assertTrue(homebot.get_by_text("M6 / Packaging, Hardening & v1 Parity Gate", exact=True).is_visible())
                self.assertTrue(homebot.get_by_text("There are no supported release packages yet.", exact=False).is_visible())
                source = homebot.get_by_role("link", name="View HomeBot on GitHub")
                self.assertEqual(source.get_attribute("href"), "https://github.com/luinbytes/HomeBot")
                self.assertEqual(source.get_attribute("target"), "_blank")
                self.assertEqual(source.get_attribute("rel"), "noopener noreferrer")
                self.assertLessEqual(page.evaluate("document.documentElement.scrollWidth"), viewport["width"])

                browser.close()

    def test_homepage_leads_with_hermes_android_at_desktop_and_mobile(self) -> None:
        for viewport in ({"width": 1440, "height": 900}, {"width": 412, "height": 915}):
            with self.subTest(viewport=viewport):
                browser = self.playwright.chromium.launch()
                page = browser.new_page(viewport=viewport)
                page.goto(self.base_url, wait_until="networkidle")

                self.assertTrue(
                    page.get_by_role("heading", level=1, name="I get annoyed, then I build the missing thing.").is_visible()
                )
                hero_link = page.get_by_role("link", name="Explore Hermes Android")
                self.assertEqual(hero_link.get_attribute("href"), "#hermes")
                hero_link.click()
                page.wait_for_url("**/#hermes")
                feature = page.get_by_role("region", name="The agent that grows with you, away from the desk.")
                self.assertTrue(feature.is_visible())
                self.assertEqual(
                    feature.get_by_role("link", name="Download latest").get_attribute("href"),
                    "https://github.com/luinbytes/hermes-android/releases/latest",
                )
                for image_name in (
                    "Hermes for Android — the agent that grows with you",
                    "Hermes Android backend onboarding",
                    "Hermes Android Command Center",
                    "Hermes Android Nous billing screen",
                ):
                    image = feature.get_by_role("img", name=image_name)
                    self.assertTrue(image.evaluate("element => element.complete && element.naturalWidth > 0"))
                self.assertEqual(
                    feature.get_by_role(
                        "img", name="Hermes for Android — the agent that grows with you"
                    ).get_attribute("loading"),
                    "lazy",
                )
                self.assertLessEqual(
                    page.evaluate("document.documentElement.scrollWidth"), viewport["width"]
                )
                page.screenshot(
                    path=SCREENSHOTS / f"hermes-home-{viewport['width']}.png",
                    full_page=True,
                )
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
