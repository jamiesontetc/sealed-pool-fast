const API_BASE = window.location.origin;
const API_PROXY_PREFIX = "/api/17lands";
const SCRYFALL_COLLECTION_URL = "https://api.scryfall.com/cards/collection";
const WUBRG = ["W", "U", "B", "R", "G"];
const MONO_CODES = [...WUBRG];
const PAIR_CODES_ORDER = ["WU", "UB", "BR", "RG", "WG", "WB", "UR", "BG", "WR", "UG"];

const BASIC_LANDS = new Set([
  "plains",
  "island",
  "swamp",
  "mountain",
  "forest",
  "wastes",
  "snow-covered plains",
  "snow-covered island",
  "snow-covered swamp",
  "snow-covered mountain",
  "snow-covered forest",
]);

const COLOR_NAMES = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
  C: "Colorless",
};

const PAIR_NAMES = {
  WU: "Azorius (WU)",
  UB: "Dimir (UB)",
  BR: "Rakdos (BR)",
  RG: "Gruul (RG)",
  WG: "Selesnya (GW)",
  WB: "Orzhov (WB)",
  UR: "Izzet (UR)",
  BG: "Golgari (BG)",
  WR: "Boros (RW)",
  UG: "Simic (GU)",
};

const SET_NAMES = {
  HOB: "The Hobbit",
  MSH: "Marvel Super Heroes",
  SOS: "Secrets of Strixhaven",
  TMT: "Teenage Mutant Ninja Turtles",
  ECL: "Lorwyn Eclipsed",
  TLA: "Avatar: The Last Airbender",
  OM1: "Through the Omenpaths",
  EOE: "Edge of Eternities",
  FIN: "Final Fantasy",
  TDM: "Tarkir: Dragonstorm",
  DFT: "Aetherdrift",
  PIO: "Pioneer Masters",
  FDN: "Foundations",
  DSK: "Duskmourn",
  BLB: "Bloomburrow",
  MH3: "Modern Horizons 3",
  OTJ: "Thunder Junction",
  MKM: "Karlov Manor",
  LCI: "Caverns of Ixalan",
  WOE: "Wilds of Eldraine",
  LTR: "Lord of the Rings",
  MOM: "March of the Machine",
  ONE: "All Will Be One",
  BRO: "Brothers' War",
  DMU: "Dominaria United",
  SNC: "New Capenna",
  NEO: "Neon Dynasty",
  VOW: "Crimson Vow",
  MID: "Midnight Hunt",
  AFR: "Forgotten Realms",
  STX: "Strixhaven",
  KHM: "Kaldheim",
  ZNR: "Zendikar Rising",
};

const SAMPLE_EXPORT = `Deck
1 Belladonna Took (HOB) 12
1 Bofur, Reliable Guardian (HOB) 8
1 Dwarven Provisioner (HOB) 19
1 Celebrate the Mountain-king (HOB) 14
1 Fíli the Pathfinder (HOB) 21
1 Bilbo, Luckwearer (HOB) 44
1 Bilbo Baggins, Burglar (HOB) 46
1 Confusticate and Bebother (HOB) 51
1 Elven Raft-Steerer (HOB) 58
1 Bilbo's Deadly Slice (HOB) 73
1 Crude Bent Blade (HOB) 77
1 Desolation Prowler (HOB) 80
1 Bombur, Gentle Dreamer (HOB) 101
1 Bothersome Noisemaker (HOB) 104
1 Dáin Ironfoot (HOB) 109
1 Attercop (HOB) 131
1 Beorn, Reluctant Host (HOB) 134
1 Boughside Wanderers (HOB) 138
1 Wood Elves (HOB) 167
1 Through the Forest Gate (HOB) 164
1 Mirkwood Nurturer (HOB) 186
1 Bard the Bowman (HOB) 172
1 Patient Instructor (HOB) 189
1 Bolg of the North (HOB) 174
1 Duskwatch Hunter (HOB) 178
1 Nori, Teller of Tales (HOB) 188
1 Thranduil, Sindarin Liege (HOB) 191
1 Giant's Boulder (HOB) 221
1 Thrór's Map (HOB) 236
1 Long-Bodied Grey Dog (HOB) 240
1 Dwarven Mattock (HOB) 218
1 Hobbit Hole (HOB) 256
1 Elven Passage (HOB) 250
1 Mirkwood (HOB) 261
1 Lake-town (HOB) 258
2 Plains (HOB) 272
2 Island (HOB) 274
2 Swamp (HOB) 276
2 Mountain (HOB) 278
2 Forest (HOB) 280

Sideboard
1 Elvenking's Halls (HOB) 251
1 Goblin-town (HOB) 253
1 Iron Hills (HOB) 257
1 The Arkenstone (HOB) 210
1 Beorn the Fierce (HOB) 133
1 Bard, King of Dale (HOB) 171
1 The Chief Warg (HOB) 176`;

