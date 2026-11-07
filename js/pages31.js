/* Sentradesk HRMS — Attendance records list: consistent data, check-in/out, hours badges, filters and a detail popup (overrides the generic list) */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const hhmm = (m) => { m = ((m % 1440) + 1440) % 1440; return B.pad(Math.floor(m / 60)) + ':' + B.pad(m % 60); };
  const fh = (m) => (m ? Math.floor(m / 60) + 'h ' + B.pad(m % 60) + 'm' : '—');
  const hb = (m) => (m ? `<span class="oa-hr ${m < 480 ? 'lo' : m >= 540 ? 'hi' : 'ok'}">${fh(m)}</span>` : '<span class="muted">—</span>');
  const SH = { Normal: [570, 1110], Morning: [360, 900], Evening: [840, 1380], Night: [1320, 420], Open: [600, 1080] };
  const shKey = (s) => Object.keys(SH).find((k) => s.indexOf(k) === 0) || 'Open';
  const TONE = { Present: 'ok', 'Work From Home': 'info', 'Half Day': 'warn', Absent: 'bad', 'On Leave': 'warn' };
  const st = { q: '', s: 'all', d: 'all', r: '14' };
  let cache = null;

  const records = () => {
    if (cache) return cache;
    const t0 = B.today;
    cache = B.getRows('attendance').map((r, i) => {
      const rr = B.rng('att31' + i), nm = String(r.vals[0]), e = B.EMPLOYEES.find((x) => x.name === nm) || r.p || {};
      let date = addD(t0, -Math.floor(i * 0.8)); while (date.getDay() === 5) date = addD(date, -1);
      const status = r.vals[3], shift = r.vals[4], k = shKey(shift), [s0, e0] = SH[k];
      const works = status !== 'Absent' && status !== 'On Leave';
      let arrival = '—', cin = null, cout = null, mins = 0;
      if (works) {
        arrival = r.vals[5] === 'Extreme late' && rr() < 0.7 ? 'Late' : r.vals[5];
        if (k === 'Open') arrival = 'On time';
        const off = arrival === 'On time' ? -Math.floor(rr() * 12) + Math.floor(rr() * 10) : arrival === 'Late' ? 16 + Math.floor(rr() * 30) : 61 + Math.floor(rr() * 80);
        cin = s0 + off;
        const full = k === 'Open' ? 480 : (e0 - s0 + 1440) % 1440;
        mins = status === 'Half Day' ? 240 + Math.floor(rr() * 70) : Math.max(300, full + Math.floor(rr() * 70) - 20 - (arrival === 'On time' ? 0 : Math.floor(off / 2)));
        cout = cin + mins;
      }
      return { id: r.name, i, emp: nm, dept: e.dept || r.vals[1], desig: e.desig || '', date: iso(date), d: date, status, shift, arrival, cin, cout, mins };
    }).sort((a, b) => b.d - a.d);
    return cache;
  };
  const fd = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const wd = (d) => d.toLocaleDateString('en-GB', { weekday: 'short' });
  const arrPill = (a) => (a === '—' ? '<span class="muted">—</span>' : B.pill(a, a === 'On time' ? 'ok' : a === 'Late' ? 'warn' : 'bad'));
  const inRange = (r) => st.r === 'all' || (B.today - r.d) / 864e5 < +st.r;

  const rows = () => records().filter((r) => inRange(r) && (st.s === 'all' || r.status === st.s) && (st.d === 'all' || r.dept === st.d) && (!st.q || (r.emp + r.dept + r.id + r.shift).toLowerCase().includes(st.q.toLowerCase())));

  const table = () => {
    const L = rows();
    if (!L.length) return `<div class="card pad empty">${ic('search', 34)}<b>No attendance records match</b><span>Try a different filter or date range.</span></div>`;
    return `<div class="card table-card"><div class="tscroll"><table class="dt iv-t"><thead><tr><th>Employee</th><th>Date</th><th>Shift</th><th>Check in</th><th>Check out</th><th>Hours</th><th>Arrival</th><th>Status</th><th></th></tr></thead><tbody>${L.map((r) => `<tr data-act="at-rec" data-id="${r.id}"><td><span class="who">${B.avatar(r.emp, 34)}<span><b>${esc(r.emp)}</b><em class="sub">${esc(r.dept)} · ${r.id}</em></span></span></td><td>${fd(r.d)}<em class="sub">${wd(r.d)}${r.d.getTime() === B.today.getTime() ? ' · today' : ''}</em></td><td>${esc(r.shift)}</td><td>${r.cin != null ? '<b>' + hhmm(r.cin) + '</b>' : '<span class="muted">—</span>'}</td><td>${r.cout != null ? '<b>' + hhmm(r.cout) + '</b>' : '<span class="muted">—</span>'}</td><td>${hb(r.mins)}</td><td>${arrPill(r.arrival)}</td><td>${B.pill(r.status, TONE[r.status] || 'mute')}</td><td class="r">${ic('right', 16)}</td></tr>`).join('')}</tbody></table></div></div>`;
  };

  const kp = (i, l, v, c, sub) => `<div class="card ivk"><span class="ivk-i ${c || ''}">${ic(i, 18)}</span><div><b>${v}</b><span>${l}</span>${sub ? `<em class="ld-sub">${sub}</em>` : ''}</div></div>`;
  const switcher = () => `<div class="seg views">${[['', 'list', 'List'], ['kanban', 'kanban', 'Kanban'], ['calendar', 'calendar', 'Calendar'], ['report', 'bars', 'Report']].map((v) => `<a class="${v[0] === '' ? 'on' : ''}" href="#/list/attendance${v[0] ? '/' + v[0] : ''}">${ic(v[1], 16)}<span>${v[2]}</span></a>`).join('')}</div>`;

  B.renderAttendance = () => {
    const A = records().filter(inRange), c = (s) => A.filter((r) => r.status === s).length;
    const worked = A.filter((r) => r.mins), avg = worked.length ? Math.round(worked.reduce((n, r) => n + r.mins, 0) / worked.length) : 0;
    const late = A.filter((r) => r.arrival === 'Late' || r.arrival === 'Extreme late').length, depts = [...new Set(records().map((r) => r.dept))].sort();
    const rate = A.length ? Math.round(((c('Present') + c('Work From Home') + c('Half Day')) / A.length) * 100) : 0;
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Shift & Attendance', href: '#/module/attendance' }, { label: 'Attendance' }])}<h1>Attendance <span class="count">${A.length}</span></h1><p class="sub">Daily attendance records with check-in and check-out times, hours worked and arrival status. Open one for the full day.</p></div>
        <div class="head-actions">${switcher()}<a class="btn primary" href="#/form/attendance/new">${ic('plus', 16)}Add Attendance</a></div></div>
      <section class="iv-kpis">${kp('file', 'Records', A.length, 'a', rate + '% attendance rate')}${kp('user-check', 'Present', c('Present') + c('Work From Home'), 'd', c('Work From Home') + ' work from home')}${kp('x', 'Absent', c('Absent'), 'e')}${kp('calendar', 'On leave', c('On Leave'), 'c')}${kp('clock', 'Late arrivals', late, 'c', A.filter((r) => r.arrival === 'Extreme late').length + ' extreme late')}${kp('trend', 'Avg. hours', fh(avg), 'b', 'on days worked')}</section>
      <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="atq" value="${esc(st.q)}" placeholder="Search employee, department, shift or ID…"></label>
        <div class="seg">${['all', 'Present', 'Work From Home', 'Half Day', 'On Leave', 'Absent'].map((x) => `<button class="${st.s === x ? 'on' : ''}" data-act="at-sf" data-v="${x}">${x === 'all' ? 'All' : x}${x === 'all' ? '' : ' <span class="count">' + c(x) + '</span>'}</button>`).join('')}</div>
        <select class="inp" style="max-width:170px" data-chg="atd"><option value="all">All departments</option>${depts.map((d) => `<option ${st.d === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
        <select class="inp" style="max-width:150px" data-chg="atr">${[['7', 'Last 7 days'], ['14', 'Last 14 days'], ['all', 'All records']].map((o) => `<option value="${o[0]}" ${st.r === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div>
      <div class="at-leg"><span>Hours worked:</span><span class="oa-hr lo">Under 8h</span><span class="oa-hr ok">8h – 9h</span><span class="oa-hr hi">9h or more</span></div>
      <div id="at-tbl">${table()}</div>`;
  };
  const redo = () => { const g = B.$('#at-tbl'); if (g) g.innerHTML = table(); };
  B.inp.atq = (t) => { st.q = t.value; redo(); };
  B.chg.atd = (t) => { st.d = t.value; B.route(); };
  B.chg.atr = (t) => { st.r = t.value; B.route(); };
  B.act['at-sf'] = (t) => { st.s = t.dataset.v; B.route(); };

  B.act['at-rec'] = (t) => {
    const r = records().find((x) => x.id === t.dataset.id); if (!r) return;
    const mine = records().filter((x) => x.emp === r.emp), w = mine.filter((x) => x.mins), p = mine.filter((x) => x.status === 'Present' || x.status === 'Work From Home').length;
    const span = (m) => Math.max(0, Math.min(100, ((m - 360) / (22 * 60 - 360)) * 100)), cin = r.cin, cout = r.cout != null ? (r.cout > 1440 ? r.cout - 1440 + 1440 : r.cout) : null;
    const bar = cin != null && cin < 1320 && r.cout <= 1380 ? `<div class="oa-bar"><div class="oa-bt"><u style="left:${span(cin)}%;width:${Math.max(1, span(r.cout) - span(cin))}%"></u></div><div class="oa-bl"><span>06:00</span><span>10:00</span><span>14:00</span><span>18:00</span><span>22:00</span></div></div>` : '';
    const body = `<div class="oa-mh">${B.avatar(r.emp, 52)}<div><b>${esc(r.emp)}</b><span>${esc(r.desig)}${r.desig ? ' · ' : ''}${esc(r.dept)}</span><span>${esc(r.shift)} · ${r.id}</span></div>${B.pill(r.status, TONE[r.status] || 'mute')}</div>
      <div class="oa-mt"><div><span>Date</span><b>${fd(r.d)}</b></div><div><span>Check in</span><b>${r.cin != null ? hhmm(r.cin) : '—'}</b></div><div><span>Check out</span><b>${r.cout != null ? hhmm(r.cout) : '—'}</b></div><div><span>Hours worked</span><b>${hb(r.mins)}</b></div><div><span>Arrival</span><b>${arrPill(r.arrival)}</b></div></div>
      ${bar}
      <h4 class="oa-h">This employee — recent records</h4><div class="oa-mt at-sum"><div><span>Records</span><b>${mine.length}</b></div><div><span>Days present</span><b>${p}</b></div><div><span>Late arrivals</span><b>${mine.filter((x) => x.arrival === 'Late' || x.arrival === 'Extreme late').length}</b></div><div><span>Avg. hours</span><b>${w.length ? fh(Math.round(w.reduce((n, x) => n + x.mins, 0) / w.length)) : '—'}</b></div></div>
      <table class="dt oa-wk"><thead><tr><th>Date</th><th>Check in</th><th>Check out</th><th>Hours</th><th>Status</th></tr></thead><tbody>${mine.map((x) => `<tr><td>${fd(x.d)}</td><td>${x.cin != null ? hhmm(x.cin) : '—'}</td><td>${x.cout != null ? hhmm(x.cout) : '—'}</td><td>${hb(x.mins)}</td><td>${B.pill(x.status, TONE[x.status] || 'mute')}</td></tr>`).join('')}</tbody></table>`;
    B.modal({ title: 'Attendance · ' + r.id, body, wide: true, foot: `<a class="btn" href="#/employee/${esc((B.EMPLOYEES.find((e) => e.name === r.emp) || {}).id || '')}">View employee</a><button class="btn primary" data-act="close-modal">Close</button>` });
  };
})();
