/*
    Adds clickability to the header logo and page title to navigate to the home page.
*/

const style = document.createElement('style');
style.textContent = `
h3.pageTitleWithDefaultLogo {
    cursor: pointer;
}
`;

document.head.appendChild(style);

function getHomeUrl() {
    return `${window.location.origin}/web/#/home`;
}

function shouldOpenNewTab(e) {
    return e.ctrlKey || e.button === 1;
}

function handleHomeClick(e) {
    const link = e.target.closest('a.navMenuOption.lnkMediaFolder[href="#/home"]');
    const title = e.target.closest('h3.pageTitleWithDefaultLogo');
    const homeButton = e.target.closest('button.headerHomeButton');

    if (!link && !title && !homeButton) return;

    if (shouldOpenNewTab(e)) {
        e.preventDefault();
        e.stopPropagation();
        window.open(getHomeUrl(), '_blank');
        return;
    }

    if (homeButton) return;

    const button = document.querySelector('button.emby-tab-button[data-index="0"]');
    if (!button) return;

    e.preventDefault();
    button.click();
}

document.addEventListener('click', handleHomeClick);
document.addEventListener('auxclick', handleHomeClick);
