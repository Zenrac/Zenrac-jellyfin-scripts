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

document.addEventListener('click', function (e) {
    const link = e.target.closest('a.navMenuOption.lnkMediaFolder[href="#/home"]');
    const title = e.target.closest('h3.pageTitleWithDefaultLogo');

    if (!link && !title) return;

    const button = document.querySelector('button.emby-tab-button[data-index="0"]');
    if (!button) return;

    e.preventDefault();
    button.click();
});