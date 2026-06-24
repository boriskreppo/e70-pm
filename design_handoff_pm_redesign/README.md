# Handoff: Internal Project Management — Redesign

## Overview
Redesign of e70's internal project management tool (`Pregled projekata`). Two screens are covered: the project **list view** (overview + stats + filterable list) and the **project detail view** (header, meta strip, progress, tasks, team, activity timeline). Interface copy is in Bosnian/Croatian/Serbian and must stay that way.

## About the Design Files
The HTML files in this bundle are **design references** created as a static prototype — they show the intended look, layout, typography, spacing, and color usage. They are **not production code to copy directly**.

The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, SwiftUI, native, etc.), using its established components, design tokens, and patterns. If no frontend environment exists yet, choose the most appropriate stack for the project and implement the designs there.

The included `.jsx` files are written as inline-Babel React for the prototype harness — treat them as visual reference, not as importable modules.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and component states are settled. Recreate the UI pixel-perfectly using the codebase's existing libraries and patterns where possible — but keep the exact tokens, type scale, and grid hairlines listed under **Design Tokens** below.

## Art Direction
- **Theme**: Terminal × Brutalist. Operator/control-room feel.
- **Mode**: Dark only.
- **Personality**: Sharp, confident, technical, energetic, fast.
- **Density**: Spacious but information-rich.
- Hairline borders (1px on near-black) are part of the language — keep them visible.
- Oversized tabular numerals are used for stats and meta values.
- Uppercase tracked labels with a leading `▌` glyph (U+258C) mark every section heading and meta label. Letter-spacing `0.16em` on these.
- Mono is reserved for IDs, code-like strings, dates, and "machine" output.

---

## Design Tokens

### Colors
```
Background base       #08090B
Background surface    #0A0B0D
Background elevated   #0C0E11
Background hover row  #0F1114
Border hairline       #16191D  (rows, dividers)
Border subtle         #1A1D21  (inputs, chips, panels)
Border faint          #2A2E33  (separators inside text)

Text primary          #F5F6F7
Text body             #E8EAED
Text secondary        #9AA0A8
Text muted            #6B7079
Text faint            #4A4F57

Accent / primary      #C6F432  (electric lime — buttons, active state, "AKTIVNO")
Status critical/late  #FF3DAA  (magenta — overdue, KRITIČAN priority)
Status info/done      #22D3EE  (cyan — completed, info)
Status warn           #F5A524  (amber — VISOK priority, deadline approaching)
```

Color tinting convention: for chips and avatar backgrounds, use the accent at `0F` (~6%) opacity over base, with a `33`–`66` border alpha and the full color as text/dot fill.

### Typography
- **Family**: `Geist` for everything except where noted. Loaded via Google Fonts. `Geist Mono` for IDs, dates, code-like labels.
- Avoid Inter, Roboto, system stacks.
- All numbers use `font-variant-numeric: tabular-nums` and `font-feature-settings: 'tnum'`.

Type scale (px):
```
Display H1 (list)     96 / weight 600 / letter-spacing -0.05em / line-height 0.95
Display H1 (detail)   64 / weight 600 / letter-spacing -0.04em / line-height 1.0
Stat number           88 / weight 500 / letter-spacing -0.04em / line-height 0.9
Meta value (large)    22 / weight 500 / letter-spacing -0.02em
Project title (row)   17 / weight 500 / letter-spacing -0.01em
Body                  16 / weight 400 / line-height 1.55
Task title            14 / weight 500
Default UI            13 / weight 500
Small label           11 / weight 500–600
Section header        11 / weight 600 / letter-spacing 0.16em / UPPERCASE
Tiny label / meta     10 / weight 600 / letter-spacing 0.10–0.16em / UPPERCASE
Tiny number / sub     9–10 / tabular
```

### Spacing
- 4 / 8 / 12 / 14 / 16 / 18 / 20 / 24 / 28 / 32 / 40 / 48 / 56 px
- Page horizontal padding: **28px**
- Card / cell vertical padding: **20–28px**
- Section vertical breathing room (hero): **48–56px**

