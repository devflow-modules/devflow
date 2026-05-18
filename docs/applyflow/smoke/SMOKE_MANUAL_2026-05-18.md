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
- [ ] Injected panel button "Abrir Opções (export JSON)" opens extension options page — **pending re-validation** after fix for `chrome-extension://invalid/` console loop (prior attempt opened invalid URLs from content-script fallbacks)
- [ ] No `chrome-extension://invalid/` loop in LinkedIn console when clicking the panel options button once

## Non-blocking follow-ups

1. Avoid using public screenshots containing real LinkedIn/profile PII.
2. After reload of unpacked extension + LinkedIn tab: confirm panel options button opens `options.html` with a single click and clean console.

## Verdict

ApplyFlow is approved for local use, technical demo, and portfolio presentation.
