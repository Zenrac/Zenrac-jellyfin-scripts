/* 
    This file loads all other scripts and CSS files for the Zenrac Jellyfin Scripts plugin.
*/

const scripts = [
    "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/remove-dark-reader.js",
    "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/clickable-header-logo.js",
    "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/media-bar-plot-fix.js",
    "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/remove-nextup-item.js",
    "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/open-player-video-themes.js",
    "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/display-video-themes.js",
    "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/more-random-dice.js",
    "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/suggestions-card.js"
];

const cssFiles = [
    "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/css/remove-my-media.css",
    "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/css/remove-cast.css",
    "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/css/show-full-season-name.css"
];

// Load CSS
cssFiles.forEach(href => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
});

// Load JS
scripts.forEach(src => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    document.head.appendChild(script);
});
