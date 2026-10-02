# Rotation Lab — Implementation Plan

A browser trainer for Fortnite trios IGL decision-making. Each "rep" shows an
abstract zone + lobby state at a zone reveal; the user makes a call (where,
when, how to engage), the sim plays it out, and the app grades the call with
plain-language feedback.

This plan is written so an AI coding agent can implement it phase by phase.
Each phase ends in a working, committed state with passing tests.

---

## 0. Product scope

### In scope (v1)

- Abstract 2D map (no real Fortnite map art).
- Procedurally generated zone sequence: big early circles → mid-game →
  moving endgame zones.
- Simulated lobby of AI trios with simple behavior archetypes.
- Decision drill at every zone reveal:
  1. **Destination** — click a point on the map.
  2. **Timing** — `early` / `standard` / `late` rotate.
  3. **Engagement** — `avoid` / `tag` / `fight`.
- Scoring + written feedback per decision.
- Visual overlays: next-zone-center probability region, sector density
  (dead vs. stacked side), team dots, your path.
- Session summary at end of a game (score per zone, recurring mistakes).

### Out of scope (v1)

Real map, replay-file import, accounts, database, multiplayer, mechanics
simulation (building/aim). Do not add these.

### Design principle

The sim does not need to be "true" to Fortnite. It needs to reward the same
*reasoning* a good IGL uses: predicting the next pull, reading team density,
managing storm/surge risk, and limiting directions of exposure. All tunable
numbers live in one constants file and are explicitly labelled as
approximations, not Epic's real values.

---

## 1. Stack & conventions

| Concern       | Choice                                                     |
| ------------- | ---------------------------------------------------------- |
| Framework     | Next.js (App Router) + TypeScript (strict)                 |
| Styling / UI  | Tailwind + shadcn/ui (Button, Card, RadioGroup, Dialog, Slider, Badge, Tooltip) |
| Rendering     | HTML Canvas 2D (single `<canvas>`, no game engine)         |
| State         | `useReducer` in one client component; no global store lib  |
| Tests         | Vitest for the engine (pure TS)                            |
| Dev server    | `next dev -p 4317`                                         |

Conventions:

- `strict: true`, plus `noUncheckedIndexedAccess`. No `any`.
- **The engine is pure TypeScript with zero React/DOM imports.** UI only calls
  engine functions and renders their output. This is the most important
  architectural rule — it keeps the sim testable and swappable.
- All randomness goes through a seeded RNG passed in explicitly. Never call
  `Math.random()` in the engine. Same seed ⇒ same game (needed for tests and
  "replay this scenario").
- Files ≤ ~250 lines, functions ≤ ~30 lines, kebab-case filenames.
- No comments that narrate code. Only comment non-obvious constraints.

### Scaffold commands

```bash
npx create-next-app@latest tmp-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
# move tmp-scaffold/* (incl. dotfiles) to repo root, delete tmp-scaffold
npx shadcn@latest init
npx shadcn@latest add button card radio-group dialog slider badge tooltip separator
npm i -D vitest
```

Add scripts: `"dev": "next dev -p 4317"`, `"test": "vitest run"`,
`"typecheck": "tsc --noEmit"`.

---

## 2. File structure

```
src/
├── app/
│   ├── layout.tsx
│   └── page.tsx                  # renders <RotationLab />
├── components/
│   ├── rotation-lab.tsx          # top-level client component, owns reducer
│   ├── map-canvas.tsx            # canvas drawing + click-to-pick destination
│   ├── decision-panel.tsx        # timing / engagement controls + "Lock call"
│   ├── state-panel.tsx           # your mats, heals, alive, surge status, zone #
│   ├── feedback-card.tsx         # score breakdown + explanation lines
│   ├── session-summary.tsx       # end-of-game dialog
│   └── overlay-toggles.tsx       # show/hide heatmap, pull region, sectors
├── engine/
│   ├── constants.ts              # ALL tunable numbers
│   ├── types.ts                  # shared engine types
│   ├── rng.ts                    # seeded RNG (mulberry32)
│   ├── geometry.ts               # vec math, distance, angle, point-in-circle
│   ├── zones.ts                  # zone sequence generation
│   ├── lobby.ts                  # initial team placement
│   ├── ai-behavior.ts            # AI team destination choice per archetype
│   ├── combat.ts                 # contact detection + fight resolution
│   ├── surge.ts                  # surge check + damage application
│   ├── analysis.ts               # sector density, pull region, exposure
│   ├── scoring.ts                # grade a player decision
│   ├── feedback.ts               # turn score components into sentences
│   ├── step.ts                   # advance game by one zone phase
│   └── game.ts                   # createGame(seed, settings), public API
├── engine/__tests__/             # one test file per engine module
└── lib/
    └── canvas-draw.ts            # pure drawing helpers (circle, dot, wedge)
```

