
/*
    Replaces the search suggestions section on the search page with cards instead of links.
*/

const ITEMS_COUNT = 20;

function getUserId() {
    const id = window.ApiClient?._currentUser?.Id || null;
    return id;
}

function getAuthHeaders() {
    const token = window.ApiClient?.accessToken?.();
    return token ? { Authorization: `MediaBrowser Token="${token}"` } : {};
}

function getServerAddress() { 
    const server = window.ApiClient?._serverAddress || '';
    return server;
}

function getImageUrl(item) {
    const server = getServerAddress();
    if (!server || !item.ImageTags || !item.ImageTags.Primary) return '';
    const url = `${server}/Items/${item.Id}/Images/Primary?fillHeight=446&fillWidth=297&quality=96&tag=${item.ImageTags.Primary}`;
    return url;
}

(function injectCSS() {
    const style = document.createElement('style');
    style.textContent = `
        .verticalSection.searchSuggestions {
            visibility: visible;
        }
        .verticalSection.searchSuggestions:has(.custom-scroller) {
            visibility: visible;
        }
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

function createCard(item, index) {
    const img = getImageUrl(item);
    const rating = item.CommunityRating || '';
    const year = item.ProductionYear || '';
    const href = `${getServerAddress()}/web/#/details?id=${item.Id}&serverId=${item.ServerId}`;

    const card = document.createElement('div');
    card.className = 'card portraitCard card-hoverable card-withuserdata';
    card.dataset.index = index;
    card.dataset.id = item.Id;
    card.dataset.serverid = item.ServerId;
    card.dataset.type = item.Type;
    card.dataset.mediatype = item.Type || 'Unknown';
    card.dataset.isfolder = 'false';
    card.dataset.prefix = '';
    card.dataset.jeRatingTagged = '1';

    card.innerHTML = `
        <div class="cardBox cardBox-bottompadded">
            <div class="cardScalable">
                <div class="cardPadder cardPadder-portrait lazy-hidden-children">
                    <span class="cardImageIcon material-icons" aria-hidden="true">tv</span>
                </div>
                <canvas aria-hidden="true" width="20" height="20" class="blurhash-canvas lazy-hidden"></canvas>
                <a href="${href}" class="cardImageContainer coveredImage cardContent itemAction lazy blurhashed lazy-image-fadein-fast"
                   data-action="link" aria-label="${item.Name}"
                   style="background-image:url('${img}');">
                </a>
                <div class="cardOverlayContainer itemAction" data-action="link">
                    <button is="paper-icon-button-light"
                        class="cardOverlayButton cardOverlayButton-hover itemAction paper-icon-button-light cardOverlayFab-primary"
                        data-action="resume">
                        <span class="material-icons cardOverlayButtonIcon cardOverlayButtonIcon-hover">play_arrow</span>
                    </button>
                    <div class="cardOverlayButton-br flex">
                    </div>
                </div>
            </div>
            <div class="cardText cardTextCentered cardText-first">
                <bdi><a href="${href}" class="itemAction textActionButton">${item.Name}</a></bdi>
            </div>
            <div class="cardText cardTextCentered cardText-secondary">
                <bdi>${year}</bdi>
            </div>
        </div>
    `;
    return card;
}

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

        const itemsContainer = parent.querySelector('.itemsContainer');
        if (itemsContainer) {
            itemsContainer.classList.add('vertical-wrap');
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
