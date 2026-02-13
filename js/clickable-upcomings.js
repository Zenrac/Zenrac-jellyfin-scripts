/*
    Make HomeScreenSection's Upcomings clickable thanks to JE calendar API.
*/

(function () {
  const LOG = "[ClickableUpcomings]";

  function norm(s) {
    return (s ?? "")
      .toString()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isUpcomingLabel(s) {
    const key = norm(s).replace(/\s/g, "");
    return key === "upcomingshows" || key === "upcomingmovies";
  }

  function getAuthHeaders() {
    if (!window.ApiClient) return {};
    const token = ApiClient.accessToken?.();
    return token ? { Authorization: `MediaBrowser Token="${token}"` } : {};
  }

  function getServerAddress() {
    if (!window.ApiClient) return "";
    return ApiClient._serverAddress || "";
  }

  function ensureStyleTag() {
    if (document.getElementById("clickable-upcomings-style")) return;
    const style = document.createElement("style");
    style.id = "clickable-upcomings-style";
    style.textContent = `
      .UpcomingShows .card, .UpcomingMovies .card {
        cursor: inherit !important; 
      }
      .upcomingShowCard .cardImageContainer, .upcomingMovieCard .cardImageContainer { 
        cursor: pointer !important; 
      }
    `;
    document.head.appendChild(style);
    console.debug(LOG, "style injected");
  }

  async function getArrEvents(startIso, endIso) {
    const base = getServerAddress();
    const url = `${base}/JellyfinEnhanced/arr/calendar?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
    console.debug(LOG, "fetching calendar");

    const r = await fetch(url, {
      method: "GET",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json"
      },
      credentials: "include"
    });

    if (!r.ok) throw new Error(`calendar fetch failed: ${r.status}`);
    const data = await r.json();
    console.debug(LOG, "events received:", data.events?.length ?? 0);
    return data.events ?? [];
  }

  function buildTitleToItemId(events) {
    const map = new Map();
    for (const e of events) {
      if (!e?.title || !e?.itemId) continue;
      const key = norm(e.title);
      if (!map.has(key)) {
        map.set(key, e.itemId);
      }
    }
    console.debug(LOG, "mapped total:", map.size);
    return map;
  }

  function extractTitle(card) {
    const el = card.querySelector(".cardText-first .itemAction");
    if (!el) return "";
    const text = el.textContent || "";
    const titleAttr = el.getAttribute("title") || "";
    if (!text) return titleAttr;
    if (!titleAttr) return text;
    return text.length >= titleAttr.length ? text : titleAttr;
  }

  function attachCardLink(card, itemId, title) {
    if (card.dataset.clickableUpcoming === "1") return;

    card.dataset.clickableUpcoming = "1";
    card.classList.add("clickable-upcoming");
    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");

    const nav = () => {
      const target = `#/details?id=${encodeURIComponent(itemId)}`;
      console.debug(LOG, "navigate:", title, "->", itemId);
      if (location.hash !== target) location.hash = target;
    };

    card.addEventListener("click", (e) => {
      if (e.target.closest("a,button,input,select,textarea")) return;
      nav();
    });

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        nav();
      }
    });
  }

  function getUpcomingCards(container) {
    let cards = container.querySelectorAll(
      ".upcoming-show-card, .upcoming-movie-card, .upcoming-movies-card"
    );
    if (cards.length) return cards;
    cards = container.querySelectorAll(".card");
    return cards;
  }

  function findItemIdByPrefix(map, key) {
    let bestItemId = null;
    let bestLen = Infinity;
    for (const [mapKey, itemId] of map.entries()) {
      if (!mapKey.startsWith(key)) continue;
      if (mapKey.length < bestLen) {
        bestLen = mapKey.length;
        bestItemId = itemId;
      }
    }
    return bestItemId;
  }

  function linkCards(container, map) {
    const cards = getUpcomingCards(container);

    for (const card of cards) {
      if (card.dataset.clickableUpcoming === "1") continue;

      const rawTitle = extractTitle(card);
      const key = norm(rawTitle);
      if (!key) continue;

      const itemId = map.get(key);
      if (!itemId) {
        const prefixId = findItemIdByPrefix(map, key);
        if (prefixId) {
          attachCardLink(card, prefixId, rawTitle);
          continue;
        }
        continue;
      }

      attachCardLink(card, itemId, rawTitle);
    }
  }

  function findUpcomingSection() {
    const sections = document.querySelectorAll(".verticalSection");
    for (const section of sections) {
      const titleAttr = section.getAttribute("title");
      if (titleAttr && isUpcomingLabel(titleAttr)) return section;

      const dataTitle = section.getAttribute("data-title");
      if (dataTitle && isUpcomingLabel(dataTitle)) return section;

      const ariaLabel = section.getAttribute("aria-label");
      if (ariaLabel && isUpcomingLabel(ariaLabel)) return section;

      const titleEl = section.querySelector(".sectionTitle,.sectionTitleText,.sectionHeaderText");
      const titleText = titleEl?.textContent || "";
      if (titleText && isUpcomingLabel(titleText)) return section;
    }
    return null;
  }

  function findContainer() {
    const section = findUpcomingSection();
    if (!section) return null;

    let container = section.querySelector(".emby-scroller-container.section3");
    if (!container) container = section.querySelector(".emby-scroller-container");
    if (!container) {
      const card = section.querySelector(".upcoming-show-card, .upcoming-movie-card, .upcoming-movies-card, .card");
      if (card) container = card.closest(".emby-scroller-container") || card.parentElement;
    }
    return container || null;
  }

  async function init() {
    console.debug(LOG, "init");

    ensureStyleTag();

    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    const end = new Date(now);
    end.setDate(end.getDate() + 7);

    let map = null;

    let retryTimer = null;

    const startRetry = () => {
      if (retryTimer) return;
      let attempts = 0;
      retryTimer = setInterval(() => {
        attempts += 1;
        const container = findContainer();
        if (container) {
          linkCards(container, map);
          clearInterval(retryTimer);
          retryTimer = null;
          return;
        }
        if (attempts >= 60) {
          clearInterval(retryTimer);
          retryTimer = null;
        }
      }, 500);
    };

    const observer = new MutationObserver(() => {
      if (!map) return;
      const container = findContainer();
      if (container) linkCards(container, map);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    try {
      const events = await getArrEvents(start.toISOString(), end.toISOString());
      map = buildTitleToItemId(events);

      const container = findContainer();
      if (container) linkCards(container, map);
      else startRetry();
    } catch (e) {
      console.error(LOG, "error:", e);
    }
  }

  init();
})();
