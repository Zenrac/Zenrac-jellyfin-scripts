/*
    Adds an "Open in new tab" item to Jellyfin item action sheets.
*/

let lastActionSheetUrl = null;
let lastActionSheetTargetAt = 0;

function buildJellyfinWebUrl(hash) {
    if (!hash || !hash.startsWith("#/")) return null;
    return `${window.location.origin}/web/${hash}`;
}

function getUrlFromHref(href) {
    if (!href) return null;

    try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin || !url.hash.startsWith("#/")) return null;
        return buildJellyfinWebUrl(url.hash);
    } catch {
        return null;
    }
}

function getUrlFromItemElement(el) {
    if (!el) return null;

    const directLink = el.closest('a[data-action="link"][href], a.itemAction[href]');
    const directUrl = getUrlFromHref(directLink?.getAttribute("href"));
    if (directUrl) return directUrl;

    const action = el.closest(".itemAction");
    const actionLink = action?.querySelector("a[href]");
    const actionUrl = getUrlFromHref(action?.getAttribute("href") || actionLink?.getAttribute("href"));
    if (actionUrl) return actionUrl;

    const item = el.closest("[data-id]");
    const itemId = item?.getAttribute("data-id");
    if (!itemId) return null;

    const serverId = item.getAttribute("data-serverid");
    const hash = `#/details?id=${encodeURIComponent(itemId)}${serverId ? `&serverId=${encodeURIComponent(serverId)}` : ""}`;
    return buildJellyfinWebUrl(hash);
}

function rememberActionSheetTarget(target) {
    const url = getUrlFromItemElement(target);
    if (!url) return;

    lastActionSheetUrl = url;
    lastActionSheetTargetAt = Date.now();
}

function closeActionSheet(sheet) {
    const cleanup = () => cleanupActionSheetArtifacts(sheet);

    document.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        keyCode: 27,
        which: 27,
        bubbles: true
    }));

    window.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        keyCode: 27,
        which: 27,
        bubbles: true
    }));

    setTimeout(cleanup, 100);
    setTimeout(cleanup, 300);
}

function cleanupActionSheetArtifacts(sheet) {
    if (sheet?.isConnected) {
        sheet.classList.remove("opened");
        sheet.remove();
    }

    const hasOpenDialog = document.querySelector(
        ".dialog.opened, .centeredDialog.opened, .actionSheet.opened, .actionsheet.opened"
    );
    if (hasOpenDialog) return;

    document.querySelectorAll(".dialogBackdrop, .dialogBackdropOpened, .backdropContainer").forEach(el => el.remove());
    document.querySelectorAll(".dialogContainer").forEach(el => {
        if (!el.querySelector(".dialog, .centeredDialog, .actionSheet, .actionsheet")) el.remove();
    });
    document.documentElement.classList.remove("dialogBackdropOpened");
    document.body.classList.remove("dialogBackdropOpened");
    document.body.style.removeProperty("overflow");
}

function createOpenInNewTabButton(url, sheet) {
    const button = document.createElement("button");
    button.setAttribute("is", "emby-button");
    button.type = "button";
    button.className = "listItem listItem-button actionSheetMenuItem emby-button";
    button.dataset.id = "opennewtab";
    button.innerHTML = `
        <span class="actionsheetMenuItemIcon listItemIcon listItemIcon-transparent material-icons open_in_new" aria-hidden="true"></span>
        <div class="listItemBody actionsheetListItemBody">
            <div class="listItemBodyText actionSheetItemText">Open in new tab</div>
        </div>
    `;

    button.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        window.open(url, "_blank");
        closeActionSheet(sheet);
    });

    return button;
}

function addOpenInNewTabAction(sheet) {
    if (!sheet || sheet.dataset.openNewTabReady === "1") return;

    const url = lastActionSheetUrl;
    if (!url || Date.now() - lastActionSheetTargetAt > 10000) return;

    const scroller = sheet.querySelector(".actionSheetScroller");
    if (!scroller || scroller.querySelector('[data-id="opennewtab"]')) return;

    const button = createOpenInNewTabButton(url, sheet);
    const firstDivider = scroller.querySelector(".actionsheetDivider");
    const resumeButton = scroller.querySelector('[data-id="resume"]');
    const playAllButton = scroller.querySelector('[data-id="playallfromhere"]');

    if (firstDivider) {
        scroller.insertBefore(button, firstDivider);
    } else if (playAllButton?.nextSibling) {
        scroller.insertBefore(button, playAllButton.nextSibling);
    } else if (resumeButton?.nextSibling) {
        scroller.insertBefore(button, resumeButton.nextSibling);
    } else {
        scroller.insertBefore(button, scroller.firstChild);
    }

    sheet.dataset.openNewTabReady = "1";
}

function scanActionSheets() {
    document.querySelectorAll(".actionSheet.opened, .actionsheet.opened, .actionSheet").forEach(addOpenInNewTabAction);
}

document.addEventListener("contextmenu", e => rememberActionSheetTarget(e.target), true);
document.addEventListener("pointerdown", e => {
    if (e.button === 2 || e.target.closest('[data-action="menu"]')) rememberActionSheetTarget(e.target);
}, true);
document.addEventListener("mousedown", e => {
    if (e.button === 2 || e.target.closest('[data-action="menu"]')) rememberActionSheetTarget(e.target);
}, true);
document.addEventListener("click", e => {
    if (e.target.closest('[data-action="menu"]')) rememberActionSheetTarget(e.target);
}, true);

new MutationObserver(scanActionSheets).observe(document.body, {
    childList: true,
    subtree: true
});

scanActionSheets();
