# ScreenController Composition Split — Phase 2

This phase reduced additional view-building responsibilities in
`src/ui/ScreenController.js`.

New dedicated view modules:

- `src/ui/storyScreenView.js`
- `src/ui/creditsView.js`
- `src/ui/settingsView.js`

`ScreenController` still owns:

- screen routing
- notification stack behavior
- world-tab orchestration
- result and ending transitions

The extracted modules now own:

- story markup composition
- credits markup composition
- settings toggle/debug-row visual state application
