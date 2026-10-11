import json
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path.cwd() / "tests/browser"))
from browser_test import BrowserTestCase

artifacts = Path("review-previews/ui-stack")
shots = artifacts / "screenshots"
BrowserTestCase.setUpClass()
try:
    browser = BrowserTestCase.playwright.chromium.launch()
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BrowserTestCase.base_url + "/pip", wait_until="networkidle")
    demo = page.get_by_test_id("pip-browser-demo")
    demo.scroll_into_view_if_needed()
    page.wait_for_function("document.querySelector('[data-testid=pip-browser-demo]').dataset.renderer === 'three'")
    page.wait_for_function("document.querySelector('[data-testid=pip-browser-demo]').dataset.phase === 'postage'")
    page.wait_for_timeout(1500)
    demo.get_by_role("button", name="Pause browsing demo", exact=True).click()
    results = []
    for theme in ("dark", "light"):
        page.emulate_media(color_scheme=theme)
        for width in (320, 390, 1440):
            page.set_viewport_size({"width": width, "height": 900})
            demo.scroll_into_view_if_needed()
            page.wait_for_timeout(200)
            demo.screenshot(path=str(shots / f"pip-demo-{width}-{theme}.png"))
            result = page.evaluate("""() => {
                const root = document.querySelector('[data-testid=pip-browser-demo]');
                const stage = root.querySelector('[data-demo-stage]');
                const target = stage.querySelector('[data-demo-target]');
                const a = stage.querySelector('[data-demo-browser]').getBoundingClientRect(), b = target.getBoundingClientRect();
                return {width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth,
                    renderer: root.dataset.renderer, phase: root.dataset.phase,
                    playback: root.dataset.playback, canvasCount: root.querySelectorAll('canvas').length,
                    targetContained: b.left >= a.left && b.right <= a.right && b.top >= a.top && b.bottom <= a.bottom};
            }""")
            result["theme"] = theme
            results.append(result)
            assert not result["overflow"] and result["targetContained"], result
    page.set_viewport_size({"width": 1440, "height": 900})
    page.emulate_media(color_scheme="dark")
    demo.get_by_role("button", name="Play browsing demo", exact=True).click()
    canvas = demo.locator("canvas")
    canvas.evaluate("element => element.dispatchEvent(new Event('webglcontextlost', {cancelable:true}))")
    page.wait_for_function("document.querySelector('[data-testid=pip-browser-demo]').dataset.renderer === 'fallback'")
    assert demo.locator("canvas").count() == 0
    assert demo.get_attribute("data-playback") == "paused"
    context.close()
    video_context = browser.new_context(viewport={"width": 1000, "height": 740},
        color_scheme="dark", record_video_dir="/tmp/lu-pip-animation-video")
    video_page = video_context.new_page()
    video_page.goto(BrowserTestCase.base_url + "/pip", wait_until="networkidle")
    video_demo = video_page.get_by_test_id("pip-browser-demo")
    video_demo.scroll_into_view_if_needed()
    video_page.wait_for_function("document.querySelector('[data-testid=pip-browser-demo]').dataset.renderer === 'three'")
    geometry = video_demo.bounding_box()
    video_page.wait_for_timeout(19000)
    video_path = video_page.video.path()
    video_context.close()
    browser.close()
    assert not errors, errors
    report = {"layouts": results, "pageErrors": errors, "contextLoss": "PASS",
        "videoPath": str(video_path), "videoCrop": geometry}
    (artifacts / "checks/pip-demo-layout.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
finally:
    BrowserTestCase.tearDownClass()
