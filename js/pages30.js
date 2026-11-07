/* Sentradesk HRMS — Office Attendance: date filter, device status, day table with start/end, full-day punch history per employee */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const F = () => B.fl2;
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const todayISO = () => iso(new Date());
  const addD = (k, n) => { const d = new Date(k + 'T00:00'); d.setDate(d.getDate() + n); return iso(d); };
  const lab = (k) => new Date(k + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const DEV = { tip: { n: 'Tip Soi', ic: 'wifi', loc: 'Dhaka HQ · Reception' }, zk: { n: 'ZKTeco device', ic: 'fingerprint', loc: 'Dhaka HQ · Main gate' } };
  const TONE = { 'On time': 'ok', Open: 'ok', Late: 'warn', 'Extreme late': 'bad' };
  const st = { date: todayISO(), q: '', status: 'all', dept: 'all' };
  let internal = false;
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const hb = (m) => (m == null ? '—' : `<span class="oa-hr ${m < 480 ? 'lo' : m >= 540 ? 'hi' : 'ok'}">${fh(m)}</span>`);
  const fh = (m) => (m == null ? '—' : Math.floor(m / 60) + 'h ' + B.pad(m % 60) + 'm');

  /* one employee's punches on one date (deterministic sample data) */
  const dayPunches = (e, k) => {
    const f = F(), r = f.rosterOf(e), rg = B.rng('pn2' + e.id + k), isToday = k === todayISO(), isFut = k > todayISO(), fri = new Date(k + 'T00:00').getDay() === 5;
    const base = { e, r, k, list: [], start: '', end: '', mins: null, res: null, off: fri, fut: isFut };
    if (isFut || fri) return base;
    if (rg() < 0.04 && !isToday) return Object.assign(base, { absent: true });
    const open = r.type === 'Open', ro = open ? 600 : f.mins(r.start);
    let delay = Math.round(rg() * 52 - 16); if (B.hash(e.id) % 7 === 0) delay = 18 + Math.floor(rg() * 12); if (B.hash(e.id) % 11 === 0) delay = 36 + Math.floor(rg() * 25);
    const inT = ro + delay, dev = () => (rg() > 0.5 ? 'tip' : 'zk');
    const ev = [{ m: inT, type: 'IN', dev: rg() > 0.1 ? 'tip' : 'zk', dup: rg() > 0.3 }];
    const lunch = 780 + Math.floor(rg() * 30), back = lunch + 40 + Math.floor(rg() * 25);
    if (inT < lunch - 30) { ev.push({ m: lunch, type: 'OUT', dev: dev(), tag: 'Break' }); ev.push({ m: back, type: 'IN', dev: dev(), tag: 'Back from break' }); }
    const endM = open ? inT + 540 + Math.floor(rg() * 30) : (f.mins(r.end) + Math.floor(rg() * 50 - 12));
    ev.push({ m: endM, type: 'OUT', dev: dev() });
    const list = ev.filter((x) => !isToday || x.m <= nowMin()).map((x) => ({ t: f.hhmm(x.m), m: x.m, type: x.type, dev: x.dev, tag: x.tag || '', dup: x.dup, loc: DEV[x.dev].loc }));
    if (!list.length) return Object.assign(base, { pending: true });
    const first = list[0], lastOut = list.filter((x) => x.type === 'OUT').pop();
    let worked = 0; for (let i = 0; i < list.length; i++) if (list[i].type === 'IN') { const o = list.slice(i + 1).find((x) => x.type === 'OUT'); worked += (o ? o.m : (isToday ? nowMin() : list[i].m)) - list[i].m; }
    return Object.assign(base, { list, start: first.t, end: lastOut ? lastOut.t : '', open: !lastOut && isToday, mins: worked, res: f.classify(r, first.t), devs: [...new Set(list.map((x) => x.dev).concat(first.dup ? ['tip', 'zk'] : []))] });
  };
  const dchip = (d) => `<span class="oa-dv ${d}">${ic(DEV[d].ic, 12)}${DEV[d].n}</span>`;
  const rowsFor = () => F().emps().filter((e) => (st.dept === 'all' || e.dept === st.dept) && (!st.q || (e.name + e.dept).toLowerCase().includes(st.q.toLowerCase()))).map((e) => dayPunches(e, st.date));
  const statusOf = (p) => (p.off ? 'Weekly off' : p.fut ? 'Upcoming' : p.absent ? 'Absent' : p.pending ? 'No punch yet' : p.res.s);
  const kp = (i, l, v, c, sub) => `<div class="card ivk"><span class="ivk-i ${c || ''}">${ic(i, 18)}</span><div><b>${v}</b><span>${l}</span>${sub ? `<em class="ld-sub">${sub}</em>` : ''}</div></div>`;

  const tableHtml = () => {
    const P = rowsFor().filter((p) => st.status === 'all' || statusOf(p) === st.status || (st.status === 'On time' && statusOf(p) === 'Open'));
    if (!P.length) return `<div class="card pad empty">${ic('search', 34)}<b>No employees match</b></div>`;
    return `<div class="card table-card"><div class="tscroll"><table class="dt iv-t oa-t"><thead><tr><th>Employee</th><th>Roster</th><th>Roster start</th><th>Start time</th><th>End time</th><th>Hours</th><th>Punched on</th><th>Status</th><th></th></tr></thead><tbody>${P.map((p) => {
      const s = statusOf(p), tone = TONE[s] || (s === 'Absent' ? 'bad' : 'mute');
      return `<tr data-act="oa-open" data-id="${p.e.id}"><td><span class="who">${B.avatar(p.e.name, 34)}<span><b>${esc(p.e.name)}</b><em class="sub">${esc(p.e.dept)}</em></span></span></td><td>${esc(p.r.name)}</td><td>${p.r.start || '<span class="muted">Any time</span>'}</td><td>${p.start ? `<b>${p.start}</b>` : '<span class="muted">—</span>'}</td><td>${p.end ? `<b>${p.end}</b>` : p.open ? '<span class="pill info"><i></i>Still in</span>' : '<span class="muted">—</span>'}</td><td>${p.mins != null ? hb(p.mins) : '<span class="muted">—</span>'}</td><td>${p.devs ? p.devs.map(dchip).join('') : '<span class="muted">—</span>'}</td><td>${B.pill(s, tone)}${p.res && p.res.d > 0 && s !== 'Open' ? `<em class="sub">${p.res.d} min after start</em>` : ''}</td><td class="r">${ic('right', 16)}</td></tr>`;
    }).join('')}</tbody></table></div></div>`;
  };

  B.page['office-attendance'] = () => {
    if (!internal) st.date = todayISO(); internal = false;
    const f = F(), P = rowsFor(), has = P.filter((p) => p.start), c = (s) => P.filter((p) => statusOf(p) === s).length, dv = f.D().devices;
    const isToday = st.date === todayISO(), cntDev = (k) => P.reduce((n, p) => n + p.list.filter((x) => x.dev === k).length, 0);
    const avgM = has.filter((p) => p.mins != null && !p.open).length ? Math.round(has.filter((p) => p.mins != null && !p.open).reduce((n, p) => n + p.mins, 0) / has.filter((p) => p.mins != null && !p.open).length) : null;
    const depts = [...new Set(f.emps().map((e) => e.dept))].sort(), fri = new Date(st.date + 'T00:00').getDay() === 5;
    const dev = (k, key) => { const d = dv[key]; return `<div class="card pad oa-dev"><div class="oa-dh"><span class="oa-di">${ic(DEV[k].ic, 18)}</span><div><b>${DEV[k].n}</b><span>${DEV[k].loc}</span></div>${B.pill(d.state, 'ok')}</div><div class="oa-dn"><div><b>${cntDev(k)}</b><span>punches ${isToday ? 'today' : 'that day'}</span></div><div><b>${d.enrolled}</b><span>enrolled</span></div><div><b>${Math.max(1, Math.round((Date.now() - d.last) / 60000))}m</b><span>since sync</span></div></div></div>`; };
    return `${B.head('Office Attendance', 'Punches from Tip Soi and ZKTeco, judged against each employee\'s roster. Pick a date and open anyone for their full day.', `<button class="btn" data-act="fl-oa-sync">${ic('refresh', 15)}Sync devices</button><a class="btn primary" href="#/page/wfh-dash">${ic('home', 16)}Work From Home</a>`, [{ label: 'HR', href: '#/' }, { label: 'Shift & Attendance' }, { label: 'Office Attendance' }])}
      <div class="card pad oa-date"><div class="oa-dnav"><button class="icon-btn bordered" data-act="oa-d" data-n="-1" aria-label="Previous day">${ic('left')}</button><label class="oa-dp"><span>${ic('calendar', 16)}</span><input type="date" value="${st.date}" max="${todayISO()}" data-chg="oadate"></label><button class="icon-btn bordered" data-act="oa-d" data-n="1" aria-label="Next day" ${isToday ? 'disabled' : ''}>${ic('right')}</button><button class="btn sm ${isToday ? 'primary' : ''}" data-act="oa-today">Today</button></div>
        <div class="oa-dl"><b>${lab(st.date)}</b><span>${isToday ? '<i class="oa-live"></i>Live · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : fri ? 'Weekly off (Friday)' : 'History'}</span></div></div>
      <section class="iv-kpis">${kp('user-check', 'Punched in', has.length, 'a', 'of ' + P.length + ' employees')}${kp('check-circle', 'On time', c('On time') + c('Open'), 'd')}${kp('clock', 'Late', c('Late'), 'c')}${kp('alert', 'Extreme late', c('Extreme late'), 'e')}${kp('x', isToday ? 'No punch yet' : 'Absent', fri ? 0 : c('No punch yet') + c('Absent'), 'e')}${kp('trend', 'Avg. hours', fh(avgM), 'b', isToday ? 'completed days only' : 'worked')}</section>
      <section class="oa-devs">${dev('tip', 'tipsoi')}${dev('zk', 'zk')}</section>
      <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="oaq" value="${esc(st.q)}" placeholder="Search employee or department…"></label>
        <div class="seg">${['all', 'On time', 'Late', 'Extreme late', 'No punch yet'].map((x) => `<button class="${st.status === x ? 'on' : ''}" data-act="oa-sf" data-v="${x}">${x === 'all' ? 'All' : x}</button>`).join('')}</div>
        <select class="inp" style="max-width:190px" data-chg="oadept"><option value="all">All departments</option>${depts.map((d) => `<option ${st.dept === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
      <div id="oa-tbl" style="margin-top:14px">${tableHtml()}</div>`;
  };
  const re = () => { internal = true; B.route(); };
  B.chg.oadate = (t) => { if (!t.value) return; st.date = t.value > todayISO() ? todayISO() : t.value; re(); };
  B.act['oa-d'] = (t) => { const d = addD(st.date, +t.dataset.n); if (d > todayISO()) return; st.date = d; re(); };
  B.act['oa-today'] = () => { st.date = todayISO(); re(); };
  B.act['oa-sf'] = (t) => { st.status = t.dataset.v; re(); };
  B.chg.oadept = (t) => { st.dept = t.value; re(); };
  B.inp.oaq = (t) => { st.q = t.value; const g = B.$('#oa-tbl'); if (g) g.innerHTML = tableHtml(); };

  /* ---------- full-day history modal ---------- */
  B.act['oa-open'] = (t) => {
    const e = B.emp(t.dataset.id); if (!e) return; const p = dayPunches(e, st.date), s = statusOf(p), f = F();
    const week = Array.from({ length: 7 }, (_, i) => dayPunches(e, addD(st.date, -i)));
    const span = (m) => Math.max(0, Math.min(100, ((m - 360) / (22 * 60 - 360)) * 100));
    let segs = ''; if (p.list.length) { for (let i = 0; i < p.list.length; i++) if (p.list[i].type === 'IN') { const o = p.list.slice(i + 1).find((x) => x.type === 'OUT'), end = o ? o.m : (st.date === todayISO() ? nowMin() : p.list[i].m); segs += `<u style="left:${span(p.list[i].m)}%;width:${Math.max(1, span(end) - span(p.list[i].m))}%"></u>`; } }
    const body = `<div class="oa-mh">${B.avatar(e.name, 52)}<div><b>${esc(e.name)}</b><span>${esc(e.desig || '')} · ${esc(e.dept)}</span><span>Roster: <b>${esc(p.r.name)}</b>${p.r.start ? ' · ' + p.r.start + ' – ' + p.r.end : ' · any time'}</span></div>${B.pill(s, TONE[s] || (s === 'Absent' ? 'bad' : 'mute'))}</div>
      <div class="oa-mt"><div><span>Date</span><b>${new Date(st.date + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</b></div><div><span>Start time</span><b>${p.start || '—'}</b></div><div><span>End time</span><b>${p.end || (p.open ? 'Still in' : '—')}</b></div><div><span>Hours worked</span><b>${p.mins != null ? hb(p.mins) : '—'}</b></div><div><span>Punches</span><b>${p.list.length}</b></div></div>
      ${p.list.length ? `<div class="oa-bar"><div class="oa-bt">${segs}</div><div class="oa-bl"><span>06:00</span><span>10:00</span><span>14:00</span><span>18:00</span><span>22:00</span></div></div>
      <h4 class="oa-h">Punch history</h4><ul class="oa-tl">${p.list.map((x) => `<li class="${x.type === 'IN' ? 'in' : 'out'}"><i></i><div class="oa-tt"><b>${x.t}</b><span class="oa-ty ${x.type === 'IN' ? 'in' : 'out'}">${x.type === 'IN' ? 'Check in' : 'Check out'}</span>${x.tag ? `<em>${x.tag}</em>` : ''}</div><div class="oa-td">${dchip(x.dev)}<span>${esc(x.loc)}</span>${x.dup ? `<small>also recorded on ${x.dev === 'tip' ? 'ZKTeco' : 'Tip Soi'}</small>` : ''}</div></li>`).join('')}</ul>`
      : `<div class="empty">${ic('clock', 30)}<b>${p.off ? 'Weekly off' : p.fut ? 'Future date' : p.absent ? 'No punches recorded (absent)' : 'No punch yet'}</b></div>`}
      <h4 class="oa-h">Previous 7 days</h4><table class="dt oa-wk"><thead><tr><th>Date</th><th>Start</th><th>End</th><th>Hours</th><th>Status</th></tr></thead><tbody>${week.map((w, i) => { const ws = statusOf(w); return `<tr class="${i === 0 ? 'me' : ''}"><td>${new Date(w.k + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}</td><td>${w.start || '—'}</td><td>${w.end || (w.open ? 'In' : '—')}</td><td>${w.mins != null ? hb(w.mins) : '—'}</td><td>${B.pill(ws, TONE[ws] || (ws === 'Absent' ? 'bad' : 'mute'))}</td></tr>`; }).join('')}</tbody></table>`;
    B.modal({ title: 'Attendance · ' + lab(st.date), wide: true, body, foot: '<button class="btn" data-act="close-modal">Close</button>' });
  };
})();