---

## 3. Core types (`engine/types.ts`)

```ts
export type Vec = { x: number; y: number };

export type Circle = { center: Vec; radius: number };

export type ZonePhase = {
  index: number;            // 1-based zone number
  from: Circle;             // circle at start of shrink
  to: Circle;               // circle at end of shrink
  waitSec: number;          // time between reveal and shrink start
  shrinkSec: number;
  isMoving: boolean;        // endgame moving zone
  surgeActive: boolean;
};

export type Archetype = "edge" | "deep" | "fighter" | "passive";

export type Team = {
  id: string;
  isPlayer: boolean;
  archetype: Archetype;
  pos: Vec;
  alive: number;            // 0..3
  mats: number;             // 0..MAX_MATS
  heals: number;            // abstract heal units
  damageThisPhase: number;  // for surge
  eliminated: boolean;
};

export type Timing = "early" | "standard" | "late";
export type Engagement = "avoid" | "tag" | "fight";

export type Decision = {
  destination: Vec;
  timing: Timing;
  engagement: Engagement;
};

export type SectorInfo = {
  index: number;            // 0..SECTOR_COUNT-1, 0 = north, clockwise
  teamCount: number;
  label: "dead" | "normal" | "stacked";
};

export type ScoreBreakdown = {
  storm: number;            // 0..100, higher is better
  contact: number;
  exposure: number;
  surge: number;
  positioning: number;      // future-pull awareness
  total: number;            // weighted
};

export type FeedbackLine = { tone: "good" | "warn" | "bad"; text: string };

export type PhaseResult = {
  zone: ZonePhase;
  decision: Decision;
  score: ScoreBreakdown;
  feedback: FeedbackLine[];
  events: string[];         // "Fought team 7 — won, +1 elim", "Took 18 storm damage"
};

export type GameState = {
  seed: number;
  phaseIndex: number;
  zones: ZonePhase[];
  teams: Team[];
  history: PhaseResult[];
  status: "deciding" | "resolved" | "dead" | "won";
};
```

---

## 4. Engine algorithms

Map is a square `MAP_SIZE × MAP_SIZE` (1000) in abstract units.

### 4.1 RNG (`rng.ts`)

mulberry32. Export `createRng(seed): Rng` where
`Rng = { next(): number; range(min, max): number; pick<T>(arr: T[]): T }`.

### 4.2 Zones (`zones.ts`)

`generateZones(rng): ZonePhase[]` using `ZONE_TABLE` from constants (one row
per zone: radius, waitSec, shrinkSec, isMoving, surgeActive).

- Zone 1 center: random point such that the circle stays mostly on-map.
- Each next center: **uniform random point in a disc of radius
  `prev.radius - next.radius` around `prev.center`** (so the new circle sits
  fully inside the old one). Uniform-in-disc sampling:
  `r = R * sqrt(u1)`, `θ = 2π * u2`.
- Moving zones (`isMoving`): `to.center = from.center + offset`, offset length
  `MOVING_ZONE_SHIFT * from.radius` in a random direction, clamped so the
  final circle stays on-map.

### 4.3 Lobby (`lobby.ts`)

`createLobby(rng, zone1, teamCount)`: player team + `teamCount - 1` AI teams.
Positions scattered across the map with mild clustering (pick ~8 "hot drop"
anchors, place teams near anchors with jitter). Archetype weights in constants
(e.g. edge 35%, deep 25%, fighter 20%, passive 20%).

### 4.4 AI behavior (`ai-behavior.ts`)

`chooseAiDestination(team, nextZone, rng): Vec`

- `deep`: point within `0.4 * r` of next center.
- `edge`: point at `0.85–0.95 * r` from center, on the side closest to the
  team's current position.
- `fighter`: nearest other team's projected position inside the zone (or deep
  if none).
- `passive`: edge, but on the side with fewest teams (they hunt dead sides too).

Movement: teams move straight toward the destination at
`ROTATE_SPEED` units/sec for the time available (see timing below). Ignore
pathfinding.

### 4.5 Timing → movement window

For the player:

