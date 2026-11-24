/* ESP. Actu Lyon — moteur de l'écran TV
   - lit data/content.json (toutes les 5 min) et data/flash.json (toutes les 30 s)
   - applique lui-même les dates de publication / d'expiration et l'horaire des flashs,
     donc un contenu programmé apparaît à l'heure même sans nouvelle publication
   - mode aperçu (?preview) : reçoit les données de l'outil interne par postMessage
   - ?date=AAAA-MM-JJ simule une autre date (vérifier une programmation) */
(() => {
'use strict';
const CFG = Object.assign({
  content: '../data/content.json', flash: '../data/flash.json',
  contentEveryMs: 300000, flashEveryMs: 30000, weatherEveryMs: 900000,
  slideSeconds: 12, galleryPhotoSeconds: 5, galleryVideoMaxSeconds: 90,
  lat: 45.7578, lon: 4.832, nightlyReloadHour: 4
}, window.TV_CONFIG || {});

const QS = new URLSearchParams(location.search);
const PREVIEW = QS.has('preview');
let simDate = QS.get('date') || '';

const $ = s => document.querySelector(s);
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/* ---------- Dates ---------- */
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
function now() {
  const n = new Date();
  if (!simDate) return n;
  const [y, m, d] = simDate.split('-').map(Number);
  return new Date(y, m - 1, d, n.getHours(), n.getMinutes(), n.getSeconds());
}
const today = () => iso(now());
const parseDay = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addDays = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return iso(d); };
const monday = s => { const d = parseDay(s); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return iso(d); };
const parseDT = s => { if (!s) return null; const t = new Date(String(s).length <= 10 ? s + 'T00:00:00' : s); return isNaN(t) ? null : t; };
const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const DAYS_L = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTHS_L = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const fmtDay = s => { const d = parseDay(s); return d.getDate() + ' ' + MONTHS[d.getMonth()]; };
function fmtRange(a, b) {
  if (!b || b === a) { const d = parseDay(a); return DAYS[d.getDay()] + ' ' + fmtDay(a); }
  const A = parseDay(a), B = parseDay(b);
  if (A.getMonth() === B.getMonth()) return A.getDate() + '–' + B.getDate() + ' ' + MONTHS[B.getMonth()];
  return fmtDay(a) + ' – ' + fmtDay(b);
}

/* ---------- Couleurs ---------- */
const PALETTE = { red: '#D20014', yellow: '#F0EB1E', lav: '#B494DC', ocre: '#B16800', ink: '#0E0E0E', paper: '#FBFAF6' };
function textOn(hex) {
  const h = String(hex || '').replace('#', ''); if (h.length !== 6) return PALETTE.ink;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255).map(c => c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4));
  const L = .2126 * r + .7152 * g + .0722 * b;
  return L > .3 ? PALETTE.ink : '#fff';
}
const TILE_CYCLE = [PALETTE.yellow, PALETTE.lav, PALETTE.paper, PALETTE.red, PALETTE.ink];

/* ---------- Données ---------- */
let DATA = { items: [], tempsForts: [], categories: [] };
let FLASHES = [];
let contentSig = '', contentURL = new URL(CFG.content, location.href).href;
const catOf = id => (DATA.categories || []).find(c => c.id === id) || { id, label: id || 'Info', color: PALETTE.yellow };
const resolve = src => { if (!src) return ''; try { return new URL(src, contentURL).href; } catch (_) { return src; } };

async function getJSON(url) {
  const u = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
  const r = await fetch(u, { cache: 'no-store' });
  if (!r.ok) throw new Error(r.status + ' ' + url);
  return r.json();
}
async function loadContent() {
  if (PREVIEW) return;
  try {
    const d = await getJSON(contentURL);
    const sig = d.generatedAt + ':' + JSON.stringify(d).length;
    if (sig !== contentSig) { contentSig = sig; DATA = d; pendingRebuild = true; if (!deck.length || deck[0].k === 'idle') rebuild(true); }
  } catch (e) { console.warn('Contenus indisponibles', e); }
}
async function loadFlash() {
  if (PREVIEW) { checkFlash(); return; }
  try { const d = await getJSON(new URL(CFG.flash, location.href).href); FLASHES = d.flashes || []; }
  catch (e) { console.warn('Flashs indisponibles', e); }
  checkFlash();
}