### Borders / Radius / Shadows
- Borders are **always 1px**, color `#16191D` (rows) or `#1A1D21` (containers).
- **Radius: 0 everywhere.** No rounded corners on cards, buttons, inputs, chips. The only round shapes are circular avatars and dot indicators (50%).
- **No drop shadows.** Depth comes from background steps, not blur.

### Motion
- `pulse` keyframe on live/active dots: 1.6s ease-out infinite, expanding box-shadow from `0 0 0 0` to `0 0 0 6px transparent`.
- Row hover transition: `background 0.15s ease` to `#0F1114`.

---

## Screen 1 — List View (`Pregled projekata`)

### Purpose
Operator dashboard — see all projects at a glance, filter by status, search, jump into one.

### Layout (1280px wide)
Vertical stack:
1. **Top bar** (auto height, ~64px) — logo mark, breadcrumb, LIVE pill on the left; date/version/user on the right. Bottom border.
2. **Hero** (~200px tall) — eyebrow, oversized headline (`Pregled\nprojekata.` — second word in lime), and right-aligned "POSLJEDNJA SINKRONIZACIJA · 16:41:58" + primary "Novi projekat" button with `⌘ N` shortcut. Bottom border.
3. **Stats strip** — 4 equal columns separated by vertical hairlines.
4. **Toolbar** — search input (with `⌘ K` hint), status filter segmented control (`SVE · 5 / AKTIVNI · 3 / ZAVRŠENI · 1 / PROBIJENI · 1`), view switcher (`LISTA / KANBAN / GANTT`).
5. **Column headers** — uppercase, tracked, 10px, `#4A4F57`.
6. **Project rows** — see schema below.
7. **Footer status bar** — `● CONNECTED · LATENCY 12ms · SYNC OK` left, build string right.

### Stat Card
Grid: 4 equal columns, separated by 1px vertical dividers (`#1A1D21`).
Each card:
- 28px / 28px / 24px padding (top / sides / bottom)
- Header row: label (left, lime/cyan/magenta `▌` + uppercase tracked) + delta (right, e.g. `+2 mj`, `62%`)
- Number: 88px, weight 500, color tied to tone (neutral white, lime, cyan, magenta), zero-padded (`05`, not `5`)
- 12-cell segmented bar at the bottom — filled cells use the tone color, empty use `#1A1D21`. Fill ratio = value / 5 (capped at 12 cells).

Stats and tones:
```
UKUPNO          neutral (#E8EAED)   delta "+2 mj"
AKTIVNI         lime    (#C6F432)   delta "62%"
ZAVRŠENI        cyan    (#22D3EE)   delta "20%"
PROBIJENI ROK   magenta (#FF3DAA)   delta "20%"
```

### Project Row
Grid columns (gap 24px, padding `22px 28px`):
```
60px   1fr   180px      140px       160px    140px       32px
ID     TITLE PROGRESS   PRIORITY    DEADLINE ACTIVITY    →
```

- **ID**: `№001`, 11px tracked, color `#4A4F57`.
- **Title block**: 17px white title (truncated, no-wrap). Below it: `StatusChip` + ` · ` + `9/14 TASK` (10px tracked muted).
- **Progress**: 2px hairline track over `#1A1D21`, fill in tone (lime by default, magenta if overdue, cyan if `ZAVRŠEN`); tone-colored `64%` to the right (32px min width, right-aligned, tabular).
- **PriorityChip**: 1px tone border at `33`, `0F` tone background, dot + uppercase priority text.
- **Deadline**: top line is the date (white, 13px, tabular; magenta if overdue). Bottom: `OSTALO 2d` or `KAŠNJENJE 5d` (10px tracked, magenta if overdue).
- **Activity**: 26px circle avatar (initials, tone bg `1F`, border `66`, text full color) + `prije 12 min` muted.
- **Chevron**: thin right-arrow glyph in `#4A4F57`.
- Top border on every row (`#16191D`); hover background `#0F1114`.

