/*
    Add a "New" badge to items from new seasons (episode 1).
    - Parses episode numbers from DOM text to avoid ID caching issues
    - Only runs on navigation, no continuous observers
*/

function ensureNewSeasonStyle() {
    if (document.getElementById('new-season-badge-style')) return;
    const style = document.createElement('style');
    style.id = 'new-season-badge-style';
    style.textContent = `
        .language-overlay-container.has-new-badge {
            display: flex;
            gap: 4px;
            align-items: center;
        }
        .new-season-badge {
            background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
            color: white;
            padding: 4px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            display: inline-block;
            pointer-events: none;
            white-space: nowrap;
        }
        .new-badge-overlay-container {
            position: absolute;
            top: 6px;
            right: 6px;
            z-index: 11;
        }
    `;
    document.head.appendChild(style);
}

function extractSeasonEpisode(cardElement) {
    // Look for season/episode pattern in secondary text like "S1:E1" or "S2:E5"
    const secondaryText = cardElement.querySelector('.cardText-secondary');
    if (!secondaryText) return null;

    const text = secondaryText.textContent || '';
    // Match patterns like S1:E1, Season 1 Episode 1, S01E05, etc.
    const match = text.match(/S(\d+):?E(\d+)|Season\s+(\d+)\s+Episode\s+(\d+)|S(\d+)E(\d+)/i);

    if (!match) return null;

    const season = match[1] || match[3] || match[5];
    const episode = match[2] || match[4] || match[6];

    return { season: parseInt(season, 10), episode: parseInt(episode, 10) };
}

function isNewSeasonEpisode(cardElement) {
    const data = extractSeasonEpisode(cardElement);
    if (!data) return false;
    // Only mark episode 1 of any season as "New"
    return data.episode === 1;
}

function addNewBadgeToCard(cardElement) {
    if (cardElement.dataset.newSeasonBadged === '1') return false;
    if (!isNewSeasonEpisode(cardElement)) return false;

    // Find the language overlay container
    const languageContainer = cardElement.querySelector('.language-overlay-container');
    if (!languageContainer) return false; // Container not ready yet

    // Check if already added
    if (languageContainer.querySelector('.new-season-badge')) return false;

    cardElement.dataset.newSeasonBadged = '1';

    // Make container flex to display badge and flags side by side
    languageContainer.classList.add('has-new-badge');

    // Create and add badge as first child
    const badge = document.createElement('div');
    badge.className = 'new-season-badge';
    badge.textContent = 'New';
    languageContainer.insertAdjacentElement('afterbegin', badge);
    return true;
}

function processAllCardsWithRetry() {
    ensureNewSeasonStyle();

    // Query cards in visible sections
    const cards = document.querySelectorAll('.card-withuserdata[data-type="Episode"]');
    let processed = 0;

    cards.forEach(card => {
        if (card.offsetParent !== null) { // Only visible cards
            if (addNewBadgeToCard(card)) {
                processed++;
            }
        }
    });

    return processed;
}

function init() {
    const interval = setInterval(() => {
        const hasSections = document.querySelector('.verticalSection');
        if (!hasSections) return;
        clearInterval(interval);
        console.debug('NewSeasonBadge: Initializing section buttons');
        processAllCardsWithRetry();

        // Watch for DOM changes (language containers appearing)
        flagObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }, 300);
}

const handleNavigation = () => {
    console.debug('NewSeasonBadge: Navigation detected, re-processing cards');
    setTimeout(() => {
        processAllCardsWithRetry();
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

// MutationObserver to catch language containers appearing after cards
const flagObserver = new MutationObserver(() => {
    processAllCardsWithRetry();
});

init();
