/* Bijoy HRMS — Work From Home module: application, supervisor approval, online attendance (check-in/out) and a location tracker.
   Data lives in the browser (localStorage). Location uses the device GPS when allowed; the demo can also simulate positions. */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const KEY = 'bijoy-wfh-db-v1';
  const HQ = { lat: 23.7808, lng: 90.4167 };
  const TEAM = ['Kamrul Hasan', 'Maliha Chowdhury', 'Towhid Hasan', 'Imran Hossain', 'Nusrat Jahan'];
  const PING_MS = 20000;
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const day = (n, from) => { const d = from ? new Date(from + 'T00:00') : new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const fmtS = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—');
  const hm = (ms) => { const d = new Date(ms); return B.pad(d.getHours()) + ':' + B.pad(d.getMinutes()); };
  const dur = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return Math.floor(m / 60) + 'h ' + B.pad(m % 60) + 'm'; };
  const me = () => (B.role === 'employee' ? B.ME : B.ADMIN_EMP);
  const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 99);
  const who = (n) => `<span class="as-who">${B.avatar(n, 26)}<span>${esc(n)}</span></span>`;
  const Kp = (i, t, v, tn) => B.kpi(i, t, v, null, null, tn);
  const kp = (a) => `<section class="kpis sm lv-stats" style="grid-template-columns:repeat(${a.length},minmax(0,1fr))">${a.join('')}</section>`;
  const tabs = (list, cur, act) => `<div class="seg sm as-tabs">${list.map((t) => `<button class="${t[0] === cur ? 'on' : ''}" data-act="${act}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>`;
  const field = (l, c, full) => `<div class="fld" ${full ? 'style="grid-column:1/-1"' : ''}><label>${l}</label>${c}</div>`;
  const grid = (c) => `<div class="fgrid" style="grid-template-columns:1fr 1fr">${c}</div>`;
  const rid = (t) => t.closest('[data-id]').dataset.id;
  const crumbs = (l) => [{ label: 'HR', href: '#/' }, { label: 'Work From Home', href: '#/page/wfh-dash' }, { label: l }];
  const PILL = { Pending: 'warn', Approved: 'ok', Rejected: 'bad', Cancelled: 'mute', Verified: 'ok', 'Outside zone': 'bad', 'No location': 'warn', Late: 'warn', Live: 'info', Reviewed: 'info', 'In zone': 'ok' };
  const pill = (s) => B.pill(s, PILL[s] || 'mute');

  /* ---------- geo helpers ---------- */
  const rad = (x) => (x * Math.PI) / 180;
  const dist = (a, b) => { const R = 6371000, dl = rad(b.lat - a.lat), dg = rad(b.lng - a.lng), h = Math.sin(dl / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dg / 2) ** 2; return Math.round(2 * R * Math.asin(Math.sqrt(h))); };
  const offset = (p, mN, mE) => ({ lat: p.lat + mN / 110540, lng: p.lng + mE / (111320 * Math.cos(rad(p.lat))) });
  const homeOf = (name) => {
    const H = D().homes; if (!H[name]) { const h = B.hash(name), a = (h % 4000) - 2000, b = ((h >> 8) % 4000) - 2000; const p = offset(HQ, a, b); H[name] = { address: 'Registered home address', lat: p.lat, lng: p.lng, status: 'Verified' }; save(); }
    return H[name];
  };

  /* ---------- seed ---------- */
  function seed() {
    const s = { settings: { maxDays: 4, notice: 1, radius: 200, mode: 'Periodic', interval: 30, accuracy: 100, start: '09:30', end: '18:30', grace: 15, reasonOutside: true, selfie: false }, homes: {}, requests: [], sessions: [], seq: 0, on: today() };
    return s;
  }
  let db = null;
  const D = () => { if (!db) { try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} if (!db || !db.requests || db.on !== today()) { db = seed(); populate(); save(); } } return db; };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  const rq = (emp, from, to, type, reason, status, sup, extra) => { const r = Object.assign({ id: 'WF-' + B.pad(++db.seq, 4), emp, from, to, type, reason, plan: '', phone: '+880 1711-000000', status, sup, decidedBy: status === 'Pending' ? '' : sup, decidedAt: status === 'Pending' ? '' : day(-1), note: '', created: day(-3) }, extra || {}); r.stages = B.flow.mkStages('wfh', r.emp, status, sup, r.decidedAt || day(-1)); db.requests.push(r); return r; };
  function populate() {
    const t = today(), sessionsFor = (emp, ago, hrs, state, trail) => { const start = Date.now() - ago * 60000, h = homeOf(emp); const mk = (i, n) => { const p = offset(h, (i % 3) * 25 - 20, (i % 2) * 30 - 15); return { t: start + i * 30 * 60000, lat: p.lat, lng: p.lng, acc: 15 + i * 3, dist: dist(h, p), in: true }; }; const tr = Array.from({ length: trail }, (_, i) => mk(i + 1)); const s = { id: uid('ss'), emp, date: iso(new Date(start)), in: start, out: hrs ? start + hrs * 3600000 : 0, inLoc: Object.assign(mk(0), { t: start }), outLoc: null, trail: tr, breaks: [], note: '', summary: '', review: '' }; if (state === 'out') { s.inLoc = Object.assign(mk(0), { lat: offset(h, 430, 120).lat, lng: offset(h, 430, 120).lng, in: false, dist: 447 }); s.trail = [{ t: start + 30 * 60000, lat: offset(h, 440, 110).lat, lng: offset(h, 440, 110).lng, acc: 30, dist: 450, in: false }]; } if (state === 'none') { s.inLoc = null; s.trail = []; } if (s.out) s.outLoc = Object.assign({}, tr[tr.length - 1] || s.inLoc || {}, { t: s.out }); db.sessions.push(s); return s; };
    // current employee (Tasnim): approved today, pending next week, one rejected, one completed
    rq('Tasnim Rahman', t, t, 'Full day', 'Focus work on the payments module', 'Approved', 'Fatema Khatun', { plan: 'Finish API integration and write tests' });
    rq('Tasnim Rahman', day(4), day(5), 'Full day', 'Plumber visiting home', 'Pending', 'Fatema Khatun', { created: day(0) });
    rq('Tasnim Rahman', day(-12), day(-12), 'Half day', 'Bank work in the morning', 'Rejected', 'Fatema Khatun', { note: 'Team planning meeting that day, please attend in office.' });
    rq('Tasnim Rahman', day(-20), day(-19), 'Full day', 'Internet fibre installation at home', 'Approved', 'Fatema Khatun');
    // team of the current employee as supervisor
    ['Kamrul Hasan', 'Maliha Chowdhury', 'Towhid Hasan'].forEach((n) => rq(n, t, t, 'Full day', 'Working from home today', 'Approved', 'Tasnim Rahman'));
    rq('Kamrul Hasan', day(2), day(3), 'Full day', 'Family event outside Dhaka', 'Pending', 'Tasnim Rahman', { created: day(0), plan: 'Documentation and ticket backlog' });
    rq('Imran Hossain', day(1), day(1), 'Half day', 'Doctor appointment in the afternoon', 'Pending', 'Tasnim Rahman', { created: day(0) });
    rq('Nusrat Jahan', day(6), day(8), 'Full day', 'Relocating house, internet is ready', 'Pending', 'Tasnim Rahman', { created: day(-1), plan: 'Tax module review remotely' });
    // others: reviewed by Fatema, plus one waiting for the admin
    rq('Sadia Islam', day(1), day(2), 'Full day', 'Child is unwell', 'Pending', 'Rahim Uddin', { created: day(0) });
    rq('Mahmud Hasan', day(-2), day(-2), 'Full day', 'Home deliveries', 'Approved', 'Fatema Khatun');
    [[-1, 'Farhana Akter'], [-1, 'Shirin Sultana'], [-3, 'Nusrat Jahan'], [-4, 'Imran Hossain'], [-4, 'Kamrul Hasan'], [-5, 'Sadia Islam'], [-6, 'Arif Chowdhury'], [-6, 'Mitu Rahman'], [0, 'Farhana Akter'], [0, 'Sabbir Ahmed'], [1, 'Mitu Rahman'], [2, 'Arif Chowdhury'], [3, 'Shirin Sultana']].forEach((x) => rq(x[1], day(x[0]), day(x[0]), 'Full day', 'Working from home', 'Approved', 'Fatema Khatun'));
    sessionsFor('Kamrul Hasan', 215, 0, 'in', 6); sessionsFor('Maliha Chowdhury', 170, 0, 'out', 1); sessionsFor('Towhid Hasan', 240, 0, 'none', 0);
    [['Tasnim Rahman', 1, 8.1], ['Mahmud Hasan', 2, 7.6], ['Tasnim Rahman', 20 * 24 * 60 / 60, 8]].forEach((x, i) => { const s = sessionsFor(x[0], x[1] * 24 * 60, x[2], 'in', 4); s.in = Date.now() - x[1] * 24 * 3600000; s.out = s.in + x[2] * 3600000; s.date = iso(new Date(s.in)); s.outLoc.t = s.out; });
    const o = sessionsFor('Sadia Islam', 3 * 24 * 60, 6.5, 'out', 1); o.in = Date.now() - 3 * 24 * 3600000; o.out = o.in + 6.5 * 3600000; o.date = iso(new Date(o.in)); o.inLoc.t = o.in; o.outLoc = Object.assign({}, o.trail[0], { t: o.out });
  }

  /* ---------- derived ---------- */
  const isFri = (d) => new Date(d + 'T00:00').getDay() === 5;
  const daysOf = (r) => { let n = 0, d = r.from; while (d <= r.to) { if (!isFri(d)) n += r.type === 'Half day' ? 0.5 : 1; d = day(1, d); } return n; };
  const monthKey = (d) => d.slice(0, 7);
  const usedIn = (emp, m, skip) => D().requests.filter((r) => r.emp === emp && (r.status === 'Approved' || r.status === 'Pending') && !r.autoOpen && monthKey(r.from) === m && r.id !== skip).reduce((s, r) => s + daysOf(r), 0);
  const openToday = () => (B.flow.isOpen(today()) && !isFri(today()) ? { id: 'OPEN', emp: '', status: 'Approved', decidedBy: 'HR open date (no approval needed)' } : null);
  const approvedToday = (emp) => openToday() || D().requests.find((r) => r.emp === emp && r.status === 'Approved' && r.from <= today() && r.to >= today() && !isFri(today()));
  const sessionToday = (emp) => D().sessions.find((s) => s.emp === emp && s.date === today());
  const breakMs = (s) => (s.breaks || []).reduce((a, b) => a + ((b.e || Date.now()) - b.s), 0);
  const worked = (s) => Math.max(0, (s.out || Date.now()) - s.in - breakMs(s));
  const onBreak = (s) => (s.breaks || []).some((b) => !b.e);
  const outsideCount = (s) => (s.inLoc && !s.inLoc.in ? 1 : 0) + s.trail.filter((p) => !p.in).length;
  const status = (s) => (s.review ? 'Reviewed' : !s.inLoc ? 'No location' : outsideCount(s) ? 'Outside zone' : s.late ? 'Late' : !s.out ? 'Live' : 'Verified');
  const flagged = (s) => !s.review && (!s.inLoc || outsideCount(s) > 0);

  /* ---------- map ---------- */
  function mapSVG(items, o) {
    o = o || {}; const W = o.w || 640, H = o.h || 300;
    const pts = items.filter((i) => i.lat != null), c = o.fixed || (() => { const hs = pts.filter((p) => p.kind === 'home'), base = hs.length ? hs : pts; return { lat0: base.reduce((s, p) => s + p.lat, 0) / base.length, lng0: base.reduce((s, p) => s + p.lng, 0) / base.length }; })();
    const mx = (p) => (p.lng - c.lng0) * 111320 * Math.cos(rad(c.lat0)), my = (p) => (c.lat0 - p.lat) * 110540;
    let ext = 120; pts.forEach((p) => { ext = Math.max(ext, Math.abs(mx(p)) + (p.r || 0), Math.abs(my(p)) + (p.r || 0)); });
    const sc = o.fixed ? o.fixed.sc : (Math.min(W, H) / 2) * 0.8 / ext, X = (p) => W / 2 + mx(p) * sc, Y = (p) => H / 2 + my(p) * sc;
    const roads = [[0, .22, 1, .3], [0, .68, 1, .6], [.28, 0, .36, 1], [.7, 0, .62, 1], [0, .95, .55, .05]].map((r) => `<line class="rd" x1="${r[0] * W}" y1="${r[1] * H}" x2="${r[2] * W}" y2="${r[3] * H}"/>`).join('');
    const grid = Array.from({ length: 9 }, (_, i) => `<line class="gd" x1="${(i + 1) * W / 10}" y1="0" x2="${(i + 1) * W / 10}" y2="${H}"/>`).join('') + Array.from({ length: 5 }, (_, i) => `<line class="gd" x1="0" y1="${(i + 1) * H / 6}" x2="${W}" y2="${(i + 1) * H / 6}"/>`).join('');
    const trail = items.filter((i) => i.kind === 'trail');
    const body = items.map((p) => {
      if (p.lat == null) return '';
      if (p.kind === 'home') return `<circle class="zone" cx="${X(p)}" cy="${Y(p)}" r="${Math.max(10, (p.r || 0) * sc)}"/><g transform="translate(${X(p) - 9},${Y(p) - 9})" class="hm"><rect width="18" height="18" rx="6"/><path d="M4 9l5-4.5L14 9v5H4z"/></g>`;
      if (p.kind === 'trail') return `<circle class="tp st-${p.state || 'ok'}" cx="${X(p)}" cy="${Y(p)}" r="3.4"/>`;
      return `<g class="pin st-${p.state || 'ok'}"><circle cx="${X(p)}" cy="${Y(p)}" r="14" class="halo"/><circle cx="${X(p)}" cy="${Y(p)}" r="7"/></g>${p.label ? `<text x="${X(p) + 12}" y="${Y(p) + 4}">${esc(p.label)}</text>` : ''}`;
    }).join('');
    const line = trail.length > 1 ? `<polyline class="tr" points="${trail.map((p) => X(p) + ',' + Y(p)).join(' ')}"/>` : '';
    return `<svg class="wmap" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" ${o.pick ? `data-act="wf-pick" data-w="${W}" data-h="${H}" data-lat0="${c.lat0}" data-lng0="${c.lng0}" data-sc="${sc}" style="cursor:crosshair"` : ''} role="img" aria-label="Location map"><rect class="bg" width="${W}" height="${H}"/><rect class="park" x="${W * .08}" y="${H * .38}" width="${W * .16}" height="${H * .2}" rx="14"/><rect class="park" x="${W * .74}" y="${H * .1}" width="${W * .18}" height="${H * .22}" rx="14"/>${grid}${roads}${line}${body}</svg>`;
  }
  B.act['wf-pick'] = (t, e) => {
    const r = t.getBoundingClientRect(), W = +t.dataset.w, H = +t.dataset.h, sc = +t.dataset.sc, lat0 = +t.dataset.lat0, lng0 = +t.dataset.lng0;
    const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H; const lat = lat0 - (y - H / 2) / sc / 110540, lng = lng0 + (x - W / 2) / sc / (111320 * Math.cos(rad(lat0)));
    pick = { lat, lng }; B.$('#wfm-ll').textContent = lat.toFixed(5) + ', ' + lng.toFixed(5); B.$('#wfm-map').innerHTML = mapSVG([{ kind: 'pin', lat, lng, label: 'Home', state: 'ok' }], { pick: 1, fixed: { lat0, lng0, sc } });
  };
  let pick = null;

  /* ---------- location acquisition ---------- */
  let fixSource = 'sim-home', lastFix = null;
  function getFix(home, source, cb) {
    const sim = (m) => { const mNE = { 'sim-home': [14, -9], 'sim-out': [430, 160] }[m] || [0, 0]; const p = offset(home, mNE[0], mNE[1]); cb({ lat: p.lat, lng: p.lng, acc: m === 'sim-out' ? 38 : 16 }); };
    if (source === 'sim-none') { cb(null); return; }
    if (source !== 'gps') { sim(source); return; }
    if (!navigator.geolocation) { cb(null, 'unsupported'); return; }
    navigator.geolocation.getCurrentPosition((p) => cb({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }), (er) => cb(null, er.message || 'denied'), { enableHighAccuracy: true, timeout: 8000, maximumAge: 20000 });
  }
  const withZone = (home, f) => { if (!f) return null; const d = dist(home, f), z = D().settings.radius; return { t: Date.now(), lat: f.lat, lng: f.lng, acc: f.acc, dist: d, in: d <= z && f.acc <= D().settings.accuracy * 1.0 + z }; };

  /* ---------- page plumbing ---------- */
  const F = { reqs: {}, att: {}, set: {}, my: {}, team: {} }, PG = {}; let cur = '';
  const rerender = () => { const v = B.$('#view .fade'); if (v && PG[cur]) { v.innerHTML = PG[cur](); if (cur === 'my-wfh') ticker(); } };
  const reset = (n) => { if (n === 'wfh-requests') F.reqs = { st: '', q: '' }; if (n === 'wfh-attendance') F.att = { st: '', q: '' }; if (n === 'wfh-policy') F.set = { tab: 'settings' }; if (n === 'my-wfh') F.my = {}; };
  const page = (n, fn) => { PG[n] = fn; B.page[n] = () => { cur = n; D(); reset(n); return fn(); }; };
  const done = (msg) => { save(); B.closeModal(); rerender(); if (msg) B.toast(msg); };
  const reqById = (id) => { const r = D().requests.find((x) => x.id === id); if (r && !r.stages) r.stages = B.flow.mkStages('wfh', r.emp, r.status === 'Approved' ? 'Approved' : r.status === 'Rejected' ? 'Rejected' : '', r.sup); return r; };
  const stg = (r) => r.stages || (r.stages = B.flow.mkStages('wfh', r.emp, r.status === 'Approved' ? 'Approved' : r.status === 'Rejected' ? 'Rejected' : '', r.sup));
  const nextOf = (r) => { const i = B.flow.curIdx(stg(r)); return i < 0 ? null : stg(r)[i]; };
  const sesById = (id) => D().sessions.find((s) => s.id === id);

  /* =========================== ADMIN: OVERVIEW =========================== */
  page('wfh-dash', () => {
    const d = D(), t = today(), live = d.sessions.filter((s) => !s.out && s.date === t), apr = d.requests.filter((r) => r.status === 'Approved' && r.from <= t && r.to >= t), pend = d.requests.filter((r) => r.status === 'Pending'), fl = d.sessions.filter(flagged);
    const items = []; live.forEach((s) => { const h = homeOf(s.emp), p = s.trail.length ? s.trail[s.trail.length - 1] : s.inLoc; items.push({ kind: 'home', lat: h.lat, lng: h.lng, r: d.settings.radius }); if (p) items.push({ kind: 'pin', lat: p.lat, lng: p.lng, label: s.emp.split(' ')[0], state: p.in ? 'ok' : 'bad' }); else items.push({ kind: 'pin', lat: h.lat, lng: h.lng, label: s.emp.split(' ')[0], state: 'mute' }); });
    const week = Array.from({ length: 7 }, (_, i) => { const dd = day(i - 6); return [new Date(dd + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short' }), d.requests.filter((r) => r.status === 'Approved' && r.from <= dd && r.to >= dd && !isFri(dd)).length]; }), mx = Math.max(1, ...week.map((w) => w[1]));
    return `${B.head('Work From Home', 'Approvals, online attendance and location verification for remote work.', `<a class="btn" href="#/page/wfh-policy">${ic('settings', 15)}Policy & tracking</a><a class="btn primary" href="#/page/wfh-requests">${ic('inbox', 16)}Applications${pend.length ? ' (' + pend.length + ')' : ''}</a>`, [{ label: 'HR', href: '#/' }, { label: 'Work From Home' }])}
      ${kp([Kp('home', 'WFH today', apr.length), Kp('location', 'Checked in now', live.length, 'ok'), Kp('inbox', 'Pending approval', pend.length, pend.length ? 'warn' : ''), Kp('alert', 'Location flags', fl.length, fl.length ? 'bad' : ''), Kp('calendar', 'Approved this month', d.requests.filter((r) => r.status === 'Approved' && monthKey(r.from) === monthKey(t)).length)])}
      <section class="grid-3-2"><div class="card pad"><div class="ct-row"><h3 class="ct">Live locations</h3><span class="wf-legend"><i class="st-ok"></i>In zone <i class="st-bad"></i>Outside <i class="st-mute"></i>No GPS</span></div>${live.length ? `<div class="wf-map">${mapSVG(items, { w: 760, h: 340 })}</div>` : '<div class="empty"><span>Nobody is checked in right now.</span></div>'}</div>
        <div class="card pad"><h3 class="ct">Checked in now</h3><ul class="feed">${live.map((s) => { const st = status(s); return `<li data-id="${s.id}"><div><b>${esc(s.emp)}</b><span>Since ${hm(s.in)} · ${dur(worked(s))}${s.inLoc ? ' · ' + s.inLoc.dist + ' m from home' : ''}</span></div>${pill(st === 'Live' ? 'In zone' : st)}<button class="icon-btn sm" data-act="wfa-track" aria-label="Track">${ic('location', 15)}</button></li>`; }).join('') || '<li><div><span>No active sessions.</span></div></li>'}</ul></div></section>
      <section class="grid-2"><div class="card pad"><h3 class="ct">Approved WFH this week</h3><div class="wf-bars">${week.map((w) => `<div><b>${w[1]}</b><i style="height:${Math.max(4, (w[1] / mx) * 90)}px"></i><span>${w[0]}</span></div>`).join('')}</div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Needs review</h3><a class="link-btn" href="#/page/wfh-attendance">All</a></div>${fl.length ? `<ul class="feed">${fl.slice(0, 4).map((s) => `<li data-id="${s.id}"><div><b>${esc(s.emp)}</b><span>${fmtS(s.date)} · ${!s.inLoc ? 'No location captured' : outsideCount(s) + ' reading(s) outside the zone'}</span></div>${pill(status(s))}<button class="btn sm" data-act="wfa-track">Review</button></li>`).join('')}</ul>` : '<div class="empty"><span>No location flags.</span></div>'}</div></section>`;
  });

  /* =========================== ADMIN: APPLICATIONS =========================== */
  const reqRows = () => { const f = F.reqs, q = (f.q || '').toLowerCase(); return D().requests.filter((r) => (!f.st || r.status === f.st) && (!q || (r.emp + r.reason + r.id).toLowerCase().includes(q))).sort((a, b) => b.created.localeCompare(a.created) || b.id.localeCompare(a.id)); };
  const reqTable = () => { const l = reqRows(); return l.length ? `<div class="tscroll"><table class="dt"><thead><tr><th>Employee</th><th>Dates</th><th>Reason</th><th>Approver</th><th>Status</th><th class="r"></th></tr></thead><tbody>${l.map((r) => `<tr data-id="${r.id}"><td>${who(r.emp)}</td><td><b>${fmtS(r.from)}${r.to !== r.from ? ' – ' + fmtS(r.to) : ''}</b><em class="sub">${daysOf(r)} day${daysOf(r) === 1 ? '' : 's'} · ${r.type} · ${r.id}</em></td><td style="white-space:normal;min-width:200px">${esc(r.reason)}</td><td>${r.status === 'Pending' && nextOf(r) ? esc(nextOf(r).who) + '<em class="sub">' + esc(B.flow.lab(nextOf(r))) + ' · step ' + (B.flow.curIdx(stg(r)) + 1) + '/' + stg(r).length + '</em>' : r.autoOpen ? '<em class="sub">HR open date</em>' : esc(r.sup)}</td><td>${pill(r.status)}</td><td class="r"><button class="btn sm" data-act="wfr-view">${r.status === 'Pending' ? 'Review' : 'View'}</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${ic('search', 34)}<b>No applications</b></div>`; };
  const refreshReqs = () => { const t = B.$('#wf-table'); if (t) t.innerHTML = reqTable(); };
  page('wfh-requests', () => `${B.head('WFH Applications', 'Every work-from-home application with its approval status.', '', crumbs('Applications'))}
    ${kp([Kp('inbox', 'Pending', D().requests.filter((r) => r.status === 'Pending').length, 'warn'), Kp('check-circle', 'Approved', D().requests.filter((r) => r.status === 'Approved').length, 'ok'), Kp('x', 'Rejected', D().requests.filter((r) => r.status === 'Rejected').length, 'bad')])}
    <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="wfrq" placeholder="Search employee or reason…"></label><select class="inp sm" data-chg="wfrst"><option value="">Status: All</option>${['Pending', 'Approved', 'Rejected', 'Cancelled'].map((s) => `<option>${s}</option>`).join('')}</select></div><div class="card table-card" id="wf-table">${reqTable()}</div>`);
  B.inp.wfrq = (t) => { F.reqs.q = t.value; refreshReqs(); }; B.chg.wfrst = (t) => { F.reqs.st = t.value; refreshReqs(); };

  const reqDetail = (r, canAct) => `<div class="cl-meta">${who(r.emp)}${pill(r.status)}<span>${r.id} · applied ${fmt(r.created)}</span></div>
    <dl class="kv as-kv"><div><dt>Dates</dt><dd>${fmt(r.from)}${r.to !== r.from ? ' → ' + fmt(r.to) : ''} (${daysOf(r)} day${daysOf(r) === 1 ? '' : 's'})</dd></div><div><dt>Type</dt><dd>${r.type}</dd></div><div><dt>Waiting for</dt><dd>${r.status === 'Pending' && nextOf(r) ? esc(B.flow.lab(nextOf(r))) + ' · ' + esc(nextOf(r).who) : r.autoOpen ? 'Nobody · HR open date' : '—'}</dd></div><div><dt>Contact</dt><dd>${esc(r.phone)}</dd></div><div><dt>Used this month</dt><dd>${usedIn(r.emp, monthKey(r.from))} of ${D().settings.maxDays} days</dd></div><div><dt>Home location</dt><dd>${esc(homeOf(r.emp).address)} ${pill(homeOf(r.emp).status)}</dd></div></dl>
    <h4 style="margin:12px 0 6px">Reason</h4><div class="as-note">${esc(r.reason)}</div>${r.plan ? `<h4 style="margin:12px 0 6px">Work plan</h4><div class="as-note">${esc(r.plan)}</div>` : ''}${r.note ? `<div class="as-issue" style="margin-top:12px">${ic('alert', 15)}<span><b>${esc(r.decidedBy)}:</b> ${esc(r.note)}</span></div>` : ''}<h4 style="margin:12px 0 8px">Approval trail</h4>${B.flow.trail(stg(r))}${canAct ? field('Comment (optional)', '<textarea class="inp" id="wfm-n" rows="2"></textarea>') : ''}`;
  B.act['wfr-view'] = (t) => { const r = reqById(rid(t)), p = r.status === 'Pending'; B.modal({ title: 'Application ' + r.id, wide: true, body: reqDetail(r, p), foot: p ? `<button class="btn" data-act="wf-decide" data-id="${r.id}" data-v="Rejected">Reject</button><button class="btn" data-act="wf-decide" data-id="${r.id}" data-v="Step">Approve ${nextOf(r) ? esc(B.flow.lab(nextOf(r))) : ''} only</button><button class="btn primary" data-act="wf-decide" data-id="${r.id}" data-v="Approved">HR: approve all stages</button>` : '<button class="btn primary" data-act="close-modal">Close</button>' }); };
  B.act['wf-decide'] = (t) => { const r = reqById(t.dataset.id), n = (B.$('#wfm-n') || {}).value || '', v = t.dataset.v; if (v === 'Rejected' && !n.trim()) { B.toast('Add a comment for the employee', 'bad'); return; } const by = me().name + ' (HR)'; if (v === 'Rejected') { B.flow.rejectCur(stg(r), by, n.trim()); Object.assign(r, { status: 'Rejected', decidedBy: by, decidedAt: today(), note: n.trim() }); done('Application rejected'); return; } if (v === 'Step') { B.flow.approveOne(stg(r), by, n.trim()); if (B.flow.overall(stg(r)) === 'Approved') Object.assign(r, { status: 'Approved', decidedBy: by, decidedAt: today() }); done(r.status === 'Approved' ? 'Fully approved' : 'Approved. Forwarded to ' + nextOf(r).who); return; } B.flow.approveAll(stg(r), me().name, n.trim()); Object.assign(r, { status: 'Approved', decidedBy: by, decidedAt: today(), note: n.trim() }); done('Approved by HR at every stage. ' + r.emp + ' can check in'); };

  /* =========================== ADMIN: ATTENDANCE LOG =========================== */
  const attRows = () => { const f = F.att, q = (f.q || '').toLowerCase(); return D().sessions.filter((s) => (!f.st || status(s) === f.st) && (!q || s.emp.toLowerCase().includes(q))).sort((a, b) => b.in - a.in); };
  const attTable = () => { const l = attRows(); return l.length ? `<div class="tscroll"><table class="dt"><thead><tr><th>Employee</th><th>Date</th><th>In / Out</th><th>Worked</th><th>Location</th><th>Status</th><th class="r"></th></tr></thead><tbody>${l.map((s) => `<tr data-id="${s.id}"><td>${who(s.emp)}</td><td>${fmtS(s.date)}</td><td>${hm(s.in)} – ${s.out ? hm(s.out) : '<em>live</em>'}</td><td>${dur(worked(s))}</td><td>${s.inLoc ? `${s.inLoc.dist} m from home<em class="sub">±${s.inLoc.acc} m · ${s.trail.length + 1} reading(s)</em>` : '<span class="as-none">Not captured</span>'}</td><td>${pill(status(s))}${s.late ? ' <span class="pill warn"><i></i>Late</span>' : ''}</td><td class="r"><button class="btn sm" data-act="wfa-track">${ic('location', 14)}Track</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${ic('search', 34)}<b>No sessions</b></div>`; };
  const refreshAtt = () => { const t = B.$('#wf-table'); if (t) t.innerHTML = attTable(); };
  page('wfh-attendance', () => `${B.head('Online Attendance', 'Remote check-ins with the location captured at check-in, while working and at check-out.', `<button class="btn" data-act="wfa-export">${ic('download', 15)}Export CSV</button>`, crumbs('Online Attendance'))}
    ${kp([Kp('user-check', 'Sessions', D().sessions.length), Kp('check-circle', 'Verified', D().sessions.filter((s) => status(s) === 'Verified').length, 'ok'), Kp('alert', 'Outside zone', D().sessions.filter((s) => status(s) === 'Outside zone').length, 'bad'), Kp('location', 'No location', D().sessions.filter((s) => status(s) === 'No location').length, 'warn')])}
    <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="wfaq" placeholder="Search employee…"></label><select class="inp sm" data-chg="wfast"><option value="">Status: All</option>${['Live', 'Verified', 'Outside zone', 'No location', 'Reviewed'].map((s) => `<option>${s}</option>`).join('')}</select></div><div class="card table-card" id="wf-table">${attTable()}</div>`);
  B.inp.wfaq = (t) => { F.att.q = t.value; refreshAtt(); }; B.chg.wfast = (t) => { F.att.st = t.value; refreshAtt(); };
  B.act['wfa-export'] = () => { const rows = [['Employee', 'Date', 'In', 'Out', 'Worked', 'Distance from home (m)', 'Accuracy (m)', 'Status']].concat(attRows().map((s) => [s.emp, s.date, hm(s.in), s.out ? hm(s.out) : '', dur(worked(s)), s.inLoc ? s.inLoc.dist : '', s.inLoc ? s.inLoc.acc : '', status(s)])); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n')], { type: 'text/csv' })); a.download = 'wfh-attendance.csv'; document.body.appendChild(a); a.click(); a.remove(); B.toast('Exported'); };
  B.act['wfa-track'] = (t) => {
    const s = sesById(rid(t)), h = homeOf(s.emp), st = status(s), pts = [s.inLoc].concat(s.trail, s.outLoc && s.outLoc.lat ? [s.outLoc] : []).filter(Boolean);
    const items = [{ kind: 'home', lat: h.lat, lng: h.lng, r: D().settings.radius }].concat(pts.map((p, i) => ({ kind: i === 0 || i === pts.length - 1 ? 'pin' : 'trail', lat: p.lat, lng: p.lng, label: i === 0 ? 'In' : i === pts.length - 1 && s.out ? 'Out' : '', state: p.in ? 'ok' : 'bad' })));
    const trailPts = pts.map((p) => ({ kind: 'trail', lat: p.lat, lng: p.lng, state: p.in ? 'ok' : 'bad' }));
    B.modal({ title: `${esc(s.emp)} · ${fmt(s.date)}`, wide: true, body: `<div class="cl-meta">${who(s.emp)}${pill(st)}<span>${hm(s.in)} – ${s.out ? hm(s.out) : 'now'} · ${dur(worked(s))} worked</span></div>
      ${pts.length ? `<div class="wf-map">${mapSVG(items.concat(trailPts.length > 1 ? [] : []).concat(pts.length > 1 ? pts.slice(0, -1).map(() => null).filter(Boolean) : []), { w: 760, h: 300 })}</div>` : `<div class="as-issue">${ic('alert', 15)}<span>No location was captured for this session.</span></div>`}
      <h4 style="margin:14px 0 6px">Location readings</h4><ul class="as-hist">${pts.length ? pts.map((p, i) => `<li><i style="background:var(--${p.in ? 'ok' : 'bad'})"></i><div><b>${i === 0 ? 'Check-in' : s.out && i === pts.length - 1 ? 'Check-out' : 'Ping'} · ${hm(p.t)}</b><span>${p.dist} m from home · ±${p.acc} m · ${p.in ? 'inside zone' : 'outside zone'}</span></div></li>`).join('') : '<li><i></i><div><b>No readings</b></div></li>'}</ul>${s.note ? `<div class="as-note" style="margin-top:10px"><b>Employee note:</b> ${esc(s.note)}</div>` : ''}${s.summary ? `<div class="as-note" style="margin-top:10px"><b>Work summary:</b> ${esc(s.summary)}</div>` : ''}${s.review ? `<div class="as-note" style="margin-top:10px"><b>HR review:</b> ${esc(s.review)}</div>` : ''}`, foot: flagged(s) ? `<button class="btn" data-act="close-modal">Close</button><button class="btn primary" data-act="wfa-review" data-id="${s.id}">Accept with note</button>` : '<button class="btn primary" data-act="close-modal">Close</button>' });
  };
  B.act['wfa-review'] = (t) => B.modal({ title: 'Review location flag', body: field('Note for the record', '<textarea class="inp" id="wfm-n" rows="3" placeholder="e.g. Employee confirmed working from a relative\'s home"></textarea>'), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="wfa-do-review" data-id="${t.dataset.id}">Accept session</button>` });
  B.act['wfa-do-review'] = (t) => { const v = B.$('#wfm-n').value.trim(); if (!v) { B.toast('Add a note', 'bad'); return; } sesById(t.dataset.id).review = v; done('Session accepted'); };

  /* =========================== ADMIN: POLICY & LOCATIONS =========================== */
  page('wfh-policy', () => {
    const s = D().settings, tab = F.set.tab, homes = Object.keys(D().homes);
    const body = tab === 'locations' ? `<div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Employee</th><th>Registered address</th><th>Coordinates</th><th>Status</th><th class="r"></th></tr></thead><tbody>${B.EMPLOYEES.filter((e) => e.status !== 'Left').slice(0, 14).map((e) => { const h = homeOf(e.name); return `<tr data-id="${esc(e.name)}"><td>${who(e.name)}</td><td>${esc(h.address)}</td><td>${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}</td><td>${pill(h.status)}</td><td class="r">${h.status === 'Pending' ? '<button class="btn sm primary" data-act="wfp-verify">Verify</button> ' : ''}<button class="btn sm" data-act="wfp-loc">Set on map</button></td></tr>`; }).join('')}</tbody></table></div></div>`
      : `<div class="card pad"><div class="fgrid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">${field('WFH days per month', `<input type="number" class="inp" data-chg="wfset" data-k="maxDays" value="${s.maxDays}">`) + field('Apply at least (days before)', `<input type="number" class="inp" data-chg="wfset" data-k="notice" value="${s.notice}">`) + field('Work window starts', `<input type="time" class="inp" data-chg="wfset" data-k="start" value="${s.start}">`) + field('Work window ends', `<input type="time" class="inp" data-chg="wfset" data-k="end" value="${s.end}">`) + field('Late after (minutes)', `<input type="number" class="inp" data-chg="wfset" data-k="grace" value="${s.grace}">`) + field('Allowed distance from home (m)', `<input type="number" class="inp" data-chg="wfset" data-k="radius" value="${s.radius}">`) + field('Minimum GPS accuracy (m)', `<input type="number" class="inp" data-chg="wfset" data-k="accuracy" value="${s.accuracy}">`) + field('Location tracking', `<select class="inp" data-chg="wfset" data-k="mode">${['Check-in and check-out only', 'Periodic', 'Continuous'].map((m) => `<option ${s.mode === m ? 'selected' : ''}>${m}</option>`).join('')}</select>`) + field('Ping every (minutes)', `<input type="number" class="inp" data-chg="wfset" data-k="interval" value="${s.interval}">`)}</div>
        <div class="wf-toggles"><label class="chk-row"><input type="checkbox" data-chg="wfset" data-k="reasonOutside" ${s.reasonOutside ? 'checked' : ''}>Require a reason when checking in outside the allowed zone</label><label class="chk-row"><input type="checkbox" data-chg="wfset" data-k="selfie" ${s.selfie ? 'checked' : ''}>Ask for a selfie at check-in (design preview)</label></div>
        <div class="as-note" style="margin-top:14px">${ic('lock', 14)} <b>Employee consent:</b> “My location is captured at check-in and check-out${s.mode === 'Periodic' ? ' and every ' + s.interval + ' minutes while I work' : s.mode === 'Continuous' ? ' and continuously while I work' : ''}. Tracking stops when I check out and is used only to verify remote attendance.”</div></div>`;
    return `${B.head('WFH Policy & Location Tracking', 'Rules for working from home and how attendance location is verified.', '', crumbs('Policy & Tracking'))}<div class="filterbar">${tabs([['settings', 'Policy & tracking'], ['locations', 'Registered locations (' + homes.length + ')']], tab, 'wfp-tab')}</div>${body}`;
  });
  B.act['wfp-tab'] = (t) => { F.set.tab = t.dataset.t; rerender(); };
  B.chg.wfset = (t) => { const k = t.dataset.k; D().settings[k] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? +t.value || 0 : t.value; save(); B.toast('Setting saved'); };
  B.act['wfp-verify'] = (t) => { homeOf(rid(t)).status = 'Verified'; done('Location verified'); };
  const locModal = (name, onSave) => { const h = homeOf(name); pick = { lat: h.lat, lng: h.lng }; B.modal({ title: 'Home location · ' + esc(name), wide: true, body: `${field('Address', `<input class="inp" id="wfm-ad" value="${esc(h.address)}">`)}<p class="cl-hint" style="margin:10px 0">${ic('location', 14)} Click the map to drop the pin on the home. <b id="wfm-ll">${h.lat.toFixed(5)}, ${h.lng.toFixed(5)}</b></p><div class="wf-map" id="wfm-map">${mapSVG([{ kind: 'pin', lat: h.lat, lng: h.lng, label: 'Home', state: 'ok' }, { kind: 'home', lat: h.lat, lng: h.lng, r: D().settings.radius }], { pick: 1, w: 760, h: 300, fixed: { lat0: h.lat, lng0: h.lng, sc: 0.55 } })}</div>`, foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="${onSave}" data-id="${esc(name)}">Save location</button>` }); };
  B.act['wfp-loc'] = (t) => locModal(rid(t), 'wfp-do-loc');
  B.act['wfp-do-loc'] = (t) => { const h = homeOf(t.dataset.id); Object.assign(h, { address: B.$('#wfm-ad').value.trim() || h.address, lat: pick.lat, lng: pick.lng, status: 'Verified' }); done('Location saved'); };

  /* =========================== EMPLOYEE: MY WORK FROM HOME =========================== */
  const ticker = () => {
    const c = B.$('#wf-clock'); if (!c) return; const d = new Date(); c.textContent = B.pad(d.getHours()) + ':' + B.pad(d.getMinutes()) + ':' + B.pad(d.getSeconds());
    const s = sessionToday(me().name), w = B.$('#wf-worked'); if (s && !s.out && w) w.textContent = dur(worked(s));
    if (s && !s.out && !onBreak(s) && Date.now() - ((s.trail[s.trail.length - 1] || s.inLoc || { t: s.in }).t) > PING_MS && D().settings.mode !== 'Check-in and check-out only' && s.inLoc) ping(s, true);
  };
  if (!window.__wfTick) window.__wfTick = setInterval(ticker, 1000);
  function ping(s, auto) {
    const h = homeOf(s.emp), src = s.source || 'sim-home', base = s.trail[s.trail.length - 1] || s.inLoc;
    const go = (f) => { if (!f) return; const p = withZone(h, f); s.trail.push(p); save(); const m = B.$('#wf-mapbox'); if (m) { m.innerHTML = liveMap(s); } const l = B.$('#wf-last'); if (l) l.innerHTML = lastLine(s); if (!auto) B.toast('Location sent'); };
    if (src === 'gps') getFix(h, 'gps', go); else { const jitter = offset({ lat: base.lat, lng: base.lng }, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14); go({ lat: jitter.lat, lng: jitter.lng, acc: 12 + Math.round(Math.random() * 14) }); }
  }
  const liveMap = (s) => { const h = homeOf(s.emp), pts = [s.inLoc].concat(s.trail).filter(Boolean), last = pts[pts.length - 1]; return mapSVG([{ kind: 'home', lat: h.lat, lng: h.lng, r: D().settings.radius }].concat(pts.slice(0, -1).map((p) => ({ kind: 'trail', lat: p.lat, lng: p.lng, state: p.in ? 'ok' : 'bad' })), last ? [{ kind: 'pin', lat: last.lat, lng: last.lng, label: 'You', state: last.in ? 'ok' : 'bad' }] : []), { w: 640, h: 280 }); };
  const lastLine = (s) => { const p = s.trail[s.trail.length - 1] || s.inLoc; return p ? `${pill(p.in ? 'In zone' : 'Outside zone')} <span>${p.dist} m from home · ±${p.acc} m · updated ${hm(p.t)}</span>` : `${pill('No location')} <span>Location not captured</span>`; };
  B.onMy = () => { ticker(); };

  page('my-wfh', () => {
    const d = D(), n = me().name, t = today(), s = sessionToday(n), ap = approvedToday(n), h = homeOf(n), mine = d.requests.filter((r) => r.emp === n).sort((a, b) => b.created.localeCompare(a.created) || b.id.localeCompare(a.id)), mk = monthKey(t), used = usedIn(n, mk), settings = d.settings;
    let card;
    if (s && !s.out) card = `<div class="wf-state"><span class="pill ${onBreak(s) ? 'warn' : 'ok'}"><i></i>${onBreak(s) ? 'On break' : 'Working from home'}</span><div class="wf-clock" id="wf-clock">--:--:--</div><div class="wf-sub">Checked in at ${hm(s.in)} · worked <b id="wf-worked">${dur(worked(s))}</b></div><div class="wf-btns"><button class="btn" data-act="wf-break">${ic('coffee', 15)}${onBreak(s) ? 'End break' : 'Take a break'}</button><button class="btn" data-act="wf-ping">${ic('location', 15)}Send location</button><button class="btn primary" data-act="wf-out">${ic('fingerprint', 16)}Check out</button></div></div>`;
    else if (s && s.out) card = `<div class="wf-state"><span class="pill ok"><i></i>Day complete</span><div class="wf-clock">${dur(worked(s))}</div><div class="wf-sub">${hm(s.in)} – ${hm(s.out)} · status ${status(s)}</div></div>`;
    else if (ap) card = `<div class="wf-state"><span class="pill info"><i></i>Approved for today</span><div class="wf-clock" id="wf-clock">--:--:--</div><div class="wf-sub">Approved by ${esc(ap.decidedBy)} · work window ${settings.start}–${settings.end}</div><div class="wf-btns"><button class="btn primary lg" data-act="wf-in">${ic('fingerprint', 18)}Check in</button></div></div>`;
    else card = `<div class="wf-state"><span class="pill mute"><i></i>No approved WFH today</span><div class="wf-sub" style="margin-top:10px">${isFri(t) ? 'Today is a weekly off.' : 'You can check in from home only on days approved by your supervisor.'}</div><div class="wf-btns"><button class="btn primary" data-act="wf-apply">${ic('plus', 16)}Apply for WFH</button></div></div>`;
    const showMap = s && !s.out;
    return `${B.head('My Work From Home', 'Apply, get approved, then check in from home. Your location is verified at check-in.', `<button class="btn primary" data-act="wf-apply">${ic('plus', 16)}Apply for WFH</button>`, [{ label: 'HR', href: '#/' }, { label: 'Work From Home' }])}
      ${kp([Kp('calendar', 'Days left this month', Math.max(0, settings.maxDays - used) + ' / ' + settings.maxDays, used >= settings.maxDays ? 'bad' : 'ok'), Kp('clock', 'Pending approval', mine.filter((r) => r.status === 'Pending').length, 'warn'), Kp('check-circle', 'Approved upcoming', mine.filter((r) => r.status === 'Approved' && r.to >= t).length), Kp('home', 'Total WFH days', mine.filter((r) => r.status === 'Approved').reduce((a, r) => a + daysOf(r), 0))])}
      <section class="grid-3-2"><div class="card pad wf-today"><h3 class="ct">Today</h3>${card}${showMap ? `<div class="wf-map" id="wf-mapbox" style="margin-top:14px">${liveMap(s)}</div><div class="wf-last" id="wf-last">${lastLine(s)}</div>` : ''}
        <div class="as-note" style="margin-top:14px">${ic('lock', 14)} Location is captured at check-in and check-out${settings.mode === 'Periodic' ? ' and every ' + settings.interval + ' minutes' : settings.mode === 'Continuous' ? ' and continuously' : ''} while you work. Tracking stops at check-out.</div></div>
        <div class="stack"><div class="card pad"><div class="ct-row"><h3 class="ct">My work location</h3>${pill(h.status)}</div><div class="wf-map sm">${mapSVG([{ kind: 'home', lat: h.lat, lng: h.lng, r: settings.radius }, { kind: 'pin', lat: h.lat, lng: h.lng, state: 'ok' }], { w: 420, h: 190 })}</div><p style="margin:10px 0 2px"><b>${esc(h.address)}</b></p><span class="muted">Check-in must be within ${settings.radius} m of this point.</span><div class="as-act"><button class="btn sm" data-act="wf-myloc">Update location</button></div></div></div></section>
      <h3 class="ct" style="margin:20px 0 10px">My applications</h3><div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Dates</th><th>Reason</th><th>Approver</th><th>Status</th><th class="r"></th></tr></thead><tbody>${mine.map((r) => `<tr data-id="${r.id}"><td><b>${fmtS(r.from)}${r.to !== r.from ? ' – ' + fmtS(r.to) : ''}</b><em class="sub">${daysOf(r)} day${daysOf(r) === 1 ? '' : 's'} · ${r.type} · ${r.id}</em></td><td style="white-space:normal;min-width:200px">${esc(r.reason)}${r.note ? `<em class="sub">${esc(r.decidedBy)}: ${esc(r.note)}</em>` : ''}</td><td>${r.status === 'Pending' && nextOf(r) ? esc(nextOf(r).who) + '<em class="sub">' + esc(B.flow.lab(nextOf(r))) + ' · step ' + (B.flow.curIdx(stg(r)) + 1) + ' of ' + stg(r).length + '</em>' : r.autoOpen ? '<em class="sub">HR open date</em>' : esc(r.sup)}</td><td>${pill(r.status)}</td><td class="r">${r.status === 'Pending' ? '<button class="btn sm" data-act="wf-cancel">Cancel</button>' : ''}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty"><span>No applications yet.</span></div></td></tr>'}</tbody></table></div></div>`;
  });

  /* ---- apply ---- */
  B.act['wf-apply'] = () => { const sup = me().name === 'Rahim Uddin' ? 'Board' : (B.emp(me().mgr) || { name: 'HR' }).name; B.modal({ title: 'Apply for Work From Home', wide: true, body: grid(field('From', `<input type="date" class="inp" id="wfm-f" value="${day(D().settings.notice)}">`) + field('To', `<input type="date" class="inp" id="wfm-t" value="${day(D().settings.notice)}">`) + field('Type', '<select class="inp" id="wfm-ty"><option>Full day</option><option>Half day</option></select>') + field('Approval chain', `<input class="inp" value="${esc(B.flow.titles('wfh').join(' → '))}" disabled>`) + field('Reason', '<textarea class="inp" id="wfm-r" rows="2" placeholder="Why do you need to work from home?"></textarea>', 1) + field('Work plan for these days', '<textarea class="inp" id="wfm-p" rows="2" placeholder="What will you deliver?"></textarea>', 1) + field('Contact number', '<input class="inp" id="wfm-ph" value="+880 1711-000000">') + field('Working from', `<input class="inp" value="${esc(homeOf(me().name).address)}" disabled>`)) + `<p class="cl-hint">${ic('alert', 14)} Up to ${D().settings.maxDays} WFH days a month. Apply at least ${D().settings.notice} day(s) before. Approval goes ${esc(B.flow.titles('wfh').join(' → '))}. On an HR open date no approval is needed.</p>`, foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="wf-save" data-sup="${esc(sup)}">Submit application</button>` }); };
  B.act['wf-save'] = (t) => {
    const n = me().name, f = B.$('#wfm-f').value, to = B.$('#wfm-t').value || f, r = B.$('#wfm-r').value.trim(), ty = B.$('#wfm-ty').value, S = D().settings;
    if (!f || !r) { B.toast('Dates and reason are required', 'bad'); return; } if (to < f) { B.toast('End date is before the start date', 'bad'); return; } const open = B.flow.rangeOpen(f, to); if (!open && f < day(S.notice)) { B.toast(`Apply at least ${S.notice} day(s) in advance`, 'bad'); return; }
    if (D().requests.some((x) => x.emp === n && (x.status === 'Pending' || x.status === 'Approved') && x.from <= to && x.to >= f)) { B.toast('You already have a WFH application for these dates', 'bad'); return; }
    const req = { from: f, to, type: ty }, days = daysOf(Object.assign({}, req)); if (!days) { B.toast('Selected dates are weekly offs', 'bad'); return; }
    if (!open && usedIn(n, monthKey(f)) + days > S.maxDays) { B.toast(`Monthly limit of ${S.maxDays} days would be exceeded`, 'bad'); return; }
    rq(n, f, to, ty, r, open ? 'Approved' : 'Pending', t.dataset.sup, { plan: B.$('#wfm-p').value.trim(), phone: B.$('#wfm-ph').value.trim(), created: today(), autoOpen: open, decidedBy: open ? 'HR open date' : '' }); done(open ? 'HR open date: no approval needed. You can give attendance on those days' : 'Application sent to ' + t.dataset.sup + ' (1 of ' + B.flow.titles('wfh').length + ' approvals)');
  };
  B.act['wf-cancel'] = (t) => { reqById(rid(t)).status = 'Cancelled'; done('Application cancelled'); };
  B.act['wf-myloc'] = () => locModal(me().name, 'wf-do-myloc');
  B.act['wf-do-myloc'] = (t) => { const h = homeOf(t.dataset.id); Object.assign(h, { address: B.$('#wfm-ad').value.trim() || h.address, lat: pick.lat, lng: pick.lng, status: 'Pending' }); done('Location updated. HR will verify it'); };

  /* ---- check in / out ---- */
  const SRC = [['gps', 'Use my device location'], ['sim-home', 'Simulate: at home (design preview)'], ['sim-out', 'Simulate: 430 m away (design preview)'], ['sim-none', 'Simulate: location unavailable']];
  B.act['wf-in'] = () => { fixSource = 'gps'; lastFix = null; B.modal({ title: 'Check in', body: `<p style="margin-bottom:12px">Your location will be verified against your registered home (${D().settings.radius} m zone).</p>${field('Location source', `<select class="inp" id="wfm-src">${SRC.map((s) => `<option value="${s[0]}">${s[1]}</option>`).join('')}</select>`)}<p class="cl-hint" style="margin-top:10px">${ic('lock', 14)} Your browser will ask for permission when using the device location.</p>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="wf-verify">Verify location</button>' }); };
  B.act['wf-verify'] = () => { fixSource = B.$('#wfm-src').value; const n = me().name, h = homeOf(n); B.$('.modal-b').innerHTML = `<div class="empty"><span>${ic('location', 30)}</span><b>Getting your location…</b></div>`; getFix(h, fixSource, (f, err) => { lastFix = withZone(h, f); showCheck(err); }); };
  const showCheck = (err) => {
    const n = me().name, h = homeOf(n), S = D().settings, p = lastFix, late = new Date() > new Date(today() + 'T' + S.start + ':00').getTime() + S.grace * 60000;
    const items = [{ kind: 'home', lat: h.lat, lng: h.lng, r: S.radius }].concat(p ? [{ kind: 'pin', lat: p.lat, lng: p.lng, label: 'You', state: p.in ? 'ok' : 'bad' }] : []);
    B.modal({ title: 'Verify your location', wide: true, body: `${p ? `<div class="wf-map">${mapSVG(items, { w: 760, h: 260 })}</div><div class="cl-net"><span>Distance from home</span><b>${p.dist} m</b><span>GPS accuracy</span><b>±${p.acc} m</b><span>Zone</span><b>${p.in ? 'Inside the allowed zone' : 'Outside (limit ' + S.radius + ' m)'}</b></div>` : `<div class="as-issue">${ic('alert', 15)}<span>We could not get your location${err ? ' (' + esc(err) + ')' : ''}. You can still check in; HR will see it as “No location”.</span></div>`}
      ${late ? `<p class="cl-hint">${ic('clock', 14)} You are checking in after ${S.start} + ${S.grace} min, so this will be marked late.</p>` : ''}${(!p || !p.in) && S.reasonOutside ? field('Reason', '<textarea class="inp" id="wfm-n" rows="2" placeholder="Why is your location different or unavailable?"></textarea>') : ''}`, foot: `<button class="btn" data-act="wf-in">Try again</button><button class="btn primary" data-act="wf-do-in">Confirm check-in</button>` });
  };
  B.act['wf-do-in'] = () => {
    const n = me().name, S = D().settings, p = lastFix, note = (B.$('#wfm-n') || {}).value || '';
    if ((!p || !p.in) && S.reasonOutside && !note.trim()) { B.toast('Please add a reason', 'bad'); return; }
    const late = Date.now() > new Date(today() + 'T' + S.start + ':00').getTime() + S.grace * 60000;
    D().sessions.push({ id: uid('ss'), emp: n, date: today(), in: Date.now(), out: 0, inLoc: p, outLoc: null, trail: [], breaks: [], note: note.trim(), summary: '', review: '', late, source: fixSource });
    save(); B.closeModal(); rerender(); B.toast('Checked in at ' + hm(Date.now()));
  };
  B.act['wf-break'] = () => { const s = sessionToday(me().name); if (onBreak(s)) { s.breaks.find((b) => !b.e).e = Date.now(); } else s.breaks.push({ s: Date.now(), e: 0 }); save(); rerender(); };
  B.act['wf-ping'] = () => { const s = sessionToday(me().name); if (s) ping(s, false); };
  B.act['wf-out'] = () => { const s = sessionToday(me().name); B.modal({ title: 'Check out', body: `<div class="cl-net"><span>Checked in</span><b>${hm(s.in)}</b><span>Total worked</span><b>${dur(worked(s))}</b><span>Location readings</span><b>${s.trail.length + (s.inLoc ? 1 : 0)}</b></div><div style="margin-top:14px">${field('What did you work on today?', '<textarea class="inp" id="wfm-n" rows="3" placeholder="Short daily work summary"></textarea>')}</div>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="wf-do-out">Confirm check-out</button>' }); };
  B.act['wf-do-out'] = () => {
    const v = B.$('#wfm-n').value.trim(); if (!v) { B.toast('Add a short work summary', 'bad'); return; }
    const s = sessionToday(me().name), h = homeOf(s.emp), fin = (f) => { const p = withZone(h, f); s.out = Date.now(); s.outLoc = p; s.summary = v; (s.breaks || []).forEach((b) => { if (!b.e) b.e = s.out; }); save(); B.closeModal(); rerender(); B.toast('Checked out · ' + dur(worked(s))); };
    if (s.source === 'gps') getFix(h, 'gps', fin); else { const last = s.trail[s.trail.length - 1] || s.inLoc; fin(last ? { lat: last.lat, lng: last.lng, acc: last.acc } : null); }
  };

  /* =========================== SUPERVISOR: TEAM WFH =========================== */
  page('team-wfh', () => {
    const d = D(), n = me().name, t = today(), pend = d.requests.filter((r) => r.status === 'Pending' && r.sup === n && B.flow.curIdx(stg(r)) === 0), team = B.role === 'employee' ? TEAM : [];
    const rows = team.map((m) => { const s = d.sessions.find((x) => x.emp === m && x.date === t), a = d.requests.find((r) => r.emp === m && r.status === 'Approved' && r.from <= t && r.to >= t); return [m, s ? (s.out ? 'Checked out' : 'Checked in') : a ? 'Approved, not checked in' : 'In office / not applied', s]; });
    return `${B.head('Team WFH Approvals', 'Approve work-from-home applications from your team and see who is working remotely today.', '', [{ label: 'HR', href: '#/' }, { label: 'Work From Home' }, { label: 'Team Approvals' }])}
      ${kp([Kp('inbox', 'Waiting for me', pend.length, pend.length ? 'warn' : ''), Kp('home', 'Team working from home today', rows.filter((r) => r[1] !== 'In office / not applied').length), Kp('alert', 'Location flags', rows.filter((r) => r[2] && flagged(r[2])).length, 'bad')])}
      <div class="cl-queue">${pend.length ? pend.map((r) => `<div class="card pad cl-q" data-id="${r.id}"><div class="cl-q-h">${B.avatar(r.emp, 40)}<div><b>${esc(r.emp)}</b><span>${r.id} · applied ${fmtS(r.created)}</span></div><strong>${daysOf(r)} d</strong></div><dl class="kv" style="margin-top:12px"><div><dt>Dates</dt><dd>${fmtS(r.from)}${r.to !== r.from ? ' – ' + fmtS(r.to) : ''} · ${r.type}</dd></div><div><dt>Reason</dt><dd>${esc(r.reason)}</dd></div>${r.plan ? `<div><dt>Work plan</dt><dd>${esc(r.plan)}</dd></div>` : ''}<div><dt>Used this month</dt><dd>${usedIn(r.emp, monthKey(r.from), r.id)} of ${d.settings.maxDays} days</dd></div></dl><div class="as-act"><button class="btn sm" data-act="wfr-view">Details</button><span class="grow"></span><button class="btn sm" data-act="wf-reject">${ic('x', 14)}Reject</button><button class="btn sm primary" data-act="wf-approve">${ic('check', 14)}Approve</button></div></div>`).join('') : `<div class="card pad empty">${ic('check-circle', 34)}<b>No applications waiting</b></div>`}</div>
      ${rows.length ? `<h3 class="ct" style="margin:22px 0 10px">My team today</h3><div class="card table-card"><div class="tscroll"><table class="dt"><tbody>${rows.map((r) => `<tr><td>${who(r[0])}</td><td>${r[1]}</td><td>${r[2] ? `${hm(r[2].in)}${r[2].out ? ' – ' + hm(r[2].out) : ''} · ${r[2].inLoc ? r[2].inLoc.dist + ' m from home' : 'no location'}` : '—'}</td><td>${r[2] ? pill(status(r[2])) : ''}</td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
  });
  B.act['wf-approve'] = (t) => { const r = reqById(rid(t)); B.flow.approveOne(stg(r), me().name); if (B.flow.overall(stg(r)) === 'Approved') { Object.assign(r, { status: 'Approved', decidedBy: me().name, decidedAt: today() }); done('Approved. ' + r.emp + ' can check in on those days'); } else done('Approved. Forwarded to ' + nextOf(r).who + ' (' + B.flow.lab(nextOf(r)) + ')'); };
  B.act['wf-reject'] = (t) => B.modal({ title: 'Reject application', body: field('Reason (visible to the employee)', '<textarea class="inp" id="wfm-n" rows="3"></textarea>'), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="wf-decide" data-id="${rid(t)}" data-v="Rejected">Reject</button>` });
})();
