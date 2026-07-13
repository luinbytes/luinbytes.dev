"""Production-browser regression checks for the shared ink-and-paper foundation."""

from pathlib import Path
from playwright.sync_api import Page, expect, sync_playwright

BASE_URL = "http://127.0.0.1:4173"
ARTIFACT_DIR = Path("artifacts/ink-paper-foundation")
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


def assert_page_is_usable(page: Page, route: str) -> None:
    state = page.evaluate(
        """() => ({
            theme: document.documentElement.dataset.theme,
            storedTheme: localStorage.getItem('lu-theme'),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            headingVisible: (() => {
                const heading = document.querySelector('h1');
                if (!heading) return false;
                const rect = heading.getBoundingClientRect();
                const style = getComputedStyle(heading);
                return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.opacity !== '0';
            })(),
            bodyBackground: getComputedStyle(document.body).backgroundColor,
            bodyColor: getComputedStyle(document.body).color,
        })"""
    )
    assert state["theme"] == "ink-paper", (route, state)
    assert state["storedTheme"] is None, (route, state)
    assert state["overflow"] == 0, (route, state)
    assert state["headingVisible"], (route, state)
    assert state["bodyBackground"] == "rgb(31, 30, 26)", (route, state)
    assert state["bodyColor"] == "rgb(245, 221, 160)", (route, state)
    assert page.get_by_role("button", name="theme", exact=False).count() == 0, route
    assert page.locator("[data-site-footer]").count() == 1, route


def main() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 1000},
            reduced_motion="reduce",
        )
        context.add_init_script("localStorage.setItem('lu-theme', 'void')")
        page = context.new_page()
        console_errors: list[str] = []
        page.on(
            "console",
            lambda message: console_errors.append(message.text)
            if message.type == "error"
            else None,
        )
        page.goto(BASE_URL, wait_until="networkidle")
        assert_page_is_usable(page, "/")

        fonts = page.evaluate(
            """() => ({
                body: getComputedStyle(document.body).fontFamily,
                display: getComputedStyle(document.querySelector('h1')).fontFamily,
                utility: getComputedStyle(document.querySelector('[data-site-footer] span')).fontFamily,
            })"""
        )
        assert "Space Grotesk" in fonts["body"], fonts
        assert "Pixelify Sans" in fonts["display"], fonts
        assert "Space Mono" in fonts["utility"], fonts
        page.screenshot(path=str(ARTIFACT_DIR / "home-desktop.png"), full_page=True)

        page.keyboard.press("Tab")
        skip_link = page.get_by_role("link", name="Skip to content")
        assert skip_link.evaluate("el => document.activeElement === el")
        focus_style = skip_link.evaluate(
            "el => ({style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth})"
        )
        assert focus_style["style"] != "none" and focus_style["width"] != "0px", focus_style

        command_opener = (
            page.locator("header")
            .get_by_role("navigation")
            .get_by_role("button", name="Ctrl K", exact=True)
        )
        command_opener.click()
        dialog = page.get_by_role("dialog", name="Command menu")
        dialog.wait_for(state="visible")
        command_surface = dialog.locator("[cmdk-root]")
        print_effects = command_surface.evaluate(
            """el => {
                const dither = getComputedStyle(el, '::before');
                const registration = getComputedStyle(el, '::after');
                return {
                    ditherImage: dither.backgroundImage,
                    ditherOpacity: Number(dither.opacity),
                    registrationImage: registration.backgroundImage,
                    registrationWidth: registration.width,
                    registrationHeight: registration.height,
                };
            }"""
        )
        assert print_effects["ditherImage"] != "none", print_effects
        assert 0 < print_effects["ditherOpacity"] <= 1, print_effects
        assert print_effects["registrationImage"] != "none", print_effects
        assert print_effects["registrationWidth"] != "auto", print_effects
        assert print_effects["registrationHeight"] != "auto", print_effects
        page.screenshot(path=str(ARTIFACT_DIR / "command-menu-effects.png"))
        page.keyboard.press("Escape")
        dialog.wait_for(state="hidden")
        expect(command_opener).to_be_focused()

        products_opener = page.get_by_role("button", name="/products", exact=True)
        products_opener.click()
        products_menu = page.locator("#products-menu")
        products_menu.wait_for(state="visible")
        page.keyboard.press("Escape")
        products_menu.wait_for(state="hidden")
        expect(products_opener).to_be_focused()

        motion = page.get_by_role("button", name="Surprise me").evaluate(
            "el => getComputedStyle(el).transitionDuration"
        )
        assert motion in {"0.01ms", "1e-05s"}, motion

        for route in RETAINED_ROUTES[1:]:
            page.goto(f"{BASE_URL}{route}", wait_until="networkidle")
            assert_page_is_usable(page, route)

        unexpected_console_errors = [
            error
            for error in console_errors
            if not ("A tree hydrated" in error and "caret-color" in error)
        ]
        assert not unexpected_console_errors, unexpected_console_errors

        mobile_context = browser.new_context(
            viewport={"width": 390, "height": 844},
            reduced_motion="reduce",
        )
        mobile_context.add_init_script("localStorage.setItem('lu-theme', 'void')")
        mobile_page = mobile_context.new_page()
        mobile_page.goto(BASE_URL, wait_until="networkidle")
        assert_page_is_usable(mobile_page, "/ (390px)")
        assert mobile_page.get_by_role("link", name="Inspect builds").is_visible()
        mobile_page.screenshot(
            path=str(ARTIFACT_DIR / "home-mobile-390.png"), full_page=True
        )
        mobile_context.close()
        browser.close()

    print(
        "ink-paper foundation checks passed; screenshots: "
        f"{ARTIFACT_DIR / 'home-desktop.png'}, "
        f"{ARTIFACT_DIR / 'command-menu-effects.png'}, "
        f"{ARTIFACT_DIR / 'home-mobile-390.png'}"
    )


if __name__ == "__main__":
    main()
