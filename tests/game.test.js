/*
 * Touch (Russian Bank) — end-to-end test suite.
 *
 * Drives the game in a headless Chromium via playwright-core and checks game
 * rules, win detection, the waste->stock flip, Undo, the AI turn, background
 * music toggling, and responsive layout across several device viewports.
 *
 * Run:  npm install  &&  npm test
 * The browser is resolved from (in order):
 *   1. $CHROME_PATH
 *   2. a Playwright-managed Chromium under $PLAYWRIGHT_BROWSERS_PATH or ~/.cache
 * If none is found, install one with:  npx playwright install chromium
 */
"use strict";
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");
const os = require("os");

const GAME_URL = "file://" + path.resolve(__dirname, "..", "index.html");

/* ---------- locate a Chromium executable ---------- */
function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(os.homedir(), ".cache", "ms-playwright"),
    "/opt/pw-browsers",
  ].filter(Boolean);
  const names = ["chrome", "headless_shell", "chrome.exe"];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      let entries = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { continue; }
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) stack.push(p);
        else if (names.includes(e.name)) return p;
      }
    }
  }
  return null;
}

/* ---------- tiny test harness ---------- */
let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail ? "  -> " + JSON.stringify(detail) : "")); }
}

const DEVICES = [
  { name: "iPhone-SE", w: 375, h: 667 },
  { name: "iPhone-13", w: 390, h: 844 },
  { name: "iPhone-14-ProMax", w: 430, h: 932 },
  { name: "Galaxy-S20", w: 360, h: 800 },
  { name: "Galaxy-A-small", w: 360, h: 640 },
  { name: "Pixel-5", w: 393, h: 851 },
  { name: "Landscape", w: 844, h: 390 },
];