let filtersPromise;
let lastLaneModel = null;
const sortState = {
  pairs: { key: "depth", dir: "desc" },
  mono: { key: "pair", dir: "asc" },
};

const elements = {
  textarea: document.querySelector("#arena-export"),
  analyzeButton: document.querySelector("#analyze-button"),
  sampleButton: document.querySelector("#sample-button"),
  status: document.querySelector("#status"),
  results: document.querySelector("#results"),
  setName: document.querySelector("#set-name"),
  formatName: document.querySelector("#format-name"),
  dateRange: document.querySelector("#date-range"),
  setAvgGih: document.querySelector("#set-avg-gih"),
  poolSize: document.querySelector("#pool-size"),
  gihNote: document.querySelector("#gih-note"),
  pairsTable: document.querySelector("#pairs-table"),
  monoTable: document.querySelector("#mono-table"),
  colorlessCard: document.querySelector("#colorless-card"),
  colorlessFixingMeta: document.querySelector("#colorless-fixing-meta"),
  colorlessFixingList: document.querySelector("#colorless-fixing-list"),
  greenFixingMeta: document.querySelector("#green-fixing-meta"),
  greenFixingList: document.querySelector("#green-fixing-list"),
};

function selectedFormat() {
  return document.querySelector('input[name="format"]:checked')?.value || "Sealed";
}

function normalizeName(value) {
  return String(value)
    .split(" // ")[0]
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getDateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 14);
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

function parseDate(dateString) {
  return new Date(`${dateString}T00:00:00Z`);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function getPreviousDateRange(range) {
  const end = parseDate(range.startDate);
  const start = addDays(end, -14);
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

function expandRangeEarlier(range, days) {
  return {
    startDate: formatDate(addDays(parseDate(range.startDate), -days)),
    endDate: range.endDate,
  };
}

function formatPercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatInteger(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toLocaleString();
}

function parseArenaExport(text) {
  const cards = [];
  const setCounts = new Map();
  const linePattern = /^\s*(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]{2,8})\)\s+\d+)?\s*$/i;

  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(deck|sideboard|commander|companion):?\s*$/i.test(line)) {
      continue;
    }

    const match = line.match(linePattern);
    if (!match) continue;

    const quantity = Number(match[1]);
    const name = match[2].trim();
    const setCode = match[3]?.toUpperCase();
    cards.push({ quantity, name, setCode });
    if (setCode) {
      setCounts.set(setCode, (setCounts.get(setCode) ?? 0) + quantity);
    }
  }

  if (cards.length === 0) {
    throw new Error(
      "Paste a valid Arena export with card lines like: 1 Card Name or 1 Card Name (HOB) 123."
    );
  }

  const setCode = [...setCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const poolCopies = cards.reduce((sum, card) => sum + card.quantity, 0);
  return { cards: mergeCardsByName(cards), setCode, poolCopies };
}

function mergeCardsByName(cards) {
  const byName = new Map();
  for (const card of cards) {
    const key = normalizeName(card.name);
    const existing = byName.get(key);
    if (existing) {
      existing.quantity += card.quantity;
      if (!existing.setCode && card.setCode) existing.setCode = card.setCode;
    } else {
      byName.set(key, { ...card });
    }
  }
  return [...byName.values()];
}

function isBasicLand(card, scryfallByName = new Map()) {
  if (BASIC_LANDS.has(normalizeName(card.name))) return true;
  const sf = scryfallByName.get(normalizeName(card.name));
  return Boolean(sf?.type_line && /^basic\b/i.test(sf.type_line));
}

function buildCardDataMap(cardData) {
  return new Map((cardData ?? []).map((card) => [normalizeName(card.name), card]));
}

