function getUserId() {
    if (!window.ApiClient) return null;    
    return window.ApiClient?._currentUser?.Id;
}

function getAuthHeaders() {
    if (!window.ApiClient) return null;
    const token = ApiClient.accessToken?.();
    return token ? { Authorization: `MediaBrowser Token="${token}"` } : {};
}

function getServerAddress() {
    if (!window.ApiClient) return null;
    return ApiClient._serverAddress;
}

function tick() {
    const userId = getUserId();
    const headers = getAuthHeaders();
    const serverAddress = getServerAddress();
    if (!userId || !headers || !serverAddress) return;

    document.querySelectorAll(".ContinueWatching .card, .ContinueWatchingNextUp .card, .NextUp .card").forEach(card => {
        if (card.querySelector(".remove-continue-button")) return;

        const seriesId = card.querySelector(".cardText-first a[data-id]")?.dataset.id;
        if (!seriesId) return;

        const overlay = card.querySelector(".cardOverlayContainer");
        const playBtn = overlay?.querySelector(".cardOverlayFab-primary");
        if (!overlay || !playBtn) return;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.title = "Remove from Next Up";
        btn.className = "remove-continue-button cardOverlayButton cardOverlayButton-hover itemAction paper-icon-button-light";
        btn.innerHTML = '<span class="material-icons">close</span>';

        btn.onclick = async e => {
            e.preventDefault();
            e.stopPropagation();

            card.style.opacity = "0.5";
            card.style.pointerEvents = "none";

            const base = `${serverAddress}/Users/${userId}/PlayedItems/${seriesId}`;
            const d = new Date();
            d.setFullYear(d.getFullYear() - 2);
            const datePlayed = d.toISOString();

            try {
                await fetch(`${base}?DatePlayed=${encodeURIComponent(datePlayed)}`, { method: "POST", headers });
                await fetch(base, { method: "DELETE", headers });
                card.remove();
            } catch {
                card.style.opacity = "";
                card.style.pointerEvents = "";
            }
        };

        playBtn.insertAdjacentElement("afterend", btn);
    });
}

setInterval(tick, 300);