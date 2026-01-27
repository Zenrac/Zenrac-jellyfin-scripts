
/*
    Replaces the search suggestions section on the search page with cards instead of links.
*/

const script = document.currentScript;
const ITEMS_COUNT = script.dataset.itemsCount ? parseInt(script.dataset.itemsCount, 10) : 20;
const HORIZONTAL_SCROLL = script.dataset.horizontalScroll === "true";

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
        ${!HORIZONTAL_SCROLL ? `
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
            startWatchingSuggestions(payload.Items || []);
        }
    });

    return originalSend.apply(this, args);
};

function isAlreadyReplaced(parent) {
    const exists = parent.querySelector('.custom-scroller');
    return exists;
}

function needsReplacement(parent) {
    const needed = !isAlreadyReplaced(parent) && parent.querySelector('a, button');
    return needed;
}

async function replaceSuggestionContainer(items) {
    await waitForCardBuilder();

    const sections = document.querySelectorAll('.verticalSection.searchSuggestions');

    for (const parent of sections) {
        if (!needsReplacement(parent)) continue;
        if (!items.length) continue;

        parent.innerHTML = '';

        const section = window.cardBuilder.renderCards(
            items,
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
    }
}

let suggestionObserver = null;

function startWatchingSuggestions(items) {
    if (suggestionObserver) return;

    suggestionObserver = new MutationObserver((mutations, obs) => {
        const sections = document.querySelectorAll('.verticalSection.searchSuggestions');
        if (sections.length > 0) {
            replaceSuggestionContainer(items);
            obs.disconnect();
            suggestionObserver = null;
        }
    });

    suggestionObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

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
