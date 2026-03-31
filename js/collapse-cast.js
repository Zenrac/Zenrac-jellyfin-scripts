/*
    Makes cast sections collapsible and collapsed by default.
*/

(function () {
    const SECTION_CONFIG = [
        { id: "castCollapsible", label: "Cast" },
        { id: "guestCastCollapsible", label: "Guest Cast" }
    ];
    const STORAGE_PREFIX = "zenrafyn.castCollapsed.";
    let castInterval = null;

    function ensureStyle() {
        if (document.getElementById("zenrafyn-cast-collapse-style")) return;
        const style = document.createElement("style");
        style.id = "zenrafyn-cast-collapse-style";
        style.textContent = `
            .zenrafyn-cast-toggle {
                margin-left: 12px;
                font-size: 12px;
                padding: 4px 10px;
                min-width: auto;
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.3) !important;
                border-radius: 4px;
                cursor: pointer;
                color: var(--main-text, #fff) !important;
                align-self: center;
            }
        `;
        document.head.appendChild(style);
    }

    function findTitleContainer(section) {
        return section.querySelector(".sectionTitleContainer")
            || section.querySelector(".sectionTitle")
            || null;
    }

    function getContentNodes(section, titleContainer, button) {
        return Array.from(section.children).filter(node => {
            if (node === titleContainer) return false;
            if (node === button) return false;
            return true;
        });
    }

    function unwrapLegacyContent(section) {
        const wrapper = Array.from(section.children).find(
            node => node.classList && node.classList.contains("zenrafyn-cast-content")
        );
        if (!wrapper) return;
        while (wrapper.firstChild) {
            section.insertBefore(wrapper.firstChild, wrapper);
        }
        wrapper.remove();
    }

    function hasCastContent(section) {
        return Boolean(
            section.querySelector(
                ".itemsContainer .card, .itemsContainer .personCard, .personCard, .card"
            )
        );
    }

    function forceVisibleIfHasContent(section) {
        if (!hasCastContent(section)) return;
        section.hidden = false;
        section.style.setProperty("display", "block", "important");
    }

    function setCollapsed(section, button, collapsed, label) {
        const titleContainer = findTitleContainer(section);
        const contentNodes = getContentNodes(section, titleContainer, button);
        const scrollButtons = new Set(section.querySelectorAll(".emby-scrollbuttons"));
        if (titleContainer && titleContainer.parentElement) {
            titleContainer.parentElement
                .querySelectorAll(".emby-scrollbuttons")
                .forEach(node => scrollButtons.add(node));
        }
        section.classList.toggle("zenrafyn-cast-collapsed", collapsed);
        contentNodes.forEach(node => {
            node.hidden = collapsed;
        });
        scrollButtons.forEach(node => {
            if (collapsed) {
                node.style.setProperty("display", "none", "important");
            } else {
                node.style.removeProperty("display");
            }
        });
        button.setAttribute("aria-expanded", String(!collapsed));
        button.textContent = collapsed ? `Show ${label}` : `Hide ${label}`;
        section.dataset.zenrafynCastCollapsed = collapsed ? "true" : "false";
        saveCollapsedState(section, collapsed);
    }

    function getStorageKey(section) {
        return `${STORAGE_PREFIX}${section.id}`;
    }

    function readCollapsedState(section) {
        try {
            const value = localStorage.getItem(getStorageKey(section));
            if (value === "true") return true;
            if (value === "false") return false;
        } catch (_) {
            // Ignore storage errors and fallback to dataset/default.
        }
        if (section.dataset.zenrafynCastCollapsed === "true") return true;
        if (section.dataset.zenrafynCastCollapsed === "false") return false;
        return true;
    }

    function saveCollapsedState(section, collapsed) {
        try {
            localStorage.setItem(getStorageKey(section), collapsed ? "true" : "false");
        } catch (_) {
            // Ignore storage errors.
        }
    }

    function setupSection(section, label) {
        if (!section) return;

        ensureStyle();
        unwrapLegacyContent(section);
        forceVisibleIfHasContent(section);

        const titleContainer = findTitleContainer(section);
        let button = section.querySelector(".zenrafyn-cast-toggle");
        if (!button) {
            button = document.createElement("button");
            button.type = "button";
            button.className = "zenrafyn-cast-toggle";
            if (titleContainer) {
                titleContainer.appendChild(button);
            } else {
                section.insertBefore(button, section.firstChild);
            }

            button.addEventListener("click", () => {
                const isCollapsed = section.classList.contains("zenrafyn-cast-collapsed");
                setCollapsed(section, button, !isCollapsed, label);
            });
        }

        const collapsed = readCollapsedState(section);
        setCollapsed(section, button, collapsed, label);
        section.dataset.zenrafynCastReady = "1";
    }

    function getSectionsById(id) {
        const escapedId = window.CSS && CSS.escape ? CSS.escape(id) : id;
        return Array.from(document.querySelectorAll(`#${escapedId}`));
    }

    function init() {
        SECTION_CONFIG.forEach(config => {
            const sections = getSectionsById(config.id);
            sections.forEach(section => setupSection(section, config.label));
        });
    }

    function startCastPolling() {
        if (castInterval) return;
        castInterval = setInterval(init, 500);
    }

    function stopCastPolling() {
        if (!castInterval) return;
        clearInterval(castInterval);
        castInterval = null;
    }

    function resetCastState() {
        SECTION_CONFIG.forEach(config => {
            getSectionsById(config.id).forEach(section => {
                delete section.dataset.zenrafynCastReady;
            });
        });
    }

    const handleNavigation = () => {
        stopCastPolling();
        resetCastState();
        setTimeout(() => {
            init();
            startCastPolling();
        }, 800);
    };

    init();
    startCastPolling();

    const originalPushState = history.pushState;
    history.pushState = function (...args) {
        const result = originalPushState.apply(this, args);
        handleNavigation();
        return result;
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
        const result = originalReplaceState.apply(this, args);
        handleNavigation();
        return result;
    };

    window.addEventListener("hashchange", handleNavigation);
    window.addEventListener("popstate", handleNavigation);
    window.addEventListener("pageshow", handleNavigation);
})();
