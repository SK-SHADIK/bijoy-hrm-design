/* Sentradesk HRMS — Shift Roster: working week navigation, shifts from the Rosters page, leave overlay, daily coverage, click-to-change cells */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const F2 = () => B.fl2;
  const COL = { Normal: 'c3', Open: 'c3', Morning: 'c1', Evening: 'c4', Night: 'c2' };
  const KEYS = ['Normal', 'Morning', 'Evening', 'Night', 'Open'];
  const KEY = 'ro37';
  let ov = {}; try { ov = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { ov = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(ov)); } catch (e) { /* ignore */ } };
  const st = { off: 0, dept: 'all', q: '' };
  const hrs = (n) => (n === 'Open' ? 8 : n === 'Normal' ? 9 : 8);
  const tm = (n) => { const r = F2().D().rosters.find((x) => x.name === n); return r && r.start ? r.start + ' – ' + r.end : 'Flexible'; };
  const sun = () => { const t = new Date(B.today); return addD(t, -t.getDay() + st.off * 7); };
  const staff = () => B.EMPLOYEES.filter((e) => e.status !== 'Left');
  const onLeave = (e, d) => { try { const X = B.lvx; return X.D().apps.some((a) => a.emp === e.name && a.from <= d && a.to >= d && X.status(a) === 'Approved'); } catch (x) { return false; } };
  const cell = (e, d) => { const k = iso(d), o = ov[e.id + '|' + k]; if (o) return o; if (d.getDay() === 5) return 'Off'; if (onLeave(e, k)) return 'Leave'; return F2().rosterOf(e).name; };
  const chip = (s, e, k) => `<span class="sh ${s === 'Off' ? 'off' : s === 'Leave' ? 'lv' : COL[s] || 'c3'} ro-c ${s === 'Leave' ? 'nolink' : ''}" ${s === 'Leave' ? '' : `data-act="ro-edit" data-e="${e}" data-d="${k}"`} title="${s === 'Leave' ? 'On approved leave' : 'Click to change'}">${s}</span>`;
  const vis = () => staff().filter((e) => (st.dept === 'all' || e.dept === st.dept) && (!st.q || (e.name + e.dept + e.id).toLowerCase().includes(st.q.toLowerCase())));

  const grid = () => {
    const wk = Array.from({ length: 7 }, (_, i) => addD(sun(), i)), E = vis(), todayK = iso(B.today);
    const cells = E.map((e) => wk.map((d) => cell(e, d)));
    const wkHours = (row) => row.reduce((n, s) => n + (s === 'Off' || s === 'Leave' ? 0 : hrs(s)), 0);
    const cov = KEYS.map((k) => wk.map((d, di) => cells.filter((r) => r[di] === k).length));
    const away = wk.map((d, di) => cells.filter((r) => r[di] === 'Leave').length);
    return `<div class="card table-card"><div class="tscroll"><table class="roster ro37"><thead><tr><th>Employee</th>${wk.map((d) => `<th class="${d.getDay() === 5 ? 'wk' : ''} ${iso(d) === todayK ? 'today' : ''}"><span>${B.DAYS[d.getDay()]}</span><b>${d.getDate()}</b></th>`).join('')}<th>Week</th></tr></thead>
      <tbody>${E.map((e, i) => `<tr><td><span class="who">${B.avatar(e.name, 30)}<span><b>${esc(e.name)}</b><em class="sub">${esc(e.dept)}</em></span></span></td>${wk.map((d, di) => `<td class="${iso(d) === todayK ? 'tdy' : ''}">${chip(cells[i][di], e.id, iso(d))}</td>`).join('')}<td><b>${wkHours(cells[i])}h</b></td></tr>`).join('') || `<tr><td colspan="9"><div class="empty">${ic('search', 30)}<b>No employees match</b></div></td></tr>`}</tbody>
      <tfoot><tr class="ro-h"><td colspan="9">Daily coverage — people on each shift</td></tr>${KEYS.map((k, ki) => `<tr><td><span class="ro-lg"><i class="sh ${COL[k]}"></i>${k}<em>${tm(k)}</em></span></td>${cov[ki].map((n, di) => `<td class="${iso(wk[di]) === todayK ? 'tdy' : ''}">${n ? `<b>${n}</b>` : '<span class="muted">—</span>'}</td>`).join('')}<td><b>${cov[ki].reduce((a, b) => a + b, 0)}</b></td></tr>`).join('')}<tr><td><span class="ro-lg"><i class="sh lv"></i>On leave</span></td>${away.map((n, di) => `<td class="${iso(wk[di]) === todayK ? 'tdy' : ''}">${n ? `<b>${n}</b>` : '<span class="muted">—</span>'}</td>`).join('')}<td><b>${away.reduce((a, b) => a + b, 0)}</b></td></tr></tfoot></table></div></div>`;
  };

  B.page['shift-roster'] = () => {
    const s = sun(), e = addD(s, 6), depts = [...new Set(staff().map((x) => x.dept))].sort(), lbl = s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' – ' + e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const nOv = Object.keys(ov).length;
    return `${B.head('Shift Roster', 'Weekly shifts from each employee\'s roster. Click any shift to change it for that day.', `<div class="seg"><button data-act="ro-nav" data-v="-1">${ic('left', 15)}</button><button class="${st.off === 0 ? 'on' : ''}" data-act="ro-nav" data-v="0">This week</button><button data-act="ro-nav" data-v="1">${ic('right', 15)}</button></div><a class="btn primary" href="#/page/roster-planner">${ic('plus', 16)}Assign Shifts</a>`, [{ label: 'HR', href: '#/' }, { label: 'Shift & Attendance', href: '#/module/attendance' }, { label: 'Shift Roster' }])}
      <div class="ro-bar"><b>${lbl}</b>${st.off === 0 ? B.pill('Current week', 'info') : ''}${nOv ? `<span class="ro-ov">${nOv} manual change${nOv > 1 ? 's' : ''} <a href="#" data-act="ro-reset">Reset</a></span>` : ''}</div>
      <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="roq" value="${esc(st.q)}" placeholder="Search employee or department…"></label><select class="inp" style="max-width:200px" data-chg="rod"><option value="all">All departments</option>${depts.map((d) => `<option ${st.dept === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></div>
      <div class="legend-row roster-leg">${KEYS.map((k) => `<span><i class="sh ${COL[k]}"></i>${k} <em class="muted">${tm(k)}</em></span>`).join('')}<span><i class="sh off"></i>Off</span><span><i class="sh lv"></i>Leave</span></div>
      <div id="ro-grid">${grid()}</div>`;
  };
  const re = () => { const g = B.$('#ro-grid'); if (g) g.innerHTML = grid(); };
  B.inp.roq = (t) => { st.q = t.value; re(); };
  B.chg.rod = (t) => { st.dept = t.value; re(); };
  B.act['ro-nav'] = (t) => { const v = +t.dataset.v; st.off = v === 0 ? 0 : st.off + v; B.route(); };
  B.act['ro-reset'] = (t, ev) => { if (ev) ev.preventDefault(); ov = {}; save(); B.toast('Manual changes cleared'); B.route(); };
  B.act['ro-edit'] = (t) => {
    const e = B.emp(t.dataset.e), k = t.dataset.d, d = new Date(k + 'T00:00'), cur = cell(e, d), base = d.getDay() === 5 ? 'Off' : F2().rosterOf(e).name;
    B.modal({ title: 'Change shift', body: `<div class="oa-mh">${B.avatar(e.name, 44)}<div><b>${esc(e.name)}</b><span>${esc(e.dept)}</span><span>${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · currently <b>${cur}</b>${ov[e.id + '|' + k] ? ' (changed from ' + base + ')' : ''}</span></div></div>
      <div class="ro-pick">${KEYS.concat(['Off']).map((s) => `<button class="btn ${s === cur ? 'primary' : ''}" data-act="ro-set" data-e="${e.id}" data-d="${k}" data-v="${s}">${s}<em>${s === 'Off' ? 'Day off' : tm(s)}</em></button>`).join('')}</div>`, foot: `${ov[e.id + '|' + k] ? `<button class="btn" data-act="ro-set" data-e="${e.id}" data-d="${k}" data-v="">Back to roster (${base})</button>` : ''}<button class="btn" data-act="close-modal">Cancel</button>` });
  };
  B.act['ro-set'] = (t) => { const key = t.dataset.e + '|' + t.dataset.d, v = t.dataset.v, e = B.emp(t.dataset.e), d = new Date(t.dataset.d + 'T00:00'), base = d.getDay() === 5 ? 'Off' : F2().rosterOf(e).name; if (!v || v === base) delete ov[key]; else ov[key] = v; save(); B.closeModal(); B.toast('Shift updated'); re(); const p = B.$('.ro-bar'); if (p) B.route(); };
})();
