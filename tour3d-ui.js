/*
 * TOUR LIBERO: interfaccia (schede informative, foto 360° reali, mappa con teletrasporto)
 * Il mondo 3D è in scuola3d.js; qui solo i pannelli. Le foto 360° sono in tour/tiles (elenco in tour/foto.js).
 */
window.SCUOLA_MODE = "tour";
(function () {
  const $ = (s) => document.querySelector(s);
  const S = () => window.Scuola3D;
  const open = { info: false, foto: false, map: false, intro: true };
  const anyOpen = () => open.info || open.foto || open.map || open.intro;

  function show(el, on) { el.hidden = !on; }
  function esc(t) { return String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  const fotoOf = (inf) => inf.foto || Object.keys(window.FOTO).filter((id) => FOTO[id].a === inf.area);

  // ---------- Scheda informativa ----------
  function openInfo(inf) {
    const list = fotoOf(inf);
    $("#infoBody").innerHTML = `
      <div class="eyebrow">${esc(inf.area || "Ingresso")}</div>
      <h2>${esc(inf.title)}</h2>
      <p>${esc(inf.text)}</p>
      ${list.length ? `<div class="thumbs">${list.slice(0, 6).map((id) => `<button data-f="${id}" style="background-image:url('tour/tiles/${id}/0/f/0/0.jpg')" aria-label="Apri foto 360°"></button>`).join("")}</div>` : ""}
      <div class="row">
        ${list.length ? `<button class="btn primary" id="infoFoto">📷 Guarda le foto 360° vere (${list.length})</button>` : ""}
        <button class="btn" id="infoClose">Continua a esplorare</button>
      </div>`;
    open.info = true; show($("#info"), true);
    $("#infoClose").onclick = closeInfo;
    if (list.length) {
      $("#infoFoto").onclick = () => { closeInfo(); openFoto(list, 0, inf.title); };
      $("#infoBody").querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => { closeInfo(); openFoto(list, list.indexOf(b.dataset.f), inf.title); }));
    }
  }
  function closeInfo() { open.info = false; show($("#info"), false); }

  // ---------- Visore delle foto 360° (Marzipano) ----------
  let viewer = null, fotoList = [], fotoIdx = 0;
  const scenes = {};
  function ensureViewer() {
    if (viewer) return;
    viewer = new Marzipano.Viewer($("#pano360"), { controls: { mouseViewMode: "drag" } });
  }
  function sceneFor(id) {
    if (scenes[id]) return scenes[id];
    const S_ = FOTO[id].s;
    const levels = [{ tileSize: 256, size: 256, fallbackOnly: true }, { tileSize: 512, size: 512 }, { tileSize: 512, size: 1024 }, { tileSize: 512, size: S_ }];
    const source = Marzipano.ImageUrlSource.fromString(`tour/tiles/${id}/{z}/{f}/{y}/{x}.jpg`);
    const geometry = new Marzipano.CubeGeometry(levels);
    const limiter = Marzipano.RectilinearView.limit.traditional(S_, 120 * Math.PI / 180);
    const view = new Marzipano.RectilinearView({ yaw: 0, pitch: 0, fov: 1.6 }, limiter);
    scenes[id] = viewer.createScene({ source, geometry, view, pinFirstLevel: true });
    return scenes[id];
  }
  function showFoto(i) {
    fotoIdx = (i + fotoList.length) % fotoList.length;
    const id = fotoList[fotoIdx];
    sceneFor(id).switchTo({ transitionDuration: 600 });
    $("#fotoName").textContent = `${FOTO[id].n} · ${fotoIdx + 1}/${fotoList.length}`;
    // anteprima della successiva
    if (fotoList.length > 1) sceneFor(fotoList[(fotoIdx + 1) % fotoList.length]);
  }
  let autoSpin = null;
  function openFoto(list, i, title) {
    fotoList = list; open.foto = true; show($("#foto"), true); ensureViewer();
    $("#fotoTitle").textContent = title || "Foto 360°";
    $("#fotoPrev").hidden = $("#fotoNext").hidden = list.length < 2;
    showFoto(i || 0);
    if (!autoSpin) autoSpin = Marzipano.autorotate({ yawSpeed: 0.05, targetPitch: 0, targetFov: 1.6 });
    viewer.startMovement(autoSpin); viewer.setIdleMovement(4000, autoSpin);
  }
  function closeFoto() { open.foto = false; show($("#foto"), false); if (viewer) { viewer.stopMovement(); viewer.setIdleMovement(Infinity); } }

  // ---------- Mappa grande con teletrasporto ----------
  let mapInfo = null;
  function openMap() {
    open.map = true; show($("#bigmap"), true);
    const cv = $("#bigmapCanvas"), r = cv.getBoundingClientRect(), k = Math.min(2, devicePixelRatio || 1);
    cv.width = r.width * k; cv.height = r.height * k;
    mapInfo = S().drawMap(cv, { labels: true, scale: k * 1.2 });
  }
  function closeMap() { open.map = false; show($("#bigmap"), false); }

  // ---------- Barra in alto ----------
  function onRoom(r) {
    $("#roomName").textContent = r.name;
    const btn = $("#fotoBtn"), list = Object.keys(FOTO).filter((id) => FOTO[id].a === r.area);
    btn.disabled = !list.length; btn.title = list.length ? `Foto 360° vere: ${r.area}` : "Nessuna foto 360° per questa zona";
    btn.dataset.area = r.area;
  }

  function init() {
    $("#fotoBtn").onclick = () => { const a = $("#fotoBtn").dataset.area; const list = Object.keys(FOTO).filter((id) => FOTO[id].a === a); if (list.length) openFoto(list, 0, a); };
    $("#mapBtn").onclick = () => (open.map ? closeMap() : openMap());
    $("#viewBtn").onclick = () => { const fp = S().toggleView(); $("#viewBtn").textContent = fp ? "🤖" : "👁️"; $("#viewBtn").title = fp ? "Torna alla terza persona" : "Visuale in prima persona"; };
    $("#fsBtn").onclick = () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) {} };
    $("#homeBtn").onclick = () => { S().reset(); };
    $("#airBtn").onclick = () => { const on = S().toggleAerial(); $("#airBtn").title = on ? "Torna al robot (H)" : "Vista dall'alto (H)"; };
    $("#fotoClose").onclick = closeFoto;
    $("#fotoPrev").onclick = () => showFoto(fotoIdx - 1);
    $("#fotoNext").onclick = () => showFoto(fotoIdx + 1);
    $("#bigmapClose").onclick = closeMap;
    $("#info").addEventListener("click", (e) => { if (e.target.id === "info") closeInfo(); });
    $("#bigmapCanvas").addEventListener("click", (e) => {
      if (!mapInfo) return;
      const cv = e.currentTarget, r = cv.getBoundingClientRect(), k = cv.width / r.width;
      const p = mapInfo.inv((e.clientX - r.left) * k, (e.clientY - r.top) * k);
      const room = S().roomAt(p);
      if (room) { S().goRoom(room.id); closeMap(); }
    });
    $("#startBtn").onclick = () => { open.intro = false; show($("#intro"), false); };
    addEventListener("keydown", (e) => {
      if (e.code === "Escape") { if (open.foto) closeFoto(); else if (open.info) closeInfo(); else if (open.map) closeMap(); }
      if (e.code === "KeyH" && !open.foto && !open.info && !open.intro) $("#airBtn").click();
      if (e.code === "KeyM" && !open.foto && !open.info && !open.intro) open.map ? closeMap() : openMap();
      if (open.foto && e.code === "ArrowRight") showFoto(fotoIdx + 1);
      if (open.foto && e.code === "ArrowLeft") showFoto(fotoIdx - 1);
      if (open.intro && (e.code === "Enter" || e.code === "Space")) $("#startBtn").click();
    });
    if (S()) S().setBlocked(anyOpen);
  }

  window.Tour = {
    openInfo, onRoom, openFoto,
    ready() { if (S()) S().setBlocked(anyOpen); }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