| Timing     | Departure                         | Effect                                  |
| ---------- | --------------------------------- | --------------------------------------- |
| `early`    | at reveal                         | most travel time; +mats from "refresh" is 0 |
| `standard` | 40% into wait                     | balanced                                |
| `late`     | at shrink start                   | +`LATE_REFRESH_MATS` mats; more storm risk; fewer teams left on your path |

Storm damage = time spent outside the shrinking circle × `STORM_DPS[zone]`.
Compute by sampling the player's position and the interpolated circle every
`SIM_TICK_SEC` during the shrink.

### 4.6 Combat (`combat.ts`)

- Contact: two teams within `CONTACT_RADIUS` at the end of movement, or paths
  passing within `CONTACT_RADIUS` (sample path points).
- AI vs AI: fight probability `AI_FIGHT_CHANCE`; winner by strength
  `alive * 1.0 + mats / MAX_MATS * 0.5 + rng jitter`. Loser loses 1–3 alive;
  winner gets `damageThisPhase += 200`, loses some mats.
- Player contact resolves by engagement:
  - `avoid`: chance `AVOID_ESCAPE_CHANCE` to disengage clean, else forced fight
    at a disadvantage.
  - `tag`: deal damage (counts for surge), take small chip damage, no elim.
  - `fight`: full fight resolution. Third-party risk: if a third team is within
    `THIRD_PARTY_RADIUS`, it joins against the winner.

### 4.7 Surge (`surge.ts`)

If `zone.surgeActive` and alive teams > `SURGE_TEAM_THRESHOLD[zone]`: the
bottom `SURGE_HIT_FRACTION` of teams by `damageThisPhase` take surge damage
(lose heals, then alive). Reset `damageThisPhase` each phase.

### 4.8 Analysis (`analysis.ts`) — the teaching core

- `sectorDensity(teams, nextZone): SectorInfo[]` — split 360° around the next
  center into `SECTOR_COUNT` (8) wedges. Count alive AI teams in the band
  `[0.6r, 1.5r]` from center. Label `dead` if count ≤ `DEAD_MAX` and `stacked`
  if count ≥ `STACKED_MIN` (or relative: bottom / top quartile).
- `pullRegion(zoneAfterNext): Circle` — region where the *following* center can
  land (`center = nextZone.center`, `radius = r_next - r_afterNext`). Drawn as a
  dashed circle. This is what teaches "dead now ≠ dead next zone."
- `expectedNextDistance(point, nextZone, afterNextRadius)` — Monte Carlo
  (`MC_SAMPLES` = 200) over possible following centers, average distance from
  `point` to that circle's edge (0 if inside). Used for scoring and an optional
  heatmap overlay (compute on a coarse 25×25 grid, memoize per phase).
- `exposureDirections(point, teams)` — number of distinct sectors (around
  `point`, not around the zone) containing a team within `EXPOSURE_RADIUS`.
  Edge positions should naturally score lower here than deep ones.

### 4.9 Scoring (`scoring.ts`)

Each component normalized to 0–100:

- **storm**: `100 - clamp(stormDamage / STORM_DAMAGE_CAP * 100)`.
- **contact**: penalize the number of *unwanted* contacts. If engagement is
  `fight`/`tag`, contacts with weaker teams are neutral/positive; if `avoid`,
  every contact is a penalty.
- **exposure**: `100 - exposureDirections * (100 / SECTOR_COUNT)`.
- **surge**: 100 if surge inactive or player was not in the hit group; else 0.
  Bonus +context if player chose `tag` when surge was active and they were low
  on damage.
- **positioning**: inverse of `expectedNextDistance` relative to the best grid
  cell (best cell ⇒ 100).

`total = Σ weight_i * component_i` with `SCORE_WEIGHTS` in constants
(start: storm .2, contact .2, exposure .15, surge .15, positioning .3).

### 4.10 Feedback (`feedback.ts`)

Pure rules mapping score components + analysis to 2–4 sentences. Examples:

- Destination in a `dead` sector whose wedge overlaps the next pull region
  heavily → warn: "East was dead this zone, but most of next zone's possible
  pulls are west — you'll be rotating through the stacked side next."
- Late timing + storm damage > cap/2 → bad: "Late rotate cost you X HP. Late
  only pays off when your path is clear and you need mats."
- Surge active, damage low, engagement `avoid` → bad: "Surge was active and
  your team was low on damage — you needed to tag someone."
- Exposure ≤ 2 directions → good: "Only 2 directions could hit you. Strong
  spot."

