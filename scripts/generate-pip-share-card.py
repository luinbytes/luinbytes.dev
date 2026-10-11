"""Render the checked-in Pip social PNG from the installed local fonts.

Run `npm ci` first, then `python3 scripts/generate-pip-share-card.py`.
Rendering is offline; normal builds only copy the checked-in PNG into out/.
"""

import base64
import hashlib
import json
import re
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright
from share_card_fonts import local_fonts


ROOT = Path(__file__).resolve().parents[1]
CARD = ROOT / "public/share-cards/luinbytes-dev-pip.png"
COPY = [
    "PIP / TELEGRAM AGENT",
    "A LITTLE SOMETHING BY LU",
    "pip.",
    "YOUR TELEGRAM MATE",
    "A little help, one message away.",
    "SEARCH",
    "REMINDERS",
    "EVERYDAY LIFE",
    "WARM / SHORT / EASYGOING",
]
FONT_FAMILIES = ("Pixelify Sans", "Space Grotesk", "Space Mono")


def data_url(path: Path, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"



def main() -> None:
    html = (ROOT / "scripts/pip-share-card.html").read_text().replace(
        "/* FONT_FACES */", local_fonts(include_pixelify=True)
    )
    CARD.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=ROOT / "scripts") as directory:
        document = Path(directory) / "pip-share-card.html"
        document.write_text(html)
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            try:
                page = browser.new_page(
                    viewport={"width": 1200, "height": 630},
                    device_scale_factor=1,
                    reduced_motion="reduce",
                )
                page.route(re.compile(r"^https?://"), lambda route: route.abort())
                page.goto(document.as_uri(), wait_until="load")
                page.evaluate("document.fonts.ready")
                for family in FONT_FAMILIES:
                    loaded = page.evaluate(
                        "family => [...document.fonts].some(font => font.family === family && font.status === 'loaded')",
                        family,
                    )
                    if not loaded:
                        raise RuntimeError(f"Required font did not load: {family}")
                copy = page.locator("[data-copy]").evaluate_all(
                    "nodes => nodes.map(node => node.textContent.replace(/\\s+/g, ' ').trim())"
                )
                if copy != COPY:
                    raise RuntimeError(f"Share-card copy changed: {copy!r}")
                boxes = page.locator("[data-copy]").evaluate_all(
                    "nodes => nodes.map(node => ({text: node.textContent.trim(), ...node.getBoundingClientRect().toJSON()}))"
                )
                for box in boxes:
                    if not (32 <= box["left"] < box["right"] <= 1168 and 32 <= box["top"] < box["bottom"] <= 598):
                        raise RuntimeError(f"Text exceeds the 32px crop-safe inset: {box}")
                page.screenshot(path=str(CARD), type="png", animations="disabled")
            finally:
                browser.close()
    png = CARD.read_bytes()
    print(json.dumps({
        "output": str(CARD.resolve()),
        "dimensions": [1200, 630],
        "bytes": len(png),
        "sha256": hashlib.sha256(png).hexdigest(),
        "copy": copy,
        "text_boxes": boxes,
    }, indent=2))


if __name__ == "__main__":
    main()
