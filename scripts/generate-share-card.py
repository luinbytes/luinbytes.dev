"""Render the checked-in social PNG from the site's pond assets and built fonts.

Run `npm run build` first, then `python3 scripts/generate-share-card.py`.
Uses the project's existing requirements-test.txt / Playwright Chromium setup.
Rendering is offline; normal builds only copy the checked-in PNG into out/.
"""

import argparse
import base64
import hashlib
import json
import re
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
CARD = ROOT / "public/share-cards/luinbytes-dev-pond.png"
COPY = [
    "INDEPENDENT SOFTWARE / FIELD NOTES",
    "ROOT / 01",
    "luinbytes.dev",
    "I get annoyed, then I build the missing thing.",
    "ANDROID APPS · LINUX TOOLS · GAME SYSTEMS · AUTOMATION",
    "6c75",
    "LU / SOFTWARE ENGINEER",
    "BUILD / VERIFY / SHIP",
]


def data_url(path: Path, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def built_fonts() -> str:
    faces = []
    for css in sorted((ROOT / "out/_next/static").rglob("*.css")):
        for face in re.findall(r"@font-face\s*\{[^}]+\}", css.read_text()):
            if not re.search(r"font-family:(?:Space Grotesk|Space Mono);", face):
                continue
            face = re.sub(
                r"url\(([^)]+)\)",
                lambda match: f"url({data_url((css.parent / match[1].strip(chr(34) + chr(39))).resolve(), 'font/woff2')})",
                face,
            )
            faces.append(face)
    if not faces:
        raise RuntimeError("No built site fonts found. Run npm run build first.")
    return "\n".join(faces)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=CARD)
    args = parser.parse_args()
    html = (ROOT / "scripts/share-card.html").read_text().replace(
        "/* FONT_FACES */", built_fonts()
    )
    html = re.sub(
        r'src="(../public/[^\"]+)"',
        lambda match: f'src="{data_url((ROOT / "scripts" / match[1]).resolve(), "image/webp")}"',
        html,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=ROOT / "scripts") as directory:
        document = Path(directory) / "share-card.html"
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
                page.evaluate("Promise.all([...document.images].map(image => image.decode()))")
                for family in ("Space Grotesk", "Space Mono"):
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
                page.screenshot(path=str(args.output), type="png", animations="disabled")
            finally:
                browser.close()
    png = args.output.read_bytes()
    print(json.dumps({
        "output": str(args.output.resolve()),
        "dimensions": [1200, 630],
        "bytes": len(png),
        "sha256": hashlib.sha256(png).hexdigest(),
        "copy": copy,
        "text_boxes": boxes,
    }, indent=2))


if __name__ == "__main__":
    main()