function parseColorString(value) {
  if (!value) return [];
  return [...String(value)].filter((color) => WUBRG.includes(color));
}

function uniqueColors(colors) {
  return WUBRG.filter((color) => colors.includes(color));
}

function describeLane(code) {
  if (code === "C") return "Colorless";
  if (code.length === 1) return `Mono ${COLOR_NAMES[code] ?? code} (${code})`;
  return PAIR_NAMES[code] ?? code;
}

function formatLabel(format) {
  return format === "TradSealed" ? "TradSealed" : "Sealed";
}

function buildUrl(path, params) {
  const url = new URL(`${API_PROXY_PREFIX}${path}`, API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

async function fetchJson(url, label = "17Lands") {
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`Could not fetch ${label} data. Check your connection and try again.`);
  }
  if (!response.ok) {
    throw new Error(`${label} request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchFilters() {
  filtersPromise ??= fetchJson(buildUrl("/data/filters", {}));
  return filtersPromise;
}

async function fetchCardRatings({ setCode, format, startDate, endDate }) {
  return fetchJson(
    buildUrl("/card_ratings/data", {
      expansion: setCode,
      format,
      start_date: startDate,
      end_date: endDate,
    })
  );
}

async function fetchColorRatings({ setCode, format, startDate, endDate }) {
  return fetchJson(
    buildUrl("/color_ratings/data", {
      expansion: setCode,
      event_type: format,
      start_date: startDate,
      end_date: endDate,
      combine_splash: "true",
    })
  );
}

function hasSealedGames(colorRatings) {
  const allDecksRow = colorRatings.find((row) => row.short_name === "All");
  return (allDecksRow?.games ?? 0) > 0;
}

function getSetStartDate(filters, setCode) {
  const rawStartDate = filters.start_dates?.[setCode];
  return rawStartDate ? new Date(rawStartDate) : new Date("2020-01-01T00:00:00Z");
}

async function findMostRecentAvailableRange(setCode, format, preferredRange, onProgress) {
  const filters = await fetchFilters();
  const setStartDate = getSetStartDate(filters, setCode);
  let searchRange = preferredRange;
  let checkedWindows = 0;
  let fallbackUsed = false;

  for (;;) {
    checkedWindows += 1;
    const colorRatings = await fetchColorRatings({
      setCode,
      format,
      startDate: searchRange.startDate,
      endDate: searchRange.endDate,
    });

    if (hasSealedGames(colorRatings)) {
      if (!fallbackUsed) {
        return { range: searchRange, colorRatings, fallbackUsed };
      }

      const expandedRange = expandRangeEarlier(searchRange, 28);
      const expandedColorRatings = await fetchColorRatings({
        setCode,
        format,
        startDate: expandedRange.startDate,
        endDate: expandedRange.endDate,
      });

      return {
        range: expandedRange,
        colorRatings: expandedColorRatings,
        fallbackUsed,
      };
    }

    const previousChunk = getPreviousDateRange(searchRange);
    if (parseDate(previousChunk.endDate) <= setStartDate) {
      return { range: preferredRange, colorRatings, fallbackUsed: false };
    }

    fallbackUsed = true;
    searchRange = previousChunk;

    if (checkedWindows % 3 === 0) {
      onProgress?.(`Searching older ${formatLabel(format)} data near ${searchRange.endDate}...`);
    }
  }
}

function countMatchedCards(cards, cardData) {
  const cardDataByName = buildCardDataMap(cardData);
  const uniqueNames = new Set(
    cards.filter((card) => !isBasicLand(card)).map((card) => normalizeName(card.name))
  );
  let matches = 0;
  for (const name of uniqueNames) {
    if (cardDataByName.has(name)) matches += 1;
  }
  return matches;
}

async function inferSetFromCards(cards, format, range) {
  const filters = await fetchFilters();
  const expansions = (filters.expansions ?? []).filter((expansion) => {
    const formats = filters.formats_by_expansion?.[expansion] ?? [];
    return formats.includes(format);
  });
  const uniqueNonBasics = new Set(
    cards.filter((card) => !isBasicLand(card)).map((card) => normalizeName(card.name))
  );
  const requiredMatches = Math.max(3, Math.ceil(uniqueNonBasics.size * 0.6));
  let bestMatch = null;

  for (const expansion of expansions) {
    const cardData = await fetchCardRatings({
      setCode: expansion,
      format,
      startDate: range.startDate,
      endDate: range.endDate,
    });
    const matches = countMatchedCards(cards, cardData);
    if (!bestMatch || matches > bestMatch.matches) {
      bestMatch = { setCode: expansion, cardData, matches };
    }
    if (matches >= requiredMatches) {
      return bestMatch;
    }
  }

  if (bestMatch?.matches > 0) {
    return bestMatch;
  }
  throw new Error("Could not infer the set. Try pasting an Arena export that includes set codes.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scryfallIndexKeys(card) {
  const names = [card.name, card.name?.split(" // ")[0]];
  if (Array.isArray(card.card_faces)) {
    for (const face of card.card_faces) names.push(face.name);
  }
  return [...new Set(names.filter(Boolean).map(normalizeName))];
}

async function fetchScryfallCollection(cards) {
  const identifiers = [];
  const seen = new Set();
  for (const card of cards) {
    const key = `${normalizeName(card.name)}|${card.setCode ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const identifier = { name: card.name.split(" // ")[0] };
    if (card.setCode) identifier.set = card.setCode.toLowerCase();
    identifiers.push(identifier);
  }

  const byName = new Map();
  const notFound = [];

  for (let i = 0; i < identifiers.length; i += 75) {
    if (i > 0) await sleep(120);
    const chunk = identifiers.slice(i, i + 75);
    const response = await fetch(SCRYFALL_COLLECTION_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ identifiers: chunk }),
    });
    if (!response.ok) {
      throw new Error(`Scryfall request failed: ${response.status} ${response.statusText}`);
    }
    const payload = await response.json();
    for (const card of payload.data ?? []) {
      for (const key of scryfallIndexKeys(card)) {
        if (!byName.has(key)) byName.set(key, card);
      }
    }
    notFound.push(...(payload.not_found ?? []));
  }

  const retry = notFound
    .map((item) => item.name)
    .filter(Boolean)
    .filter((name) => !byName.has(normalizeName(name)));
  if (retry.length > 0) {
    await sleep(120);
    const uniqueRetry = [...new Set(retry)].map((name) => ({ name }));
    for (let i = 0; i < uniqueRetry.length; i += 75) {
      if (i > 0) await sleep(120);
      const chunk = uniqueRetry.slice(i, i + 75);
      const response = await fetch(SCRYFALL_COLLECTION_URL, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({ identifiers: chunk }),
      });
      if (!response.ok) continue;
      const payload = await response.json();
      for (const card of payload.data ?? []) {
        for (const key of scryfallIndexKeys(card)) {
          if (!byName.has(key)) byName.set(key, card);
        }
      }
    }
  }

  return byName;
}

