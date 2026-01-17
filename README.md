![BANNER](https://i.imgur.com/7IaLK4s.png)

A collection of useful JavaScript scripts and CSS snippets to enhance your [Jellyfin](https://github.com/jellyfin/jellyfin) web client and improve your overall experience.

## ⚠️ Disclaimer
- These snippets are created by a new Jellyfin user (me). They prioritize compatibility over performance or efficiency.  
  Feel free to reuse, improve, or contribute.
- My JavaScript scripts are experimental and may rely on frequent `setInterval` checks, which can affect performance depending on your configuration.  
  Use them at your own discretion. Optimizations are possible by replacing intervals with event-based listeners where applicable.

## 🛠️ Prerequisites

- Tested on Jellyfin Web Client **v1.11.0**. Compatibility with other versions is not guaranteed.
- **CSS snippets** can be added directly via `Dashboard > Branding` or through external plugins.
- **JavaScript scripts** can be added using [Jellyfin-JavaScript-Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector).


## CSS Snippets

### Remove "My Media" from Home Page
```css
@import url("https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/css/remove-my-media.css");
```
### Remove "Cast" from show pages
```css
@import url("https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/css/remove-cast.css");
```

### Show full season/movie name in show/collection
```css
@import url("https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/css/show-full-season-name.css");
```

## Javascript Scripts

### Display cards in search suggestion

Replace hyperlinks in search's suggestions with cards
![Suggestion](https://i.imgur.com/2gE3kg4.png)
```js
const s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/suggestions-card.js";
s.async = true;
document.head.appendChild(s);
```

### Clickable Header Logo

Allow to click header logo to return Home. Also replaces the behavior when clicking the 'Home' tab to match clicking 'Home' in the menu because it fixes some issue with [Media Bar Plugin](https://github.com/IAmParadox27/jellyfin-plugin-media-bar). 

![Clickable Header Logo](https://i.imgur.com/MV60FW9.png)

```js
const s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/clickable-header-logo.js";
s.async = true;
document.head.appendChild(s);
```

### Allows to remove NextUp items
Improve [KefinTweaks plugin](https://github.com/ranaldsgift/KefinTweaks) to also be able to remove items from NextUp (it currently only allow to remove Watching items) 

![NextUp](https://i.imgur.com/W3lLf20.png)

```js
const s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/remove-nextup-item.js";
s.async = true;
document.head.appendChild(s);
```

### Add a "open player" icon when playing a video theme

When enabling `Settings > Display > Theme videos` it adds a clickable button to open the video theme player in a modal.

![Open player](https://i.imgur.com/mQWxps5.png)

```js
const s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/open-player-video-theme.js";
s.async = true;
document.head.appendChild(s);
```

### Show Video Theme in Show page
Adds video themes in show details. Ordering for Openings/Endings is supported. Built-in player in a modal.
![Video Theme](https://i.imgur.com/gUiAvGD.png)
```js
const s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/display-video-theme.js";
s.async = true;
document.head.appendChild(s);
```

### Random dice on everything
Improve [Jellyfin-Enhanced](https://github.com/n00bcodr/Jellyfin-Enhanced) to add random dice to all vertical categories in home sections.

![Dice](https://i.imgur.com/b5NXtAP.png)

```js
const s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/more-random-dice.js";
s.async = true;
document.head.appendChild(s);
```

### Remove HTML tags from MediaBar description
A small fix for [Media Bar](https://github.com/IAmParadox27/jellyfin-plugin-media-bar) to remove buggy HTML tags from Shows descriptions.

```js
const s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/media-bar-plot-fix.js";
s.async = true;
document.head.appendChild(s);
```

### Remove Dark Reader

Dark Reader is a very popular extension but it causes issues with Jellyfin. 
Using this script will tell the extension to ignore your page.

```js
const s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/remove-dark-reader.js";
s.async = true;
document.head.appendChild(s);
```

## All-in-one (JS and CSS)
To get everything in one JS. Not very customizable, but very convenient.
```js
const s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/Zenrac/Zenrac-jellyfin-scripts@latest/js/all.js";
s.async = true;
document.head.appendChild(s);
```

## 🤖 AI Assistance

- The banner image at the top was generated with AI.
- Some JavaScript and CSS code in this repository was assisted by AI, but all code has been carefully reviewed, modified, and critically evaluated before use.

## 🤝 Contribution Guidelines

- Contributions are welcome! You can suggest new JS or CSS snippets, improvements to existing ones, or fixes.
- Please make sure your code is compatible with Jellyfin Web Client **v1.11.0** or clearly specify if it targets other versions.
- Respect existing code style and naming conventions to keep the repository consistent.
- For discussions, ideas, or questions, you can open an issue or join the [Jellyfin Community Discord](https://discord.gg/v7P9CAvCKZ). 

## Licence

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.  

