/*
    This script adds a "random item" button to certain sections on the Jellyfin homepage.
    Clicking the button will either navigate to a random item's page or play a random item directly if Ctrl is held.
    It also adds a "hide watched" button to hide already watched episodes in specific sections.
*/

const scriptSectionButton = document.currentScript;
function parseSectionSetting(attributeName, fallbackSections) {
    if (!scriptSectionButton || !scriptSectionButton.hasAttribute(attributeName)) {
        return fallbackSections;
    }

    const rawValue = scriptSectionButton.getAttribute(attributeName) || '';
    const normalized = rawValue.trim();
    if (normalized === '') {
        return [];
    }

    return rawValue.split(',')
        .map(s => s.trim())
        .filter(Boolean);
}

const DICE_SECTION = parseSectionSetting('data-dice-button-section', [
    'LatestShows',
    'RecentlyAddedShows',
    'NextUp',
    'ContinueWatchingNextUp',
    'ContinueWatching',
    'new-episodes',
    'watchlist'
]);
const HIDE_SECTION = parseSectionSetting('data-hide-button-section', [
    'LatestShows',
    'RecentlyAddedShows',
    'new-episodes'
]);
const DEFAULT_COUNT_SECTION = ['NextUp', 'ContinueWatchingNextUp', 'ContinueWatching', 'watchlist'];
const COUNT_SECTION = parseSectionSetting('data-count-section', null);

function ensureCountStyle() {
    if (document.getElementById('section-count-style')) return;
    const style = document.createElement('style');
    style.id = 'section-count-style';
    style.textContent = `
        .sectionTitleContainer .section-count-badge {
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 600;
            line-height: 1;
            background: rgba(255, 255, 255, 0.12);
            color: var(--main-text, #fff);
            display: inline-flex;
            align-items: center;
            align-self: center;
            vertical-align: middle;
            min-height: 24px;
            margin-bottom: 0.35em;
        }
    `;
    document.head.appendChild(style);
}

function getSectionItemCount(section) {
    const cards = section.querySelectorAll('.card:not(.cardPlaceholder)');
    return Array.from(cards).filter(card => card.offsetParent !== null).length;
}

function clearCountRetry(section) {
    if (section._countRetryTimer) {
        clearTimeout(section._countRetryTimer);
        section._countRetryTimer = null;
    }
}

function updateSectionCount(section, options = {}) {
    const badge = section._countBadge;
    if (!badge) return;

    const { retryIfZero = false } = options;
    const count = getSectionItemCount(section);
    badge.textContent = `${count}`;
    badge.title = `${count} items`;

    if (!retryIfZero) return;

    if (count > 0) {
        section._countRetryAttempts = 0;
        clearCountRetry(section);
        return;
    }

    const attempts = section._countRetryAttempts || 0;
    if (attempts >= 10 || section._countRetryTimer) return;

    section._countRetryAttempts = attempts + 1;
    section._countRetryTimer = setTimeout(() => {
        section._countRetryTimer = null;
        updateSectionCount(section, { retryIfZero: true });
    }, 300);
}

function ensureCountBadge(section, titleContainer) {
    ensureCountStyle();
    if (!section._countBadge) {
        const badge = document.createElement('span');
        badge.className = 'section-count-badge';
        titleContainer.appendChild(badge);
        section._countBadge = badge;
    }

    updateSectionCount(section, { retryIfZero: true });
}