function scryfallOracle(sf) {
  if (!sf) return "";
  if (sf.oracle_text) return sf.oracle_text;
  if (Array.isArray(sf.card_faces)) {
    return sf.card_faces.map((face) => face.oracle_text || "").join("\n");
  }
  return "";
}

function scryfallTypeLine(sf) {
  if (!sf) return "";
  if (sf.type_line) return sf.type_line;
  if (Array.isArray(sf.card_faces)) {
    return sf.card_faces.map((face) => face.type_line || "").join(" // ");
  }
  return "";
}

function producedMana(sf) {
  const values = [...(sf?.produced_mana ?? [])];
  if (Array.isArray(sf?.card_faces)) {
    for (const face of sf.card_faces) {
      values.push(...(face.produced_mana ?? []));
    }
  }
  return uniqueColors(values);
}

function isLandCard(sf) {
  return /\bland\b/i.test(scryfallTypeLine(sf));
}

function isArtifactCard(sf) {
  return /\bartifact\b/i.test(scryfallTypeLine(sf));
}

function mentionsAnyColorMana(oracle) {
  return /mana of any color|any one color|one mana of any color|mana of any one color|any color of mana/i.test(
    oracle
  );
}

function mentionsLandSearch(oracle) {
  return (
    /search your library for (?:a |up to .*?)?(?:basic )?(?:land|plains|island|swamp|mountain|forest)/i.test(
      oracle
    ) ||
    /put (?:a |that |those |any number of )?(?:basic )?land/i.test(oracle) ||
    /look at the top .*land cards? from among them onto the battlefield/i.test(oracle)
  );
}

