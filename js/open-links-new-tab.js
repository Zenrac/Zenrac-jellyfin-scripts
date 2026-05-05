/*
    Allows Ctrl + click and middle click to open Jellyfin internal links in a new browser tab.
*/

let lastOpenedLink = null;
let lastOpenedAt = 0;
const routeHistoryKey = "zenrafyn.openLinksNewTab.routeHistory";
let routeHistory = loadRouteHistory();

function getCurrentJellyfinUrl() {
    const hash = window.location.hash && window.location.hash.startsWith("#/")
        ? window.location.hash
        : "#/home";
    return `${window.location.origin}/web/${hash}`;
}

function loadRouteHistory() {
    try {
        const parsed = JSON.parse(sessionStorage.getItem(routeHistoryKey) || "[]");
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
        return [];
    }
}

function saveRouteHistory() {
    try {
        sessionStorage.setItem(routeHistoryKey, JSON.stringify(routeHistory.slice(-50)));
    } catch {
        // Ignore storage errors; new-tab support still works for direct links.
    }
}

function rememberCurrentRoute(replace = false) {
    const url = getCurrentJellyfinUrl();
    if (replace && routeHistory.length) {
        routeHistory[routeHistory.length - 1] = url;
    } else if (routeHistory[routeHistory.length - 1] !== url) {
        routeHistory.push(url);
    }

    if (routeHistory.length > 50) routeHistory = routeHistory.slice(-50);
    saveRouteHistory();
}

function getPreviousRouteUrl() {
    const current = getCurrentJellyfinUrl();
    const startIndex = routeHistory[routeHistory.length - 1] === current
        ? routeHistory.length - 2
        : routeHistory.length - 1;

    for (let i = startIndex; i >= 0; i -= 1) {
        if (routeHistory[i] && routeHistory[i] !== current) return routeHistory[i];
    }

    return null;
}

function getJellyfinLinkUrl(href) {
    if (!href) return null;

    try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin || !url.hash.startsWith("#/")) return null;
        return `${window.location.origin}/web/${url.hash}`;
    } catch {
        return null;
    }
}

function getActionHref(target) {
    const directLink = target.closest('a[data-action="link"][href]');
    if (directLink) return directLink.getAttribute("href");

    const action = target.closest(".itemAction");
    if (!action) return null;

    const actionType = action.getAttribute("data-action");
    if (actionType && actionType !== "link") return null;

    const href = action.getAttribute("href");
    if (href) return href;

    return action.querySelector("a[href]")?.getAttribute("href") || null;
}

function getHeaderButtonUrl(target) {
    if (target.closest(".headerHomeButton")) {
        return `${window.location.origin}/web/#/home`;
    }

    if (target.closest(".headerBackButton")) {
        return getPreviousRouteUrl();
    }

    return null;
}

function handleNewTab(e) {
    if (!e.ctrlKey && e.button !== 1) return;

    const url = getHeaderButtonUrl(e.target) || getJellyfinLinkUrl(getActionHref(e.target));
    if (!url) return;

    const now = Date.now();
    if (url === lastOpenedLink && now - lastOpenedAt < 500) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
    }

    lastOpenedLink = url;
    lastOpenedAt = now;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    window.open(url, "_blank");
}

rememberCurrentRoute();

const originalPushState = history.pushState;
history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    rememberCurrentRoute();
    return result;
};

const originalReplaceState = history.replaceState;
history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    rememberCurrentRoute(true);
    return result;
};

window.addEventListener("hashchange", () => rememberCurrentRoute());
window.addEventListener("popstate", () => rememberCurrentRoute());

document.addEventListener("pointerdown", handleNewTab, true);
document.addEventListener("mousedown", handleNewTab, true);
document.addEventListener("auxclick", handleNewTab, true);
document.addEventListener("click", handleNewTab, true);