/* ---------- Sélection de ce qui passe à l'écran ---------- */
const PRIO = { 'urgente': 0, 'haute': 1, 'normale': 2, 'basse': 3 };
function liveItems() {
  const t = today();
  return (DATA.items || [])
    .filter(it => (!it.pub || it.pub <= t) && (!it.exp || it.exp >= t))
    .sort((a, b) => (num(a.order) - num(b.order)) || ((PRIO[norm(a.prio)] ?? 2) - (PRIO[norm(b.prio)] ?? 2)) || String(b.pub || '').localeCompare(String(a.pub || '')));
}
const num = v => { const n = parseFloat(v); return isNaN(n) ? 9999 : n; };

const SIGNS = [['Bélier', '♈'], ['Taureau', '♉'], ['Gémeaux', '♊'], ['Cancer', '♋'], ['Lion', '♌'], ['Vierge', '♍'], ['Balance', '♎'], ['Scorpion', '♏'], ['Sagittaire', '♐'], ['Capricorne', '♑'], ['Verseau', '♒'], ['Poissons', '♓']];
function horoParse(it) {
  const out = [];
  String(it.text || '').split(/\r?\n/).forEach(l => {
    const m = l.match(/^\s*([^:：]+?)\s*[:：]\s*(.+)$/); if (!m) return;
    const i = SIGNS.findIndex(s => norm(s[0]) === norm(m[1]));
    if (i >= 0) out[i] = { n: SIGNS[i][0], g: SIGNS[i][1], t: m[2].trim() };
  });
  const list = out.filter(Boolean);
  return list.length >= 6 ? list : null;
}
function tfBetween(from, to) {
  return (DATA.tempsForts || []).filter(t => t.start && (t.end || t.start) >= from && t.start <= to).sort((a, b) => a.start.localeCompare(b.start));
}

function buildDeck() {
  const all = liveItems();
  const isHoro = it => norm(it.cat) === 'horoscope' && horoParse(it);
  const horo = all.find(isHoro);
  const its = all.filter(it => !isHoro(it) && norm(it.cat) !== 'horoscope');
  const out = []; let buf = [];
  const flush = () => { while (buf.length) { const g = buf.splice(0, 3); out.push(g.length === 1 ? { k: 'one', it: g[0] } : g.length === 2 ? { k: 'duo', its: g } : { k: 'multi', its: g }); } };
  its.forEach(it => {
    const fmt = norm(it.format);
    if ((it.gallery || []).length) { flush(); out.push({ k: 'gal', it }); return; }
    if (fmt === 'plein' && it.image) { flush(); out.push({ k: 'full', it }); return; }
    if (fmt === 'seule' || (fmt !== 'groupe' && ['urgente', 'haute'].includes(norm(it.prio)))) { flush(); out.push({ k: 'one', it }); return; }
    buf.push(it);
  });
  flush();

  // Agenda de la semaine : événements datés de la semaine en cours (sinon les prochains)
  const t = today(), mon = monday(t), sun = addDays(mon, 6);
  const dated = its.filter(i => (i.evt || (norm(i.cat) === 'evenements' && i.pub))).map(i => ({ it: i, d: i.evt || i.pub }));
  let week = dated.filter(x => x.d >= t && x.d <= sun);
  let agTitle = 'Cette semaine';
  if (!week.length) { week = dated.filter(x => x.d >= t && x.d <= addDays(t, 30)); agTitle = 'À venir'; }
  week.sort((a, b) => a.d.localeCompare(b.d));
  if (week.length) out.splice(Math.min(2, out.length), 0, { k: 'agenda', title: agTitle, ev: week.slice(0, 4) });

  // Temps forts du calendrier : trois prochaines semaines
  const soon = tfBetween(t, addDays(t, 21)).slice(0, 4);
  if (soon.length) out.splice(Math.min(4, out.length), 0, { k: 'tf', tfs: soon });

  if (horo) out.push({ k: 'horo', it: horo, signs: horoParse(horo), tfs: tfBetween(mon, sun).slice(0, 3) });
  if (!out.length) out.push({ k: 'idle' });
  return out;
}