function qualityBand(sf) {
  const oracle = scryfallOracle(sf);
  if (!oracle) return null;
  if (!isLandCard(sf) && !isArtifactCard(sf)) return null;
  if (/enters(?: the battlefield)? tapped unless/i.test(oracle)) return "Conditional";
  if (/this land enters tapped unless/i.test(oracle)) return "Conditional";
  if (/enters(?: the battlefield)? tapped/i.test(oracle) || /this land enters tapped/i.test(oracle)) {
    return "Always-tapped";
  }
  if (isLandCard(sf) || mentionsAnyColorMana(oracle) || producedMana(sf).length > 0) {
    return "Untapped";
  }
  return null;
}

function coverageFromCard(sf) {
  const oracle = scryfallOracle(sf);
  const produced = producedMana(sf);
  if (mentionsAnyColorMana(oracle) || /basic land card/i.test(oracle)) {
    return [...WUBRG];
  }
  if (/search your library for a forest card|put .* forest card/i.test(oracle)) return ["G"];
  if (/search your library for a plains card/i.test(oracle)) return ["W"];
  if (/search your library for an island card/i.test(oracle)) return ["U"];
  if (/search your library for a swamp card/i.test(oracle)) return ["B"];
  if (/search your library for a mountain card/i.test(oracle)) return ["R"];
  if (produced.length > 0) return produced;
  return uniqueColors(sf?.color_identity ?? []);
}

function getLaneColors(card, cardDataByName, scryfallByName) {
  const apiCard = cardDataByName.get(normalizeName(card.name));
  const from17 = parseColorString(apiCard?.color);
  if (from17.length > 0) return from17;
  const sf = scryfallByName.get(normalizeName(card.name));
  return uniqueColors(sf?.color_identity ?? []);
}

function cardFitsLane(laneColors, cardColors) {
  if (cardColors.length === 0) return false;
  return cardColors.every((color) => laneColors.includes(color));
}

function classifyFixing(card, scryfallByName) {
  const sf = scryfallByName.get(normalizeName(card.name));
  if (!sf || isBasicLand(card, scryfallByName)) return null;

  const oracle = scryfallOracle(sf);
  const cardColors = uniqueColors(sf.colors ?? []);
  const identity = uniqueColors(sf.color_identity ?? []);
  const produced = producedMana(sf);
  const land = isLandCard(sf);
  const artifact = isArtifactCard(sf);
  const isGreen = cardColors.includes("G") || identity.includes("G");
  const anyColor = mentionsAnyColorMana(oracle);
  const landFix = mentionsLandSearch(oracle);
  const multiMana = produced.length >= 2 || anyColor;
  const addsOffGreen = produced.some((color) => color !== "G") || anyColor;
  const greenDual = land && isGreen && identity.length >= 2;

  const isFixer =
    ((land || artifact) && (multiMana || landFix)) ||
    (isGreen && (landFix || addsOffGreen || greenDual));

  if (!isFixer) return null;

  const bucket = isGreen ? "green" : "colorless";
  return {
    bucket,
    quality: qualityBand(sf),
    coverage: coverageFromCard(sf),
    isLand: land,
    name: card.name,
    quantity: card.quantity,
  };
}

function calculateSetAverage(cardData) {
  const rates = (cardData ?? [])
    .filter((card) => !BASIC_LANDS.has(normalizeName(card.name)))
    .map((card) => card.ever_drawn_win_rate)
    .filter((value) => typeof value === "number" && !Number.isNaN(value));
  if (rates.length === 0) return null;
  return rates.reduce((sum, value) => sum + value, 0) / rates.length;
}

