import json, sys
from pathlib import Path
sys.path.insert(0, str(Path.cwd() / "tests/browser"))
import browser_test as bt
bt.SERVER_LOG=Path("/tmp/lu-pip-phases-server.log")
bt.BrowserTestCase.setUpClass()
try:
    browser=bt.BrowserTestCase.playwright.chromium.launch()
    page=browser.new_page(viewport={"width":1440,"height":900})
    page.goto(bt.BrowserTestCase.base_url+"/pip",wait_until="networkidle")
    demo=page.get_by_test_id("pip-browser-demo")
    demo.scroll_into_view_if_needed()
    page.wait_for_function("document.querySelector('[data-testid=pip-browser-demo]').dataset.renderer === 'three'")
    results=[]
    for phase in ("search","product","addcart","postage","review"):
        page.wait_for_function("phase => document.querySelector('[data-testid=pip-browser-demo]').dataset.phase === phase",arg=phase,timeout=25000)
        demo.get_by_role("button",name="Pause browsing demo",exact=True).click()
        for theme in ("dark","light"):
            page.emulate_media(color_scheme=theme)
            for width in (320,390,1440):
                page.set_viewport_size({"width":width,"height":900})
                demo.scroll_into_view_if_needed()
                page.wait_for_timeout(80)
                result=demo.evaluate("""root => {
                    const browser=root.querySelector('[data-demo-browser]').getBoundingClientRect();
                    const target=root.querySelector('[data-demo-target]').getBoundingClientRect();
                    return {phase:root.dataset.phase,width:innerWidth,
                        visible: target.left>=browser.left && target.right<=browser.right && target.top>=browser.top && target.bottom<=browser.bottom,
                        bottom:target.bottom-browser.bottom};
                }""")
                result["theme"]=theme
                results.append(result)
                if not result["visible"]:
                    demo.screenshot(path="/tmp/lu-pip-clipped-phase.png")
                    raise AssertionError(result)
        page.emulate_media(color_scheme="dark")
        page.set_viewport_size({"width":1440,"height":900})
        demo.scroll_into_view_if_needed()
        demo.get_by_role("button",name="Play browsing demo",exact=True).click()
    Path("review-previews/ui-stack/checks/pip-demo-phase-layout.json").write_text(json.dumps(results,indent=2)+"\n")
    print("PASS",len(results),"phase/layout combinations")
    browser.close()
finally:
    bt.BrowserTestCase.tearDownClass()