/* ---------- Médias, QR ---------- */
function pic(it, cls, color, src) {
  src = resolve(src || it.image);
  const acc = color || catOf(it.cat).color;
  const duo = it.filter !== false && !!src;
  const fit = !!it.fit && !!src;
  let inner;
  if (!src) inner = illustration(it, acc);
  else if (fit) inner = `<img class="blur" src="${esc(src)}" alt=""><img class="main" src="${esc(src)}" alt="">`;
  else inner = `<img src="${esc(src)}" alt="">`;
  return `<div class="pic ${cls || ''} ${duo ? 'duo' : ''} ${fit ? 'fit' : ''}" style="--acc:${esc(acc)}">${inner}</div>`;
}
function illustration(it, acc) {
  // Visuel généré quand il n'y a pas de photo : formes géométriques de la charte
  let h = 0; for (const c of String(it.id || it.title)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const fg = textOn(acc) === '#fff' ? PALETTE.paper : PALETTE.ink;
  const v = h % 3, x = 120 + (h % 260), y = 100 + ((h >> 5) % 200);
  const shapes = [
    `<circle cx="${x + 200}" cy="${y + 120}" r="260" fill="${fg}" opacity=".9"/><rect x="-40" y="${y + 260}" width="520" height="520" rx="60" fill="${PALETTE.paper}" opacity=".35" transform="rotate(-12 200 600)"/>`,
    `<rect x="${x}" y="${y}" width="520" height="520" rx="260" fill="none" stroke="${fg}" stroke-width="70"/><circle cx="${x + 520}" cy="${y + 560}" r="130" fill="${fg}"/>`,
    `<path d="M-50 ${y + 500} Q ${x + 300} ${y - 150} 1000 ${y + 300}" stroke="${fg}" stroke-width="90" fill="none" stroke-linecap="round"/><circle cx="${x + 120}" cy="${y + 80}" r="90" fill="${fg}"/>`
  ];
  return `<svg class="ill" viewBox="0 0 900 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="900" height="900" fill="${esc(acc)}"/>${shapes[v]}</svg>`;
}
function qr(it, small) {
  if (!it.qr || !it.link || typeof qrcode !== 'function') return '';
  try {
    const q = qrcode(0, 'M'); q.addData(it.link); q.make();
    const n = q.getModuleCount(); let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    const svg = `<svg viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges" aria-hidden="true"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#0E0E0E"/></svg>`;
    return `<div class="qr ${small ? 'sm' : ''}">${svg}<span>${esc(it.qrLabel || 'Scanner pour en savoir plus')}</span></div>`;
  } catch (e) { return ''; }
}
const lead = it => it.chapo || it.resume || '';
const tag = it => `<span class="tag">${esc(catOf(it.cat).label)}</span>`;
const fitTitle = (s, sizes) => { const L = String(s || '').length; return sizes.find(([max]) => L <= max)?.[1] || sizes[sizes.length - 1][1]; };

/* ---------- Gabarits ---------- */
function vOne(s, i) {
  const it = s.it, bg = TILE_CYCLE[i % 3], fg = textOn(bg);
  const fs = fitTitle(it.title, [[28, 120], [48, 100], [70, 84], [999, 70]]);
  return `<div class="bento one">
    <div class="tile big" style="background:${bg};color:${fg}">
      ${tag(it)}
      <div class="mid"><h2 style="font-size:${fs}px">${esc(it.title)}</h2>${lead(it) ? `<p>${esc(lead(it))}</p>` : ''}</div>
      <div class="foot"><span class="kick">${it.evt ? esc(fmtRange(it.evt)) : 'ESP Lyon'}</span>${qr(it, true)}</div>
    </div>
    ${pic(it, 'tile')}
  </div>`;
}
function vDuo(s, i) {
  return `<div class="bento duo2">${s.its.map((it, k) => {
    const bg = TILE_CYCLE[(i + k) % 3], fg = textOn(bg);
    return `<div class="tile" style="background:${bg};color:${fg}">${pic(it)}<div class="txt">${qr(it, true)}${tag(it)}<h3 style="font-size:${fitTitle(it.title, [[30, 68], [55, 56], [999, 46]])}px">${esc(it.title)}</h3>${lead(it) ? `<p>${esc(lead(it))}</p>` : ''}</div></div>`;
  }).join('')}</div>`;
}
function vMulti(s, i) {
  const [a, ...rest] = s.its, bg = TILE_CYCLE[i % 3];
  return `<div class="bento multi">
    <div class="tile hero" style="background:${bg};color:${textOn(bg)}">${pic(a)}<div class="txt">${tag(a)}<h3 style="font-size:${fitTitle(a.title, [[30, 72], [55, 60], [999, 50]])}px">${esc(a.title)}</h3>${lead(a) ? `<p>${esc(lead(a))}</p>` : ''}</div></div>
    <div class="col">${rest.map((it, k) => {
      const b = TILE_CYCLE[(i + k + 1) % 3];
      return `<div class="tile row" style="background:${b};color:${textOn(b)}">${pic(it)}<div class="txt">${tag(it)}<h3 style="font-size:${fitTitle(it.title, [[30, 52], [55, 44], [999, 38]])}px">${esc(it.title)}</h3>${lead(it) ? `<p>${esc(lead(it))}</p>` : ''}</div>${qr(it, true)}</div>`;
    }).join('')}</div>
  </div>`;
}
function vFull(s) {
  const it = s.it;
  return `<div class="bento full">${pic(it)}
    <div class="tile card">${tag(it)}<h2 style="font-size:${fitTitle(it.title, [[30, 88], [60, 72], [999, 60]])}px">${esc(it.title)}</h2>${lead(it) ? `<p>${esc(lead(it))}</p>` : ''}</div>
    ${qr(it)}</div>`;
}
function vGal(s) {
  const it = s.it, g = it.gallery, acc = catOf(it.cat).color;
  const media = g.map((m, k) => {
    const src = resolve(m.src);
    const el = m.type === 'video'
      ? `<video class="main" src="${esc(src)}" muted playsinline preload="auto"></video>`
      : (it.fit ? `<img class="blur" src="${esc(src)}" alt=""><img class="main" src="${esc(src)}" alt="">` : `<img src="${esc(src)}" alt="">`);
    return `<div class="gm pic ${it.fit ? 'fit' : ''}" data-k="${k}" style="--acc:${esc(acc)}">${el}</div>`;
  }).join('');
  return `<div class="bento gal">
    <div class="tile media">${media}<div class="gcap"></div><div class="gdots">${g.map(() => '<i></i>').join('')}</div></div>
    <div class="tile side" style="background:${PALETTE.yellow}">${tag(it)}<h2 style="font-size:${fitTitle(it.title, [[24, 80], [45, 64], [999, 52]])}px">${esc(it.title)}</h2>${lead(it) ? `<p>${esc(lead(it))}</p>` : ''}${qr(it, true)}<span class="gcount"></span></div>
  </div>`;
}
function vAgenda(s) {
  const n = s.ev.length;
  const colors = [PALETTE.red, PALETTE.yellow, PALETTE.lav, PALETTE.ink];
  return `<div class="bento ag">
    <div class="tile head" style="background:${PALETTE.red};color:#fff"><span class="tag">Agenda</span><h2>${esc(s.title)}</h2><span class="kick">ESP Lyon</span></div>
    <div class="evgrid n${n}">${s.ev.map((x, k) => {
      const d = parseDay(x.d), c = colors[k % 4];
      return `<div class="tile ev"><div class="evd" style="background:${c};color:${textOn(c)}"><small>${DAYS[d.getDay()]}</small><b>${d.getDate()}</b><small>${MONTHS[d.getMonth()]}</small></div>
        <div class="evt"><h3>${esc(x.it.title)}</h3>${lead(x.it) ? `<p>${esc(lead(x.it))}</p>` : ''}</div>${qr(x.it, true)}</div>`;
    }).join('')}</div>
  </div>`;
}
const TF_COLORS = { rouge: PALETTE.red, jaune: PALETTE.yellow, lavande: PALETTE.lav, ocre: PALETTE.ocre, encre: PALETTE.ink };
const tfColor = c => TF_COLORS[norm(c)] || (String(c).startsWith('#') ? c : PALETTE.red);
function tfWhen(t) {
  const td = today();
  if (t.start <= td && (t.end || t.start) >= td) return 'En ce moment';
  const days = Math.round((parseDay(t.start) - parseDay(td)) / 864e5);
  if (days === 1) return 'Demain';
  if (days < 7) return 'Dans ' + days + ' jours';
  return 'Dans ' + Math.round(days / 7) + ' sem.';
}
const tfTile = t => { const c = tfColor(t.color); return `<div class="tile tf" style="background:${c};color:${textOn(c)}"><span class="when">${tfWhen(t)}</span><h3 style="font-size:${fitTitle(t.title, [[20, 80], [40, 64], [999, 52]])}px">${esc(t.title)}</h3><span class="rg">${esc(fmtRange(t.start, t.end))}</span></div>`; };
function vTf(s) {
  return `<div class="bento tfs">
    <div class="tile head" style="background:${PALETTE.ink};color:${PALETTE.paper}"><span class="tag">Calendrier</span><h2>Temps forts</h2><span class="kick">Les 3 prochaines semaines</span></div>
    <div class="tfgrid n${s.tfs.length}">${s.tfs.map(tfTile).join('')}</div>
  </div>`;
}
function vHoro(s) {
  const mon = monday(today());
  const signs = s.signs.map(x => `<div class="sg"><i>${x.g}</i><div><b>${esc(x.n)}</b><span>${esc(x.t)}</span></div></div>`).join('');
  const tfs = s.tfs.length ? `<div class="tfcol"><div class="tile head" style="background:${PALETTE.ink};color:${PALETTE.paper}"><span class="tag">Cette semaine</span><h2>Temps forts</h2></div>${s.tfs.slice(0, 2).map(tfTile).join('')}</div>` : '';
  return `<div class="bento horo ${tfs ? 'withtf' : ''}">
    <div class="tile hh" style="background:${PALETTE.lav}"><div class="hhead"><span class="tag">Horoscope</span><h2>Semaine du ${esc(fmtRange(mon, addDays(mon, 6)))}</h2></div><div class="signs">${signs}</div></div>
    ${tfs}
  </div>`;
}
function vIdle() {
  const n = now();
  return `<div class="bento idle"><div class="tile"><span class="tag">ESP Lyon</span><h2>Bonne journée</h2><p>${DAYS_L[n.getDay()]} ${n.getDate()} ${MONTHS_L[n.getMonth()]}</p></div></div>`;
}
const VIEWS = { one: vOne, duo: vDuo, multi: vMulti, full: vFull, gal: vGal, agenda: vAgenda, tf: vTf, horo: vHoro, idle: vIdle };

/* ---------- Défilement ---------- */
let deck = [], idx = -1, timer = null, paused = false, pendingRebuild = false, front = 'A', galStop = null;
let slidesSinceFlash = {};
function rebuild(restart) {
  deck = buildDeck(); pendingRebuild = false;
  if (restart) { idx = -1; next(); }
}
function durationOf(s) {
  if (s.k === 'gal') return null; // la galerie avance seule
  if (s.k === 'horo') return CFG.slideSeconds * 1.6;
  if (s.k === 'multi' || s.k === 'agenda') return CFG.slideSeconds * 1.25;
  return CFG.slideSeconds;
}
function renderProg(dur) {
  const n = Math.min(deck.length, 16);
  const cur = idx % n;
  $('#prog').innerHTML = deck.length > 1 ? Array.from({ length: n }, (_, k) => `<i class="${k < cur ? 'done' : k === cur ? 'cur' : ''}" style="--dur:${dur}s"></i>`).join('') : '';
}
function show(i) {
  clearTimeout(timer); if (galStop) { galStop(); galStop = null; }
  if (!deck.length) deck = buildDeck();
  idx = (i + deck.length) % deck.length;
  const s = deck[idx];
  const el = front === 'A' ? $('#slideB') : $('#slideA'), old = front === 'A' ? $('#slideA') : $('#slideB');
  front = front === 'A' ? 'B' : 'A';
  el.innerHTML = (VIEWS[s.k] || vIdle)(s, idx);
  void el.offsetWidth; // force le calcul pour que le fondu s'applique
  el.classList.add('in'); old.classList.remove('in');
  setTimeout(() => { if (!old.classList.contains('in')) { old.querySelectorAll('video').forEach(v => v.pause()); old.innerHTML = ''; } }, 900);
  const dur = durationOf(s);
  if (s.k === 'gal') { const est = s.it.gallery.reduce((a, m) => a + (m.type === 'video' ? 20 : CFG.galleryPhotoSeconds), 0); renderProg(est); galStop = runGallery(el, s.it); }
  else { renderProg(dur); if (!paused) timer = setTimeout(next, dur * 1000); }
}
function next() {
  // Un flash actif passe en priorité entre deux écrans
  if (maybeFlash()) return;
  if (pendingRebuild || idx + 1 >= deck.length) { const keep = idx + 1 >= deck.length ? -1 : idx; deck = buildDeck(); pendingRebuild = false; idx = keep; }
  show(idx + 1);
}
function prev() { show(idx - 1); }

function runGallery(el, it) {
  const items = [...el.querySelectorAll('.gm')], dots = [...el.querySelectorAll('.gdots i')];
  const cap = el.querySelector('.gcap'), count = el.querySelector('.gcount');
  let k = -1, t = null, stopped = false;
  const step = () => {
    if (stopped) return;
    if (k >= 0) { items[k].classList.remove('on'); dots[k].classList.remove('on'); const v = items[k].querySelector('video'); if (v) v.pause(); }
    k++;
    if (k >= items.length) { if (!paused) next(); return; }
    items[k].classList.add('on'); dots[k].classList.add('on');
    cap.textContent = it.gallery[k].caption || '';
    count.textContent = (k + 1) + ' / ' + items.length;
    const v = items[k].querySelector('video');
    if (v) {
      v.currentTime = 0; const p = v.play(); if (p && p.catch) p.catch(() => {});
      const cap2 = setTimeout(step, CFG.galleryVideoMaxSeconds * 1000);
      v.onended = () => { clearTimeout(cap2); step(); };
      v.onerror = () => { clearTimeout(cap2); step(); };
      t = cap2;
    } else t = setTimeout(step, CFG.galleryPhotoSeconds * 1000);
  };
  step();
  return () => { stopped = true; clearTimeout(t); items.forEach(i => { const v = i.querySelector('video'); if (v) { v.onended = null; v.pause(); } }); };
}

/* ---------- Flash Info ---------- */
const LVL = { urgent: 0, important: 1, info: 2 };
const REPEAT_EVERY = { 0: 1, 1: 3, 2: 5 }; // nombre d'écrans entre deux passages selon l'urgence
let flashOn = null, shownOnce = {};
function activeFlashes() {
  const n = now();
  return FLASHES.filter(f => {
    const a = parseDT(f.start), b = parseDT(f.end);
    return (!a || a <= n) && (!b || b > n);
  }).sort((x, y) => (LVL[norm(x.level)] ?? 2) - (LVL[norm(y.level)] ?? 2) || String(y.start).localeCompare(String(x.start)));
}
function checkFlash() {
  // Un nouveau flash (jamais montré) interrompt immédiatement la boucle
  if (flashOn) return;
  const f = activeFlashes().find(x => !shownOnce[x.id]);
  if (f) showFlash(f);
}
function maybeFlash() {
  if (flashOn) return true;
  const list = activeFlashes();
  for (const f of list) {
    const lv = LVL[norm(f.level)] ?? 2;
    slidesSinceFlash[f.id] = (slidesSinceFlash[f.id] || 0) + 1;
    if (!shownOnce[f.id] || slidesSinceFlash[f.id] >= REPEAT_EVERY[lv]) { showFlash(f); return true; }
  }
  return false;
}
function showFlash(f) {
  clearTimeout(timer); if (galStop) { galStop(); galStop = null; }
  flashOn = f; shownOnce[f.id] = true; slidesSinceFlash[f.id] = 0;
  const lv = norm(f.level), cls = lv === 'urgent' ? '' : lv === 'important' ? 'imp' : 'info';
  const dur = Math.max(5, parseInt(f.duration, 10) || 30);
  const el = $('#flash');
  el.className = 'flash on ' + cls;
  el.style.setProperty('--dur', dur + 's');
  el.innerHTML = `<div class="stripe t"></div><div class="lab"><i></i>Flash info${lv === 'urgent' ? ' · Urgent' : lv === 'important' ? ' · Important' : ''}</div>
    <h2 style="font-size:${fitTitle(f.title, [[18, 190], [30, 150], [999, 120]])}px">${esc(f.title)}</h2>${f.message ? `<p>${esc(f.message)}</p>` : ''}<div class="fbar"></div><div class="stripe b"></div>`;
  setTimeout(() => { el.className = 'flash'; el.innerHTML = ''; flashOn = null; show(idx + 1); }, dur * 1000);
}

/* ---------- Horloge, météo ---------- */
function tick() {
  const n = now();
  $('#time').textContent = pad(n.getHours()) + ':' + pad(n.getMinutes());
  $('#date').textContent = DAYS_L[n.getDay()] + ' ' + n.getDate() + ' ' + MONTHS_L[n.getMonth()];
  if (!PREVIEW && n.getHours() === CFG.nightlyReloadHour && n.getMinutes() === 0 && performance.now() > 3600e3) location.reload();
}
const WX = {
  sun: '<circle cx="24" cy="24" r="9" fill="#F0EB1E" stroke="#0E0E0E" stroke-width="3"/><g stroke="#0E0E0E" stroke-width="3" stroke-linecap="round"><path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M10 38l4-4M34 14l4-4"/></g>',
  part: '<circle cx="18" cy="18" r="8" fill="#F0EB1E" stroke="#0E0E0E" stroke-width="3"/><path d="M14 38h22a8 8 0 0 0 0-16 11 11 0 0 0-21 3 7 7 0 0 0-1 13z" fill="#FBFAF6" stroke="#0E0E0E" stroke-width="3" stroke-linejoin="round"/>',
  cloud: '<path d="M12 36h24a9 9 0 0 0 0-18 12 12 0 0 0-23 3 8 8 0 0 0-1 15z" fill="#FBFAF6" stroke="#0E0E0E" stroke-width="3" stroke-linejoin="round"/>',
  fog: '<g stroke="#0E0E0E" stroke-width="3" stroke-linecap="round"><path d="M8 18h32M6 26h36M10 34h28"/></g>',
  rain: '<path d="M12 28h24a8 8 0 0 0 0-16 11 11 0 0 0-21 3 7 7 0 0 0-3 13z" fill="#FBFAF6" stroke="#0E0E0E" stroke-width="3" stroke-linejoin="round"/><g stroke="#D20014" stroke-width="3" stroke-linecap="round"><path d="M16 34l-2 6M24 34l-2 6M32 34l-2 6"/></g>',
  snow: '<path d="M12 28h24a8 8 0 0 0 0-16 11 11 0 0 0-21 3 7 7 0 0 0-3 13z" fill="#FBFAF6" stroke="#0E0E0E" stroke-width="3" stroke-linejoin="round"/><g fill="#B494DC" stroke="#0E0E0E" stroke-width="1.5"><circle cx="16" cy="37" r="3"/><circle cx="24" cy="41" r="3"/><circle cx="32" cy="37" r="3"/></g>',
  storm: '<path d="M12 26h24a8 8 0 0 0 0-16 11 11 0 0 0-21 3 7 7 0 0 0-3 13z" fill="#FBFAF6" stroke="#0E0E0E" stroke-width="3" stroke-linejoin="round"/><path d="M25 28l-6 9h6l-3 8 9-12h-6l3-5z" fill="#F0EB1E" stroke="#0E0E0E" stroke-width="2" stroke-linejoin="round"/>'
};
const wxKind = c => c === 0 ? 'sun' : (c === 1 || c === 2) ? 'part' : c === 3 ? 'cloud' : (c === 45 || c === 48) ? 'fog' : ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) ? 'rain' : ((c >= 71 && c <= 77) || c === 85 || c === 86) ? 'snow' : c >= 95 ? 'storm' : 'cloud';
async function loadWeather() {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${CFG.lat}&longitude=${CFG.lon}&current=temperature_2m,weather_code&timezone=Europe%2FParis`);
    const d = await r.json(), c = d.current;
    $('#wx').innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true">${WX[wxKind(c.weather_code)]}</svg><span>${Math.round(c.temperature_2m)}°</span>`;
  } catch (e) { /* météo facultative */ }
}

