/* Bijoy HRMS — Roster gaps: Holiday calendar, Shift change & swap, Roster assignment, Day-type checker.
   Reads (never writes) 'bijoy-flow-db-v1' (rosters, late rule, leaves) and 'bijoy-payroll-lock-v1'.
   Owns 'bijoy-holiday-db-v1' and 'bijoy-roster-db-v1'. Exposes B.rosterOn(empId, date) and B.holiday. */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const day = (n, from) => { const d = from ? new Date(from + 'T00:00') : new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const dow = (d) => new Date(d + 'T00:00').getDay();
  const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const fmtS = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—');
  const wd = (d) => new Date(d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long' });
  const me = () => (B.role === 'employee' ? B.ME : B.ADMIN_EMP);
  const isHR = () => B.role !== 'employee';
  const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 99);
  const who = (n) => `<span class="as-who">${B.avatar(n, 26)}<span>${esc(n)}</span></span>`;
  const Kp = (i, t, v, tn) => B.kpi(i, t, v, null, null, tn);
  const kp = (a) => `<section class="kpis sm lv-stats" style="grid-template-columns:repeat(${a.length},minmax(0,1fr))">${a.join('')}</section>`;
  const tabs = (list, cur, act) => `<div class="seg sm as-tabs">${list.map((t) => `<button class="${t[0] === cur ? 'on' : ''}" data-act="${act}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>`;
  const field = (l, c, full) => `<div class="fld" ${full ? 'style="grid-column:1/-1"' : ''}><label>${l}</label>${c}</div>`;
  const grid = (c) => `<div class="fgrid" style="grid-template-columns:1fr 1fr">${c}</div>`;
  const rid = (t) => t.closest('[data-id]').dataset.id;
  const crumbs = (m, l) => [{ label: 'HR', href: '#/' }, { label: m }, { label: l }];
  const PILL = { Pending: 'warn', Approved: 'ok', Rejected: 'bad', Cancelled: 'mute', 'HR adjustment': 'info', Draft: 'mute', 'MD approved': 'warn', Published: 'ok', Festival: 'warn', Government: 'info', 'Alternate Saturday': 'info', 'On time': 'ok', Late: 'warn', 'Extreme Late': 'bad', Absent: 'bad', Open: 'info', Working: 'ok', 'Day off': 'mute', Covered: 'ok' };
  const pill = (s) => B.pill(s, PILL[s] || 'mute');
  const emps = () => B.EMPLOYEES.filter((e) => e.status !== 'Left');
  const ename = (id) => { const e = B.emp(id); return e ? e.name : id; };
  const empByName = (n) => B.EMPLOYEES.find((e) => e.name === n);
  const mgrName = (e) => { const m = e && B.emp(e.mgr); return m ? m.name : 'Rahim Uddin'; };
  const sel = (opts, v, attrs) => `<select class="inp" ${attrs || ''}>${opts.map((o) => { const [val, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${val === v ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
  const ym = (d) => d.slice(0, 7);
  const mins = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  const rd = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };

  /* ---------- read-only views of other modules ---------- */
  let _raw = null, _fl = {};
  const fl = () => { let r = null; try { r = localStorage.getItem('bijoy-flow-db-v1'); } catch (e) {} if (r !== _raw) { _raw = r; try { _fl = JSON.parse(r) || {}; } catch (e) { _fl = {}; } } return _fl; };
  const DEF_R = [
    { id: 'normal', name: 'Normal', type: 'Normal', start: '09:30', end: '18:30', hours: 9 },
    { id: 'open', name: 'Open', type: 'Open', start: '', end: '', hours: 8 },
    { id: 'morning', name: 'Morning', type: 'Custom', start: '06:00', end: '15:00', hours: 8 },
    { id: 'evening', name: 'Evening', type: 'Custom', start: '14:00', end: '23:00', hours: 8 },
    { id: 'night', name: 'Night', type: 'Custom', start: '22:00', end: '07:00', hours: 8 }
  ];
  const rosters = () => (fl().rosters && fl().rosters.length ? fl().rosters : DEF_R);
  const rosterById = (id) => rosters().find((r) => r.id === id) || rosters()[0];
  const rosterName = (id) => rosterById(id).name;
  const lateRule = () => Object.assign({ grace: 15, extreme: 30, absent: 120 }, fl().late || {});
  const approvedLeaves = () => (fl().leaves || []).filter((l) => l.status !== 'Cancelled' && l.stages && l.stages.length && l.stages.every((s) => s.s === 'Approved'));
  const locked = () => { const a = rd('bijoy-payroll-lock-v1'); return Array.isArray(a) ? a : []; };
  const defaultRosterId = (e) => {
    const R = rosters(), a = (fl().assign || {})[e.id];
    if (a && R.find((r) => r.id === a)) return a;
    const has = (id) => R.find((r) => r.id === id);
    if (e.dept === 'Management' || /^Head|^C[A-Z]O$|Director|Managing/.test(e.desig)) return has('open') ? 'open' : R[0].id;
    if (e.dept === 'Customer Support') { const id = ['morning', 'evening', 'night'][B.hash(e.id) % 3]; return has(id) ? id : R[0].id; }
    return has('normal') ? 'normal' : R[0].id;
  };
  const lateSummary = (r) => (r.type === 'Open' ? `Exempt · ${r.hours} h counted` : `On time ≤ ${lateRule().grace} · Late ≤ ${lateRule().extreme} · Absent > ${lateRule().absent} min`);

  /* =====================================================================
     HOLIDAY STORE  (shape read by the leave module — keep stable)
     ===================================================================== */
  const HK = 'bijoy-holiday-db-v1';
  let hdb = null;
  const hSave = () => { try { localStorage.setItem(HK, JSON.stringify(hdb)); } catch (e) {} };
  const satsFrom = (start, year) => { const out = []; let d = start; while (+d.slice(0, 4) <= year) { if (+d.slice(0, 4) === year) out.push(d); d = day(14, d); } return out; };
  const HOL = (y, st) => [
    ['02-21', 'International Mother Language Day', 'Government'], ['03-17', 'Birthday of Sheikh Mujibur Rahman', 'Government'], ['03-19', 'Eid-ul-Fitr holiday', 'Festival'], ['03-20', 'Eid-ul-Fitr', 'Festival'], ['03-21', 'Eid-ul-Fitr holiday', 'Festival'], ['03-26', 'Independence Day', 'Government'],
    ['04-14', 'Pohela Boishakh', 'Festival'], ['05-01', 'May Day', 'Government'], ['05-26', 'Eid-ul-Adha holiday', 'Festival'], ['05-27', 'Eid-ul-Adha', 'Festival'], ['05-28', 'Eid-ul-Adha holiday', 'Festival'],
    ['08-05', 'July Mass-uprising Day', 'Government'], ['09-04', 'Janmashtami', 'Festival'], ['10-20', 'Bijoya Dashami (Durga Puja)', 'Festival'], ['12-16', 'Victory Day', 'Government'], ['12-25', 'Christmas Day', 'Festival']
  ].map((h) => ({ date: y + '-' + h[0], name: h[1], type: h[2], status: st }));
  const mkYear = (y, startSat, st) => {
    const alt = satsFrom(startSat, y);
    return { year: y, weeklyOff: ['Fri'], altSaturdays: alt, days: HOL(y, st).concat(alt.map((d) => ({ date: d, name: 'Alternate Saturday (off)', type: 'Alternate Saturday', status: st }))).sort((a, b) => a.date.localeCompare(b.date)), wf: st, audit: [{ at: y + '-01-02', by: 'Rahim Uddin', msg: 'Calendar created' }] };
  };
  const H = () => {
    if (!hdb) { hdb = rd(HK); if (!hdb || !hdb.days) { hdb = mkYear(2026, '2026-01-03', 'Published'); hdb.audit = [{ at: '2025-12-28', by: 'Rahim Uddin', msg: 'Draft prepared' }, { at: '2025-12-30', by: 'Managing Director', msg: 'Approved by MD' }, { at: '2026-01-02', by: 'Rahim Uddin', msg: 'Published to all staff' }]; hdb.archive = { 2027: mkYear(2027, '2027-01-02', 'Draft') }; hSave(); } hdb.archive = hdb.archive || {}; }
    return hdb;
  };
  const Y = (y) => { const d = H(); if (y === d.year) return d; return d.archive[y] || (d.archive[y] = { year: y, weeklyOff: ['Fri'], altSaturdays: [], days: [], wf: 'Draft', audit: [] }); };
  const yearOf = (date) => { const d = H(); return +date.slice(0, 4) === d.year ? d : d.archive[+date.slice(0, 4)] || null; };
  /* what is in force on a date */
  function dayInfo(date) {
    const y = yearOf(date), g = dow(date);
    if (y && y.wf === 'Published') {
      const h = y.days.find((x) => x.date === date && x.type !== 'Alternate Saturday');
      if (h) return { type: h.type, name: h.name };
      if (g === 6 && y.altSaturdays.includes(date)) return { type: 'Alternate Saturday', name: 'Alternate Saturday (off)' };
    }
    if (g === 5) return { type: 'Weekly off', name: 'Friday weekly off' };
    return { type: 'Working', name: '' };
  }
  B.holiday = { db: () => H(), info: dayInfo, isOff: (d) => dayInfo(d).type !== 'Working' };

  /* =====================================================================
     ROSTER / SHIFT-CHANGE STORE
     ===================================================================== */
  const RK = 'bijoy-roster-db-v1';
  let rdb = null;
  const rSave = () => { try { localStorage.setItem(RK, JSON.stringify(rdb)); } catch (e) {} };
  const R_ = () => { if (!rdb) { rdb = rd(RK); if (!rdb || !rdb.shifts) { rdb = { maxChanges: 3, seq: 0, shifts: [], assigns: [], log: [], groups: [] }; seedR(); rSave(); } } return rdb; };
  const nid = () => 'SC-' + B.pad(++R_().seq, 4);
  const notify = (to, msg) => R_().log.unshift({ at: new Date().toISOString().slice(0, 16).replace('T', ' '), to, msg });
  const mkSt = (list) => list.map((s) => Object.assign({ t: '', k: '', who: '', s: 'Pending', by: '', at: '', note: '' }, s));
  const curIdx = (st) => st.findIndex((s) => s.s === 'Pending');
  const overall = (st) => (st.some((s) => s.s === 'Rejected') ? 'Rejected' : st.every((s) => s.s === 'Approved') ? 'Approved' : 'Pending');
  const status = (r) => (r.adj ? 'HR adjustment' : overall(r.stages));
  const stagesFor = (r) => {
    const e = B.emp(r.emp), hr = { t: 'HR', k: 'hr', who: 'Rahim Uddin' }, lm = { t: 'Line Manager', k: 'lm', who: mgrName(e) };
    if (r.type === 'Swap') return mkSt([{ t: 'Colleague consent', k: 'col', who: ename(r.partner) }, lm, hr]);
    return mkSt([lm, hr]);
  };
  const OPS = () => R_().groups.filter((g) => g.operational);
  const isOps = (id) => OPS().some((g) => g.members.includes(id));

  function seedR() {
    const d = rdb, A = (n) => (empByName(n) || {}).id;
    const E = B.EMPLOYEES.filter((e) => e.status !== 'Left');
    d.groups = [
      { id: 'g-isp', name: 'ISP Operations', operational: true, members: E.slice(16, 19).map((e) => e.id) },
      { id: 'g-food', name: 'Food Unit', operational: true, members: E.slice(19, 21).map((e) => e.id) },
      { id: 'g-field', name: 'Field Team', operational: true, members: E.slice(21, 24).map((e) => e.id) },
      { id: 'g-lead', name: 'Team Leads', operational: false, members: E.slice(1, 6).map((e) => e.id) }
    ];
    d.assigns = [
      { id: 'RA-1', scope: 'Department', target: 'Sales', roster: 'normal', from: '2026-01-01', by: 'Rahim Uddin', at: '2025-12-30' },
      { id: 'RA-2', scope: 'Group', target: 'g-isp', roster: 'evening', from: '2026-01-01', by: 'Rahim Uddin', at: '2025-12-30' },
      { id: 'RA-3', scope: 'Group', target: 'g-field', roster: 'morning', from: '2026-01-01', by: 'Rahim Uddin', at: '2025-12-30' },
      { id: 'RA-4', scope: 'Employee', target: A('Fatema Khatun') || E[3].id, roster: 'morning', from: day(-30), by: 'Rahim Uddin', at: day(-31) }
    ];
    const sc = (o, st, cur) => {
      const r = Object.assign({ id: nid(), type: 'Temporary', partner: '', partnerRoster: '', to: '', reason: '', created: day(-4), by: 'Employee' }, o);
      r.stages = stagesFor(r);
      if (st === 'Approved') r.stages.forEach((s) => Object.assign(s, { s: 'Approved', by: s.who, at: day(-2) }));
      else (cur ? r.stages.forEach((s, i) => { if (i < cur) Object.assign(s, { s: 'Approved', by: s.who, at: day(-1) }); }) : 0);
      if (st === 'Rejected') Object.assign(r.stages[1], { s: 'Rejected', by: r.stages[1].who, at: day(-1), note: 'Release freeze, need full coverage on those days' });
      d.shifts.push(r); return r;
    };
    const kam = A('Kamrul Hasan') || E[5].id, tas = A('Tasnim Rahman') || E[1].id, mal = A('Maliha Chowdhury') || E[2].id, imr = A('Imran Hossain') || E[6].id, sad = A('Sadia Islam') || E[7].id, mah = A('Mahmud Hasan') || E[8].id;
    const p = sc({ type: 'Permanent', emp: kam, roster: 'evening', from: day(-20), reason: 'Support rota rebalance', by: 'HR' }, 'Approved'); p.stages = [{ t: 'HR', k: 'hr', who: 'Rahim Uddin', s: 'Approved', by: 'Rahim Uddin', at: day(-22), note: '' }];
    sc({ type: 'Swap', emp: tas, partner: mal, roster: 'normal', partnerRoster: 'normal', from: day(3), to: day(3), reason: 'Doctor appointment, swapping with Maliha' }, '', 1);
    sc({ type: 'Temporary', emp: imr, roster: 'morning', from: day(6), to: day(8), reason: 'Child school admission test', by: 'Employee' }, '', 1);
    sc({ type: 'Temporary', emp: mah, roster: 'evening', from: day(10), to: day(11), reason: 'University exam', by: 'Employee' }, 'Rejected', 0);
    sc({ type: 'Temporary', emp: tas, roster: 'morning', from: day(-20), to: day(-20), reason: 'Family function (backdated)', by: 'Employee' }, '', 1);
    const sidA = (n) => (empByName(n) || {}).id, ap = (r) => { r.stages.forEach((x) => Object.assign(x, { s: 'Approved', by: x.who, at: day(-1) })); return r; };
    [['Farhana Akter', 'morning', -9, -9, 'Early client call'], ['Shirin Sultana', 'evening', -6, -4, 'Evening classes this week'], ['Arif Chowdhury', 'night', -2, -1, 'Release night support']].forEach((x) => { const e = sidA(x[0]); if (e) ap(sc({ type: 'Temporary', emp: e, roster: x[1], from: day(x[2]), to: day(x[3]), reason: x[4], by: 'Employee' }, '', 1)); });
    { const a1 = sidA('Sadia Islam'), a2 = sidA('Mitu Rahman'); if (a1 && a2) ap(sc({ type: 'Swap', emp: a1, partner: a2, roster: 'normal', partnerRoster: 'normal', from: day(-3), to: day(-3), reason: 'Personal errand, swapped with Mitu' }, '', 2)); }
    sc({ type: 'Temporary', emp: sad, roster: 'morning', from: day(-40), to: day(-39), reason: 'Bank work', by: 'Line Manager' }, 'Approved');
    d.log = [{ at: day(-22) + ' 10:05', to: ename(kam) + ' + Line Manager', msg: 'Permanent roster change to Evening effective ' + fmt(day(-20)) }, { at: day(-30) + ' 09:00', to: 'Fatema Khatun', msg: 'Roster Morning assigned from ' + fmt(day(-30)) }];
  }

  /* ---------- roster in force ---------- */
  function members(a) {
    if (a.scope === 'Employee') return [a.target];
    if (a.scope === 'Department') return emps().filter((e) => e.dept === a.target).map((e) => e.id);
    const g = R_().groups.find((x) => x.id === a.target); return g ? g.members : [];
  }
  function resolve(id, date) {
    date = date || today();
    const e = B.emp(id); if (!e) return { id: rosters()[0].id, src: 'Default' };
    const s = R_().shifts.filter((r) => status(r) === 'Approved' && (r.type === 'Temporary' || r.type === 'Swap') && r.from <= date && (r.to || r.from) >= date && (r.emp === id || (r.type === 'Swap' && r.partner === id))).pop();
    if (s) return { id: s.emp === id ? s.roster : s.partnerRoster, src: s.type === 'Swap' ? 'Swap ' + s.id : 'Temporary ' + s.id, ref: s.id };
    const cand = [];
    R_().shifts.forEach((r, i) => { if (r.type === 'Permanent' && status(r) === 'Approved' && r.emp === id && r.from <= date) cand.push({ from: r.from, i, id: r.roster, src: 'Permanent ' + r.id }); });
    R_().assigns.forEach((a, i) => { if (a.from <= date && members(a).includes(id)) cand.push({ from: a.from, i: 1000 + i, id: a.roster, src: 'Assigned (' + a.scope.toLowerCase() + ')' }); });
    cand.sort((x, y) => x.from.localeCompare(y.from) || x.i - y.i);
    const c = cand.pop(); if (c) return { id: c.id, src: c.src };
    return { id: defaultRosterId(e), src: 'Default' };
  }
  /* read-only feed of shift changes for reports: [{emp, name, type, roster, partner, from, to, status, reason}] */
  B.shiftChanges = () => R_().shifts.map((r) => ({ emp: r.emp, name: ename(r.emp), type: r.type, roster: rosterName(r.roster), partner: r.partner ? ename(r.partner) : '', from: r.from, to: r.to || r.from, status: status(r), reason: r.reason || '' }));
  B.rosterOn = (empId, date) => { const id = typeof empId === 'object' && empId ? empId.id : empId; return rosterName(resolve(id, date || today()).id); };
  B.rosterInfo = (empId, date) => { const x = resolve(typeof empId === 'object' ? empId.id : empId, date || today()); return Object.assign({ roster: rosterById(x.id) }, x); };

  /* ---------- page plumbing ---------- */
  const F = { hc: { tab: 'cal', year: 2026, month: new Date().getMonth() }, sc: { tab: 'all' }, ra: { tab: 'emp', dept: '', scope: 'Employee', f: {} }, dd: null }, PG = {}; let cur = '';
  const rerender = () => { const v = B.$('#view .fade'); if (v && PG[cur]) v.innerHTML = PG[cur](); };
  const page = (n, fn) => { PG[n] = fn; B.page[n] = () => { cur = n; return fn(); }; };
  const doneR = (msg) => { rSave(); B.closeModal(); rerender(); if (msg) B.toast(msg); };
  const doneH = (msg) => { hSave(); B.closeModal(); rerender(); if (msg) B.toast(msg); };
  const foot = (act, label, id) => `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="${act}" ${id ? `data-id="${id}"` : ''}>${label}</button>`;

  /* =====================================================================
     1. HOLIDAY CALENDAR
     ===================================================================== */
  const WF = ['Draft', 'MD approved', 'Published'];
  let PEND = null;
  /* every edit goes through gate(): published calendars are locked, HR must leave a note */
  function gate(desc, fn) {
    const y = Y(F.hc.year);
    const run = (note) => { fn(y); if (y.wf === 'MD approved') { y.wf = 'Draft'; y.days.forEach((d) => (d.status = 'Draft')); } y.audit.push({ at: today(), by: me().name, msg: desc + (note ? ' — note: ' + note : '') }); doneH(); };
    if (!isHR()) { B.toast('Only HR can edit the holiday calendar', 'bad'); return; }
    if (y.wf === 'Published') {
      PEND = run;
      B.modal({ title: 'Calendar is published and locked', body: `<p class="muted">${y.year} was published to all staff. Only HR can edit it, and the edit is recorded with a note.</p>` + field('Reason for this edit (kept in the audit trail)', '<textarea class="inp" id="p14-note" rows="3"></textarea>', true), foot: foot('hc-gate', 'Save edit') });
    } else run('');
  }
  B.act['hc-gate'] = () => { const n = B.$('#p14-note').value.trim(); if (!n) { B.toast('A note is required to edit a published calendar', 'bad'); return; } const f = PEND; PEND = null; if (f) f(n); };
  const counts = (y) => {
    let work = 0, d = y.year + '-01-01';
    const end = y.year + '-12-31', off = new Set(y.days.map((x) => x.date));
    while (d <= end) { if (dow(d) !== 5 && !off.has(d)) work++; d = day(1, d); }
    return { fest: y.days.filter((x) => x.type === 'Festival').length, gov: y.days.filter((x) => x.type === 'Government').length, alt: y.altSaturdays.length, work };
  };
  function calGrid(y) {
    const m = F.hc.month, first = new Date(y.year, m, 1), dim = new Date(y.year, m + 1, 0).getDate(), lead = (first.getDay() + 1) % 7; // Sat-first
    let h = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((x) => `<div class="h">${x}</div>`).join('');
    for (let i = 0; i < lead; i++) h += '<div class="c x"></div>';
    for (let n = 1; n <= dim; n++) {
      const d = y.year + '-' + B.pad(m + 1) + '-' + B.pad(n), e = y.days.find((x) => x.date === d && x.type !== 'Alternate Saturday'), alt = y.altSaturdays.includes(d), g = dow(d);
      const cls = e ? e.type : alt ? 'Alt' : g === 5 ? 'Fri' : '';
      h += `<button class="c ${cls} ${d === today() ? 'today' : ''}" data-act="hc-cell" data-d="${d}"><b>${n}</b>${e ? `<span>${esc(e.name)}</span>` : alt ? '<span>Alt. Saturday off</span>' : g === 5 ? '<span>Weekly off</span>' : ''}</button>`;
    }
    return `<div class="p14-cal">${h}</div><div class="p14-lg"><span><i style="background:rgba(245,158,11,.5)"></i>Festival</span><span><i style="background:rgba(59,130,246,.5)"></i>Government</span><span><i style="background:rgba(168,85,247,.5)"></i>Alternate Saturday</span><span><i style="background:rgba(128,128,128,.4)"></i>Friday weekly off</span><span class="muted">Click a date to add or change.</span></div>`;
  }
  page('holiday-calendar', () => {
    const y = Y(F.hc.year), t = F.hc.tab, c = counts(y), MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const wfi = WF.map((s, i) => ({ s, i, c: WF.indexOf(y.wf) > i ? 'done' : WF.indexOf(y.wf) === i ? (y.wf === 'Published' ? 'done' : 'now') : '' }));
    const trk = `<div class="fl-trk-wrap"><ul class="cl-trk fl-trk">${wfi.map((x) => `<li class="${x.c}"><i>${x.c === 'done' ? ic('check', 13) : x.i + 1}</i><span>${x.s}<em>${['HR prepares', 'Managing Director', 'HR publishes'][x.i]}</em></span></li>`).join('')}</ul></div>`;
    const btn = y.wf === 'Draft' ? `<button class="btn primary" data-act="hc-wf" data-to="MD approved">${ic('check', 15)}Record MD approval</button>` : y.wf === 'MD approved' ? `<button class="btn primary" data-act="hc-wf" data-to="Published">${ic('send', 15)}Publish to all staff</button><button class="btn" data-act="hc-wf" data-to="Draft">Back to draft</button>` : `<span class="muted">${ic('lock', 14)} Locked. HR edits need a note.</span>`;
    let body;
    if (t === 'cal') body = `<div class="card pad"><div class="p14-row"><button class="btn sm" data-act="hc-m" data-n="-1">${ic('left', 14)}</button><b style="min-width:130px;text-align:center">${MN[F.hc.month]} ${y.year}</b><button class="btn sm" data-act="hc-m" data-n="1">${ic('right', 14)}</button>${sel(MN.map((n, i) => [String(i), n]), String(F.hc.month), 'data-chg="hcmonth"')}</div>${calGrid(y)}</div>`;
    else if (t === 'list') body = `<div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Date</th><th>Day</th><th>Holiday</th><th>Type</th><th>Status</th><th class="r"></th></tr></thead><tbody>${y.days.filter((x) => x.type !== 'Alternate Saturday').map((x) => `<tr data-id="${x.date}"><td><b>${fmt(x.date)}</b></td><td>${wd(x.date)}</td><td>${esc(x.name)}</td><td>${pill(x.type)}</td><td>${pill(x.status)}</td><td class="r"><button class="icon-btn sm" data-act="hc-del" aria-label="Remove">${ic('trash', 15)}</button></td></tr>`).join('') || '<tr><td colspan="6"><div class="empty">No holidays yet for ' + y.year + '</div></td></tr>'}</tbody></table></div></div>`;
    else if (t === 'alt') {
      const sats = []; let d = y.year + '-01-01'; while (dow(d) !== 6) d = day(1, d); while (+d.slice(0, 4) === y.year) { sats.push(d); d = day(7, d); }
      body = `<div class="card pad" style="margin-bottom:14px"><h3 class="ct">Alternate Saturday schedule</h3><p class="muted">Working week is Saturday to Thursday. Friday is the weekly off. HR publishes which Saturdays are also off. A supervisor can still ask staff to come in on an off Saturday.</p>
        <div class="p14-row">${field('First off Saturday', `<input type="date" class="inp" id="hc-start" value="${y.altSaturdays[0] || sats[0]}">`)}<button class="btn primary" data-act="hc-gen">${ic('refresh', 15)}Generate every 2nd Saturday</button></div></div>
        <div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Saturday</th><th>Status</th><th class="r">Toggle</th></tr></thead><tbody>${sats.map((s) => { const on = y.altSaturdays.includes(s); return `<tr data-id="${s}"><td><b>${fmt(s)}</b></td><td>${on ? pill('Alternate Saturday') + ' <span class="muted">off</span>' : '<span class="muted">Working day</span>'}</td><td class="r"><button class="btn sm" data-act="hc-alt">${on ? 'Make working' : 'Make off'}</button></td></tr>`; }).join('')}</tbody></table></div></div>`;
    } else if (t === 'ops') body = `<div class="card pad"><h3 class="ct">Operational units</h3><div class="as-note">${ic('alert', 14)} <b>ISP, Food and Field Team</b> set their own weekly holiday through their administration and inform staff in writing. Use a <b>Custom roster</b> for them (Roster Assignment). <b>Company festival and government holidays still apply</b> to them unless they are asked to work on that day, in which case they get <b>compensatory leave</b>.</div>
      <table class="dt" style="margin-top:12px"><thead><tr><th>Unit</th><th>Members</th><th>Weekly-off rule</th></tr></thead><tbody>${OPS().map((g) => `<tr><td><b>${esc(g.name)}</b></td><td>${g.members.length}</td><td>Own weekly holiday, informed in writing · Custom roster</td></tr>`).join('')}</tbody></table></div>`;
    else body = `<div class="card pad"><h3 class="ct">Audit trail</h3><ul class="fl-trail">${y.audit.slice().reverse().map((a) => `<li class="approved"><b>${esc(a.msg)}</b><span>${esc(a.by)} · ${fmt(a.at)}</span></li>`).join('') || '<li>No entries</li>'}</ul></div>`;
    return `${B.head('Holiday Calendar', 'Festival and government holidays are approved by the Managing Director and published by HR at the start of the year.', `${sel([2025, 2026, 2027].map((v) => [String(v), String(v)]), String(F.hc.year), 'data-chg="hcyear"')}<button class="btn primary" data-act="hc-add">${ic('plus', 16)}Add holiday</button>`, crumbs('Shift & Attendance', 'Holiday Calendar'))}
      ${kp([Kp('flag', 'Festival holidays', c.fest, 'warn'), Kp('building', 'Government holidays', c.gov), Kp('calendar', 'Alternate Saturdays off', c.alt), Kp('check-circle', 'Working days', c.work, 'ok'), Kp('lock', 'Status', y.wf)])}
      <div class="card pad" style="margin-bottom:14px"><div class="ct-row"><h3 class="ct">${y.year} approval</h3><div class="p14-row" style="margin:0">${btn}</div></div>${trk}<p class="muted" style="margin:6px 0 0">Applies to all employees including operational units. Weekly off: ${y.weeklyOff.join(', ')}.</p></div>
      <div class="filterbar">${tabs([['cal', 'Calendar'], ['list', 'Holiday list'], ['alt', 'Alternate Saturdays'], ['ops', 'Operational units'], ['audit', 'Audit']], t, 'hc-tab')}</div>${body}`;
  });
  B.act['hc-tab'] = (t) => { F.hc.tab = t.dataset.t; rerender(); };
  B.act['hc-m'] = (t) => { F.hc.month = (F.hc.month + +t.dataset.n + 12) % 12; rerender(); };
  B.chg.hcmonth = (t) => { F.hc.month = +t.value; rerender(); };
  B.chg.hcyear = (t) => { F.hc.year = +t.value; rerender(); };
  B.act['hc-wf'] = (t) => {
    const y = Y(F.hc.year), to = t.dataset.to; if (!isHR()) { B.toast('Only HR can do this', 'bad'); return; }
    if (to === 'Published' && y.wf !== 'MD approved') { B.toast('MD approval is needed before publishing', 'bad'); return; }
    y.wf = to; y.days.forEach((d) => (d.status = to)); y.audit.push({ at: today(), by: to === 'MD approved' ? 'Managing Director' : me().name, msg: to === 'MD approved' ? 'Approved by MD' : to === 'Published' ? 'Published to all staff' : 'Returned to draft' });
    doneH(to === 'Published' ? 'Published. The calendar is now locked' : 'Status: ' + to);
  };
  const addForm = (d) => grid(field('Date', `<input type="date" class="inp" id="hc-d" value="${d}">`) + field('Type', sel(['Festival', 'Government'], 'Festival', 'id="hc-t"')) + field('Holiday name', '<input class="inp" id="hc-n" placeholder="e.g. Eid-ul-Fitr">', true));
  B.act['hc-add'] = () => B.modal({ title: 'Add holiday', body: addForm(F.hc.year + '-01-01'), foot: foot('hc-save', 'Add') });
  B.act['hc-cell'] = (t) => {
    const d = t.dataset.d, y = Y(F.hc.year), e = y.days.find((x) => x.date === d && x.type !== 'Alternate Saturday');
    if (e) B.modal({ title: fmt(d) + ' · ' + wd(d), body: `<p><b>${esc(e.name)}</b> ${pill(e.type)}</p>`, foot: `<button class="btn" data-act="close-modal">Close</button><button class="btn" data-act="hc-delcell" data-d="${d}">Remove holiday</button>` });
    else B.modal({ title: fmt(d) + ' · ' + wd(d), body: addForm(d) + (dow(d) === 6 ? `<p class="muted" style="margin-top:10px">Saturday: <button class="btn sm" data-act="hc-altcell" data-d="${d}">${y.altSaturdays.includes(d) ? 'Make a working Saturday' : 'Make an alternate-Saturday off'}</button></p>` : ''), foot: foot('hc-save', 'Add holiday') });
  };
  B.act['hc-save'] = () => {
    const d = B.$('#hc-d').value, n = B.$('#hc-n').value.trim(), ty = B.$('#hc-t').value;
    if (!d || !n) { B.toast('Date and holiday name are required', 'bad'); return; }
    if (+d.slice(0, 4) !== F.hc.year) { B.toast('Date must be in ' + F.hc.year, 'bad'); return; }
    if (Y(F.hc.year).days.some((x) => x.date === d && x.type !== 'Alternate Saturday')) { B.toast('That date already has a holiday', 'bad'); return; }
    gate('Added ' + n + ' (' + fmtS(d) + ')', (y) => { y.days.push({ date: d, name: n, type: ty, status: y.wf }); y.days.sort((a, b) => a.date.localeCompare(b.date)); });
  };
  const rmHol = (d) => gate('Removed holiday ' + fmtS(d), (y) => { y.days = y.days.filter((x) => !(x.date === d && x.type !== 'Alternate Saturday')); });
  B.act['hc-del'] = (t) => rmHol(rid(t));
  B.act['hc-delcell'] = (t) => rmHol(t.dataset.d);
  const toggleAlt = (d) => gate('Toggled alternate Saturday ' + fmtS(d), (y) => { if (y.altSaturdays.includes(d)) { y.altSaturdays = y.altSaturdays.filter((x) => x !== d); y.days = y.days.filter((x) => !(x.date === d && x.type === 'Alternate Saturday')); } else { y.altSaturdays.push(d); y.altSaturdays.sort(); y.days.push({ date: d, name: 'Alternate Saturday (off)', type: 'Alternate Saturday', status: y.wf }); y.days.sort((a, b) => a.date.localeCompare(b.date)); } });
  B.act['hc-alt'] = (t) => toggleAlt(rid(t));
  B.act['hc-altcell'] = (t) => toggleAlt(t.dataset.d);
  B.act['hc-gen'] = () => {
    const s = B.$('#hc-start').value; if (!s || dow(s) !== 6) { B.toast('Start date must be a Saturday', 'bad'); return; }
    gate('Generated alternate Saturdays from ' + fmtS(s), (y) => { y.days = y.days.filter((x) => x.type !== 'Alternate Saturday'); y.altSaturdays = satsFrom(s, y.year); y.altSaturdays.forEach((d) => y.days.push({ date: d, name: 'Alternate Saturday (off)', type: 'Alternate Saturday', status: y.wf })); y.days.sort((a, b) => a.date.localeCompare(b.date)); });
  };

  /* =====================================================================
     2. SHIFT CHANGE & SWAP
     ===================================================================== */
  const maxCh = () => R_().maxChanges || 3;
  const monthsIn = (f, t) => { const out = []; let d = f; while (d <= t) { const m = ym(d); if (!out.includes(m)) out.push(m); d = day(1, d); } return out; };
  function checks(r) {
    const out = [], ids = [r.emp].concat(r.type === 'Swap' ? [r.partner] : []), from = r.from, to = r.to || r.from, perm = r.type === 'Permanent';
    const clash = approvedLeaves().filter((l) => ids.some((i) => ename(i) === l.emp) && l.from <= (perm ? from : to) && l.to >= from);
    out.push({ ok: !clash.length, t: 'No clash with approved leave', d: clash.length ? clash.map((l) => `${l.emp}: ${l.type} ${fmtS(l.from)} – ${fmtS(l.to)}`).join('; ') : 'No approved leave overlaps ' + (perm ? 'the effective date' : fmtS(from) + ' – ' + fmtS(to)) });
    if (perm) out.push({ ok: true, t: 'Weekly holiday and alternate-Saturday schedule kept', d: 'A roster change does not move Friday off, alternate Saturdays or company holidays.' });
    else { let w = 0, o = 0, d = from; while (d <= to) { dayInfo(d).type === 'Working' ? w++ : o++; d = day(1, d); } out.push({ ok: w > 0, t: 'Weekly holiday and alternate-Saturday schedule kept', d: w ? `${w} working day(s) changed. ${o} off day(s) (Friday / alternate Saturday / holiday) in the range keep their off status.` : 'Every date in the range is a weekly off, alternate Saturday or holiday. Nothing to change.' }); }
    const bad = [], p = (id, nr) => { const e = B.emp(id), cr = rosterById(resolve(id, from).id), nw = rosters().find((x) => x.id === nr); if (!nw) bad.push(ename(id) + ': roster no longer exists'); else { if (nw.id === cr.id) bad.push(ename(id) + ' is already on ' + nw.name); if (isOps(id) && nw.type !== 'Custom') bad.push(ename(id) + ' is in an operational unit and must stay on a Custom roster'); } };
    p(r.emp, r.roster); if (r.type === 'Swap') p(r.partner, r.partnerRoster);
    out.push({ ok: !bad.length, t: r.type === 'Swap' ? 'Both rosters remain valid after the swap' : 'Roster stays valid after the change', d: bad.length ? bad.join('; ') : 'Roster exists and differs from the one in force' + (r.type === 'Swap' ? ' for both employees' : '') });
    const over = ids.map((i) => ({ i, n: R_().shifts.filter((x) => x.id !== r.id && !x.adj && overall(x.stages) !== 'Rejected' && (x.emp === i || x.partner === i) && ym(x.from) === ym(from)).length + 1 })).filter((x) => x.n > maxCh());
    out.push({ ok: !over.length, t: `Within ${maxCh()} changes per month`, d: over.length ? over.map((x) => `${ename(x.i)} would have ${x.n} changes in ${ym(from)}`).join('; ') : 'Monthly change limit respected' });
    const lk = monthsIn(from, perm ? from : to).filter((m) => locked().includes(m));
    out.push({ ok: !lk.length, hr: !!lk.length, t: 'Payroll month not locked', d: lk.length ? `Payroll for ${lk.join(', ')} is locked: HR adjustment only` : 'Payroll month is open' });
    return out;
  }
  const trk = (st) => { const now = curIdx(st); return `<div class="fl-trk-wrap"><ul class="cl-trk fl-trk">${st.map((s, i) => `<li class="${s.s === 'Approved' ? 'done' : s.s === 'Rejected' ? 'bad' : i === now ? 'now' : ''}"><i>${s.s === 'Approved' ? ic('check', 13) : s.s === 'Rejected' ? ic('x', 13) : i + 1}</i><span>${esc(s.t)}<em>${esc(s.s !== 'Pending' && s.by ? s.by : s.who)}</em></span></li>`).join('')}</ul></div>`; };
  const trail = (st) => `<ul class="fl-trail">${st.map((s) => `<li class="${s.s.toLowerCase()}"><b>${esc(s.t)}</b><span>${s.s === 'Pending' ? 'Waiting · ' + esc(s.who) : esc(s.s) + ' · ' + esc(s.by) + ' · ' + fmtS(s.at)}</span>${s.note ? `<em>“${esc(s.note)}”</em>` : ''}</li>`).join('')}</ul>`;
  const visible = (r) => isHR() || r.emp === me().id || r.partner === me().id || r.stages.some((s) => s.who === me().name);
  const byId = (id) => R_().shifts.find((r) => r.id === id);
  const span = (r) => (r.type === 'Permanent' ? 'From ' + fmt(r.from) : r.to && r.to !== r.from ? fmtS(r.from) + ' – ' + fmtS(r.to) : fmt(r.from));
  page('shift-changes', () => {
    const all = R_().shifts.filter(visible).slice().reverse(), t = F.sc.tab, cnt = (s) => all.filter((r) => status(r) === s).length;
    const list = all.filter((r) => t === 'all' || status(r) === t);
    const thisM = all.filter((r) => ym(r.from) === ym(today()) && status(r) !== 'Rejected').length;
    return `${B.head('Shift Change & Swap', 'Permanent changes by HR, temporary changes and colleague swaps by request.', `<button class="btn primary" data-act="sc-new">${ic('plus', 16)}New shift change</button>`, crumbs('Shift & Attendance', 'Shift Changes'))}
      ${kp([Kp('refresh', 'Requests', all.length), Kp('clock', 'Pending', cnt('Pending'), 'warn'), Kp('check-circle', 'Approved', cnt('Approved'), 'ok'), Kp('x', 'Rejected', cnt('Rejected'), 'bad'), Kp('hash', 'This month', thisM + ' (max ' + maxCh() + '/employee)')])}
      <div class="as-note" style="margin-bottom:12px">${ic('alert', 14)} <b>Permanent:</b> HR reassigns the roster with an effective date; the employee and Line Manager are told. <b>Temporary / swap:</b> requested for specific dates. A swap needs the colleague's consent, then Line Manager, then HR. HR cannot approve until every check passes.</div>
      <div class="filterbar">${tabs([['all', 'All'], ['Pending', 'Pending'], ['Approved', 'Approved'], ['Rejected', 'Rejected'], ['HR adjustment', 'HR adjustment']], t, 'sc-tab')}${isHR() ? `<span class="muted" style="margin-left:auto">Max changes / month / employee ${`<input type="number" min="1" class="inp" style="width:64px;display:inline-block" data-chg="scmax" value="${maxCh()}">`}</span>` : ''}</div>
      <div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>ID</th><th>Employee</th><th>Type</th><th>Roster</th><th>Dates</th><th>Stage</th><th>Status</th><th class="r"></th></tr></thead><tbody>${list.map((r) => { const s = status(r), i = curIdx(r.stages); return `<tr data-id="${r.id}"><td><b>${r.id}</b></td><td>${who(ename(r.emp))}${r.type === 'Swap' ? `<em class="sub">⇄ ${esc(ename(r.partner))}</em>` : ''}</td><td>${r.type}</td><td>${esc(rosterName(r.roster))}</td><td>${span(r)}</td><td>${s === 'Pending' && i >= 0 ? esc(r.stages[i].t) + `<em class="sub">${esc(r.stages[i].who)}</em>` : '—'}</td><td>${pill(s)}</td><td class="r"><button class="btn sm" data-act="sc-open">${ic('eye', 14)}Open</button></td></tr>`; }).join('') || '<tr><td colspan="8"><div class="empty">Nothing here</div></td></tr>'}</tbody></table></div></div>
      <h3 class="ct" style="margin:20px 0 10px">Notifications sent</h3><div class="card table-card"><table class="dt"><thead><tr><th>When</th><th>To</th><th>Message</th></tr></thead><tbody>${R_().log.slice(0, 8).map((l) => `<tr><td>${esc(l.at)}</td><td>${esc(l.to)}</td><td>${esc(l.msg)}</td></tr>`).join('') || '<tr><td colspan="3"><div class="empty">None yet</div></td></tr>'}</tbody></table></div>`;
  });
  B.act['sc-tab'] = (t) => { F.sc.tab = t.dataset.t; rerender(); };
  B.chg.scmax = (t) => { R_().maxChanges = Math.max(1, +t.value || 3); rSave(); rerender(); B.toast('Limit saved'); };
  const detail = (r) => {
    const ck = checks(r), s = status(r), i = curIdx(r.stages), st = i >= 0 ? r.stages[i] : null, fail = ck.some((c) => !c.ok);
    const canAct = s === 'Pending' && st && (isHR() || st.who === me().name), isHRst = st && st.k === 'hr';
    const blocked = isHRst && fail, hrOnly = ck.some((c) => c.hr);
    return `<div class="p14-row"><b>${r.id}</b> ${pill(s)} <span class="muted">${r.type} · requested by ${esc(r.by)} on ${fmt(r.created)}</span></div>
      <dl class="kv as-kv"><div><dt>Employee</dt><dd>${esc(ename(r.emp))}</dd></div>${r.type === 'Swap' ? `<div><dt>Swap with</dt><dd>${esc(ename(r.partner))}</dd></div>` : ''}<div><dt>New roster</dt><dd>${esc(rosterName(r.roster))}${r.type === 'Swap' ? ` / ${esc(ename(r.partner))}: ${esc(rosterName(r.partnerRoster))}` : ''}</dd></div><div><dt>Dates</dt><dd>${span(r)}</dd></div><div><dt>Reason</dt><dd>${esc(r.reason)}</dd></div></dl>
      <h4 style="margin:12px 0 6px">Stages</h4>${trk(r.stages)}${trail(r.stages)}
      <h4 style="margin:12px 0 6px">HR checks</h4><ul class="p14-chk">${ck.map((c) => `<li class="${c.ok ? 'ok' : 'bad'}">${ic(c.ok ? 'check-circle' : 'x', 16)}<div><b>${c.t}</b><span>${esc(c.d)}</span></div></li>`).join('')}</ul>
      ${s === 'Pending' && isHRst && fail ? `<div class="as-note" style="margin-top:10px">${ic('alert', 14)} ${hrOnly ? '<b>HR adjustment only:</b> payroll for this month is locked.' : 'Approval is blocked until every check passes.'}</div>` : ''}
      <div class="p14-row" style="margin-top:12px">${canAct ? `<button class="btn primary" data-act="sc-ap" data-id="${r.id}" ${blocked ? 'disabled' : ''}>${ic('check', 15)}${st.k === 'col' ? 'Consent' : 'Approve'} as ${esc(st.t)}</button><button class="btn" data-act="sc-rej" data-id="${r.id}">Reject</button>` : ''}${s === 'Pending' && isHR() && hrOnly ? `<button class="btn" data-act="sc-adj" data-id="${r.id}">Close as HR adjustment</button>` : ''}</div>`;
  };
  B.act['sc-open'] = (t) => B.modal({ title: 'Shift change', wide: true, body: detail(byId(rid(t))), foot: '<button class="btn" data-act="close-modal">Close</button>' });
  const reopen = (id) => { rSave(); B.modal({ title: 'Shift change', wide: true, body: detail(byId(id)), foot: '<button class="btn" data-act="close-modal">Close</button>' }); rerender(); };
  B.act['sc-ap'] = (t) => {
    const r = byId(t.dataset.id), i = curIdx(r.stages); if (i < 0) return; const s = r.stages[i];
    if (s.k === 'hr' && checks(r).some((c) => !c.ok)) { B.toast('Checks failed. Approval blocked', 'bad'); return; }
    Object.assign(s, { s: 'Approved', by: isHR() && s.k !== 'hr' && s.k !== 'col' ? 'Rahim Uddin (HR)' : s.who, at: today() });
    if (overall(r.stages) === 'Approved') { const m = `${r.type} roster change to ${rosterName(r.roster)} ${r.type === 'Permanent' ? 'effective ' + fmt(r.from) : span(r)}`; notify(ename(r.emp) + ' + ' + mgrName(B.emp(r.emp)), m); if (r.type === 'Swap') notify(ename(r.partner), `Swap approved: you work ${rosterName(r.partnerRoster)} on ${span(r)}`); B.toast('Approved. Roster in force updated'); }
    else { notify(r.stages[curIdx(r.stages)].who, `${r.id} waiting for your approval`); B.toast('Forwarded to ' + r.stages[curIdx(r.stages)].who); }
    reopen(r.id);
  };
  B.act['sc-rej'] = (t) => B.modal({ title: 'Reject shift change', body: field('Reason (visible to the employee)', '<textarea class="inp" id="p14-n" rows="3"></textarea>', true), foot: foot('sc-dorej', 'Reject', t.dataset.id) });
  B.act['sc-dorej'] = (t) => {
    const n = B.$('#p14-n').value.trim(); if (!n) { B.toast('Add a reason', 'bad'); return; }
    const r = byId(t.dataset.id), i = curIdx(r.stages); if (i >= 0) Object.assign(r.stages[i], { s: 'Rejected', by: isHR() ? 'Rahim Uddin (HR)' : r.stages[i].who, at: today(), note: n });
    notify(ename(r.emp), `${r.id} rejected: ${n}`); doneR('Request closed as rejected');
  };
  B.act['sc-adj'] = (t) => { const r = byId(t.dataset.id); r.adj = true; r.stages.forEach((s) => { if (s.s === 'Pending') Object.assign(s, { s: 'Rejected', by: 'Rahim Uddin (HR)', at: today(), note: 'Payroll month locked, handled as HR adjustment' }); }); notify('Payroll', `${r.id} routed to HR adjustment (locked month)`); doneR('Closed as HR adjustment'); };
  B.act['sc-new'] = () => {
    const R = rosters().map((r) => [r.id, r.name + (r.type === 'Open' ? ' (open)' : ' ' + r.start + '–' + r.end)]), hr = isHR();
    B.modal({ title: 'New shift change', body: grid(field('Type', sel(hr ? ['Permanent', 'Temporary', 'Swap'] : ['Temporary', 'Swap'], hr ? 'Permanent' : 'Temporary', 'id="scn-ty" data-chg="scty"')) + field('Employee', hr ? sel(emps().map((e) => [e.id, e.name]), emps()[14].id, 'id="scn-e"') : `<input class="inp" value="${esc(me().name)}" disabled><input type="hidden" id="scn-e" value="${me().id}">`) + field('New roster', sel(R, 'morning', 'id="scn-r"')) + field('Swap with (colleague)', sel(emps().map((e) => [e.id, e.name]), emps()[15].id, 'id="scn-p" disabled')) + field('From / effective date', `<input type="date" class="inp" id="scn-f" value="${day(3)}">`) + field('To date (temporary / swap)', `<input type="date" class="inp" id="scn-t" value="${day(3)}">`) + field('Reason', '<input class="inp" id="scn-w">', true)) + `<p class="cl-hint">${ic('alert', 14)} For a swap, the colleague's current roster goes to you and yours goes to the colleague.</p>`, foot: foot('sc-save', 'Submit') });
  };
  B.chg.scty = (t) => { const sw = t.value === 'Swap'; B.$('#scn-p').disabled = !sw; B.$('#scn-r').disabled = sw; B.$('#scn-t').disabled = t.value === 'Permanent'; };
  B.act['sc-save'] = () => {
    const ty = B.$('#scn-ty').value, e = B.$('#scn-e').value, f = B.$('#scn-f').value, to = B.$('#scn-t').value, why = B.$('#scn-w').value.trim();
    if (!e || !f || !why) { B.toast('Employee, date and reason are required', 'bad'); return; }
    if (ty !== 'Permanent' && (!to || to < f)) { B.toast('To date must be on or after From date', 'bad'); return; }
    if (f < today() && ty === 'Temporary' && !isHR()) { B.toast('Past dates need HR', 'bad'); return; }
    const r = { id: nid(), type: ty, emp: e, partner: '', roster: B.$('#scn-r').value, partnerRoster: '', from: f, to: ty === 'Permanent' ? '' : to, reason: why, created: today(), by: isHR() ? 'HR' : 'Employee' };
    if (ty === 'Swap') { const p = B.$('#scn-p').value; if (p === e) { B.toast('Choose a different colleague', 'bad'); return; } r.partner = p; r.roster = resolve(p, f).id; r.partnerRoster = resolve(e, f).id; }
    if (ty === 'Permanent') {
      const ck = checks(r).filter((c) => !c.ok); if (ck.length) { B.toast(ck[0].t + ': ' + ck[0].d, 'bad'); R_().seq--; return; }
      r.stages = [{ t: 'HR', k: 'hr', who: 'Rahim Uddin', s: 'Approved', by: 'Rahim Uddin', at: today(), note: '' }];
      R_().shifts.push(r); notify(ename(e) + ' + ' + mgrName(B.emp(e)), `Permanent roster change to ${rosterName(r.roster)} effective ${fmt(f)}`); doneR('Roster changed from ' + fmt(f) + '. Employee and Line Manager notified'); return;
    }
    r.stages = stagesFor(r); R_().shifts.push(r); notify(r.stages[0].who, `${r.id} waiting for your approval`); doneR(r.id + ' sent to ' + r.stages[0].who);
  };

  /* =====================================================================
     3. ROSTER ASSIGNMENT
     ===================================================================== */
  const rform = () => { const f = F.ra.f; ['sc', 'tg', 'ro', 'ef'].forEach((k) => { const el = B.$('#ra-' + k); if (el) f[k] = el.value; }); const i = B.$('#ra-in'); if (i) f.inform = i.checked; };
  const targets = (scope) => scope === 'Employee' ? emps().map((e) => [e.id, e.name + ' · ' + e.dept]) : scope === 'Department' ? B.DEPTS.map((d) => [d, d]) : R_().groups.map((g) => [g.id, g.name + (g.operational ? ' (operational)' : '')]);
  page('roster-assign', () => {
    const f = Object.assign({ sc: 'Employee', ro: 'normal', ef: today(), inform: true }, F.ra.f), tg = targets(f.sc), t = F.ra.tab, R = rosters();
    if (!tg.find((x) => x[0] === f.tg)) f.tg = tg[0][0];
    const rows = emps().filter((e) => !F.ra.dept || e.dept === F.ra.dept);
    let body;
    if (t === 'emp') body = `<div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Employee</th><th>Department</th><th>Roster today</th><th>Source</th><th>Late rule</th><th class="r"></th></tr></thead><tbody>${rows.map((e) => { const x = resolve(e.id), r = rosterById(x.id), og = OPS().find((g) => g.members.includes(e.id)); return `<tr data-id="${e.id}"><td>${who(e.name)}${og ? `<em class="sub">${esc(og.name)}</em>` : ''}</td><td>${esc(e.dept)}</td><td><b>${esc(r.name)}</b><em class="sub">${r.type === 'Open' ? 'Any time · ' + r.hours + ' h' : r.start + ' – ' + r.end}</em></td><td>${esc(x.src)}</td><td class="muted">${esc(lateSummary(r))}</td><td class="r"><button class="btn sm" data-act="ra-inform-one">${ic('send', 13)}Inform</button></td></tr>`; }).join('')}</tbody></table></div></div>`;
    else if (t === 'hist') body = `<div class="card table-card"><table class="dt"><thead><tr><th>ID</th><th>Scope</th><th>Target</th><th>Roster</th><th>Effective</th><th>By</th></tr></thead><tbody>${R_().assigns.slice().reverse().map((a) => `<tr><td>${a.id}</td><td>${a.scope}</td><td>${esc(a.scope === 'Employee' ? ename(a.target) : a.scope === 'Group' ? (R_().groups.find((g) => g.id === a.target) || {}).name : a.target)} <span class="muted">(${members(a).length})</span></td><td>${esc(rosterName(a.roster))}</td><td>${fmt(a.from)}</td><td>${esc(a.by)}</td></tr>`).join('')}</tbody></table></div>`;
    else body = `<div class="card table-card"><table class="dt"><thead><tr><th>When</th><th>To</th><th>Message</th></tr></thead><tbody>${R_().log.filter((l) => /Roster|roster/.test(l.msg)).slice(0, 30).map((l) => `<tr><td>${esc(l.at)}</td><td>${esc(l.to)}</td><td>${esc(l.msg)}</td></tr>`).join('') || '<tr><td colspan="3"><div class="empty">No messages</div></td></tr>'}</tbody></table></div>`;
    return `${B.head('Roster Assignment', 'Assign a roster to an employee, group or department with an effective date.', '', crumbs('Shift & Attendance', 'Roster Assignment'))}
      ${kp([Kp('users', 'Employees', emps().length), Kp('clock', 'On Normal', emps().filter((e) => resolve(e.id).id === 'normal').length), Kp('refresh', 'On custom rosters', emps().filter((e) => rosterById(resolve(e.id).id).type === 'Custom').length, 'warn'), Kp('layers', 'Operational unit staff', emps().filter((e) => isOps(e.id)).length)])}
      ${isHR() ? `<div class="card pad" style="margin-bottom:14px"><h3 class="ct">Assign roster</h3>${grid(field('Assign to', sel(['Employee', 'Department', 'Group'], f.sc, 'id="ra-sc" data-chg="rasc"')) + field(f.sc, sel(tg, f.tg, 'id="ra-tg"')) + field('Roster', sel(R.map((r) => [r.id, r.name + (r.type === 'Open' ? ' (open, ' + r.hours + ' h)' : ' ' + r.start + '–' + r.end)]), f.ro, 'id="ra-ro"')) + field('Effective date', `<input type="date" class="inp" id="ra-ef" value="${f.ef}">`))}
        <label class="fl-sw" style="margin-top:10px"><input type="checkbox" id="ra-in" ${f.inform ? 'checked' : ''}><span><b>Inform employees</b><em>Logs a message to every affected employee</em></span></label>
        <div class="as-note" style="margin-top:10px">${ic('alert', 14)} Operational units (${OPS().map((g) => esc(g.name)).join(', ')}) must use a <b>Custom</b> roster. Bulk assign by department with the Department option.</div>
        <div style="margin-top:10px"><button class="btn primary" data-act="ra-save">Assign roster</button></div></div>` : ''}
      <div class="filterbar">${tabs([['emp', 'Employees'], ['hist', 'Assignments'], ['msg', 'Messages sent']], t, 'ra-tab')}${t === 'emp' ? sel([['', 'Department: All']].concat(B.DEPTS.map((d) => [d, d])), F.ra.dept, 'data-chg="radept"') + (isHR() ? `<button class="btn sm" data-act="ra-inform-all">${ic('send', 13)}Inform all shown</button>` : '') : ''}</div>${body}`;
  });
  B.act['ra-tab'] = (t) => { F.ra.tab = t.dataset.t; rerender(); };
  B.chg.radept = (t) => { F.ra.dept = t.value; rerender(); };
  B.chg.rasc = () => { rform(); F.ra.f.tg = ''; rerender(); };
  const tell = (id) => { const x = resolve(id), r = rosterById(x.id); notify(ename(id), `Roster: you are on ${r.name} (${r.type === 'Open' ? 'open, ' + r.hours + ' h' : r.start + '–' + r.end}). Source: ${x.src}`); };
  B.act['ra-inform-one'] = (t) => { tell(rid(t)); rSave(); B.toast('Message logged for ' + ename(rid(t))); };
  B.act['ra-inform-all'] = () => { const l = emps().filter((e) => !F.ra.dept || e.dept === F.ra.dept); l.forEach((e) => tell(e.id)); rSave(); B.toast(l.length + ' employees informed'); };
  B.act['ra-save'] = () => {
    rform(); const f = Object.assign({ sc: 'Employee', ro: 'normal', ef: today() }, F.ra.f); if (!f.tg) f.tg = targets(f.sc)[0][0];
    if (!f.ef) { B.toast('Effective date is required', 'bad'); return; }
    const a = { id: 'RA-' + (R_().assigns.length + 1 + Math.floor(Math.random() * 90)), scope: f.sc, target: f.tg, roster: f.ro, from: f.ef, by: me().name, at: today() }, m = members(a).filter((id) => { const e = B.emp(id); return e && e.status !== 'Left'; });
    if (!m.length) { B.toast('No employees in that selection', 'bad'); return; }
    if (m.some(isOps) && rosterById(f.ro).type !== 'Custom') { B.toast('Operational units must use a Custom roster', 'bad'); return; }
    const pend = R_().shifts.filter((r) => r.type === 'Permanent' && status(r) === 'Approved' && m.includes(r.emp) && r.from > f.ef);
    if (pend.length) { B.toast('A later permanent change exists for ' + ename(pend[0].emp) + '. It will take precedence', 'bad'); }
    R_().assigns.push(a);
    if (F.ra.f.inform !== false) m.forEach((id) => notify(ename(id), `Roster ${rosterName(f.ro)} assigned from ${fmt(f.ef)}`));
    F.ra.f = { sc: f.sc }; doneR(`${rosterName(f.ro)} assigned to ${m.length} employee(s) from ${fmt(f.ef)}` + (F.ra.f.inform === false ? '' : '. Employees informed'));
  };

  /* =====================================================================
     4. DAILY DAY-TYPE CHECKER
     ===================================================================== */
  const COVER = [['none', 'None'], ['wfh', 'Approved WFH'], ['od', 'Approved outside duty'], ['mp', 'HR-approved missing punch'], ['lv', 'Approved leave']];
  function evaluate(s) {
    const e = B.emp(s.emp), steps = [], info = dayInfo(s.date), ops = isOps(e.id), out = { steps };
    let working = info.type === 'Working';
    if (ops && (info.type === 'Weekly off' || info.type === 'Alternate Saturday')) { working = true; steps.push(`${e.name} is in an operational unit. Weekly off is set by their administration (Custom roster), so Friday / alternate Saturday are not applied automatically.`); }
    steps.push(`${fmt(s.date)} is a ${wd(s.date)}. ${working ? 'Working week is Saturday to Thursday' + (info.type === 'Working' ? ' and no holiday applies.' : '.') : info.type === 'Weekly off' ? 'Friday is the weekly off.' : info.type === 'Alternate Saturday' ? 'This is an off alternate Saturday per the HR schedule.' : `Company holiday: ${info.name} (${info.type}).`}`);
    out.working = working;
    const x = resolve(e.id, s.date), r = rosterById(x.id); out.roster = r;
    steps.push(`Roster in force: ${r.name} (${r.type === 'Open' ? 'open, ' + r.hours + ' h per day' : r.start + ' – ' + r.end}), source: ${x.src}.`);
    out.perm = !working;
    if (!working) { steps.push('Working on this day needs written permission from the supervisor. Work done is compensated with compensatory leave.'); out.status = 'Day off'; out.note = s.time ? 'Check-in recorded on a day off: holiday-work permission required' : 'No attendance expected'; return out; }
    const lv = approvedLeaves().find((l) => l.emp === e.name && l.from <= s.date && l.to >= s.date);
    const cover = lv ? 'lv' : s.cover; out.cover = cover;
    let raw;
    if (r.type === 'Open') { raw = 'On time'; steps.push(`Open roster is exempt from late rules. ${s.time ? 'Check-in at ' + s.time + ' accepted' : 'Any punch'}; ${r.hours} working hours are counted.`); if (!s.time) raw = 'Absent'; }
    else if (!s.time) { raw = 'Absent'; steps.push('No check-in recorded.'); }
    else {
      const L = lateRule(); let d = mins(s.time) - mins(r.start); if (d < -720) d += 1440; if (d > 720) d -= 1440; out.delta = d;
      raw = d <= L.grace ? 'On time' : d <= L.extreme ? 'Late' : d <= L.absent ? 'Extreme Late' : 'Absent';
      steps.push(`Check-in ${s.time} is ${d > 0 ? d + ' min after' : Math.abs(d) + ' min before'} the ${r.start} start. Rule: on time ≤ ${L.grace}, late ≤ ${L.extreme}, extreme late ≤ ${L.absent}, beyond that absent.`);
    }
    out.raw = raw;
    if (cover !== 'none' && (raw === 'Late' || raw === 'Extreme Late' || raw === 'Absent')) { const n = COVER.find((c) => c[0] === cover)[1]; steps.push(`${lv ? 'Approved leave found: ' + lv.type + ' ' + fmtS(lv.from) + ' – ' + fmtS(lv.to) : n} cancels the ${raw.toLowerCase()} mark.`); out.status = 'Covered'; out.note = n + ' cancels ' + raw; }
    else { out.status = raw; if (cover !== 'none') steps.push(`${COVER.find((c) => c[0] === cover)[1]} noted; nothing to cancel.`); }
    return out;
  }
  page('daily-day-type', () => {
    const s = F.dd = Object.assign({ emp: emps()[14].id, date: today(), time: '09:50', cover: 'none' }, F.dd || {}), e = B.emp(s.emp), o = evaluate(s);
    return `${B.head('Day-Type Checker', 'Is it a working day, which roster applies, and how is the check-in judged?', '', crumbs('Shift & Attendance', 'Day-Type Checker'))}
      <div class="grid-2"><div class="card pad"><h3 class="ct">Inputs</h3>${grid(field('Employee', sel(emps().map((x) => [x.id, x.name]), s.emp, 'data-chg="ddemp"')) + field('Date', `<input type="date" class="inp" value="${s.date}" data-chg="dddate">`) + field('Check-in time (blank = none)', `<input type="time" class="inp" value="${s.time}" data-chg="ddtime">`) + field('Approved cover', sel(COVER, s.cover, 'data-chg="ddcover"')))}
        <p class="muted" style="margin-top:12px">Approved leave from the leave module is picked up automatically for this employee and date.</p></div>
        <div class="card pad"><h3 class="ct">Result</h3>
          <div class="p14-row"><span>Working day?</span> ${pill(o.working ? 'Working' : 'Day off')}<span class="muted">${esc(wd(s.date))}</span></div>
          <div class="p14-row"><span>Holiday-work permission needed?</span> ${B.pill(o.perm ? 'Yes' : 'No', o.perm ? 'warn' : 'ok')}</div>
          <div class="p14-row"><span>Roster in force</span> <b>${esc(o.roster.name)}</b></div>
          <div class="p14-big">${pill(o.status)}</div><p class="muted">${esc(o.note || (o.roster.type === 'Open' ? o.roster.hours + ' h counted' : ''))}</p></div></div>
      <div class="card pad" style="margin-top:14px"><h3 class="ct">How it was worked out</h3><ol class="p14-steps">${o.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>`;
  });
  B.chg.ddemp = (t) => { F.dd.emp = t.value; rerender(); };
  B.chg.dddate = (t) => { F.dd.date = t.value || today(); rerender(); };
  B.chg.ddtime = (t) => { F.dd.time = t.value; rerender(); };
  B.chg.ddcover = (t) => { F.dd.cover = t.value; rerender(); };

  /* ---------- registration ---------- */
  const reg = { 'holiday-calendar': ['Holiday Calendar', 'calendar'], 'shift-changes': ['Shift Change & Swap', 'refresh'], 'roster-assign': ['Roster Assignment', 'users'], 'daily-day-type': ['Day-Type Checker', 'clock'] };
  const nav = B.NAV && B.NAV.find((m) => m.id === 'attendance');
  Object.keys(reg).forEach((id) => { B.PAGES[id] = { label: reg[id][0], icon: reg[id][1] }; if (nav && !nav.items.includes('p:' + id)) nav.items.push('p:' + id); });
})();