function buildLaneStats(cards, laneColors, cardDataByName, scryfallByName, setAverage, options = {}) {
  const excludeColorlessFixers = Boolean(options.excludeColorlessFixers);
  const members = [];

  for (const card of cards) {
    if (isBasicLand(card, scryfallByName)) continue;
    const colors = getLaneColors(card, cardDataByName, scryfallByName);
    const colorless = colors.length === 0;
    if (laneColors.length === 0) {
      if (!colorless) continue;
      const fixing = classifyFixing(card, scryfallByName);
      if (excludeColorlessFixers && fixing?.bucket === "colorless") continue;
    } else if (!cardFitsLane(laneColors, colors)) {
      continue;
    }

    const apiCard = cardDataByName.get(normalizeName(card.name));
    const gihWr =
      typeof apiCard?.ever_drawn_win_rate === "number" ? apiCard.ever_drawn_win_rate : null;
    members.push({
      name: card.name,
      quantity: card.quantity,
      gihWr,
      games: apiCard?.ever_drawn_game_count ?? null,
      colors,
    });
  }

  const eligible = members.filter((card) => typeof card.gihWr === "number");
  const above = eligible.filter((card) => setAverage !== null && card.gihWr > setAverage);
  const power = [...eligible]
    .sort((a, b) => b.gihWr - a.gihWr || a.name.localeCompare(b.name))
    .slice(0, 3);

  return {
    members,
    power,
    depthCopies: above.reduce((sum, card) => sum + card.quantity, 0),
    eligibleCopies: eligible.reduce((sum, card) => sum + card.quantity, 0),
    copies: members.reduce((sum, card) => sum + card.quantity, 0),
  };
}

function buildFixingBuckets(cards, cardDataByName, scryfallByName) {
  const colorless = [];
  const green = [];

  for (const card of cards) {
    if (isBasicLand(card, scryfallByName)) continue;
    const fixing = classifyFixing(card, scryfallByName);
    if (!fixing) continue;
    const apiCard = cardDataByName.get(normalizeName(card.name));
    const row = {
      ...fixing,
      gihWr:
        typeof apiCard?.ever_drawn_win_rate === "number" ? apiCard.ever_drawn_win_rate : null,
    };
    if (row.bucket === "green") green.push(row);
    else colorless.push(row);
  }

  return { colorless, green };
}

function summarizeFixing(rows) {
  const density = rows.reduce((sum, row) => sum + row.quantity, 0);
  const coverage = uniqueColors(rows.flatMap((row) => row.coverage));
  const bands = { Untapped: 0, Conditional: 0, "Always-tapped": 0 };
  for (const row of rows) {
    if (row.quality && bands[row.quality] !== undefined) {
      bands[row.quality] += row.quantity;
    }
  }
  return { density, coverage, bands };
}

function setLoading(isLoading) {
  elements.analyzeButton.disabled = isLoading;
  elements.analyzeButton.textContent = isLoading ? "Analyzing..." : "Analyze";
}

function showStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
}

function renderPips(colors) {
  const wrap = document.createElement("span");
  wrap.className = "pips";
  const pips = colors.length > 0 ? colors : ["C"];
  for (const color of pips) {
    const pip = document.createElement("span");
    pip.className = `pip pip-${color}`;
    pip.textContent = color;
    wrap.append(pip);
  }
  return wrap;
}

function renderPowerChips(power) {
  const wrap = document.createElement("div");
  wrap.className = "chips";
  if (power.length === 0) {
    const empty = document.createElement("span");
    empty.className = "chip-empty";
    empty.textContent = "No published GIH";
    wrap.append(empty);
    return wrap;
  }
  for (const card of power) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.append(renderPips(card.colors));
    const name = document.createElement("span");
    name.textContent = card.quantity > 1 ? `${card.quantity} ${card.name}` : card.name;
    const wr = document.createElement("small");
    wr.textContent = formatPercent(card.gihWr);
    chip.append(name, wr);
    wrap.append(chip);
  }
  return wrap;
}

function renderDepth(lane) {
  const wrap = document.createElement("div");
  wrap.className = "depth-cell";
  const main = document.createElement("span");
  main.textContent = `${formatInteger(lane.depthCopies)} above avg`;
  const sub = document.createElement("small");
  sub.textContent = `${formatInteger(lane.depthCopies)} / ${formatInteger(lane.eligibleCopies)} eligible`;
  wrap.append(main, sub);
  return wrap;
}

function sortLanes(lanes, tableKey) {
  const { key, dir } = sortState[tableKey];
  const sign = dir === "asc" ? 1 : -1;
  return [...lanes].sort((a, b) => {
    if (key === "depth") {
      return (
        (a.depthCopies - b.depthCopies) * sign ||
        (a.eligibleCopies - b.eligibleCopies) * sign ||
        a.code.localeCompare(b.code)
      );
    }
    if (key === "power") {
      const aTop = a.power[0]?.gihWr ?? -1;
      const bTop = b.power[0]?.gihWr ?? -1;
      return (aTop - bTop) * sign || a.code.localeCompare(b.code);
    }
    return a.label.localeCompare(b.label) * sign;
  });
}