/* ---------- Mise à l'échelle 1920×1080, commandes ---------- */
function fit() {
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  const st = $('#stage');
  st.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px,${(innerHeight - 1080 * s) / 2}px) scale(${s})`;
}
let mouseT;
addEventListener('mousemove', () => { document.body.classList.add('mouse'); clearTimeout(mouseT); mouseT = setTimeout(() => document.body.classList.remove('mouse'), 2500); });
$('#ctl').addEventListener('click', e => {
  const a = e.target.closest('button')?.dataset.a; if (!a) return;
  if (a === 'next') next();
  if (a === 'prev') prev();
  if (a === 'pause') { paused = !paused; document.body.classList.toggle('paused', paused); e.target.textContent = paused ? 'Reprendre' : 'Pause'; if (!paused) show(idx); else clearTimeout(timer); }
  if (a === 'fs') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }
});
addEventListener('keydown', e => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); if (e.key === 'f') document.documentElement.requestFullscreen?.(); });
addEventListener('resize', fit);

/* ---------- Aperçu depuis l'outil interne ---------- */
if (PREVIEW) {
  $('#prevtag').hidden = false;
  addEventListener('message', e => {
    const m = e.data; if (!m || m.type !== 'esp-tv-preview') return;
    DATA = m.content || DATA; FLASHES = (m.flash && m.flash.flashes) || [];
    if (m.date !== undefined) simDate = m.date || '';
    $('#prevtag').textContent = 'Aperçu' + (simDate ? ' · ' + fmtDay(simDate) : '');
    shownOnce = {}; slidesSinceFlash = {};
    if (m.goto === 'flash') { const f = activeFlashes()[0] || FLASHES[0]; if (f) { showFlash(f); return; } }
    rebuild(true);
  });
  if (window.parent !== window) window.parent.postMessage({ type: 'esp-tv-ready' }, '*');
}

/* ---------- Démarrage ---------- */
fit(); tick(); setInterval(tick, 1000);
loadWeather(); setInterval(loadWeather, CFG.weatherEveryMs);
(async () => {
  await loadContent();
  if (!deck.length) rebuild(true);
  await loadFlash();
  setInterval(loadContent, CFG.contentEveryMs);
  setInterval(loadFlash, CFG.flashEveryMs);
})();
})();
