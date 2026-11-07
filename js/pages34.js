/* Sentradesk HRMS — Employee Attendance Tool: bulk marking with live summary, search, per-day save and leave pre-fill (overrides the simple page) */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const todayISO = () => iso(new Date());
  const STAT = [['Present', 'check', 'ok'], ['Absent', 'x', 'bad'], ['Half Day', 'clock', 'warn'], ['WFH', 'home', 'info'], ['On Leave', 'calendar', 'warn']];
  const KEY = 'att-tool';
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { saved = {}; }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { /* ignore */ } };
  const st = { date: todayISO(), dept: 'all', branch: 'all', q: '', sel: {}, rows: null, rowsDate: '', dirty: false };

  const onLeave = (e, d) => { try { const X = B.lvx; return X.D().apps.some((a) => a.emp === e.name && a.from <= d && a.to >= d && X.status(a) === 'Approved'); } catch (x) { return false; } };
  const staff = () => B.EMPLOYEES.filter((e) => e.status !== 'Left');
  const init = () => {
    if (st.rows && st.rowsDate === st.date) return;
    const s = saved[st.date] || {}; st.rows = {}; st.rowsDate = st.date; st.dirty = false; st.sel = {};
    staff().forEach((e) => { st.rows[e.id] = s[e.id] ? { s: s[e.id].s, late: !!s[e.id].late } : { s: onLeave(e, st.date) ? 'On Leave' : 'Present', late: false }; });
  };
  const vis = () => staff().filter((e) => (st.dept === 'all' || e.dept === st.dept) && (st.branch === 'all' || e.branch === st.branch) && (!st.q || (e.name + e.id + e.dept).toLowerCase().includes(st.q.toLowerCase())));
  const isFri = () => new Date(st.date + 'T00:00').getDay() === 5;
  const wasSaved = () => !!saved[st.date];

  const counts = () => { const c = {}; STAT.forEach((s) => { c[s[0]] = 0; }); vis().forEach((e) => { c[st.rows[e.id].s]++; }); return c; };
  const rowHtml = (e) => { const r = st.rows[e.id], can = r.s === 'Present' || r.s === 'WFH' || r.s === 'Half Day'; return `<tr class="${st.sel[e.id] ? 'sel' : ''}"><td class="chk"><input type="checkbox" data-act="at2-pick" data-id="${e.id}" ${st.sel[e.id] ? 'checked' : ''}></td><td><span class="who">${B.avatar(e.name, 34)}<span><b>${esc(e.name)}</b><em class="sub">${e.id} · ${esc(e.desig || '')}</em></span></span></td><td>${esc(e.dept)}<em class="sub">${esc(e.branch || '')}</em></td><td><div class="seg att-seg">${STAT.map((s) => `<button class="${r.s === s[0] ? 'on ' : ''}s-${s[0].replace(' ', '')}" data-act="at2-set" data-id="${e.id}" data-v="${s[0]}">${s[0]}</button>`).join('')}</div></td><td><label class="at2-late ${can ? '' : 'off'}"><input type="checkbox" data-act="at2-late" data-id="${e.id}" ${r.late ? 'checked' : ''} ${can ? '' : 'disabled'}><span>Late entry</span></label></td></tr>`; };
  const summary = () => { const c = counts(), n = vis().length || 1; return `<div class="at2-sum">${STAT.map((s) => `<div class="at2-s ${s[2]}"><span>${ic(s[1], 15)}${s[0]}</span><b>${c[s[0]]}</b><i><u style="width:${Math.round((c[s[0]] / n) * 100)}%"></u></i></div>`).join('')}</div>`; };
  const bodyHtml = () => `<tbody>${vis().map(rowHtml).join('') || `<tr><td colspan="5"><div class="empty">${ic('search', 30)}<b>No employees match</b></div></td></tr>`}</tbody>`;
  const selBar = () => { const n = Object.keys(st.sel).filter((k) => st.sel[k]).length; return n ? `<div class="at2-bulk"><b>${n} selected</b>${STAT.map((s) => `<button class="btn" data-act="at2-bulk" data-v="${s[0]}">${s[0]}</button>`).join('')}<button class="btn" data-act="at2-clear">Clear</button></div>` : ''; };
  const refresh = () => { const a = B.$('#at2-sum'), b = B.$('#at2-body'), c = B.$('#at2-bulk'); if (a) a.innerHTML = summary(); if (b) b.innerHTML = bodyHtml(); if (c) c.innerHTML = selBar(); };

  B.page['attendance-tool'] = () => {
    init(); const fri = isFri(), depts = [...new Set(staff().map((e) => e.dept))].sort(), brs = [...new Set(staff().map((e) => e.branch).filter(Boolean))].sort();
    const label = new Date(st.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return `${B.head('Employee Attendance Tool', 'Mark attendance for many employees in one go', `<button class="btn" data-act="at2-all">${ic('check', 15)}Mark all Present</button><button class="btn primary" data-act="at2-save">${ic('check-circle', 16)}Save Attendance</button>`, [{ label: 'HR', href: '#/' }, { label: 'Shift & Attendance', href: '#/module/attendance' }, { label: 'Attendance Tool' }])}
      <div class="card pad at2-f"><div class="fgrid f4"><div class="fld"><label>Date</label><input class="inp" type="date" max="${todayISO()}" value="${st.date}" data-chg="at2-date"></div><div class="fld"><label>Department</label><select class="inp" data-chg="at2-dept"><option value="all">All departments</option>${depts.map((d) => `<option ${st.dept === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></div><div class="fld"><label>Branch</label><select class="inp" data-chg="at2-br"><option value="all">All branches</option>${brs.map((d) => `<option ${st.branch === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></div><div class="fld"><label>Search</label><input class="inp" data-inp="at2-q" value="${esc(st.q)}" placeholder="Name or ID"></div></div>
        <div class="at2-d"><b>${label}</b>${st.date === todayISO() ? B.pill('Today', 'info') : ''}${wasSaved() ? B.pill('Already marked', 'ok') : B.pill('Not marked yet', 'warn')}${fri ? '<span class="at2-w">Friday is the weekly off — marking is optional.</span>' : ''}</div></div>
      <div id="at2-sum">${summary()}</div><div id="at2-bulk">${selBar()}</div>
      <div class="card table-card"><div class="tscroll"><table class="dt att-t"><thead><tr><th class="chk"><input type="checkbox" data-act="at2-pickall"></th><th>Employee</th><th>Department</th><th>Status</th><th>Late</th></tr></thead><tbody id="at2-body">${bodyHtml().replace(/^<tbody>|<\/tbody>$/g, '')}</tbody></table></div></div>`;
  };
  const setD = (d) => { if (d && d <= todayISO()) { st.date = d; st.rows = null; } B.route(); };
  B.chg['at2-date'] = (t) => setD(t.value);
  B.chg['at2-dept'] = (t) => { st.dept = t.value; refresh(); };
  B.chg['at2-br'] = (t) => { st.branch = t.value; refresh(); };
  B.inp['at2-q'] = (t) => { st.q = t.value; refresh(); };
  B.act['at2-set'] = (t) => { const r = st.rows[t.dataset.id]; r.s = t.dataset.v; if (!(r.s === 'Present' || r.s === 'WFH' || r.s === 'Half Day')) r.late = false; st.dirty = true; refresh(); };
  B.act['at2-late'] = (t) => { st.rows[t.dataset.id].late = t.checked; st.dirty = true; };
  B.act['at2-pick'] = (t) => { st.sel[t.dataset.id] = t.checked; const c = B.$('#at2-bulk'); if (c) c.innerHTML = selBar(); };
  B.act['at2-pickall'] = (t) => { vis().forEach((e) => { st.sel[e.id] = t.checked; }); refresh(); };
  B.act['at2-clear'] = () => { st.sel = {}; refresh(); };
  B.act['at2-bulk'] = (t) => { Object.keys(st.sel).filter((k) => st.sel[k]).forEach((id) => { const r = st.rows[id]; if (r) { r.s = t.dataset.v; if (!(r.s === 'Present' || r.s === 'WFH' || r.s === 'Half Day')) r.late = false; } }); st.sel = {}; st.dirty = true; refresh(); B.toast('Updated selected employees'); };
  B.act['at2-all'] = () => { vis().forEach((e) => { st.rows[e.id] = { s: 'Present', late: false }; }); st.dirty = true; refresh(); B.toast('All shown employees marked Present'); };
  B.act['at2-save'] = () => { saved[st.date] = st.rows; persist(); st.dirty = false; const n = vis().length; B.toast('Attendance saved for ' + n + ' employees'); B.route(); };
})();
