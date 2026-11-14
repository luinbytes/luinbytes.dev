#!/usr/bin/env python3
"""Journeys for verify-luinbytes-dev. Run via drive.sh, not directly.

Every journey: real user input (mouse/keyboard/role locators), a screenshot of the action
and of the resulting state, an ARIA snapshot, and assertions on what the visitor sees.
"""
import json
import os
import sys
import time
import traceback
from pathlib import Path

from playwright.sync_api import TimeoutError as PWTimeout, expect, sync_playwright

BASE = os.environ["BASE_URL"]
OUT = Path(os.environ["EVIDENCE_DIR"])


class Journey:
    def __init__(self, feature, browser, **ctx):
        self.feature, self.n, self.checks = feature, 0, []
        self.dir = OUT / feature
        self.dir.mkdir(parents=True, exist_ok=True)
        self.context = browser.new_context(**ctx)
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda e: self.errors.append(f"pageerror: {e}"))
        self.page.on("console", lambda m: self.errors.append(f"console.{m.type}: {m.text}")
                     if m.type == "error" else None)
        # Read-only observation hook the site itself ships (exposes data-* state; changes no behaviour).
        self.page.add_init_script("window.__POND_TEST_DIAGNOSTICS__ = true")

    def shot(self, name):
        self.n += 1
        path = self.dir / f"{self.n:02d}-{name}.png"
        self.page.screenshot(path=str(path))
        return path.name

    def aria(self, name):
        (self.dir / f"{name}.aria.txt").write_text(self.page.locator("body").aria_snapshot())

    def check(self, label, ok, detail=""):
        self.checks.append({"check": label, "ok": bool(ok), "detail": str(detail)})
        if not ok:
            raise AssertionError(f"{label}: {detail}")

    def finish(self, status, error=None):
        self.page.close()
        self.context.close()
        result = {"feature": self.feature, "status": status, "base_url": BASE,
                  "head_sha": os.environ.get("HEAD_SHA"), "checks": self.checks,
                  "console_errors_and_pageerrors": self.errors, "error": error}
        (self.dir / "result.json").write_text(json.dumps(result, indent=2))
        return result


def wait_for(page, expr, arg=None, timeout=30_000):
    end = time.monotonic() + timeout / 1000
    while time.monotonic() < end:
        v = page.evaluate(expr, arg)
        if v:
            return v
        time.sleep(0.1)
    raise PWTimeout(f"condition never true: {expr}")


def pond(page):
    return page.locator("[data-pond-state]")


def open_water(page):
    """Hover a grid of points until the pond reports a feedable (unobstructed water) spot."""
    vp = page.viewport_size
    for y in range(90, vp["height"] - 30, 55):
        for x in range(30, vp["width"] - 30, 55):
            page.mouse.move(x, y)
            if pond(page).get_attribute("data-food-affordance") == "true":
                return x, y
    raise AssertionError("no feedable water point found in the viewport")


def load_home(j, query="?pond-seed=verify-skill"):
    j.page.goto(f"{BASE}/{query}", wait_until="networkidle")
    wait_for(j.page, "document.querySelector('[data-pond-state]')?.dataset.fishPositions")


# ---------------------------------------------------------------- journeys

