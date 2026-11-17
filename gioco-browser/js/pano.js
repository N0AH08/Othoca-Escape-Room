// Visore di foto 360° equirettangolari (ingresso della scuola e "foto reale" di ogni stanza).
import * as THREE from "three";

export class Pano {
  constructor(canvas, markersEl = null) {
    this.canvas = canvas; this.markersEl = markersEl;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
    const geo = new THREE.SphereGeometry(50, 64, 40); geo.scale(-1, 1, 1);
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
    this.scene.add(new THREE.Mesh(geo, this.mat));
    this.lon = 0; this.lat = 0; this.fov = 88; this.hots = []; this.running = false; this.auto = true;
    this.loader = new THREE.TextureLoader(); this.cache = new Map();
    let down = null;
    canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, lon: this.lon, lat: this.lat }; this.auto = false; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", (e) => { if (!down) return; this.lon = down.lon - (e.clientX - down.x) * 0.12; this.lat = Math.max(-80, Math.min(80, down.lat + (e.clientY - down.y) * 0.12)); });
    canvas.addEventListener("pointerup", () => (down = null));
    canvas.addEventListener("wheel", (e) => { this.fov = Math.max(40, Math.min(90, this.fov + e.deltaY * 0.04)); e.preventDefault(); }, { passive: false });
  }
  load(url, { lon = 0, lat = 0 } = {}) {
    return new Promise((res) => {
      const apply = (t) => {
        this.mat.map = t; this.mat.needsUpdate = true; this.lon = lon; this.lat = lat;
        this.mat.opacity = 0; const t0 = performance.now(); const fade = () => { this.mat.opacity = Math.min(1, (performance.now() - t0) / 450); if (this.mat.opacity < 1) requestAnimationFrame(fade); }; fade();
        res();
      };
      if (this.cache.has(url)) return apply(this.cache.get(url));
      this.loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; this.cache.set(url, t); apply(t); });
    });
  }
  // hotspot: { lon, lat, label, icon, onClick }
  setHotspots(list) {
    this.hots = list || [];
    if (!this.markersEl) return;
    this.markersEl.innerHTML = "";
    for (const h of this.hots) {
      const el = document.createElement("div"); el.className = "hot";
      el.innerHTML = `<div class="dot">${h.icon || "i"}</div><div class="lbl">${h.label}</div>`;
      el.onclick = () => h.onClick && h.onClick(); this.markersEl.appendChild(el); h.el = el;
    }
  }
  start() { if (this.running) return; this.running = true; this.auto = true; const loop = () => { if (!this.running) return; this.frame(); requestAnimationFrame(loop); }; loop(); }
  stop() { this.running = false; }
  frame() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (this.canvas.width !== Math.floor(w * this.renderer.getPixelRatio())) { this.renderer.setSize(w, h, false); }
    this.camera.aspect = w / h; this.camera.fov = this.fov; this.camera.updateProjectionMatrix();
    if (this.auto) this.lon += 0.02;
    const phi = THREE.MathUtils.degToRad(90 - this.lat), theta = THREE.MathUtils.degToRad(this.lon);
    this.camera.lookAt(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
    this.renderer.render(this.scene, this.camera);
    const v = new THREE.Vector3();
    for (const hp of this.hots) {
      if (!hp.el) continue;
      const p2 = THREE.MathUtils.degToRad(90 - hp.lat), t2 = THREE.MathUtils.degToRad(hp.lon);
      v.set(Math.sin(p2) * Math.cos(t2), Math.cos(p2), Math.sin(p2) * Math.sin(t2)).multiplyScalar(10).project(this.camera);
      const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      hp.el.style.display = vis ? "" : "none";
      if (vis) { hp.el.style.left = ((v.x + 1) / 2 * w) + "px"; hp.el.style.top = ((1 - v.y) / 2 * h) + "px"; }
    }
  }
}
