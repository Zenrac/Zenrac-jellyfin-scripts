/*
    Plugin Pages does not work on android mobile app because of JQuery. This fixes it.
*/

function initPluginPages() {
    if (typeof PluginPages !== 'undefined') {
        if (!PluginPages.initialized) PluginPages.init();
        if (typeof ApiClient !== 'undefined') PluginPages.populateSidebar();
    }
}

if (typeof $ === 'undefined') {
    let s = document.createElement('script');
    s.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
    s.onload = initPluginPages;
    document.head.appendChild(s);
} else {
    initPluginPages();
}
