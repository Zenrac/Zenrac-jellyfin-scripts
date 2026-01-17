/*
    Replaces the search suggestions section on the search page with cards instead of links.
*/

const ITEMS_COUNT = 20;

(function injectVerticalScrollerCSS() {
    const style = document.createElement('style');
    style.textContent = `
        .verticalSection.searchSuggestions {
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .verticalSection.searchSuggestions[data-replaced="true"] {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
})();


function getUserId() {
    return window.ApiClient?._currentUser?.Id || null;
}

function getAuthHeaders() {
    const token = window.ApiClient?.accessToken?.();
    return token ? { Authorization: `MediaBrowser Token="${token}"` } : {};
}

function getServerAddress() {
    return window.ApiClient?._serverAddress || '';
}

function getImageUrl(item) {
    const server = getServerAddress();
    if (!server || !item.ImageTags || !item.ImageTags.Primary) return '';
    return `${server}/Items/${item.Id}/Images/Primary?fillHeight=446&fillWidth=297&quality=96&tag=${item.ImageTags.Primary}`;
}

async function fetchItems() {
    const server = getServerAddress();
    const userId = getUserId();
    const headers = getAuthHeaders();
    if (!server || !userId || !headers) return [];
    try {
        const res = await fetch(`${server}/Items?userId=${userId}&limit=${ITEMS_COUNT}&recursive=true&includeItemTypes=Movie,Series&sortBy=IsFavoriteOrLiked,Random&enableImages=true`, { headers });
        const data = await res.json();
        return data.Items || [];
    } catch(e) {
        console.error('Error fetching items:', e);
        return [];
    }
}

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
                <a href="${href}" class="cardImageContainer coveredImage cardContent itemAction lazy blurhashed lazy-image-fadein-fast" data-action="link" aria-label="${item.Name}" style="background-image: url('${img}');">
                    ${rating ? `<div class="rating-overlay-container"><div class="rating-tag rating-tag-tmdb"><span class="material-icons rating-star-icon">star</span><span class="rating-text">${rating}</span></div></div>` : ''}
                </a>
                <div class="cardOverlayContainer itemAction" data-action="link">
                    <button is="paper-icon-button-light" class="cardOverlayButton cardOverlayButton-hover itemAction paper-icon-button-light cardOverlayFab-primary" data-action="resume"><span class="material-icons cardOverlayButtonIcon cardOverlayButtonIcon-hover play_arrow"></span></button>
                    <div class="cardOverlayButton-br flex">
                        <button type="button" class="watchlist-button cardOverlayButton cardOverlayButton-hover itemAction paper-icon-button-light emby-button button-flat" data-action="none" data-id="${item.Id}" data-active="false" title="Add to Watchlist"><span class="material-icons cardOverlayButtonIcon cardOverlayButtonIcon-hover watchlist" aria-hidden="true"></span></button>
                        <button is="emby-playstatebutton" type="button" class="cardOverlayButton cardOverlayButton-hover itemAction paper-icon-button-light emby-button" data-id="${item.Id}" data-serverid="${item.ServerId}" data-itemtype="${item.Type}" data-played="false" title="Mark played"></button>
                        <button is="emby-ratingbutton" type="button" class="cardOverlayButton cardOverlayButton-hover itemAction paper-icon-button-light emby-button" data-id="${item.Id}" data-serverid="${item.ServerId}" data-itemtype="${item.Type}" data-isfavorite="false" title="Add to favorites"></button>
                        <button is="paper-icon-button-light" class="cardOverlayButton cardOverlayButton-hover itemAction paper-icon-button-light" data-action="menu" title="More"></button>
                    </div>
                </div>
            </div>
            <div class="cardText cardTextCentered cardText-first"><bdi><a href="${href}" class="itemAction textActionButton" title="${item.Name}">${item.Name}</a></bdi></div>
            <div class="cardText cardTextCentered cardText-secondary"><bdi>${year}</bdi></div>
        </div>
    `;
    return card;
}

function replaceSuggestionContainer() {
    if (!window.location.href.endsWith('/search')) return;

    const scrollers = document.querySelectorAll('.verticalSection.searchSuggestions');
    scrollers.forEach(async (parent) => {
        if (parent.dataset.replaced) return;

        const items = await fetchItems();
        if (!items.length) return;

        parent.innerHTML = `
            <div class="sectionTitleContainer sectionTitleContainer-cards padded-left">
                <h2 class="sectionTitle sectionTitle-cards">Suggestions</h2>
            </div>
            <div is="emby-scroller" data-horizontal="true" data-centerfocus="card" class="padded-top-focusscale padded-bottom-focusscale emby-scroller custom-scroller" data-scroll-mode-x="custom" style="scroll-snap-type: none; touch-action: auto; overscroll-behavior: contain auto;">
                <div is="emby-itemscontainer" class="itemsContainer vertical-wrap"></div>
            </div>
        `;

        const container = parent.querySelector('div[is="emby-itemscontainer"]');
        items.forEach((item, index) => container.appendChild(createCard(item, index)));

        parent.dataset.replaced = 'true';
    });
}

let intervalId = null;

function startReplacing() {
    if (!intervalId) intervalId = setInterval(replaceSuggestionContainer, 300);
}

function stopReplacing() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

function onPageChange(callback) {
    let currentUrl = location.href;
    const checkUrl = () => {
        if (currentUrl !== location.href) {
            currentUrl = location.href;
            callback(currentUrl);
        }
    };
    window.addEventListener('popstate', checkUrl);
    window.addEventListener('hashchange', checkUrl);
    const pushStateOrig = history.pushState;
    history.pushState = function(...args) {
        pushStateOrig.apply(this, args);
        checkUrl();
    };
}

onPageChange((url) => {
    if (url.endsWith('/search')) startReplacing();
    else stopReplacing();
});

if (location.href.endsWith('/search')) startReplacing();