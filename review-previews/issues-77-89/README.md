# Ready issue verification

Base: master 32949742dc6a294df4e924ec57101f01ce8e9e55. Before captures use the live site on 9 November 2026; after captures use the local production export. The proposed illustration style is for Lu to judge, not a claim of project screenshots or live previews. SVGs are decorative and static, with the real project descriptions adjacent.

| Issue | Original evidence | Change and verification |
| --- | --- | --- |
| 77 | Home first Tab already focused Skip to content in both OpenBot browser and Chromium. The reported home failure did not reproduce. ConnectorMap lacked the link. | Explicit main focus activation; first Tab reveals skip, Enter focuses main. Companion ConnectorMap PR 33 fixes its reproduced failure. |
| 78 | Live labels 12px at 1440/390, 11px at 320; heights already 46px. | Labels 14px, 46px minimum height, secondary action underlined. Actual computed sizes verified at all three widths. |
| 79 | Live Contact click produced no aria-current item. | Visible section tracked on scroll/hash; current link has an accent underline and aria-current=location; keyboard rings retained. |
| 80 | Live footer had no privacy link. | Visible /privacy link, wrapping footer on phones; policy content unchanged. |
| 81 | Before media captures show the ambiguous existing visual. | Four static inline SVG illustrations with no image requests or video states. All projects captured at 1440/768/390/320 and in dark mode. No overflow. |
| 82 | Synthetic scheduling regression failed before patch at high refresh. | Shared pacing, no inflated minimum delta; 60/120/144/240Hz synthetic checks preserve intended reduced rate and ordinary cadence. Real high refresh GPU/battery profiling unrun. |
| 83 | Regression rejecting nonatlas requests failed before patch. Live page fetched desktop world despite ASCII. | ASCII uses atlas and explicit world dimensions; no raster hit map; Pixel retains raster map. Failure test proves unused assets cannot force ASCII fallback. |
| 84 | Live had no Feed fish button or keyboard operation. | Native button chooses unobscured valid visible water and invokes the same dropFood path as gestures. Enter increments food count in ASCII and Pixel; live region feedback. |
| 85 | Initial effect immediately imported renderer; desktop world file 1449726 bytes. | Renderer starts after two animation frames. Bootstrap pending state suppresses fallback fetch. Mobile world WebP is 106456 bytes, same dimensions and hit map/physics unchanged. This is byte size evidence, not a measured page speed or battery improvement. |
| 86 | Immediate live Contact click read computed opacity 0. | Contact reveal removed; click and direct hash read opacity 1. Other reveals retained. |
| 87 | Live section labels 11px, view legend 10px, feeding hint 9px. | Captions at least 12px; palette/contrast colours retained, no overflow at checked widths. |
| 88 | Fresh GET and HEAD samples lack production response headers. | Documented current gap, exact proposed hosting policy and decision for Lu. Production acceptance remains OPEN; no hosting changes claimed. |
| 89 | Deploy workflow previously only linted/built, independently of PR suite. | Shared full verification checks explicit github.sha; deploy build needs verification, deploy needs that exact artifact. No reliance on branch protection. Workflow dispatch/deployment not run. |

## Capture coverage

`before/after-{1440,390,320}-{hero,work,contact}.jpg` show action sizes, captions, navigation and footer. Project captures `before/after-{1440,768,390,320}-{rakazo,linux-sonar,homebot,connectormap}.jpg` show all four proposed illustrations. `after-{width}-dark.jpg` records dark tokens. The 320px hero intentionally permits a second action row to retain readable text and usable touch targets.

## Limits

No physical touchscreen, screen reader, high refresh hardware profiling, hosting edits, production deployment or merge. GitHub Actions execution/billing must be reported from actual run state, separately from local gates. Dependency audit reports existing moderate development dependency advisories; high severity gate passes without dependency changes.
