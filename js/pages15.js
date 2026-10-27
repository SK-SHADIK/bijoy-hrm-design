/* Bijoy HRMS — Attendance gaps: Outside-office duty, Manual attendance, Early leave & going out,
   Mobile attendance security, WFH location/IP check, Attendance reports (feeds Payroll via B.attMonthly / B.attAdj).
   Data lives in localStorage (own key) — same pattern as pages10/pages11. */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const KEY = 'bijoy-att15-db-v1', AKEY = 'bijoy-attendance-db-v1';
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const day = (n, from) => { const d = from ? new Date(from + 'T00:00') : new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const nowT = () => { const d = new Date(); return B.pad(d.getHours()) + ':' + B.pad(d.getMinutes()); };
  const stamp = () => today() + ' ' + nowT();
  const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const fmtS = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—');
  const isFri = (d) => new Date(d + 'T00:00').getDay() === 5;
  const wk = (d) => new Date(d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short' });
  const mon = (d) => (d || today()).slice(0, 7);
  const monthMd = (k) => { const n = new Date(); const d = new Date(n.getFullYear(), n.getMonth(), 1 + k); return iso(d) > today() ? today() : iso(d); };
  const me = () => (B.role === 'employee' ? B.ME : B.ADMIN_EMP);
  const isHR = () => B.role !== 'employee';
  const HRN = 'Rahim Uddin';
  const who = (n) => `<span class="as-who">${B.avatar(n, 26)}<span>${esc(n)}</span></span>`;
  const Kp = (i, t, v, tn) => B.kpi(i, t, v, null, null, tn);
  const kp = (a) => `<section class="kpis sm lv-stats" style="grid-template-columns:repeat(${a.length},minmax(0,1fr))">${a.join('')}</section>`;
  const tabs = (list, cur, act) => `<div class="seg sm as-tabs">${list.map((t) => `<button class="${t[0] === cur ? 'on' : ''}" data-act="${act}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>`;
  const field = (l, c, full) => `<div class="fld" ${full ? 'style="grid-column:1/-1"' : ''}><label>${l}</label>${c}</div>`;
  const grid = (c) => `<div class="fgrid" style="grid-template-columns:1fr 1fr">${c}</div>`;
  const rid = (t) => t.closest('[data-id]').dataset.id;
  const crumbs = (m, l) => [{ label: 'HR', href: '#/' }, { label: m }, { label: l }];
  const note = (t, ico) => `<div class="as-note" style="margin-bottom:12px">${ic(ico || 'alert', 14)} ${t}</div>`;
  const sel = (opts, v, attrs) => `<select class="inp" ${attrs || ''}>${opts.map((o) => { const [val, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${val === v ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
  const PILL = { Pending: 'warn', Approved: 'ok', Rejected: 'bad', 'Absent (LWP)': 'bad', Open: 'warn', Accepted: 'ok', 'Marked absent': 'bad', 'Device blocked': 'bad', 'Late request': 'warn', Present: 'ok', Late: 'warn', 'Extreme late': 'bad', Absent: 'bad', Leave: 'info', WFH: 'info', 'Outside duty': 'info', Holiday: 'mute', 'Without approval': 'bad', 'Beyond 3': 'warn', Pass: 'ok', Flag: 'bad', 'Late entry': 'warn', 'Half-day deducted': 'bad', 'Offline punch': 'warn', Entered: 'ok' };
  const pill = (s) => B.pill(s, PILL[s] || 'mute');
  const emps = () => B.EMPLOYEES.filter((e) => e.status !== 'Left');
  const E = (i) => { const l = emps(); return l[i % l.length]; };
  const byId = (id) => B.emp(id) || { id, name: id, dept: '', desig: '' };
  const mgrName = (e) => { const m = e && B.emp(e.mgr); return m ? m.name : HRN; };
  const headName = (e) => { const h = B.EMPLOYEES.slice(1, 9).filter((x) => !e || x.dept !== e.dept); return h[B.hash((e ? e.id : 'x') + 'fh') % h.length].name; };
  const T = (heads, rows, empty) => `<div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr>${heads.map((h) => `<th${/^~/.test(h) ? ' class="r"' : ''}>${h.replace(/^~/, '')}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.join('') : `<tr><td colspan="${heads.length}" class="muted" style="text-align:center;padding:22px">${empty || 'Nothing here yet'}</td></tr>`}</tbody></table></div></div>`;
  const csvBtn = (n) => `<button class="btn" data-act="a15-export" data-name="${n}">${ic('download', 15)}Export CSV</button>`;
  const hav = (a, b, c, d) => { const R = 6371000, r = Math.PI / 180, dl = (c - a) * r, dg = (d - b) * r, x = Math.sin(dl / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const hm = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const mm = (n) => B.pad(Math.floor(n / 60)) + ':' + B.pad(n % 60);
  const OFFICE = [23.7806, 90.4193];

  /* ---------- approval stages (Line Manager -> HR; HR can approve at any stage) ---------- */
  const mkSt = (titles, status, e) => titles.map((t, i) => { const w = t === 'HR' ? HRN : t === 'Functional Head' ? headName(e) : mgrName(e); const s = { t, sub: '', who: w, s: 'Pending', by: '', at: '', note: '' }; if (status === 'Approved') Object.assign(s, { s: 'Approved', by: w, at: day(-1) }); if (status === 'Rejected' && i === 0) Object.assign(s, { s: 'Rejected', by: w, at: day(-1), note: 'Client meeting postponed' }); return s; });
  const cur = (st) => st.findIndex((s) => s.s === 'Pending');
  const overall = (st) => (st.some((s) => s.s === 'Rejected') ? 'Rejected' : st.every((s) => s.s === 'Approved') ? 'Approved' : 'Pending');
  const canAct = (s) => isHR() || s.who === me().name;
  const trk = (st) => (B.flow ? B.flow.tracker(B.flow.items(st)) : `<span class="muted">${st.map((s) => esc(s.t) + ': ' + s.s).join(' → ')}</span>`);

  /* =====================================================================
     STORE + SEED
     ===================================================================== */
  let db = null;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  const D = () => { if (!db) { try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} if (!db || !db.od) { db = { seq: { od: 0, ma: 0, el: 0, ev: 0 } }; seed(); save(); } } return db; };
  const nid = (k, p) => p + B.pad(++D().seq[k], 4);
  const loadA = () => { try { return JSON.parse(localStorage.getItem(AKEY)) || {}; } catch (e) { return {}; } };
  const adjList = () => { const a = loadA(); return ((a.adjustments || {}).earlyLeave) || []; };
  const saveAdj = (list) => { const a = loadA(); a.adjustments = Object.assign(a.adjustments || {}, { earlyLeave: list }); try { localStorage.setItem(AKEY, JSON.stringify(a)); } catch (e) {} };
  Object.defineProperty(B, 'attAdj', { configurable: true, get: () => ({ earlyLeave: adjList().map((x) => ({ emp: x.emp, name: x.name, month: x.month, decision: x.decision })) }) });

  /* day status calculation used by Manual attendance */
  const punchesOf = (id, date) => { const r = B.rng('pc' + id + date); const i = 555 + Math.round(r() * 40), o = 1050 + Math.round(r() * 60); return { in: mm(i), out: mm(o) }; };
  function dayStat(inT, outT) {
    if (!inT || !outT) return { status: 'Missing punch', hours: '—' };
    const d = hm(inT) - 570, st = []; st.push(d <= 15 ? 'On time' : d <= 30 ? 'Late' : 'Extreme late'); if (hm(outT) < 1050) st.push('Early leave');
    return { status: st.join(' + '), hours: ((hm(outT) - hm(inT)) / 60).toFixed(1) + ' h' };
  }
  const snap = (inT, outT) => Object.assign({ in: inT || '', out: outT || '' }, dayStat(inT, outT));
  const applyMa = (r) => { const p = r.before; return snap(r.field === 'in' ? r.time : p.in, r.field === 'out' ? r.time : p.out); };

  function seed() {
    const d = db;
    const mk = (i, over) => Object.assign({ id: nid('od', 'OD-'), emp: E(i).id, type: 'Client visit', from: day(2), to: day(2), place: 'Gulshan-2, Dhaka', purpose: 'Client meeting', lat: 23.7925, lng: 90.4078, radius: 300, late: false, at: day(-1), informed: day(-1) }, over);
    const od = (i, over, status) => { const r = mk(i, over); r.st = mkSt(r.late ? ['Functional Head', 'HR'] : ['Line Manager', 'HR'], status, byId(r.emp)); r.status = status === 'LWP' ? 'Absent (LWP)' : overall(r.st); if (status === 'LWP') r.st = mkSt(['Functional Head', 'HR'], 'Pending', byId(r.emp)); return r; };
    d.od = [
      od(14, { from: day(3), to: day(3), place: 'Motijheel, Dhaka (Client: BRAC Bank)', purpose: 'Onsite router configuration', lat: 23.7330, lng: 90.4172, radius: 250 }),
      od(3, { type: 'Direct from home on official duty', from: day(1), to: day(1), place: 'Home, Mirpur-10', purpose: 'Early site survey in Mirpur; going straight from home', lat: 23.8069, lng: 90.3687, radius: 200 }),
      od(5, { from: day(-3), to: day(-2), place: 'Agrabad, Chattogram', purpose: 'POP installation visit', lat: 22.3256, lng: 91.8123, radius: 500, at: day(-6), informed: day(-6) }, 'Approved'),
      od(7, { type: 'Field / outside duty', from: day(-4), to: day(-4), place: 'Narayanganj Port', purpose: 'Equipment pickup', lat: 23.6238, lng: 90.5, radius: 400, at: day(-7), informed: day(-7) }, 'Rejected'),
      od(9, { late: true, from: day(-1), to: day(-1), place: 'Uttara Sector 7', purpose: 'Emergency link restoration, no time to apply before', lat: 23.8759, lng: 90.3795, radius: 300, at: day(0), informed: day(0) }),
      od(11, { late: true, from: day(-6), to: day(-6), place: 'Savar EPZ', purpose: 'Client visit (applied after 48 h)', lat: 23.8, lng: 90.25, radius: 300, at: day(0), informed: day(0) }, 'LWP'),
      od(16, { from: day(4), to: day(5), place: 'Sylhet Tea Estate', purpose: 'Wireless link survey', lat: 24.8949, lng: 91.8687, radius: 800 }, 'Approved'),
      od(2, { from: day(6), to: day(6), place: 'Banani, Dhaka', purpose: 'Vendor meeting', lat: 23.7937, lng: 90.4066, radius: 200 })
    ];
    d.od[1].st[0].s = 'Approved'; d.od[1].st[0].by = d.od[1].st[0].who; d.od[1].st[0].at = day(0);
    /* manual attendance */
    const ma = (i, k, field, time, cause, reason, status, extra) => { const e = E(i), date = monthMd(k), r = Object.assign({ id: nid('ma', 'MA-'), emp: e.id, date, cause, field, time, reason, proof: field === 'in' ? 'door-log.png' : '', status, reqBy: e.name, at: date + ' 18:40', before: null, after: null, appBy: '', note: '', late: date < today() }, extra); const p = punchesOf(e.id, date); r.before = snap(field === 'in' ? '' : p.in, field === 'out' ? '' : p.out); if (status === 'Approved' || status === 'Entered') { r.after = applyMa(r); r.appBy = HRN; } return r; };
    d.ma = [ma(14, 99, 'out', '18:05', 'Missing check-out', 'Phone battery died before leaving', 'Pending'), ma(12, 99, 'in', '09:25', 'Forgot to punch', 'Was on a client call at entry', 'Pending'), ma(6, 0, 'in', '09:40', 'Device or app failure', 'ZKTeco reader showed network error', 'Approved'), ma(8, 1, 'out', '17:55', 'Missing check-out', 'Left urgently, forgot to punch out', 'Rejected', { appBy: HRN, note: 'No supporting evidence provided' }), ma(3, 2, 'in', '09:20', 'Forgot to punch', 'Reason as per HR instruction', 'Entered', { reqBy: HRN, proof: 'hr-register.pdf' }), ma(14, 3, 'in', '09:55', 'Forgot to punch', 'Forgot after long weekend', 'Approved'), ma(14, 4, 'out', '18:10', 'Device or app failure', 'Mobile app crashed on check-out', 'Approved')];
    d.audit = d.ma.filter((r) => r.after).map((r) => ({ at: r.date + ' 19:10', action: r.status === 'Entered' ? 'Entered by HR' : 'Approved', emp: r.emp, reqBy: r.reqBy, appBy: r.appBy, old: r.before.in + ' / ' + r.before.out + ' — ' + r.before.status, nw: r.after.in + ' / ' + r.after.out + ' — ' + r.after.status }));
    /* early leave */
    const el = (i, k, t, status, reason, over) => Object.assign({ id: nid('el', 'EL-'), emp: E(i).id, date: monthMd(k), time: t, reason, status }, over);
    d.el = [el(4, 0, '16:30', 'Approved', 'Bank work'), el(4, 2, '16:00', 'Approved', 'Child school meeting'), el(4, 4, '15:45', 'Approved', 'Doctor appointment'), el(4, 6, '16:15', 'Approved', 'Family emergency'), el(6, 1, '16:40', 'Approved', 'Passport office'), el(6, 5, '17:00', 'Approved', 'Visitor at home'), el(8, 3, '15:30', 'Without approval', 'Left without informing manager'), el(10, 2, '16:20', 'Without approval', 'Left early, informed later'), el(14, 7, '16:45', 'Pending', 'Utility bill appointment'), el(12, 8, '17:10', 'Rejected', 'Shopping', { note: 'Month-end closing' })];
    d.eo = [{ id: 'G1', emp: E(5).id, date: day(-1), out: '12:40', back: '13:50', informed: 'LM + HR', purpose: 'Bank visit' }, { id: 'G2', emp: E(9).id, date: day(-2), out: '15:10', back: '16:25', informed: 'LM + HR', purpose: 'Courier pickup' }, { id: 'G3', emp: E(13).id, date: day(-2), out: '11:00', back: '13:30', informed: 'Not informed', purpose: 'Personal' }, { id: 'G4', emp: E(2).id, date: day(0), out: '14:05', back: '', informed: 'LM + HR', purpose: 'Client lunch (outside)' }];
    d.adj = adjList(); if (!d.adj.length) { const x = d.el.find((r) => r.emp === E(10).id); saveAdj([{ id: x.id, emp: x.emp, name: E(10).name, month: mon(x.date), decision: 'late', at: day(-1) }]); }
    /* mobile security */
    const MOD = ['Samsung Galaxy A34', 'Xiaomi Redmi Note 12', 'Realme C55', 'Oppo A78', 'iPhone 13', 'Vivo Y27', 'Infinix Hot 30', 'Google Pixel 6a'];
    d.dev = emps().slice(0, 26).map((e, i) => ({ emp: e.id, model: MOD[B.hash(e.id) % MOD.length], did: 'DV-' + (B.hash(e.id + 'd') % 900000 + 100000), reg: day(-30 - (i * 7) % 90), on: i % 9 !== 5, selfie: i % 4 !== 3, blocked: false }));
    d.chg = [{ id: 'DC1', emp: E(3).id, from: d.dev[3].model, to: 'iPhone 14', reason: 'Old phone broken', at: day(-1), status: 'Pending' }, { id: 'DC2', emp: E(9).id, from: d.dev[9].model, to: 'Samsung Galaxy S23', reason: 'Replaced handset', at: day(-3), status: 'Pending' }, { id: 'DC3', emp: E(6).id, from: d.dev[6].model, to: 'Oppo Reno 8', reason: 'Upgraded phone', at: day(-8), status: 'Approved' }];
    const ev = (i, type, det, over) => Object.assign({ id: nid('ev', 'EV-'), emp: E(i).id, type, at: day(-1 - (i % 3)) + ' ' + mm(540 + (i * 37) % 120), det, status: 'Open' }, over);
    d.ev = [ev(4, 'Mock GPS', { msg: 'Mock location provider enabled (developer options)', lat: 23.8103, lng: 90.4125 }), ev(7, 'Impossible travel', { a: { t: '09:12', lat: 23.8103, lng: 90.4125, p: 'Dhaka (Mirpur)' }, b: { t: '09:52', lat: 22.3569, lng: 91.7832, p: 'Chattogram' } }), ev(11, 'Offline punch', { punched: '09:28', synced: '11:05', msg: 'No data connection at site; synced when online' }, { status: 'Accepted' }), ev(13, 'Offline punch', { punched: '09:41', synced: '09:58', msg: 'Weak signal in basement' }), ev(15, 'Mock GPS', { msg: 'Fake GPS app "GPS Joystick" detected', lat: 23.7806, lng: 90.4193 }), ev(10, 'Impossible travel', { a: { t: '09:30', lat: 23.7806, lng: 90.4193, p: 'Tejgaon office' }, b: { t: '09:38', lat: 23.9, lng: 90.31, p: 'Savar' } }), ev(2, 'Device mismatch', { msg: 'Punch from unregistered device "Xiaomi 12T" (registered: ' + d.dev[2].model + ')' })];
    /* WFH check */
    const MODES = ['both', 'location', 'ip'];
    d.wfh = emps().slice(0, 24).map((e, i) => ({ emp: e.id, lat: +(23.74 + (B.hash(e.id + 'la') % 1000) / 9000).toFixed(5), lng: +(90.36 + (B.hash(e.id + 'lo') % 1000) / 9000).toFixed(5), radius: [100, 150, 200][i % 3], cidr: '103.' + (100 + B.hash(e.id) % 90) + '.' + (B.hash(e.id + 'x') % 250) + '.0/24' + (i % 5 === 0 ? ', 10.8.0.0/16 (VPN)' : ''), mode: MODES[i % 3] }));
    d.wflag = [[2, 0.0019, 0, '45.64.12.7'], [5, 0.0005, 0.0003, ''], [8, 0.04, 0.02, '103.19.88.4'], [12, 0, 0, '182.16.4.9']].map((a, k) => { const c = d.wfh[a[0]]; const lat = c.lat + a[1], lng = c.lng + a[2], ip = a[3] || c.cidr.split('/')[0].replace(/\.0$/, '.' + (20 + k)); return { id: 'WF' + (k + 1), emp: c.emp, date: day(-k - 1), time: '09:' + B.pad(10 + k * 7), lat, lng, ip, status: 'Open', note: '' }; });
  }

  /* =====================================================================
     PLUMBING
     ===================================================================== */
  const F = { od: { tab: 'mine' }, ma: { tab: 'req', f: '' }, el: { tab: 'early' }, ms: { tab: 'events', type: '', st: '' }, wf: { tab: 'cfg', test: null }, rp: { tab: 'daily', date: today(), month: mon(), emp: '', rdate: day(-1) } }, PG = {}; let curP = '';
  const rerender = () => { const v = B.$('#view .fade'); if (v && PG[curP]) v.innerHTML = PG[curP](); };
  const page = (n, fn) => { PG[n] = fn; B.page[n] = () => { curP = n; D(); return fn(); }; };
  const done = (msg) => { save(); B.closeModal(); rerender(); if (msg) B.toast(msg); };
  const cancel = '<button class="btn" data-act="close-modal">Cancel</button>';
  const val = (id) => (B.$('#' + id) || {}).value || '';
  const empSel = (id, v, locked) => sel(emps().map((e) => [e.id, e.name + ' · ' + e.dept]), v, `id="${id}" ${locked ? 'disabled' : ''}`);
  const rejModal = (kind, id, req) => B.modal({ title: 'Reject request', body: field('Reason' + (req ? ' (required)' : ''), '<textarea class="inp" id="a15m-rej" rows="3" placeholder="Why is this rejected?"></textarea>', true), foot: `${cancel}<button class="btn primary" data-act="a15-rej-do" data-kind="${kind}" data-id="${id}" data-req="${req ? 1 : 0}">Reject</button>` });

  /* =====================================================================
     1. OUTSIDE DUTY
     ===================================================================== */
  const odLate = (from) => (from < today() ? { late: true, expired: Date.now() > new Date(from + 'T00:00').getTime() + 72 * 3600e3, deadline: day(2, from) } : { late: false });
  B.outsideDuty = (empId, date) => (D().od.find((r) => r.emp === empId && r.status === 'Approved' && r.from <= date && r.to >= date) || null);
  page('outside-duty', () => {
    const L = D().od, hr = isHR(), mine = L.filter((r) => r.emp === me().id), apr = L.filter((r) => r.status === 'Pending' && (hr || r.st[cur(r.st)].who === me().name));
    const t = !hr && F.od.tab === 'all' ? 'mine' : F.od.tab, list = t === 'mine' ? mine : t === 'appr' ? apr : L;
    const row = (r) => { const e = byId(r.emp), i = cur(r.st), can = r.status === 'Pending' && i >= 0 && canAct(r.st[i]);
      return `<tr data-id="${r.id}"><td><b>${r.id}</b><em class="sub">${fmtS(r.at)}</em></td><td>${who(e.name)}</td><td>${esc(r.type)}${r.late ? '<em class="sub" style="color:var(--bad,#c0392b)">Late justification</em>' : ''}</td><td>${fmtS(r.from)}${r.to !== r.from ? ' – ' + fmtS(r.to) : ''}<em class="sub">${wk(r.from)}</em></td>
      <td>${esc(r.place)}<em class="sub">${r.lat.toFixed(4)}, ${r.lng.toFixed(4)} · ±${r.radius} m</em></td><td>${esc(r.purpose)}</td><td>${trk(r.st)}${r.status === 'Pending' ? `<em class="sub">HR informed ${fmtS(r.informed)}</em>` : ''}</td><td>${pill(r.status)}${r.status === 'Approved' ? `<em class="sub">${ic('phone', 12)} Use mobile attendance. This place is your allowed location.</em>` : r.status === 'Rejected' ? '<em class="sub">Attend office or apply leave</em>' : r.status === 'Absent (LWP)' ? '<em class="sub">Treated as absent (LWP)</em>' : ''}</td>
      <td class="r">${can ? `<button class="btn sm primary" data-act="a15-od-ok">Approve${hr && r.st[i].who !== HRN ? ' (HR)' : ''}</button><button class="btn sm" data-act="a15-od-no">Reject</button>` : ''}</td></tr>`; };
    return `${B.head('Outside-Office Duty', 'Request to work outside the office or go straight from home on official duty. Approved place becomes your allowed attendance location.', `<button class="btn primary" data-act="a15-od-new">${ic('plus', 16)}New duty request</button>`, crumbs('Shift & Attendance', 'Outside Duty'))}
      ${kp([Kp('briefcase', 'My requests', mine.length), Kp('clock', 'Pending approval', L.filter((r) => r.status === 'Pending').length, 'warn'), Kp('check-circle', 'Approved', L.filter((r) => r.status === 'Approved').length, 'ok'), Kp('alert', 'Treated as absent', L.filter((r) => r.status === 'Absent (LWP)').length, 'bad')])}
      ${note('<b>Rule:</b> Line Manager approval must be in place <b>before</b> the duty; HR is informed at the same time (HR can approve at any stage). A request made after the duty date is only a <b>late justification</b>, approved by the Functional Head within <b>48 hours</b> of the duty day. After 48 h the day is <b>treated as absent (LWP)</b> and cannot be requested.')}
      <div class="filterbar">${tabs([['mine', 'My requests'], ['appr', 'Approvals (' + apr.length + ')']].concat(hr ? [['all', 'All']] : []), t, 'a15-od-tab')}</div>
      ${T(['Request', 'Employee', 'Type', 'Duty date', 'Allowed location', 'Purpose', 'Approval', 'Status', '~'], list.slice().sort((a, b) => b.id.localeCompare(a.id)).map(row), 'No requests in this tab')}`;
  });
  B.act['a15-od-tab'] = (t) => { F.od.tab = t.dataset.t; rerender(); };
  const odHint = () => { const f = val('a15m-from'), el = B.$('#a15m-warn'); if (!el) return; const x = odLate(f); el.className = 'as-note'; el.innerHTML = !f ? '' : !x.late ? `${ic('check-circle', 14)} Advance request. Line Manager approves first, HR is informed now.` : x.expired ? `${ic('alert', 14)} <b>Treated as absent (LWP).</b> The 48 h window (until ${fmt(x.deadline)} end of day) has passed. This request is blocked.` : `${ic('alert', 14)} Duty date is in the past: filed as <b>late justification</b>, needs Functional Head approval by ${fmt(x.deadline)}.`; };
  B.chg.a15odf = odHint; B.inp.a15odf = odHint;
  B.act['a15-od-new'] = () => B.modal({ wide: true, title: 'New outside-office duty request', body: grid(field('Employee', empSel('a15m-emp', me().id, !isHR())) + field('Type', sel(['Client visit', 'Field / outside duty', 'Direct from home on official duty'], 'Client visit', 'id="a15m-type"')) + field('Duty from', `<input type="date" class="inp" id="a15m-from" value="${day(1)}" data-chg="a15odf">`) + field('Duty to', `<input type="date" class="inp" id="a15m-to" value="${day(1)}">`) + field('Place / client', '<input class="inp" id="a15m-place" placeholder="e.g. BRAC Bank, Motijheel">', true) + field('Purpose', '<input class="inp" id="a15m-purpose" placeholder="What will you do there?">', true) + field('Allowed latitude', '<input class="inp" id="a15m-lat" value="23.7806">') + field('Allowed longitude', '<input class="inp" id="a15m-lng" value="90.4193">') + field('Radius (m)', '<input type="number" class="inp" id="a15m-rad" value="300" min="50">')) + '<div class="as-note" id="a15m-warn" style="margin-top:12px"></div>', foot: `${cancel}<button class="btn primary" data-act="a15-od-save">Submit request</button>` });
  B.act['a15-od-save'] = () => {
    const emp = val('a15m-emp'), from = val('a15m-from'), to = val('a15m-to'), place = val('a15m-place').trim(), purpose = val('a15m-purpose').trim(), lat = parseFloat(val('a15m-lat')), lng = parseFloat(val('a15m-lng')), rad = +val('a15m-rad');
    if (!emp || !from || !to || !place || !purpose) { B.toast('Fill all required fields', 'bad'); return; }
    if (to < from) { B.toast('"To" date is before "from" date', 'bad'); return; }
    if (isNaN(lat) || isNaN(lng) || !(rad >= 50)) { B.toast('Enter valid latitude, longitude and radius (min 50 m)', 'bad'); return; }
    const x = odLate(from); if (x.late && x.expired) { B.toast('Blocked: more than 48 h after duty day. Treated as absent (LWP).', 'bad'); return; }
    if (x.late && to >= today()) { B.toast('Past and future days cannot be in one request. Split it.', 'bad'); return; }
    const e = byId(emp);
    D().od.push({ id: nid('od', 'OD-'), emp, type: val('a15m-type'), from, to, place, purpose, lat, lng, radius: rad, late: x.late, at: today(), informed: today(), status: 'Pending', st: mkSt(x.late ? ['Functional Head', 'HR'] : ['Line Manager', 'HR'], 'Pending', e) });
    done(x.late ? 'Late justification sent to Functional Head, HR informed' : 'Request sent to Line Manager, HR informed');
  };
  B.act['a15-od-ok'] = (t) => {
    const r = D().od.find((x) => x.id === rid(t)), i = cur(r.st), x = r.late ? odLate(r.from) : {};
    if (r.late && x.expired) { r.status = 'Absent (LWP)'; done('48 h window passed. Day treated as absent (LWP).'); return; }
    if (isHR() && r.st[i].who !== HRN) r.st.forEach((s) => { if (s.s === 'Pending') Object.assign(s, { s: 'Approved', by: HRN + ' (HR override)', at: today() }); }); else Object.assign(r.st[i], { s: 'Approved', by: me().name, at: today() });
    r.status = overall(r.st); done(r.status === 'Approved' ? 'Approved. Employee can use mobile attendance at ' + r.place : 'Approved at ' + r.st[i].t + ', moved to HR');
  };
  B.act['a15-od-no'] = (t) => rejModal('od', rid(t), false);

  B.act['a15-rej-do'] = (t) => {
    const n = val('a15m-rej').trim(), k = t.dataset.kind, id = t.dataset.id; if (t.dataset.req === '1' && !n) { B.toast('A reason is required to reject', 'bad'); return; }
    if (k === 'od') { const r = D().od.find((x) => x.id === id), i = cur(r.st); Object.assign(r.st[i], { s: 'Rejected', by: me().name, at: today(), note: n }); r.status = 'Rejected'; done('Rejected. Employee should attend office or apply leave.'); } else if (k === 'ma') { const r = D().ma.find((x) => x.id === id); Object.assign(r, { status: 'Rejected', appBy: me().name, note: n }); done('Manual attendance rejected'); }
  };

  /* =====================================================================
     2. MANUAL ATTENDANCE
     ===================================================================== */
  const audit = (action, r, o, n) => D().audit.unshift({ at: stamp(), action, emp: r.emp, reqBy: r.reqBy, appBy: me().name, old: o, nw: n });
  const ba = (s) => `${s.in || '—'} / ${s.out || '—'}<em class="sub">${s.status}${s.hours !== '—' ? ' · ' + s.hours : ''}</em>`;
  page('manual-attendance', () => {
    const hr = isHR(), L = D().ma.filter((r) => hr || r.emp === me().id), t = F.ma.tab;
    const cnt = (f) => L.filter(f).length, tm = mon(), mine = (r) => mon(r.date) === tm;
    let body;
    if (t === 'req') {
      body = T(['Request', 'Employee', 'Date', 'Cause', 'Missing punch', 'Reason / proof', 'Day status before → after', 'Status', '~'], L.slice().reverse().filter((r) => !F.ma.f || r.status === F.ma.f).map((r) => {
        const aft = r.after || applyMa(r);
        return `<tr data-id="${r.id}"><td><b>${r.id}</b><em class="sub">${esc(r.reqBy)}${r.status === 'Entered' ? ' (on behalf)' : ''}</em></td><td>${who(byId(r.emp).name)}</td><td>${fmtS(r.date)}<em class="sub">${wk(r.date)}</em></td><td>${esc(r.cause)}</td><td>${r.field === 'in' ? 'Check-in' : 'Check-out'} <b>${r.time}</b></td><td>${esc(r.reason)}${r.proof ? `<em class="sub">${ic('paperclip', 12)} ${esc(r.proof)}</em>` : ''}${r.note ? `<em class="sub">HR: ${esc(r.note)}</em>` : ''}</td>
        <td>${ba(r.before)}<em class="sub">${ic('right', 12)} ${r.status === 'Rejected' ? 'unchanged' : (r.after ? '' : 'if approved: ') + aft.in + ' / ' + aft.out + ' · ' + aft.status + ' · ' + aft.hours}</em></td>
        <td>${pill(r.status)}${r.late && r.status === 'Pending' ? `<em class="sub" style="color:var(--bad,#c0392b)">${ic('flag', 12)} Late request – needs HR decision</em>` : ''}</td><td class="r">${hr && r.status === 'Pending' ? `<button class="btn sm primary" data-act="a15-ma-ok">Approve</button><button class="btn sm" data-act="a15-ma-no">Reject</button>` : ''}</td></tr>`;
      }), 'No manual attendance requests');
    } else if (t === 'audit') {
      body = T(['Time', 'Action', 'Employee', 'Requested by', 'Approved by', 'Old value', 'New value'], D().audit.filter((a) => hr || a.emp === me().id).map((a) => `<tr><td>${esc(a.at)}</td><td>${pill(a.action === 'Rejected' ? 'Rejected' : a.action === 'Requested' ? 'Pending' : 'Approved')}<em class="sub">${esc(a.action)}</em></td><td>${who(byId(a.emp).name)}</td><td>${esc(a.reqBy)}</td><td>${esc(a.appBy || '—')}</td><td>${esc(a.old)}</td><td>${esc(a.nw)}</td></tr>`));
    } else {
      const ids = [...new Set(D().ma.map((r) => r.emp))].filter((id) => hr || id === me().id);
      body = T(['Employee', 'Dept', 'Requests this month', 'Approved', 'Rejected', 'Pending', 'Flag'], ids.map((id) => { const x = D().ma.filter((r) => r.emp === id && mine(r)), e = byId(id); return `<tr><td>${who(e.name)}</td><td>${esc(e.dept)}</td><td><b>${x.length}</b></td><td>${x.filter((r) => /Approved|Entered/.test(r.status)).length}</td><td>${x.filter((r) => r.status === 'Rejected').length}</td><td>${x.filter((r) => r.status === 'Pending').length}</td><td>${x.length >= 3 ? pill('Late request').replace('Late request', 'Frequent') : '<span class="as-none">—</span>'}</td></tr>`; }), 'No data');
    }
    return `${B.head('Manual Attendance', 'Missing punch correction: forgot to punch, device or app failure, missing check-out.', `<button class="btn primary" data-act="a15-ma-new">${ic('plus', 16)}${hr ? 'Add / request' : 'Request correction'}</button>`, crumbs('Shift & Attendance', 'Manual Attendance'))}
      ${kp([Kp('clock', 'Pending', cnt((r) => r.status === 'Pending'), 'warn'), Kp('flag', 'Late requests', cnt((r) => r.late && r.status === 'Pending'), 'bad'), Kp('check-circle', 'Approved this month', cnt((r) => /Approved|Entered/.test(r.status) && mine(r)), 'ok'), Kp('x', 'Rejected', cnt((r) => r.status === 'Rejected'))])}
      ${note('<b>Policy:</b> request on the <b>same day</b>. Later requests are flagged <b>"Late request – needs HR decision"</b>. HR approves or rejects (reason required on reject) and can enter attendance on behalf of an employee with a reason. Approved changes recalculate late / early leave / hours.')}
      <div class="filterbar">${tabs([['req', 'Requests'], ['audit', 'Audit trail'], ['count', 'Monthly count']], t, 'a15-ma-tab')}${t === 'req' ? `<div style="min-width:160px">${sel([['', 'All status'], 'Pending', 'Approved', 'Rejected', 'Entered'], F.ma.f, 'data-chg="a15maf"')}</div>` : ''}</div>${body}`;
  });
  B.act['a15-ma-tab'] = (t) => { F.ma.tab = t.dataset.t; rerender(); };
  B.chg.a15maf = (t) => { F.ma.f = t.value; rerender(); };
  B.act['a15-ma-new'] = () => B.modal({ wide: true, title: 'Manual attendance (missing punch)', body: grid(field('Employee', empSel('a15m-emp', me().id, !isHR())) + field('Date', `<input type="date" class="inp" id="a15m-date" value="${today()}" max="${today()}">`) + field('Cause', sel(['Forgot to punch', 'Device or app failure', 'Missing check-out'], 'Forgot to punch', 'id="a15m-cause"')) + field('Missing punch', sel([['in', 'Check-in'], ['out', 'Check-out']], 'in', 'id="a15m-field"')) + field('Time', '<input type="time" class="inp" id="a15m-time" value="09:30">') + field('Proof (file)', '<input type="file" class="inp" id="a15m-proof">') + field('Reason', '<textarea class="inp" id="a15m-reason" rows="2"></textarea>', true)) + (isHR() ? `<label class="fl-sw" style="margin-top:12px"><input type="checkbox" id="a15m-behalf"><span><b>Enter on behalf of employee (HR)</b><em>Applied immediately, reason is recorded in the audit trail</em></span></label>` : '') + `<p class="cl-hint">${ic('alert', 14)} Requests for an earlier date are flagged "Late request – needs HR decision".</p>`, foot: `${cancel}<button class="btn primary" data-act="a15-ma-save">Submit</button>` });
  B.act['a15-ma-save'] = () => {
    const emp = val('a15m-emp'), date = val('a15m-date'), time = val('a15m-time'), reason = val('a15m-reason').trim(), f = B.$('#a15m-proof'), proof = f && f.files && f.files[0] ? f.files[0].name : '', behalf = !!(B.$('#a15m-behalf') || {}).checked;
    if (!emp || !date || !time || !reason) { B.toast('Date, time and reason are required', 'bad'); return; }
    if (date > today()) { B.toast('Cannot correct a future date', 'bad'); return; }
    if (D().ma.some((r) => r.emp === emp && r.date === date && r.field === val('a15m-field') && r.status === 'Pending')) { B.toast('A pending request already exists for this punch', 'bad'); return; }
    const p = punchesOf(emp, date), fld = val('a15m-field'), r = { id: nid('ma', 'MA-'), emp, date, cause: val('a15m-cause'), field: fld, time, reason, proof, status: 'Pending', reqBy: me().name, at: stamp(), before: snap(fld === 'in' ? '' : p.in, fld === 'out' ? '' : p.out), after: null, appBy: '', note: '', late: date < today() };
    if (behalf && isHR()) { r.status = 'Entered'; r.after = applyMa(r); r.appBy = me().name; D().ma.push(r); audit('Entered by HR', r, r.before.in + ' / ' + r.before.out + ' — ' + r.before.status, r.after.in + ' / ' + r.after.out + ' — ' + r.after.status); done('Attendance entered on behalf. Day recalculated: ' + r.after.status); return; }
    D().ma.push(r); D().audit.unshift({ at: stamp(), action: 'Requested', emp, reqBy: r.reqBy, appBy: '', old: r.before.in + ' / ' + r.before.out + ' — ' + r.before.status, nw: 'Pending' });
    done(r.late ? 'Submitted. Flagged: Late request – needs HR decision' : 'Submitted for HR approval');
  };
  B.act['a15-ma-ok'] = (t) => { const r = D().ma.find((x) => x.id === rid(t)); r.after = applyMa(r); r.status = 'Approved'; r.appBy = me().name; audit('Approved', r, r.before.in + ' / ' + r.before.out + ' — ' + r.before.status, r.after.in + ' / ' + r.after.out + ' — ' + r.after.status); done('Approved. Day now: ' + r.after.status + ' · ' + r.after.hours); };
  B.act['a15-ma-no'] = (t) => rejModal('ma', rid(t), true);

  /* =====================================================================
     3. EARLY LEAVE & GOING OUT
     ===================================================================== */
  const elFlags = () => { const cnt = {}, out = {}; D().el.slice().sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).forEach((r) => { const k = r.emp + mon(r.date); if (r.status === 'Approved') { cnt[k] = (cnt[k] || 0) + 1; out[r.id] = cnt[k] > 3 ? 'Beyond 3' : ''; } else out[r.id] = r.status === 'Without approval' ? 'Without approval' : ''; }); return out; };
  const durMin = (r) => (r.back ? hm(r.back) - hm(r.out) : 0);
  page('early-leave', () => {
    const hr = isHR(), fl = elFlags(), tab = F.el.tab, tm = mon(), L = D().el.filter((r) => hr || r.emp === me().id), adj = adjList();
    const quota = (id) => L.concat(D().el).filter((r, i, a) => r.emp === id && r.status === 'Approved' && mon(r.date) === tm && a.indexOf(r) === i).length;
    let body;
    if (tab === 'out') body = `<div class="stack">${note('Inform your <b>Line Manager and HR before leaving</b>. Punch out when leaving and punch in on return. Duration is counted from the two punches.')}${T(['Employee', 'Date', 'Out', 'Back', 'Duration', 'Informed LM + HR', 'Purpose'], D().eo.filter((r) => hr || r.emp === me().id).map((r) => `<tr><td>${who(byId(r.emp).name)}</td><td>${fmtS(r.date)}</td><td>${r.out}</td><td>${r.back || '<span class="as-none">Not back yet</span>'}</td><td>${r.back ? Math.floor(durMin(r) / 60) + ' h ' + durMin(r) % 60 + ' m' : '—'}</td><td>${r.informed === 'Not informed' ? pill('Without approval').replace('Without approval', 'Not informed') : 'Yes · ' + r.informed}</td><td>${esc(r.purpose)}${!r.back && (hr || r.emp === me().id) ? ` <button class="btn sm" data-id="${r.id}" data-act="a15-eo-back">Punch in (back)</button>` : ''}</td></tr>`), 'No logs')}</div>`;
    else if (tab === 'count') {
      const ids = [...new Set(D().el.map((r) => r.emp))].filter((id) => hr || id === me().id);
      body = T(['Employee', 'Approved this month', 'Free quota (3 days)', 'Flagged', 'Payroll adjustments'], ids.map((id) => { const q = quota(id), pc = Math.min(100, Math.round(q / 3 * 100)), fg = D().el.filter((r) => r.emp === id && fl[r.id] && mon(r.date) === tm).length, ad = adj.filter((a) => a.emp === id && a.month === tm); return `<tr><td>${who(byId(id).name)}</td><td><b>${q}/3</b></td><td style="min-width:150px"><div style="height:8px;background:var(--line,#e5e7eb);border-radius:6px"><div style="height:8px;width:${pc}%;border-radius:6px;background:${q >= 3 ? 'var(--bad,#c0392b)' : 'var(--accent,#2563eb)'}"></div></div></td><td>${fg ? pill('Open') : '<span class="as-none">—</span>'} ${fg || ''}</td><td>${ad.map((a) => a.decision === 'late' ? 'Late entry +1' : 'Half-day −0.5').join(', ') || '—'}</td></tr>`; }));
    } else body = T(['Request', 'Employee', 'Date', 'Leaving at', 'Reason', 'Month count', 'Status', 'HR decision'], L.slice().reverse().map((r) => {
      const f = fl[r.id], ad = adj.find((a) => a.id === r.id);
      return `<tr data-id="${r.id}"><td><b>${r.id}</b></td><td>${who(byId(r.emp).name)}</td><td>${fmtS(r.date)}</td><td>${r.time}</td><td>${esc(r.reason)}${r.note ? `<em class="sub">${esc(r.note)}</em>` : ''}</td><td>${quota(r.emp)}/3</td><td>${pill(f === 'Without approval' ? 'Without approval' : r.status)}${f === 'Beyond 3' ? pill('Beyond 3') : ''}${r.status === 'Pending' && hr ? `<div><button class="btn sm primary" data-act="a15-el-ok">LM approve</button><button class="btn sm" data-act="a15-el-no">Reject</button></div>` : ''}</td>
      <td>${f ? (ad ? pill(ad.decision === 'late' ? 'Late entry' : 'Half-day deducted') + `<em class="sub">saved for payroll</em>` : `<em class="sub" style="color:var(--bad,#c0392b)">Treated as late entry OR half-day absence (Management discretion)</em>${hr ? `<button class="btn sm" data-act="a15-el-dec" data-d="late">Add to late count</button><button class="btn sm" data-act="a15-el-dec" data-d="halfday">Deduct half day</button>` : '<em class="sub">Awaiting HR</em>'}`) : '<span class="as-none">—</span>'}</td></tr>`; }), 'No early-leave requests');
    const fc = D().el.filter((r) => fl[r.id] && !adj.find((a) => a.id === r.id)).length;
    return `${B.head('Early Leave & Going Out', 'Up to 3 approved early-leave days per month are free. Anything else is flagged for HR.', `<button class="btn" data-act="a15-eo-new">${ic('plus', 15)}Log going out</button><button class="btn primary" data-act="a15-el-new">${ic('plus', 16)}Early leave request</button>`, crumbs('Shift & Attendance', 'Early Leave'))}
      ${kp([Kp('clock', 'Pending LM approval', D().el.filter((r) => r.status === 'Pending').length, 'warn'), Kp('check-circle', 'Approved this month', D().el.filter((r) => r.status === 'Approved' && mon(r.date) === tm).length, 'ok'), Kp('flag', 'Flagged, awaiting HR', fc, 'bad'), Kp('briefcase', 'Out during hours', D().eo.length)])}
      ${note('<b>Rule:</b> early leave needs <b>prior Line Manager approval</b>; 3 approved days per month per employee are free. Without approval, or beyond 3, the day is <b>treated as late entry OR half-day absence (Management discretion)</b>. HR decision is saved for payroll.')}
      <div class="filterbar">${tabs([['early', 'Early leave tracker'], ['count', 'Monthly counter'], ['out', 'Out during hours']], tab, 'a15-el-tab')}</div>${body}`;
  });
  B.act['a15-el-tab'] = (t) => { F.el.tab = t.dataset.t; rerender(); };
  B.act['a15-el-new'] = () => B.modal({ title: 'Early leave request', body: grid(field('Employee', empSel('a15m-emp', me().id, !isHR())) + field('Date', `<input type="date" class="inp" id="a15m-date" value="${today()}">`) + field('Leaving at', '<input type="time" class="inp" id="a15m-time" value="16:30">') + field('Reason', '<input class="inp" id="a15m-reason">')) + `<label class="fl-sw" style="margin-top:12px"><input type="checkbox" id="a15m-noapp"><span><b>Already left without prior approval</b><em>Will be flagged for HR (late entry or half-day)</em></span></label>`, foot: `${cancel}<button class="btn primary" data-act="a15-el-save">Submit</button>` });
  B.act['a15-el-save'] = () => {
    const emp = val('a15m-emp'), date = val('a15m-date'), time = val('a15m-time'), reason = val('a15m-reason').trim(), noapp = !!B.$('#a15m-noapp').checked;
    if (!emp || !date || !time || !reason) { B.toast('Fill all fields', 'bad'); return; }
    if (!noapp && date < today()) { B.toast('Prior approval needed. For a past day tick "Already left without prior approval".', 'bad'); return; }
    D().el.push({ id: nid('el', 'EL-'), emp, date, time, reason, status: noapp ? 'Without approval' : 'Pending' }); done(noapp ? 'Logged. Flagged for HR decision.' : 'Sent to Line Manager for approval');
  };
  B.act['a15-el-ok'] = (t) => { const r = D().el.find((x) => x.id === rid(t)); r.status = 'Approved'; const f = elFlags()[r.id]; done(f ? 'Approved but beyond the 3 free days: flagged for HR' : 'Approved (within the 3 free days)'); };
  B.act['a15-el-no'] = (t) => { const r = D().el.find((x) => x.id === rid(t)); r.status = 'Rejected'; r.note = 'Rejected by Line Manager'; done('Rejected'); };
  B.act['a15-el-dec'] = (t) => { const r = D().el.find((x) => x.id === rid(t)), l = adjList(); l.push({ id: r.id, emp: r.emp, name: byId(r.emp).name, month: mon(r.date), decision: t.dataset.d, at: today() }); saveAdj(l); done(t.dataset.d === 'late' ? 'Added to late count for payroll' : 'Half day will be deducted in payroll'); };
  B.act['a15-eo-new'] = () => B.modal({ title: 'Log going out during office hours', body: grid(field('Employee', empSel('a15m-emp', me().id, !isHR())) + field('Date', `<input type="date" class="inp" id="a15m-date" value="${today()}">`) + field('Out at', `<input type="time" class="inp" id="a15m-out" value="${nowT()}">`) + field('Back at (optional)', '<input type="time" class="inp" id="a15m-back">') + field('Purpose', '<input class="inp" id="a15m-purpose">', true)) + `<label class="fl-sw" style="margin-top:12px"><input type="checkbox" id="a15m-inf" checked><span><b>I informed my Line Manager and HR before leaving</b></span></label>`, foot: `${cancel}<button class="btn primary" data-act="a15-eo-save">Save</button>` });
  B.act['a15-eo-save'] = () => { const out = val('a15m-out'), back = val('a15m-back'), p = val('a15m-purpose').trim(); if (!out || !p) { B.toast('Out time and purpose are required', 'bad'); return; } if (back && back <= out) { B.toast('Back time must be after out time', 'bad'); return; } D().eo.push({ id: uid(), emp: val('a15m-emp'), date: val('a15m-date'), out, back, informed: B.$('#a15m-inf').checked ? 'LM + HR' : 'Not informed', purpose: p }); done('Logged'); };
  const uid = () => 'G' + Date.now().toString(36);
  B.act['a15-eo-back'] = (t) => { const r = D().eo.find((x) => x.id === rid(t)); r.back = nowT() > r.out ? nowT() : r.out; done('Punched in. Duration recorded.'); };

  /* =====================================================================
     4. MOBILE SECURITY
     ===================================================================== */
  const trav = (a, b) => { const km = hav(a.lat, a.lng, b.lat, b.lng) / 1000, min = Math.max(1, hm(b.t) - hm(a.t)); return { km, min, kmh: km / (min / 60) }; };
  page('mobile-security', () => {
    const hr = isHR(), tab = F.ms.tab, L = D().ev, open = L.filter((e) => e.status === 'Open');
    let body;
    if (tab === 'events') {
      const rows = L.filter((e) => (!F.ms.type || e.type === F.ms.type) && (!F.ms.st || e.status === F.ms.st)).map((e) => {
        const d = e.det; let det = esc(d.msg || '');
        if (e.type === 'Impossible travel') { const x = trav(d.a, d.b); det = `${esc(d.a.p)} ${d.a.t} ${ic('right', 12)} ${esc(d.b.p)} ${d.b.t}<em class="sub"><b>${x.km.toFixed(0)} km in ${x.min} min = ${x.kmh.toFixed(0)} km/h</b></em>`; }
        if (e.type === 'Offline punch') det = `${pill('Offline punch')} punched ${d.punched}, synced ${d.synced}<em class="sub">${esc(d.msg)}</em>`;
        if (e.type === 'Mock GPS') det += `<em class="sub">Claimed ${d.lat}, ${d.lng}</em>`;
        return `<tr data-id="${e.id}"><td>${esc(e.at)}</td><td>${who(byId(e.emp).name)}</td><td>${pill(e.type).replace('mute', 'warn')}</td><td>${det}</td><td>${pill(e.status)}</td><td class="r">${hr && e.status === 'Open' ? `<button class="btn sm" data-act="a15-ev" data-d="Accepted">Accept</button><button class="btn sm" data-act="a15-ev" data-d="Marked absent">Mark absent</button><button class="btn sm" data-act="a15-ev" data-d="Device blocked">Block device</button>` : ''}</td></tr>`; });
      body = `<div class="filterbar"><div style="min-width:170px">${sel([['', 'All types'], 'Mock GPS', 'Impossible travel', 'Offline punch', 'Device mismatch'], F.ms.type, 'data-chg="a15mst"')}</div><div style="min-width:150px">${sel([['', 'All status'], 'Open', 'Accepted', 'Marked absent', 'Device blocked'], F.ms.st, 'data-chg="a15msS"')}</div></div>` + T(['Time', 'Employee', 'Type', 'Detail', 'Status', '~'], rows, 'No events match');
    } else if (tab === 'dev') {
      body = T(['Employee', 'Registered device', 'Device ID', 'Registered', 'Mobile attendance', 'Selfie required', 'State'], D().dev.filter((x) => hr || x.emp === me().id).map((x) => `<tr data-id="${x.emp}"><td>${who(byId(x.emp).name)}</td><td>${esc(x.model)}</td><td>${x.did}</td><td>${fmtS(x.reg)}</td><td><label class="fl-sw"><input type="checkbox" data-chg="a15mon" ${x.on ? 'checked' : ''} ${hr ? '' : 'disabled'}><span><b>${x.on ? 'Enabled' : 'Off'}</b></span></label></td><td><label class="fl-sw"><input type="checkbox" data-chg="a15msf" ${x.selfie ? 'checked' : ''} ${hr ? '' : 'disabled'}><span><b>${x.selfie ? 'Required' : 'Optional'}</b></span></label></td><td>${x.blocked ? pill('Device blocked') : pill('Approved').replace('Approved', 'Active')}</td></tr>`));
    } else {
      body = T(['Request', 'Employee', 'Current device', 'New device', 'Reason', 'Date', 'Status', '~'], D().chg.filter((c) => hr || c.emp === me().id).map((c) => `<tr data-id="${c.id}"><td><b>${c.id}</b></td><td>${who(byId(c.emp).name)}</td><td>${esc(c.from)}</td><td><b>${esc(c.to)}</b></td><td>${esc(c.reason)}</td><td>${fmtS(c.at)}</td><td>${pill(c.status)}</td><td class="r">${hr && c.status === 'Pending' ? `<button class="btn sm primary" data-act="a15-dc" data-d="Approved">Approve</button><button class="btn sm" data-act="a15-dc" data-d="Rejected">Reject</button>` : ''}</td></tr>`), 'No change requests');
    }
    return `${B.head('Mobile Attendance Security', 'One registered device per employee, fake-GPS detection, impossible-travel alerts and offline punch review.', `<button class="btn primary" data-act="a15-dc-new">${ic('plus', 16)}Device change request</button>`, crumbs('Shift & Attendance', 'Mobile Security'))}
      ${kp([Kp('alert', 'Open alerts', open.length, 'bad'), Kp('location', 'Mock GPS', L.filter((e) => e.type === 'Mock GPS').length, 'warn'), Kp('truck', 'Impossible travel', L.filter((e) => e.type === 'Impossible travel').length, 'warn'), Kp('wifi', 'Offline punches', L.filter((e) => e.type === 'Offline punch').length), Kp('phone', 'Pending device changes', D().chg.filter((c) => c.status === 'Pending').length, 'warn')])}
      ${note('Each employee can punch from <b>one registered device</b>. Changing it needs HR approval. Impossible travel is flagged when the speed between two punches is above 120 km/h.', 'shield')}
      <div class="filterbar">${tabs([['events', 'Alerts & punches'], ['dev', 'Devices & settings'], ['chg', 'Device change requests']], tab, 'a15-ms-tab')}</div>${body}`;
  });
  B.act['a15-ms-tab'] = (t) => { F.ms.tab = t.dataset.t; rerender(); };
  B.chg.a15mst = (t) => { F.ms.type = t.value; rerender(); };
  B.chg.a15msS = (t) => { F.ms.st = t.value; rerender(); };
  B.chg.a15mon = (t) => { const x = D().dev.find((d) => d.emp === rid(t)); x.on = t.checked; save(); rerender(); B.toast('Mobile attendance ' + (x.on ? 'enabled' : 'disabled') + ' for ' + byId(x.emp).name); };
  B.chg.a15msf = (t) => { const x = D().dev.find((d) => d.emp === rid(t)); x.selfie = t.checked; save(); rerender(); B.toast('Selfie ' + (x.selfie ? 'required' : 'optional')); };
  B.act['a15-ev'] = (t) => { const e = D().ev.find((x) => x.id === rid(t)); e.status = t.dataset.d; if (e.status === 'Device blocked') { const d = D().dev.find((x) => x.emp === e.emp); if (d) { d.blocked = true; d.on = false; } } done(e.status + ': ' + byId(e.emp).name); };
  B.act['a15-dc'] = (t) => { const c = D().chg.find((x) => x.id === rid(t)); c.status = t.dataset.d; if (c.status === 'Approved') { const d = D().dev.find((x) => x.emp === c.emp); if (d) { d.model = c.to; d.reg = today(); d.did = 'DV-' + (B.hash(c.id + c.to) % 900000 + 100000); } } done('Device change ' + c.status.toLowerCase()); };
  B.act['a15-dc-new'] = () => B.modal({ title: 'Device change request', body: grid(field('Employee', empSel('a15m-emp', me().id, !isHR())) + field('New device model', '<input class="inp" id="a15m-to" placeholder="e.g. Samsung Galaxy S23">') + field('Reason', '<input class="inp" id="a15m-reason">', true)), foot: `${cancel}<button class="btn primary" data-act="a15-dc-save">Submit to HR</button>` });
  B.act['a15-dc-save'] = () => { const emp = val('a15m-emp'), to = val('a15m-to').trim(), r = val('a15m-reason').trim(), cu = D().dev.find((d) => d.emp === emp); if (!to || !r) { B.toast('Enter the new device and reason', 'bad'); return; } if (D().chg.some((c) => c.emp === emp && c.status === 'Pending')) { B.toast('A change request is already pending', 'bad'); return; } D().chg.push({ id: 'DC' + (D().chg.length + 1), emp, from: cu ? cu.model : 'None', to, reason: r, at: today(), status: 'Pending' }); done('Sent to HR for approval'); };

  /* =====================================================================
     5. WFH LOCATION / IP CHECK
     ===================================================================== */
  const ip2n = (s) => { const p = s.trim().split('.').map(Number); return p.length === 4 && p.every((x) => x >= 0 && x < 256) ? ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3] : null; };
  const inCidr = (ip, list) => { const n = ip2n(ip); if (n === null) return false; return list.split(',').some((c) => { const m = c.trim().match(/^(\d+\.\d+\.\d+\.\d+)(?:\/(\d+))?/); if (!m) return false; const b = ip2n(m[1]), l = m[2] === undefined ? 32 : +m[2], mask = l === 0 ? 0 : (0xffffffff << (32 - l)) >>> 0; return b !== null && ((n & mask) >>> 0) === ((b & mask) >>> 0); }); };
  const chk = (c, lat, lng, ip) => { const dist = hav(c.lat, c.lng, lat, lng), locOk = dist <= c.radius, ipOk = inCidr(ip, c.cidr), pass = c.mode === 'location' ? locOk : c.mode === 'ip' ? ipOk : locOk && ipOk; return { dist, locOk, ipOk, pass }; };
  page('wfh-ip-check', () => {
    const hr = isHR(), tab = F.wf.tab, od = B.flow && B.flow.isOpen ? B.flow.isOpen(today()) : false;
    let body;
    if (tab === 'cfg') body = T(['Employee', 'Home location (lat, lng)', 'Radius', 'Allowed IP range (CIDR / VPN)', 'Check mode', '~'], D().wfh.filter((c) => hr || c.emp === me().id).map((c) => `<tr data-id="${c.emp}"><td>${who(byId(c.emp).name)}</td><td>${c.lat}, ${c.lng}</td><td>${c.radius} m</td><td>${esc(c.cidr)}</td><td>${pill(c.mode === 'both' ? 'Location + IP' : c.mode === 'ip' ? 'IP only' : 'Location only').replace('mute', 'info')}</td><td class="r">${hr ? `<button class="btn sm" data-act="a15-wf-edit">${ic('edit', 14)}Edit</button>` : ''}</td></tr>`));
    else if (tab === 'test') {
      const t = F.wf.test || { emp: D().wfh[0].emp, lat: D().wfh[0].lat, lng: D().wfh[0].lng, ip: '' }, c = D().wfh.find((x) => x.emp === t.emp) || D().wfh[0], r = F.wf.res;
      body = `<div class="grid-2"><div class="card pad"><h3 class="ct">Test a punch</h3>${grid(field('Employee', sel(D().wfh.map((x) => [x.emp, byId(x.emp).name]), t.emp, 'id="a15t-emp" data-chg="a15wfe"'), true) + field('Punch latitude', `<input class="inp" id="a15t-lat" value="${t.lat}">`) + field('Punch longitude', `<input class="inp" id="a15t-lng" value="${t.lng}">`) + field('Punch IP address', `<input class="inp" id="a15t-ip" value="${esc(t.ip)}" placeholder="e.g. ${c.cidr.split('/')[0].replace(/\.0$/, '.25')}">`, true))}<p class="muted" style="margin:12px 0">Mode: <b>${c.mode}</b> · Registered ${c.lat}, ${c.lng} ±${c.radius} m · ${esc(c.cidr)}</p><button class="btn primary" data-act="a15-wf-test">Run check</button></div>
        <div class="card pad"><h3 class="ct">Result</h3>${r ? `<div class="fl-big">${pill(r.pass ? 'Pass' : 'Flag')}</div><p>Location: <b>${r.locOk ? 'inside' : 'outside'}</b> (${r.dist < 1000 ? r.dist.toFixed(0) + ' m' : (r.dist / 1000).toFixed(1) + ' km'} from home). IP: <b>${r.ipOk ? 'in allowed range' : 'not in range'}</b>.</p><p class="muted">${r.pass ? 'Attendance accepted.' : 'Attendance is flagged and goes to the HR review list.'}</p>` : '<p class="muted">Enter a punch location and IP, then run the check.</p>'}</div></div>`;
    } else body = T(['Employee', 'Date / time', 'Punch location · IP', 'Check', 'Status', 'Note', '~'], D().wflag.filter((f) => hr || f.emp === me().id).map((f) => { const c = D().wfh.find((x) => x.emp === f.emp), r = chk(c, f.lat, f.lng, f.ip); return `<tr data-id="${f.id}"><td>${who(byId(f.emp).name)}</td><td>${fmtS(f.date)} ${f.time}</td><td>${f.lat.toFixed(4)}, ${f.lng.toFixed(4)}<em class="sub">${esc(f.ip)}</em></td><td>${pill(r.locOk ? 'Pass' : 'Flag').replace(/>Pass|>Flag/, (m) => m + ' ').replace('</span>', ' location</span>')} ${pill(r.ipOk ? 'Pass' : 'Flag').replace('</span>', ' IP</span>')}<em class="sub">${r.dist < 1000 ? r.dist.toFixed(0) + ' m' : (r.dist / 1000).toFixed(1) + ' km'} from home</em></td><td>${pill(f.status === 'Open' ? 'Open' : f.status)}</td><td>${esc(f.note || '—')}</td><td class="r">${hr && f.status === 'Open' ? `<button class="btn sm primary" data-act="a15-wf-acc">Accept with note</button><button class="btn sm" data-act="a15-wf-abs">Mark absent</button>` : ''}</td></tr>`; }), 'No flagged WFH punches');
    return `${B.head('WFH Location & IP Check', 'Each employee has a registered home location and allowed IP range. Punches outside them are flagged for HR.', '', crumbs('Work From Home', 'Location & IP Check'))}
      ${kp([Kp('home', 'Employees configured', D().wfh.length), Kp('flag', 'Flagged, open', D().wflag.filter((f) => f.status === 'Open').length, 'bad'), Kp('check-circle', 'Accepted', D().wflag.filter((f) => f.status === 'Accepted').length, 'ok'), Kp('x', 'Marked absent', D().wflag.filter((f) => f.status === 'Marked absent').length)])}
      ${note(`On an <b>HR open date</b> WFH approval is skipped, but this location / IP check <b>still applies</b>.${B.flow ? ' Today is ' + (od ? '<b>an open date</b>.' : 'not an open date.') : ''}`)}
      <div class="filterbar">${tabs([['cfg', 'Registered locations'], ['test', 'Test panel'], ['flag', 'Flagged for HR']], tab, 'a15-wf-tab')}</div>${body}`;
  });
  B.act['a15-wf-tab'] = (t) => { F.wf.tab = t.dataset.t; rerender(); };
  B.chg.a15wfe = (t) => { const c = D().wfh.find((x) => x.emp === t.value); F.wf.test = { emp: c.emp, lat: c.lat, lng: c.lng, ip: '' }; F.wf.res = null; rerender(); };
  B.act['a15-wf-test'] = () => { const emp = val('a15t-emp'), c = D().wfh.find((x) => x.emp === emp), lat = parseFloat(val('a15t-lat')), lng = parseFloat(val('a15t-lng')), ip = val('a15t-ip').trim(); if (isNaN(lat) || isNaN(lng)) { B.toast('Enter a valid latitude and longitude', 'bad'); return; } if (c.mode !== 'location' && ip2n(ip) === null) { B.toast('Enter a valid IPv4 address', 'bad'); return; } F.wf.test = { emp, lat, lng, ip }; F.wf.res = chk(c, lat, lng, ip); rerender(); B.toast(F.wf.res.pass ? 'Pass' : 'Flagged for HR', F.wf.res.pass ? '' : 'bad'); };
  B.act['a15-wf-edit'] = (t) => { const c = D().wfh.find((x) => x.emp === rid(t)); B.modal({ title: 'Registered home: ' + esc(byId(c.emp).name), body: `<div data-id="${c.emp}">` + grid(field('Latitude', `<input class="inp" id="a15m-lat" value="${c.lat}">`) + field('Longitude', `<input class="inp" id="a15m-lng" value="${c.lng}">`) + field('Radius (m)', `<input type="number" class="inp" id="a15m-rad" value="${c.radius}">`) + field('Check mode', sel([['location', 'Location only'], ['ip', 'IP only'], ['both', 'Location + IP']], c.mode, 'id="a15m-mode"')) + field('Allowed IP range (comma separated CIDR, VPN)', `<input class="inp" id="a15m-cidr" value="${esc(c.cidr)}">`, true)) + '</div>', foot: `${cancel}<button class="btn primary" data-act="a15-wf-save" data-id="${c.emp}">Save</button>` }); };
  B.act['a15-wf-save'] = (t) => { const c = D().wfh.find((x) => x.emp === t.dataset.id), lat = parseFloat(val('a15m-lat')), lng = parseFloat(val('a15m-lng')), rad = +val('a15m-rad'), cidr = val('a15m-cidr').trim(); if (isNaN(lat) || isNaN(lng) || !(rad >= 20) || !cidr) { B.toast('Valid latitude, longitude, radius (min 20 m) and IP range are required', 'bad'); return; } if (!/^\d+\.\d+\.\d+\.\d+(\/\d+)?/.test(cidr)) { B.toast('IP range must start with an IPv4 address or CIDR', 'bad'); return; } Object.assign(c, { lat, lng, radius: rad, cidr, mode: val('a15m-mode') }); done('Saved'); };
  B.act['a15-wf-acc'] = (t) => B.modal({ title: 'Accept flagged WFH punch', body: field('Note (required)', '<textarea class="inp" id="a15m-note" rows="3" placeholder="Why is this accepted?"></textarea>', true), foot: `${cancel}<button class="btn primary" data-act="a15-wf-acc-do" data-id="${rid(t)}">Accept</button>` });
  B.act['a15-wf-acc-do'] = (t) => { const n = val('a15m-note').trim(); if (!n) { B.toast('A note is required', 'bad'); return; } const f = D().wflag.find((x) => x.id === t.dataset.id); Object.assign(f, { status: 'Accepted', note: n }); done('Accepted with note'); };
  B.act['a15-wf-abs'] = (t) => { const f = D().wflag.find((x) => x.id === rid(t)); Object.assign(f, { status: 'Marked absent', note: 'Marked absent by HR' }); done('Marked absent'); };

  /* =====================================================================
     6. REPORTS
     ===================================================================== */
  const DEPT_ROSTER = ['Normal 09:30', 'Early 08:30', 'Late 10:30', 'Open'];
  const dayStatus = (e, d) => {
    if (d > today()) return { s: '—', in: '', out: '' }; if (isFri(d)) return { s: 'Holiday', in: '', out: '' };
    const od = B.outsideDuty && B.outsideDuty(e.id, d); if (od) return { s: 'Outside duty', in: '', out: '' };
    const r = B.rng('ds' + e.id + d), v = Math.floor(r() * 100), i = 555 + Math.floor(r() * 25);
    if (v < 56) return { s: 'Present', in: mm(i), out: mm(1060 + Math.floor(r() * 50)) }; if (v < 70) return { s: 'Late', in: mm(586 + Math.floor(r() * 14)), out: mm(1080) }; if (v < 74) return { s: 'Extreme late', in: mm(605 + Math.floor(r() * 50)), out: mm(1100) };
    if (v < 80) return { s: 'Absent', in: '', out: '' }; if (v < 86) return { s: 'Leave', in: '', out: '' }; if (v < 94) return { s: 'WFH', in: mm(560 + Math.floor(r() * 30)), out: mm(1060) }; return { s: 'Outside duty', in: '', out: '' };
  };
  B.attMonthly = (month) => { const ad = adjList().filter((a) => a.month === month); return emps().map((e) => { const r = B.rng('am' + e.id + month), late = Math.floor(r() * r() * 8), xl = Math.floor(r() * r() * 3), absent = Math.floor(r() * r() * 4), lwp = Math.floor(r() * r() * 4) / 2, el = Math.floor(r() * 4); const mine = ad.filter((a) => a.emp === e.id); return { emp: e.id, name: e.name, dept: e.dept, late: late + mine.filter((a) => a.decision === 'late').length, extremeLate: xl, absent, lwp: lwp + mine.filter((a) => a.decision === 'halfday').length * 0.5, earlyLeave: el }; }); };
  const months = () => [0, 1, 2].map((i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); return iso(d).slice(0, 7); });
  const mLabel = (m) => new Date(m + '-01T00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  page('att-reports', () => {
    const tab = F.rp.tab, tabsL = [['daily', 'Daily'], ['monthly', 'Monthly summary'], ['dept', 'Late & absent by dept'], ['flags', 'WFH & duty flags'], ['trail', 'Location trail'], ['manual', 'Manual log'], ['shift', 'Shift changes'], ['dev', 'Device log']];
    const mSel = `<div style="min-width:170px">${sel(months().map((m) => [m, mLabel(m)]), F.rp.month, 'data-chg="a15rm"')}</div>`, dSel = (k) => `<input type="date" class="inp" value="${F.rp[k]}" max="${today()}" data-chg="a15rd" data-k="${k}" style="max-width:170px">`;
    let body = '', fil = '', name = tab;
    if (tab === 'daily') {
      const R = emps().slice(0, 40).map((e) => ({ e, d: dayStatus(e, F.rp.date) })), c = (s) => R.filter((x) => x.d.s === s).length; fil = dSel('date');
      body = kp([Kp('check-circle', 'Present', c('Present'), 'ok'), Kp('clock', 'Late', c('Late'), 'warn'), Kp('alert', 'Extreme late', c('Extreme late'), 'bad'), Kp('x', 'Absent', c('Absent'), 'bad'), Kp('calendar', 'Leave', c('Leave')), Kp('home', 'WFH', c('WFH')), Kp('briefcase', 'Outside duty', c('Outside duty'))]) + T(['Employee', 'Dept', 'Status', 'In', 'Out'], R.map((x) => `<tr><td>${who(x.e.name)}</td><td>${esc(x.e.dept)}</td><td>${pill(x.d.s)}</td><td>${x.d.in || '—'}</td><td>${x.d.out || '—'}</td></tr>`));
    } else if (tab === 'monthly' || tab === 'dept') {
      const M = B.attMonthly(F.rp.month); fil = mSel;
      if (tab === 'monthly') body = note('This table feeds <b>Payroll</b> (late entries, absences, LWP and early leaves) through <code>B.attMonthly(month)</code>. HR early-leave decisions are already added.', 'dollar') + T(['Employee', 'Dept', '~Late entries', '~Extreme late', '~Absent', '~LWP days', '~Early leaves'], M.map((x) => `<tr><td>${who(x.name)}</td><td>${esc(x.dept)}</td><td class="r">${x.late}</td><td class="r">${x.extremeLate}</td><td class="r">${x.absent}</td><td class="r">${x.lwp}</td><td class="r">${x.earlyLeave}</td></tr>`).concat([`<tr><td><b>Total</b></td><td></td>${['late', 'extremeLate', 'absent', 'lwp', 'earlyLeave'].map((k) => `<td class="r"><b>${M.reduce((s, x) => s + x[k], 0)}</b></td>`).join('')}</tr>`]));
      else {
        const g = (keyf) => { const o = {}; M.forEach((x) => { const k = keyf(x); o[k] = o[k] || { n: 0, late: 0, xl: 0, ab: 0 }; o[k].n++; o[k].late += x.late; o[k].xl += x.extremeLate; o[k].ab += x.absent; }); return Object.entries(o).sort((a, b) => b[1].late + b[1].ab - a[1].late - a[1].ab).map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td class="r">${v.n}</td><td class="r">${v.late}</td><td class="r">${v.xl}</td><td class="r">${v.ab}</td><td class="r">${(v.late / v.n).toFixed(1)}</td></tr>`); };
        const H = ['~Staff', '~Late', '~Extreme late', '~Absent', '~Late / person'];
        body = `<h3 class="ct" style="margin:6px 0 10px">By department</h3>${T(['Department'].concat(H), g((x) => x.dept || 'Unassigned'))}<h3 class="ct" style="margin:20px 0 10px">By roster</h3>${T(['Roster'].concat(H), g((x) => DEPT_ROSTER[B.hash(x.emp) % 4]))}`;
      }
    } else if (tab === 'flags') {
      const rows = []; D().wflag.forEach((f) => rows.push([f.date, f.emp, 'WFH location / IP', 'Punch outside registered home or IP range', f.status])); D().od.forEach((r) => { if (r.late || r.status !== 'Approved') rows.push([r.from, r.emp, 'Outside duty', (r.late ? 'Late justification. ' : '') + r.place, r.status]); }); D().ev.forEach((e) => rows.push([e.at.slice(0, 10), e.emp, 'Mobile: ' + e.type, e.det.msg || (e.type === 'Impossible travel' ? 'Distance/time mismatch' : ''), e.status]));
      body = T(['Date', 'Employee', 'Flag', 'Detail', 'Status'], rows.sort((a, b) => b[0].localeCompare(a[0])).map((x) => `<tr><td>${fmtS(x[0])}</td><td>${who(byId(x[1]).name)}</td><td>${esc(x[2])}</td><td>${esc(x[3])}</td><td>${pill(x[4])}</td></tr>`));
    } else if (tab === 'trail') {
      const e = byId(F.rp.emp || emps()[14].id), d = F.rp.rdate, r = B.rng('tr' + e.id + d), w = D().wfh.find((x) => x.emp === e.id), base = w ? [w.lat, w.lng] : OFFICE;
      const pts = [['Check-in', 555], ['Ping', 650], ['Ping', 780], ['Ping', 900], ['Ping', 990], ['Check-out', 1070]].map((p, i) => { const off = i === 2 && B.hash(e.id + d) % 3 === 0 ? 0.0035 : r() * 0.0006, lat = base[0] + off, lng = base[1] + r() * 0.0006, dist = hav(base[0], base[1], lat, lng); return { ev: p[0], t: mm(p[1] + Math.floor(r() * 10)), lat, lng, dist, ok: dist <= (w ? w.radius : 300) }; });
      fil = `<div style="min-width:220px">${sel(emps().slice(0, 40).map((x) => [x.id, x.name]), e.id, 'data-chg="a15re"')}</div>${dSel('rdate')}`;
      body = note('Trail is captured only with employee consent while the app is on duty. Geofence: ' + (w ? 'registered home ±' + w.radius + ' m' : 'office ±300 m') + '.', 'location') + T(['Time', 'Event', 'Latitude, longitude', 'Distance from base', 'Geofence'], pts.map((p) => `<tr><td>${p.t}</td><td>${p.ev}</td><td>${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</td><td>${p.dist.toFixed(0)} m</td><td>${pill(p.ok ? 'Pass' : 'Flag')}</td></tr>`));
    } else if (tab === 'manual') {
      body = T(['Request', 'Employee', 'Date', 'Cause', 'Before', 'After', 'Approved by', 'Status'], D().ma.map((r) => `<tr><td>${r.id}</td><td>${who(byId(r.emp).name)}</td><td>${fmtS(r.date)}</td><td>${esc(r.cause)}</td><td>${ba(r.before)}</td><td>${r.after ? ba(r.after) : '—'}</td><td>${esc(r.appBy || '—')}</td><td>${pill(r.status)}</td></tr>`));
    } else if (tab === 'shift') {
      const rows = []; try { if (B.shiftChanges) B.shiftChanges().forEach((x) => rows.push([x.name, x.type + ' · ' + x.status + ' · ' + x.from + (x.to !== x.from ? ' → ' + x.to : ''), x.roster + (x.partner ? ' (swap with ' + x.partner + ')' : ''), 'Shift change & swap'])); } catch (e) {}
      try { const fl = JSON.parse(localStorage.getItem('bijoy-flow-db-v1') || 'null'); if (fl && fl.assign) Object.keys(fl.assign).forEach((id) => { const r = (fl.rosters || []).find((x) => x.id === fl.assign[id]); rows.push([byId(id).name, 'Roster assigned', r ? r.name + (r.start ? ' · ' + r.start + '–' + r.end : '') : fl.assign[id], 'Roster master']); }); } catch (e) {}
      try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/shift/i.test(k) && k !== KEY) { const v = JSON.parse(localStorage.getItem(k)); (Array.isArray(v) ? v : []).slice(0, 50).forEach((x) => rows.push([x.employee_name || x.employee || x.emp || '—', 'Shift request', x.shift_type || x.shift || JSON.stringify(x).slice(0, 60), k])); } } } catch (e) {}
      body = note('Read-only view of roster / shift changes saved elsewhere in the system.', 'eye') + T(['Employee', 'Change', 'New shift / roster', 'Source'], rows.map((x) => `<tr><td>${esc(x[0])}</td><td>${esc(x[1])}</td><td>${esc(x[2])}</td><td>${esc(x[3])}</td></tr>`), 'No shift changes found in local data');
    } else {
      fil = dSel('date'); const SRC = ['Tip Soi', 'ZKTeco', 'Mobile', 'Mobile (offline)'];
      const R = emps().slice(0, 30).filter((e) => !isFri(F.rp.date) && F.rp.date <= today()).map((e) => { const r = B.rng('dv' + e.id + F.rp.date), s = r() < 0.4 ? 0 : r() < 0.7 ? 1 : r() < 0.93 ? 2 : 3, t = 550 + Math.floor(r() * 60); return { e, s: SRC[s], t: mm(t), sy: s === 3 ? mm(t + 20 + Math.floor(r() * 90)) : '' }; });
      body = kp(SRC.map((s) => Kp(s === 'Mobile (offline)' ? 'wifi' : s === 'Mobile' ? 'phone' : 'fingerprint', s, R.filter((x) => x.s === s).length))) + T(['Employee', 'Source device', 'Punch time', 'Synced at'], R.map((x) => `<tr><td>${who(x.e.name)}</td><td>${x.s === 'Mobile (offline)' ? pill('Offline punch') : esc(x.s)}</td><td>${x.t}</td><td>${x.sy || '—'}</td></tr>`), 'No punches for this date');
    }
    return `${B.head('Attendance Reports', 'Daily, monthly, department, flags, trail, manual log, shift changes and device log.', csvBtn(name), crumbs('Shift & Attendance', 'Attendance Reports'))}
      <div class="filterbar">${tabs(tabsL, tab, 'a15-rp-tab')}${fil}</div>${body}`;
  });
  B.act['a15-rp-tab'] = (t) => { F.rp.tab = t.dataset.t; rerender(); };
  B.chg.a15rm = (t) => { F.rp.month = t.value; rerender(); };
  B.chg.a15rd = (t) => { F.rp[t.dataset.k] = t.value || today(); rerender(); };
  B.chg.a15re = (t) => { F.rp.emp = t.value; rerender(); };
  B.act['a15-export'] = (t) => {
    const tb = B.$('#view table.dt'); const rows = tb ? [...tb.querySelectorAll('tr')].map((tr) => [...tr.children].map((c) => '"' + c.textContent.replace(/\s+/g, ' ').trim().replace(/"/g, '""') + '"').join(',')) : [];
    const fn = 'attendance-' + t.dataset.name + '-' + today() + '.csv';
    try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })); a.download = fn; a.click(); } catch (e) {}
    B.toast('CSV exported: ' + fn + ' (' + Math.max(0, rows.length - 1) + ' rows)');
  };

  /* =====================================================================
     REGISTRATION
     ===================================================================== */
  const reg = [['outside-duty', 'Outside-Office Duty', 'briefcase'], ['manual-attendance', 'Manual Attendance', 'edit'], ['early-leave', 'Early Leave & Going Out', 'logout'], ['mobile-security', 'Mobile Security', 'shield'], ['wfh-ip-check', 'WFH Location & IP Check', 'wifi'], ['att-reports', 'Attendance Reports', 'bars']];
  reg.forEach(([id, label, icon]) => { B.PAGES[id] = { label, icon }; });
  const addNav = (m, id) => { const n = B.NAV.find((x) => x.id === m); if (n && !n.items.includes('p:' + id)) n.items.push('p:' + id); };
  ['outside-duty', 'manual-attendance', 'early-leave', 'mobile-security', 'att-reports'].forEach((id) => addNav('attendance', id));
  addNav('wfh', 'wfh-ip-check');
})();
