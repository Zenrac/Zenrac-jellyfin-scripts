# Zenrac's Jellyfin Scripts

A collection of useful JavaScript scripts and CSS snippets to enhance your [Jellyfin](https://github.com/jellyfin/jellyfin) web client and improve your overall experience.

> **Note:** These snippets are made by a new Jellyfin user. They prioritize compatibility over performance or efficiency. 
Feel free to reuse, improve, or contribute.

## ⚠️ Disclaimer
- These scripts are experimental and may rely on frequent `setInterval` checks, which can affect performance depending on your configuration.  
- Use them at your own discretion. Optimizations are possible by replacing intervals with event-based listeners where applicable.

## CSS Snippets

> **CSS snippets** can be added directly to `Dashboard > Branding` or via external plugins.

### Remove "My Media" from Home Page
```css
@import url("https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/css/remove-my-media.css");
```
### Remove "Cast" from show pages
```css
@import url("https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/css/remove-cast.css");
```

### Show full season/movie in show/collection
```css
@import url("https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/css/show-full-season-name.css");
```

## Javascript Scripts

> **JavaScript scripts** can be added using [Jellyfin-JavaScript-Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector). 

### Remove Dark Reader

Dark Reader is a very popular extension but it causes issues with Jellyfin. 
Using this script will tell the extension to ignore your page.

```js
const s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/remove-dark-reader.js";
s.async = true;
document.head.appendChild(s);
```

### Clickable Header Logo and MediaBar fixer

Replaces the behavior when clicking the 'Home' tab to match clicking 'Home' in the menu. It fixes some issue with [Media Bar Plugin](https://github.com/IAmParadox27/jellyfin-plugin-media-bar). Also allow to click header logo to return Home

```js
const s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/clickable-header-logo.js";
s.async = true;
document.head.appendChild(s);
```

### Remove HTML tags from MediaBar description
A small fix for [Media Bar Plugin](https://github.com/IAmParadox27/jellyfin-plugin-media-bar) to remove buggy HTML tags from Shows descriptions.

```js
const s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/media-bar-plot-fix.js";
s.async = true;
document.head.appendChild(s);
```

### Allows to remove NextUp items
Improve [KefinTweaks plugin](https://github.com/ranaldsgift/KefinTweaks) to also be able to remove items from NextUp (it currently only allow to remove Watching items) 

```js
const s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/remove-nextup-item.js";
s.async = true;
document.head.appendChild(s);
```

### Add a "open player" icon when playing a video theme

When enabling `Settings > Display > Theme videos` it adds a clickable button to open the video theme player in a modal.

```js
const s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/open-player-video-themes.js";
s.async = true;
document.head.appendChild(s);
```

### Show Video Theme in Show page

```js
const s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/display-video-themes.js";
s.async = true;
document.head.appendChild(s);
```

### Random dice on everything
Improve [Jellyfin-Enhanced](https://github.com/n00bcodr/Jellyfin-Enhanced) to add random dice to all vertical categories in home sections.

```js
const s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/more-random-dice.js";
s.async = true;
document.head.appendChild(s);
```

### Display cards in search suggestion instead of links
Replace old looking hyperlinks in search's suggestions with cards
```js
const s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/suggestions-card.js";
s.async = true;
document.head.appendChild(s);
```

## All JS and CSS
To get everything in one JS. Not very customizable but every convenient.
```js
const s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/all.js";
s.async = true;
document.head.appendChild(s);
```