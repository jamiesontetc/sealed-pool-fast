# Rank My Sealed

Rank My Sealed is a tiny static web app for MTG Arena **sealed pools**.

Paste an Arena export, choose **Sealed** or **TradSealed**, click **Analyze**,
and the app reports color-pair / monocolor / colorless **power** and **depth**
from public 17Lands GIH data, plus a separate **fixing** section from Scryfall.

This is a sibling of [Rank My Draft](https://github.com/jamiesontetc/rank-my-draft).
It uses the same stack: static `public/` files, a Vercel `/api/17lands` proxy,
and `server.js` for local development. There is no build step.

## Metrics

### Pool parsing

Every card line in the paste is the sealed pool. If `Deck` / `Sideboard`
headers appear, both sections are concatenated. Basic lands are counted in
pool size but skipped for power, depth, set average, and fixing.

### Date window

The app prefers the last two weeks of 17Lands data for the inferred set and
selected format. Presence is detected from `color_ratings` (`event_type=Sealed`
or `TradSealed`) using the All Decks game count.

If that window has no sealed games, it walks backward in two-week chunks until
it finds games (or hits the set start date). When a fallback chunk is used, it
expands that window by four earlier weeks, so fallback results use a six-week
range.

### Set average GIH

Mean of `ever_drawn_win_rate` over every non-basic card in the all-decks
`card_ratings` payload for that set, format (`Sealed` or `TradSealed`), and
date window. Cards with no published GIH WR are omitted from the mean.

17Lands often withholds card-level win rates until a sample-size threshold is
met, even when `color_ratings` already shows games. The UI notes that case.
Power and depth stay empty until GIH WR is published; fixing still runs.

### Lane membership

Card colors come from the 17Lands `color` string. If that string is empty and
the card is a land, the app falls back to Scryfall color identity so colored
duals sit in the correct color and pair lanes. Colorless non-land cards stay
colorless.

- **Mono W/U/B/R/G:** card colors ⊆ that single color. Colorless cards are
  excluded from mono lanes.
- **Pair XY:** card colors ⊆ {X, Y}. This includes both monocolors and the
  gold pair.
- **Colorless:** no WUBRG colors, **excluding** cards classified as colorless
  fixing.

### Power

For each mono lane, pair lane, and the colorless lane: the top **3** unique
cards by GIH WR. Copies are deduped by name and shown with quantity and GIH %.
Basics are skipped. Cards without published GIH WR cannot appear in power.

### Depth

For each of those lanes: count of **copies** whose GIH WR is **greater than
the set average**. Shown as `N above avg` and `N / eligible copies`. Eligible
copies are lane copies that have a published GIH WR. Basics are skipped.

### Fixing (not GIH-primary)

Pool cards are enriched with the Scryfall collection API (name + set code when
present; 75-card batches; brief pause between requests). Scryfall allows
browser CORS, so this runs from the client.

Two buckets:

1. **Colorless fixing** — nonbasic lands / artifacts that produce two or more
   colors or any-color mana, plus similar land searchers, and other non-green
   duals / rocks. These cards are listed here and **excluded** from the
   Colorless power/depth lane.
2. **Green-based fixing** — green (or green+) cards that search or put lands,
   add mana of other / any colors, or are green duals. Green duals also remain
   in their color / pair power and depth lanes.

Each bucket shows:

- **Density** — fixer copies
- **Coverage** — colors those fixers enable
- **Quality** — Untapped / Conditional / Always-tapped when oracle text is
  classifiable
- A small GIH tag only on **non-land** green ramp. Fixing is never sorted by
  GIH.

## Project layout

- `public/` — static frontend Vercel serves at the site root
- `api/17lands/[...path].js` — Vercel serverless proxy for 17Lands
- `server.js` — local development only

## Run locally

```sh
node server.js
```

Then visit `http://127.0.0.1:8081`.

The local server serves the app and proxies a small allowlist of 17Lands API
endpoints. The proxy is needed because 17Lands does not send browser CORS
headers consistently for every endpoint this tool uses.

## Deploy to Vercel

Import this repository in Vercel and deploy it as a plain static project. No
build command or output directory is required. Vercel will serve `public/` and
deploy the `/api/17lands/*` serverless function automatically.

The frontend calls the proxy through relative URLs like `/api/17lands/...`, so
the same code works locally and on Vercel.

## Data sources

The app queries public 17Lands endpoints:

- `/color_ratings/data`
- `/card_ratings/data`
- `/data/filters`

Fixing uses the public Scryfall [collection API](https://scryfall.com/docs/api/cards/collection).

Please keep the visible 17Lands attribution in place if you publish or modify
the tool.