function renderLaneTable(tableEl, lanes, tableKey) {
  tableEl.replaceChildren();
  for (const lane of sortLanes(lanes, tableKey)) {
    const tr = document.createElement("tr");
    const pairTd = document.createElement("td");
    const pair = document.createElement("div");
    pair.className = "pair-cell";
    pair.append(renderPips([...lane.code]));
    const name = document.createElement("span");
    name.textContent = lane.label;
    pair.append(name);
    pairTd.append(pair);

    const depthTd = document.createElement("td");
    depthTd.append(renderDepth(lane));

    const powerTd = document.createElement("td");
    powerTd.append(renderPowerChips(lane.power));

    tr.append(pairTd, depthTd, powerTd);
    tableEl.append(tr);
  }
}

function renderColorless(lane) {
  elements.colorlessCard.replaceChildren();
  const depth = document.createElement("p");
  depth.className = "fixing-meta";
  depth.textContent = `${formatInteger(lane.depthCopies)} above avg · ${formatInteger(lane.depthCopies)} / ${formatInteger(lane.eligibleCopies)} eligible · ${formatInteger(lane.copies)} copies in lane`;
  elements.colorlessCard.append(depth, renderPowerChips(lane.power));
}

function renderFixingBucket(metaEl, listEl, rows) {
  const summary = summarizeFixing(rows);
  const bandBits = Object.entries(summary.bands)
    .filter(([, count]) => count > 0)
    .map(([band, count]) => `${count} ${band.toLowerCase()}`);
  const coverage = summary.coverage.length > 0 ? summary.coverage.join("") : "none";
  metaEl.textContent = `${formatInteger(summary.density)} fixer copies · coverage ${coverage}${
    bandBits.length ? ` · ${bandBits.join(", ")}` : ""
  }`;

  listEl.replaceChildren();
  if (rows.length === 0) {
    const li = document.createElement("li");
    li.textContent = "None found";
    listEl.append(li);
    return;
  }

  for (const row of rows) {
    const li = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = row.quantity > 1 ? `${row.quantity} ${row.name}` : row.name;
    const meta = document.createElement("span");
    const bits = [];
    if (row.quality) bits.push(row.quality);
    if (row.coverage.length) bits.push(`enables ${row.coverage.join("")}`);
    if (!row.isLand && row.bucket === "green" && row.gihWr !== null) {
      bits.push(`GIH ${formatPercent(row.gihWr)}`);
    }
    meta.textContent = bits.join(" · ") || "Fixer";
    li.append(title, meta);
    if (row.quality) {
      const quality = document.createElement("span");
      quality.className = `quality ${
        row.quality === "Untapped"
          ? "quality-untapped"
          : row.quality === "Conditional"
            ? "quality-conditional"
            : "quality-tapped"
      }`;
      quality.textContent = row.quality;
      li.append(quality);
    }
    listEl.append(li);
  }
}

function updateSortButtons() {
  for (const button of document.querySelectorAll(".sort-button")) {
    const table = button.dataset.table;
    const active = sortState[table]?.key === button.dataset.sort;
    button.dataset.active = active ? "true" : "false";
    button.dataset.dir = active && sortState[table].dir === "asc" ? "↑" : "↓";
  }
}

function renderLaneModel(model) {
  lastLaneModel = model;
  renderLaneTable(elements.pairsTable, model.pairs, "pairs");
  renderLaneTable(elements.monoTable, model.mono, "mono");
  renderColorless(model.colorless);
  renderFixingBucket(elements.colorlessFixingMeta, elements.colorlessFixingList, model.fixing.colorless);
  renderFixingBucket(elements.greenFixingMeta, elements.greenFixingList, model.fixing.green);
  updateSortButtons();
}