function createDiceButton(section) {
    const randomBtn = document.createElement('button');
    randomBtn.className = 'headerButton headerButtonRight paper-icon-button-light randomItemButton';
    randomBtn.is = 'paper-icon-button-light';
    randomBtn.title = 'Pick a random item (Ctrl + click plays immediately)';
    randomBtn.innerHTML = '<i class="material-icons" style="transition: transform 1.5s;">casino</i>';
    randomBtn.style.marginBottom = '0.35em';
    randomBtn.style.marginRight = '5px';

    const icon = randomBtn.querySelector('i.material-icons');
    randomBtn.addEventListener('mouseenter', () => icon.style.animation = 'dice 1.5s');
    randomBtn.addEventListener('animationend', () => icon.style.animation = '');

    randomBtn.addEventListener('click', e => {
        const visibleCards = [...section.querySelectorAll('.card-withuserdata')]
            .filter(card => card.offsetParent !== null);

        if (!visibleCards.length) return;

        const randomCard = visibleCards[Math.floor(Math.random() * visibleCards.length)];

        if (e.ctrlKey) {
            const play = randomCard.querySelector('span.play_arrow');
            if (play) play.click();
        } else {
            const link = randomCard.querySelector('.itemAction.textActionButton')?.getAttribute('href');
            if (link) window.location.href = link;
        }
    });
    return randomBtn;
}

function createHideButton(section) {
    const hideBtn = document.createElement('button');
    hideBtn.className = 'hide-watched-button';
    hideBtn.textContent = 'Hide Watched';
    hideBtn.title = 'Hide watched episodes';

    hideBtn.style.cssText = `
        margin-left: 10px;
        font-size: 12px;
        padding: 4px 8px;
        min-width: auto;
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        border-radius: 4px;
        cursor: pointer;
        color: var(--main-text, #fff) !important;
        margin-bottom: 0.35em;
        align-self: center;
    `;

    let hidden = false;
    hideBtn.onclick = () => {
        hidden = !hidden;
        hideBtn.textContent = hidden ? 'Show Watched' : 'Hide Watched';

        section.querySelectorAll('.card-withuserdata').forEach(card => {
            const watched = card.querySelector('button[data-played="true"]');
            if (watched) card.style.display = hidden ? 'none' : '';
        });
        updateSectionCount(section);
    };
    return hideBtn;
}

function init() {
    const interval = setInterval(() => {
        const hasTitleContainer = document.querySelector('.sectionTitleContainer');
        if (!hasTitleContainer) return;

        clearInterval(interval);
        console.debug('HomeSectionButton: Initializing section buttons');
        addSectionButtons();
    }, 300);
}


function addSectionButtons() {
    const verticalSections = document.querySelectorAll('div.verticalSection');

    verticalSections.forEach(section => {

        const titleContainer = section.querySelector('.sectionTitleContainer');
        if (!titleContainer) return;

        const sectionId = section.getAttribute('data-custom-section-id');
        
        const hideAllowed =
            HIDE_SECTION.some(cls => section.classList.contains(cls)) ||
            HIDE_SECTION.includes(sectionId);

        const diceAllowed =
            DICE_SECTION.some(cls => section.classList.contains(cls)) ||
            DICE_SECTION.includes(sectionId);

        if (hideAllowed &&!titleContainer.querySelector('.hide-watched-button')) {
            const hideBtn = createHideButton(section);
            titleContainer.appendChild(hideBtn);
        }

        if (diceAllowed &&!section.querySelector('.randomItemButton')) {
            const randomBtn = createDiceButton(section);
            titleContainer.appendChild(randomBtn);
        }

        const countAllowed = COUNT_SECTION
            ? COUNT_SECTION.some(cls => section.classList.contains(cls)) || COUNT_SECTION.includes(sectionId)
            : (DEFAULT_COUNT_SECTION.some(cls => section.classList.contains(cls)) || DEFAULT_COUNT_SECTION.includes(sectionId));
    
        if (countAllowed && titleContainer) {
            ensureCountBadge(section, titleContainer);
        }
    });
}

const handleNavigation = () => {
    console.debug('HomeSectionButton: Navigation detected, re-initializing after delay');
    setTimeout(() => {
        init();
    }, 800);
};

const originalPushState = history.pushState;
history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    handleNavigation();
    return result;
};

const originalReplaceState = history.replaceState;
history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    handleNavigation();
    return result;
};

window.addEventListener('hashchange', handleNavigation);
window.addEventListener('popstate', handleNavigation);
window.addEventListener('pageshow', handleNavigation);
window.addEventListener('focus', handleNavigation);

init();