Keep every rule a small function `(ctx) => FeedbackLine | null`; feedback is
the list of non-null results, sorted bad → warn → good, capped at 4.

### 4.11 Game API (`game.ts`, `step.ts`)

```ts
createGame(seed: number, settings: GameSettings): GameState
getPhaseView(state): { zone, nextZonePreview, sectors, pullRegion, teams }
resolveDecision(state, decision): GameState   // runs step.ts, appends history
```

`step.ts` order: AI choose destinations → move everyone (with timing) →
combat → storm damage → surge → score + feedback → advance `phaseIndex` →
set `status` (`dead` if player alive = 0, `won` if last team alive or zone
table exhausted).

---

## 5. Constants (`engine/constants.ts`)

Starting values (all approximations, tune freely):

```ts
export const MAP_SIZE = 1000;
export const TEAM_COUNT = 30;
export const ROTATE_SPEED = 6;           // units/sec
export const SIM_TICK_SEC = 1;
export const SECTOR_COUNT = 8;
export const CONTACT_RADIUS = 40;
export const THIRD_PARTY_RADIUS = 90;
export const EXPOSURE_RADIUS = 150;
export const MC_SAMPLES = 200;
export const MAX_MATS = 1000;
export const LATE_REFRESH_MATS = 300;
export const MOVING_ZONE_SHIFT = 0.6;

export const ZONE_TABLE = [
  // radius, waitSec, shrinkSec, isMoving, surgeActive, stormDps
  { radius: 450, waitSec: 60, shrinkSec: 90, isMoving: false, surgeActive: false, stormDps: 1 },
  { radius: 300, waitSec: 60, shrinkSec: 70, isMoving: false, surgeActive: false, stormDps: 1 },
  { radius: 200, waitSec: 60, shrinkSec: 60, isMoving: false, surgeActive: true,  stormDps: 2 },
  { radius: 130, waitSec: 50, shrinkSec: 50, isMoving: false, surgeActive: true,  stormDps: 5 },
  { radius: 85,  waitSec: 40, shrinkSec: 40, isMoving: false, surgeActive: true,  stormDps: 8 },
  { radius: 55,  waitSec: 30, shrinkSec: 40, isMoving: true,  surgeActive: true,  stormDps: 10 },
  { radius: 35,  waitSec: 20, shrinkSec: 35, isMoving: true,  surgeActive: false, stormDps: 10 },
  { radius: 20,  waitSec: 15, shrinkSec: 30, isMoving: true,  surgeActive: false, stormDps: 10 },
  { radius: 8,   waitSec: 10, shrinkSec: 25, isMoving: true,  surgeActive: false, stormDps: 10 },
] as const;
```

Also: `SURGE_TEAM_THRESHOLD`, `SURGE_HIT_FRACTION` (0.3), `AI_FIGHT_CHANCE`
(0.5), `AVOID_ESCAPE_CHANCE` (0.6), `ARCHETYPE_WEIGHTS`, `SCORE_WEIGHTS`,
`DEAD_MAX`, `STACKED_MIN`, `STORM_DAMAGE_CAP`.

---

## 6. UI spec

### Layout

- **Desktop (≥1024px):** map canvas on the left (square, fills height);
  right column stacks `StatePanel`, `DecisionPanel`, `FeedbackCard`.
- **Mobile:** canvas on top (full width, square), panels stacked below.
- Dark theme by default (fits the subject), accessible contrast.

### Map canvas

Draw order: background grid → current circle (solid white) → next circle
(solid blue) → pull region for zone-after-next (dashed blue, toggleable) →
sector wedges around next center tinted by label (dead = green 15% alpha,
stacked = red 15% alpha, toggleable) → optional positioning heatmap → AI team
dots (gray; fighter archetype NOT revealed) → player dot (yellow) → chosen
destination marker + straight path line.

Click on canvas sets `destination`. Convert pointer coords → map coords
accounting for devicePixelRatio and canvas CSS size. Redraw via
`requestAnimationFrame` only when state changes.

After resolve: briefly animate teams moving to new positions (~1s lerp),
then show feedback.

### Panels

- **StatePanel:** zone number + phase name (Early / Mid / Endgame), teams
  alive, your alive / mats / heals, surge status badge
  ("Surge active — you are in the bottom 30% by damage").
- **DecisionPanel:** timing RadioGroup, engagement RadioGroup, "Lock call"
  button (disabled until destination chosen). Keyboard: `1/2/3` timing,
  `Q/W/E` engagement, `Enter` to lock.
