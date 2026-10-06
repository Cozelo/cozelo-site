/* Cozelo Junctions motif.
   Fills every [data-motif="junctions"] element with an SVG field of square tiles. Each tile holds
   two quarter arcs joining its edge midpoints, so a line only continues where two tiles meet.

   Gold shapes are drawn on purpose, never picked at random. A shape is a set of tile corners
   ("vertices"); the tiles around it are oriented so that one continuous line closes around exactly
   that set, and that line is drawn in gold. Corners inside the shape that aren't part of it end up
   as small navy circles inside the gold outline. Everything else in the field is seeded at random
   by tile position, so the same page always draws the same field.

   Element attributes
     data-surface  white | shade | navy        (line colours for the background)
     data-seed     integer                     (random field)
     data-opts     JSON, see below
     data-opts-narrow  JSON merged over data-opts when the element is under 700px wide
     data-narrow-media media query that switches data-opts-narrow on instead of the 700px width rule
                       (for a field whose shape changes with the page layout, e.g. side panel to strip)
     data-span-from, data-span-to, data-span-x, data-span-gap   see place() below
     data-draw     load | scroll               (draw the gold line in once; only when the gold is one
                                                continuous line, and never under reduced motion)
     data-pop      with data-draw: draw the longest gold line, then pop the other gold shapes in
   data-opts
     tile    tile size in px (default 40)
     fluid   reference width in px: below it the tile shrinks in proportion, so the composition
             keeps its proportions in a narrower field (never grows above tile)
     fit     true: adjust the tile so whole tiles span the width (clean edges, no fade needed)
     rows    with fit: set the element's height to this many tiles
     anchor  left | right   which edge shape x-coordinates count from (default left)
     anchorY top | bottom   which edge shape y-coordinates count from (default top)
     thin, thick   stroke widths as a share of the tile (navy lines, gold lines)
     shapes  list of gold shapes in tile units, measured from the anchored edges:
       {type:'rect', x, y, w|x2, h, holes} every corner of one parity in the box (a pillar, a slab);
                                       holes:n turns n of the circles inside it gold
       {type:'blob', x, y, n, seed}    n corners grown outward one at a time from (x, y) (organic)
       {type:'dot', x, y}              a single corner: a small gold circle
       {type:'chain', points:[[x,y],…]} corners stepping diagonally through the points (a ribbon)
     Negative x or y count from the opposite edge.
*/
(function () {
  'use strict';
  var C = { navy: '#1b2f4b', navy3: '#6f82a0', navy4: '#b9c3d2', navy5: '#dde2ea',
    gold: '#c9a245', gold2: '#dcbf72', gold3: '#e6d29a', goldInk: '#7a6228' };
  var SURF = {
    white: { line: C.navy4, gold: [C.gold3, C.gold, C.goldInk] },
    shade: { line: '#b3bdcc', gold: [C.gold3, C.gold, C.goldInk] },
    navy: { line: '#3b5780', gold: [C.goldInk, C.gold, C.gold2] }
  };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var uid = 0;

  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function cellRand(seed, a, b) { return rng(((seed | 0) * 73856093) ^ (a * 19349663) ^ (b * 83492791))(); }
  function f1(v) { return Math.round(v * 10) / 10; }

  /* Build the set of gold corners from the shape list, in absolute corner coordinates.
     Coordinates: whole numbers are tiles from the anchored edge; negatives count from the far edge;
     values strictly between -1 and 1 (other than 0) are a share of the field (0.25 = a quarter across);
     [share, tiles] is a share plus an offset ([0.25, -2] = two tiles before the quarter mark).
     Connected shapes must share a corner parity, so every shape after the first is nudged one tile
     across if needed; dots are left alone so they can sit in a shape's holes. */
  function corners(shapes, cols, rows, o) {
    var set = {}, P = null;
    function cv(v, n) { if (Array.isArray(v)) return Math.round(v[0] * n) + v[1]; if (v !== 0 && v > -1 && v < 1) v = Math.round(v * n); else if (v < 0) v = n + v; return v; }
    function X(x) { x = cv(x, cols); return o.anchor === 'right' ? cols - x : x; }
    function Y(y) { y = cv(y, rows); return o.anchorY === 'bottom' ? rows - y : y; }
    function add(i, j) { if (i >= 0 && j >= 0 && i <= cols && j <= rows) set[i + ',' + j] = 1; }
    function snap(i, j) { var q = (i + j) & 1; if (P === null) P = q; return q === P ? i : i + 1; }
    (shapes || []).forEach(function (sh) {
      if (sh.type === 'dot') { add(X(sh.x), Y(sh.y)); return; }
      if (sh.type === 'rect') {
        var ax = X(sh.x), ay = Y(sh.y), bx = X(sh.x) + (o.anchor === 'right' ? -sh.w : sh.w), by = Y(sh.y) + (o.anchorY === 'bottom' ? -sh.h : sh.h);
        if (sh.w > -1 && sh.w < 1 && sh.w) { bx = X(sh.x + 0) + Math.round(sh.w * cols) * (o.anchor === 'right' ? -1 : 1); }
        if (sh.x2 != null) bx = X(sh.x2);
        var nx = snap(ax, ay) - ax; ax += nx; bx += nx;
        var i0 = Math.min(ax, bx), i1 = Math.max(ax, bx), j0 = Math.min(ay, by), j1 = Math.max(ay, by), p = (ax + ay) & 1;
        for (var i = i0; i <= i1; i++) for (var j = j0; j <= j1; j++) if (((i + j) & 1) === p) add(i, j);
        if (sh.holes) {
          /* gold circles inside the outline: corners of the other parity on the middle row, evenly spaced */
          var jm = Math.round((j0 + j1) / 2), cand = [];
          for (var i2 = i0 + 1; i2 < i1; i2++) if (((i2 + jm) & 1) !== p) cand.push(i2);
          for (var k = 0; k < sh.holes && cand.length; k++) {
            var idx = sh.holes === 1 ? Math.floor(cand.length / 2) : Math.round(k * (cand.length - 1) / (sh.holes - 1));
            add(cand[idx], jm);
          }
        }
        return;
      }
      if (sh.type === 'blob') {
        var bx0 = X(sh.x), by0 = Y(sh.y); bx0 = snap(bx0, by0);
        var r = rng(sh.seed || 1), pts = [[bx0, by0]], have = {}, want = sh.n || 10, tries = 0;
        have[pts[0][0] + ',' + pts[0][1]] = 1;
        /* Growth can stall (a start outside a short field has no room to grow), so cap the attempts. */
        while (pts.length < want && tries++ < want * 50) {
          var b = pts[Math.floor(r() * pts.length)], d = [[1, 1], [1, -1], [-1, 1], [-1, -1]][Math.floor(r() * 4)];
          var q = [b[0] + d[0], b[1] + d[1]], kk = q[0] + ',' + q[1];
          if (!have[kk] && q[0] > 0 && q[1] > 0 && q[0] < cols && q[1] < rows) { have[kk] = 1; pts.push(q); }
        }
        pts.forEach(function (pt) { add(pt[0], pt[1]); });
        return;
      }
      if (sh.type === 'chain') {
        var Pt = sh.points.map(function (pt) { return [X(pt[0]), Y(pt[1])]; });
        Pt[0][0] = snap(Pt[0][0], Pt[0][1]);
        var cur = Pt[0].slice(); add(cur[0], cur[1]);
        for (var n = 1; n < Pt.length; n++) {
          var t = Pt[n], alt = 1, guard = 0;
          if (((t[0] + t[1]) & 1) !== ((cur[0] + cur[1]) & 1)) t = [t[0] + 1, t[1]];
          while ((cur[0] !== t[0] || cur[1] !== t[1]) && guard++ < 800) {
            var dx = t[0] - cur[0], dy = t[1] - cur[1];
            var sx = dx ? (dx > 0 ? 1 : -1) : (alt = -alt), sy = dy ? (dy > 0 ? 1 : -1) : (alt = -alt);
            cur = [cur[0] + sx, cur[1] + sy]; add(cur[0], cur[1]);
          }
        }
      }
    });
    return set;
  }

  function junctions(w, h, S, o) {
    /* fit: stretch the tile so a whole number of tiles spans the width, giving clean edges. */
    var s = o.tile || 40;
    if (o.fluid && w < o.fluid) s = s * w / o.fluid;
    if (o.fit) s = w / Math.max(1, Math.round(w / s));
    var cols = Math.round(w / s) === w / s ? w / s : Math.ceil(w / s), rows = Math.ceil(h / s - 0.001), seed = o.seed || 1;
    var G = corners(o.shapes, cols, rows, o), arcs = [];
    function inG(i, j) { return G[i + ',' + j] === 1; }
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      /* flip: arcs round the top-left and bottom-right corners (the band joins TR and BL). */
      var tl = inG(c, r), tr = inG(c + 1, r), bl = inG(c, r + 1), br = inG(c + 1, r + 1), flip;
      if (tl && br) flip = false;
      else if (tr && bl) flip = true;
      else if (tl || br) flip = true;
      else if (tr || bl) flip = false;
      else {
        var cc = o.anchor === 'right' ? cols - 1 - c : c, rr = o.anchorY === 'bottom' ? rows - 1 - r : r;
        flip = cellRand(seed, rr, cc) < 0.5;
      }
      var x = c * s, y = r * s, m = s / 2;
      var T = [x + m, y], B = [x + m, y + s], L = [x, y + m], R = [x + s, y + m];
      if (flip) { arcs.push({ a: T, b: L, ce: [c, r] }); arcs.push({ a: B, b: R, ce: [c + 1, r + 1] }); }
      else { arcs.push({ a: T, b: R, ce: [c + 1, r] }); arcs.push({ a: B, b: L, ce: [c, r + 1] }); }
    }
    var rad = s / 2, quiet = '', goldArcs = [];
    function sweep(a, b, ce) { var cx = ce[0] * s, cy = ce[1] * s;
      return ((a[0] - cx) * (b[1] - cy) - (a[1] - cy) * (b[0] - cx)) > 0 ? 1 : 0; }
    /* A gold line is every line that passes round a gold corner. Lines are found by joining arcs
       that share an end point; holes inside a shape stay navy because they never touch a gold corner. */
    var par = {}, pk = function (p) { return Math.round(p[0] * 2) + ',' + Math.round(p[1] * 2); };
    function find(a) { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; }
    arcs.forEach(function (k) { var a = pk(k.a), b = pk(k.b); if (par[a] == null) par[a] = a; if (par[b] == null) par[b] = b; par[find(a)] = find(b); });
    var goldRoot = {};
    arcs.forEach(function (k) { if (inG(k.ce[0], k.ce[1])) goldRoot[find(pk(k.a))] = 1; });
    arcs.forEach(function (k) {
      if (goldRoot[find(pk(k.a))]) { goldArcs.push(k); return; }
      quiet += 'M' + f1(k.a[0]) + ' ' + f1(k.a[1]) + 'A' + rad + ' ' + rad + ' 0 0 ' + sweep(k.a, k.b, k.ce) + ' ' + f1(k.b[0]) + ' ' + f1(k.b[1]);
    });

    /* Trace gold arcs end to end into continuous lines, so each can be drawn in one stroke. */
    var key = function (p) { return Math.round(p[0] * 2) + ',' + Math.round(p[1] * 2); };
    var at = {};
    goldArcs.forEach(function (k, i) { [k.a, k.b].forEach(function (p) { (at[key(p)] = at[key(p)] || []).push(i); }); });
    var used = [], lines = [];
    for (var i0 = 0; i0 < goldArcs.length; i0++) {
      if (used[i0]) continue;
      /* start from an open end if this line has one */
      var start = i0, startPt = goldArcs[i0].a;
      var walk = function (i, from) { var seen = {}, cur = i, pt = from;
        while (true) { seen[cur] = 1; var k = goldArcs[cur], nxt = key(k.a) === key(pt) ? k.b : k.a;
          var cand = (at[key(nxt)] || []).filter(function (j) { return j !== cur && !seen[j]; });
          if (!cand.length) return { i: cur, end: nxt }; cur = cand[0]; pt = nxt; } };
      var e = walk(i0, goldArcs[i0].a);
      if ((at[key(e.end)] || []).length === 1) { start = e.i; startPt = e.end; }
      var d = 'M' + f1(startPt[0]) + ' ' + f1(startPt[1]), cur = start, pt = startPt, closed = false;
      while (cur != null && !used[cur]) {
        used[cur] = 1;
        var k = goldArcs[cur], fwd = key(k.a) === key(pt), to = fwd ? k.b : k.a;
        d += 'A' + rad + ' ' + rad + ' 0 0 ' + sweep(pt, to, k.ce) + ' ' + f1(to[0]) + ' ' + f1(to[1]);
        var nx = (at[key(to)] || []).filter(function (j) { return j !== cur; });
        pt = to; cur = nx.length ? nx[0] : null;
        if (cur != null && used[cur]) closed = true;
      }
      lines.push({ d: closed ? d + 'Z' : d, n: (d.match(/A/g) || []).length });
    }
    var gid = 'jg' + (++uid), sw = f1(s * (o.thick || 0.13));
    /* The longest gold line is the main one (it can draw itself in); the rest are secondary
       (circles), which can pop in once the main line has finished. */
    lines.sort(function (a, b) { return b.n - a.n; });
    var gold = lines.map(function (ln, i) {
      return '<path class="m-gold ' + (i ? 'm-pop" style="--i:' + (i - 1) : 'm-main"') + '" pathLength="1" d="' + ln.d + '" fill="none" stroke="url(#' + gid + ')" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"/>';
    }).join('');
    return { lines: lines.length, svg: '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + S.gold[0] +
      '"/><stop offset=".55" stop-color="' + S.gold[1] + '"/><stop offset="1" stop-color="' + S.gold[2] + '"/></linearGradient></defs>' +
      '<path d="' + quiet + '" fill="none" stroke="' + S.line + '" stroke-width="' + f1(s * (o.thin || 0.06)) + '" stroke-linecap="round"/>' + gold };
  }

  function opts(el, w) {
    var o = {};
    try { o = JSON.parse(el.getAttribute('data-opts') || '{}'); } catch (e) {}
    var nm = el.getAttribute('data-narrow-media');
    var narrow = nm && window.matchMedia ? window.matchMedia(nm).matches : w < 700;
    if (narrow && el.hasAttribute('data-opts-narrow')) {
      try { var n = JSON.parse(el.getAttribute('data-opts-narrow')); for (var k in n) o[k] = n[k]; } catch (e) {}
    }
    o.seed = +el.getAttribute('data-seed') || 1;
    return o;
  }

  /* Optional placement from page elements:
     data-span-from / data-span-to: selectors; the field runs from the bottom of the first to the
       top of the second (data-span-gap px left clear at each end).
     data-span-x: selector whose left and right edges the field takes (data-span-bleed="left" runs it
       out to the host's left edge). */
  function place(el) {
    var host = el.offsetParent; if (!host) return;
    var hb = host.getBoundingClientRect(), gap = +el.getAttribute('data-span-gap') || 0;
    var a = el.getAttribute('data-span-from') && document.querySelector(el.getAttribute('data-span-from'));
    var z = el.getAttribute('data-span-to') && document.querySelector(el.getAttribute('data-span-to'));
    var xr = el.getAttribute('data-span-x') && document.querySelector(el.getAttribute('data-span-x'));
    if (a && z) { var t = a.getBoundingClientRect().bottom - hb.top + gap, b = z.getBoundingClientRect().top - hb.top - gap;
      el.style.top = Math.round(t) + 'px'; el.style.height = Math.max(0, Math.round(b - t)) + 'px'; }
    if (xr) { var r = xr.getBoundingClientRect(), l = r.left - hb.left;
      /* data-span-bleed="left": run out to the host's left edge instead of stopping at the column */
      if (el.getAttribute('data-span-bleed') === 'left') { el.style.left = '0px'; el.style.width = Math.round(r.right - hb.left) + 'px'; }
      else { el.style.left = Math.round(l) + 'px'; el.style.width = Math.round(r.width) + 'px'; } }
  }

  function render(el) {
    place(el);
    var o0 = opts(el, el.clientWidth);
    if (o0.fit && o0.rows) { var ft = el.clientWidth / Math.max(1, Math.round(el.clientWidth / (o0.tile || 40))); el.style.height = Math.round(ft * o0.rows) + 'px'; }
    var w = Math.round(el.clientWidth), h = Math.round(el.clientHeight);
    if (!w || !h || (el._w === w && el._h === h)) return;
    el._w = w; el._h = h;
    var out = junctions(w, h, SURF[el.getAttribute('data-surface') || 'white'], opts(el, w));
    el.innerHTML = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true" focusable="false">' + out.svg + '</svg>';
    var mode = el.getAttribute('data-draw');
    if (mode && !el._drawn && !reduce && (out.lines === 1 || el.hasAttribute('data-pop'))) {
      if (mode === 'scroll' && 'IntersectionObserver' in window) {
        el.classList.add('jx--await');
        if (!el._io) {
          el._io = new IntersectionObserver(function (es) {
            es.forEach(function (en) { if (en.isIntersecting) { el._io.disconnect(); draw(el); } });
          }, { threshold: 0.45 });
          el._io.observe(el);
        }
      } else draw(el);
    }
  }
  function draw(el) {
    el._drawn = true; el.classList.remove('jx--await'); el.classList.add('jx--draw');
    setTimeout(function () { el.classList.remove('jx--draw'); }, 4400);
  }

  var els = [].slice.call(document.querySelectorAll('[data-motif="junctions"]'));
  els.forEach(render);
  /* Spanned fields depend on other elements' positions: re-place them after fonts load and on resize. */
  var spanned = els.filter(function (el) { return el.hasAttribute('data-span-to') || el.hasAttribute('data-span-x'); });
  function replace() { spanned.forEach(render); }
  if (spanned.length) {
    window.addEventListener('resize', replace);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(replace);
    window.addEventListener('load', replace);
  }
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function (en) { en.forEach(function (e) { render(e.target); }); });
    els.forEach(function (el) { ro.observe(el); });
  }
})();
