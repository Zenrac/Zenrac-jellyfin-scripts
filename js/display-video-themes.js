/*
    Display video themes for items on their detail pages.
*/

const interval = setInterval(() => {

    const listChildrenElems = document.querySelectorAll('#listChildrenCollapsible');
    const listChildren = Array.from(listChildrenElems).find(e => e.clientWidth !== 0 && e.clientHeight !== 0);
    if (!listChildren) {
        return;
    }

    var existingElements = document.getElementById('videoThemesSection');

    if (existingElements) {
        var isHidden = existingElements.clientWidth === 0 && existingElements.clientHeight === 0;
    

        if (isHidden) {
            document.querySelectorAll('#videoThemesSection').forEach(e => e.remove());
        } else {
            return;
        }
    }

    const showTitleElems = document.querySelectorAll('h1.itemName.infoText.parentNameLast');

    let showTitleElem = null;
    for (const elem of showTitleElems) {
        const isHidden = elem.clientWidth === 0 && elem.clientHeight === 0;
        if (!isHidden) {
            showTitleElem = elem;
            break;
        }
    }

    if (!showTitleElem) {
        return;
    }

    const showTitle = showTitleElem.textContent.trim();

    const section = document.createElement('div');
    section.id = 'videoThemesSection';
    section.className = 'verticalSection detailVerticalSection';
    section.innerHTML = `
        <h2 class="sectionTitle sectionTitle-cards">
            <span>Video Themes</span>
        </h2>
        <div id="themeContent" class="itemsContainer padded-right vertical-wrap" style="text-align:left"></div>
    `;
    listChildren.insertAdjacentElement('afterend', section);

    function showVideoPopup(videoSrc, poster) {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '98',
            opacity: '0',
            transition: 'opacity 0.3s'
        });

        const wrapper = document.createElement('div');
        Object.assign(wrapper.style, {
            width: '80%',
            height: '80%',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            transform: 'scale(0.8)',
            transition: 'transform 0.3s'
        });

        const container = document.createElement('div');
        container.className = 'videoPlayerContainer themeVideoPlayerContainer';
        container.style.width = '100%';
        container.style.height = '100%';

        const video = document.createElement('video');
        video.className = 'htmlvideoplayer';
        video.src = videoSrc;
        video.poster = poster;
        video.autoplay = true;
        video.controls = true;
        video.playsInline = true;
        video.setAttribute('webkit-playsinline', '');
        video.crossOrigin = 'anonymous';
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';

        container.appendChild(video);
        wrapper.appendChild(container);
        overlay.appendChild(wrapper);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            wrapper.style.transform = 'scale(1)';
        });

        function close() {
            overlay.style.opacity = '0';
            wrapper.style.transform = 'scale(0.8)';
            setTimeout(() => overlay.remove(), 300);
            document.removeEventListener('keydown', esc);
        }

        function esc(e) {
            if (e.key === 'Escape') close();
        }

        overlay.addEventListener('click', e => {
            if (e.target === overlay) close();
        });
        document.addEventListener('keydown', esc);
    }

    function parseThemeInfo(name) {
        const m = name.toUpperCase().match(/(OP|ED)\s*([0-9]+)/);
        if (!m) return { type: 'Theme Video', order: 999 };
        return {
            type: m[1] === 'OP' ? 'Opening' : 'Ending',
            order: parseInt(m[2], 10)
        };
    }

    function listItemThemes() {
        const params = new URLSearchParams(location.hash.split('?')[1]);
        const itemId = params.get('id');
        if (!itemId) {
            return;
        }

        const apiKey = window.ApiClient?.accessToken();
        if (!apiKey) {
            return;
        }

        const baseUrl = location.origin;
        const url = `${baseUrl}/Items/${itemId}/ThemeMedia?ApiKey=${apiKey}`;

        fetch(url)
            .then(r => r.json())
            .then(data => {
                const container = document.getElementById('themeContent');
                container.innerHTML = '';

                const videos = (data.ThemeVideosResult?.Items || [])
                    .filter(v => v.MediaType !== 'Audio')
                    .map(v => {
                        const info = parseThemeInfo(v.Name);
                        return { ...v, _type: info.type, _order: info.order };
                    })
                    .sort((a, b) => {
                        if (a._type !== b._type) {
                            return a._type === 'Opening' ? -1 : 1;
                        }
                        return a._order - b._order;
                    });


                videos.forEach(item => {
                    const poster = `${baseUrl}/Items/${item.Id}/Images/Primary?fillHeight=267&fillWidth=474&quality=96`;
                    const mediaSourceId = item.MediaSources?.[0]?.Id || item.Id;
                    const stream = `${baseUrl}/Videos/${item.Id}/stream.webm?Static=true&mediaSourceId=${mediaSourceId}&ApiKey=${apiKey}`;

                    const card = document.createElement('div');
                    card.className = 'card overflowBackdropCard card-hoverable card-withuserdata';
                    card.innerHTML = `
                        <div class="cardBox cardBox-bottompadded">
                            <div class="cardScalable">
                                <div class="cardPadder cardPadder-backdrop lazy-hidden-children">
                                    <span class="cardImageIcon material-icons" aria-hidden="true">play_circle</span>
                                </div>
                                <canvas aria-hidden="true" width="20" height="20" class="blurhash-canvas lazy-hidden"></canvas>
                                <a href="${document.location.href}" class="cardImageContainer coveredImage cardContent itemAction lazy blurhashed lazy-image-fadein-fast" data-action="link" style="background-image:url('${poster}')"></a>
                                <div class="cardOverlayContainer itemAction" data-action="link">
                                    <a href="${document.location.href}" class="cardImageContainer"></a>
                                    <button is="paper-icon-button-light" class="cardOverlayButton cardOverlayButton-hover itemAction paper-icon-button-light cardOverlayFab-primary" data-action="resume">
                                        <span class="material-icons cardOverlayButtonIcon cardOverlayButtonIcon-hover" aria-hidden="true">play_arrow</span>
                                    </button>
                                </div>
                            </div>
                            <div class="cardText cardTextCentered cardText-first">
                                <bdi>
                                    <a href="${document.location.href}" class="itemAction textActionButton" data-action="link">${showTitle}</a>
                                </bdi>
                            </div>
                            <div class="cardText cardTextCentered cardText-secondary">
                                <bdi>${item._type} ${item._order !== 999 ? item._order : ''}</bdi>
                            </div>
                        </div>
                    `;

                    const open = e => {
                        e.preventDefault();
                        showVideoPopup(stream, poster);
                    };

                    card.querySelector('.cardOverlayButton').addEventListener('click', open);
                    card.querySelector('.cardImageContainer').addEventListener('click', open);

                    container.appendChild(card);
                });

                if (!videos.length) {
                    container.textContent = 'No video themes found.';
                }
            })
            .catch(err => console.error('Error fetching theme videos:', err));
    }

    listItemThemes();
}, 500);