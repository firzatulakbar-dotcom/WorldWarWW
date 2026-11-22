(() => {
  "use strict";

  const canvas = document.getElementById("worldMap");
  const ctx = canvas.getContext("2d");
  const shell = document.getElementById("gameShell");
  const contextCard = document.getElementById("contextCard");
  const contextContent = document.getElementById("contextContent");
  const toastEl = document.getElementById("toast");
  const loadingScreen = document.getElementById("loadingScreen");
  const loadingTitle = document.getElementById("loadingTitle");
  const loadingProgressBar = document.getElementById("loadingProgressBar");
  const loadingPercent = document.getElementById("loadingPercent");
  const loadingBytes = document.getElementById("loadingBytes");
  const loadingError = document.getElementById("loadingError");
  const retryLoadBtn = document.getElementById("retryLoadBtn");

  // WEBSITE BUILD: all map data is fetched automatically when a visitor opens the site.
  // There is no BAT installer, local data folder, VS Code, or separate player setup.
  // A browser Cache API entry keeps the global datasets between visits on HTTPS sites.
  // ADM1 regions are normalized once; province-name and parent-country fields
  // remain separate so country labels never leak into province labels.
  const DATA_CACHE_NAME = "world-war-map-data-v3.9.3";
  const WORLD_URLS = [
    "https://cdn.jsdelivr.net/gh/datasets/geo-countries@main/data/countries.geojson",
    "https://raw.githubusercontent.com/datasets/geo-countries/main/data/countries.geojson",
    "https://datahub.io/core/geo-countries/_r/-/data/countries.geojson"
  ];
  const GLOBAL_ADM1_URLS = [
    "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_10m_admin_1_states_provinces.geojson",
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson",
    "https://datahub.io/core/geo-ne-admin1/_r/-/data/admin1.geojson"
  ];
  // Lightweight point layer for capital cities. It is fetched once, cached by
  // the browser, and never requested when the player selects or invades a country.
  const CAPITAL_URLS = [
    "https://cdn.jsdelivr.net/gh/Stefie/geojson-world@master/capitals.geojson",
    "https://raw.githubusercontent.com/Stefie/geojson-world/master/capitals.geojson",
    "https://cdn.jsdelivr.net/gh/pasteq7/world-geo-data@main/countries.json",
    "https://raw.githubusercontent.com/pasteq7/world-geo-data/main/countries.json"
  ];
  const MAP_W = 1100;
  const MAP_H = 560;
  const MIN_CAMERA_ZOOM = 0.85;
  const MAX_CAMERA_ZOOM = 14;
  const MAX_AI_ORDERS_PER_TICK = 28;
  const MAX_BUILDING = 5;
  const FIXED_BATTLE_DURATION_SECONDS = 5;
  const START_YEAR = 2026;
  const YEAR_REAL_SECONDS = 60; // one simulated year per 60 real seconds at ×1.
  // Global transport range: any country on Earth can be targeted. Airlift can
  // carry occupation troops over oceans; naval transport can reach any coast.
  const AIR_RANGE_KM = 20150;
  const SEA_RANGE_KM = 20150;
  const COLORS = ["#20b981", "#e15e61", "#e8a33a", "#4c9bd5", "#9b73ce", "#d26b9f", "#45b5ad", "#a0a84c"];

  const BOT_ALIASES = [
    ["United States", "United States of America", "USA"],
    ["Russia", "Russian Federation"], ["China", "People's Republic of China"],
    ["India"], ["Brazil"], ["Japan"], ["Germany"], ["France"],
    ["United Kingdom", "UK"], ["Australia"], ["Canada"], ["Indonesia"],
    ["Turkey", "Türkiye"], ["Saudi Arabia"], ["South Korea", "Republic of Korea", "Korea, Republic of"],
    ["Mexico"], ["Argentina"], ["South Africa"], ["Egypt"], ["Pakistan"],
    ["Iran", "Iran (Islamic Republic of)"], ["Spain"], ["Italy"], ["Poland"],
    ["Ukraine"], ["Thailand"], ["Vietnam", "Viet Nam"], ["Nigeria"], ["Sweden"], ["Norway"]
  ];

  const ISO_OVERRIDES = {
    "United States": "USA", "United States of America": "USA", "Russia": "RUS",
    "Russian Federation": "RUS", "China": "CHN", "India": "IND", "Brazil": "BRA",
    "Japan": "JPN", "Germany": "DEU", "France": "FRA", "United Kingdom": "GBR",
    "Australia": "AUS", "Canada": "CAN", "Indonesia": "IDN", "Turkey": "TUR",
    "Türkiye": "TUR", "Saudi Arabia": "SAU", "South Korea": "KOR",
    "Republic of Korea": "KOR", "Mexico": "MEX", "Argentina": "ARG",
    "South Africa": "ZAF", "Egypt": "EGY", "Pakistan": "PAK", "Iran": "IRN",
    "Spain": "ESP", "Italy": "ITA", "Poland": "POL", "Ukraine": "UKR",
    "Thailand": "THA", "Vietnam": "VNM", "Viet Nam": "VNM", "Nigeria": "NGA",
    "Sweden": "SWE", "Norway": "NOR"
  };

  const BUILDING = {
    city: { label: "Kota", icon: "🏙️", baseCost: 25000000, step: 18000000 },
    industry: { label: "Industri", icon: "🏭", baseCost: 40000000, step: 25000000 },
    defense: { label: "Benteng", icon: "🛡️", baseCost: 35000000, step: 22000000 }
  };
  const UNIT_SHOP = {
    land: { label: "Darat", icon: "🪖", amount: 2500, cost: 30000000 },
    air: { label: "Udara", icon: "✈️", amount: 100, cost: 55000000 },
    sea: { label: "Laut", icon: "🚢", amount: 60, cost: 60000000 }
  };


  // Reference rankings for a 2026 campaign. GFP ranks 145 nations using its
  // published conventional-power index. IMF WEO nominal-GDP observations are
  // embedded wherever a 2026 figure is available; countries without an
  // observation use Natural Earth GDP/population estimates as a marked fallback.
  const GFP_2026_ORDER = [
    "United States","Russia","China","India","South Korea","France","Japan","United Kingdom","Turkiye","Italy",
    "Brazil","Germany","Indonesia","Pakistan","Israel","Iran","Australia","Spain","Egypt","Ukraine",
    "Poland","Taiwan","Vietnam","Thailand","Saudi Arabia","Sweden","Algeria","Canada","Singapore","Greece",
    "North Korea","Argentina","Nigeria","Netherlands","Myanmar","Mexico","Bangladesh","Portugal","Norway","South Africa",
    "Philippines","Malaysia","Colombia","Iraq","Denmark","Switzerland","Ethiopia","Finland","Chile","Peru",
    "Venezuela","Romania","Uzbekistan","United Arab Emirates","Czechia","Morocco","Hungary","Kazakhstan","Angola","Azerbaijan",
    "Belgium","Bulgaria","Serbia","Democratic Republic of the Congo","Cuba","Sudan","Austria","Sri Lanka","Slovakia","Belarus",
    "Qatar","Ecuador","Croatia","Jordan","Bahrain","Kuwait","Albania","Turkmenistan","Tunisia","Libya",
    "Paraguay","Bolivia","Cambodia","Kenya","Chad","Oman","Syria","Lithuania","Tanzania","New Zealand",
    "Slovenia","Mozambique","Mongolia","Ireland","Georgia","Guatemala","Uruguay","Yemen","Cameroon","Tajikistan",
    "Armenia","Latvia","Honduras","Mali","Zimbabwe","Estonia","Uganda","Ivory Coast","Kyrgyzstan","Luxembourg",
    "Zambia","Ghana","South Sudan","North Macedonia","Dominican Republic","Nicaragua","Republic of the Congo","Lebanon","Eritrea","Niger",
    "Afghanistan","Namibia","Mauritania","Nepal","Laos","Senegal","Burkina Faso","Montenegro","El Salvador","Botswana",
    "Madagascar","Gabon","Bosnia and Herzegovina","Iceland","Panama","Moldova","Somalia","Benin","Kosovo","Sierra Leone",
    "Liberia","Suriname","Central African Republic","Belize","Bhutan"
  ];
  const GFP_NAME_ALIASES = {
    unitedstatesofamerica: "unitedstates", russianfederation: "russia", turkey: "turkiye",
    republicofkorea: "southkorea", korearepublicof: "southkorea", korea: "northkorea",
    unitedkingdomofgreatbritainandnorthernireland: "unitedkingdom", vietname: "vietnam",
    congodemocraticrepublicof: "democraticrepublicofthecongo", congo: "republicofthecongo",
    beliz: "belize", ivorycoast: "ivorycoast", cotedivoire: "ivorycoast",
    unitedarabemirates: "unitedarabemirates", czechrepublic: "czechia", laopeoplesdemocraticrepublic: "laos",
    syrianarabrepublic: "syria", tanzaniaunitedrepublicof: "tanzania", unitedrepublicoftanzania: "tanzania",
    iranislamicrepublicof: "iran", boliviaplurinationalstateof: "bolivia", venezuelabolivarianrepublicof: "venezuela",
    palestine: "palestine", stateofpalestine: "palestine", taiwanprovinceofchina: "taiwan"
  };
  // IMF WEO October 2026 nominal GDP estimates (billions of current US dollars).
  // Names follow the IMF DataMapper where useful; aliases below map ADM0 names.
  // Countries without a WEO observation use Natural Earth estimates instead.
  const IMF_2026_GDP_BN = {
    "United States":32642.373,"China":21546.403,"Germany":5471.299,"Japan":4341.986,
    "United Kingdom":4268.446,"India":4060.207,"France":3554.155,"Russia":2861,
    "Italy":2702,"Brazil":2655,"Canada":2490,"South Korea":2246,"Mexico":2176,
    "Australia":2111,"Spain":2085,"Türkiye":1818,"Turkey":1818,"Indonesia":1480,
    "Netherlands":1424,"Saudi Arabia":1343,"Switzerland":1136,"Poland":1133,
    "Taiwan":1020,"Belgium":772.7,"Argentina":768.21,"Israel":746.98,
    "Sweden":745.08,"Ireland":709.97,"Singapore":667.89,"United Arab Emirates":661.02,
    "Norway":651.71,"Austria":616.9,"Thailand":599.12,"Colombia":572.74,
    "Vietnam":542.13,"Bangladesh":506.36,"Philippines":501.69,"Denmark":499.35,
    "South Africa":489.08,"Romania":470.09,"Hong Kong SAR":455.16,"Pakistan":450.13,
    "Egypt":442.89,"Czech Republic":427.95,"Chile":402.24,"Peru":399.59,
    "Kazakhstan":397.92,"Nigeria":386.67,"Portugal":375.2,"Finland":338.56,
    "Algeria":331.89,"Iran":311.95,"New Zealand":273.4,"Hungary":265.91,
    "Iraq":245.23,"Ukraine":229.41,"Qatar":203.04,"Morocco":195.63,
    "Uzbekistan":178.17,"Slovak Republic":167.06,"Angola":157.3,"Kenya":151.15,
    "Kuwait":146.91,"Bulgaria":146.51,"Dominican Republic":145.36,"Ecuador":138.2,
    "Guatemala":132.27,"Ghana":128.64,"Ethiopia":127.15,"Venezuela":124.18,
    "Oman":121.4,"Costa Rica":115.25,"Croatia":115.92,"Serbia":111.2,
    "Côte d'Ivoire":110.45,"Sri Lanka":110.68,"Belarus":108.11,"Tanzania":96.18,
    "Panama":96.47,"Azerbaijan":89.18,"Slovenia":88.87,"Turkmenistan":83,
    "Myanmar":83.17,"Uganda":72.24,"Jordan":64.88,"Paraguay":64,
    "Cameroon":64.81,"Tunisia":62.74,"Cambodia":54.18,"Bolivia":53.84,
    "Estonia":51.03,"Bahrain":46.02,"Nepal":45.59,"Guinea":45.31,
    "Georgia":44.11,"Cyprus":44.29,"Zambia":42.38,"Iceland":42.77,
    "Honduras":40.97,"Guyana":40.34,"Haiti":39.39,"El Salvador":39.38,
    "Bosnia and Herzegovina":37.26,"Papua New Guinea":36.3,"Armenia":32.97,
    "Albania":32.77,"Burkina Faso":32.41,"Mongolia":31.13,"Sudan":30.86,
    "Benin":27.41,"Trinidad and Tobago":26.82,"Gabon":25.99,"Chad":25.24,
    "Nicaragua":25.4,"Mozambique":24.77,"Jamaica":23.91,"Niger":23.37,
    "Moldova":22.22,"Botswana":22.13,"Tajikistan":21.11,"North Macedonia":21.24,
    "Brunei":18.87,"Bahamas":18.28,"Rwanda":18.67,"Namibia":17.94,
    "Equatorial Guinea":14.28,"Kosovo":14.15,"Togo":13.14,"Montenegro":10.12,
    "Sierra Leone":8.52,"South Sudan":7.98,"Burundi":7.61,"Fiji":6.57,
    "Eswatini":6.05,"Suriname":5.98,"Central African Republic":5.08,"Andorra":4.92,
    "Aruba":4.68,"Bhutan":3.91,"Belize":3.44,"Cabo Verde":3.39,
    "Gambia":3.02,"Guinea-Bissau":2.94,"Saint Lucia":2.76,"San Marino":2.43,
    "Antigua and Barbuda":2.39,"Seychelles":2.37,"Timor-Leste":2.17,
    "Solomon Islands":1.87,"Comoros":1.73,"Samoa":1.35,"Saint Vincent and the Grenadines":1.27,
    "Saint Kitts and Nevis":1.15,"Sao Tome and Principe":1.12,"Tonga":0.73,
    "Micronesia":0.53,"Kiribati":0.4,"Palau":0.37,"Nauru":0.2,"Tuvalu":0.08
  };

  let countries = [];
  let provinces = [];
  let players = [];
  // Bilateral relations are keyed by stable campaign player indexes. All nations
  // begin peaceful; war starts only when the human player attacks or an ally
  // joins an existing defensive war.
  let diplomacyRelations = new Map();
  let currentPlayer = 0;
  let selectedSource = null;
  let selectedTarget = null;
  let contextMode = "none"; // none | country | own | target
  let gameStarted = false;
  let gameOver = false;
  let gameTimer = null;
  let incomeTimer = null;
  let gameYearTimer = null;
  let animationFrame = null;
  let gameYear = START_YEAR;
  let gameSpeed = 1;
  let yearProgress = 0;
  let eventLog = [];
  let pendingConfirmation = null;
  let territoryFilter = "all";
  let rankingTab = "military";
  let lastFrameTime = 0;
  let camera = { x: 0, y: 0, zoom: 1 };
  let pointerState = null;
  const activePointers = new Map();
  let pinchState = null;
  let loadingProgressValue = 0;
  let deferredInstallPrompt = null;
  let pendingAttacks = [];
  let battleEffects = [];
  let toastTimer = null;
  let industryTick = 0;
  let aiTurnCursor = 1;
  let campaignRivalsDefeated = false;
  let pendingPresidentName = "";
  let popupAnchor = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const adm1Cache = new Map();
  let globalADM1Promise = null;
  let globalADM1ByCountry = new Map();
  let globalADM1FeatureCount = 0;
  let globalADM1Source = "";
  let provinceDataReady = false;
  let provinceDataError = null;
  let capitalDataReady = false;
  let capitalDataSource = "";

  function normalizeName(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function countryName(feature) {
    const p = feature.properties || {};
    return p.ADMIN || p.name || p.NAME || p.NAME_EN || p.name_long || p.admin || p.SOVEREIGNT || "Wilayah";
  }

  function countryISO3(feature, name) {
    const p = feature.properties || {};
    // Natural Earth sometimes stores "-99" in ISO_A3 while a valid code is
    // available in ADM0_A3 / ISO_A3_EH. Check every field independently.
    const candidates = [
      p.ISO_A3_EH, p.ADM0_A3, p.ISO_A3, p.SOV_A3, p.GU_A3,
      p.ISO_A3_US, p.ADM0_A3_US, p.SU_A3, p.BRK_A3,
      p["ISO3166-1-Alpha-3"], p.iso_a3, p.adm0_a3, p.iso_a3_eh,
      ISO_OVERRIDES[name]
    ];
    for (const candidate of candidates) {
      const code = String(candidate || "").trim().toUpperCase();
      if (code !== "-99" && /^[A-Z]{3}$/.test(code)) return code;
    }
    return "";
  }

  function countryISO2(feature) {
    const p = feature?.properties || {};
    const candidates = [p.ISO_A2_EH, p.ISO_A2, p.iso_a2,
      p["ISO3166-1-Alpha-2"], p["iso3166-1-alpha-2"], p.ADM0_A3_US];
    for (const candidate of candidates) {
      const code = String(candidate || "").trim().toUpperCase();
      if (/^[A-Z]{2}$/.test(code) && code !== "-99") return code;
    }
    return "";
  }

  function canvasDPR() {
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    return Math.min(mobile ? 1.1 : 1.6, window.devicePixelRatio || 1);
  }

  function project(lon, lat) {
    return { x: (lon + 180) / 360 * MAP_W, y: (90 - lat) / 180 * MAP_H };
  }

  function ringsFor(geometry) {
    if (!geometry) return [];
    if (geometry.type === "Polygon") return geometry.coordinates || [];
    if (geometry.type === "MultiPolygon") return (geometry.coordinates || []).flat();
    return [];
  }

  function polygonParts(geometry) {
    if (!geometry) return [];
    if (geometry.type === "Polygon") return [geometry.coordinates || []];
    if (geometry.type === "MultiPolygon") return geometry.coordinates || [];
    return [];
  }

  function ringAreaCentroid(ring) {
    let area2 = 0, cx = 0, cy = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[i + 1];
      const cross = x1 * y2 - x2 * y1;
      area2 += cross;
      cx += (x1 + x2) * cross;
      cy += (y1 + y2) * cross;
    }
    if (Math.abs(area2) < 1e-10) {
      const sample = ring[Math.floor(ring.length / 2)] || ring[0] || [0, 0];
      return { area: 0, point: [sample[0], sample[1]] };
    }
    return { area: Math.abs(area2 / 2), point: [cx / (3 * area2), cy / (3 * area2)] };
  }

  function pointSegmentDistance(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const length2 = dx * dx + dy * dy;
    if (!length2) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length2));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  // Finds a label anchor inside the largest polygon part, rather than averaging
  // every island and hole (which often put province names in the ocean).
  function findInteriorPoint(feature, path) {
    const parts = polygonParts(feature.geometry).filter(part => part?.[0]?.length >= 4);
    if (!parts.length) return { point: getSimpleCenter(feature), clearance: 0 };
    const ranked = parts.map(part => {
      const outer = part[0];
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const point of outer) {
        minX = Math.min(minX, point[0]); maxX = Math.max(maxX, point[0]);
        minY = Math.min(minY, point[1]); maxY = Math.max(maxY, point[1]);
      }
      const centroid = ringAreaCentroid(outer);
      return {
        part, outer, centroid, minX, maxX, minY, maxY,
        size: centroid.area || Math.max(0, maxX - minX) * Math.max(0, maxY - minY)
      };
    }).sort((a, b) => b.size - a.size);

    const bestPart = ranked[0];
    const rings = bestPart.part;
    const edgeSegments = [];
    const edgeCount = rings.reduce((sum, ring) => sum + Math.max(0, ring.length - 1), 0);
    const edgeStride = Math.max(1, Math.ceil(edgeCount / 180));
    let edgeCursor = 0;
    for (const ring of rings) {
      for (let i = 0; i < ring.length - 1; i += edgeStride) {
        const next = Math.min(ring.length - 1, i + edgeStride);
        const a = project(ring[i][0], ring[i][1]);
        const b = project(ring[next][0], ring[next][1]);
        edgeSegments.push([a.x, a.y, b.x, b.y]);
        edgeCursor++;
      }
    }

    const candidates = [bestPart.centroid.point];
    const cols = 10, rows = 10;
    for (let x = 0; x <= cols; x++) {
      for (let y = 0; y <= rows; y++) {
        candidates.push([
          bestPart.minX + (bestPart.maxX - bestPart.minX) * x / cols,
          bestPart.minY + (bestPart.maxY - bestPart.minY) * y / rows
        ]);
      }
    }

    let best = null;
    for (const point of candidates) {
      const projected = project(point[0], point[1]);
      if (!ctx.isPointInPath(path, projected.x, projected.y, "evenodd")) continue;
      let clearance = Infinity;
      for (const segment of edgeSegments) {
        clearance = Math.min(clearance, pointSegmentDistance(
          projected.x, projected.y, segment[0], segment[1], segment[2], segment[3]
        ));
      }
      if (!best || clearance > best.clearance) best = { point, clearance };
    }
    return best || { point: bestPart.centroid.point, clearance: 0 };
  }

  // Fast label anchor for the full-world province set. Natural Earth supplies
  // latitude/longitude label points; use them when they are inside the polygon.
  // Otherwise test a small grid and a bounded set of edge samples.
  function findInteriorPointFast(feature, path) {
    const props = feature.properties || {};
    const lon = props.longitude == null || props.longitude === "" ? NaN : Number(props.longitude);
    const lat = props.latitude == null || props.latitude === "" ? NaN : Number(props.latitude);
    if (Number.isFinite(lon) && Number.isFinite(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90) {
      const candidate = project(lon, lat);
      if (ctx.isPointInPath(path, candidate.x, candidate.y, "evenodd")) {
        return { point: [lon, lat], clearance: sampledClearance(feature, candidate) };
      }
    }

    const parts = polygonParts(feature.geometry).filter(part => part?.[0]?.length >= 4);
    if (!parts.length) return { point: getSimpleCenter(feature), clearance: 0 };
    const ranked = parts.map(part => {
      const ring = part[0];
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const pt of ring) {
        minX = Math.min(minX, pt[0]); maxX = Math.max(maxX, pt[0]);
        minY = Math.min(minY, pt[1]); maxY = Math.max(maxY, pt[1]);
      }
      const centroid = ringAreaCentroid(ring);
      return { part, minX, maxX, minY, maxY, centroid, size: centroid.area };
    }).sort((a, b) => b.size - a.size);
    const largest = ranked[0];
    const candidates = [largest.centroid.point];
    for (let x = 1; x < 8; x++) {
      for (let y = 1; y < 8; y++) {
        candidates.push([
          largest.minX + (largest.maxX - largest.minX) * x / 8,
          largest.minY + (largest.maxY - largest.minY) * y / 8
        ]);
      }
    }
    let best = null;
    for (const point of candidates) {
      const projected = project(point[0], point[1]);
      if (!ctx.isPointInPath(path, projected.x, projected.y, "evenodd")) continue;
      const clearance = sampledClearance(feature, projected);
      if (!best || clearance > best.clearance) best = { point, clearance };
    }
    return best || { point: largest.centroid.point, clearance: 0 };
  }

  function sampledClearance(feature, projectedPoint) {
    let clearance = Infinity;
    const allRings = ringsFor(feature.geometry);
    const total = allRings.reduce((sum, ring) => sum + Math.max(0, ring.length - 1), 0);
    const stride = Math.max(1, Math.ceil(total / 64));
    let cursor = 0;
    for (const ring of allRings) {
      for (let i = 0; i < ring.length - 1; i++) {
        if (cursor++ % stride !== 0) continue;
        const a = project(ring[i][0], ring[i][1]);
        const b = project(ring[i + 1][0], ring[i + 1][1]);
        clearance = Math.min(clearance, pointSegmentDistance(
          projectedPoint.x, projectedPoint.y, a.x, a.y, b.x, b.y
        ));
      }
    }
    return Number.isFinite(clearance) ? clearance : 0;
  }

  function getSimpleCenter(feature) {
    const parts = polygonParts(feature.geometry).filter(part => part?.[0]?.length >= 4);
    if (!parts.length) return [0, 0];
    const largest = parts.map(part => ({ part, area: ringAreaCentroid(part[0]).area }))
      .sort((a, b) => b.area - a.area)[0];
    return ringAreaCentroid(largest.part[0]).point;
  }

  function getFeatureBounds(feature) {
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    let found = false;
    for (const ring of ringsFor(feature.geometry)) {
      const stride = Math.max(1, Math.floor(ring.length / 160));
      for (let i = 0; i < ring.length; i += stride) {
        const point = ring[i];
        minLon = Math.min(minLon, point[0]); maxLon = Math.max(maxLon, point[0]);
        minLat = Math.min(minLat, point[1]); maxLat = Math.max(maxLat, point[1]);
        found = true;
      }
    }
    return found ? { minLon, maxLon, minLat, maxLat } : null;
  }

  function getBoundarySamples(feature, limit = 48) {
    const result = [];
    const rings = ringsFor(feature.geometry);
    const total = rings.reduce((sum, ring) => sum + ring.length, 0);
    const stride = Math.max(1, Math.ceil(total / limit));
    let cursor = 0;
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        if (cursor % stride === 0) result.push(ring[i]);
        cursor++;
      }
    }
    return result;
  }

  function makePath(feature) {
    const path = new Path2D();
    for (const ring of ringsFor(feature.geometry)) {
      ring.forEach((point, index) => {
        const p = project(point[0], point[1]);
        if (index === 0) path.moveTo(p.x, p.y);
        else path.lineTo(p.x, p.y);
      });
      path.closePath();
    }
    return path;
  }

  function getCenter(feature, path = null) {
    const shapePath = path || makePath(feature);
    return findInteriorPoint(feature, shapePath).point;
  }

  function haversine(a, b) {
    const rad = value => value * Math.PI / 180;
    const dLat = rad(b[1] - a[1]);
    let dLonValue = b[0] - a[0];
    if (dLonValue > 180) dLonValue -= 360;
    if (dLonValue < -180) dLonValue += 360;
    const dLon = rad(dLonValue);
    const lat1 = rad(a[1]);
    const lat2 = rad(b[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function centerDistance(a, b) {
    return haversine(a.center, b.center);
  }

  function canLandAttack(source, target) {
    if (!source || !target) return false;
    if (source.neighbors.has(target.id)) return true;
    if (source.countryIndex === target.countryIndex) return false;
    const sourceCountry = countries[source.countryIndex];
    const targetCountry = countries[target.countryIndex];
    // Administrative borders from separate datasets are not always digitized
    // with identical vertices. If the two countries share a detected land
    // border, allow a ground invasion into any of that country's provinces;
    // each province still has to be captured individually.
    return Boolean(sourceCountry?.neighbors.has(target.countryIndex));
  }

  function pointKey(point) {
    return `${Math.round(point[0] * 10000)},${Math.round(point[1] * 10000)}`;
  }

  function segmentKey(a, b) {
    const ka = pointKey(a);
    const kb = pointKey(b);
    return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
  }

  function buildCountryAdjacency() {
    const owners = new Map();
    countries.forEach((country, countryIndex) => {
      const segments = new Set();
      for (const ring of ringsFor(country.feature.geometry)) {
        for (let i = 1; i < ring.length; i++) segments.add(segmentKey(ring[i - 1], ring[i]));
      }
      for (const key of segments) {
        if (!owners.has(key)) owners.set(key, new Set());
        owners.get(key).add(countryIndex);
      }
    });
    countries.forEach(country => country.neighbors = new Set());
    for (const entries of owners.values()) {
      const ids = [...entries];
      if (ids.length < 2) continue;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          countries[ids[i]].neighbors.add(ids[j]);
          countries[ids[j]].neighbors.add(ids[i]);
        }
      }
    }

    // Some countries use slightly different boundary vertices in their ADM0
    // layers. Detect near-touching borders so their ADM1 provinces still get
    // a usable land crossing in the strategy map.
    for (let i = 0; i < countries.length; i++) {
      for (let j = i + 1; j < countries.length; j++) {
        const a = countries[i], b = countries[j];
        if (a.neighbors.has(j) || !a.bounds || !b.bounds) continue;
        if (boundsGapKm(a.bounds, b.bounds) > 130) continue;
        let nearest = Infinity;
        for (const pa of a.boundarySamples) {
          for (const pb of b.boundarySamples) {
            nearest = Math.min(nearest, haversine(pa, pb));
            if (nearest < 22) break;
          }
          if (nearest < 22) break;
        }
        if (nearest <= 95) {
          a.neighbors.add(j);
          b.neighbors.add(i);
        }
      }
    }
  }

  function boundsGapKm(a, b) {
    const latGap = Math.max(0, a.minLat - b.maxLat, b.minLat - a.maxLat) * 111.2;
    const shifts = [-360, 0, 360];
    let lonGap = Infinity;
    for (const shift of shifts) {
      const minB = b.minLon + shift, maxB = b.maxLon + shift;
      lonGap = Math.min(lonGap, Math.max(0, a.minLon - maxB, minB - a.maxLon));
    }
    const meanLat = (Math.max(a.minLat, b.minLat) + Math.min(a.maxLat, b.maxLat)) / 2;
    const lonKm = lonGap * 111.2 * Math.cos(meanLat * Math.PI / 180);
    return Math.hypot(latGap, lonKm);
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const power = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / (1024 ** power)).toFixed(power ? 1 : 0)} ${units[power]}`;
  }

  async function readJSONWithProgress(response, onProgress) {
    const total = Number(response.headers.get("content-length")) || 0;
    if (!response.body?.getReader) {
      const data = await response.json();
      onProgress?.({ loaded: total, total, ratio: 1, complete: true });
      return data;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    const textParts = [];
    let loaded = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      loaded += value.byteLength;
      textParts.push(decoder.decode(value, { stream: true }));
      const ratio = total > 0 ? Math.min(.995, loaded / total) : null;
      onProgress?.({ loaded, total, ratio, complete: false });
    }
    textParts.push(decoder.decode());
    onProgress?.({ loaded, total, ratio: 1, complete: true });
    return JSON.parse(textParts.join(""));
  }

  function transferReporter(start, end, title) {
    return event => {
      let ratio = event.ratio;
      // Some CDNs do not expose Content-Length through CORS. Show downloaded
      // bytes and a gently advancing estimate instead of a misleading 100%.
      if (ratio == null) {
        ratio = Math.min(.86, Math.log2(1 + event.loaded / (1024 * 1024)) / 5.8);
      }
      const percent = start + (end - start) * Math.max(0, Math.min(1, ratio));
      const detail = event.complete && event.ratio === 1
        ? "Unduhan selesai · memeriksa data"
        : event.total > 0
          ? `${formatBytes(event.loaded)} dari ${formatBytes(event.total)} diterima`
          : `${formatBytes(event.loaded)} diterima`;
      updateLoadingProgress(percent, title, detail);
    };
  }

  async function fetchJSONWithCache(cacheKey, urls, label, validate, onProgress = null, timeoutMs = 180000) {
    const cacheRequestURL = new URL(`.__worldwar_cache__/${cacheKey}.json`, document.baseURI).href;
    let cache = null;
    if ("caches" in window) {
      try {
        cache = await window.caches.open(DATA_CACHE_NAME);
        const cached = await cache.match(cacheRequestURL);
        if (cached) {
          try {
            const data = await cached.json();
            if (validate(data)) {
              setStatus(`${label} tersedia dari cache browser…`);
              onProgress?.({ loaded: 0, total: 0, ratio: 1, complete: true, cached: true });
              return { data, source: "cache browser" };
            }
          } catch (_) {
            // A partial/old cache entry is discarded and downloaded again.
          }
          await cache.delete(cacheRequestURL).catch(() => {});
        }
      } catch (error) {
        console.warn("Browser cache unavailable; network fetch will continue.", error);
        cache = null;
      }
    }

    const errors = [];
    for (let index = 0; index < urls.length; index++) {
      const url = urls[index];
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        setStatus(`Memuat ${label} otomatis… sumber ${index + 1}/${urls.length}`);
        const response = await fetch(url, {
          mode: "cors",
          cache: "default",
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} dari ${new URL(url).hostname}`);
        const cacheCopy = response.clone();
        const data = await readJSONWithProgress(response, onProgress);
        if (!validate(data)) throw new Error(`Format atau jumlah fitur ${label} tidak valid.`);
        if (cache) {
          try {
            await cache.put(cacheRequestURL, cacheCopy);
          } catch (cacheError) {
            console.warn(`Data ${label} berhasil dimuat tetapi tidak dapat disimpan ke cache browser.`, cacheError);
          }
        }
        return { data, source: url };
      } catch (error) {
        errors.push(`${new URL(url).hostname}: ${error.name === "AbortError" ? "waktu unduh habis" : error.message}`);
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new Error(`Tidak dapat memuat ${label} dari sumber data. ${errors.join(" | ")} Pastikan website berjalan melalui HTTPS dan tidak diblokir pemblokir jaringan.`);
  }

  function formatUSD(value, compact = true) {
    const amount = Math.max(0, Number(value) || 0);
    if (compact) {
      if (amount >= 1e12) return `$${(amount / 1e12).toFixed(2)}T`;
      if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
      if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
      if (amount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
    }
    return `$${Math.round(amount).toLocaleString("en-US")}`;
  }

  const IMF_GDP_NAME_ALIASES = {
    unitedstatesofamerica: "unitedstates", russianfederation: "russia",
    turkiye: "turkey", turkiyerepublicof: "turkey", korearepublicof: "southkorea",
    republicofkorea: "southkorea", chinapeoplesrepublicof: "china",
    peoplesrepublicofchina: "china", czechia: "czechrepublic", vietname: "vietnam",
    bruneidarussalam: "brunei", iranislamicrepublicof: "iran",
    democraticrepublicofthecongo: "congodemrepofthe", congodemocraticrepublicof: "congodemrepofthe",
    republicofthecongo: "congorepublicof", ivorycoast: "cotedivoire",
    slovakia: "slovakrepublic", taiwanprovinceofchina: "taiwan",
    bahamasthe: "bahamas", gambiathe: "gambia", naoero: "nauru",
    saotomeandprincipe: "saotomeandprincipe", federatedstatesofmicronesia: "micronesia",
    micronesiafederatedstatesof: "micronesia", hongkong: "hongkongsar",
    moldovarepublicof: "moldova", vietname: "vietnam"
  };

  function imfGDPValueForCountry(name) {
    const key = normalizeName(name);
    const canonical = IMF_GDP_NAME_ALIASES[key] || key;
    for (const [label, value] of Object.entries(IMF_2026_GDP_BN)) {
      const labelKey = normalizeName(label);
      if (labelKey === canonical || labelKey === key) return value;
    }
    return null;
  }

  function resolveCountryEconomicBase(feature, name) {
    const nominalBN = imfGDPValueForCountry(name);
    if (nominalBN != null) return nominalBN * 1e9;
    const p = feature.properties || {};
    const estimateMillions = Number(p.GDP_MD_EST ?? p.GDP_MD ?? p.gdp_md_est ?? 0);
    if (Number.isFinite(estimateMillions) && estimateMillions > 0) return estimateMillions * 1e6;
    const population = Number(p.POP_EST ?? p.pop_est ?? 0);
    return Math.max(100e6, (Number.isFinite(population) && population > 0 ? population : 500000) * 8500);
  }

  function assignReferenceRanks() {
    const direct = new Map();
    GFP_2026_ORDER.forEach((name, index) => {
      const rank = index + 1;
      direct.set(normalizeName(name), rank);
      for (const [alias, canonical] of Object.entries(GFP_NAME_ALIASES)) {
        if (canonical === normalizeName(name)) direct.set(alias, rank);
      }
    });
    const unranked = [];
    for (const country of countries) {
      const key = normalizeName(country.name);
      const alias = GFP_NAME_ALIASES[key] || key;
      const directRank = direct.get(key) || direct.get(alias);
      country.gdpBaseUSD = resolveCountryEconomicBase(country.feature, country.name);
      country.militaryReferenceRank = directRank || null;
      if (!directRank) {
        const properties = country.feature.properties || {};
        const population = Math.max(100000, Number(properties.POP_EST || 0) || 1000000);
        const proxy = Math.pow(population, .55) * Math.pow(Math.max(1, country.gdpBaseUSD / 1e9), .25);
        unranked.push({ country, proxy });
      }
    }
    unranked.sort((a, b) => b.proxy - a.proxy);
    unranked.forEach((item, index) => { item.country.militaryReferenceRank = 146 + index; });
    for (const country of countries) {
      const rank = country.militaryReferenceRank || countries.length + 1;
      country.militaryBaseScore = rank <= 145 ? (146 - rank) : Math.max(.05, .75 - (rank - 146) * .001);
      country.economySource = imfGDPValueForCountry(country.name) != null
        ? "IMF WEO Oktober 2026" : "estimasi Natural Earth";
    }
  }

  function createInitialMilitary(country) {
    const rank = country.militaryReferenceRank || 180;
    const referenceStrength = rank <= 145 ? 146 - rank : Math.max(1, 8 - (rank - 145) * .035);
    const land = Math.round(2600 + referenceStrength * 420);
    return {
      land,
      air: Math.max(30, Math.round(land / 82)),
      sea: Math.max(12, Math.round(land / 155))
    };
  }

  // Countries ranked below the player's selected nation start with a smaller
  // reserve and receive a more defensive AI profile for this campaign.
  function createCampaignAIProfile(country, chosen, isPlayer = false) {
    const military = createInitialMilitary(country);
    const playerRank = chosen?.militaryReferenceRank || 999;
    const countryRank = country?.militaryReferenceRank || 999;
    const rankGap = Math.max(0, countryRank - playerRank);
    const weakerThanPlayer = !isPlayer && rankGap > 0;
    const weaknessFactor = weakerThanPlayer
      ? Math.max(.50, .76 - Math.min(rankGap, 130) * .002)
      : 1;

    if (weakerThanPlayer) {
      military.land = Math.max(850, Math.round(military.land * weaknessFactor));
      military.air = Math.max(15, Math.round(military.air * weaknessFactor));
      military.sea = Math.max(8, Math.round(military.sea * weaknessFactor));
    }

    return { military, aiWeakerThanPlayer: weakerThanPlayer, aiRankGap: rankGap, aiWeaknessFactor: weaknessFactor };
  }

  function playerMilitaryTotal(player) {
    if (!player?.military) return 0;
    return player.military.land + player.military.air + player.military.sea;
  }

  function currentMilitaryScore(player) {
    if (!player) return 0;
    const territory = provinces.reduce((sum, province) => sum + (province.owner === players.indexOf(player) ? 1 : 0), 0);
    return (player.militaryBaseScore || 0) + playerMilitaryTotal(player) / 25000 + territory * .015;
  }

  function currentEconomyScore(player) {
    if (!player) return 0;
    const owner = players.indexOf(player);
    let cityLevels = 0, industryLevels = 0;
    for (const province of provinces) {
      if (province.owner !== owner) continue;
      cityLevels += province.buildings.city;
      industryLevels += province.buildings.industry;
    }
    const gdp = Math.max(100e6, player.gdpBaseUSD || 0);
    // Building value scales with the size of the national economy so that a
    // tiny country does not outrank a much larger economy just because each
    // campaign begins with the same small capital-city starter pack.
    const cityAsset = Math.max(50000, gdp * .00003);
    const industryAsset = Math.max(100000, gdp * .00006);
    return gdp + cityLevels * cityAsset + industryLevels * industryAsset + player.money * .03;
  }

  function startSimulationTimers() {
    if (gameTimer) clearInterval(gameTimer);
    if (incomeTimer) clearInterval(incomeTimer);
    if (gameYearTimer) clearInterval(gameYearTimer);
    gameTimer = setInterval(aiTurn, 4300 / gameSpeed);
    incomeTimer = setInterval(economyTick, 3000 / gameSpeed);
    gameYearTimer = setInterval(() => {
      if (!gameStarted || gameOver) return;
      yearProgress += gameSpeed;
      if (yearProgress >= YEAR_REAL_SECONDS) {
        yearProgress -= YEAR_REAL_SECONDS;
        gameYear++;
        addLog(`📅 Tahun ${gameYear} dimulai.`);
      }
      updateTimeHUD();
    }, 1000);
  }

  function updateTimeHUD() {
    const year = document.getElementById("gameYear");
    if (year) year.textContent = String(gameYear);
    document.querySelectorAll(".speed-button").forEach(button => {
      button.classList.toggle("active", Number(button.dataset.speed) === gameSpeed);
      button.setAttribute("aria-pressed", String(Number(button.dataset.speed) === gameSpeed));
    });
  }

  function setGameSpeed(speed) {
    const next = [1, 2, 4].includes(Number(speed)) ? Number(speed) : 1;
    gameSpeed = next;
    updateTimeHUD();
    if (gameStarted && !gameOver) startSimulationTimers();
    showToast(`Kecepatan waktu simulasi: ×${gameSpeed}.`);
  }

  function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let rgb;
    if (h < 60) rgb = [c, x, 0];
    else if (h < 120) rgb = [x, c, 0];
    else if (h < 180) rgb = [0, c, x];
    else if (h < 240) rgb = [0, x, c];
    else if (h < 300) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    return rgb.map(value => Math.round((value + m) * 255));
  }

  function rgbToHex(rgb) {
    return `#${rgb.map(value => Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0")).join("")}`;
  }

  function colorDistance(a, b) {
    const red = a[0] - b[0];
    const green = a[1] - b[1];
    const blue = a[2] - b[2];
    return Math.sqrt(2 * red * red + 4 * green * green + 3 * blue * blue);
  }

  function assignCampaignColors(campaignCountries) {
    // Greedy graph coloring: countries sharing a land border receive colors
    // selected for maximum RGB distance from their already-colored neighbors.
    // The player's country keeps a recognizable green, while nearby nations
    // are deliberately assigned contrasting hues and brightness levels.
    const palette = [];
    for (let hue = 0; hue < 360; hue += 15) {
      for (const lightness of [40, 54, 68]) {
        const rgb = hslToRgb(hue, 68, lightness);
        palette.push({ color: rgbToHex(rgb), rgb });
      }
    }

    const campaignIndexByCountry = new Map(campaignCountries.map((country, index) => [country.index, index]));
    const assigned = new Map();
    const playerRgb = [32, 185, 129];
    if (campaignCountries.length) {
      assigned.set(campaignCountries[0].index, { color: "#20b981", rgb: playerRgb });
    }
    const pending = new Set(campaignCountries.slice(1).map(country => country.index));

    while (pending.size) {
      let selectedCountry = null;
      let selectedSaturation = -1;
      let selectedDegree = -1;
      for (const countryIndex of pending) {
        const country = countries[countryIndex];
        const neighborColors = [...(country?.neighbors || [])]
          .filter(neighborIndex => assigned.has(neighborIndex))
          .map(neighborIndex => assigned.get(neighborIndex).color);
        const saturation = new Set(neighborColors).size;
        const degree = [...(country?.neighbors || [])].filter(neighborIndex => campaignIndexByCountry.has(neighborIndex)).length;
        if (saturation > selectedSaturation || (saturation === selectedSaturation && degree > selectedDegree) ||
            (saturation === selectedSaturation && degree === selectedDegree && countryIndex < (selectedCountry?.index ?? Infinity))) {
          selectedCountry = country;
          selectedSaturation = saturation;
          selectedDegree = degree;
        }
      }

      if (!selectedCountry) break;
      const neighborColors = [...(selectedCountry.neighbors || [])]
        .filter(neighborIndex => assigned.has(neighborIndex))
        .map(neighborIndex => assigned.get(neighborIndex).rgb);
      let selectedColor;
      if (!neighborColors.length) {
        const stableSeed = (selectedCountry.index * 37 + 13) % palette.length;
        selectedColor = palette[stableSeed];
      } else {
        let bestDistance = -1;
        for (const candidate of palette) {
          const nearestNeighborDistance = Math.min(...neighborColors.map(rgb => colorDistance(candidate.rgb, rgb)));
          if (nearestNeighborDistance > bestDistance) {
            bestDistance = nearestNeighborDistance;
            selectedColor = candidate;
          }
        }
      }
      assigned.set(selectedCountry.index, selectedColor || palette[selectedCountry.index % palette.length]);
      pending.delete(selectedCountry.index);
    }

    return campaignCountries.map((country, index) => {
      const assignedColor = assigned.get(country.index);
      return assignedColor?.color || (index === 0 ? "#20b981" : palette[(country.index * 37 + 13) % palette.length].color);
    });
  }

  function buildStrategicReachability() {
    // The ADM0 layer is small. Precompute a short list of geographically-near
    // countries once so every AI can plan air/naval routes without scanning
    // every province in the world on each turn.
    for (const country of countries) {
      country.nearestCountryIndexes = countries
        .filter(other => other.index !== country.index)
        .map(other => ({ index: other.index, distance: haversine(country.center, other.center) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5)
        .map(item => item.index);
    }
  }

  function capitalCountryAliases() {
    const aliases = {
      unitedstatesofamerica: "unitedstates",
      russianfederation: "russia",
      turkiye: "turkey",
      republicofkorea: "southkorea",
      korearepublicof: "southkorea",
      czechia: "czechrepublic",
      unitedkingdomofgreatbritainandnorthernireland: "unitedkingdom",
      boliviamultinationalstateof: "bolivia",
      venezuelabolivarianrepublicof: "venezuela",
      iranislamicrepublicof: "iran",
      laopeoplesdemocraticrepublic: "laos",
      syrianarabrepublic: "syria",
      unitedrepublicoftanzania: "tanzania",
      tanzaniaunitedrepublicof: "tanzania",
      bruneidarussalam: "brunei",
      myanmar: "myanmar",
      moldovarepublicof: "moldova",
      cotedivoire: "ivorycoast",
      ivorycoast: "cotedivoire",
      democraticrepublicofthecongo: "democraticrepublicofthecongo",
      congodemocraticrepublicof: "democraticrepublicofthecongo",
      republicofthecongo: "republicofthecongo",
      congo: "republicofthecongo",
      palestinianterritory: "palestine",
      stateofpalestine: "palestine",
      eswatini: "swaziland",
      northmacedonia: "macedonia"
    };
    return aliases;
  }

  async function loadWorldCapitals() {
    const result = await fetchJSONWithCache(
      "capital-points", CAPITAL_URLS, "ibu kota negara",
      data => Boolean(data && Array.isArray(data.features) && data.features.length >= 100),
      transferReporter(14, 16, "Memuat lokasi ibu kota"), 14000
    );

    const byISO3 = new Map();
    const byISO2 = new Map();
    const byName = new Map();
    for (const country of countries) {
      if (country.iso3) byISO3.set(country.iso3, country);
      if (country.iso2) byISO2.set(country.iso2, country);
      byName.set(normalizeName(country.name), country);
    }
    const aliasMap = capitalCountryAliases();
    for (const list of BOT_ALIASES) {
      const found = list.map(name => byName.get(normalizeName(name))).find(Boolean);
      if (found) list.forEach(name => byName.set(normalizeName(name), found));
    }

    let matched = 0;
    for (const feature of result.data.features) {
      const p = feature?.properties || {};
      const iso3 = String(p.iso3 || p.ISO3 || p.adm0_a3 || "").toUpperCase();
      const iso2 = String(p.iso2 || p.id || p.ISO2 || "").toUpperCase();
      const rawCountryName = p.country || p.countryName || p.name || p.ADMIN || "";
      const nameKey = normalizeName(rawCountryName);
      const aliasKey = aliasMap[nameKey] || "";
      const country = byISO3.get(iso3) || byISO2.get(iso2) ||
        byName.get(nameKey) || (aliasKey ? byName.get(aliasKey) : null);
      if (!country) continue;

      let coordinates = null;
      if (feature.geometry?.type === "Point" && Array.isArray(feature.geometry.coordinates)) {
        coordinates = feature.geometry.coordinates;
      } else if (p.capitalCoordinates) {
        const capital = p.capitalCoordinates;
        const longitude = Number(capital.lng ?? capital.lon ?? capital.longitude);
        const latitude = Number(capital.lat ?? capital.latitude);
        if (Number.isFinite(longitude) && Number.isFinite(latitude)) coordinates = [longitude, latitude];
      }
      const longitude = Number(coordinates?.[0]);
      const latitude = Number(coordinates?.[1]);
      const capitalName = String(p.city || p.capital || p.capitalName || "").trim();
      if (!capitalName || !Number.isFinite(longitude) || !Number.isFinite(latitude) ||
          longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) continue;

      country.capitalName = capitalName;
      country.capitalCoords = [longitude, latitude];
      country.capitalVerified = true;
      matched++;
    }

    // Keep a visible crown for every map country. Countries absent from the
    // point source get a neutral map-centre fallback; no fictional city name
    // is displayed for those unverified locations.
    for (const country of countries) {
      if (!country.capitalCoords) country.capitalCoords = country.center;
    }
    capitalDataReady = matched > 0;
    capitalDataSource = result.source;
    if (!matched) throw new Error("Tidak ada lokasi ibu kota yang cocok dengan negara pada peta.");
    setStatus(`${matched}/${countries.length} ibu kota teridentifikasi · menyiapkan provinsi…`);
    return matched;
  }

  async function loadWorld() {
    loadingProgressValue = 0;
    loadingScreen.hidden = false;
    loadingScreen.classList.remove("is-hidden", "has-error");
    loadingError.hidden = true;
    retryLoadBtn.hidden = true;
    updateLoadingProgress(1, "Menyiapkan peta dunia…", "Menghubungkan ke sumber peta", "countries", true);
    setStatus("Menghubungkan ke data peta dunia…");
    try {
      const countryResult = await fetchJSONWithCache(
        "countries", WORLD_URLS, "batas negara dunia",
        data => Boolean(data && Array.isArray(data.features) && data.features.length > 100),
        transferReporter(2, 12, "Mengunduh peta negara")
      );
      const collection = countryResult.data;
      if (!Array.isArray(collection.features)) throw new Error("Format peta negara tidak valid.");
      updateLoadingProgress(14, "Menyusun peta negara…", "Membentuk garis batas negara", "countries");
      countries = collection.features
        .filter(feature => feature.geometry && ["Polygon", "MultiPolygon"].includes(feature.geometry.type))
        .map((feature, index) => {
          const name = countryName(feature);
          const path = makePath(feature);
          const interior = findInteriorPointFast(feature, path);
          return {
            index, feature, name, iso3: countryISO3(feature, name), iso2: countryISO2(feature),
            capitalName: "", capitalCoords: null, capitalVerified: false, capitalProvinceId: null,
            provinceUnitLabel: "Wilayah",
            gdpBaseUSD: resolveCountryEconomicBase(feature, name),
            militaryReferenceRank: null, militaryBaseScore: 0,
            path, center: interior.point, bounds: getFeatureBounds(feature),
            boundarySamples: getBoundarySamples(feature),
            neighbors: new Set(), provinceIds: [], provincesLoaded: false,
            provincesLoading: null, adm1Features: null
          };
        });
      assignReferenceRanks();
      buildCountryAdjacency();
      buildStrategicReachability();
      try {
        await loadWorldCapitals();
      } catch (capitalError) {
        // Capital labels are an enhancement, not a blocker for the campaign.
        // All countries remain playable if a capital-data mirror is unavailable.
        console.warn("Capital point data could not be loaded:", capitalError);
        countries.forEach(country => {
          country.capitalName = "";
          country.capitalCoords = country.center;
          country.capitalVerified = false;
        });
      }
      setStatus(`${countries.length} negara siap · menyiapkan seluruh provinsi dunia…`);
      updateLoadingProgress(17, "Peta negara siap", `${countries.length.toLocaleString("id-ID")} negara ditemukan · mengambil database provinsi`, "provinces");
      render();
      await preloadAllWorldProvinces();
      provinceDataReady = true;
      setStatus(`${globalADM1FeatureCount.toLocaleString("id-ID")} wilayah siap · semua provinsi tersedia`);
      render();
      updateHUD();
      finishLoading();
      showToast(`Database dunia siap: ${provinces.length.toLocaleString("id-ID")} wilayah sudah tersedia sejak awal.`);
    } catch (error) {
      console.error("World map / province preload error:", error);
      provinceDataError = error;
      provinceDataReady = false;
      setStatus("Data peta belum siap · koneksi perlu diperiksa");
      render();
      showLoadingError(error);
    }
  }

  async function fetchGlobalADM1JSON(onProgress = null) {
    const result = await fetchJSONWithCache(
      "admin1", GLOBAL_ADM1_URLS, "seluruh provinsi dunia",
      data => Boolean(data && Array.isArray(data.features) && data.features.length >= 1000),
      onProgress
    );
    return { ...result.data, __worldWarSource: result.source };
  }

  function admin1FeatureName(feature, parentName = admin1FeatureAdmin(feature)) {
    const p = feature.properties || {};
    // Natural Earth documents `name` as the subdivision name and `admin` as
    // the country. Some records have a blank `name`, so use translations and
    // alternate/local names before creating a neutral fallback label.
    const candidates = [
      p.name, p.name_en, p.NAME, p.NAME_EN, p.name_local, p.NAME_LOCAL,
      p.name_alt, p.NAME_ALT, p.name_long, p.NAME_1, p.name_1,
      p.province, p.PROVINSI, p.NAMOBJ, p.namobj, p.region, p.REGION
    ];
    const parentKey = normalizeName(parentName);
    for (const candidate of candidates) {
      let value = String(candidate ?? "").trim().replace(/\s+/g, " ");
      if (!value) continue;
      // Alternate-name attributes can contain several names separated by | or ;.
      value = value.split(/[|;]/)[0].trim();
      const key = normalizeName(value);
      if (!key || key === parentKey || ["99", "unknown", "none", "null", "nan", "undefined"].includes(key)) continue;
      return value;
    }
    return "";
  }

  function admin1FeatureAdmin(feature) {
    const p = feature.properties || {};
    return p.admin || p.ADMIN || p.sovereignt || p.SOVEREIGNT ||
      p.geonunit || p.GEONUNIT || p.country || p.COUNTRY || "";
  }

  function admin1FeatureISO3(feature) {
    const p = feature.properties || {};
    const candidates = [p.adm0_a3, p.ADM0_A3, p.ADM0_A3_US, p.sov_a3,
      p.SOV_A3, p.gu_a3, p.GU_A3, p.iso_a3, p.ISO_A3, p["ISO3166-1-Alpha-3"]];
    for (const candidate of candidates) {
      const code = String(candidate || "").trim().toUpperCase();
      if (code !== "-99" && /^[A-Z]{3}$/.test(code)) return code;
    }
    return "";
  }

  function indexGlobalADM1(features, source) {
    const codeLookup = new Map();
    const nameLookup = new Map();
    for (const country of countries) {
      if (country.iso3) codeLookup.set(country.iso3, country);
      nameLookup.set(normalizeName(country.name), country);
    }

    // A few names differ between country and ADM1 datasets. The aliases are
    // only used when the ISO-3 code is absent or not shared by the two sources.
    const aliases = {
      unitedstatesofamerica: "unitedstates",
      russianfederation: "russia",
      turkiye: "turkey",
      republicofkorea: "southkorea",
      korearepublicof: "southkorea",
      vietnam: "vietnam",
      czechia: "czechrepublic",
      unitedkingdomofgreatbritainandnorthernireland: "unitedkingdom"
    };
    for (const [alias, target] of Object.entries(aliases)) {
      const country = nameLookup.get(target);
      if (country) nameLookup.set(alias, country);
    }
    // Use the existing campaign alias list as a second name bridge.
    for (const list of BOT_ALIASES) {
      const found = list.map(name => nameLookup.get(normalizeName(name))).find(Boolean);
      if (found) list.forEach(name => nameLookup.set(normalizeName(name), found));
    }

    const grouped = new Map();
    let matched = 0;
    for (const sourceFeature of features) {
      if (!sourceFeature?.geometry || !["Polygon", "MultiPolygon"].includes(sourceFeature.geometry.type)) continue;
      const code = admin1FeatureISO3(sourceFeature);
      const adminName = admin1FeatureAdmin(sourceFeature);
      const normalizedAdmin = normalizeName(adminName);
      const countryByName = normalizedAdmin
        ? (nameLookup.get(normalizedAdmin) || nameLookup.get(aliases[normalizedAdmin] || ""))
        : null;
      const countryByCode = code ? codeLookup.get(code) : null;
      // The `admin` attribute explicitly names the parent country. Prefer it
      // over adm0_a3 because Natural Earth notes that adm0_a3 can be a special
      // or disputed-area code rather than the ISO code used by ADM0.
      const country = countryByName || countryByCode;
      if (!country) continue;
      if (countryByName && countryByCode && countryByName !== countryByCode) {
        console.warn(`ADM1 country-name/code mismatch for ${adminName} (${code}); using the admin name.`);
      }

      const key = country.iso3 || `NAME:${normalizeName(country.name)}`;
      if (!grouped.has(key)) grouped.set(key, []);
      const countryFeatures = grouped.get(key);
      const sourceProps = sourceFeature.properties || {};
      let name = admin1FeatureName(sourceFeature, adminName || country.name);
      if (!name) {
        // A few source features have no common/translated name. Keep the
        // region selectable and make the fallback explicit instead of showing
        // the parent country's name as though it were a province.
        name = `Wilayah ${countryFeatures.length + 1}`;
      }
      const duplicateCount = countryFeatures.filter(item =>
        normalizeName(item.properties?.name) === normalizeName(name)
      ).length;
      if (duplicateCount) name = `${name} (${duplicateCount + 1})`;

      const feature = {
        type: "Feature",
        properties: {
          name,
          name_en: sourceProps.name_en || sourceProps.NAME_EN || "",
          name_local: sourceProps.name_local || sourceProps.NAME_LOCAL || "",
          name_alt: sourceProps.name_alt || sourceProps.NAME_ALT || "",
          admin: country.name,
          adm0_a3: country.iso3 || code,
          iso_3166_2: sourceProps.iso_3166_2 || sourceProps.ISO_3166_2 || "",
          type: sourceProps.type || sourceProps.TYPE || "",
          type_en: sourceProps.type_en || sourceProps.TYPE_EN || "",
          latitude: sourceProps.latitude == null || sourceProps.latitude === "" ? NaN : Number(sourceProps.latitude),
          longitude: sourceProps.longitude == null || sourceProps.longitude === "" ? NaN : Number(sourceProps.longitude)
        },
        geometry: sourceFeature.geometry
      };
      countryFeatures.push(feature);
      matched++;
    }

    if (matched < 1000 || !grouped.size) {
      throw new Error(`Dataset berhasil dibaca tetapi hanya ${matched} wilayah yang cocok dengan peta negara. Pemetaan kode negara perlu diperiksa.`);
    }

    globalADM1ByCountry = grouped;
    globalADM1FeatureCount = matched;
    globalADM1Source = source || "cache browser";
    return grouped;
  }

  // Keep province polygons accurate at the game's world-map scale while
  // shortening coordinate numbers and dropping rounded duplicate vertices.
  function compactGeometry(geometry) {
    if (!geometry) return geometry;
    const precision = 10000; // 0.0001 degree, roughly 11 metres at the equator.
    const compactRing = ring => {
      const output = [];
      for (const coordinate of ring || []) {
        const lon = Math.round(Number(coordinate[0]) * precision) / precision;
        const lat = Math.round(Number(coordinate[1]) * precision) / precision;
        const previous = output[output.length - 1];
        if (!previous || previous[0] !== lon || previous[1] !== lat) output.push([lon, lat]);
      }
      if (output.length >= 3) {
        const first = output[0], last = output[output.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) output.push([...first]);
      }
      return output;
    };
    if (geometry.type === "Polygon") {
      return { type: "Polygon", coordinates: (geometry.coordinates || []).map(compactRing) };
    }
    if (geometry.type === "MultiPolygon") {
      return { type: "MultiPolygon", coordinates: (geometry.coordinates || []).map(polygon => polygon.map(compactRing)) };
    }
    return geometry;
  }

  async function loadGlobalADM1Bundle() {
    if (globalADM1ByCountry.size) return globalADM1ByCountry;
    if (globalADM1Promise) return globalADM1Promise;

    globalADM1Promise = (async () => {
      setStatus("Memuat satu database provinsi global…");
      updateLoadingProgress(18, "Mengunduh provinsi seluruh dunia…", "Satu database global · bukan unduhan per negara", "provinces");
      const data = await fetchGlobalADM1JSON(transferReporter(19, 69, "Mengunduh database provinsi"));
      // Normalize the global dataset once. Every province is indexed before a
      // visitor can select a country; attacking another country never fetches data.
      const compact = data.features
        .filter(feature => feature?.geometry && ["Polygon", "MultiPolygon"].includes(feature.geometry.type))
        .map(feature => {
          const p = feature.properties || {};
          return {
            type: "Feature",
            properties: {
              name: admin1FeatureName(feature),
              name_en: p.name_en || p.NAME_EN || "",
              name_local: p.name_local || p.NAME_LOCAL || "",
              name_alt: p.name_alt || p.NAME_ALT || "",
              admin: admin1FeatureAdmin(feature),
              adm0_a3: admin1FeatureISO3(feature),
              iso_3166_2: p.iso_3166_2 || p.ISO_3166_2 || "",
              type: p.type || p.TYPE || "",
              type_en: p.type_en || p.TYPE_EN || "",
              latitude: p.latitude == null || p.latitude === "" ? NaN : Number(p.latitude),
              longitude: p.longitude == null || p.longitude === "" ? NaN : Number(p.longitude)
            },
            geometry: compactGeometry(feature.geometry)
          };
        });
      if (compact.length < 1000) throw new Error(`Hanya ${compact.length} fitur provinsi ditemukan; paket harus berisi minimal 1.000 wilayah.`);
      updateLoadingProgress(72, "Mengoptimalkan data provinsi…", `${compact.length.toLocaleString("id-ID")} wilayah dibersihkan dan diringkas`, "provinces");
      indexGlobalADM1(compact, data.__worldWarSource || "database global");
      updateLoadingProgress(77, "Database provinsi terindeks", `${globalADM1FeatureCount.toLocaleString("id-ID")} wilayah dikelompokkan berdasarkan negara`, "regions");
      return globalADM1ByCountry;
    })();

    try {
      return await globalADM1Promise;
    } catch (error) {
      globalADM1Promise = null;
      throw error;
    }
  }

  async function fetchADM1Features(country) {
    if (country.adm1Features) return country.adm1Features;
    const key = country.iso3 || `NAME:${normalizeName(country.name)}`;
    if (adm1Cache.has(key)) return adm1Cache.get(key);

    const promise = (async () => {
      await loadGlobalADM1Bundle();
      let features = globalADM1ByCountry.get(key);
      if (!features) {
        for (const list of globalADM1ByCountry.values()) {
          const first = list[0];
          if (first && normalizeName(first.properties?.admin) === normalizeName(country.name)) {
            features = list;
            break;
          }
        }
      }
      if (!features?.length) {
        // A few microstates have no ADM1 unit in the source. Keep them playable
        // as one clearly-labelled national territory; do not invent province names.
        const fallback = {
          type: "Feature",
          properties: { name: "Wilayah Nasional", admin: country.name, adm0_a3: country.iso3 || "", latitude: country.center[1], longitude: country.center[0] },
          geometry: country.feature.geometry
        };
        return [{ feature: fallback, name: "Wilayah Nasional" }];
      }
      return features.map(feature => ({
        feature,
        name: provinceName(feature, admin1FeatureName(feature) || `${country.name} · Wilayah administratif`)
      }));
    })();

    adm1Cache.set(key, promise);
    try {
      const result = await promise;
      adm1Cache.set(key, result);
      country.adm1Features = result;
      return result;
    } catch (error) {
      adm1Cache.delete(key);
      throw error;
    }
  }

  async function preloadAllWorldProvinces() {
    await loadGlobalADM1Bundle();
    resetProvinceData();
    const total = countries.length;
    updateLoadingProgress(78, "Menyusun provinsi seluruh dunia…", "Menyiapkan wilayah yang dapat dimainkan", "regions");
    for (let i = 0; i < total; i++) {
      const country = countries[i];
      await loadCountryProvinces(country, -1);
      if ((i + 1) % 2 === 0 || i + 1 === total) {
        const progress = 78 + ((i + 1) / total) * 17;
        setStatus(`Menyiapkan provinsi dunia… ${i + 1}/${total} negara · ${provinces.length.toLocaleString("id-ID")} wilayah`);
        updateLoadingProgress(progress, "Menyusun provinsi seluruh dunia…", `${i + 1}/${total} negara · ${provinces.length.toLocaleString("id-ID")} provinsi`, "regions");
        // Keep the animated loading card responsive. Drawing thousands of
        // Path2D regions after every pair of countries wastes CPU/GPU on phones;
        // the complete map is rendered once all regions and borders are ready.
        await new Promise(resolve => requestAnimationFrame(() => resolve()));
      }
    }
    updateLoadingProgress(96, "Menghubungkan wilayah bertetangga…", "Menyiapkan jalur invasi antarprovinsi", "regions");
    for (let i = 0; i < countries.length; i++) {
      connectCrossCountryProvinces(countries[i]);
      if ((i + 1) % 8 === 0 || i + 1 === countries.length) {
        updateLoadingProgress(96 + ((i + 1) / countries.length) * 3, "Menyelesaikan jaringan perbatasan…", `${i + 1}/${countries.length} negara diperiksa`, "regions");
        await new Promise(resolve => requestAnimationFrame(() => resolve()));
      }
    }
    const missingCountries = countries.filter(country => !country.provincesLoaded || !country.provinceIds.length);
    if (missingCountries.length) {
      const sample = missingCountries.slice(0, 8).map(country => country.name).join(", ");
      throw new Error(`${missingCountries.length} negara belum memiliki wilayah yang siap: ${sample}. Database global tidak lengkap.`);
    }
    globalADM1FeatureCount = provinces.length;
    updateLoadingProgress(100, "Semua provinsi siap!", `${provinces.length.toLocaleString("id-ID")} provinsi dari ${countries.length.toLocaleString("id-ID")} negara siap dimainkan`, "ready");
  }

  function checkCoastline(province) {
    const parent = countries[province.countryIndex];
    if (!parent) return false;
    const offsets = [[.2, 0], [-.2, 0], [0, .2], [0, -.2], [.15, .15], [-.15, -.15], [.15, -.15], [-.15, .15]];
    for (const [dx, dy] of offsets) {
      const probe = project(province.center[0] + dx, province.center[1] + dy);
      if (!ctx.isPointInPath(parent.path, probe.x, probe.y, "evenodd")) return true;
    }
    return false;
  }

  function provinceName(feature, fallback) {
    const p = feature.properties || {};
    const parentKey = normalizeName(p.admin || p.ADMIN || "");
    const candidates = [
      p.name, p.name_en, p.NAME, p.NAME_EN, p.name_local, p.name_alt,
      p.NAME_1, p.name_1, p.PROVINSI, p.NAMOBJ, p.namobj,
      p.province, p.VARNAME_1, p.region, p.region_name
    ];
    for (const candidate of candidates) {
      const value = String(candidate ?? "").trim().replace(/\s+/g, " ");
      const key = normalizeName(value);
      if (value && key && key !== parentKey && !["99", "unknown", "none", "null", "nan", "undefined"].includes(key)) {
        return value.split(/[|;]/)[0].trim();
      }
    }
    return String(fallback || "Wilayah administratif").trim();
  }

  function connectLocalProvinceAdjacency(countryProvinces) {
    const pointOwners = new Map();
    countryProvinces.forEach(province => {
      const vertexKeys = new Set();
      for (const ring of ringsFor(province.feature.geometry)) {
        for (const point of ring) vertexKeys.add(pointKey(point));
      }
      for (const key of vertexKeys) {
        if (!pointOwners.has(key)) pointOwners.set(key, new Set());
        pointOwners.get(key).add(province.id);
      }
    });
    for (const entries of pointOwners.values()) {
      const ids = [...entries];
      if (ids.length < 2) continue;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          provinces[ids[i]].neighbors.add(ids[j]);
          provinces[ids[j]].neighbors.add(ids[i]);
        }
      }
    }

    // Geometry sources may round adjacent borders differently. Add nearest local regions as a fallback.
    countryProvinces.forEach(province => {
      const nearest = countryProvinces.filter(other => other.id !== province.id)
        .map(other => ({ id: other.id, distance: haversine(province.center, other.center) }))
        .sort((a, b) => a.distance - b.distance).slice(0, 2);
      for (const item of nearest) {
        province.neighbors.add(item.id);
        provinces[item.id].neighbors.add(province.id);
      }
    });
  }

  function connectCrossCountryProvinces(country) {
    for (const neighborIndex of country.neighbors) {
      const neighbor = countries[neighborIndex];
      if (!neighbor || !neighbor.provincesLoaded || !neighbor.provinceIds.length) continue;
      const local = country.provinceIds.map(id => provinces[id]).filter(Boolean);
      const foreign = neighbor.provinceIds.map(id => provinces[id]).filter(Boolean);
      if (!local.length || !foreign.length) continue;

      // Link each border-side administrative unit to its closest counterpart
      // on the neighbouring country. This is more resilient than requiring
      // identical polygon vertices in datasets from different providers.
      for (const a of local) {
        let best = null, bestDistance = Infinity;
        for (const b of foreign) {
          const distance = haversine(a.center, b.center);
          if (distance < bestDistance) { bestDistance = distance; best = b; }
        }
        if (best) {
          a.neighbors.add(best.id);
          best.neighbors.add(a.id);
        }
      }
      for (const b of foreign) {
        let best = null, bestDistance = Infinity;
        for (const a of local) {
          const distance = haversine(b.center, a.center);
          if (distance < bestDistance) { bestDistance = distance; best = a; }
        }
        if (best) {
          b.neighbors.add(best.id);
          best.neighbors.add(b.id);
        }
      }
    }
  }

  async function loadCountryProvinces(country, owner = -1) {
    if (country.provincesLoaded) return country.provinceIds.map(id => provinces[id]);
    if (country.provincesLoading) {
      await country.provincesLoading;
      return country.provinceIds.map(id => provinces[id]);
    }
    country.provincesLoading = (async () => {
      const features = await fetchADM1Features(country);
      const firstId = provinces.length;
      const newProvinces = [];
      const batchSize = window.matchMedia("(max-width: 760px)").matches ? 28 : 64;
      for (let start = 0; start < features.length; start += batchSize) {
        const end = Math.min(features.length, start + batchSize);
        for (let index = start; index < end; index++) {
          const item = features[index];
          const path = makePath(item.feature);
          const interior = findInteriorPointFast(item.feature, path);
          newProvinces.push({
            id: firstId + index,
            name: provinceName(item.feature, item.name),
            feature: item.feature,
            path,
            center: interior.point,
            labelClearance: interior.clearance,
            countryIndex: country.index,
            owner,
            originalOwner: -1,
            garrison: 0,
            buildings: { city: 0, industry: 0, defense: 0 },
            neighbors: new Set(),
            coastal: false,
            isCapital: false
          });
        }
        if (end < features.length) {
          const detail = `${country.name}: ${end}/${features.length} wilayah diproses`;
          updateLoadingProgress(Math.max(79, loadingProgressValue), "Menyusun geometri provinsi…", detail, "regions");
          await new Promise(resolve => requestAnimationFrame(() => resolve()));
        }
      }
      // Commit the full country in one step, so a failed geometry never leaves
      // invisible/duplicate province records in the game state.
      provinces.push(...newProvinces);
      country.provinceIds = newProvinces.map(province => province.id);
      country.provincesLoaded = true;
      connectLocalProvinceAdjacency(newProvinces);
      newProvinces.forEach(province => { province.coastal = checkCoastline(province); });
      return newProvinces;
    })();
    try {
      return await country.provincesLoading;
    } finally {
      country.provincesLoading = null;
    }
  }

  function findCountryByAliases(aliases) {
    const wanted = new Set(aliases.map(normalizeName));
    return countries.find(country => wanted.has(normalizeName(country.name)));
  }

  function resetProvinceData() {
    provinces = [];
    for (const country of countries) {
      country.provinceIds = [];
      country.provincesLoaded = false;
      country.provincesLoading = null;
    }
  }

  function startGame(countryIndex, presidentName = pendingPresidentName) {
    const chosen = countries[countryIndex];
    if (!chosen) return;
    if (!provinceDataReady || !countries.every(country => country.provincesLoaded && country.provinceIds.length)) {
      showToast("Database provinsi belum siap. Tunggu sampai peta selesai dimuat.");
      return;
    }
    pendingPresidentName = String(presidentName || "").trim().slice(0, 40);
    if (!pendingPresidentName) {
      showToast("Masukkan nama presiden sebelum memulai permainan.");
      openCountryChoice(chosen, popupAnchor.x, popupAnchor.y);
      return;
    }

    hideContext();
    hideToolPanel();
    stopTimers();
    pendingAttacks = [];
    battleEffects = [];
    selectedSource = null;
    selectedTarget = null;
    gameStarted = false;
    gameOver = false;
    aiTurnCursor = 1;
    diplomacyRelations = new Map();
    eventLog = [];
    gameYear = START_YEAR;
    yearProgress = 0;
    gameSpeed = 1;

    const campaignCountries = [chosen, ...countries.filter(country => country.index !== chosen.index)];
    const campaignColors = assignCampaignColors(campaignCountries);
    players = campaignCountries.map((country, index) => {
      const profile = createCampaignAIProfile(country, chosen, index === 0);
      return {
        name: country.name,
        countryIndex: country.index,
        color: campaignColors[index],
        human: index === 0,
        president: index === 0 ? pendingPresidentName : "Pemimpin AI",
        money: Math.max(25000000, (country.gdpBaseUSD || 1e9) * .00001),
        gdpBaseUSD: country.gdpBaseUSD || 1e9,
        economyReference: country.economySource || "estimasi",
        military: profile.military,
        militaryReferenceRank: country.militaryReferenceRank || null,
        militaryBaseScore: country.militaryBaseScore || .1,
        aiWeakerThanPlayer: profile.aiWeakerThanPlayer,
        aiRankGap: profile.aiRankGap,
        aiWeaknessFactor: profile.aiWeaknessFactor,
        aiLastAttackAt: 0,
        eliminated: false
      };
    });

    for (const province of provinces) {
      province.owner = -1;
      province.originalOwner = -1;
      province.garrison = 0;
      province.buildings = { city: 0, industry: 0, defense: 0 };
      province.isCapital = false;
    }

    for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
      const country = countries[players[playerIndex].countryIndex];
      const owned = country.provinceIds.map(id => provinces[id]).filter(Boolean);
      if (!owned.length) continue;
      const garrisonFactor = playerIndex > 0 ? (players[playerIndex].aiWeaknessFactor || 1) : 1;
      for (const province of owned) {
        province.owner = playerIndex;
        province.originalOwner = playerIndex;
        const baseGarrison = 1750 + Math.floor(Math.random() * 700);
        province.garrison = Math.max(850, Math.round(baseGarrison * garrisonFactor));
      }
      const capitalReference = country.capitalCoords || country.center;
      const capitalWorld = project(capitalReference[0], capitalReference[1]);
      const capital = owned.find(item => ctx.isPointInPath(item.path, capitalWorld.x, capitalWorld.y, "evenodd")) ||
        owned.reduce((best, item) => haversine(item.center, capitalReference) < haversine(best.center, capitalReference) ? item : best);
      capital.isCapital = true;
      country.capitalProvinceId = capital.id;
      capital.buildings = { city: 2, industry: 2, defense: 2 };
      capital.garrison = Math.max(4200, Math.round(8500 * garrisonFactor));
    }

    currentPlayer = 0;
    gameStarted = true;
    gameOver = false;
    industryTick = 0;
    campaignRivalsDefeated = false;
    const home = countries[chosen.index];
    centerCamera(home.center, 1.25);
    setStatus(`${players.length - 1} negara AI aktif · tahun ${gameYear} · semua provinsi siap`);
    addLog(`🌍 ${chosen.name} memulai kampanye dunia pada tahun ${gameYear}.`);
    addLog(`🕊️ Seluruh negara memulai dalam keadaan damai. AI tidak menyatakan perang lebih dulu.`);
    updateHUD();
    updateTimeHUD();
    render();
    showToast(`${chosen.name} siap. Semua kekuatan militer dikelola secara nasional; kota, industri, dan benteng tetap per provinsi.`);
    startSimulationTimers();
  }

  function stopTimers() {
    if (gameTimer) clearInterval(gameTimer);
    if (incomeTimer) clearInterval(incomeTimer);
    if (gameYearTimer) clearInterval(gameYearTimer);
    gameTimer = incomeTimer = gameYearTimer = null;
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  function resetGame() {
    stopTimers();
    gameStarted = false;
    gameOver = false;
    players = [];
    diplomacyRelations = new Map();
    selectedSource = null;
    selectedTarget = null;
    campaignRivalsDefeated = false;
    aiTurnCursor = 1;
    pendingPresidentName = "";
    pendingAttacks = [];
    battleEffects = [];
    eventLog = [];
    gameYear = START_YEAR;
    yearProgress = 0;
    gameSpeed = 1;
    for (const province of provinces) {
      province.owner = -1;
      province.originalOwner = -1;
      province.units = { land: 0, air: 0, sea: 0 };
      province.garrison = 0;
      province.buildings = { city: 0, industry: 0, defense: 0 };
      province.isCapital = false;
    }
    camera = { x: 0, y: 0, zoom: 1 };
    syncZoomControls();
    hideContext();
    hideToolPanel();
    updateTimeHUD();
    setStatus(provinceDataReady ? "Semua provinsi siap · klik negara untuk memilih" : "Database provinsi sedang disiapkan…");
    updateHUD();
    render();
    showToast("Pilih negara di peta. Simulasi baru selalu dimulai pada tahun 2026.");
  }

  function updateLoadingProgress(percent, title, detail, stage = "countries", reset = false) {
    if (!loadingScreen) return;
    if (reset) loadingProgressValue = 0;
    const next = Math.max(loadingProgressValue, Math.min(100, Math.max(0, percent)));
    loadingProgressValue = next;
    loadingTitle.textContent = title || "Menyiapkan game…";
    loadingProgressBar.style.width = `${next.toFixed(1)}%`;
    loadingPercent.textContent = `${Math.round(next)}%`;
    loadingBytes.textContent = detail || "Sedang menyiapkan data";

    const steps = [
      ["loadingStepCountries", next >= 12, stage === "countries"],
      ["loadingStepProvinces", next >= 72, stage === "provinces"],
      ["loadingStepRegions", next >= 98, stage === "regions" || stage === "ready"]
    ];
    for (const [id, done, active] of steps) {
      const element = document.getElementById(id);
      if (!element) continue;
      element.classList.toggle("done", done);
      element.classList.toggle("active", !done && active);
    }
    loadingScreen.dataset.stage = stage;
  }

  function finishLoading() {
    updateLoadingProgress(100, "Medan perang siap!", `${provinces.length.toLocaleString("id-ID")} provinsi telah disiapkan`, "ready");
    for (const id of ["loadingStepCountries", "loadingStepProvinces", "loadingStepRegions"]) {
      document.getElementById(id)?.classList.add("done");
    }
    window.setTimeout(() => {
      loadingScreen.classList.add("is-hidden");
      window.setTimeout(() => { loadingScreen.hidden = true; }, 520);
    }, 420);
  }

  function showLoadingError(error) {
    loadingScreen.hidden = false;
    loadingScreen.classList.remove("is-hidden");
    loadingScreen.classList.add("has-error");
    loadingTitle.textContent = "DATA PETA BELUM SIAP";
    loadingBytes.textContent = "Koneksi data terhenti";
    loadingError.textContent = error?.message || "Terjadi kesalahan ketika memuat data peta.";
    loadingError.hidden = false;
    retryLoadBtn.hidden = false;
  }

  function retryWorldLoad() {
    provinceDataError = null;
    provinceDataReady = false;
    globalADM1Promise = null;
    globalADM1ByCountry = new Map();
    globalADM1FeatureCount = 0;
    adm1Cache.clear();
    countries = [];
    provinces = [];
    loadingScreen.classList.remove("has-error", "is-hidden");
    loadingScreen.hidden = false;
    loadingError.hidden = true;
    retryLoadBtn.hidden = true;
    updateLoadingProgress(0, "Mencoba kembali…", "Memulai ulang koneksi peta", "countries", true);
    loadWorld();
  }

  function setStatus(message) {
    const element = document.getElementById("mapStatus");
    if (element) element.textContent = message;
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
  }

  function addLog(message) {
    const entry = { text: String(message), year: gameYear || START_YEAR, time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) };
    eventLog.unshift(entry);
    if (eventLog.length > 300) eventLog.length = 300;
    const list = document.getElementById("toolPanelLogList");
    if (list && !document.getElementById("toolPanel").hidden && toolPanelMode === "news") {
      list.innerHTML = renderLogEntries();
    }
  }

  function renderLogEntries() {
    if (!eventLog.length) return '<p class="panel-empty">Belum ada laporan. Peristiwa permainan akan muncul di sini.</p>';
    return eventLog.map(entry => `<div class="game-log-entry"><time>Tahun ${entry.year} · ${escapeHTML(entry.time)}</time><p>${escapeHTML(entry.text)}</p></div>`).join("");
  }

  function ownerName(owner) {
    if (owner < 0) return "Netral";
    return players[owner]?.name || "Tidak diketahui";
  }

  function playerColor(owner) {
    return owner < 0 ? "#65798b" : (players[owner]?.color || "#65798b");
  }

  function totalUnits(owner) {
    return playerMilitaryTotal(players[owner]);
  }

  function updateHUD() {
    const human = players[0];
    const counts = new Array(players.length).fill(0);
    for (const province of provinces) {
      if (province.owner >= 0 && province.owner < players.length) counts[province.owner]++;
    }
    document.getElementById("myCountry").textContent = human?.name || "Belum dipilih";
    document.getElementById("myPresident").textContent = human?.president || "Belum diisi";
    document.getElementById("gold").textContent = human ? formatUSD(human.money) : "$0";
    document.getElementById("army").textContent = human ? playerMilitaryTotal(human).toLocaleString("id-ID") : "0";
    document.getElementById("provinceCount").textContent = human ? counts[0].toLocaleString("id-ID") : "0";
    if (!human) { document.getElementById("rank").textContent = "—"; return; }
    const sorted = players.map((player, index) => ({ index, score: currentMilitaryScore(player) })).sort((a, b) => b.score - a.score);
    document.getElementById("rank").textContent = `#${sorted.findIndex(item => item.index === 0) + 1}`;
  }

  function getCountryAt(point) {
    for (let i = countries.length - 1; i >= 0; i--) {
      if (ctx.isPointInPath(countries[i].path, point.x, point.y)) return countries[i];
    }
    return null;
  }

  function getProvinceAt(point) {
    for (let i = provinces.length - 1; i >= 0; i--) {
      const province = provinces[i];
      if (ctx.isPointInPath(province.path, point.x, point.y)) return province;
    }
    return null;
  }

  function getProvinceNearest(country, point) {
    const list = country.provinceIds.map(id => provinces[id]).filter(Boolean);
    if (!list.length) return null;
    const inShape = list.find(province => ctx.isPointInPath(province.path, point.x, point.y));
    if (inShape) return inShape;
    return list.reduce((best, province) => {
      const a = project(province.center[0], province.center[1]);
      const d1 = (a.x - point.x) ** 2 + (a.y - point.y) ** 2;
      const b = project(best.center[0], best.center[1]);
      const d2 = (b.x - point.x) ** 2 + (b.y - point.y) ** 2;
      return d1 < d2 ? province : best;
    });
  }

  function showContext(html, clientX = popupAnchor.x, clientY = popupAnchor.y, mode = "generic") {
    contextContent.innerHTML = html;
    contextMode = mode;
    contextCard.hidden = false;
    contextCard.classList.toggle("context-bottom-sheet", window.matchMedia("(max-width: 760px)").matches);
    // Desktop command cards dock to the right edge instead of covering the
    // middle of the map. Phones use a bottom sheet with a bounded height.
    if (window.matchMedia("(max-width: 760px)").matches) {
      contextCard.style.left = "8px";
      contextCard.style.right = "8px";
      contextCard.style.width = "auto";
      contextCard.style.top = "auto";
      contextCard.style.bottom = "calc(58px + env(safe-area-inset-bottom))";
      contextCard.style.maxHeight = "min(58dvh, 620px)";
    } else {
      contextCard.style.left = "auto";
      contextCard.style.right = "12px";
      contextCard.style.top = "88px";
      contextCard.style.bottom = "auto";
      contextCard.style.width = "min(370px, calc(100vw - 24px))";
      contextCard.style.maxHeight = "calc(100% - 118px)";
    }
  }

  let toolPanelMode = "none";
  function showToolPanel(html, mode) {
    const panel = document.getElementById("toolPanel");
    const content = document.getElementById("toolPanelContent");
    content.innerHTML = html;
    panel.hidden = false;
    toolPanelMode = mode;
  }
  function hideToolPanel() {
    const panel = document.getElementById("toolPanel");
    if (panel) panel.hidden = true;
    toolPanelMode = "none";
  }
  function openTerritoryPanel(filter = territoryFilter) {
    territoryFilter = filter;
    if (!gameStarted) { showToast("Mulai permainan terlebih dahulu untuk melihat daftar provinsi."); return; }
    const owned = provinces.filter(p => p.owner === 0);
    const captured = owned.filter(p => p.originalOwner !== 0);
    const list = filter === "captured" ? captured : owned;
    const grouped = new Map();
    for (const province of list) {
      const countryName = countries[province.countryIndex]?.name || "Wilayah";
      if (!grouped.has(countryName)) grouped.set(countryName, []);
      grouped.get(countryName).push(province);
    }
    const rows = [...grouped.entries()].sort((a,b) => a[0].localeCompare(b[0])).map(([name, items]) =>
      `<div class="territory-country"><h3>${escapeHTML(name)} <small>${items.length} provinsi</small></h3>${items.sort((a,b)=>a.name.localeCompare(b.name)).map(item=>`<button class="territory-row" type="button" data-jump-province="${item.id}"><span>${escapeHTML(item.name)}</span><small>${item.originalOwner === 0 ? "Wilayah asal" : `Direbut dari ${escapeHTML(players[item.originalOwner]?.name || "negara lain")}`}</small></button>`).join("")}</div>`
    ).join("");
    showToolPanel(`<div class="tool-panel-head"><div><span>DATABASE WILAYAH</span><h2>Provinsi negara kita</h2><p>${owned.length} dikuasai · ${captured.length} hasil invasi</p></div><button data-tool-close type="button" aria-label="Tutup">×</button></div>
      <div class="panel-tabs"><button data-territory-filter="all" class="${filter === "all" ? "active" : ""}">Semua dikuasai (${owned.length})</button><button data-territory-filter="captured" class="${filter === "captured" ? "active" : ""}">Hasil invasi (${captured.length})</button></div>
      <input class="panel-search" type="search" placeholder="Cari provinsi atau negara…" id="territorySearch">
      <div class="territory-list" id="territoryRows">${rows || '<p class="panel-empty">Belum ada provinsi dalam daftar ini.</p>'}</div>`, "territory");
  }
  function openRankingPanel(tab = rankingTab) {
    rankingTab = tab;
    if (!gameStarted) { showToast("Mulai permainan untuk melihat peringkat semua negara."); return; }
    const military = tab === "military";
    const sorted = players.map((player, index) => ({ player, index,
      score: military ? currentMilitaryScore(player) : currentEconomyScore(player),
      value: military ? playerMilitaryTotal(player) : currentEconomyScore(player)
    })).sort((a,b) => b.score - a.score);
    const rows = sorted.map((item, index) => `<div class="ranking-row ${item.index === 0 ? "is-player" : ""}"><b class="ranking-place">${index + 1}</b><span class="ranking-flag" style="background:${item.player.color}"></span><div class="ranking-name"><strong>${escapeHTML(item.player.name)}${item.index === 0 ? " · Kamu" : ""}</strong><small>${military ? `Referensi 2026: ${item.player.militaryReferenceRank ? `#${item.player.militaryReferenceRank} GFP` : "estimasi"}` : `Basis GDP: ${escapeHTML(item.player.economyReference || "estimasi")}`}</small></div><strong class="ranking-value">${military ? item.value.toLocaleString("id-ID") + " unit" : formatUSD(item.value)}</strong></div>`).join("");
    const sourceNote = military
      ? "Acuan awal: Global Firepower 2026 untuk 145 negara. Negara di luar daftar memakai estimasi populasi/GDP. Urutan berubah ketika cadangan militer nasional dan wilayah kampanye berubah."
      : "Acuan awal: GDP nominal 2026 IMF WEO Oktober 2026 untuk negara dengan data tersedia. Negara tanpa observasi IMF memakai estimasi GDP Natural Earth/populasi. Nilai memakai dolar AS; kota dan industri menambah aset ekonomi selama permainan.";
    showToolPanel(`<div class="tool-panel-head"><div><span>GLOBAL LEADERBOARD</span><h2>Peringkat dunia</h2><p>${players.length} negara dalam kampanye</p></div><button data-tool-close type="button" aria-label="Tutup">×</button></div>
      <div class="panel-tabs"><button data-rank-tab="military" class="${military ? "active" : ""}">⚔️ Militer</button><button data-rank-tab="economy" class="${!military ? "active" : ""}">💵 Ekonomi</button></div>
      <div class="ranking-list">${rows}</div><p class="panel-source-note">${escapeHTML(sourceNote)}</p>`, "ranking");
  }
  function openNewsPanel() {
    showToolPanel(`<div class="tool-panel-head"><div><span>IN-GAME COMMUNICATIONS</span><h2>Laporan dunia</h2><p>Berita, perang, diplomasi, ekonomi, dan perubahan tahun</p></div><button data-tool-close type="button" aria-label="Tutup">×</button></div><div class="game-log-list" id="toolPanelLogList">${renderLogEntries()}</div>`, "news");
  }

  function hideContext() {
    contextCard.hidden = true;
    contextMode = "none";
    contextContent.innerHTML = "";
  }

  function popupHeader(kicker, title, subtitle) {
    return `<div class="context-head"><div><span class="context-kicker">${escapeHTML(kicker)}</span><h2>${escapeHTML(title)}</h2><div class="context-sub">${escapeHTML(subtitle || "")}</div></div><button class="close-button" data-action="close" type="button" aria-label="Tutup">×</button></div>`;
  }

  function adminUnitLabelFromType(value) {
    const type = normalizeName(value);
    if (!type || type.includes("adm1") || type.includes("admin1") || type.includes("admin-1")) return "Provinsi";
    if (type.includes("governorate")) return "Kegubernuran";
    if (type.includes("prefecture")) return "Prefektur";
    if (type.includes("voivodeship")) return "Voivodat";
    if (type.includes("federaldistrict")) return "Distrik Federal";
    if (type.includes("autonomousregion")) return "Wilayah Otonom";
    if (type.includes("autonomousoblast")) return "Oblast Otonom";
    if (type.includes("autonomous")) return "Wilayah Otonom";
    if (type.includes("province")) return "Provinsi";
    if (type.includes("state")) return "Negara Bagian";
    if (type.includes("department")) return "Departemen";
    if (type.includes("prefecture")) return "Prefektur";
    if (type.includes("oblast")) return "Oblast";
    if (type.includes("krai")) return "Krai";
    if (type.includes("county")) return "County";
    if (type.includes("district")) return "Distrik";
    if (type.includes("region")) return "Wilayah";
    if (type.includes("territory")) return "Teritori";
    if (type.includes("municipality")) return "Munisipalitas";
    if (type.includes("canton")) return "Kanton";
    if (type.includes("emirate")) return "Emirat";
    if (type.includes("parish")) return "Paroki";
    if (type.includes("commune")) return "Komune";
    if (type.includes("city")) return "Kota";
    return "Provinsi";
  }

  function countryAdminUnitInfo(country) {
    const records = country.adm1Features || [];
    const typeCounts = new Map();
    for (const item of records) {
      const p = item.feature?.properties || {};
      const raw = String(p.type_en || p.type || p.type_local || "").trim();
      const label = adminUnitLabelFromType(raw);
      typeCounts.set(label, (typeCounts.get(label) || 0) + 1);
    }
    const unitLabel = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Wilayah";
    const names = country.provinceIds.map(id => provinces[id]?.name).filter(Boolean);
    const count = country.provinceIds.length || records.length || 1;
    return { unitLabel, count, names };
  }

  function openCountryChoice(country, clientX, clientY) {
    popupAnchor = { x: clientX, y: clientY };
    const isoLabel = country.iso3 ? `Kode ${country.iso3}` : "Kode ISO belum ditemukan";
    const adminInfo = countryAdminUnitInfo(country);
    const regionPreview = adminInfo.names.slice(0, 5).join(" · ");
    const moreRegions = adminInfo.names.length > 5 ? ` · +${adminInfo.names.length - 5} lainnya` : "";
    const capitalValue = country.capitalName || "Belum terdata";
    showContext(`${popupHeader("PILIH NEGARA", country.name, `${isoLabel} · ${country.neighbors.size} tetangga darat terdata`)}
      <div class="context-stats"><div class="context-stat"><small>STATUS</small><b>Belum dimulai</b></div><div class="context-stat"><small>PEMBAGIAN WILAYAH</small><b>${adminInfo.count.toLocaleString("id-ID")} ${escapeHTML(adminInfo.unitLabel)}</b></div><div class="context-stat"><small>IBU KOTA</small><b>${escapeHTML(capitalValue)}</b></div></div>
      <div class="country-region-summary"><small>DAFTAR ${escapeHTML(adminInfo.unitLabel.toUpperCase())}</small><p>${escapeHTML(regionPreview || "Wilayah administratif tersedia")}${escapeHTML(moreRegions)}</p></div>
      <div class="context-section president-field">
        <label for="presidentNameInput">👤 Nama presiden / pemimpin negara</label>
        <input id="presidentNameInput" class="context-input" type="text" maxlength="40" autocomplete="off" spellcheck="false" placeholder="Contoh: Presiden Nusantara" value="${escapeHTML(pendingPresidentName)}">
        <p class="context-note">Nama ini akan ditampilkan sebagai pemimpin negara pada informasi permainan.</p>
      </div>
      <button class="context-button primary full" data-action="start-country" data-country="${country.index}" type="button">🌍 Mulai sebagai ${escapeHTML(country.name)}</button>`, clientX, clientY, "country");
  }

  function ownProvincePanel(province, clientX, clientY) {
    popupAnchor = { x: clientX, y: clientY };
    selectedSource = province.id;
    selectedTarget = null;
    const buildings = province.buildings;
    const military = players[0].military;
    const parentCountry = countries[province.countryIndex];
    const sourceStatus = province.isCapital ? `Ibu kota${parentCountry?.capitalName ? ` ${parentCountry.capitalName}` : ""}` : "Wilayah sendiri";
    const buildCards = Object.entries(BUILDING).map(([key, meta]) => {
      const level = buildings[key];
      const cost = meta.baseCost + level * meta.step;
      return `<button class="building-card" data-action="upgrade" data-building="${key}" type="button" ${level >= MAX_BUILDING || players[0].money < cost ? "disabled" : ""}>
        <span class="building-icon">${meta.icon}</span><b>${meta.label}</b><small>Lv ${level}/${MAX_BUILDING}</small><small>${level >= MAX_BUILDING ? "Maksimum" : formatUSD(cost)}</small></button>`;
    }).join("");
    const shopCards = Object.entries(UNIT_SHOP).map(([key, meta]) =>
      `<button class="unit-card" data-action="buy-unit" data-unit="${key}" type="button" ${players[0].money < meta.cost || (key === "sea" && !province.coastal) ? "disabled" : ""}>
        <span>${meta.icon}</span><b>+${meta.amount.toLocaleString("id-ID")} ${meta.label}</b><small>${formatUSD(meta.cost)}</small></button>`
    ).join("");
    showContext(`${popupHeader("PROVINSI SENDIRI", province.name, `${countries[province.countryIndex].name} · ${sourceStatus}`)}
      <div class="context-stats national-military-stats">
        <div class="context-stat"><small>🪖 DARAT NASIONAL</small><b>${military.land.toLocaleString("id-ID")}</b></div>
        <div class="context-stat"><small>✈️ UDARA NASIONAL</small><b>${military.air.toLocaleString("id-ID")}</b></div>
        <div class="context-stat"><small>🚢 LAUT NASIONAL</small><b>${military.sea.toLocaleString("id-ID")}</b></div>
      </div>
      <div class="national-money-line">Kas negara <strong>${formatUSD(players[0].money, false)}</strong></div>
      <div class="context-section"><h3>REKRUT KEKUATAN MILITER NASIONAL</h3><div class="unit-shop">${shopCards}</div><p class="context-note">Unit direkrut ke cadangan militer negara, bukan ditempatkan terpisah pada provinsi. Pilih provinsi pesisir untuk merekrut armada.</p></div>
      <div class="context-section"><h3>PEMBANGUNAN PROVINSI INI</h3><div class="building-grid">${buildCards}</div>
        <p class="context-note">🏙️ Kota dan 🏭 industri meningkatkan ekonomi nasional. 🛡️ Benteng memperkuat pertahanan lokal provinsi ini.</p>
      </div>
      <div class="context-section"><button class="context-button good full" data-action="close" type="button">✓ Jadikan titik asal operasi</button></div>`, clientX, clientY, "own");
    render();
  }

  function getAttackRoute(source, target, forces = {}) {
    if (!source || !target) return { valid: false, distance: Infinity, land: false, airlift: false, sea: false };
    const distance = haversine(source.center, target.center);
    const land = canLandAttack(source, target);
    const sea = Boolean(forces.sea > 0 && distance <= SEA_RANGE_KM && source.coastal && target.coastal);
    const airlift = Boolean(forces.air > 0 && distance <= AIR_RANGE_KM);
    const airInRange = distance <= AIR_RANGE_KM;
    const seaInRange = distance <= SEA_RANGE_KM && source.coastal && target.coastal;
    const hasGroundTransport = land || sea || airlift;
    const airValid = forces.air <= 0 || airInRange;
    const seaValid = forces.sea <= 0 || seaInRange;
    const landValid = forces.land <= 0 || hasGroundTransport;
    return { valid: airValid && seaValid && landValid, distance, land, airlift, sea, airInRange, seaInRange };
  }

  function relationKey(a, b) {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
  }

  function getRelation(a, b) {
    if (a === b) return { status: "self", since: 0 };
    return diplomacyRelations.get(relationKey(a, b)) || { status: "peace", since: 0 };
  }

  function setRelation(a, b, status, extra = {}) {
    if (a === b || !players[a] || !players[b]) return;
    diplomacyRelations.set(relationKey(a, b), {
      status,
      since: Date.now(),
      ...extra
    });
  }

  function relationLabel(status) {
    return ({
      peace: "Damai",
      trade: "Kerja sama ekonomi",
      nonAggression: "Pakta non-agresi",
      alliance: "Aliansi pertahanan",
      war: "Perang"
    })[status] || "Damai";
  }

  function isAtWar(a, b) {
    return a !== b && getRelation(a, b).status === "war";
  }

  function nationStrength(owner) {
    const player = players[owner];
    if (!player) return 0;
    const territory = provinces.reduce((sum, province) => sum + (province.owner === owner ? 1 : 0), 0);
    return playerMilitaryTotal(player) + territory * 120 + (player.gdpBaseUSD || 0) / 1e9 * 2;
  }

  function cancelPendingAttacksBetween(a, b) {
    const remaining = [];
    let cancelled = 0;
    for (const attack of pendingAttacks) {
      const target = provinces[attack.targetId];
      const targetOwner = target?.owner;
      const isPair = (attack.attacker === a && targetOwner === b) ||
        (attack.attacker === b && targetOwner === a);
      if (!isPair) {
        remaining.push(attack);
        continue;
      }
      const attacker = players[attack.attacker];
      if (attacker?.military) {
        attacker.military.land += Math.floor(attack.forces.land * .85);
        attacker.military.air += Math.floor(attack.forces.air * .85);
        attacker.military.sea += Math.floor(attack.forces.sea * .85);
      }
      cancelled++;
    }
    pendingAttacks = remaining;
    return cancelled;
  }

  function declareWar(attacker, defender, reason = "serangan dimulai") {
    if (attacker === defender || !players[attacker] || !players[defender]) return;
    const oldStatus = getRelation(attacker, defender).status;
    if (oldStatus !== "war") {
      setRelation(attacker, defender, "war", { reason });
      addLog(`⚔️ ${players[attacker].name} dan ${players[defender].name} kini berperang (${reason}).`);
    }

    // Player-initiated wars do not trigger defensive coalitions or AI retaliation.
    if (attacker === 0) return;
    // Defensive allies may still support an AI nation in an AI-versus-AI conflict.
    for (let ally = 0; ally < players.length; ally++) {
      if (ally === attacker || ally === defender) continue;
      if (getRelation(ally, defender).status !== "alliance") continue;
      if (!isAtWar(ally, attacker)) {
        setRelation(ally, attacker, "war", { reason: "membela sekutu" });
        addLog(`🤝 ${players[ally].name} bergabung membela sekutunya ${players[defender].name}.`);
      }
    }
  }

  function diplomaticAcceptance(kind, targetOwner) {
    const strengthRatio = (nationStrength(0) + 1) / (nationStrength(targetOwner) + 1);
    const balance = 1 - Math.min(1, Math.abs(Math.log(strengthRatio)) / 3);
    if (kind === "trade") return Math.max(.72, Math.min(.96, .86 + (strengthRatio > 1 ? .04 : 0)));
    if (kind === "nonAggression") return .91;
    if (kind === "alliance") return Math.max(.42, Math.min(.78, .48 + balance * .24 + (strengthRatio > .75 ? .04 : 0)));
    if (kind === "peace") return Math.max(.45, Math.min(.94, .62 + (strengthRatio > 1 ? .2 : -.08) + balance * .12));
    return 0;
  }

  function diplomacyPanelHTML(targetOwner) {
    if (!gameStarted || targetOwner <= 0 || !players[targetOwner]) return "";
    const relation = getRelation(0, targetOwner);
    const status = relation.status;
    const title = relationLabel(status);
    let actions = "";
    let note = "Negara yang berdamai tidak akan menyerang lebih dulu. Perang hanya dimulai jika kamu memerintahkan serangan.";

    if (status === "war") {
      actions = `<button class="context-button good full" data-action="diplomacy" data-treaty="peace" type="button">🕊️ Ajukan gencatan senjata / perdamaian</button>`;
      note = "Kedua negara sedang berperang. Jika perdamaian diterima, serangan yang masih dalam perjalanan akan dihentikan.";
    } else if (status === "alliance") {
      actions = `<button class="context-button gold full" data-action="diplomacy" data-treaty="trade" type="button">💰 Tingkatkan kerja sama ekonomi</button><button class="context-button full" data-action="diplomacy" data-treaty="end" type="button">Akhiri aliansi</button>`;
      note = "Sekutu mendapat bonus ekonomi dan dapat saling membantu saat salah satu diserang.";
    } else if (status === "nonAggression") {
      actions = `<button class="context-button gold full" data-action="diplomacy" data-treaty="trade" type="button">💰 Tawarkan kerja sama ekonomi</button><button class="context-button primary full" data-action="diplomacy" data-treaty="alliance" type="button">🤝 Tawarkan aliansi pertahanan</button><button class="context-button full" data-action="diplomacy" data-treaty="end" type="button">Batalkan pakta non-agresi</button>`;
      note = "Pakta non-agresi aktif. Kedua negara tidak akan saling menyerang selama perjanjian berlaku.";
    } else if (status === "trade") {
      actions = `<button class="context-button primary full" data-action="diplomacy" data-treaty="nonAggression" type="button">🕊️ Buat pakta non-agresi</button><button class="context-button primary full" data-action="diplomacy" data-treaty="alliance" type="button">🤝 Tawarkan aliansi pertahanan</button><button class="context-button full" data-action="diplomacy" data-treaty="end" type="button">Akhiri kerja sama</button>`;
      note = "Kerja sama ekonomi aktif dan memberi bonus pendapatan dolar AS untuk kedua negara.";
    } else {
      actions = `<button class="context-button gold full" data-action="diplomacy" data-treaty="trade" type="button">💰 Kerja sama ekonomi</button><button class="context-button primary full" data-action="diplomacy" data-treaty="nonAggression" type="button">🕊️ Pakta non-agresi</button><button class="context-button good full" data-action="diplomacy" data-treaty="alliance" type="button">🤝 Aliansi pertahanan</button>`;
    }

    return `<div class="context-section diplomacy-section">
      <div class="diplomacy-heading"><h3>🤝 DIPLOMASI</h3><span class="relation-pill relation-${status}">${escapeHTML(title)}</span></div>
      <div class="diplomacy-actions">${actions}</div>
      <p class="context-note">${escapeHTML(note)}</p>
    </div>`;
  }

  function handleDiplomacyAction(kind) {
    const province = selectedTarget !== null ? provinces[selectedTarget] : null;
    const targetOwner = province?.owner;
    if (!province || targetOwner == null || targetOwner <= 0 || !players[targetOwner]) {
      showToast("Pilih wilayah milik negara lain untuk membuka diplomasi.");
      return;
    }
    const relation = getRelation(0, targetOwner);
    const name = players[targetOwner].name;

    if (kind === "end") {
      requestGameConfirmation("Akhiri perjanjian?", `Hubungan dengan ${name} akan kembali menjadi damai biasa.`, () => {
        setRelation(0, targetOwner, "peace", { reason: "perjanjian diakhiri" });
        addLog(`📜 ${players[0].name} mengakhiri perjanjian dengan ${name}.`);
        showToast(`Perjanjian dengan ${name} diakhiri. Status kembali damai.`);
        targetProvincePanel(province, popupAnchor.x, popupAnchor.y);
      });
      return;
    }

    if (kind === "peace") {
      if (relation.status !== "war") {
        showToast("Tidak ada perang yang perlu dihentikan dengan negara ini.");
        return;
      }
      const chance = diplomaticAcceptance("peace", targetOwner);
      if (Math.random() <= chance) {
        setRelation(0, targetOwner, "peace", { reason: "perjanjian damai" });
        const cancelled = cancelPendingAttacksBetween(0, targetOwner);
        addLog(`🕊️ ${name} menerima tawaran perdamaian dari ${players[0].name}.`);
        showToast(`Perdamaian dengan ${name} disepakati${cancelled ? ` · ${cancelled} serangan dihentikan` : ""}.`);
      } else {
        addLog(`🕊️ ${name} menolak tawaran perdamaian.`);
        showToast(`${name} belum menerima tawaran perdamaian. Coba lagi setelah posisi perang berubah.`);
      }
      targetProvincePanel(province, popupAnchor.x, popupAnchor.y);
      updateHUD();
      render();
      return;
    }

    if (relation.status === "war") {
      showToast("Akhiri perang terlebih dahulu sebelum menawarkan perjanjian lain.");
      return;
    }
    if (relation.status === kind) {
      showToast(`Perjanjian ${relationLabel(kind)} dengan ${name} sudah aktif.`);
      return;
    }
    if (relation.status === "alliance" && kind !== "alliance") {
      showToast("Aliansi pertahanan lebih kuat. Akhiri aliansi sebelum menggantinya.");
      return;
    }

    const chance = diplomaticAcceptance(kind, targetOwner);
    if (Math.random() <= chance) {
      setRelation(0, targetOwner, kind, { acceptedAt: Date.now() });
      const messages = {
        trade: `💰 ${name} menyetujui kerja sama ekonomi dengan ${players[0].name}.`,
        nonAggression: `🕊️ ${name} menyetujui pakta non-agresi dengan ${players[0].name}.`,
        alliance: `🤝 ${name} membentuk aliansi pertahanan dengan ${players[0].name}.`
      };
      addLog(messages[kind] || `Perjanjian baru dengan ${name}.`);
      showToast(`${relationLabel(kind)} dengan ${name} berhasil disepakati!`);
    } else {
      addLog(`${name} menolak tawaran ${relationLabel(kind).toLowerCase()} dari ${players[0].name}.`);
      showToast(`${name} menolak tawaran. Kamu dapat mencoba lagi nanti.`);
    }
    targetProvincePanel(province, popupAnchor.x, popupAnchor.y);
    updateHUD();
    render();
  }

  function targetProvincePanel(province, clientX, clientY) {
    popupAnchor = { x: clientX, y: clientY };
    selectedTarget = province.id;
    const owner = ownerName(province.owner);
    const source = provinces[selectedSource];
    if (!source || source.owner !== currentPlayer) {
      showContext(`${popupHeader("NEGARA TARGET", province.name, `${countries[province.countryIndex].name} · Pemilik: ${owner}`)}
        ${provinceStatsHTML(province)}
        ${diplomacyPanelHTML(province.owner)}
        <p class="context-note">Pilih provinsi milikmu sebagai titik awal operasi. Semua pasukan berasal dari cadangan militer nasional.</p>`, clientX, clientY, "target");
      return;
    }
    const distance = haversine(source.center, province.center);
    const landAllowed = canLandAttack(source, province);
    const military = players[0].military;
    const airAllowed = distance <= AIR_RANGE_KM && military.air > 0;
    const seaAllowed = distance <= SEA_RANGE_KM && source.coastal && province.coastal && military.sea > 0;
    const transportAllowed = landAllowed || seaAllowed || airAllowed;
    const maxLand = transportAllowed ? military.land : 0;
    const maxAir = airAllowed ? military.air : 0;
    const maxSea = seaAllowed ? military.sea : 0;
    const defaultLand = maxLand ? Math.max(1, Math.floor(maxLand * .18)) : 0;
    const defaultAir = maxAir ? Math.max(0, Math.floor(maxAir * .08)) : 0;
    const defaultSea = maxSea && !landAllowed ? Math.max(1, Math.floor(maxSea * .08)) : 0;
    const rangeRow = (type, label, icon, max, value) => `<div class="force-row">
      <div class="force-row-top"><span>${icon} ${label} ${max === 0 ? "(tidak tersedia)" : ""}</span><strong><span id="force-${type}-value">${value.toLocaleString("id-ID")}</span> / ${max.toLocaleString("id-ID")}</strong></div>
      <input type="range" min="0" max="${max}" value="${value}" step="1" data-force="${type}" ${max === 0 ? "disabled" : ""}>
      <div class="range-foot"><span>0</span><span>${max.toLocaleString("id-ID")} tersedia nasional</span></div>
      </div>`;
    const canSendAny = maxLand > 0 || maxAir > 0 || maxSea > 0;
    const rangeMessage = !canSendAny
      ? "Cadangan nasional tidak memiliki unit atau sarana transportasi yang sesuai untuk target ini."
      : (!landAllowed && !seaAllowed && airAllowed
        ? "Jarak jauh: sertakan pesawat dan pasukan darat."
        : (!landAllowed && seaAllowed ? "Operasi lintas laut tersedia karena titik asal dan target sama-sama pesisir." : "Perbatasan darat terhubung. Pasukan nasional dapat dikirim dari titik asal ini."));
    showContext(`${popupHeader("OPERASI MILITER", province.name, `${countries[province.countryIndex].name} · Pemilik: ${owner}`)}
      ${provinceStatsHTML(province)}
      ${diplomacyPanelHTML(province.owner)}
      <div class="context-section"><h3>CADANGAN MILITER NASIONAL</h3>
        <div class="context-sub">Titik asal: <b>${escapeHTML(source.name)}</b> · Jarak: ${Math.round(distance).toLocaleString("id-ID")} km</div>
        ${rangeRow("land", "Pasukan darat", "🪖", maxLand, defaultLand)}
        ${rangeRow("air", "Pesawat", "✈️", maxAir, defaultAir)}
        ${rangeRow("sea", "Armada laut", "🚢", maxSea, defaultSea)}
        <div class="duration-pill"><span>Durasi pertempuran</span><b id="dispatch-duration">5 detik</b></div>
        <p class="context-note">${escapeHTML(rangeMessage)} Kekuatan militer disimpan pada tingkat negara, sedangkan kota, industri, dan benteng tetap spesifik per provinsi.</p>
        <p class="context-note dispatch-route-status" aria-live="polite">Atur pasukan untuk melanjutkan.</p>
        <button class="context-button danger full" data-action="launch-attack" type="button" ${canSendAny ? "" : "disabled"}>⚔️ KIRIM SERANGAN</button>
      </div>`, clientX, clientY, "target");
    updateDispatchPreview();
  }

  function provinceStatsHTML(province) {
    const b = province.buildings;
    const defense = Math.round((province.garrison || 1600) * (1 + b.defense * .22 + b.city * .04));
    const country = countries[province.countryIndex];
    const countryTotal = country?.provinceIds.length || 0;
    const controlled = country ? country.provinceIds.filter(id => provinces[id]?.owner === currentPlayer).length : 0;
    return `<div class="context-stats">
      <div class="context-stat"><small>PERTAHANAN LOKAL</small><b>${defense.toLocaleString("id-ID")}</b></div>
      <div class="context-stat"><small>KOTA</small><b>Lv ${b.city}</b></div>
      <div class="context-stat"><small>INDUSTRI</small><b>Lv ${b.industry}</b></div>
    </div>
    <div class="context-note">Kontrol provinsi negara ini: ${controlled}/${countryTotal} provinsi berada di tanganmu. Unit militer dikelola sebagai cadangan nasional.</div>`;
  }

  function updateDispatchPreview() {
    if (contextCard.hidden || selectedSource === null || selectedTarget === null) return;
    const source = provinces[selectedSource];
    const target = provinces[selectedTarget];
    if (!source || !target || !players[0]?.military) return;
    const forces = {};
    for (const type of ["land", "air", "sea"]) {
      const input = contextContent.querySelector(`[data-force="${type}"]`);
      forces[type] = input ? Number(input.value) : 0;
      const output = contextContent.querySelector(`#force-${type}-value`);
      if (output) output.textContent = forces[type].toLocaleString("id-ID");
    }
    const route = getAttackRoute(source, target, forces);
    const durationEl = contextContent.querySelector("#dispatch-duration");
    if (durationEl) durationEl.textContent = `${FIXED_BATTLE_DURATION_SECONDS} detik`;
    const button = contextContent.querySelector('[data-action="launch-attack"]');
    const total = forces.land + forces.air + forces.sea;
    const stock = players[0].military;
    const enoughUnits = forces.land <= stock.land && forces.air <= stock.air && forces.sea <= stock.sea;
    if (button) button.disabled = total <= 0 || !route.valid || !enoughUnits;
    const note = contextContent.querySelector(".dispatch-route-status");
    if (note) note.textContent = total <= 0 ? "Pilih unit yang akan dikirim." :
      !route.valid ? "Rute tidak tersedia. Pilih jalur darat, udara, atau laut yang sesuai." :
      !enoughUnits ? "Jumlah unit melebihi cadangan nasional." : "Rute tersedia · konflik akan diselesaikan dalam 5 detik.";
  }

  function travelDuration(distance, forces) {
    return FIXED_BATTLE_DURATION_SECONDS;
  }

  function launchAttack(attacker, sourceId, targetId, forces, showResult = true) {
    const source = provinces[sourceId];
    const target = provinces[targetId];
    const player = players[attacker];
    if (!source || !target || !player?.military || source.owner !== attacker || target.owner === attacker || target.owner < 0) return false;
    // Neutralize retaliation: AI countries never launch military operations into
    // provinces controlled by the human player, even if a war is active.
    if (attacker !== 0 && target.owner === 0) return false;
    if (forces.land > player.military.land || forces.air > player.military.air || forces.sea > player.military.sea) return false;
    if (forces.land + forces.air + forces.sea <= 0) return false;
    const route = getAttackRoute(source, target, forces);
    if (!route.valid) return false;
    if (attacker === 0) {
      if (!isAtWar(attacker, target.owner)) declareWar(attacker, target.owner, "serangan pemain");
    } else if (!isAtWar(attacker, target.owner)) return false;

    player.military.land -= forces.land;
    player.military.air -= forces.air;
    player.military.sea -= forces.sea;
    const duration = FIXED_BATTLE_DURATION_SECONDS;
    pendingAttacks.push({
      id: `${Date.now()}-${Math.random()}`, attacker, sourceId, targetId, forces: { ...forces }, duration,
      elapsed: 0, progress: 0, distance: route.distance,
      from: [...source.center], to: [...target.center], routeType: route.land ? "land" : (route.sea ? "sea" : "air")
    });
    if (showResult) {
      addLog(`⚔️ ${players[attacker].name} meluncurkan operasi ke ${target.name} (${countries[target.countryIndex].name}). Pertempuran berlangsung 5 detik.`);
      showToast(`Operasi militer menuju ${target.name} dimulai. Hasil dalam 5 detik.`);
      hideContext();
      selectedSource = sourceId;
      selectedTarget = targetId;
    }
    updateHUD();
    startAnimationLoop();
    render();
    return true;
  }

  function resolveAttack(attack) {
    const target = provinces[attack.targetId];
    if (!target) return;
    const force = attack.forces;
    const attacker = players[attack.attacker];
    if (!attacker?.military) return;
    const defender = target.owner;
    if (attack.attacker !== 0 && defender === 0) {
      attacker.military.land += force.land;
      attacker.military.air += force.air;
      attacker.military.sea += force.sea;
      addLog(`🛑 Operasi ${attacker.name} dibatalkan; negara pemain tidak menerima serangan balasan.`);
      updateHUD();
      return;
    }
    if (defender === attack.attacker) {
      attacker.military.land += Math.floor(force.land * .75);
      attacker.military.air += Math.floor(force.air * .7);
      attacker.military.sea += Math.floor(force.sea * .7);
      addBattleEffect(target.center, "reinforce");
      return;
    }

    const attackPower = force.land + force.air * 28 + force.sea * 16;
    const defensePower = Math.max(700, target.garrison || 1700) *
      (1 + target.buildings.defense * .22 + target.buildings.city * .04);
    const hasOccupationForce = force.land > 0;
    const conquered = hasOccupationForce && attackPower >= defensePower;
    if (conquered) {
      const oldOwner = target.owner;
      target.owner = attack.attacker;
      target.garrison = Math.max(700, Math.round((attackPower - defensePower) * .22));
      // Surviving equipment returns to the national force pool. There are no
      // separate provincial army inventories in this campaign model.
      attacker.military.land += Math.floor(force.land * .28);
      attacker.military.air += Math.floor(force.air * .55);
      attacker.military.sea += Math.floor(force.sea * .42);
      attacker.money += 18000000;
      addLog(`🏳️ ${attacker.name} merebut ${target.name} (${countries[target.countryIndex].name}) dari ${ownerName(oldOwner)}.`);
      addBattleEffect(target.center, "capture");
      const parent = countries[target.countryIndex];
      if (parent && parent.provinceIds.every(id => provinces[id]?.owner === attack.attacker)) {
        addLog(`🌐 ${attacker.name} kini menguasai seluruh wilayah ${parent.name}.`);
      } else if (parent && oldOwner >= 0 && parent.provinceIds.every(id => provinces[id]?.owner !== oldOwner)) {
        addLog(`🏴 ${ownerName(oldOwner)} kehilangan seluruh provinsinya di ${parent.name}.`);
      }
      if (attack.attacker === 0) showToast(`🏳️ ${target.name} berhasil direbut · hadiah $18 juta.`);
    } else {
      target.garrison = Math.max(650, Math.round(defensePower - attackPower * .28));
      addLog(`🛡️ Serangan ${attacker.name} ke ${target.name} berhasil ditahan.`);
      addBattleEffect(target.center, "impact");
      if (attack.attacker === 0) showToast(`Pertahanan ${target.name} bertahan. Periksa kekuatan nasional dan level benteng.`);
    }
    updateHUD();
    checkVictory();
  }

  function addBattleEffect(center, type) {
    const position = project(center[0], center[1]);
    const particles = [];
    const count = type === "capture" ? 18 : (type === "reinforce" ? 6 : 12);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i / count) + Math.random() * .28;
      const speed = 10 + Math.random() * 24;
      particles.push({ vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: 1.2 + Math.random() * 2.8, hue: Math.random() });
    }
    battleEffects.push({
      x: position.x, y: position.y, life: type === "capture" ? 1.05 : .72,
      maxLife: type === "capture" ? 1.05 : .72,
      size: type === "capture" ? 9 : 6, type, particles
    });
  }

  function startAnimationLoop() {
    if (animationFrame === null) {
      lastFrameTime = performance.now();
      animationFrame = requestAnimationFrame(animationLoop);
    }
  }

  function animationLoop(now) {
    const dt = Math.min(.05, Math.max(0, (now - lastFrameTime) / 1000));
    lastFrameTime = now;
    for (const attack of pendingAttacks) {
      attack.elapsed += dt;
      attack.progress = Math.min(1, attack.elapsed / attack.duration);
    }
    const arrived = pendingAttacks.filter(attack => attack.progress >= 1);
    pendingAttacks = pendingAttacks.filter(attack => attack.progress < 1);
    arrived.forEach(resolveAttack);

    battleEffects.forEach(effect => {
      effect.life -= dt;
    });
    battleEffects = battleEffects.filter(effect => effect.life > 0);

    render();
    if (pendingAttacks.length || battleEffects.length) {
      animationFrame = requestAnimationFrame(animationLoop);
    } else {
      animationFrame = null;
    }
  }

  function drawAttackAnimations(fitCss) {
    // Keep attack symbols about the same physical size at every zoom level.
    // Only a thin route, a small moving unit marker, and a short impact ring remain.
    const screenScale = Math.max(0.0001, fitCss * camera.zoom);
    const u = 1 / screenScale;

    for (const attack of pendingAttacks) {
      const from = project(attack.from[0], attack.from[1]);
      const to = project(attack.to[0], attack.to[1]);
      const color = players[attack.attacker]?.color || "#ffcb67";
      const t = attack.progress;
      const eased = t * t * (3 - 2 * t);
      const x = from.x + (to.x - from.x) * eased;
      const y = from.y + (to.y - from.y) * eased;

      ctx.save();
      // Low-opacity dotted route line: it indicates direction without covering borders.
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.85 * u;
      ctx.setLineDash([4 * u, 5 * u]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Small target marker, no pulsing glow.
      ctx.globalAlpha = 0.42;
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.9 * u;
      ctx.beginPath();
      ctx.arc(to.x, to.y, 3.1 * u, 0, Math.PI * 2);
      ctx.stroke();

      // Tiny unit icons move along the route. Multiple types remain distinct.
      ctx.globalAlpha = 0.86;
      const iconScale = 0.62 * u;
      let offset = 0;
      if (attack.forces.air > 0) {
        drawPlane(x + offset, y, color, iconScale);
        offset += 7 * u;
      }
      if (attack.forces.land > 0) {
        drawLandUnit(x + offset, y + 2 * u, color, iconScale);
        offset += 7 * u;
      }
      if (attack.forces.sea > 0) drawShip(x + offset, y + 4 * u, color, iconScale);
      ctx.restore();
    }

    for (const effect of battleEffects) {
      const progress = 1 - Math.max(0, effect.life / effect.maxLife);
      const alpha = Math.max(0, effect.life / effect.maxLife) * 0.48;
      const color = effect.type === "capture" ? "#ffd36b" :
        effect.type === "reinforce" ? "#71e7b1" : "#ff927d";
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.15 * u;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, (effect.size + progress * 5) * u, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawPlane(x, y, color, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.15);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(7 * scale, 0);
    ctx.lineTo(-5 * scale, -2.5 * scale);
    ctx.lineTo(-2 * scale, 0);
    ctx.lineTo(-5 * scale, 2.5 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawLandUnit(x, y, color, scale = 1) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(12,22,30,.8)";
    ctx.lineWidth = 0.7 * scale;
    ctx.fillRect(x - 3.8 * scale, y - 2.3 * scale, 7.6 * scale, 4.6 * scale);
    ctx.strokeRect(x - 3.8 * scale, y - 2.3 * scale, 7.6 * scale, 4.6 * scale);
    ctx.restore();
  }

  function drawShip(x, y, color, scale = 1) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(12,22,30,.8)";
    ctx.lineWidth = 0.65 * scale;
    ctx.beginPath();
    ctx.moveTo(x - 5 * scale, y - 1.5 * scale);
    ctx.lineTo(x + 5 * scale, y - 1.5 * scale);
    ctx.lineTo(x + 3 * scale, y + 2.5 * scale);
    ctx.lineTo(x - 3.5 * scale, y + 2.5 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawCrownGlyph(x, y, unit, accent = "#f4c95d") {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = accent;
    ctx.strokeStyle = "rgba(31,20,6,.96)";
    ctx.lineWidth = Math.max(.65 * unit, .45);
    ctx.beginPath();
    ctx.moveTo(-5.4 * unit, -1.2 * unit);
    ctx.lineTo(-4.1 * unit, 3.1 * unit);
    ctx.lineTo(4.1 * unit, 3.1 * unit);
    ctx.lineTo(5.4 * unit, -1.2 * unit);
    ctx.lineTo(2.0 * unit, 1.0 * unit);
    ctx.lineTo(0, -4.2 * unit);
    ctx.lineTo(-2.0 * unit, 1.0 * unit);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(-4.3 * unit, 3.6 * unit, 8.6 * unit, 1.7 * unit);
    ctx.restore();
  }

  function rectsOverlap(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function drawCapitalMarkers(fit, dpr, provinceLabelRects = []) {
    const unit = dpr / Math.max(.0001, fit * camera.zoom);
    const markerSize = 1;
    const iconOccupied = [];
    const labelOccupied = provinceLabelRects.slice();
    const showNames = camera.zoom >= 2.0;

    for (const country of countries) {
      const coords = country.capitalCoords;
      if (!Array.isArray(coords) || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) continue;
      const point = project(coords[0], coords[1]);
      if (point.x < -12 || point.x > MAP_W + 12 || point.y < -12 || point.y > MAP_H + 12) continue;

      const markerRect = {
        left: point.x - 4.2 * unit, right: point.x + 4.2 * unit,
        top: point.y - 4.2 * unit, bottom: point.y + 4.2 * unit
      };
      // At the global overview several European / Caribbean capitals are only
      // a few pixels apart. Thin the overlapping icons until the player zooms in.
      if (camera.zoom < 2.0 && iconOccupied.some(rect => rectsOverlap(markerRect, rect))) continue;
      iconOccupied.push(markerRect);

      ctx.save();
      ctx.globalAlpha = country.capitalVerified ? 1 : .55;
      ctx.fillStyle = "rgba(18,20,16,.88)";
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6.5 * unit, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,226,151,.72)";
      ctx.lineWidth = .8 * unit;
      ctx.stroke();
      drawCrownGlyph(point.x, point.y - .5 * unit, 0.86 * unit);
      ctx.restore();

      if (!showNames || !country.capitalVerified || !country.capitalName) continue;
      ctx.save();
      const fontSize = (camera.zoom >= 5 ? 8.6 : 7.6) * unit;
      ctx.font = `700 ${fontSize}px Arial, sans-serif`;
      const textWidth = ctx.measureText(country.capitalName).width;
      const padX = 4 * unit;
      const chipHeight = 12 * unit;
      const chipWidth = textWidth + 2 * padX;
      let left = point.x + 8 * unit;
      if (left + chipWidth > MAP_W - 2 * unit) left = point.x - chipWidth - 8 * unit;
      let top = point.y - chipHeight / 2;
      top = Math.max(2 * unit, Math.min(MAP_H - chipHeight - 2 * unit, top));
      const labelRect = { left, right: left + chipWidth, top, bottom: top + chipHeight };
      if (labelOccupied.some(rect => rectsOverlap(labelRect, rect))) {
        ctx.restore();
        continue;
      }
      labelOccupied.push(labelRect);
      ctx.globalAlpha = .96;
      ctx.fillStyle = "rgba(9,16,13,.88)";
      ctx.strokeStyle = "rgba(244,201,93,.75)";
      ctx.lineWidth = .65 * unit;
      ctx.beginPath();
      ctx.rect(labelRect.left, labelRect.top, chipWidth, chipHeight);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffe7a6";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(country.capitalName, left + padX, top + chipHeight / 2);
      ctx.restore();
    }
  }

  function render() {
    const dpr = canvasDPR();
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fit = Math.min(canvas.width / MAP_W, canvas.height / MAP_H);
    const offX = (canvas.width - MAP_W * fit) / 2;
    const offY = (canvas.height - MAP_H * fit) / 2;

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(fit, fit);
    ctx.translate(MAP_W / 2 + camera.x, MAP_H / 2 + camera.y);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-MAP_W / 2, -MAP_H / 2);
    // Keep borders crisp on both desktop and high-density mobile displays.
    const screenUnit = dpr / (fit * camera.zoom);

    ctx.fillStyle = "#082238";
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    for (const country of countries) {
      ctx.fillStyle = "#526779";
      ctx.fill(country.path, "evenodd");
      ctx.strokeStyle = "rgba(7, 25, 39, .9)";
      ctx.lineWidth = 0.78 * screenUnit;
      ctx.stroke(country.path);
    }

    for (const province of provinces) {
      ctx.fillStyle = playerColor(province.owner);
      ctx.fill(province.path, "evenodd");
      ctx.strokeStyle = "rgba(5, 18, 29, .88)";
      ctx.lineWidth = 0.72 * screenUnit;
      ctx.stroke(province.path);
      if (province.owner === 0 && selectedSource === province.id) {
        ctx.strokeStyle = "#fff4bd";
        ctx.lineWidth = 2.1 * screenUnit;
        ctx.stroke(province.path);
      }
      if (selectedTarget === province.id) {
        ctx.strokeStyle = "#ffd36b";
        ctx.lineWidth = 2.3 * screenUnit;
        ctx.stroke(province.path);
      }
    }

    // Clear national outlines are drawn over all province fills so the border
    // between countries remains visually distinct at every zoom level.
    for (const country of countries) {
      ctx.save();
      ctx.strokeStyle = "rgba(3, 10, 17, .98)";
      ctx.lineWidth = 2.25 * screenUnit;
      ctx.stroke(country.path);
      ctx.strokeStyle = "rgba(232, 239, 235, .82)";
      ctx.lineWidth = .72 * screenUnit;
      ctx.stroke(country.path);
      ctx.restore();
    }

    // Draw full province names only when they fit inside the actual polygon.
    // Large labels are placed first; colliding labels are skipped instead of
    // overlapping neighbouring provinces or spilling into the sea.
    const provinceLabelRects = [];
    if (camera.zoom >= 1.25) {
      const labelCandidates = provinces
        .filter(province => province.labelClearance > 0 && province.name)
        .sort((a, b) => b.labelClearance - a.labelClearance);
      const occupied = [];
      const dpr = canvasDPR();
      const labelPixels = camera.zoom >= 8 ? 12.5 : camera.zoom >= 4 ? 11 : camera.zoom >= 2 ? 10 : 9;
      const fontWorld = labelPixels * dpr / (fit * camera.zoom);
      // Use a common, legible system font; a missing display font on mobile
      // must not collapse the province label into a heavy black-looking mark.
      ctx.font = `600 ${fontWorld}px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const province of labelCandidates) {
        const anchor = project(province.center[0], province.center[1]);
        // The anchor was verified against this Path2D when the province was
        // preprocessed (with an identity canvas transform). Do not call
        // isPointInPath here: render() has the camera transform active, while
        // isPointInPath's x/y arguments are in canvas coordinates. Rechecking
        // the untransformed world point at this stage caused labels to vanish
        // or appear on the wrong areas at different zoom levels.
        const width = ctx.measureText(province.name).width;
        const height = fontWorld * 1.25;
        // Clearance is measured against this province's own borders. Wait for
        // zoom-in until the whole label can sit comfortably within the region.
        if (width > province.labelClearance * 1.72 || height > province.labelClearance * 1.5) continue;
        const rect = {
          left: anchor.x - width / 2 - 3 / (fit * camera.zoom),
          right: anchor.x + width / 2 + 3 / (fit * camera.zoom),
          top: anchor.y - height / 2 - 2 / (fit * camera.zoom),
          bottom: anchor.y + height / 2 + 2 / (fit * camera.zoom)
        };
        if (occupied.some(other =>
          rect.left < other.right && rect.right > other.left &&
          rect.top < other.bottom && rect.bottom > other.top
        )) continue;
        occupied.push(rect);
        provinceLabelRects.push(rect);
        ctx.save();
        ctx.lineWidth = Math.max(.55, 1.05 * dpr / (fit * camera.zoom));
        ctx.strokeStyle = "rgba(8, 14, 12, .82)";
        ctx.fillStyle = "rgba(255, 255, 245, .98)";
        ctx.shadowColor = "rgba(0,0,0,.38)";
        ctx.shadowBlur = 0.8 * dpr / (fit * camera.zoom);
        ctx.strokeText(province.name, anchor.x, anchor.y);
        ctx.fillText(province.name, anchor.x, anchor.y);
        ctx.restore();
      }
    }

    drawCapitalMarkers(fit, dpr, provinceLabelRects);
    drawAttackAnimations(fit / dpr);
    ctx.restore();
  }

  function resizeCanvas() {
    render();
  }

  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const dpr = canvasDPR();
    const logicalPixelX = (clientX - rect.left) * dpr;
    const logicalPixelY = (clientY - rect.top) * dpr;
    const fit = Math.min(canvas.width / MAP_W, canvas.height / MAP_H);
    const offX = (canvas.width - MAP_W * fit) / 2;
    const offY = (canvas.height - MAP_H * fit) / 2;
    const mx = (logicalPixelX - offX) / fit;
    const my = (logicalPixelY - offY) / fit;
    return {
      x: MAP_W / 2 + (mx - MAP_W / 2 - camera.x) / camera.zoom,
      y: MAP_H / 2 + (my - MAP_H / 2 - camera.y) / camera.zoom
    };
  }

  function logicalPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const dpr = canvasDPR();
    const fit = Math.min(canvas.width / MAP_W, canvas.height / MAP_H);
    const offX = (canvas.width - MAP_W * fit) / 2;
    const offY = (canvas.height - MAP_H * fit) / 2;
    return {
      x: ((clientX - rect.left) * dpr - offX) / fit,
      y: ((clientY - rect.top) * dpr - offY) / fit
    };
  }

  function syncZoomControls() {
    const percent = Math.round(camera.zoom * 100);
    const readout = document.getElementById("zoomReadout");
    const slider = document.getElementById("zoomSlider");
    if (readout) readout.textContent = `${percent}%`;
    if (slider) slider.value = String(Math.max(85, Math.min(1400, Math.round(percent / 5) * 5)));
  }

  function centerCamera(center, zoom = 1.2) {
    const p = project(center[0], center[1]);
    camera.zoom = Math.max(MIN_CAMERA_ZOOM, Math.min(MAX_CAMERA_ZOOM, zoom));
    camera.x = -(p.x - MAP_W / 2) * camera.zoom;
    camera.y = -(p.y - MAP_H / 2) * camera.zoom;
    syncZoomControls();
    render();
  }

  function zoomAt(clientX, clientY, nextZoom) {
    const anchor = screenToWorld(clientX, clientY);
    const logical = logicalPoint(clientX, clientY);
    camera.zoom = Math.max(MIN_CAMERA_ZOOM, Math.min(MAX_CAMERA_ZOOM, nextZoom));
    camera.x = logical.x - MAP_W / 2 - (anchor.x - MAP_W / 2) * camera.zoom;
    camera.y = logical.y - MAP_H / 2 - (anchor.y - MAP_H / 2) * camera.zoom;
    syncZoomControls();
    render();
  }

  function handleMapClick(clientX, clientY) {
    const world = screenToWorld(clientX, clientY);
    if (!provinceDataReady) {
      showToast("Semua provinsi sedang disiapkan otomatis. Tunggu sampai peta menyatakan siap.");
      return;
    }
    const country = getCountryAt(world);
    if (!country) {
      hideContext();
      return;
    }

    // All country layers are already loaded before the first selectable map
    // appears. Clicking another country never triggers fetch(), parsing, or a spinner.
    const selected = getProvinceNearest(country, world);
    if (!selected) {
      showToast(`Tidak ada wilayah administratif yang tersedia untuk ${country.name}.`);
      return;
    }
    if (!gameStarted) {
      openCountryChoice(country, clientX, clientY);
      return;
    }
    if (selected.owner === 0) ownProvincePanel(selected, clientX, clientY);
    else targetProvincePanel(selected, clientX, clientY);
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY, type: event.pointerType });
    try { canvas.setPointerCapture?.(event.pointerId); } catch (_) { /* unsupported on older browser */ }

    if (activePointers.size >= 2) {
      const pair = [...activePointers.values()].slice(0, 2);
      const midX = (pair[0].x + pair[1].x) / 2;
      const midY = (pair[0].y + pair[1].y) / 2;
      pinchState = {
        distance: Math.max(1, Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y)),
        zoom: camera.zoom,
        anchor: screenToWorld(midX, midY)
      };
      pointerState = null;
      canvas.classList.remove("dragging");
      return;
    }

    pointerState = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      cameraX: camera.x,
      cameraY: camera.y,
      moved: false
    };
  }

  function onPointerMove(event) {
    if (!activePointers.has(event.pointerId)) return;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY, type: event.pointerType });

    if (activePointers.size >= 2) {
      const pair = [...activePointers.values()].slice(0, 2);
      const midX = (pair[0].x + pair[1].x) / 2;
      const midY = (pair[0].y + pair[1].y) / 2;
      if (!pinchState) {
        pinchState = {
          distance: Math.max(1, Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y)),
          zoom: camera.zoom,
          anchor: screenToWorld(midX, midY)
        };
      }
      const distance = Math.max(1, Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y));
      const nextZoom = Math.max(MIN_CAMERA_ZOOM, Math.min(MAX_CAMERA_ZOOM, pinchState.zoom * distance / pinchState.distance));
      const logical = logicalPoint(midX, midY);
      camera.zoom = nextZoom;
      camera.x = logical.x - MAP_W / 2 - (pinchState.anchor.x - MAP_W / 2) * camera.zoom;
      camera.y = logical.y - MAP_H / 2 - (pinchState.anchor.y - MAP_H / 2) * camera.zoom;
      syncZoomControls();
      render();
      return;
    }

    if (!pointerState || pointerState.id !== event.pointerId) return;
    const dx = event.clientX - pointerState.startX;
    const dy = event.clientY - pointerState.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) pointerState.moved = true;
    if (pointerState.moved) {
      const fit = Math.min(canvas.width / MAP_W, canvas.height / MAP_H);
      const dpr = canvasDPR();
      camera.x = pointerState.cameraX + dx * dpr / fit;
      camera.y = pointerState.cameraY + dy * dpr / fit;
      canvas.classList.add("dragging");
      render();
    }
  }

  function onPointerUp(event) {
    const wasPinching = Boolean(pinchState);
    activePointers.delete(event.pointerId);
    if (wasPinching) {
      pinchState = null;
      pointerState = null;
      canvas.classList.remove("dragging");
      // If one finger remains after a pinch, let that finger continue panning;
      // it cannot accidentally trigger a province click.
      if (activePointers.size === 1) {
        const [id, point] = activePointers.entries().next().value;
        pointerState = {
          id, startX: point.x, startY: point.y,
          cameraX: camera.x, cameraY: camera.y, moved: true
        };
      }
      return;
    }
    if (!pointerState || pointerState.id !== event.pointerId) return;
    const wasClick = !pointerState.moved;
    pointerState = null;
    canvas.classList.remove("dragging");
    if (wasClick) handleMapClick(event.clientX, event.clientY);
  }

  function handleWheel(event) {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : (1 / 1.12);
    zoomAt(event.clientX, event.clientY, camera.zoom * factor);
  }

  function isCoastalPair(source, target) {
    return source.coastal || target.coastal;
  }

  function buyUnit(province, unitKey) {
    const meta = UNIT_SHOP[unitKey];
    if (!meta || province.owner !== 0 || players[0].money < meta.cost) return;
    if (unitKey === "sea" && !province.coastal) {
      showToast("Armada hanya dapat direkrut dari provinsi pesisir.");
      return;
    }
    players[0].money -= meta.cost;
    players[0].military[unitKey] += meta.amount;
    showToast(`${meta.icon} ${meta.amount.toLocaleString("id-ID")} unit ${meta.label} ditambahkan ke cadangan militer nasional.`);
    addLog(`${players[0].name} merekrut ${meta.amount.toLocaleString("id-ID")} unit ${meta.label} dari ${province.name}.`);
    updateHUD();
    ownProvincePanel(province, popupAnchor.x, popupAnchor.y);
    render();
  }

  function upgradeBuilding(province, key) {
    const meta = BUILDING[key];
    if (!meta || province.owner !== 0) return;
    const level = province.buildings[key];
    if (level >= MAX_BUILDING) return;
    const cost = meta.baseCost + level * meta.step;
    if (players[0].money < cost) {
      showToast("Dana USD tidak cukup untuk peningkatan ini.");
      return;
    }
    players[0].money -= cost;
    province.buildings[key]++;
    if (key === "defense") province.garrison += 1800;
    showToast(`${meta.icon} ${meta.label} level ${province.buildings[key]} dibangun di ${province.name}.`);
    addLog(`${players[0].name} meningkatkan ${meta.label} di ${province.name} seharga ${formatUSD(cost)}.`);
    updateHUD();
    ownProvincePanel(province, popupAnchor.x, popupAnchor.y);
    render();
  }

  function requestGameConfirmation(title, message, onAccept) {
    pendingConfirmation = onAccept;
    showContext(`${popupHeader("KONFIRMASI DALAM GAME", title, "Tindakan ini akan mengubah keadaan kampanye.")}
      <p class="context-note confirm-message">${escapeHTML(message)}</p>
      <div class="confirm-actions"><button class="context-button danger" data-action="confirm-yes" type="button">Ya, lanjutkan</button><button class="context-button full" data-action="confirm-no" type="button">Batalkan</button></div>`, popupAnchor.x, popupAnchor.y, "confirm");
  }

  function launchFromPopup() {
    if (selectedSource === null || selectedTarget === null) return;
    const forces = {};
    for (const type of ["land", "air", "sea"]) {
      const input = contextContent.querySelector(`[data-force="${type}"]`);
      forces[type] = input ? Number(input.value) : 0;
    }
    const source = provinces[selectedSource];
    const target = provinces[selectedTarget];
    if (!source || !target || source.owner !== currentPlayer) { showToast("Pilih kembali provinsi asal milikmu."); return; }
    if (forces.land + forces.air + forces.sea === 0) { showToast("Pilih setidaknya satu unit untuk dikirim."); return; }
    if (forces.land <= 0) { showToast("Pasukan darat diperlukan untuk menduduki provinsi. Udara dan laut berfungsi sebagai pendukung transportasi."); return; }
    const route = getAttackRoute(source, target, forces);
    if (!route.valid) { showToast("Rute tidak valid. Periksa jalur darat, udara, atau laut."); updateDispatchPreview(); return; }
    const targetOwner = target.owner;
    const relation = getRelation(currentPlayer, targetOwner);
    if (relation.status !== "war") {
      const message = relation.status === "peace"
        ? `${ownerName(targetOwner)} saat ini damai. Mengirim operasi ini akan mengakhiri status damai dan memulai perang. Durasi pertempuran 5 detik.`
        : `Hubungan dengan ${ownerName(targetOwner)} saat ini ${relationLabel(relation.status)}. Serangan akan memutus perjanjian dan memulai perang. Lanjutkan?`;
      requestGameConfirmation("Mulai perang?", message, () => {
        const success = launchAttack(currentPlayer, selectedSource, selectedTarget, forces, true);
        if (!success) showToast("Serangan tidak dapat dikirim. Periksa stok militer nasional dan rute.");
      });
      return;
    }
    const success = launchAttack(currentPlayer, selectedSource, selectedTarget, forces, true);
    if (!success) showToast("Serangan tidak dapat dikirim. Periksa stok militer nasional dan rute.");
  }

  function economyTick() {
    if (!gameStarted || gameOver) return;
    industryTick++;
    const totals = Array.from({ length: players.length }, () => ({ provinces: 0, cities: 0, industry: 0 }));
    for (const province of provinces) {
      const owner = province.owner;
      if (owner < 0 || owner >= players.length) continue;
      const summary = totals[owner];
      summary.provinces++;
      summary.cities += province.buildings.city;
      summary.industry += province.buildings.industry;
    }
    const incomeBonus = new Array(players.length).fill(0);
    for (const [key, relation] of diplomacyRelations.entries()) {
      if (relation.status !== "trade" && relation.status !== "alliance") continue;
      const [a, b] = key.split(":").map(Number);
      const bonus = relation.status === "alliance" ? .08 : .12;
      if (Number.isInteger(a) && Number.isInteger(b)) {
        incomeBonus[a] = Math.min(.4, incomeBonus[a] + bonus);
        incomeBonus[b] = Math.min(.4, incomeBonus[b] + bonus);
      }
    }
    for (let owner = 0; owner < players.length; owner++) {
      const player = players[owner];
      const summary = totals[owner];
      const baseIncome = (player.gdpBaseUSD || 1e9) * .00000005;
      const buildingIncome = summary.cities * 85000 + summary.industry * 175000;
      player.money += (baseIncome + buildingIncome) * (1 + incomeBonus[owner]);
      // Industry grows the country's central reserve, not a province-specific army.
      // The timer itself runs faster at ×2/×4, so do not multiply production again.
      player.military.land += Math.floor(summary.industry * 4);
      if (industryTick % 3 === 0) {
        player.military.air += Math.floor(summary.industry * .15);
        player.military.sea += Math.floor(summary.industry * .08);
      }
    }
    updateHUD();
    // Do not rebuild the open command card on every economy tick; this keeps
    // sliders, search text, and province controls stable while the game runs.
    render();
  }

  function pendingTargeted(provinceId) {
    return pendingAttacks.some(attack => attack.targetId === provinceId);
  }

  function aiTurn() {
    if (!gameStarted || gameOver || players.length <= 1) return;
    const ownedByOwner = Array.from({ length: players.length }, () => []);
    for (const province of provinces) {
      if (province.owner > 0 && province.owner < players.length) ownedByOwner[province.owner].push(province);
    }

    let processed = 0;
    const aiBatchLimit = Math.min(MAX_AI_ORDERS_PER_TICK, players.length - 1);
    while (processed < aiBatchLimit) {
      if (aiTurnCursor >= players.length) aiTurnCursor = 1;
      const owner = aiTurnCursor++;
      processed++;
      const ai = players[owner];
      const owned = ownedByOwner[owner];
      if (!ai || !owned.length) continue;

      const hasActiveWar = players.some((other, index) => index !== owner && isAtWar(owner, index));
      const weakerThanPlayer = Boolean(ai.aiWeakerThanPlayer);
      const weaknessFactor = ai.aiWeaknessFactor || 1;
      const front = owned.filter(source => [...source.neighbors].some(id => {
        const target = provinces[id];
        return target && target.owner !== owner && target.owner >= 0 && isAtWar(owner, target.owner);
      }));
      const builder = owned.reduce((best, province) =>
        (province.buildings.industry + province.buildings.city) <
        (best.buildings.industry + best.buildings.city) ? province : best, owned[0]);

      // AI keeps building its economy, but weaker nations replenish reserves more slowly.
      const investmentFactor = .55 + weaknessFactor * .45;
      if (ai.money >= 45000000 && Math.random() < (hasActiveWar ? .22 : .13) * investmentFactor) {
        ai.money -= 45000000;
        builder.buildings.industry = Math.min(MAX_BUILDING, builder.buildings.industry + 1);
      }
      if (ai.money >= 30000000 && Math.random() < (hasActiveWar ? .18 : .07) * investmentFactor) {
        ai.money -= 30000000;
        ai.military.land += Math.max(350, Math.floor(1250 * weaknessFactor));
      }
      if (ai.money >= 55000000 && Math.random() < (hasActiveWar ? .12 : .04) * investmentFactor) {
        ai.money -= 55000000;
        ai.military.air += Math.max(12, Math.floor(65 * weaknessFactor));
      }
      if (!hasActiveWar || !front.length) continue;

      // One operation at a time, followed by a country-specific cooldown.
      // Game speed also scales the cooldown so ×2/×4 remains responsive.
      const cooldownSeconds = weakerThanPlayer
        ? 34 + Math.min(ai.aiRankGap || 0, 60) * .12
        : 23;
      const cooldownMs = cooldownSeconds * 1000 / Math.max(1, gameSpeed);
      if (Date.now() - (ai.aiLastAttackAt || 0) < cooldownMs) continue;
      if (pendingAttacks.some(attack => attack.attacker === owner)) continue;

      const options = [];
      const seenPairs = new Set();
      for (const source of front) {
        for (const targetId of source.neighbors) {
          const target = provinces[targetId];
          if (!target || target.owner === owner || target.owner <= 0 || pendingTargeted(target.id)) continue;
          if (!isAtWar(owner, target.owner)) continue;

          // AI counterattacks only into directly connected neighbouring provinces.
          // It no longer searches every province in a neighbouring country or uses
          // long-range air/naval routes to strike distant territory.
          const distance = haversine(source.center, target.center);
          if (!Number.isFinite(distance) || distance > 1500) continue;
          const pairKey = `${source.id}:${target.id}`;
          if (seenPairs.has(pairKey)) continue;
          seenPairs.add(pairKey);

          const defense = Math.max(700, target.garrison || 1700) *
            (1 + target.buildings.defense * .22 + target.buildings.city * .04);
          const landShare = weakerThanPlayer ? .055 : .085;
          const airShare = weakerThanPlayer ? .035 : .055;
          const landSent = Math.min(ai.military.land, Math.floor(ai.military.land * landShare));
          const airSent = Math.min(ai.military.air, Math.floor(ai.military.air * airShare));
          const power = landSent + airSent * 28;
          const requiredRatio = weakerThanPlayer ? 1.24 : 1.10;
          if (landSent < 1 || power < defense * requiredRatio) continue;

          const strategicValue = target.buildings.industry * 7 + target.buildings.city * 5 +
            (target.isCapital ? 18 : 0);
          const score = (power / defense) * 100 + strategicValue - distance / 120;
          options.push({ source, target, score, landSent, airSent });
        }
      }

      options.sort((a, b) => b.score - a.score);
      const choice = options[0];
      if (!choice) continue;
      const payload = { land: Math.max(1, choice.landSent), air: choice.airSent, sea: 0 };
      if (launchAttack(owner, choice.source.id, choice.target.id, payload, false)) {
        ai.aiLastAttackAt = Date.now();
      }
    }
    updateHUD();
  }

  function checkVictory() {
    if (gameOver) return;
    const alive = new Array(players.length).fill(false);
    for (const province of provinces) {
      if (province.owner >= 0 && province.owner < alive.length) alive[province.owner] = true;
    }
    if (!alive[0]) {
      finishGame(false);
      return;
    }
    const rivalsAlive = alive.slice(1).some(Boolean);
    if (!rivalsAlive && !campaignRivalsDefeated) {
      campaignRivalsDefeated = true;
      setStatus("SEMUA NEGARA LAIN KALAH · DOMINASI DUNIA");
      showToast("Semua negara lawan telah dikalahkan. Seluruh provinsi kini dikuasai negaramu.");
    }
    if (provinces.length && provinces.every(province => province.owner === 0)) finishGame(true);
  }

  function finishGame(win) {
    gameOver = true;
    stopTimers();
    setStatus(win ? "KEMENANGAN · DOMINASI DUNIA" : "KEKALAHAN · NEGARAMU TUMBANG");
    showToast(win ? "🏆 Kamu menguasai seluruh provinsi yang dimainkan!" : "Negaramu telah kehilangan seluruh provinsi.");
    addLog(win ? "Kampanye berakhir dengan kemenangan." : "Kampanye berakhir dengan kekalahan.");
  }

  contextCard.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (action === "close") { pendingConfirmation = null; hideContext(); }
    if (action === "confirm-yes") {
      const callback = pendingConfirmation;
      pendingConfirmation = null;
      if (typeof callback === "function") callback();
    }
    if (action === "confirm-no") { pendingConfirmation = null; hideContext(); }
    if (action === "start-country") {
      const input = contextContent.querySelector("#presidentNameInput");
      const name = input?.value.trim() || "";
      if (!name) { showToast("Nama presiden wajib diisi."); input?.focus(); return; }
      pendingPresidentName = name.slice(0, 40);
      startGame(Number(button.dataset.country), pendingPresidentName);
    }
    if (action === "retry-start") startGame(Number(button.dataset.country), pendingPresidentName);
    if (action === "retry-provinces") retryWorldLoad();
    if (action === "buy-unit") { const province = provinces[selectedSource]; if (province) buyUnit(province, button.dataset.unit); }
    if (action === "upgrade") { const province = provinces[selectedSource]; if (province) upgradeBuilding(province, button.dataset.building); }
    if (action === "launch-attack") launchFromPopup();
    if (action === "diplomacy") handleDiplomacyAction(button.dataset.treaty);
  });

  contextCard.addEventListener("input", event => {
    if (event.target.matches("[data-force]")) updateDispatchPreview();
  });

  const toolPanel = document.getElementById("toolPanel");
  toolPanel.addEventListener("click", event => {
    if (event.target.closest("[data-tool-close]")) { hideToolPanel(); return; }
    const territory = event.target.closest("[data-territory-filter]");
    if (territory) { openTerritoryPanel(territory.dataset.territoryFilter); return; }
    const rank = event.target.closest("[data-rank-tab]");
    if (rank) { openRankingPanel(rank.dataset.rankTab); return; }
    const jump = event.target.closest("[data-jump-province]");
    if (jump) {
      const province = provinces[Number(jump.dataset.jumpProvince)];
      if (province) {
        hideToolPanel();
        centerCamera(province.center, Math.max(camera.zoom, 3.8));
        setTimeout(() => handleMapClickFromProvince(province), 0);
      }
    }
  });
  toolPanel.addEventListener("input", event => {
    if (event.target.id !== "territorySearch") return;
    const query = normalizeName(event.target.value);
    toolPanel.querySelectorAll(".territory-row").forEach(row => {
      row.hidden = query && !normalizeName(row.textContent).includes(query);
    });
    toolPanel.querySelectorAll(".territory-country").forEach(group => {
      group.hidden = ![...group.querySelectorAll(".territory-row")].some(row => !row.hidden);
    });
  });

  function handleMapClickFromProvince(province) {
    const rect = canvas.getBoundingClientRect();
    const point = project(province.center[0], province.center[1]);
    const fit = Math.min(canvas.width / MAP_W, canvas.height / MAP_H);
    const offX = (canvas.width - MAP_W * fit) / 2;
    const offY = (canvas.height - MAP_H * fit) / 2;
    const x = rect.left + (offX + fit * (MAP_W / 2 + camera.x + (point.x - MAP_W / 2) * camera.zoom)) / canvasDPR();
    const y = rect.top + (offY + fit * (MAP_H / 2 + camera.y + (point.y - MAP_H / 2) * camera.zoom)) / canvasDPR();
    if (province.owner === 0) ownProvincePanel(province, x, y);
    else targetProvincePanel(province, x, y);
  }

  document.getElementById("territoryBtn").addEventListener("click", () => openTerritoryPanel("all"));
  document.getElementById("rankingBtn").addEventListener("click", () => openRankingPanel("military"));
  document.getElementById("newsBtn").addEventListener("click", openNewsPanel);
  document.querySelectorAll(".speed-button").forEach(button => button.addEventListener("click", () => setGameSpeed(button.dataset.speed)));

  retryLoadBtn.addEventListener("click", retryWorldLoad);
  document.getElementById("newGameBtn").addEventListener("click", resetGame);
  document.getElementById("helpBtn").addEventListener("click", () => {
    document.getElementById("helpCard").hidden = false;
  });
  document.getElementById("fullscreenBtn").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await shell.requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) {
      showToast("Mode layar penuh tidak tersedia di browser ini.");
    }
  });
  document.getElementById("zoomIn").addEventListener("click", () => zoomAt(window.innerWidth / 2, window.innerHeight / 2, camera.zoom * 1.12));
  document.getElementById("zoomOut").addEventListener("click", () => zoomAt(window.innerWidth / 2, window.innerHeight / 2, camera.zoom / 1.12));
  document.getElementById("zoomReset").addEventListener("click", () => {
    camera = { x: 0, y: 0, zoom: 1 };
    syncZoomControls();
    render();
  });
  document.getElementById("zoomSlider").addEventListener("input", event => {
    const target = window.innerWidth / 2;
    const top = window.innerHeight / 2;
    zoomAt(target, top, Number(event.target.value) / 100);
  });
  document.getElementById("helpCard").addEventListener("click", event => {
    if (event.target.closest('[data-action="close-help"]')) document.getElementById("helpCard").hidden = true;
  });

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", handleWheel, { passive: false });
  canvas.addEventListener("dblclick", event => zoomAt(event.clientX, event.clientY, camera.zoom * 1.35));
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !contextCard.hidden) hideContext();
  });

  const installButton = document.getElementById("installAppBtn");
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.hidden = false;
  });
  installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice.catch(() => null);
    deferredInstallPrompt = null;
    installButton.hidden = true;
  });
  window.addEventListener("appinstalled", () => {
    installButton.hidden = true;
    showToast("World War berhasil ditambahkan ke layar utama.");
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").catch(error =>
      console.warn("Service worker belum dapat dipasang:", error)
    );
  }

  loadWorld();
})();
