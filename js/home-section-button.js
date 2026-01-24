/*
    This script adds a "random item" button to certain sections on the Jellyfin homepage.
    Clicking the button will either navigate to a random item's page or play a random item directly if Ctrl is held.
    It also adds a "hide watched" button to hide already watched episodes in specific sections.
*/

const scriptSectionButton = document.currentScript;
const DICE_SECTION = scriptSectionButton?.dataset?.diceButtonSection ? scriptSectionButton.dataset.diceButtonSection.split(',').map(s => s.trim()) : [
    'LatestShows',
    'RecentlyAddedShows',
    'NextUp',
    'ContinueWatchingNextUp',
    'ContinueWatching',
    'new-episodes',
    'watchlist'
];
const HIDE_SECTION = scriptSectionButton?.dataset?.hideButtonSection ? scriptSectionButton.dataset.hideButtonSection.split(',').map(s => s.trim()) : [
    'LatestShows',
    'RecentlyAddedShows',
    'new-episodes'
];

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
    });
}

const handleNavigation = () => {
    console.debug('HomeSectionButton: Navigation detected, re-initializing after delay');
    setTimeout(() => {
        init();
    }, 800);
};

window.addEventListener("popstate", handleNavigation);
window.addEventListener("pageshow", handleNavigation);
window.addEventListener("focus", handleNavigation);

init();