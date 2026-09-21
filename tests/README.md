# Tests

End-to-end tests for **Touch** that drive the real game in a headless Chromium
via [`playwright-core`](https://www.npmjs.com/package/playwright-core).

`game.test.js` covers:

- **Rules engine** — deal integrity (52 cards/player, 104 unique), foundation
  build-up by suit, tableau build-down in alternating colours, and the
  empty-tableau "reserve first" priority rule.
- **Win / flip / undo** — emptying the reserve wins (and shows the result
  modal), the waste→stock flip when the stock runs out, and Undo.
- **AI opponent** — a real AI turn returns control, and 40 fully auto-played
  games all terminate (proving the loop-safety guard works).
- **Background music** — the music toggle button switches state.
- **Responsive layout** — across 7 device viewports (iPhone SE…Pro Max,
  Galaxy, Pixel, landscape) with an 18-card tableau column, checks that all
  zones and the controls stay visible, there's no horizontal overflow, and long
  columns are revealed by the center scrolling (never by hiding a fixed zone).
- **Console health** — no console or page errors during any of the above.

## Running

```bash
npm install
npx playwright install chromium   # first time only, to fetch a browser
npm test
```

If you already have a Chromium/Chrome binary, point the tests at it instead of
installing one:

```bash
CHROME_PATH=/path/to/chrome npm test
```

The suite prints a per-check `✓`/`✗` list and exits non-zero if anything fails.
