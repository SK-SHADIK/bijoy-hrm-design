/* Sentradesk HRMS — Shift Assignment: derived status (active / upcoming / ended), coverage by shift, progress and enable/disable (overrides the generic list) */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const fd = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const fs = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const SH = { Normal: ['09:30 – 18:30', 'c3'], Morning: ['06:00 – 15:00', 'c1'], Evening: ['14:00 – 23:00', 'c4'], Night: ['22:00 – 07:00', 'c2'], Open: ['Flexible · 8 h', 'c3'] };
  const TONE = { Active: 'ok', Upcoming: 'info', Ended: 'mute', Inactive: 'bad' };
  const st = { q: '', s: 'all', t: 'all' };
  const KEY = 'sa36';
  let off = {}; try { off = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { off = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(off)); } catch (e) { /* ignore */ } };
  let cache = null;
  const chip = (s) => `<span class="sr-sh ${SH[s] ? SH[s][1] : ''}"><i></i>${esc(s)}</span>`;
  const day = 864e5;
  const status = (r) => (r.disabled ? 'Inactive' : r.start > B.today ? 'Upcoming' : r.end && r.end < B.today ? 'Ended' : 'Active');

  const records = () => {
    if (cache) return cache;
    cache = B.getRows('shift-assignment').map((r, i) => {
      const rr = B.rng('sa36' + i), nm = String(r.vals[0]), e = B.EMPLOYEES.find((x) => x.name === nm) || r.p || {};
      const shift = r.vals[1] === 'General' ? 'Normal' : r.vals[1], start = addD(B.today, -Math.floor(rr() * 70) + 8), open = rr() < 0.25, end = open ? null : addD(start, 4 + Math.floor(rr() * 40));
      const disabled = off[r.name] != null ? off[r.name] : (r.vals[4] === 'Inactive' && rr() < 0.5);
      return { id: r.name, emp: nm, dept: e.dept || '', desig: e.desig || '', eid: e.id || '', shift, start, end, disabled, by: ['Rahim Uddin', 'Farhana Akter', 'Mitu Rahman'][Math.floor(rr() * 3)] };
    }).sort((a, b) => b.start - a.start);
    return cache;
  };
  const rows = () => records().filter((r) => (st.s === 'all' || status(r) === st.s) && (st.t === 'all' || r.shift === st.t) && (!st.q || (r.emp + r.dept + r.id + r.shift).toLowerCase().includes(st.q.toLowerCase())));
  const period = (r) => fs(r.start) + ' – ' + (r.end ? fs(r.end) : 'No end date');
  const progress = (r) => { if (!r.end) return null; const tot = Math.max(1, (r.end - r.start) / day + 1), el = Math.min(tot, Math.max(0, (B.today - r.start) / day + 1)); return { pct: Math.round((el / tot) * 100), left: Math.max(0, Math.round((r.end - B.today) / day)), tot: Math.round(tot) }; };
  const bar = (r) => { const p = progress(r), s = status(r); if (!p) return '<span class="muted">Ongoing</span>'; return `<div class="al-dp"><i><u style="width:${s === 'Upcoming' ? 0 : p.pct}%;background:${s === 'Ended' ? 'var(--text-3)' : 'var(--ok)'}"></u></i><span>${s === 'Active' ? p.left + ' d left' : s === 'Upcoming' ? 'In ' + Math.round((r.start - B.today) / day) + ' d' : p.tot + ' d'}</span></div>`; };

  const table = () => {
    const L = rows(); if (!L.length) return `<div class="card pad empty">${ic('search', 34)}<b>No shift assignments match</b><span>Try a different filter.</span></div>`;
    return `<div class="card table-card"><div class="tscroll"><table class="dt iv-t"><thead><tr><th>Employee</th><th>Shift</th><th>Timing</th><th>Period</th><th>Progress</th><th>Status</th><th></th></tr></thead><tbody>${L.map((r) => `<tr data-act="sa-open" data-id="${r.id}"><td><span class="who">${B.avatar(r.emp, 34)}<span><b>${esc(r.emp)}</b><em class="sub">${esc(r.dept)} · ${r.id}</em></span></span></td><td>${chip(r.shift)}</td><td>${SH[r.shift][0]}</td><td>${period(r)}<em class="sub">${r.start.getFullYear()}</em></td><td>${bar(r)}</td><td>${B.pill(status(r), TONE[status(r)])}</td><td class="r">${ic('right', 16)}</td></tr>`).join('')}</tbody></table></div></div>`;
  };
  const kp = (i, l, v, c, sub) => `<div class="card ivk"><span class="ivk-i ${c || ''}">${ic(i, 18)}</span><div><b>${v}</b><span>${l}</span>${sub ? `<em class="ld-sub">${sub}</em>` : ''}</div></div>`;
  const switcher = () => `<div class="seg views">${[['', 'list', 'List'], ['kanban', 'kanban', 'Kanban'], ['report', 'bars', 'Report']].map((v) => `<a class="${v[0] === '' ? 'on' : ''}" href="#/list/shift-assignment${v[0] ? '/' + v[0] : ''}">${ic(v[1], 16)}<span>${v[2]}</span></a>`).join('')}</div>`;

  B.renderShiftAssign = () => {
    const A = records(), c = (s) => A.filter((r) => status(r) === s).length, act = A.filter((r) => status(r) === 'Active');
    const mx = Math.max(1, ...Object.keys(SH).map((k) => act.filter((r) => r.shift === k).length));
    const soon = A.filter((r) => status(r) === 'Active' && r.end && (r.end - B.today) / day <= 7).length;
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Shift & Attendance', href: '#/module/attendance' }, { label: 'Shift Assignment' }])}<h1>Shift Assignments <span class="count">${A.length}</span></h1><p class="sub">Who works which shift and for how long. Status follows the dates; disabled assignments are switched off manually.</p></div>
        <div class="head-actions">${switcher()}<a class="btn primary" href="#/form/shift-assignment/new">${ic('plus', 16)}Add Shift Assignment</a></div></div>
      <section class="iv-kpis">${kp('calendar', 'Total assignments', A.length, 'a')}${kp('check-circle', 'Active now', c('Active'), 'd', soon + ' ending within 7 days')}${kp('clock', 'Upcoming', c('Upcoming'), 'b')}${kp('file', 'Ended', c('Ended'), 'a')}${kp('x', 'Disabled', c('Inactive'), 'e')}${kp('users', 'Employees covered', new Set(act.map((r) => r.emp)).size, 'c', 'on an active shift')}</section>
      <div class="card pad sa-cov"><b>Active coverage by shift</b><div>${Object.keys(SH).map((k) => { const n = act.filter((r) => r.shift === k).length; return `<div class="sa-c"><span>${chip(k)}<em>${SH[k][0]}</em></span><i><u style="width:${Math.round((n / mx) * 100)}%"></u></i><b>${n}</b></div>`; }).join('')}</div></div>
      <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="saq" value="${esc(st.q)}" placeholder="Search employee, shift or ID…"></label>
        <div class="seg">${['all', 'Active', 'Upcoming', 'Ended', 'Inactive'].map((x) => `<button class="${st.s === x ? 'on' : ''}" data-act="sa-sf" data-v="${x}">${x === 'all' ? 'All' : x === 'Inactive' ? 'Disabled' : x}${x === 'all' ? '' : ' <span class="count">' + c(x) + '</span>'}</button>`).join('')}</div>
        <select class="inp" style="max-width:170px" data-chg="sat"><option value="all">All shifts</option>${Object.keys(SH).map((x) => `<option ${st.t === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div id="sa-tbl" style="margin-top:14px">${table()}</div>`;
  };
  B.inp.saq = (t) => { st.q = t.value; const g = B.$('#sa-tbl'); if (g) g.innerHTML = table(); };
  B.chg.sat = (t) => { st.t = t.value; B.route(); };
  B.act['sa-sf'] = (t) => { st.s = t.dataset.v; B.route(); };
  B.act['sa-toggle'] = (t) => { const r = records().find((x) => x.id === t.dataset.id); if (!r) return; r.disabled = !r.disabled; off[r.id] = r.disabled; save(); B.closeModal(); B.toast(r.disabled ? 'Assignment disabled' : 'Assignment enabled'); B.route(); };

  B.act['sa-open'] = (t) => {
    const r = records().find((x) => x.id === t.dataset.id); if (!r) return; const s = status(r), p = progress(r), mine = records().filter((x) => x.emp === r.emp);
    const body = `<div class="oa-mh">${B.avatar(r.emp, 52)}<div><b>${esc(r.emp)}</b><span>${esc(r.desig)}${r.desig ? ' · ' : ''}${esc(r.dept)}</span><span>${r.id} · assigned by ${esc(r.by)}</span></div>${B.pill(s, TONE[s])}</div>
      <div class="sr-cmp"><div class="to"><span>Shift</span>${chip(r.shift)}<em>${SH[r.shift][0]}</em></div><div><span>Period</span><b style="font-size:15px;color:var(--text)">${fd(r.start)}</b><em>${r.end ? 'to ' + fd(r.end) : 'No end date'}</em></div></div>
      ${p ? `<div class="oa-mt"><div><span>Duration</span><b>${p.tot} days</b></div><div><span>Elapsed</span><b>${s === 'Upcoming' ? '0%' : p.pct + '%'}</b></div><div><span>Remaining</span><b>${s === 'Active' ? p.left + ' d' : s === 'Upcoming' ? p.tot + ' d' : '—'}</b></div></div><div class="oa-bar"><div class="oa-bt"><u style="left:0;width:${s === 'Upcoming' ? 0 : p.pct}%"></u></div></div>` : '<div class="ar-note"><b>Ongoing assignment</b><span>No end date — stays active until changed.</span></div>'}
      <h4 class="oa-h">All assignments for ${esc(r.emp.split(' ')[0])}</h4><table class="dt oa-wk"><thead><tr><th>Shift</th><th>Period</th><th>Status</th></tr></thead><tbody>${mine.map((x) => `<tr><td>${chip(x.shift)}</td><td>${period(x)}</td><td>${B.pill(status(x), TONE[status(x)])}</td></tr>`).join('')}</tbody></table>`;
    B.modal({ title: 'Shift Assignment · ' + r.id, body, wide: true, foot: `<button class="btn" data-act="sa-toggle" data-id="${esc(r.id)}">${r.disabled ? 'Enable assignment' : 'Disable assignment'}</button><button class="btn primary" data-act="close-modal">Close</button>` });
  };
})();
