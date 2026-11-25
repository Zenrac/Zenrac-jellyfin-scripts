/*
    Adds subtitle size and vertical position controls to the Jellyfin video player.
*/

(function () {
    'use strict';

    if (window.jfSubtitleControlsLoaded) return;
    window.jfSubtitleControlsLoaded = true;

    const subtitleSettings = {
        size: 100,
        position: 0
    };

    const cueOriginals = new WeakMap();
    const trackStates = new WeakMap();
    let settingsVersion = 0;

    const subtitleStyle = document.createElement('style');
    function updateSubtitleStyle() {
        const shift = subtitleSettings.position < 0 ? -subtitleSettings.position * 2 : 0;

        subtitleStyle.textContent = `
            video::cue(.jf-big) {
                font-size: ${subtitleSettings.size}% !important;
            }

            video::-webkit-media-text-track-container {
                transform: translateY(${shift}%) !important;
            }
        `;
    }

    function processCue(cue) {
        if (!(cue instanceof VTTCue)) return;

        if (!cueOriginals.has(cue)) {
            cueOriginals.set(cue, {
                text: cue.text,
                line: cue.line
            });
        }

        const original = cueOriginals.get(cue);

        const wantedText = subtitleSettings.size === 100
            ? original.text
            : `<c.jf-big>${original.text}</c>`;

        if (cue.text !== wantedText) {
            cue.text = wantedText;
        }

        let wantedLine;

        if (subtitleSettings.position <= 0) {
            wantedLine = original.line;
        } else {
            const base = Number.isFinite(Number(original.line))
                ? Number(original.line)
                : -1;

            wantedLine = Math.min(-1, base - subtitleSettings.position);
        }

        if (cue.line !== wantedLine) {
            cue.snapToLines = true;
            cue.line = wantedLine;
        }
    }

    function processTrack(track) {
        const cues = track.cues;
        if (!cues) return false;

        const state = trackStates.get(track) || { settingsVersion: -1, count: -1 };
        if (state.settingsVersion === settingsVersion && state.count === cues.length) return false;

        for (const cue of cues) processCue(cue);

        trackStates.set(track, { settingsVersion, count: cues.length });
        return true;
    }

    function refreshCue(cue) {
        const size = cue.size;
        cue.size = size === 100 ? 99 : 100;
        cue.size = size;
    }

    function applySubtitles(forceRefresh = false) {
        try {
            const video = document.querySelector('video');
            if (!video) return;

            for (const track of video.textTracks) {
                const changed = processTrack(track);

                if ((changed || forceRefresh) && track.mode === 'showing' && track.activeCues) {
                    for (const cue of track.activeCues) {
                        if (cue instanceof VTTCue) refreshCue(cue);
                    }
                }
            }
        } catch (error) {
            console.error('[Jellyfin Subtitle Controls]', error);
        }
    }

    function createControls() {
        for (const controls of document.querySelectorAll('.buttons.focuscontainer-x')) {
            if (!controls.querySelector('.btnFullscreen, .btnPip, .btnVideoOsdSettings')) continue;
            if (controls.querySelector('.jf-subtitle-controls')) continue;

            addControls(controls);
        }
    }

    function addControls(controls) {
        const host = document.createElement('div');
        host.className = 'jf-subtitle-controls';

        const shadow = host.attachShadow({ mode: 'open' });

        shadow.innerHTML = `
            <style>
                :host {
                    display: inline-flex;
                    align-items: center;
                }

                button {
                    background: transparent;
                    color: inherit;
                    border: none;
                    cursor: pointer;
                    font-size: 17px;
                    font-weight: bold;
                    padding: 10px;
                    border-radius: 50%;
                    min-width: 40px;
                    height: 40px;
                }

                button:hover {
                    background: rgba(255,255,255,.15);
                }

                .panel {
                    position: fixed;
                    bottom: 105px;
                    right: 25px;
                    width: 270px;
                    box-sizing: border-box;
                    padding: 18px;
                    background: #252525;
                    color: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 20px rgba(0,0,0,.5);
                    z-index: 999999;
                    font-family: Arial, sans-serif;
                }

                .panel[hidden] {
                    display: none;
                }

                .heading {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 18px;
                }

                .setting {
                    margin-bottom: 18px;
                }

                .label {
                    display: flex;
                    justify-content: space-between;
                    font-size: 13px;
                    margin-bottom: 10px;
                }

                .value {
                    font-weight: bold;
                }

                input {
                    width: 100%;
                    accent-color: #00a4dc;
                    cursor: pointer;
                }

                .reset {
                    display: block;
                    width: 100%;
                    height: 34px;
                    border-radius: 5px;
                    background: #444;
                    margin-top: 16px;
                    font-size: 13px;
                    font-weight: normal;
                }
            </style>

            <button id="toggle" title="Subtitle settings">Aa</button>

            <div class="panel" id="panel" hidden>
                <div class="heading">Subtitle settings</div>

                <div class="setting">
                    <div class="label">
                        <span>Size</span>
                        <span class="value" id="sizeValue">100 %</span>
                    </div>
                    <input id="size" type="range" min="50" max="300" step="5" value="100">
                </div>

                <div class="setting">
                    <div class="label">
                        <span>Vertical position</span>
                        <span class="value" id="positionValue">0</span>
                    </div>
                    <input id="position" type="range" min="-10" max="15" step="1" value="0">
                </div>

                <button class="reset" id="reset">Reset</button>
            </div>
        `;

        const toggle = shadow.getElementById('toggle');
        const panel = shadow.getElementById('panel');
        const size = shadow.getElementById('size');
        const position = shadow.getElementById('position');

        function renderLabels() {
            shadow.getElementById('sizeValue').textContent = `${subtitleSettings.size} %`;
            shadow.getElementById('positionValue').textContent =
                subtitleSettings.position > 0 ? `+${subtitleSettings.position}` : subtitleSettings.position;
        }

        function update() {
            subtitleSettings.size = Number(size.value);
            subtitleSettings.position = Number(position.value);

            renderLabels();

            settingsVersion++;
            updateSubtitleStyle();
            applySubtitles(true);
        }

        size.value = subtitleSettings.size;
        position.value = subtitleSettings.position;
        renderLabels();

        toggle.addEventListener('click', () => {
            panel.hidden = !panel.hidden;
        });

        size.addEventListener('input', update);
        position.addEventListener('input', update);

        shadow.getElementById('reset').addEventListener('click', () => {
            size.value = 100;
            position.value = 0;
            update();
        });

        const closePanel = event => {
            if (!host.isConnected) {
                document.removeEventListener('click', closePanel);
                return;
            }

            if (!event.composedPath().includes(host)) {
                panel.hidden = true;
            }
        };
        document.addEventListener('click', closePanel);

        const subtitleButton = controls.querySelector('.btnSubtitles');

        if (subtitleButton) {
            subtitleButton.parentNode.insertBefore(host, subtitleButton);
        } else {
            controls.appendChild(host);
        }
    }

    function initSubtitleControls() {
        try {
            createControls();
        } catch (error) {
            console.error('[Jellyfin Subtitle Controls]', error);
        }
        applySubtitles();
    }

    new MutationObserver(() => {
        try {
            createControls();
        } catch (error) {
            console.error('[Jellyfin Subtitle Controls]', error);
        }
    }).observe(document.body, {
        childList: true,
        subtree: true
    });

    document.head.appendChild(subtitleStyle);
    updateSubtitleStyle();

    setInterval(initSubtitleControls, 500);
})();