function renderResults({
  setCode,
  format,
  range,
  fallbackUsed,
  setAverage,
  poolCopies,
  gihPublishedCount,
  model,
}) {
  elements.setName.textContent = `${SET_NAMES[setCode] ?? setCode} (${setCode})`;
  elements.formatName.textContent = formatLabel(format);
  elements.dateRange.textContent = `${range.startDate} to ${range.endDate}${
    fallbackUsed ? " (most recent available)" : ""
  }`;
  elements.setAvgGih.textContent = formatPercent(setAverage);
  elements.poolSize.textContent = `${formatInteger(poolCopies)} cards`;

  if (gihPublishedCount === 0) {
    elements.gihNote.textContent =
      "17Lands has games for this window but has not published card-level GIH WR yet (sample sizes are below their display threshold). Power and depth will fill in as more Sealed data lands. Fixing still uses Scryfall.";
    elements.gihNote.classList.remove("hidden");
  } else {
    elements.gihNote.classList.add("hidden");
  }

  renderLaneModel(model);
  elements.results.classList.remove("hidden");
}

async function analyzeExport() {
  const exportText = elements.textarea.value.trim();
  if (!exportText) {
    showStatus("Paste an Arena sealed pool first.", true);
    return;
  }

  const format = selectedFormat();
  setLoading(true);
  elements.results.classList.add("hidden");
  showStatus("Parsing pool...");

  try {
    const parsed = parseArenaExport(exportText);
    const preferredRange = getDateRange();
    let setCode = parsed.setCode;

    showStatus("Fetching 17Lands data...");
    if (!setCode) {
      showStatus("Inferring set from card names...");
      const inferredSet = await inferSetFromCards(parsed.cards, format, preferredRange);
      setCode = inferredSet.setCode;
    }

    showStatus(`Finding the latest ${formatLabel(format)} data...`);
    const { range, fallbackUsed } = await findMostRecentAvailableRange(
      setCode,
      format,
      preferredRange,
      showStatus
    );

    showStatus("Loading card ratings...");
    const allCardData = await fetchCardRatings({
      setCode,
      format,
      startDate: range.startDate,
      endDate: range.endDate,
    });
    const cardDataByName = buildCardDataMap(allCardData);
    const setAverage = calculateSetAverage(allCardData);
    const gihPublishedCount = (allCardData ?? []).filter(
      (card) => typeof card.ever_drawn_win_rate === "number"
    ).length;

    showStatus("Enriching pool cards with Scryfall...");
    let scryfallByName = new Map();
    try {
      scryfallByName = await fetchScryfallCollection(
        parsed.cards.filter((card) => !isBasicLand(card))
      );
    } catch (error) {
      showStatus(`${error.message} Continuing without fixing details.`);
    }

    const pairs = PAIR_CODES_ORDER.map((code) => ({
      code,
      label: describeLane(code),
      ...buildLaneStats(parsed.cards, [...code], cardDataByName, scryfallByName, setAverage),
    }));
    const mono = MONO_CODES.map((code) => ({
      code,
      label: describeLane(code),
      ...buildLaneStats(parsed.cards, [code], cardDataByName, scryfallByName, setAverage),
    }));
    const colorless = {
      code: "C",
      label: describeLane("C"),
      ...buildLaneStats(parsed.cards, [], cardDataByName, scryfallByName, setAverage, {
        excludeColorlessFixers: true,
      }),
    };
    const fixing = buildFixingBuckets(parsed.cards, cardDataByName, scryfallByName);

    renderResults({
      setCode,
      format,
      range,
      fallbackUsed,
      setAverage,
      poolCopies: parsed.poolCopies,
      gihPublishedCount,
      model: { pairs, mono, colorless, fixing },
    });

    if (gihPublishedCount === 0) {
      showStatus("Done. Card-level GIH is unpublished for this window; fixing and lane membership still ran.");
    } else {
      showStatus("Done.");
    }
  } catch (error) {
    showStatus(error.message, true);
  } finally {
    setLoading(false);
  }
}

elements.analyzeButton.addEventListener("click", analyzeExport);
elements.sampleButton.addEventListener("click", () => {
  elements.textarea.value = SAMPLE_EXPORT;
  elements.textarea.focus();
  showStatus("Sample sealed pool loaded.");
});

for (const button of document.querySelectorAll(".sort-button")) {
  button.addEventListener("click", () => {
    const table = button.dataset.table;
    const key = button.dataset.sort;
    if (!lastLaneModel || !sortState[table]) return;
    if (sortState[table].key === key) {
      sortState[table].dir = sortState[table].dir === "asc" ? "desc" : "asc";
    } else {
      sortState[table] = {
        key,
        dir: key === "pair" ? "asc" : "desc",
      };
    }
    renderLaneModel(lastLaneModel);
  });
}
