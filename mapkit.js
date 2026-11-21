/* mapkit.js — a thin layer over MapLibre GL so the app can tilt the map (3D) like Google Maps.
   It keeps the small part of the Leaflet API the app uses (getBounds, getZoom, markers with HTML, popups),
   so app code reads the same, while everything is drawn by one WebGL map.
   Zoom numbers follow Leaflet's 256-px convention (MapLibre zoom + 1), so thresholds like "zoom >= 15" keep their meaning. */
'use strict';
window.MK = (() => {
  const ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" };
  const toLL = (a) => (Array.isArray(a) ? { lat: a[0], lng: a[1] } : { lat: a.lat, lng: a.lng ?? a.lon });

  class Bounds {
    constructor(s, w, n, e) { this.s = s; this.w = w; this.n = n; this.e = e; }
    getSouth() { return this.s; } getNorth() { return this.n; } getWest() { return this.w; } getEast() { return this.e; }
    pad(r) { const dy = (this.n - this.s) * r, dx = (this.e - this.w) * r; return new Bounds(this.s - dy, this.w - dx, this.n + dy, this.e + dx); }
    contains(p) { const { lat, lng } = toLL(p); return lat >= this.s && lat <= this.n && lng >= this.w && lng <= this.e; }
    toBBoxString() { return [this.w, this.s, this.e, this.n].map((v) => v.toFixed(5)).join(','); }
  }

  // Markers made of HTML (pins, "me" dot, parking P, the add-shop pin). Same options as Leaflet's divIcon.
  class Marker {
    constructor(latlng, opts = {}) { this.ll = toLL(latlng); this.opts = opts; this.handlers = {}; this.gl = null; this.map = null; }
    _make() {
      const ic = this.opts.icon || { html: '', iconSize: [20, 20], iconAnchor: [10, 10] };
      const el = document.createElement('div');
      el.className = 'mk' + (ic.className ? ' ' + ic.className : '');
      el.innerHTML = ic.html;
      const [w, h] = ic.iconSize || [20, 20], [ax, ay] = ic.iconAnchor || [w / 2, h / 2];
      el.style.width = w + 'px'; el.style.height = h + 'px';
      if (this.opts.zIndexOffset) el.style.zIndex = String(10 + this.opts.zIndexOffset);
      if (this.opts.interactive === false) el.style.pointerEvents = 'none';
      if (this.tip) el.title = this.tip;
      const m = new maplibregl.Marker({ element: el, draggable: !!this.opts.draggable, offset: [w / 2 - ax, h / 2 - ay] }).setLngLat([this.ll.lng, this.ll.lat]);
      el.addEventListener('click', (e) => { e.stopPropagation(); (this.handlers.click || []).forEach((f) => f(e)); if (this.popupFn) this.openPopup(); });
      m.on('dragend', () => { const p = m.getLngLat(); this.ll = { lat: p.lat, lng: p.lng }; (this.handlers.dragend || []).forEach((f) => f({ target: this })); });
      this.el = el; this.gl = m;
    }
    addTo(target) {
      if (target instanceof Group) { target.add(this); return this; }
      this.map = target; if (!this.gl) this._make(); this.gl.addTo(target.gm); return this;
    }
    remove() { if (this.gl) this.gl.remove(); this.map = null; if (this.popup) this.popup.remove(); return this; }
    setLatLng(p) { this.ll = toLL(p); if (this.gl) this.gl.setLngLat([this.ll.lng, this.ll.lat]); return this; }
    getLatLng() { return this.ll; }
    setIcon(ic) { this.opts.icon = ic; if (this.el) this.el.innerHTML = ic.html; return this; }
    on(ev, f) { (this.handlers[ev] = this.handlers[ev] || []).push(f); return this; }
    // The text arrives HTML-escaped (esc()); decode it in one pass so "&amp;lt;" stays "&lt;" (no double decoding).
    bindTooltip(text) { this.tip = String(text).replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ENTITY[e]); if (this.el) this.el.title = this.tip; return this; }
    bindPopup(fn, opts = {}) { this.popupFn = fn; this.popupOpts = opts; return this; }
    openPopup() {
      const map = this.map || this.group?.map; if (!map) return;
      map.closePopup();
      if (map.onPopup) map.onPopup();
      this.popup = new maplibregl.Popup({ maxWidth: (this.popupOpts.maxWidth || 260) + 'px', offset: 14, closeButton: true })
        .setLngLat([this.ll.lng, this.ll.lat]).setHTML(typeof this.popupFn === 'function' ? this.popupFn() : this.popupFn).addTo(map.gm);
      this.popup.on('close', () => { if (map.onPopupClose) { map.onPopupClose(); } });
      map._popup = this.popup;
      map.fitPopup();
    }
  }

  class Group {
    constructor() { this.items = new Set(); this.map = null; }
    add(m) { this.items.add(m); m.group = this; if (this.map) m.addTo(this.map); }
    addTo(map) { this.map = map; for (const m of this.items) m.addTo(map); return this; }
    remove() { for (const m of this.items) m.remove(); this.map = null; return this; }
    clearLayers() { for (const m of this.items) m.remove(); this.items.clear(); return this; }
  }

  // The map facade: Leaflet-style calls on top of a MapLibre map (this.gm).
  class MapView {
    constructor(container, { center, zoom, style, touch }) {
      this.gm = new maplibregl.Map({
        container, style, center: [center[1], center[0]], zoom: zoom - 1, maxPitch: 70, attributionControl: { compact: true },
        dragRotate: true, pitchWithRotate: true, touchPitch: true, fadeDuration: 150,
      });
      if (!touch) this.gm.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      this._popup = null;
      this.ready = new Promise((res) => this.gm.once('load', res));
    }
    getCenter() { const c = this.gm.getCenter(); return { lat: c.lat, lng: c.lng }; }
    getZoom() { return this.gm.getZoom() + 1; }
    getBounds() {
      // With the map tilted, the far edge reaches the horizon; keep the area we load to a sane box around the centre.
      const b = this.gm.getBounds(), c = this.gm.getCenter();
      const maxD = 0.02 * Math.pow(2, 16 - this.getZoom()) * 2.5;
      const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      return new Bounds(cl(b.getSouth(), c.lat - maxD, c.lat), cl(b.getWest(), c.lng - maxD, c.lng), cl(b.getNorth(), c.lat, c.lat + maxD), cl(b.getEast(), c.lng, c.lng + maxD));
    }
    getSize() { const c = this.gm.getContainer(); return { x: c.clientWidth, y: c.clientHeight }; }
    latLngToContainerPoint(p) { const { lat, lng } = toLL(p); return this.gm.project([lng, lat]); }
    setView(p, z, o = {}) { const { lat, lng } = toLL(p); this.gm[o.animate === false ? 'jumpTo' : 'easeTo']({ center: [lng, lat], zoom: (z ?? this.getZoom()) - 1, duration: 600 }); return this; }
    panTo(p) { const { lat, lng } = toLL(p); this.gm.easeTo({ center: [lng, lat], duration: 500 }); return this; }
    zoomOut(n = 1) { this.gm.easeTo({ zoom: this.gm.getZoom() - n, duration: 500 }); return this; }
    fitBounds(coords, o = {}) {
      let s = 90, w = 180, n = -90, e = -180;
      for (const c of coords) { const { lat, lng } = toLL(c); s = Math.min(s, lat); n = Math.max(n, lat); w = Math.min(w, lng); e = Math.max(e, lng); }
      const tl = o.paddingTopLeft || [40, 40], br = o.paddingBottomRight || [40, 40];
      this.gm.fitBounds([[w, s], [e, n]], { padding: { left: tl[0], top: tl[1], right: br[0], bottom: br[1] }, maxZoom: (o.maxZoom || 18) - 1, duration: 700, pitch: this.gm.getPitch(), bearing: this.gm.getBearing() });
      return this;
    }
    closePopup() { if (this._popup) { this._popup.remove(); this._popup = null; } return this; }
    // A popup not tied to a marker (it stays open when a marker layer is redrawn).
    openPopupAt(p, html, maxWidth = 260) {
      const { lat, lng } = toLL(p);
      this.closePopup();
      if (this.onPopup) this.onPopup();
      this._popup = new maplibregl.Popup({ maxWidth: maxWidth + 'px', offset: 14, closeButton: true }).setLngLat([lng, lat]).setHTML(html).addTo(this.gm);
      this._popup.on('close', () => { if (this.onPopupClose) { this.onPopupClose(); } });
      this.fitPopup();
      return this;
    }
    // Pan so the open popup sits inside the visible part of the map. this.popupInset() → {top, bottom} px
    // covered by the app's floating bars (Leaflet's autoPan did this; MapLibre popups do not pan).
    fitPopup() {
      const el = this._popup && this._popup.getElement();
      if (!el) return;
      const box = this.gm.getContainer().getBoundingClientRect(), r = el.getBoundingClientRect();
      const inset = this.popupInset ? this.popupInset() : { top: 0, bottom: 0 };
      // inset.top is a viewport y; inset.bottom is the height covered at the bottom of the viewport.
      const top = Math.max(box.top, inset.top) + 8, bottom = Math.min(box.bottom, innerHeight - inset.bottom) - 8;
      let dy = 0;
      if (r.bottom > bottom) dy = r.bottom - bottom;
      if (r.top - dy < top) dy = r.top - top; // the top (title, close button) wins when it cannot all fit
      if (Math.abs(dy) > 1) this.gm.panBy([0, dy], { duration: 300 });
    }
    on(evs, f) {
      for (const ev of evs.split(/\s+/)) {
        if (ev === 'click') this.gm.on('click', (e) => f({ latlng: { lat: e.lngLat.lat, lng: e.lngLat.lng }, original: e }));
        else this.gm.on(ev, f);
      }
      return this;
    }
    // GeoJSON helpers for app layers.
    setData(id, features) { const s = this.gm.getSource(id); if (s) s.setData({ type: 'FeatureCollection', features }); }
    ensureSource(id) { if (!this.gm.getSource(id)) this.gm.addSource(id, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); }
    firstLayer(test) { return this.gm.getStyle().layers.find(test)?.id; }
  }

  const point = (lat, lon, props = {}) => ({ type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: [lon, lat] } });
  const line = (coords, props = {}) => ({ type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: coords.map((c) => [c[1], c[0]]) } });
  const poly = (ring, props = {}) => ({ type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [ring] } });
  // A circle of radius r metres as a polygon ring of [lon, lat].
  function circle(lat, lon, r, n = 64) {
    const ky = 111320, kx = 111320 * Math.cos(lat * Math.PI / 180), ring = [];
    for (let i = 0; i <= n; i++) { const a = (i / n) * 2 * Math.PI; ring.push([lon + (Math.cos(a) * r) / kx, lat + (Math.sin(a) * r) / ky]); }
    return ring;
  }
  return {
    Map: MapView, Group, Marker, Bounds, point, line, poly, circle,
    marker: (ll, o) => new Marker(ll, o), group: () => new Group(), divIcon: (o) => o,
  };
})();
