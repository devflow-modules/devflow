# ApplyFlow — Smoke Manual

Date: 2026-05-18

## Result

PASS with non-blocking notes.

## Landing `/`

- [x] Page opens
- [x] Layout renders
- [x] CTAs visible
- [x] Copy is coherent with local-first/privacy-first positioning
- [x] Previous hydration mismatch (`cz-shortcut-listen`) confirmed as browser-extension noise, not an ApplyFlow bug
- [x] Revalidated in clean browser profile/incognito without extensions; previous hydration warning confirmed as browser-extension noise.

## Dashboard `/dashboard`

- [x] Demo loads
- [x] Metrics render
- [x] Charts render
- [x] Table renders
- [x] Filters render
- [x] Export works

## JSON Import

- [x] Import by file works
- [x] Drag-and-drop works
- [x] Invalid JSON shows controlled error and does not crash the UI

## Documentation `/documentacao`

- [x] Page opens
- [x] Documentation links/content validated

## Interview Lab Handoff

- [x] Export to Interview Lab generated CareerBundle JSON
- [x] Open Interview Lab opened the expected local URL
- [x] Interview Lab detected ApplyFlow handoff
- [x] CareerBundle parsed successfully
- [x] Bundle summary rendered
- [x] Roles rendered
- [x] Train for this role opened the practice flow

## Chrome Extension

- [x] Build completed
- [x] Loaded unpacked in Chrome
- [x] Panel injected on LinkedIn
- [x] Easy Apply context detected
- [x] Safety Gate visible
- [x] No auto-submit behavior observed
- [x] Options page opens through Chrome extension settings
- [x] Profile loaded in options
- [x] Status shows profile ready for suggestions
- [x] Preview capture works
- [x] Export JSON works
- [x] Injected panel button "Abrir Opções (export JSON)" opens extension `options.html` (service worker route)
- [x] Content script guard: panel/observer only on LinkedIn `/jobs*` (`content-bootstrap`)
- [x] `chrome-extension://invalid/` console noise **not caused by ApplyFlow** — persists with extension disabled; source hash `b2sthkxz...` ≠ ApplyFlow ID `lpkmohkldkcjagjklalnaiimkehlhbb` (external Chrome/extension/adblock noise on LinkedIn)

## Extension validation final

- [x] Panel options button opens `options.html`
- [x] `/jobs/...` Easy Apply, panel, and options button OK
- [x] `/notifications` and non-`/jobs` routes do not mount ApplyFlow panel/observer
- [x] `chrome-extension://invalid/` persists with ApplyFlow **disabled** — classified as external; no further ApplyFlow sprint on this noise

## Non-blocking follow-ups

1. Avoid using public screenshots containing real LinkedIn/profile PII.
2. Public portfolio: case study + LinkedIn post + safe print selection (repo stays private).

## Verdict

**ApplyFlow closed** — approved for local use, technical demo, and **private/controlled portfolio** (monorepo private).