- **FeedbackCard:** total score (big), five component bars, feedback lines with
  tone icons, event log, "Next zone" button.
- **SessionSummary dialog** on `dead`/`won`: placement, avg score, per-zone
  score sparkline, the most frequent bad-feedback rule ("You took avoidable
  storm damage in 4 of 7 zones"), "New game" and "Replay same seed" buttons.

### States to cover

- Empty: landing card explaining the drill in 3 lines + "Start game" + seed
  input (optional).
- Deciding: destination not yet chosen → hint text "Click the map to pick
  where you're rotating."
- Resolving: buttons disabled during animation.
- Error boundary around the canvas with a "Restart game" fallback.

---

## 7. Implementation phases

Each phase: implement → `npm run typecheck && npm test` pass → commit.

### Phase 1 — Scaffold

Scaffold per §1, set dev port 4317, add Vitest, replace README with project
description + run instructions. Page shows the app title and an empty
"Start game" card.
**Done when:** `npm run dev` serves the page on :4317; `npm test` runs (zero
tests is OK).

### Phase 2 — Engine foundations

`types.ts`, `constants.ts`, `rng.ts`, `geometry.ts`, `zones.ts`.
Tests:
- Same seed ⇒ identical zone sequence.
- Every `to` circle is fully inside its `from` circle for non-moving zones.
- Moving zones stay on-map.
- Uniform-in-disc sampler never exceeds radius (10k samples).

### Phase 3 — Lobby, AI, movement, combat, surge

`lobby.ts`, `ai-behavior.ts`, `combat.ts`, `surge.ts`, `step.ts` (without
scoring), `game.ts`.
Tests:
- Lobby has exactly `TEAM_COUNT` teams, one player.
- Deep AI destinations are within `0.4r`; edge within `[0.85r, 0.95r]`.
- A full game with a fixed "always go to center, standard, avoid" decision
  runs to completion without throwing for 50 seeds.
- Surge only damages when active and above threshold.

### Phase 4 — Analysis, scoring, feedback

`analysis.ts`, `scoring.ts`, `feedback.ts`; wire into `step.ts`.
Tests:
- Sector counts sum to the number of teams in the band.
- A point at the next-zone center scores higher `positioning` than a point on
  the far edge (average over seeds).
- `exposureDirections` for an isolated point = 0.
- Feedback returns ≤ 4 lines and includes the surge rule in a crafted
  surge-active scenario.

### Phase 5 — UI

All components in §6. Reducer actions: `START`, `SET_DESTINATION`,
`SET_TIMING`, `SET_ENGAGEMENT`, `LOCK_CALL`, `NEXT_ZONE`, `RESTART`,
`TOGGLE_OVERLAY`.
**Done when:** you can play a full game start → summary on desktop and a
~390px-wide mobile viewport, with overlays toggling correctly.

### Phase 6 — Polish (optional, only if time)

- "Scenario mode": hand-authored seeds that teach one concept each
  (dead-side trap, surge tag, moving-zone pre-rotate). Store as a small array
  of `{ seed, title, lesson }`.
- Persist session history in `localStorage` (best scores, mistake counts).
- Settings dialog: team count, difficulty (AI fighter %), show/hide hints.

---

## 8. Prompt to give the implementing agent

Copy-paste one phase at a time:

> Read `PLAN.md` fully. Implement **Phase N** exactly as specified — no
> features from later phases, nothing listed as out of scope. Keep the engine
> free of React/DOM imports and route all randomness through the seeded RNG.
> TypeScript strict, no `any`. When done, run `npm run typecheck` and
> `npm test`, fix all failures, then commit with a message describing the
> phase. Report what you built and anything in the plan you had to deviate
> from and why.

Doing one phase per prompt keeps each change reviewable and stops the agent
from inventing scope.

---

## 9. Known risks / judgment calls

- **Tuning is the real work.** First-pass constants will produce games that
  are too easy or too lethal. Expect to tweak `ZONE_TABLE`, `ROTATE_SPEED`,
  and `SCORE_WEIGHTS` after playing a few games. That's why they're
  centralized.
- **Scoring encodes opinions.** The weights decide what "a good call" is.
  Positioning (future-pull awareness) is weighted highest on purpose — it's the
  skill most players lack. Revisit after use.
- **AI archetypes are hidden on purpose.** Real lobbies don't tell you who's a
  fighter; you infer it from behavior over zones.
- **Not a substitute for comms reps with your trio** — this trains your read,
  not your team's execution.
