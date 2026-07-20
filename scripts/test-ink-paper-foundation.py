"""Production-export browser checks for the ink-and-paper portfolio."""

from contextlib import contextmanager
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from typing import Any, Mapping
from urllib.parse import unquote, urlsplit

from playwright.sync_api import Browser, BrowserContext, Page, ViewportSize, expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "out"
ARTIFACT_DIR = ROOT / "artifacts" / "ink-paper-portfolio"
RETAINED_ROUTES = (
    "/",
    "/meteor",
    "/meteor/privacy",
    "/sleepr",
    "/risk-of-anticheat",
    "/brc-trainer",
    "/dagger-fall",
    "/super-hacker-golf",
    "/linux-sonar",
)
DELETED_ROUTES = ("/file-deduplicator", "/lumi", "/perkaholic")


class ExportHandler(SimpleHTTPRequestHandler):
    """Route any clean URL to the matching Next static-export file."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(OUT_DIR), **kwargs)

    def translate_path(self, path: str) -> str:
        route = unquote(urlsplit(path).path).lstrip("/")
        direct = OUT_DIR / route
        candidates = (
            OUT_DIR / "index.html",
        ) if not route else (
            direct,
            direct.with_suffix(".html"),
            direct / "index.html",
        )
        for candidate in candidates:
            if candidate.is_file():
                return str(candidate)
        return str(direct)

    def log_message(self, format: str, *_args) -> None:
        pass


@contextmanager
def export_server():
    if not (OUT_DIR / "index.html").exists():
        raise AssertionError("Production export missing. Run npm run build first.")
    server = ThreadingHTTPServer(("127.0.0.1", 0), ExportHandler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        thread.join()
        server.server_close()


def collect_browser_errors(context: BrowserContext) -> tuple[list[str], list[str]]:
    console_errors: list[str] = []
    page_errors: list[str] = []

    def attach(page: Page) -> None:
        page.on(
            "console",
            lambda message: console_errors.append(f"{page.url}: {message.text}")
            if message.type == "error"
            else None,
        )
        page.on("pageerror", lambda error: page_errors.append(f"{page.url}: {error}"))

    context.on("page", attach)
    for page in context.pages:
        attach(page)
    return console_errors, page_errors


def visible_content_state(page: Page) -> dict:
    return page.evaluate(
        """() => {
            const visible = (element) => {
                if (!element) return false;
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                return rect.width > 0 && rect.height > 0 &&
                    style.visibility !== 'hidden' && style.opacity !== '0';
            };
            const primary = [...document.querySelectorAll(
                'main a[href]:not([href^="#main"]), main button, main [class*="primaryAction"]'
            )].find(visible);
            const bodyCopy = [...document.querySelectorAll('main p')]
                .find((element) => element.textContent.trim().length > 20);
            return {
                overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                heading: visible(document.querySelector('main h1')) || visible(document.querySelector('#overview h1')),
                bodyCopy: visible(bodyCopy),
                primary: visible(primary),
                reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
                theme: document.documentElement.dataset.theme,
                storedTheme: localStorage.getItem('lu-theme'),
            };
        }"""
    )


def assert_page_is_usable(page: Page, route: str) -> None:
    state = visible_content_state(page)
    assert state == {
        "overflow": 0,
        "heading": True,
        "bodyCopy": True,
        "primary": True,
        "reducedMotion": True,
        "theme": "ink-paper",
        "storedTheme": None,
    }, (route, state)
    assert page.locator("[data-site-footer]").count() == 1, route
    assert page.locator("header").count() >= 1, route


def assert_focus_visible(page: Page) -> None:
    page.locator("body").press("Home")
    page.wait_for_timeout(100)
    page.keyboard.press("Tab")
    page.wait_for_timeout(100)
    # Check that something is focused and has a visible focus indicator
    active = page.evaluate("""() => {
        const el = document.activeElement;
        if (!el || el === document.body) return {tag: null};
        const s = getComputedStyle(el);
        return {
            tag: el.tagName,
            outlineStyle: s.outlineStyle,
            outlineWidth: s.outlineWidth,
        };
    }""")
    assert active["tag"] is not None, f"No element received focus: {active}"
    assert active["outlineStyle"] != "none" and active["outlineWidth"] != "0px", active


def screenshot_name(route: str, viewport: str) -> str:
    slug = "home" if route == "/" else route.strip("/").replace("/", "-")
    return f"{slug}-{viewport}.png"


def assert_case_navigation(page: Page, route: str) -> None:
    rail = page.get_by_role("navigation", name="Page sections")
    expect(rail).to_be_visible()
    assert rail.evaluate("el => getComputedStyle(el).position") == "fixed", route
    target = rail.locator("a").nth(1)
    href = target.get_attribute("href")
    assert href and href.startswith("#"), (route, href)
    target.click()
    page.wait_for_function("hash => location.hash === hash", arg=href)
    expect(page.locator(href)).to_be_in_viewport()


def boxes_overlap(
    first: Mapping[str, Any], second: Mapping[str, Any]
) -> bool:
    first_x = float(first["x"] if "x" in first else first["left"])
    first_y = float(first["y"] if "y" in first else first["top"])
    first_width = float(first["width"] if "width" in first else first["right"] - first_x)
    first_height = float(first["height"] if "height" in first else first["bottom"] - first_y)
    second_x = float(second["x"] if "x" in second else second["left"])
    second_y = float(second["y"] if "y" in second else second["top"])
    second_width = float(second["width"] if "width" in second else second["right"] - second_x)
    second_height = float(second["height"] if "height" in second else second["bottom"] - second_y)
    return not (
        first_x + first_width <= second_x
        or second_x + second_width <= first_x
        or first_y + first_height <= second_y
        or second_y + second_height <= first_y
    )


def assert_desktop_product_menu(browser: Browser, base_url: str) -> None:
    context = browser.new_context(
        viewport={"width": 1280, "height": 900},
        reduced_motion="no-preference",
    )
    page = context.new_page()
    page.goto(base_url, wait_until="networkidle")
    header = page.locator("header").first
    assert header.evaluate("el => getComputedStyle(el).position") == "fixed"
    header_box = header.bounding_box()
    assert header_box, "Header has no visible bounds"
    assert 0 <= header_box["y"] <= 2, header_box
    assert header_box["height"] <= 84, header_box

    products_opener = page.get_by_role("button", name="/products", exact=True)
    nav_controls = header.locator("nav > a, nav > button")
    products_opener.click()
    products_menu = page.locator("#products-menu")
    expect(products_menu).to_be_visible()
    page.wait_for_timeout(250)

    menu_box = products_menu.bounding_box()
    opener_box = products_opener.bounding_box()
    viewport = page.viewport_size
    assert menu_box and opener_box and viewport
    assert abs(menu_box["x"] - opener_box["x"]) <= 2, (opener_box, menu_box)
    assert menu_box["y"] >= opener_box["y"] + opener_box["height"], (opener_box, menu_box)
    assert menu_box["y"] >= 0 and menu_box["y"] + menu_box["height"] <= viewport["height"], menu_box
    assert menu_box["x"] >= 0 and menu_box["x"] + menu_box["width"] <= viewport["width"], menu_box
    for index in range(nav_controls.count()):
        control = nav_controls.nth(index)
        control_box = control.bounding_box()
        assert control_box and not boxes_overlap(menu_box, control_box), (
            control.inner_text(), menu_box, control_box
        )

    motion = products_menu.evaluate("""el => {
        const style = getComputedStyle(el);
        return {
            duration: style.transitionDuration,
            property: style.transitionProperty,
            origin: style.transformOrigin,
        };
    }""")
    assert motion["duration"] not in {"0s", "0.01ms", "1e-05s"}, motion
    assert "opacity" in motion["property"] and "transform" in motion["property"], motion
    assert "all" not in motion["property"], motion
    assert motion["origin"].split()[:2] == ["0px", "0px"], motion

    page.screenshot(path=str(ARTIFACT_DIR / "home-desktop-1280-products-open.png"))
    page.keyboard.press("Escape")
    expect(products_opener).to_have_attribute("aria-expanded", "false")
    assert products_menu.count() == 1, "Closing menu must remain mounted for its exit"
    closing_opacity = float(
        products_menu.evaluate("el => getComputedStyle(el).opacity")
    )
    assert closing_opacity > 0, "Exit animation must begin from the visible state"
    expect(products_menu).to_be_hidden(timeout=1000)
    expect(products_opener).to_be_focused()
    page.screenshot(path=str(ARTIFACT_DIR / "home-desktop-1280-products-closed.png"))
    context.close()


def assert_reduced_motion_product_menu(browser: Browser, base_url: str) -> None:
    context = browser.new_context(
        viewport={"width": 1280, "height": 900},
        reduced_motion="reduce",
    )
    page = context.new_page()
    page.goto(base_url, wait_until="networkidle")
    products_opener = page.get_by_role("button", name="/products", exact=True)
    products_opener.click()
    products_menu = page.locator("#products-menu")
    expect(products_menu).to_be_visible()
    motion = products_menu.evaluate("""el => ({
        duration: getComputedStyle(el).transitionDuration,
        transform: getComputedStyle(el).transform,
    })""")
    assert motion["duration"] in {"0s", "0.01ms", "1e-05s"}, motion
    assert motion["transform"] in {"none", "matrix(1, 0, 0, 1, 0, 0)"}, motion
    page.keyboard.press("Escape")
    expect(products_menu).to_be_hidden()
    expect(products_opener).to_be_focused()
    context.close()


def assert_hero_viewport_matrix(browser: Browser, base_url: str) -> None:
    viewports: tuple[tuple[int, int], ...] = (
        (3440, 1440),
        (2560, 1440),
        (1920, 1080),
        (1440, 900),
        (1280, 800),
        (1024, 768),
        (390, 844),
    )
    for width, height in viewports:
        context = browser.new_context(
            viewport={"width": width, "height": height},
            reduced_motion="reduce",
        )
        page = context.new_page()
        page.goto(base_url, wait_until="networkidle")

        for element in (
            page.locator("#home [class*=registrationFrame]"),
            page.locator("#home h1"),
            page.locator("#home [class*=intro]"),
            page.get_by_role("link", name="Inspect builds"),
            page.get_by_role("button", name="Surprise me"),
            page.locator("#home [class*=heroSignalPlate]"),
            page.get_by_role("list", name="Proof loop"),
        ):
            expect(element).to_be_visible()

        bounds = page.evaluate(
            """() => {
            const box = (selector) => {
                const rect = document.querySelector(selector).getBoundingClientRect();
                return {top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right};
            };
            const byText = (selector, text) => [...document.querySelectorAll(selector)]
                .find((element) => element.textContent.trim().includes(text));
            const actionBox = (selector, text) => {
                const rect = byText(selector, text).getBoundingClientRect();
                return {top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right};
            };
            return {
                viewport: {width: innerWidth, height: innerHeight},
                header: box('header'),
                hero: box('#home'),
                frame: box('#home [class*=registrationFrame]'),
                copy: box('#home [class*=heroCopy]'),
                heading: box('#home h1'),
                intro: box('#home [class*=intro]'),
                primary: actionBox('#home a', 'Inspect builds'),
                secondary: actionBox('#home button', 'Surprise me'),
                signal: box('#home [class*=heroSignalPlate]'),
                proof: box('#home [class*=proofStrip]'),
            };
            }"""
        )
        print(f"Hero bounds at {width}x{height}:", bounds)

        header_bottom = bounds["header"]["bottom"]
        assert bounds["frame"]["top"] >= header_bottom, bounds
        assert bounds["heading"]["bottom"] <= bounds["intro"]["top"], bounds
        assert bounds["intro"]["bottom"] <= bounds["primary"]["top"], bounds
        assert not boxes_overlap(bounds["primary"], bounds["secondary"]), bounds
        assert bounds["proof"]["top"] >= bounds["frame"]["bottom"], bounds
        assert page.evaluate(
            "() => document.documentElement.scrollWidth === document.documentElement.clientWidth"
        ), bounds

        if width > 900:
            for name in ("heading", "intro", "primary", "secondary"):
                box = bounds[name]
                assert box["top"] >= bounds["copy"]["top"], (name, bounds)
                assert box["bottom"] <= bounds["copy"]["bottom"], (name, bounds)
            for edge in ("top", "left"):
                assert bounds["signal"][edge] >= bounds["frame"][edge], bounds
            for edge in ("bottom", "right"):
                assert bounds["signal"][edge] <= bounds["frame"][edge], bounds
            assert bounds["hero"]["bottom"] <= bounds["viewport"]["height"], bounds

        page.screenshot(
            path=str(ARTIFACT_DIR / f"home-{width}x{height}-first-fold.png")
        )
        context.close()


def assert_home_behavior(page: Page) -> None:
    assert page.locator("ol[data-build-list]").count() == 1
    for selector in (
        "#home [class*=heroSignalPlate]",
        "#builds [class*=worldAtlas]",
        "#about [class*=originJourney]",
    ):
        expect(page.locator(selector)).to_be_visible()
    assert not page.evaluate(
        "() => /\\bLB\\b/.test(document.querySelector('main')?.textContent || '')"
    ), "Homepage must use LU or 6c75 branding, never LB"
    body_font_vars = page.evaluate("""() => ({
        pixelifyVar: getComputedStyle(document.body).getPropertyValue('--font-pixelify').trim(),
        displayVar: getComputedStyle(document.body).getPropertyValue('--font-display').trim(),
        bodyWidth: document.body.scrollWidth,
        htmlWidth: document.documentElement.scrollWidth,
    })""")
    print("Font vars:", body_font_vars)
    print("HTML-visible-footnote:", page.locator("[data-site-footer] span").first.evaluate("el => getComputedStyle(el).fontFamily"))
    h1_font = page.locator("#home h1").evaluate(
        "el => getComputedStyle(el).fontFamily"
    )
    assert "Pixelify" in h1_font, f"h1 fontFamily: {h1_font}"
    fonts = page.evaluate(
        """() => ({
            body: getComputedStyle(document.body).fontFamily,
            utility: getComputedStyle(document.querySelector('[data-site-footer] span')).fontFamily,
        })"""
    )
    assert "Space Grotesk" in fonts.get("body", ""), fonts
    assert "Space Mono" in fonts.get("utility", ""), fonts
    registration_motion = page.locator("#home").evaluate(
        "el => getComputedStyle(el.querySelector('[class*=posterMark]'), '::before').animationName"
    )
    assert registration_motion == "none", registration_motion

    selected_case = page.locator("#builds article")
    initial_build = selected_case.locator("h3").inner_text()
    page.get_by_role("button", name="Surprise me").click()
    page.wait_for_function(
        "initial => document.querySelector('#builds article h3')?.textContent?.trim() !== initial",
        arg=initial_build,
    )
    expect(selected_case).to_be_in_viewport()
    expect(selected_case).to_be_focused()
    expect(page.locator("ol[data-build-list] button[aria-pressed=true]")).to_have_count(1)

    inspect = page.get_by_role("link", name="Inspect builds")
    inspect.click()
    page.wait_for_function("() => location.hash === '#builds'")
    expect(page.locator("#builds h2")).to_be_in_viewport()
    page.locator("ol[data-build-list] button").first.click()
    page.get_by_role("link", name="Open case").click()
    page.wait_for_url("**/linux-sonar")
    expect(page.locator("#overview h1")).to_be_visible()
    page.go_back(wait_until="networkidle")
    page.wait_for_url("**/#builds")


def main() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    with export_server() as base_url, sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        all_console_errors: list[str] = []
        all_page_errors: list[str] = []

        viewports: tuple[tuple[str, ViewportSize], ...] = (
            ("desktop-1280", {"width": 1280, "height": 900}),
            ("desktop-1440", {"width": 1440, "height": 900}),
            ("mobile-390", {"width": 390, "height": 844}),
        )
        for viewport_name, viewport in viewports:
            context = browser.new_context(
                viewport=viewport,
                reduced_motion="reduce",
                storage_state={
                    "cookies": [],
                    "origins": [
                        {
                            "origin": base_url,
                            "localStorage": [{"name": "lu-theme", "value": "void"}],
                        }
                    ],
                },
            )
            console_errors, page_errors = collect_browser_errors(context)
            page = context.new_page()

            for route in RETAINED_ROUTES:
                response = page.goto(f"{base_url}{route}", wait_until="networkidle")
                assert response and response.status == 200, (route, response.status if response else None)
                assert_page_is_usable(page, f"{route} at {viewport_name}")
                page.screenshot(
                    path=str(ARTIFACT_DIR / screenshot_name(route, viewport_name)),
                    full_page=True,
                )
                if route == "/":
                    if viewport_name == "mobile-390":
                        page.screenshot(
                            path=str(
                                ARTIFACT_DIR / "home-mobile-390x844-first-fold.png"
                            )
                        )
                    assert_home_behavior(page)
                    assert_focus_visible(page)
                elif viewport_name == "desktop-1280":
                    assert_case_navigation(page, route)

            if viewport_name == "mobile-390":
                page.goto(f"{base_url}/meteor", wait_until="networkidle")
                inspect = page.get_by_role("button", name="Inspect", exact=True)
                inspect.click()
                panel = page.locator("[data-mobile-case-nav]")
                expect(panel).to_be_visible()
                target = panel.locator("button").nth(1)
                target.click()
                expect(page.locator("#habits")).to_be_in_viewport()

            all_console_errors.extend(console_errors)
            all_page_errors.extend(page_errors)
            context.close()

        assert_hero_viewport_matrix(browser, base_url)
        assert_desktop_product_menu(browser, base_url)
        assert_reduced_motion_product_menu(browser, base_url)

        # Keep expected document-404 noise out of retained-route console assertions.
        deleted_context = browser.new_context()
        deleted_page = deleted_context.new_page()
        for route in DELETED_ROUTES:
            response = deleted_page.goto(
                f"{base_url}{route}", wait_until="domcontentloaded"
            )
            assert response is not None, route
            assert response.status == 404, (route, response.status)
        deleted_context.close()
        browser.close()

    assert not all_console_errors, all_console_errors
    assert not all_page_errors, all_page_errors
    print(
        f"ink-paper portfolio checks passed: {len(RETAINED_ROUTES)} routes at 1280px, 1440px, and 390px; "
        f"screenshots in {ARTIFACT_DIR}"
    )


if __name__ == "__main__":
    main()
