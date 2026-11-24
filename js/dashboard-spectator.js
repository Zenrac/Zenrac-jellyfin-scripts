/*
    Jellyfin spectator mode: adds an "eye" icon on the dashboard session cards that are
    currently playing and opens a player synchronized with that user's playback.
*/

(function () {
  const LOG = "[Spectator]";

  const CFG = {
    syncInterval: 2000,
    seekThreshold: 5,
    seekCooldown: 4000,
    followRemoteTracks: true,
    audioLang: null, // default audio language ; null = no preference
    subtitleLang: null, // default subtitle language ; null = no preference
    subtitleForcedOnly: true,
    hlsUrl: "https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js",
    qualities: [
      { label: "Maximum (40 Mbps)", videoBitrate: 40000000, maxHeight: null },
      { label: "1080p — 8 Mbps", videoBitrate: 8000000, maxHeight: 1080 },
      { label: "720p — 4 Mbps", videoBitrate: 4000000, maxHeight: 720 },
      { label: "480p — 1.5 Mbps", videoBitrate: 1500000, maxHeight: 480 },
      { label: "360p — 700 kbps", videoBitrate: 700000, maxHeight: 360 }
    ]
  };

  const EYE_PATH =
    "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5M12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5m0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3";

  const ICON_MINIMIZE = "M6 19h12v2H6z";
  const ICON_RESTORE =
    "M18 4H6C4.9 4 4 4.9 4 6v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 14H6V6h12z";
  const ICON_CLOSE =
    "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z";

  window.__spectator?.destroy?.();

  function setButtonIcon(btn, pathD, label) {
    btn.title = label;
    btn.setAttribute("aria-label", label);
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="${pathD}"></path></svg>`;
  }

  function formatItemTitle(item) {
    if (!item.SeriesName) return item.Name;
    const season = item.ParentIndexNumber;
    const episode = item.IndexNumber;
    const code = season != null && episode != null ? `S${season}:E${episode} - ` : "";
    return `${item.SeriesName} — ${code}${item.Name}`;
  }

  function makeIconButton(pathD, label, extraClass = "") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `spectator-icon-btn ${extraClass}`.trim();
    setButtonIcon(btn, pathD, label);
    return btn;
  }

  function ticksToSec(t) {
    return (t ?? 0) / 10000000;
  }

  function matchesLang(stream, wanted) {
    if (wanted == null || !stream.Language) return false;
    return [].concat(wanted).includes(stream.Language);
  }

  function getToken() {
    return window.ApiClient?.accessToken?.() || "";
  }

  function getAuthHeaders() {
    const token = getToken();
    return token ? { Authorization: `MediaBrowser Token="${token}"` } : {};
  }

  function getServerAddress() {
    if (!window.ApiClient) return "";
    return ApiClient._serverAddress || ApiClient.serverAddress?.() || "";
  }

  function getUserId() {
    return ApiClient?._currentUser?.Id || ApiClient?.getCurrentUserId?.() || "";
  }

  function getDeviceId() {
    return ApiClient?.deviceId?.() || "";
  }

  function apiFetch(path, options = {}) {
    return fetch(`${getServerAddress()}${path}`, {
      credentials: "include",
      ...options,
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
  }

  function waitForApiClient(timeout = 10000, interval = 100) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (window.ApiClient) return resolve();
        if (Date.now() - start > timeout) return reject(new Error("ApiClient not available"));
        setTimeout(check, interval);
      };
      check();
    });
  }

  function waitForAuth(timeout = 15000, interval = 250) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const token = ApiClient?.accessToken?.();
        const userId = ApiClient?._currentUser?.Id;
        if (token && userId) return resolve();
        if (Date.now() - start > timeout) return reject(new Error("Auth not available"));
        setTimeout(check, interval);
      };
      check();
    });
  }

  let hlsPromise = null;
  function loadHls() {
    if (window.Hls) return Promise.resolve();
    hlsPromise ??= new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = CFG.hlsUrl;
      s.onload = resolve;
      s.onerror = () => {
        hlsPromise = null;
        reject(new Error("Failed to load hls.js (CSP or network issue?)"));
      };
      document.head.appendChild(s);
    });
    return hlsPromise;
  }

  function ensureStyleTag() {
    if (document.getElementById("spectator-style")) return;
    const style = document.createElement("style");
    style.id = "spectator-style";
    style.textContent = `
      [data-spectator-btn] { cursor: pointer !important; }
      [data-spectator-btn]:hover { color: var(--mui-palette-primary-main, #00a4dc); }
      .spectator-icon-btn {
        display: grid; place-items: center; width: 32px; height: 32px; padding: 0;
        border: 0; border-radius: 50%; background: transparent; color: #b5b5b5;
        cursor: pointer; transition: background .15s, color .15s;
      }
      .spectator-icon-btn:hover { background: rgba(255,255,255,.14); color: #fff; }
      .spectator-icon-btn:active { background: rgba(255,255,255,.22); }
      .spectator-close-btn:hover { background: #e5484d; color: #fff; }
    `;
    document.head.appendChild(style);
    console.debug(LOG, "style injected");
  }

  let current = null;

  function closeSpectator() {
    current?.dispose();
    current = null;
  }

  function openSpectator(targetUser) {
    closeSpectator();
    ensureStyleTag();
    console.debug(LOG, "open for", targetUser);

    const panel = document.createElement("div");
    panel.id = "spectator-mode";
    panel.style.cssText = `
      position:fixed;z-index:999999;box-sizing:border-box;overflow:hidden;min-width:320px;
      background:#111;color:white;padding:20px;
      border-radius:12px;display:flex;flex-direction:column;
      gap:12px;font:14px sans-serif;box-shadow:0 0 40px #000;
    `;

    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;border-bottom:1px solid #2a2a2a";
    const title = document.createElement("strong");
    title.textContent = `Spectator mode — ${targetUser}`;
    title.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    const closeBtn = makeIconButton(ICON_CLOSE, "Close", "spectator-close-btn");
    const minBtn = makeIconButton(ICON_MINIMIZE, "Minimize");
    const btns = document.createElement("div");
    btns.style.cssText = "display:flex;gap:4px;flex:none;align-items:center";
    btns.append(minBtn, closeBtn);
    header.style.gap = "12px";
    header.append(title, btns);

    const status = document.createElement("div");
    status.textContent = "Looking for active playback...";

    const video = document.createElement("video");
    video.controls = true;
    video.autoplay = true;
    video.style.cssText = "width:100%;flex:1;min-height:0;background:black";

    const controls = document.createElement("div");
    controls.style.cssText = "display:flex;gap:16px;flex-wrap:wrap;align-items:center";
    const makeSelect = (labelText) => {
      const wrap = document.createElement("label");
      wrap.style.cssText = "display:flex;gap:6px;align-items:center";
      const span = document.createElement("span");
      span.textContent = labelText;
      const sel = document.createElement("select");
      sel.style.cssText = "background:#222;color:white;border:1px solid #444;border-radius:6px;padding:4px 8px;max-width:320px";
      sel.disabled = true;
      wrap.append(span, sel);
      controls.appendChild(wrap);
      return sel;
    };
    const audioSel = makeSelect("Audio");
    const subSel = makeSelect("Subtitles");
    const qualitySel = makeSelect("Quality");
    qualitySel.replaceChildren(...CFG.qualities.map((q, i) => new Option(q.label, i, false, i === 0)));
    qualitySel.disabled = false;

    panel.append(header, status, controls, video);
    document.body.appendChild(panel);

    const GEO_KEY = "spectator-geometry";
    const MIN_W = 320;
    const MIN_H = 220;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, Math.max(lo, hi)));
    const clampGeo = (g) => {
      const width = clamp(g.width, MIN_W, window.innerWidth);
      const height = clamp(g.height, MIN_H, window.innerHeight);
      return {
        width,
        height,
        left: clamp(g.left, 0, window.innerWidth - width),
        top: clamp(g.top, 0, window.innerHeight - height)
      };
    };

    let geo = null;
    try { geo = JSON.parse(localStorage.getItem(GEO_KEY)); } catch {}
    if (!geo || ![geo.left, geo.top, geo.width, geo.height].every(Number.isFinite)) {
      const w = Math.round(window.innerWidth * 0.9);
      const h = Math.round(window.innerHeight * 0.9);
      geo = {
        width: w,
        height: h,
        left: Math.round((window.innerWidth - w) / 2),
        top: Math.round((window.innerHeight - h) / 2)
      };
    }
    geo = clampGeo(geo);

    let minimized = false;
    const applyGeo = () => {
      if (minimized) {
        panel.style.left = "0px";
        panel.style.top = "auto";
        panel.style.bottom = "0px";
        panel.style.width = "100%";
        panel.style.height = "auto";
      } else {
        panel.style.left = `${geo.left}px`;
        panel.style.top = `${geo.top}px`;
        panel.style.bottom = "auto";
        panel.style.width = `${geo.width}px`;
        panel.style.height = `${geo.height}px`;
      }
    };
    const saveGeo = () => {
      try { localStorage.setItem(GEO_KEY, JSON.stringify(geo)); } catch {}
    };
    applyGeo();

    header.style.cursor = "move";
    header.style.touchAction = "none";
    header.style.userSelect = "none";
    header.addEventListener("pointerdown", (e) => {
      if (minimized || e.button !== 0 || e.target.closest("button")) return;
      const sx = e.clientX, sy = e.clientY, ol = geo.left, ot = geo.top;
      header.setPointerCapture(e.pointerId);
      const move = (ev) => {
        geo.left = clamp(ol + ev.clientX - sx, 0, window.innerWidth - panel.offsetWidth);
        geo.top = clamp(ot + ev.clientY - sy, 0, window.innerHeight - panel.offsetHeight);
        applyGeo();
      };
      const up = () => {
        header.removeEventListener("pointermove", move);
        header.removeEventListener("pointerup", up);
        header.removeEventListener("pointercancel", up);
        saveGeo();
      };
      header.addEventListener("pointermove", move);
      header.addEventListener("pointerup", up);
      header.addEventListener("pointercancel", up);
    });

    const handle = document.createElement("div");
    handle.title = "Resize";
    handle.style.cssText =
      "position:absolute;right:0;bottom:0;width:22px;height:22px;cursor:nwse-resize;touch-action:none;" +
      "border-bottom-right-radius:12px;" +
      "background:linear-gradient(135deg,transparent 50%,#888 50%,#888 58%,transparent 58%,transparent 72%,#888 72%,#888 80%,transparent 80%)";
    panel.appendChild(handle);
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY, ow = geo.width, oh = geo.height;
      handle.setPointerCapture(e.pointerId);
      const move = (ev) => {
        geo.width = clamp(ow + ev.clientX - sx, MIN_W, window.innerWidth - geo.left);
        geo.height = clamp(oh + ev.clientY - sy, MIN_H, window.innerHeight - geo.top);
        applyGeo();
      };
      const up = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        handle.removeEventListener("pointercancel", up);
        saveGeo();
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
      handle.addEventListener("pointercancel", up);
    });

    const videoCss = video.style.cssText;
    const titleCss = title.style.cssText;
    const setMinimized = (v) => {
      minimized = v;
      controls.style.display = v ? "none" : "flex";
      handle.style.display = v ? "none" : "";
      header.style.display = v ? "contents" : "";
      panel.style.flexDirection = v ? "row" : "column";
      panel.style.alignItems = v ? "center" : "";
      panel.style.padding = v ? "8px 16px" : "20px";
      panel.style.borderRadius = v ? "12px 12px 0 0" : "12px";
      panel.style.gap = v ? "16px" : "12px";
      title.style.cssText = v ? `${titleCss};flex:none;max-width:35%;order:0` : titleCss;
      status.style.cssText = v
        ? "flex:1;min-width:0;order:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
        : "";
      btns.style.order = v ? "2" : "";
      video.style.cssText = v
        ? "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none"
        : videoCss;
      setButtonIcon(minBtn, v ? ICON_RESTORE : ICON_MINIMIZE, v ? "Restore" : "Minimize");
      if (!v) geo = clampGeo(geo);
      applyGeo();
    };
    minBtn.onclick = () => setMinimized(!minimized);

    let disposed = false;
    let syncing = false;
    let lastItemId = null;
    let lastSeek = 0;
    let hls = null;
    let playSessionId = null;
    let remoteRef = { ticks: null, at: 0 };
    let timer = null;
    let qualityIndex = 0;
    let loadedItemId = null;
    let chosen = { audio: null, subtitle: undefined };
    let choiceVersion = 0;

    const stopTranscode = () => {
      if (!playSessionId) return;
      const id = playSessionId;
      playSessionId = null;
      apiFetch(
        `/Videos/ActiveEncodings?deviceId=${encodeURIComponent(getDeviceId())}&playSessionId=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      ).catch(() => {});
    };

    const teardownStream = () => {
      if (hls) { hls.destroy(); hls = null; }
      video.pause();
      video.removeAttribute("src");
      video.load();
      stopTranscode();
    };

    const onKey = (e) => { if (e.key === "Escape") closeSpectator(); };

    const dispose = () => {
      disposed = true;
      clearInterval(timer);
      document.removeEventListener("keydown", onKey);
      teardownStream();
      panel.remove();
    };

    document.addEventListener("keydown", onKey);
    closeBtn.onclick = closeSpectator;

    async function safePlay() {
      try {
        await video.play();
      } catch (e) {
        if (e.name === "NotAllowedError") {
          video.muted = true;
          try {
            await video.play();
            status.textContent += " (muted: autoplay blocked, click the video)";
          } catch {}
        } else if (e.name !== "AbortError") {
          throw e;
        }
      }
    }

    async function getSession() {
      const r = await apiFetch("/Sessions");
      if (!r.ok) throw new Error(`sessions fetch failed: ${r.status}`);
      const sessions = await r.json();
      return sessions.find((s) => s.UserName === targetUser && s.NowPlayingItem);
    }

    function remotePosition(session) {
      const ticks = session.PlayState?.PositionTicks ?? 0;
      if (ticks !== remoteRef.ticks) remoteRef = { ticks, at: Date.now() };
      const pos = ticksToSec(ticks);
      return session.PlayState?.IsPaused ? pos : pos + (Date.now() - remoteRef.at) / 1000;
    }

    async function startPlayback(session) {
      const item = session.NowPlayingItem;
      const itemId = item.Id;
      status.textContent = `Preparing: ${formatItemTitle(item)}`;

      const response = await apiFetch(`/Items/${itemId}/PlaybackInfo`, {
        method: "POST",
        body: JSON.stringify({
          UserId: getUserId(),
          MediaSourceId: session.PlayState?.MediaSourceId,
          EnableDirectPlay: false,
          EnableDirectStream: false,
          EnableTranscoding: true,
          AllowVideoStreamCopy: true,
          AllowAudioStreamCopy: true,
          MaxStreamingBitrate: (CFG.qualities[qualityIndex].videoBitrate ?? 120000000) + 192000
        })
      });
      if (!response.ok) throw new Error(`PlaybackInfo ${response.status}: ${await response.text()}`);

      const info = await response.json();
      const source =
        info.MediaSources.find((s) => s.Id === session.PlayState?.MediaSourceId) ??
        info.MediaSources[0];

      const streams = source.MediaStreams ?? [];
      if (itemId !== loadedItemId) {
        chosen = { audio: null, subtitle: undefined };
        loadedItemId = itemId;
      }
      const version = choiceVersion;

      const audioStreams = streams.filter((s) => s.Type === "Audio");
      const subStreams = streams.filter((s) => s.Type === "Subtitle");

      const remoteAudioIndex = session.PlayState?.AudioStreamIndex;
      const remoteSubIndex = session.PlayState?.SubtitleStreamIndex;
      const followRemote = CFG.followRemoteTracks && remoteAudioIndex != null;

      const audio =
        (chosen.audio != null ? audioStreams.find((s) => s.Index === chosen.audio) : null) ??
        (followRemote ? audioStreams.find((s) => s.Index === remoteAudioIndex) : null) ??
        audioStreams.find((s) => matchesLang(s, CFG.audioLang)) ??
        audioStreams.find((s) => s.IsDefault) ??
        audioStreams[0];

      let subtitle;
      if (chosen.subtitle !== undefined) {
        subtitle = subStreams.find((s) => s.Index === chosen.subtitle);
      } else if (followRemote) {
        subtitle = remoteSubIndex != null && remoteSubIndex >= 0
          ? subStreams.find((s) => s.Index === remoteSubIndex)
          : undefined;
      } else {
        subtitle = subStreams.find(
          (s) =>
            matchesLang(s, CFG.subtitleLang) &&
            (!CFG.subtitleForcedOnly || s.IsForced)
        );
      }

      const trackLabel = (s) =>
        s.DisplayTitle || s.Title || s.Language || `Track ${s.Index}`;

      audioSel.replaceChildren(
        ...audioStreams.map((s) => new Option(trackLabel(s), s.Index, false, s.Index === audio?.Index))
      );
      subSel.replaceChildren(
        new Option("None", -1, false, !subtitle),
        ...subStreams.map((s) => new Option(trackLabel(s), s.Index, false, s.Index === subtitle?.Index))
      );
      audioSel.disabled = audioStreams.length < 2;
      subSel.disabled = false;

      const url = new URL(`${getServerAddress()}/Videos/${itemId}/master.m3u8`);
      url.searchParams.set("MediaSourceId", source.Id);
      url.searchParams.set("PlaySessionId", info.PlaySessionId);
      url.searchParams.set("DeviceId", getDeviceId());
      url.searchParams.set("api_key", getToken());
      url.searchParams.set("VideoCodec", "h264");
      url.searchParams.set("AudioCodec", "aac");
      url.searchParams.set("TranscodingMaxAudioChannels", "2");
      const quality = CFG.qualities[qualityIndex];
      if (quality.videoBitrate) {
        url.searchParams.set("VideoBitRate", quality.videoBitrate);
        url.searchParams.set("AudioBitRate", 192000);
        url.searchParams.set("MaxStreamingBitrate", quality.videoBitrate + 192000);
      }
      if (quality.maxHeight) url.searchParams.set("MaxHeight", quality.maxHeight);
      if (audio) url.searchParams.set("AudioStreamIndex", audio.Index);
      if (subtitle) {
        url.searchParams.set("SubtitleStreamIndex", subtitle.Index);
        url.searchParams.set("SubtitleMethod", "Encode");
      }

      teardownStream();
      playSessionId = info.PlaySessionId;

      let rejectMeta = () => {};
      const metadataReady = new Promise((resolve, reject) => {
        rejectMeta = reject;
        const t = setTimeout(() => reject(new Error("Timed out while loading the stream")), 30000);
        video.addEventListener("loadedmetadata", () => { clearTimeout(t); resolve(); }, { once: true });
        video.addEventListener("error", () => {
          clearTimeout(t);
          reject(new Error("Video stream failed to load"));
        }, { once: true });
      });

      const nativeHls = !!video.canPlayType("application/vnd.apple.mpegurl");
      let useHls = false;
      try {
        await loadHls();
        useHls = !!window.Hls?.isSupported();
      } catch (e) {
        if (!nativeHls) throw e;
      }

      if (useHls) {
        hls = new window.Hls({
          xhrSetup: (xhr) => {
            const token = getToken();
            if (token) xhr.setRequestHeader("Authorization", `MediaBrowser Token="${token}"`);
          }
        });
        hls.on(window.Hls.Events.ERROR, (_, data) => {
          if (!data.fatal) return;
          const code = data.response?.code ? ` (HTTP ${data.response.code})` : "";
          const msg = `HLS error: ${data.details}${code}`;
          console.error(LOG, msg, data);
          status.textContent = msg;
          rejectMeta(new Error(msg));
        });
        hls.loadSource(url.toString());
        hls.attachMedia(video);
      } else if (nativeHls) {
        video.src = url.toString();
      } else {
        throw new Error("HLS is not supported by this browser");
      }

      await metadataReady;
      if (disposed) return;

      video.currentTime = remotePosition(session);
      lastSeek = Date.now();

      if (session.PlayState?.IsPaused) video.pause();
      else await safePlay();

      lastItemId = version === choiceVersion ? itemId : null;
      status.textContent = formatItemTitle(item);
    }

    async function synchronize() {
      if (disposed || syncing) return;
      syncing = true;
      try {
        const session = await getSession();
        if (disposed) return;

        if (!session) {
          status.textContent = "No active playback";
          if (lastItemId) { teardownStream(); lastItemId = null; remoteRef = { ticks: null, at: 0 }; }
          return;
        }

        if (session.NowPlayingItem.Id !== lastItemId) {
          remoteRef = { ticks: null, at: 0 };
          await startPlayback(session);
          return;
        }

        const remote = remotePosition(session);
        const diff = remote - video.currentTime;

        if (Math.abs(diff) > CFG.seekThreshold && Date.now() - lastSeek > CFG.seekCooldown) {
          video.currentTime = remote;
          lastSeek = Date.now();
        }

        const remotePaused = !!session.PlayState?.IsPaused;
        if (remotePaused && !video.paused) video.pause();
        else if (!remotePaused && video.paused) await safePlay();
      } catch (error) {
        if (!disposed) status.textContent = `Error: ${error.message}`;
        console.error(LOG, error);
        lastItemId = null;
      } finally {
        syncing = false;
      }
    }

    video.addEventListener("seeked", () => { lastSeek = Date.now(); });

    const restartStream = () => {
      choiceVersion += 1;
      lastItemId = null;
      status.textContent = "Reloading stream...";
      synchronize();
    };
    audioSel.onchange = () => { chosen.audio = Number(audioSel.value); restartStream(); };
    subSel.onchange = () => { chosen.subtitle = Number(subSel.value); restartStream(); };
    qualitySel.onchange = () => { qualityIndex = Number(qualitySel.value); restartStream(); };

    current = { dispose };
    synchronize();
    timer = setInterval(synchronize, CFG.syncInterval);
  }

  function enhanceCards() {
    document.querySelectorAll(".MuiCard-root").forEach((card) => {
      const playing = card.querySelector(".MuiLinearProgress-root");
      const actions = card.querySelector(".MuiCardActions-root > .MuiStack-root");
      const existing = card.querySelector("[data-spectator-btn]");

      if (!playing || !actions) {
        existing?.remove();
        return;
      }
      if (existing) return;

      const user = card.lastElementChild?.textContent?.trim();
      if (!user) return;

      const model = actions.querySelector("button");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = model?.className ?? "";
      btn.tabIndex = 0;
      btn.title = "Spectator mode";
      btn.setAttribute("aria-label", "Spectator mode");
      btn.dataset.spectatorBtn = "1";

      const svgClass = model?.querySelector("svg")?.getAttribute("class") ?? "";
      btn.innerHTML = `<svg class="${svgClass}" focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="VisibilityIcon"><path d="${EYE_PATH}"></path></svg>`;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openSpectator(user);
      });

      actions.insertBefore(btn, actions.lastElementChild);
      console.debug(LOG, "button added for", user);
    });
  }

  async function init() {
    console.debug(LOG, "init");

    let raf = 0;
    let observer = null;
    let reapplyTimer = null;

    window.__spectator = {
      open: openSpectator,
      close: closeSpectator,
      destroy() {
        observer?.disconnect();
        clearInterval(reapplyTimer);
        cancelAnimationFrame(raf);
        closeSpectator();
        document.querySelectorAll("[data-spectator-btn]").forEach((b) => b.remove());
        document.getElementById("spectator-style")?.remove();
        delete window.__spectator;
      }
    };

    try {
      await waitForApiClient();
      await waitForAuth();

      ensureStyleTag();

      observer = new MutationObserver(() => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(enhanceCards);
      });
      observer.observe(document.body, { childList: true, subtree: true });

      reapplyTimer = setInterval(enhanceCards, 2000);
      enhanceCards();
    } catch (e) {
      console.error(LOG, "error:", e);
    }
  }

  init();
})();