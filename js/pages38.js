/* Sentradesk HRMS — Shift Schedule Assignment: rotation patterns, current & next shift, location, upcoming weeks and enable/disable (overrides the generic list) */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const fd = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const fs = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const day = 864e5;
  const SCH = { 'Weekly Rotation': { unit: 1, seq: ['Morning', 'Evening', 'Night'], note: 'Changes shift every week' }, 'Fortnightly Rotation': { unit: 2, seq: ['Morning', 'Evening'], note: 'Changes shift every 2 weeks' }, 'Night Cycle': { unit: 1, seq: ['Night', 'Night', 'Night', 'Normal'], note: '3 night weeks, then 1 normal week' } };
  const COL = { Normal: 'c3', Morning: 'c1', Evening: 'c4', Night: 'c2' };
  const TM = { Normal: '09:30 – 18:30', Morning: '06:00 – 15:00', Evening: '14:00 – 23:00', Night: '22:00 – 07:00' };
  const TONE = { Active: 'ok', Upcoming: 'info', Inactive: 'bad' };
  const st = { q: '', s: 'all', sc: 'all', l: 'all' };
  const KEY = 'ssa38';
  let off = {}; try { off = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { off = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(off)); } catch (e) { /* ignore */ } };
  let cache = null;
  const chip = (s) => `<span class="sr-sh ${COL[s] || ''}"><i></i>${esc(s)}</span>`;
  const wkStart = (d) => addD(d, -d.getDay());
  const status = (r) => (r.disabled ? 'Inactive' : r.start > B.today ? 'Upcoming' : 'Active');
  const shiftAt = (r, d) => { const S = SCH[r.sched], w = Math.floor((wkStart(d) - wkStart(r.start)) / day / 7); return S.seq[(((Math.floor(w / S.unit) + r.offset) % S.seq.length) + S.seq.length) % S.seq.length]; };
  const nextChange = (r) => { const S = SCH[r.sched], cur = shiftAt(r, B.today); for (let i = 1; i <= 12; i++) { const d = addD(wkStart(B.today), i * 7); if (shiftAt(r, d) !== cur) return { d, s: shiftAt(r, d) }; } return null; };

  const records = () => {
    if (cache) return cache;
    cache = B.getRows('shift-schedule-assignment').map((r, i) => {
      const rr = B.rng('ssa38' + i), nm = String(r.vals[0]), e = B.EMPLOYEES.find((x) => x.name === nm) || r.p || {};
      const start = addD(B.today, -Math.floor(rr() * 70) + 6), disabled = off[r.name] != null ? off[r.name] : (r.vals[4] === 'Inactive' && rr() < 0.55);
      return { id: r.name, emp: nm, dept: e.dept || '', desig: e.desig || '', eid: e.id || '', sched: r.vals[1], loc: r.vals[2], start, disabled, offset: Math.floor(rr() * 3), by: ['Rahim Uddin', 'Farhana Akter', 'Mitu Rahman'][Math.floor(rr() * 3)] };
    }).sort((a, b) => b.start - a.start);
    return cache;
  };
  const rows = () => records().filter((r) => (st.s === 'all' || status(r) === st.s) && (st.sc === 'all' || r.sched === st.sc) && (st.l === 'all' || r.loc === st.l) && (!st.q || (r.emp + r.dept + r.id + r.sched + r.loc).toLowerCase().includes(st.q.toLowerCase())));
  const curCell = (r) => { const s = status(r); if (s === 'Inactive') return '<span class="muted">Not rotating</span>'; if (s === 'Upcoming') return `<span class="muted">Starts ${fs(r.start)}</span>`; const c = shiftAt(r, B.today), n = nextChange(r); return `${chip(c)}<em class="sub">${n ? 'Next: ' + n.s + ' from ' + fs(n.d) : 'No change soon'}</em>`; };

  const table = () => {
    const L = rows(); if (!L.length) return `<div class="card pad empty">${ic('search', 34)}<b>No schedule assignments match</b><span>Try a different filter.</span></div>`;
    return `<div class="card table-card"><div class="tscroll"><table class="dt iv-t"><thead><tr><th>Employee</th><th>Schedule</th><th>This week</th><th>Location</th><th>Started</th><th>Status</th><th></th></tr></thead><tbody>${L.map((r) => `<tr data-act="ssa-open" data-id="${r.id}"><td><span class="who">${B.avatar(r.emp, 34)}<span><b>${esc(r.emp)}</b><em class="sub">${esc(r.dept)} · ${r.id}</em></span></span></td><td><b>${r.sched}</b><em class="sub">${SCH[r.sched].note}</em></td><td>${curCell(r)}</td><td>${ic('pin', 13)} ${esc(r.loc)}</td><td>${fd(r.start)}</td><td>${B.pill(status(r), TONE[status(r)])}</td><td class="r">${ic('right', 16)}</td></tr>`).join('')}</tbody></table></div></div>`;
  };
  const kp = (i, l, v, c, sub) => `<div class="card ivk"><span class="ivk-i ${c || ''}">${ic(i, 18)}</span><div><b>${v}</b><span>${l}</span>${sub ? `<em class="ld-sub">${sub}</em>` : ''}</div></div>`;
  const switcher = () => `<div class="seg views">${[['', 'list', 'List'], ['kanban', 'kanban', 'Kanban'], ['report', 'bars', 'Report']].map((v) => `<a class="${v[0] === '' ? 'on' : ''}" href="#/list/shift-schedule-assignment${v[0] ? '/' + v[0] : ''}">${ic(v[1], 16)}<span>${v[2]}</span></a>`).join('')}</div>`;

  B.renderShiftSched = () => {
    const A = records(), c = (s) => A.filter((r) => status(r) === s).length, act = A.filter((r) => status(r) === 'Active'), locs = [...new Set(A.map((r) => r.loc))].sort();
    const dist = Object.keys(TM).map((k) => [k, act.filter((r) => shiftAt(r, B.today) === k).length]), mx = Math.max(1, ...dist.map((d) => d[1]));
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Shift & Attendance', href: '#/module/attendance' }, { label: 'Shift Schedule Assignment' }])}<h1>Shift Schedule Assignments <span class="count">${A.length}</span></h1><p class="sub">Which rotation each employee follows, where they work, and the shift they are on this week.</p></div>
        <div class="head-actions">${switcher()}<a class="btn primary" href="#/form/shift-schedule-assignment/new">${ic('plus', 16)}Add Shift Schedule Assignment</a></div></div>
      <section class="iv-kpis">${kp('users', 'Total assignments', A.length, 'a')}${kp('check-circle', 'Active', c('Active'), 'd', 'rotating now')}${kp('clock', 'Upcoming', c('Upcoming'), 'b', 'start soon')}${kp('x', 'Inactive', c('Inactive'), 'e', 'switched off')}${kp('refresh', 'Schedules in use', Object.keys(SCH).length, 'c')}${kp('pin', 'Locations', locs.length, 'a')}</section>
      <div class="card pad sa-cov"><b>On these shifts this week (active assignments)</b><div>${dist.map((d) => `<div class="sa-c"><span>${chip(d[0])}<em>${TM[d[0]]}</em></span><i><u style="width:${Math.round((d[1] / mx) * 100)}%"></u></i><b>${d[1]}</b></div>`).join('')}</div></div>
      <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="ssq" value="${esc(st.q)}" placeholder="Search employee, schedule, location or ID…"></label>
        <div class="seg">${['all', 'Active', 'Upcoming', 'Inactive'].map((x) => `<button class="${st.s === x ? 'on' : ''}" data-act="ssa-sf" data-v="${x}">${x === 'all' ? 'All' : x}${x === 'all' ? '' : ' <span class="count">' + c(x) + '</span>'}</button>`).join('')}</div>
        <select class="inp" style="max-width:190px" data-chg="sss"><option value="all">All schedules</option>${Object.keys(SCH).map((x) => `<option ${st.sc === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <select class="inp" style="max-width:180px" data-chg="ssl"><option value="all">All locations</option>${locs.map((x) => `<option ${st.l === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
      <div id="ssa-tbl" style="margin-top:14px">${table()}</div>`;
  };
  B.inp.ssq = (t) => { st.q = t.value; const g = B.$('#ssa-tbl'); if (g) g.innerHTML = table(); };
  B.chg.sss = (t) => { st.sc = t.value; B.route(); };
  B.chg.ssl = (t) => { st.l = t.value; B.route(); };
  B.act['ssa-sf'] = (t) => { st.s = t.dataset.v; B.route(); };
  B.act['ssa-toggle'] = (t) => { const r = records().find((x) => x.id === t.dataset.id); if (!r) return; r.disabled = !r.disabled; off[r.id] = r.disabled; save(); B.closeModal(); B.toast(r.disabled ? 'Assignment switched off' : 'Assignment switched on'); B.route(); };

  B.act['ssa-open'] = (t) => {
    const r = records().find((x) => x.id === t.dataset.id); if (!r) return; const s = status(r), S = SCH[r.sched];
    const base = s === 'Upcoming' ? r.start : B.today, weeks = Array.from({ length: 8 }, (_, i) => { const d = addD(wkStart(base), i * 7); return [d, shiftAt(r, d)]; });
    const body = `<div class="oa-mh">${B.avatar(r.emp, 52)}<div><b>${esc(r.emp)}</b><span>${esc(r.desig)}${r.desig ? ' · ' : ''}${esc(r.dept)}</span><span>${r.id} · assigned by ${esc(r.by)}</span></div>${B.pill(s, TONE[s])}</div>
      <div class="oa-mt"><div><span>Schedule</span><b>${r.sched}</b></div><div><span>Location</span><b>${esc(r.loc)}</b></div><div><span>Started</span><b>${fd(r.start)}</b></div><div><span>This week</span><b>${s === 'Active' ? chip(shiftAt(r, B.today)) : '—'}</b></div></div>
      <div class="ar-note"><b>${S.note}</b><span>Pattern: ${S.seq.map((x) => x).join(' → ')}${S.unit > 1 ? ' (' + S.unit + ' weeks each)' : ''}, then repeats.</span></div>
      <h4 class="oa-h">Next 8 weeks</h4><div class="ssa-wk">${weeks.map((w) => `<div><span>${fs(w[0])}</span>${chip(w[1])}<em>${TM[w[1]]}</em></div>`).join('')}</div>`;
    B.modal({ title: 'Schedule Assignment · ' + r.id, body, wide: true, foot: `<button class="btn" data-act="ssa-toggle" data-id="${esc(r.id)}">${r.disabled ? 'Switch on' : 'Switch off'}</button><button class="btn primary" data-act="close-modal">Close</button>` });
  };
})();
