"""Behaviour checks for the ready homepage issue batch."""
from browser_test import BrowserTestCase, expect, wait_for_condition, find_open_water

class HomepageIssueTests(BrowserTestCase):
    def test_skip_link_is_first_and_focuses_main(self):
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        page = browser.new_page()
        page.goto(self.base_url, wait_until='networkidle')
        page.keyboard.press('Tab')
        skip = page.get_by_role('link', name='Skip to content')
        expect(skip).to_be_focused()
        self.assertGreaterEqual(skip.bounding_box()['y'], 0)
        page.keyboard.press('Enter')
        expect(page.locator('#main')).to_be_focused()

    def test_actions_captions_privacy_and_immediate_navigation(self):
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        for width in (1440,390,320):
            page = browser.new_page(viewport={'width':width,'height':844})
            page.goto(self.base_url,wait_until='networkidle')
            for link in page.locator('[class*=heroActions] a').all():
                self.assertGreaterEqual(link.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)'),14)
                self.assertGreaterEqual(link.bounding_box()['height'],44)
            expect(page.locator('footer').get_by_role('link',name='Privacy')).to_have_attribute('href','/privacy')
            for section in ('Work','More','Contact'):
                page.get_by_role('navigation',name='Portfolio navigation').get_by_role('link',name=section,exact=True).click()
                expect(page.locator('header [aria-current="location"]')).to_have_text(section)
            self.assertEqual(page.locator('#contact').evaluate('e=>getComputedStyle(e).opacity'),'1')
            for caption in page.locator('legend, [class*=eyebrow], [class*=pondNote] small, [aria-label="Featured projects"] small').all():
                self.assertGreaterEqual(caption.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)'),12)
            self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width)
            page.goto(self.base_url+'/#contact',wait_until='networkidle')
            self.assertEqual(page.locator('#contact').evaluate('e=>getComputedStyle(e).opacity'),'1')
            page.close()

    def test_pointer_feeding_without_feed_control_or_unused_ascii_rasters(self):
        browser = self.playwright.chromium.launch()
        self.addCleanup(browser.close)
        page = self.pond_page(browser)
        rasters=[]
        page.on('request',lambda r:rasters.append(r.url) if any(x in r.url for x in ('pixel-pond-world','water-displacement','pixel-pond-foreground','pixel-pond-water-layer')) else None)
        page.goto(self.base_url,wait_until='networkidle')
        wait_for_condition(page, "document.querySelector('[data-pond-state]')?.dataset.pondState==='running'")
        self.assertEqual(rasters,[])
        for mode in ('ASCII','Pixel'):
            page.get_by_label(mode,exact=True).check()
            wait_for_condition(page, "document.querySelector('[data-pond-state]')?.dataset.pondState==='running'")
            self.assertEqual(page.get_by_role('button',name='Feed fish',exact=True,include_hidden=True).count(),0)
            self.assertEqual(page.locator('[class*="feedControl"], [class*="feedButton"]').count(),0)
            pond=page.locator('[data-pond-state]')
            before=int(pond.get_attribute('data-food-dropped-count'))
            x,y=find_open_water(page,pond)
            page.mouse.click(x,y)
            wait_for_condition(page, "before=>Number(document.querySelector('[data-pond-state]').dataset.foodDroppedCount)===before+1",arg=before)
            self.assertEqual(int(pond.get_attribute('data-food-dropped-count')),before+1)
