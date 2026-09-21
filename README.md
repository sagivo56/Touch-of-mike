# Touch — Russian Bank Solitaire

A mobile-friendly, two-player competitive solitaire card game based on the classic
**Russian Bank** (known locally as **"Touch"**), styled after the timeless
Windows 95 / XP Solitaire look — casino-green felt, sharp retro cards, MS Sans Serif
typography, and classic red/blue patterned card backs.

You play the bottom hand against a built-in computer opponent up top.

## Play it

No build step, no dependencies. Just open **`index.html`** in any modern browser —
it's a single self-contained file optimized for a vertical phone screen.

```
open index.html          # macOS
xdg-open index.html      # Linux
# or drag index.html onto your phone browser / host it as a static file
```

## Goal

Be the **first player to empty your 13-card Reserve pile.**

## Components

Two standard 52-card decks (104 cards total). The screen has three zones:

- **Player 2 (top, computer):** Reserve (13 cards, top face up), Stock (draw pile), Waste.
- **Center (shared)** — laid out the traditional Russian Bank way, as four vertical
  columns: **tableau | foundations | foundations | tableau**.
  - **8 Foundations** (the two middle columns) — build **UP** by suit, Ace → King.
  - **8 Tableau** piles (the two outer columns) — the maneuvering area; build **DOWN**
    in alternating colors, cascading downward.
- **Player 1 (bottom, you):** Reserve, Stock, Waste.

The whole interface is in **Hebrew, right-to-left**.

## How to play (touch-friendly, tap-to-move)

1. On your turn, **tap** one of your movable cards — your Reserve top, your Waste top,
   or any Tableau top card. It highlights, and every legal destination **glows yellow**.
2. **Tap** a glowing Foundation or Tableau slot to move the card there.
3. Make as many legal moves as you like. **Undo** takes back moves made this turn.
4. Press **End Turn (Draw)** to draw a card from your Stock to your Waste — this ends
   your turn and hands play to the computer.

## Rules enforced

- **Foundations** build up by suit (A, 2, 3 … K); only an Ace may start an empty foundation.
- **Tableau** builds down in alternating colors (e.g. red 10 on black Jack).
- **Empty Tableau priority:** an empty tableau slot must be filled from your **Reserve**
  first. Only when your Reserve is empty may you fill an empty slot from your Waste or
  another Tableau column.
- Moving from Reserve → Tableau/Foundation, Waste → Tableau/Foundation,
  Tableau → Tableau/Foundation.
- Drawing (Stock → Waste) ends your turn; when your Stock runs out, your Waste is turned
  over to form a fresh Stock.
- Emptying your Reserve wins the game.

## Background music

An original, looping **8-bit / chiptune** piece (NES-style: square-wave lead,
triangle bass, a fast pulse arpeggio, and a noise channel for drums) in
**D harmonic minor** — with the raised-7th / augmented-second colour characteristic
of Russian romantic music. It's synthesized live with the Web Audio API (no audio
files, no copyrighted recordings). Browsers block audio until you interact, so it
starts on your first tap; toggle it any time with the **♫ Music** button in the
title bar (your choice is remembered).

**Sound effects** (also 8-bit, sharing the same audio engine) play on gameplay
events: selecting a card, placing on the tableau, placing on a foundation
(a brighter chime), an illegal move (a low buzz), drawing/ending a turn, and a
victory fanfare / defeat jingle.

## Responsive design

The board is sized fluidly to the live viewport, so it fits every phone from an
iPhone SE to a Pro Max, Galaxy and Pixel devices, and landscape — with safe-area
insets so the title bar clears the notch/Dynamic Island and the controls clear the
home indicator and Safari's floating toolbar. Tableau columns that accumulate many
cards compress their overlap and the center area scrolls, so a long column never
overflows or hides the fixed player/foundation zones.

## Project structure

```
.
├── index.html          # the entire game (HTML + CSS + JS, no build step)
├── package.json        # scripts + dev dependency for the tests
├── tests/
│   ├── game.test.js    # end-to-end suite (rules, win, AI, music, responsive)
│   └── README.md       # how to run the tests
├── LICENSE             # MIT
└── README.md
```

## Tech

Plain HTML/CSS/JavaScript — no frameworks, no network calls. All game state and rule
validation live in `index.html`. A tiny `window.__touch` debug hook is exposed for
automated testing.

## Testing

```bash
npm install
npx playwright install chromium   # first time only
npm test
```

See [`tests/README.md`](tests/README.md) for details. The suite drives the real game
in a headless Chromium and checks the rules engine, win/undo/flip flows, the AI
(including loop-safety over 40 full games), music toggling, and responsive layout
across 7 device viewports — with zero console errors.