### Status & Priority Mapping
```
status:    AKTIVNO       lime    (pulse animation on dot)
           PROBIJEN ROK  magenta
           ZAVRŠEN       cyan
           PAUZIRAN      neutral
priority:  KRITIČAN      magenta
           VISOK         amber
           SREDNJI       cyan
           NIZAK         neutral
```

### Sample row data (use as fixtures)
```
№001  Sertifikati stranica za SM security             8.5.2026  +2d   AKTIVNO       VISOK     64%   9/14   prije 12 min
№002  Migracija API-ja na v3 (auth + billing)        22.5.2026 +16d  AKTIVNO       KRITIČAN  38%  11/29   prije 2 h
№003  Redesign internal dashboard-a                  14.6.2026 +39d  AKTIVNO       SREDNJI   21%   4/19   prije 1 d
№004  Postavljanje observability stacka               1.5.2026  -5d   PROBIJEN ROK  VISOK     82%  22/27   prije 4 h
№005  Onboarding flow — verzija 2                    30.4.2026  -6d   ZAVRŠEN       SREDNJI  100%  18/18   prije 6 d
```

---

## Screen 2 — Project Detail (`№001`)

### Purpose
Drill-down for a single project — read header context, scan progress + burndown, work through tasks, see team, follow activity.

### Layout (1280px wide)
1. **Top bar** — same brand, breadcrumb is `INTERNAL / PM / №001`. Right side: ghost `← NAZAD`, ghost `UREDI · ⌘E`, primary `OZNAČI ZAVRŠENO` (lime).
2. **Project header** (48/28/36 padding):
   - Eyebrow row: `№001 · ● AKTIVNO · ● VISOK PRIORITET (chip) · SECURITY · INFRA`
   - Title H1 (64px, two lines): `Sertifikati stranica\nza SM security.` — last token in lime.
   - Description paragraph, 16px, `#9AA0A8`, max-width 720px.
3. **Meta strip** — 5 equal cells, background `#0C0E11`. Each: `▌ LABEL` (10px tracked muted) + value (22px, tone-colored).
   - `ROK 08.05.2026` (amber, mono) · `OSTALO 2 dana` (amber) · `NAPREDAK 62%` (lime) · `TASKOVI 3 / 8` (neutral) · `BUDŽET 74%` (cyan)
4. **Two-column body** — left `1fr` (border-right hairline), right `360px`.

### Left column
- **Progress block** (32/28 padding):
  - `▌ NAPREDAK` heading + legend (`● ZAVRŠENO 3 · ● U TOKU 2 · ● ČEKA 3`).
  - **Stacked task bar** — 8px tall, 2px gap between segments, one segment per task colored by status tone.
  - **Burndown sparkline** — 100px tall SVG, dashed ideal line corner-to-corner, lime polyline of actuals with circular nodes (3px radius, `#0A0B0D` fill, lime stroke), dashed lime projection past today; X-axis labels are dates (`1.5 ... 8.5 DEADLINE`).
- **Tasks table**:
  - Heading `▌ TASKOVI · 8` + ghost lime `+ DODAJ TASK` action.
  - Column header row (9px tracked muted): `(checkbox) · ID · OPIS · STATUS · PRIORITET · ROK · VLASNIK (right)`.
  - Grid `32px 80px 1fr 130px 90px 70px 110px`, gap 16, padding `14px 20px`, top border `#16191D`, hover `#0F1114`.
  - Checkbox is a 22×22 square with 1.5px tone border. When `DONE`: filled with tone, `✓` glyph in `#0A0B0D`. Title gets strikethrough (decoration color `#4A4F57`) and muted text.
  - Status uses dot + uppercase status (9px tracked, tone color). Priority: tone color, 10px tracked.
  - Owner avatar identical to list view.

