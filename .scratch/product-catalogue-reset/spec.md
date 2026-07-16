# Problem Statement

The site currently blurs the distinction between flagship builds and the broader product catalogue. Several dedicated product routes also present long case studies where concise, factual product pages would make each product easier to understand and obtain. BallHammer is not yet represented in the catalogue or on a dedicated route.

# Solution

- Make `/BUILDS` a curated flagship index containing exactly Linux Sonar, Meteor, Poke Android, Sleepr, and Game Systems.
- Make `/PRODUCTS` the broader catalogue.
- Add BallHammer to Products and create a dedicated `/ballhammer` product page. BallHammer does not belong in the flagship Builds list by default.
- Convert the existing dedicated pages for Meteor, Sleepr, linux-sonar, Risk of Anticheat, BrcTrainer, DaggerFall, and SuperHackerGolf from long case studies into compact bespoke product pages.
- Give every compact page a hero, a factual **What it does** section, an **Under the hood** section, and a **Get it** section. Pages share the site shell and quality bar while retaining a distinct visual identity for each product; this is not a generic single-template redesign.
- Use the approved stylized version of a real Darktide screenshot in the BallHammer hero, with this exact copy: “Enemy overlays and configurable aim controls for Darktide.”
- Keep product metadata, source links, and installation links accurate. For BallHammer, use factual, source-first links and manual installation guidance. Do not invent releases, claims, metrics, screenshots, or telemetry.

# User Stories

1. As a visitor, I want Builds to show the five curated flagship projects, so that I can focus on the selected flagship work.
2. As a visitor, I want Products to provide broad catalogue navigation, so that I can browse projects beyond the curated Builds selection.
3. As a Darktide player, I want to discover BallHammer through Products, so that I can find its dedicated product page.
4. As a technically minded user, I want a factual BallHammer source link, so that I can inspect the project directly.
5. As a Darktide player, I want accurate manual installation guidance for BallHammer, so that I can install it without relying on an invented release.
6. As a visitor, I want the BallHammer hero to use the approved stylized real Darktide screenshot and the copy “Enemy overlays and configurable aim controls for Darktide.”, so that I receive an accurate first impression of the product.
7. As a visitor, I want each compact product page to include a hero, so that I can identify the product and its purpose immediately.
8. As a visitor, I want each compact product page to include a factual What it does section, so that I can quickly understand the product's capabilities.
9. As a technically curious visitor, I want each compact product page to include an Under the hood section, so that I can understand how the product works.
10. As a prospective user, I want each compact product page to include a Get it section, so that I can find the correct way to obtain or install the product.
11. As a visitor, I want every compact product page to have a bespoke visual identity, so that each product feels distinct while retaining the shared site quality bar.
12. As a visitor, I want accurate product metadata and working source and installation links, so that I can trust the catalogue and reach the intended destinations.
13. As a desktop visitor, I want catalogue navigation and compact product pages to be easy to use, so that I can explore products efficiently on a larger screen.
14. As a mobile visitor, I want catalogue navigation and compact product pages to be easy to use, so that I can explore products efficiently on a phone.
15. As a visitor on any supported screen size, I want the BallHammer hero image to respond to the available viewport, so that its subject and presentation remain usable without awkward cropping or overflow.
16. As a catalogue maintainer, I want BallHammer and every other unapproved product excluded from Builds, so that no product is accidentally presented as a flagship.
17. As Lu, I want to review real desktop and phone previews of the visual scope before publication, so that I can approve the result before any push or deployment.

# Implementation Decisions

- Builds contains exactly Linux Sonar, Meteor, Poke Android, Sleepr, and Game Systems; no other product appears there.
- Products is the broader catalogue and includes BallHammer.
- `/ballhammer` is a dedicated product route and uses the approved stylized real Darktide screenshot and locked hero copy.
- Meteor, Sleepr, linux-sonar, Risk of Anticheat, BrcTrainer, DaggerFall, and SuperHackerGolf retain dedicated routes but receive compact, bespoke presentations.
- The required section structure is consistent, but layout, art direction, typography, color, and supporting details may vary by product. Do not flatten the pages into one generic visual template.
- Content is grounded in existing factual sources. Source and install destinations must be checked rather than inferred, and BallHammer installation instructions must describe the real manual process.
- Lu must approve real desktop and phone previews of the visual scope before any push or deployment.

# Testing Decisions

Add a small, focused browser-level regression harness because the project has no such harness today. Tests cover user-visible behavior only and do not assert implementation internals:

- Products dropdown navigation reaches BallHammer.
- `/ballhammer` displays the locked factual hero copy plus working source and manual-install content.
- Builds displays only the five approved entries.
- The compact Meteor, Sleepr, linux-sonar, Risk of Anticheat, BrcTrainer, DaggerFall, and SuperHackerGolf routes render successfully with their required visible sections.
- Desktop and mobile screenshots are reviewed for visual regressions and supplied for Lu’s approval.

# Out of Scope

- Updating the live site now.
- Speculative product claims, metrics, releases, screenshots, or telemetry.
- New BallHammer game functionality.
- Changes to the five flagship case-study content beyond curating the Builds index.
- Flattening individual product designs into a generic template.
- Publishing, pushing, or deploying any change.

# Further Notes

This approved planning spec is based on baseline `master` revision `8772172a5da2e47dd4d45bef098455aa5945559b`. Implementation should revalidate factual metadata, source URLs, and installation instructions against that baseline and authoritative product sources before changing user-facing content.
