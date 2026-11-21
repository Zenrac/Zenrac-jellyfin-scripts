/*
    Replaces the search suggestions section on the search page with cards instead of links.
*/

const script = document.currentScript;
const ITEMS_COUNT = script?.dataset.itemsCount ? parseInt(script?.dataset.itemsCount, 10) : 16;
const HORIZONTAL_SCROLL = script?.dataset.horizontalScroll === "true";

function getUserId() {
    const id = window.ApiClient?._currentUser?.Id || null;
    return id;
}

(function injectCSS() {
    const style = document.createElement('style');
    style.textContent = `
        .verticalSection.searchSuggestions {
            visibility: hidden;
        }
        .verticalSection.searchSuggestions:has(.custom-scroller) {
            visibility: visible;
        }
        .verticalSection.searchSuggestions .sectionTitleContainer {
            padding-left: 0px !important;
            justify-content: center !important;
        }
        ${!HORIZONTAL_SCROLL ? `
        .verticalSection.searchSuggestions .itemsContainer {
            margin-left: 1.2em;
        }
        .searchSuggestions .custom-scroller-container .emby-scrollbuttons.padded-right {
            display: none !important;
        }
        ` : ''}
    `;
    document.head.appendChild(style);
})();


const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, ...args) {
    const userId = getUserId();
    if (
        userId &&
        typeof url === 'string' &&
        url.includes('/Items') &&
        url.includes(`userId=${userId}`) &&
        location.hash.startsWith('#/search') &&
        !url.includes('searchTerm=')
    ) {
        const u = new URL(url, location.origin);
        for (const key of [...u.searchParams.keys()]) {
            if (key.toLowerCase() === 'parentid') u.searchParams.delete(key);
        }
        u.searchParams.set('enableImages', 'true');
        u.searchParams.set('limit', ITEMS_COUNT.toString());
        u.searchParams.delete('imageTypeLimit');
        url = u.toString();
    }
    this.__url = url;
    return originalOpen.call(this, method, url, ...args);
};

XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('load', () => {
        const userId = getUserId();
        if (!userId) return;

        if (
            this.__url &&
            this.__url.includes('/Items') &&
            this.__url.includes(`userId=${userId}`) &&
            location.hash.startsWith('#/search') &&
            !this.__url.includes('searchTerm=')
        ) {
            let payload;
            try {
                payload = JSON.parse(this.responseText);
            } catch {
                payload = this.responseText;
            }
            onNewItems(payload.Items || []);
        }
    });

    return originalSend.apply(this, args);
};

function isAlreadyReplaced(parent) {
    return !!parent.querySelector('.custom-scroller');
}

function needsReplacement(parent) {
    return !isAlreadyReplaced(parent) && !!parent.querySelector('a, button');
}

function loadImages(root) {
    window.imageLoader?.lazyChildren?.(root);

    const apply = () => {
        root.querySelectorAll('[data-src]').forEach((el) => {
            const src = el.getAttribute('data-src');
            if (!src) return;
            el.removeAttribute('data-src');

            const img = new Image();
            img.onload = () => {
                if (el.tagName === 'IMG') el.src = src;
                else el.style.backgroundImage = `url("${src}")`;
                el.classList.remove('lazy', 'lazy-hidden');
                el.querySelector(':scope > canvas.blurhash-canvas')?.remove();
            };
            img.onerror = () => console.warn('[suggestions] image not found', src);
            img.src = src;
        });
    };

    apply();

    const obs = new MutationObserver(apply);
    obs.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-src']
    });
    setTimeout(() => obs.disconnect(), 5000);
}

let latestItems = [];
let itemsToken = 0;
let renderQueued = false;

function renderSections(force) {
    if (!latestItems.length || !window.cardBuilder) return;

    const token = String(itemsToken);
    const sections = document.querySelectorAll('.verticalSection.searchSuggestions');

    for (const parent of sections) {
        const stale = isAlreadyReplaced(parent) && parent.dataset.suggestionsToken !== token;
        if (!needsReplacement(parent) && !(force && stale)) continue;

        parent.innerHTML = '';
        parent.dataset.suggestionsToken = token;

        const section = window.cardBuilder.renderCards(
            latestItems,
            'Suggestions',
            null
        );

        parent.appendChild(section);

        if (!HORIZONTAL_SCROLL) {
            const itemsContainer = parent.querySelector('.itemsContainer');
            if (itemsContainer) {
                itemsContainer.classList.add('vertical-wrap');
            }
        }

        loadImages(parent);
    }
}

function scheduleRender(force = false) {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
        renderQueued = false;
        renderSections(force);
    });
}

async function onNewItems(items) {
    if (!items.length) return;

    latestItems = items;
    itemsToken++;

    try {
        await waitForCardBuilder();
    } catch (e) {
        console.warn('[suggestions]', e);
        return;
    }

    renderSections(true);
}

new MutationObserver(() => {
    if (!latestItems.length || !location.hash.startsWith('#/search')) return;
    scheduleRender(false);
}).observe(document.body, {
    childList: true,
    subtree: true
});

function waitForCardBuilder(timeout = 5000, interval = 50) {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        const check = () => {
            if (window.cardBuilder) return resolve();
            if (Date.now() - start > timeout) return reject('window.cardBuilder not available');
            setTimeout(check, interval);
        };

        check();
    });
}