def landing_nav(j):
    p = j.page
    load_home(j)
    expect(p.get_by_role("heading", level=1)).to_have_text("Hi, I’m Lu.")
    expect(p.get_by_role("heading", name="I make stubborn software behave.")).to_be_visible()
    j.check("hero h1 + statement visible", True)
    nav = p.get_by_role("navigation", name="Portfolio navigation")
    j.check("nav has Work/More/Contact",
            [a.inner_text() for a in nav.get_by_role("link").all()] == ["Work", "More", "Contact"])
    j.shot("hero-initial")
    j.aria("landing-initial")
    for name, anchor, heading in [("Work", "#work", "A few useful obsessions."),
                                  ("More", "#about", "“Mostly works” is still broken."),
                                  ("Contact", "#contact", "Got a useful problem?")]:
        nav.get_by_role("link", name=name, exact=True).click()
        p.wait_for_function("h => location.hash === h", arg=anchor)
        expect(nav.get_by_role("link", name=name, exact=True)).to_have_attribute("aria-current", "location")
        j.check(f"nav {name} -> {anchor} and aria-current set", True)
        j.shot(f"after-click-{name.lower()}")
    # Work section: every project card shows a heading and a View-project link.
    p.get_by_role("link", name="Things I’ve made", exact=True).click()
    cards = p.locator("#work article")
    j.check("4 project cards", cards.count() == 4, cards.count())
    for project in ["HomeBot", "Rakazo", "linux-sonar", "ConnectorMap"]:
        expect(cards.get_by_role("heading", name=project, exact=True)).to_be_visible()
        expect(cards.get_by_role("link", name=f"View project {project}", exact=True)).to_have_attribute("href", __import__("re").compile(r"^https://"))
    j.check("each project card has heading + external View project link", True)
    j.shot("work-cards")
    j.aria("landing-work")


def pond_feeding(j):
    p = j.page
    load_home(j)
    el = pond(p)
    before = int(el.get_attribute("data-food-dropped-count"))
    j.check("pond running", el.get_attribute("data-pond-state") == "running", el.get_attribute("data-pond-state"))
    x, y = open_water(p)
    j.shot("before-click-pond")
    p.mouse.click(x, y)
    wait_for(p, "b => Number(document.querySelector('[data-pond-state]').dataset.foodDroppedCount) > b", before, 15_000)
    j.shot("food-dropped")
    after = int(el.get_attribute("data-food-dropped-count"))
    j.check("click on water dropped exactly one pellet group", after == before + 1, f"{before}->{after}")
    j.check("food entity visible in model", int(el.get_attribute("data-food-count")) > 0)
    j.check("drop landed where requested", el.get_attribute("data-food-last-drop") == el.get_attribute("data-food-requested-at"))
    wait_for(p, "document.querySelector('[data-pond-state]').dataset.foodReservations", None, 20_000)
    j.shot("fish-reserved-food")
    wait_for(p, "Number(document.querySelector('[data-pond-state]').dataset.fishFedCount) > 0", None, 40_000)
    j.shot("fish-fed")
    j.check("a fish reached and ate the food", int(el.get_attribute("data-fish-fed-count")) > 0)
    j.check("no fish left the water", el.get_attribute("data-fish-water-violation") == "false")
    j.check("food cap respected (<=8)", int(el.get_attribute("data-food-max-count")) <= 8)
    (j.dir / "pond-state.json").write_text(json.dumps(
        {k.replace("data-", ""): v for k, v in p.evaluate(
            "() => Object.fromEntries(Object.entries(document.querySelector('[data-pond-state]').dataset).map(([k,v])=>['data-'+k,v]))").items()
         if "positions" not in k}, indent=2))


def pond_view(j):
    p = j.page
    load_home(j)
    group = p.get_by_role("group", name="Pond view")
    ascii_, pixel = group.get_by_role("radio", name="ASCII"), group.get_by_role("radio", name="Pixel")
    expect(ascii_).to_be_checked()
    expect(p.locator("[data-view]")).to_have_attribute("data-view", "ascii")
    j.shot("ascii-default")
    pixel.check()
    expect(p.locator("[data-view]")).to_have_attribute("data-view", "pixel")
    expect(pond(p)).to_have_attribute("data-pond-state", "running")
    j.check("Pixel selected -> data-view=pixel and pond running", True)
    wait_for(p, "document.querySelector('[data-pond-state]')?.dataset.fishPositions")
    j.shot("pixel-selected")
    ascii_.check()
    expect(p.locator("[data-view]")).to_have_attribute("data-view", "ascii")
    expect(pond(p)).to_have_attribute("data-pond-state", "running")
    j.check("switching back to ASCII restores ascii view", True)
    j.shot("ascii-restored")
    j.aria("pond-view")