(async () => {
  const exe = findChrome();
  if (!exe) {
    console.error("No Chromium found. Set CHROME_PATH or run: npx playwright install chromium");
    process.exit(2);
  }
  const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
  const errors = [];

  async function open(viewport) {
    const page = await browser.newPage({ viewport });
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(GAME_URL);
    await page.waitForTimeout(150);
    return page;
  }

  /* ===== 1. Rules engine ===== */
  console.log("\nRules engine");
  let page = await open({ width: 390, height: 780 });
  const rules = await page.evaluate(() => {
    const T = window.__touch, g = T.state, out = {};
    const ids = new Set();
    [...g.players[0].reserve, ...g.players[0].stock, ...g.players[1].reserve, ...g.players[1].stock].forEach((c) => ids.add(c.id));
    out.deal = {
      p1: g.players[0].reserve.length + g.players[0].stock.length,
      p2: g.players[1].reserve.length + g.players[1].stock.length,
      reserve: g.players[0].reserve.length, unique: ids.size,
    };
    const A = { rank: 1, suit: "S", color: "black" }, two = { rank: 2, suit: "S", color: "black" }, twoH = { rank: 2, suit: "H", color: "red" };
    g.foundations[0] = [];
    out.fEmptyAce = T.canFoundation(A, 0);
    out.fEmptyTwo = T.canFoundation(two, 0);
    g.foundations[0] = [A];
    out.fUpSuit = T.canFoundation(two, 0);
    out.fWrongSuit = T.canFoundation(twoH, 0);
    const bJ = { rank: 11, suit: "S", color: "black" }, r10 = { rank: 10, suit: "H", color: "red" }, b10 = { rank: 10, suit: "C", color: "black" };
    g.tableau[0] = [bJ];
    out.tAlt = T.canTableau(r10, 0, "tableau", 0);
    out.tSameColour = T.canTableau(b10, 0, "tableau", 0);
    g.tableau[1] = [];
    g.players[0].reserve = [{ rank: 5, suit: "S", color: "black" }];
    out.tEmptyFromWasteBlocked = T.canTableau(r10, 1, "waste", 0);
    out.tEmptyFromReserveOk = T.canTableau(r10, 1, "reserve", 0);
    g.players[0].reserve = [];
    out.tEmptyFromWasteOk = T.canTableau(r10, 1, "waste", 0);
    return out;
  });
  check("dealt 52 cards per player", rules.deal.p1 === 52 && rules.deal.p2 === 52, rules.deal);
  check("13-card reserve", rules.deal.reserve === 13, rules.deal);
  check("104 unique cards", rules.deal.unique === 104, rules.deal);
  check("foundation: Ace on empty only", rules.fEmptyAce && !rules.fEmptyTwo);
  check("foundation: up by suit only", rules.fUpSuit && !rules.fWrongSuit);
  check("tableau: down alternating colour", rules.tAlt && !rules.tSameColour);
  check("empty tableau: reserve-first priority", rules.tEmptyFromReserveOk && !rules.tEmptyFromWasteBlocked && rules.tEmptyFromWasteOk);
  await page.close();

  /* ===== 2. Win detection + waste flip + Undo (UI) ===== */
  console.log("\nWin / flip / undo");
  page = await open({ width: 390, height: 780 });

  const flip = await page.evaluate(() => {
    const T = window.__touch; T.newGame(); const g = T.state;
    g.players[0].stock = [];
    g.players[0].waste = [{ id: 1, rank: 3, suit: "S", color: "black" }, { id: 2, rank: 4, suit: "S", color: "black" }, { id: 3, rank: 5, suit: "S", color: "black" }];
    const drew = T.drawCard(0);
    return { drew, stock: g.players[0].stock.length, waste: g.players[0].waste.length, top: g.players[0].waste.at(-1).rank };
  });
  check("waste flips to stock when stock empty", flip.drew && flip.stock === 2 && flip.waste === 1 && flip.top === 3, flip);

  await page.evaluate(() => {
    const T = window.__touch; T.newGame(); T.hideModal(); const g = T.state;
    g.players[0].reserve[g.players[0].reserve.length - 1] = { id: 700, rank: 1, suit: "S", color: "black" };
    g.foundations[0] = []; g.current = 0; window.dispatchEvent(new Event("resize"));
  });
  const rBefore = await page.evaluate(() => window.__touch.state.players[0].reserve.length);
  await page.click("#p1row .pile-group:first-child .pilecard");
  await page.click("#foundations .slot:first-child");
  const afterMove = await page.evaluate(() => ({ r: window.__touch.state.players[0].reserve.length, f: window.__touch.state.foundations[0].length }));
  check("move reserve->foundation", afterMove.r === rBefore - 1 && afterMove.f === 1, afterMove);
  await page.click("#undoBtn");
  const afterUndo = await page.evaluate(() => ({ r: window.__touch.state.players[0].reserve.length, f: window.__touch.state.foundations[0].length }));
  check("undo restores state", afterUndo.r === rBefore && afterUndo.f === 0, afterUndo);

  await page.evaluate(() => {
    const T = window.__touch; T.newGame(); T.hideModal(); const g = T.state;
    g.players[0].reserve = [{ id: 900, rank: 1, suit: "S", color: "black" }];
    g.foundations[0] = []; g.current = 0; window.dispatchEvent(new Event("resize"));
  });
  await page.click("#p1row .pile-group:first-child .pilecard");
  await page.click("#foundations .slot:first-child");
  const win = await page.evaluate(() => ({ over: window.__touch.state.over, winner: window.__touch.state.winner, modal: document.getElementById("modal").classList.contains("show") }));
  check("emptying reserve wins + shows modal", win.over && win.winner === 0 && win.modal, win);
  await page.close();

  /* ===== 3. AI turn + loop safety ===== */
  console.log("\nAI opponent");
  page = await open({ width: 390, height: 780 });
  await page.evaluate(() => { window.__touch.hideModal(); });
  await page.click("#endBtn");
  await page.waitForFunction(() => window.__touch.state.current === 0 && !window.__touch.state.aiBusy, { timeout: 20000 });
  const ai = await page.evaluate(() => ({ current: window.__touch.state.current, p2waste: window.__touch.state.players[1].waste.length }));
  check("AI plays a turn and returns control", ai.current === 0 && ai.p2waste >= 1, ai);

  const sim = await page.evaluate(() => {
    const T = window.__touch;
    function scored(pl) {
      const g = T.state, c = [];
      const src = [{ kind: "reserve" }, { kind: "waste" }];
      for (let i = 0; i < 8; i++) src.push({ kind: "tableau", col: i });
      for (const s of src) { const r = T.resolveSource(s, pl); if (!r) continue; for (const t of T.validTargets(r, pl)) { let sc = t.type === "foundation" ? 100 : 0; sc += s.kind === "reserve" ? 60 : s.kind === "waste" ? 12 : 6; c.push({ s, t, sc }); } }
      c.sort((a, b) => b.sc - a.sc); return c;
    }
    function turn(pl, seen) { let n = 0; while (n < 120) { let p = null; for (const c of scored(pl)) { const snap = T.snapshot(); T.doMove(c.s, c.t, pl, false); const h = T.snapshot(); T.restore(snap); if (!seen.has(h)) { p = { c, h }; break; } } if (!p) break; T.doMove(p.c.s, p.c.t, pl, false); seen.add(p.h); n++; if (T.state.over) return; } T.drawCard(pl); }
    let wins = [0, 0], draws = 0;
    for (let game = 0; game < 40; game++) {
      T.newGame(); const g = T.state; let turns = 0, stale = 0, last = "";
      while (!g.over && turns < 3000) {
        const pl = g.current; turn(pl, new Set([T.snapshot()])); g.current = pl ? 0 : 1; turns++;
        const key = g.players[0].reserve.length + "/" + g.players[1].reserve.length + "/" + g.players[0].stock.length + "/" + g.players[1].stock.length;
        if (key === last) { if (++stale > 60) break; } else { stale = 0; last = key; }
      }
      if (g.over) wins[g.winner]++; else draws++;
    }
    return { wins, draws };
  });
  check("40 full games terminate (no infinite loops)", sim.wins[0] + sim.wins[1] + sim.draws === 40, sim);
  await page.close();

  /* ===== 4. Background music ===== */
  console.log("\nBackground music");
  page = await open({ width: 390, height: 780 });
  await page.evaluate(() => window.__touch.hideModal());
  const m0 = await page.evaluate(() => document.getElementById("musicBtn").textContent.trim());
  await page.click("#musicBtn");
  const m1 = await page.evaluate(() => document.getElementById("musicBtn").textContent.trim());
  await page.click("#musicBtn");
  const m2 = await page.evaluate(() => document.getElementById("musicBtn").textContent.trim());
  check("music toggle button flips label", /מוזיקה/.test(m0) && /מושתק/.test(m1) && /מוזיקה/.test(m2), { m0, m1, m2 });
  await page.close();

  /* ===== 5. Responsive layout + deep tableau columns ===== */
  console.log("\nResponsive layout (deep tableau columns)");
  for (const d of DEVICES) {
    page = await open({ width: d.w, height: d.h });
    await page.evaluate(() => {
      const T = window.__touch; T.hideModal(); const g = T.state;
      const suits = [["S", "black"], ["H", "red"], ["C", "black"], ["D", "red"]];
      const long = [];
      for (let k = 0; k < 18; k++) { const [s, c] = suits[k % 4]; long.push({ id: 1000 + k, rank: 13 - (k % 13), suit: s, color: c }); }
      g.tableau[0] = long;
      T.fitLayout(); window.dispatchEvent(new Event("resize"));
    });
    await page.waitForTimeout(80);
    const mt = await page.evaluate(() => {
      const end = document.getElementById("endBtn").getBoundingClientRect();
      const p1 = document.getElementById("p1row").getBoundingClientRect();
      const p2 = document.getElementById("p2row").getBoundingClientRect();
      const center = document.querySelector(".center");
      return {
        endVisible: end.bottom <= innerHeight + 0.5 && end.top >= 0,
        p1Visible: p1.bottom <= innerHeight + 0.5 && p1.top >= 0,
        p2Visible: p2.top >= 0,
        noHOverflow: document.documentElement.scrollWidth <= innerWidth + 1,
        centerScrolls: center.scrollHeight > center.clientHeight,
      };
    });
    check(`${d.name} (${d.w}x${d.h})`, mt.endVisible && mt.p1Visible && mt.p2Visible && mt.noHOverflow && mt.centerScrolls, mt);
    await page.close();
  }

  /* ===== 6. No console errors anywhere ===== */
  console.log("\nConsole health");
  check("no console/page errors during all tests", errors.length === 0, errors.slice(0, 5));

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
