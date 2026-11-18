/* Walking routes and shade estimation for «Открыто рядом».
   Routing: OSRM foot profile (routing.openstreetmap.de, free FOSSGIS service).
   Shade: sun position (SunCalc) + building footprints with heights and woods from OpenFreeMap vector tiles.
   For every point along a route we look toward the sun: if a building tall enough to cast a shadow
   that far stands in that direction, or a tree is right next to the path, the point is in shade. */
'use strict';
window.Route = (() => {
  const OSRM = 'https://routing.openstreetmap.de/routed-foot/route/v1/driving/';
  const R = 6371000, RAD = Math.PI / 180;

  async function fetchJSON(url, opts = {}, ms = 20000) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url, { ...opts, signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(timer); }
  }

  // ---------- routing ----------
  const toRoute = (r) => ({ coords: r.geometry.coordinates.map(([lon, lat]) => [lat, lon]), distance: r.distance, duration: r.duration });
  async function walkRoutes(from, to, extra) {
    const j = await fetchJSON(`${OSRM}${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&alternatives=3`, {}, 15000);
    if (!j.routes || !j.routes.length) throw new Error('no route');
    const routes = j.routes.map(toRoute);
    if (extra) {
      // More candidates for shade: detour through a point on each side of the straight line (parallel streets).
      const midLat = (from.lat + to.lat) / 2, midLon = (from.lon + to.lon) / 2;
      const kx = Math.cos(midLat * RAD);
      const vx = (to.lon - from.lon) * kx, vy = to.lat - from.lat, len = Math.hypot(vx, vy);
      const offDeg = Math.min(Math.max(len * 0.18, 0.0008), 0.0025);
      const vias = [1, -1].map((s) => ({ lat: midLat + (s * vx / len) * offDeg, lon: midLon - (s * vy / len) * offDeg / kx }));
      const more = await Promise.allSettled(vias.map((v) =>
        fetchJSON(`${OSRM}${from.lon},${from.lat};${v.lon},${v.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`, {}, 12000)));
      for (const m of more) if (m.status === 'fulfilled' && m.value.routes?.[0]) {
        const r = toRoute(m.value.routes[0]);
        if (!routes.some((x) => Math.abs(x.distance - r.distance) < 15)) routes.push(r);
      }
    }
    return routes;
  }

  // ---------- weather (Open-Meteo, no key) ----------
  let wxCache = null;
  async function weather(lat, lon) {
    if (wxCache && Date.now() - wxCache.t < 15 * 60000) return wxCache.v;
    try {
      const j = await fetchJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&current=apparent_temperature,cloud_cover,is_day`, {}, 8000);
      wxCache = { t: Date.now(), v: j.current };
      return j.current;
    } catch { return null; }
  }
  function isHot(wx, lat, lon, now = new Date()) {
    if (!wx || !wx.is_day) return false;
    const alt = SunCalc.getPosition(now, lat, lon).altitude / RAD;
    return wx.apparent_temperature >= 27 && wx.cloud_cover < 70 && alt > 15;
  }

  // ---------- obstacles from OpenFreeMap vector tiles (buildings with render_height, woods) ----------
  // Tiles come from a CDN in a fraction of a second, unlike live Overpass queries.
  let tileTemplate = null;
  async function tileUrl(z, x, y) {
    if (!tileTemplate) tileTemplate = (await fetchJSON('https://tiles.openfreemap.org/planet', {}, 8000)).tiles[0];
    return tileTemplate.replace('{z}', z).replace('{x}', x).replace('{y}', y);
  }
  // Minimal Mapbox Vector Tile (protobuf) reader: only what we need (layer name, features, tags, polygon rings).
  function readTile(buf) {
    const b = new Uint8Array(buf);
    let p = 0;
    const varint = () => { let r = 0, s = 0, c; do { c = b[p++]; r += (c & 0x7f) * 2 ** s; s += 7; } while (c & 0x80); return r; };
    const skip = (wt) => { if (wt === 0) varint(); else if (wt === 1) p += 8; else if (wt === 2) p += varint(); else if (wt === 5) p += 4; };
    const str = (len) => new TextDecoder().decode(b.subarray(p, (p += len)));
    const packed = (end) => { const a = []; while (p < end) a.push(varint()); return a; };
    const layers = [];
    while (p < b.length) {
      const tag = varint();
      if (tag >> 3 !== 3) { skip(tag & 7); continue; }
      const lend = varint() + p;
      const L = { name: '', keys: [], values: [], feats: [], extent: 4096 };
      while (p < lend) {
        const t2 = varint(), f = t2 >> 3;
        if (f === 1) L.name = str(varint());
        else if (f === 3) L.keys.push(str(varint()));
        else if (f === 5) L.extent = varint();
        else if (f === 4) {
          const vend = varint() + p; let v = null;
          while (p < vend) {
            const t3 = varint(), f3 = t3 >> 3;
            if (f3 === 1) v = str(varint());
            else if (f3 === 2) { v = new DataView(b.buffer, b.byteOffset + p, 4).getFloat32(0, true); p += 4; }
            else if (f3 === 3) { v = new DataView(b.buffer, b.byteOffset + p, 8).getFloat64(0, true); p += 8; }
            else if (f3 === 6) { const n = varint(); v = (n % 2 ? -(n + 1) : n) / 2; }
            else if (f3 === 4 || f3 === 5) v = varint();
            else if (f3 === 7) v = !!varint();
            else skip(t3 & 7);
          }
          L.values.push(v);
        } else if (f === 2) {
          const fend = varint() + p; const F = { tags: [], type: 0, geom: [] };
          while (p < fend) {
            const t3 = varint(), f3 = t3 >> 3;
            if (f3 === 2) F.tags = packed(varint() + p);
            else if (f3 === 3) F.type = varint();
            else if (f3 === 4) F.geom = packed(varint() + p);
            else skip(t3 & 7);
          }
          L.feats.push(F);
        } else skip(t2 & 7);
      }
      layers.push(L);
    }
    return layers;
  }
  // LineString geometry -> list of lines (each a list of tile points).
  function lines(geom) {
    const out = []; let x = 0, y = 0, cur = null, i = 0;
    while (i < geom.length) {
      const c = geom[i++], cmd = c & 7, n = c >> 3;
      for (let k = 0; k < n; k++) {
        const dx = geom[i++], dy = geom[i++];
        x += (dx >> 1) ^ -(dx & 1); y += (dy >> 1) ^ -(dy & 1);
        if (cmd === 1) { if (cur && cur.length > 1) out.push(cur); cur = [[x, y]]; } else if (cur) cur.push([x, y]);
      }
    }
    if (cur && cur.length > 1) out.push(cur);
    return out;
  }
  function rings(geom) {
    const out = []; let x = 0, y = 0, cur = null, i = 0;
    while (i < geom.length) {
      const c = geom[i++], cmd = c & 7, n = c >> 3;
      if (cmd === 7) { if (cur) out.push(cur); cur = null; continue; }
      for (let k = 0; k < n; k++) {
        const dx = geom[i++], dy = geom[i++];
        x += (dx >> 1) ^ -(dx & 1); y += (dy >> 1) ^ -(dy & 1);
        if (cmd === 1) { if (cur) out.push(cur); cur = [[x, y]]; } else cur.push([x, y]);
      }
    }
    if (cur && cur.length > 2) out.push(cur);
    return out;
  }
  const Z = 14, tileCache = new Map();
  const lon2x = (lon) => Math.floor(((lon + 180) / 360) * 2 ** Z);
  const lat2y = (lat) => Math.floor(((1 - Math.log(Math.tan(lat * RAD) + 1 / Math.cos(lat * RAD)) / Math.PI) / 2) * 2 ** Z);
  async function loadTile(tx, ty) {
    const key = tx + '/' + ty;
    if (tileCache.has(key)) return tileCache.get(key);
    const pr = (async () => {
      const r = await fetch(await tileUrl(Z, tx, ty));
      if (!r.ok) throw new Error('tile ' + r.status);
      const layers = readTile(await r.arrayBuffer());
      const n = 2 ** Z, res = [];
      const toLL = (L, [px, py]) => {
        const lon = ((tx + px / L.extent) / n) * 360 - 180;
        const lat = Math.atan(Math.sinh(Math.PI * (1 - (2 * (ty + py / L.extent)) / n))) / RAD;
        return [lat, lon];
      };
      const parking = [], roads = [];
      const MAIN = /^(motorway|trunk|primary|secondary)$/, STREET = /^(tertiary|minor|service)$/;
      for (const L of layers) {
        if (L.name === 'transportation') {
          // Streets for the night-lights layer (paths, tracks, rail and ferries are skipped).
          for (const F of L.feats) {
            if (F.type !== 2) continue;
            const tags = {};
            for (let i = 0; i < F.tags.length; i += 2) tags[L.keys[F.tags[i]]] = L.values[F.tags[i + 1]];
            const main = MAIN.test(tags.class || '');
            if (!main && !STREET.test(tags.class || '')) continue;
            if (tags.brunnel === 'tunnel') continue;
            for (const ln of lines(F.geom)) roads.push({ main, pts: ln.map((pt) => toLL(L, pt)) });
          }
          continue;
        }
        if (L.name === 'poi') {
          // Car parks are points in the poi layer (class/subclass "parking"; bicycle parking excluded).
          for (const F of L.feats) {
            if (F.type !== 1 || F.geom.length < 3) continue;
            const tags = {};
            for (let i = 0; i < F.tags.length; i += 2) tags[L.keys[F.tags[i]]] = L.values[F.tags[i + 1]];
            if (tags.class !== 'parking' || /bicycle|motorcycle/.test(tags.subclass || '')) continue;
            const dx = F.geom[1], dy = F.geom[2];
            const [lat, lon] = toLL(L, [(dx >> 1) ^ -(dx & 1), (dy >> 1) ^ -(dy & 1)]);
            parking.push({ lat, lon, name: tags['name:he'] || tags.name || '', sub: tags.subclass || 'parking' });
          }
          continue;
        }
        if (L.name !== 'building' && L.name !== 'landcover') continue;
        for (const F of L.feats) {
          if (F.type !== 3) continue;
          const tags = {};
          for (let i = 0; i < F.tags.length; i += 2) tags[L.keys[F.tags[i]]] = L.values[F.tags[i + 1]];
          let h;
          // OpenMapTiles puts a placeholder 4-5 m when a building has no height or levels tagged;
          // in Israeli towns an untagged building is far more often a 3-storey block, so assume 10 m.
          if (L.name === 'building') { h = Number(tags.render_height) || 0; if (h <= 5) h = 10; }
          else if (tags.class === 'wood') h = 6; // tree canopy
          else continue;
          for (const ring of rings(F.geom)) res.push({ h: Math.min(h, 150), poly: ring.map((pt) => toLL(L, pt)) });
        }
      }
      return { obs: res, parking, roads };
    })();
    tileCache.set(key, pr);
    pr.catch(() => tileCache.delete(key));
    return pr;
  }
  async function obstacles([s, w, n, e]) {
    const jobs = [];
    for (let tx = lon2x(w); tx <= lon2x(e); tx++) for (let ty = lat2y(n); ty <= lat2y(s); ty++) jobs.push(loadTile(tx, ty));
    if (jobs.length > 9) return null; // too far for a walk
    try {
      const parts = await Promise.all(jobs);
      return { buildings: parts.flatMap((p) => p.obs), trees: [] };
    } catch { return null; }
  }

  // ---------- geometry in a local metric frame ----------
  function frame(lat0, lon0) {
    const kx = R * RAD * Math.cos(lat0 * RAD), ky = R * RAD;
    return { to: ([lat, lon]) => [(lon - lon0) * kx, (lat - lat0) * ky] };
  }
  function inPoly(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function buildIndex(obs, f) {
    const CELL = 25, grid = new Map();
    const add = (cx, cy, v) => { const k = cx + ',' + cy; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(v); };
    const blds = obs.buildings.map((b) => {
      const pts = b.poly.map(f.to);
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      const o = { h: b.h, pts, bb };
      for (let cx = Math.floor(bb[0] / CELL); cx <= Math.floor(bb[2] / CELL); cx++)
        for (let cy = Math.floor(bb[1] / CELL); cy <= Math.floor(bb[3] / CELL); cy++) add(cx, cy, o);
      return o;
    });
    const trees = obs.trees.map(f.to);
    const tgrid = new Map();
    for (const [x, y] of trees) { const k = Math.floor(x / CELL) + ',' + Math.floor(y / CELL); if (!tgrid.has(k)) tgrid.set(k, []); tgrid.get(k).push([x, y]); }
    return {
      buildingAt(x, y) {
        const list = grid.get(Math.floor(x / CELL) + ',' + Math.floor(y / CELL)) || [];
        for (const b of list) if (x >= b.bb[0] && x <= b.bb[2] && y >= b.bb[1] && y <= b.bb[3] && inPoly(x, y, b.pts)) return b;
        return null;
      },
      treeNear(x, y, r) {
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          for (const [tx, ty] of tgrid.get((Math.floor(x / CELL) + dx) + ',' + (Math.floor(y / CELL) + dy)) || []) if ((tx - x) ** 2 + (ty - y) ** 2 < r * r) return true;
        }
        return false;
      },
    };
  }

  // Fraction of the route (by length) that is in shade right now.
  function shadeFraction(route, idx, f, sun) {
    if (sun.altitude <= 0) return 1;
    const tanAlt = Math.tan(sun.altitude);
    // SunCalc azimuth: 0 = south, positive toward west. Direction toward the sun in our x(east)/y(north) frame:
    const dx = -Math.sin(sun.azimuth), dy = -Math.cos(sun.azimuth);
    const maxReach = Math.min(120 / tanAlt, 150);
    const pts = route.coords.map(f.to);
    let shaded = 0, total = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const seg = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.round(seg / 8));
      for (let k = 0; k < n; k++) {
        const x = x0 + ((x1 - x0) * (k + 0.5)) / n, y = y0 + ((y1 - y0) * (k + 0.5)) / n;
        const len = seg / n;
        total += len;
        if (idx.treeNear(x, y, 5)) { shaded += len; continue; }
        for (let d = 2; d <= maxReach; d += 3) {
          const b = idx.buildingAt(x + dx * d, y + dy * d);
          if (b && b.h / tanAlt >= d) { shaded += len; break; }
        }
      }
    }
    return total ? shaded / total : 0;
  }

  async function plan(from, to, { wantShade, at } = {}) {
    const now = at || new Date(); // `at` lets us test daytime shade at night
    const wx = await weather(from.lat, from.lon);
    const hot = isHot(wx, from.lat, from.lon, now);
    const sunUp0 = SunCalc.getPosition(now, from.lat, from.lon).altitude > 0;
    const routes = await walkRoutes(from, to, (wantShade || hot) && sunUp0);
    const out = { routes, chosen: 0, shade: null, hot };
    out.temp = wx ? Math.round(wx.apparent_temperature) : null;
    const sunPos = SunCalc.getPosition(now, from.lat, from.lon);
    out.sunUp = sunPos.altitude > 0;
    if (!(wantShade || out.hot) || !out.sunUp) return out;

    const all = routes.flatMap((r) => r.coords);
    const lats = all.map((p) => p[0]), lons = all.map((p) => p[1]);
    const padLat = 0.0012, padLon = 0.0014;
    const obs = await obstacles([Math.min(...lats) - padLat, Math.min(...lons) - padLon, Math.max(...lats) + padLat, Math.max(...lons) + padLon]);
    if (!obs) { out.shadeFailed = true; return out; }
    const f = frame(from.lat, from.lon), idx = buildIndex(obs, f);
    for (const r of routes) r.shade = shadeFraction(r, idx, f, sunPos);
    // Shadiest route that is at most 25% slower than the fastest.
    const fastest = Math.min(...routes.map((r) => r.duration));
    let best = 0;
    routes.forEach((r, i) => { if (r.duration <= fastest * 1.25 && r.shade > routes[best].shade + 0.05) best = i; });
    out.chosen = best;
    out.shade = routes[best].shade;
    return out;
  }

  // Car parks in a bounding box [s, w, n, e], from the same cached tiles.
  async function parkingIn([s, w, n, e]) {
    const jobs = [];
    for (let tx = lon2x(w); tx <= lon2x(e); tx++) for (let ty = lat2y(n); ty <= lat2y(s); ty++) jobs.push(loadTile(tx, ty).catch(() => null));
    if (jobs.length > 12) return [];
    const seen = new Set(), out = [];
    for (const part of await Promise.all(jobs)) for (const p of part?.parking || []) {
      const k = p.lat.toFixed(5) + ',' + p.lon.toFixed(5);
      if (!seen.has(k) && p.lat >= s && p.lat <= n && p.lon >= w && p.lon <= e) { seen.add(k); out.push(p); }
    }
    return out;
  }

  // Buildings for the visible map (shade layer): up to 16 tiles, failed tiles skipped.
  async function buildingsIn([s, w, n, e]) {
    const jobs = [];
    for (let tx = lon2x(w); tx <= lon2x(e); tx++) for (let ty = lat2y(n); ty <= lat2y(s); ty++) jobs.push(loadTile(tx, ty).catch(() => null));
    if (jobs.length > 16) return null;
    return (await Promise.all(jobs)).flatMap((p) => (p ? p.obs : []));
  }

  // Streets for the visible map (night lights): up to 16 tiles.
  async function roadsIn([s, w, n, e]) {
    const jobs = [];
    for (let tx = lon2x(w); tx <= lon2x(e); tx++) for (let ty = lat2y(n); ty <= lat2y(s); ty++) jobs.push(loadTile(tx, ty).catch(() => null));
    if (jobs.length > 16) return null;
    return (await Promise.all(jobs)).flatMap((p) => (p ? p.roads : []));
  }

  return { plan, weather, isHot, parkingIn, buildingsIn, roadsIn };
})();
