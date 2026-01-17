/*
    This script adds a "random item" button to certain sections on the Jellyfin homepage.
    Clicking the button will either navigate to a random item's page or play a random item directly if Ctrl is held.
*/

function addRandomButtons() {
    const sections = document.querySelectorAll('div.verticalSection');

    sections.forEach(section => {
        if (
            section.classList.contains('MyMedia') ||
            section.classList.contains('UpcomingShows') ||
            section.id === 'hssLoadingIndicator' ||
            section.querySelector('.randomItemButton')
        ) return;

        const sectionId = section.getAttribute('data-custom-section-id');
        const allowedClasses = [
            'ContinueWatchingNextUp',
            'NextUp',
            'ContinueWatching',
            'LatestShows',
            'RecentlyAddedShows'
        ];

        const hasAllowedClass = allowedClasses.some(cls => section.classList.contains(cls));
        const isAllowedSection = sectionId === 'new-episodes' || sectionId === 'watchlist';

        if (!hasAllowedClass && !isAllowedSection) return;

        const titleContainer = section.querySelector('.sectionTitleContainer');
        if (titleContainer) {
            const button = document.createElement('button');
            button.className = 'headerButton headerButtonRight paper-icon-button-light randomItemButton';
            button.is = 'paper-icon-button-light';
            button.title = 'Pick a random item (Ctrl + click plays immediately)';
            button.innerHTML = '<i class="material-icons" style="transition: transform 1.5s;">casino</i>';
            button.style.marginBottom = '0.35em';
            button.style.marginRight = '5px';

            const icon = button.querySelector('i.material-icons');
            button.addEventListener('mouseenter', () => {
                icon.style.animation = 'dice 1.5s';
            });
            button.addEventListener('animationend', () => {
                icon.style.animation = '';
            });

            button.addEventListener('click', (e) => {
                if (e.ctrlKey) {
                    const playSpans = section.querySelectorAll('span.play_arrow');
                    if (playSpans.length) {
                        const randomIndex = Math.floor(Math.random() * playSpans.length);
                        playSpans[randomIndex].click();
                    }
                } else {
                    const links = section.querySelectorAll('.itemAction.textActionButton');
                    if (links.length) {
                        const randomIndex = Math.floor(Math.random() * links.length);
                        const link = links[randomIndex].getAttribute('href');
                        if (link) window.location.href = link;
                    }
                }
            });

            titleContainer.appendChild(button);
        }
    });
}

setInterval(addRandomButtons, 300);