### Right column (sidebar)
- **`▌ TIM · 4`** — vertical stack of members. Row: 32px avatar, name (13px white) + role (10px tracked muted), task count (`3 TASK`) right-aligned muted.
- **`▌ POVEZANO`** — 3 link cards (`#0F1114` bg, 1px `#1A1D21` border):
  - Mono label (`git/sm-sec/ssl-config`), meta sub-line, `↗` glyph right.
  - Examples: `git/sm-sec/ssl-config — main · 12 commits`, `linear/SEC-142 — epic · 8 issues`, `figma/ssl-monitoring — 5 frames`.
- **`▌ AKTIVNOST`** — vertical timeline. 1px line at x=11px connecting all entries. Each entry: 24px avatar circle (member tone) + body line (`<Name>` in member color, action verb in muted, `<target>` in tone color and Geist Mono 11px) + relative time (10px tracked faint).

### Footer
`● CONNECTED · №001 · LOCKED BY MK · AUTOSAVE 16:42` left, build right.

### Sample task data (fixtures)
```
T-01  Audit postojećih SSL certifikata             DONE         MK  2.5.  VISOK
T-02  Pripremiti CSR za sm-security.ba             DONE         MK  3.5.  VISOK
T-03  Validirati domain ownership (DNS)            DONE         AN  4.5.  SREDNJI
T-04  Generisati Let's Encrypt wildcard            IN PROGRESS  MK  7.5.  VISOK
T-05  Konfigurisati nginx reverse proxy            IN PROGRESS  DJ  7.5.  KRITIČAN
T-06  Postaviti auto-renewal cron                  TODO         MK  8.5.  VISOK
T-07  Penetration test endpoint-a                  TODO         VS  8.5.  KRITIČAN
T-08  Dokumentacija + handover                     TODO         AN  8.5.  NIZAK
```

### Sample team
```
MK  Mihad K.    Lead       #C6F432
AN  Adi N.      Backend    #FF3DAA
DJ  Dženan J.   Infra      #22D3EE
VS  Vedad S.    Security   #F5A524
```

---

## Interactions & Behavior
- **Row click** → navigate to detail view (`/projects/:id`).
- **Status filter buttons** → filter list; active filter is filled with lime, text near-black.
- **View switcher (LISTA / KANBAN / GANTT)** → swap layout. Only LISTA is in scope here; the others are placeholders for follow-up.
- **Search** focuses on `⌘K`. Input has no border-radius, transparent bg over `#0F1114`.
- **Live dots** pulse continuously (see Motion).
- **Row hover** swaps background to `#0F1114` over 150ms.
- **Task checkbox click** toggles DONE → strikethrough + tone fill.
- **`OZNAČI ZAVRŠENO`** primary action transitions all in-progress tasks and project status.
- Persist nothing — wire through your store/router as appropriate.

## State Management
For each list:
- `projects: Project[]`
- `filter: 'all' | 'active' | 'done' | 'overdue'`
- `query: string`
- `view: 'list' | 'kanban' | 'gantt'`

For detail:
- `project: Project`
- `tasks: Task[]`
- `activity: ActivityEvent[]`

Derived: `progress = round(doneCount / total * 100)`, `daysLeft = differenceInCalendarDays(deadline, today)`, `overdue = daysLeft < 0`.

## Assets
No raster images or vendor icons used. The few glyphs are inline SVGs (search, chevron) and Unicode characters (`▌`, `●`, `↗`, `✓`, `◐`, `○`). The "e7" logo mark is a 28×28 lime square with the literal text `e7` in 14px weight 700.

If the production codebase has an icon system (Lucide, Phosphor, custom SVG sprite), prefer matching those for `search` and `chevron-right` — keep stroke-width 1.5 to match the prototype.

## Files
- `Pregled projekata.html` — entry point. Mounts a design canvas (pan/zoom shell with two artboards) — note the canvas chrome itself is **not** part of the product UI; only the contents of the artboards are.
- `list-view.jsx` — full list-view component with sample data at the top of the file.
- `detail-view.jsx` — full detail-view component with task / team / timeline fixtures.
- `design-canvas.jsx` — the prototype harness (ignore for production).

The two `.jsx` files contain the visual source-of-truth. All exact pixel values, color hexes, and copy can be lifted from them.