def contact_email(j):
    p = j.page
    j.context.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
    load_home(j)
    contact = p.locator("#contact")
    mail_link = contact.locator("a[href^='mailto:']").first
    email = mail_link.get_attribute("href").removeprefix("mailto:")
    j.check("contact shows a mailto link with an address", "@" in email, email)
    contact.scroll_into_view_if_needed()
    j.shot("contact-before-copy")
    btn = contact.get_by_role("button", name="Copy email address")
    expect(btn).to_have_text("Copy")
    btn.click()
    expect(btn).to_have_text("Copied")
    expect(contact.get_by_role("status")).to_have_text("Email address copied.")
    clip = p.evaluate("navigator.clipboard.readText()")
    j.check("clipboard now holds the address", clip == email, clip)
    j.shot("contact-after-copy")
    expect(btn).to_have_text("Copy", timeout=6_000)
    j.check("button reverts to Copy after ~2.4s", True)
    cta = contact.get_by_role("link", name="Book a call")
    j.check("Book a call links to an https calendar page", (cta.get_attribute("href") or "").startswith("https://"), cta.get_attribute("href"))
    j.aria("contact")


def privacy_404(j):
    p = j.page
    load_home(j)
    p.get_by_role("link", name="Privacy", exact=True).click()   # footer link
    p.wait_for_url(f"{BASE}/privacy")
    expect(p.get_by_role("heading", level=1)).to_have_text("Privacy Policy")
    j.check("footer Privacy link -> /privacy with policy h1", True)
    j.shot("privacy-page")
    j.aria("privacy")
    p.get_by_role("link", name="Back to luinbytes.dev").click()
    p.wait_for_url(f"{BASE}/")
    j.check("Back link returns to /", True)
    resp = p.goto(f"{BASE}/pip", wait_until="networkidle")   # retired route, must be 404
    j.check("retired route /pip returns HTTP 404", resp.status == 404, resp.status)
    expect(p.get_by_role("heading", name="Nothing surfaced here.")).to_be_visible()
    j.shot("not-found-page")
    j.errors = [e for e in j.errors if "status of 404" not in e]   # the 404 navigation above is deliberate
    p.get_by_role("link", name="Return to the pond").click()
    p.wait_for_url(f"{BASE}/")
    expect(p.get_by_role("heading", level=1)).to_have_text("Hi, I’m Lu.")
    j.check("Return to the pond -> home", True)
    j.shot("back-home")
    j.aria("not-found")


JOURNEYS = {"landing-nav": landing_nav, "pond-feeding": pond_feeding, "pond-view": pond_view,
            "contact-email": contact_email, "privacy-404": privacy_404}
VIEWPORT = {"width": 1440, "height": 900}


def main():
    ids = list(JOURNEYS) if sys.argv[1] == "all" else [sys.argv[1]]
    unknown = [i for i in ids if i not in JOURNEYS]
    if unknown:
        sys.exit(f"unknown feature {unknown}; choose from {list(JOURNEYS)} or all")
    results = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for fid in ids:
            j = Journey(fid, browser, viewport=VIEWPORT)
            try:
                JOURNEYS[fid](j)
                results.append(j.finish("PASS"))
            except Exception as e:  # noqa: BLE001 - report every failure with its reason
                try:
                    j.shot("FAILURE")
                except Exception:
                    pass
                results.append(j.finish("FAIL", f"{type(e).__name__}: {e}"))
                (j.dir / "traceback.txt").write_text(traceback.format_exc())
        browser.close()
    clean = lambda r: r["status"] == "PASS" and not r["console_errors_and_pageerrors"]
    for r in results:
        print(f"{r['status']}  {r['feature']}  checks={len(r['checks'])}  errors={len(r['console_errors_and_pageerrors'])}"
              + (f"  {r['error']}" if r["error"] else ""))
    (OUT / "summary.json").write_text(json.dumps(results, indent=2))
    sys.exit(0 if all(clean(r) for r in results) else 1)


main()
