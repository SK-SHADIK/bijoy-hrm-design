/* Bijoy HRMS — Roster Planner: month grid (employees × days) with shift slot, start/end time and Day Off / CTO / Leave per day.
   Dates before today are locked. Data lives in the browser (localStorage). Reads the holiday calendar (B.holiday) when present. */
(function () {
  const B = window.B;
  if (!B) return;
  const { ic, esc } = B;
  const KEY = 'bijoy-rostergrid-db-v2';
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const mkey = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1);
  const mlabel = (k) => new Date(k + '-01T00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const dlabel = (d) => new Date(d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
  const isHR = () => B.role !== 'employee';
  const emps = () => B.EMPLOYEES.filter((e) => e.status !== 'Left');
  const field = (l, c) => `<div class="fld"><label>${l}</label>${c}</div>`;
  const crumbs = [{ label: 'HR', href: '#/' }, { label: 'Shift & Attendance' }, { label: 'Roster Planner' }];
  const SC = ['#f59e0b', '#3b82f6', '#8b5cf6', '#64748b', '#0d9488', '#ec4899', '#22c55e', '#f97316'];

  const DEFAULT_SLOTS = () => [
    { id: 's-morning', name: 'Morning', start: '06:00', end: '15:00' },
    { id: 's-general', name: 'General', start: '09:30', end: '18:30' },
    { id: 's-evening', name: 'Evening', start: '14:00', end: '23:00' },
    { id: 's-night', name: 'Night', start: '22:00', end: '06:00' },
    { id: 's-support', name: 'Support Desk', start: '08:00', end: '17:00' },
    { id: 's-half', name: 'Half Day', start: '09:30', end: '14:00' }
  ];

  /* ---------- store ---------- */
  let db = null;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  const D = () => {
    if (!db) { try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} }
    if (!db || !db.slots) { db = { slots: DEFAULT_SLOTS(), rosters: {}, savedAt: {} }; db.rosters[mkey(new Date())] = gen(mkey(new Date())); db.savedAt[mkey(new Date())] = new Date().toISOString(); save(); }
    return db;
  };
  const slotBy = (id) => D().slots.find((s) => s.id === id);
  const slotColor = (id) => { const i = D().slots.findIndex((x) => x.id === id); return i < 0 ? '#94a3b8' : SC[i % SC.length]; };

  /* ---------- helpers ---------- */
  const todayIso = () => iso(new Date());
  const locked = (d) => d < todayIso();
  const monthState = (mk) => { const t = mkey(new Date()); return mk < t ? 'past' : mk === t ? 'current' : 'future'; };
  const daysOf = (mk) => { const [y, m] = mk.split('-').map(Number), n = new Date(y, m, 0).getDate(); return Array.from({ length: n }, (_, i) => y + '-' + B.pad(m) + '-' + B.pad(i + 1)); };
  const dow = (d) => new Date(d + 'T00:00').getDay();
  const holidayOff = (d) => { try { return !!(B.holiday && B.holiday.isOff(d)); } catch (e) { return false; } };
  const offDay = (d) => dow(d) === 5 || holidayOff(d);
  const cellFrom = (slot) => { const s = slotBy(slot) || DEFAULT_SLOTS().find((x) => x.id === slot); return { slot, start: s ? s.start : '', end: s ? s.end : '', off: false, cto: false, l: false }; };
  const blank = () => ({ slot: '', start: '', end: '', off: false, cto: false, l: false });
  /* demo roster: every employee gets a shift pattern, plus leave blocks, CTO days and some alternate-Saturday offs,
     so the grid shows morning, evening, night, support, half-day, leave, CTO and day-off together */
  const PATTERNS = [
    () => 's-general',
    (wk) => (wk % 2 ? 's-evening' : 's-morning'),
    () => 's-evening',
    (wk) => (wk % 2 ? 's-night' : 's-morning'),
    () => 's-support',
    (wk) => ['s-morning', 's-general', 's-evening', 's-night'][wk % 4],
    (wk, d) => (dow(d) === 4 ? 's-half' : 's-general'),
    () => 's-morning',
    (wk) => (wk % 2 ? 's-support' : 's-evening')
  ];
  function gen(mk) {
    const out = {}, ds = daysOf(mk), n = ds.length;
    emps().forEach((e, i) => {
      const h = B.hash(e.id + mk) >>> 0, pat = PATTERNS[i % PATTERNS.length];
      const lv = new Set(), cto = new Set();
      const block = (set, start, len) => { for (let k = 0; k < len; k++) set.add(start + k); };
      if (i % 5 !== 4) block(lv, 2 + (h % Math.max(1, n - 12)), 1 + (h % 3));
      if (i % 2 === 0) block(lv, n - 9 + ((h >>> 3) % 6), 1 + ((h >>> 5) % 2));
      if (i % 3 !== 1) cto.add(3 + ((h >>> 7) % Math.max(1, n - 14)));
      if (i % 3 !== 2) cto.add(n - 8 + ((h >>> 11) % 7));
      out[e.id] = {};
      ds.forEach((d) => {
        const dn = +d.slice(8), wk = Math.floor((dn - 1) / 7);
        let c;
        if (offDay(d) || (dow(d) === 6 && i % 4 === 0 && wk % 2 === 1)) c = Object.assign(blank(), { off: true });
        else if (lv.has(dn)) c = Object.assign(blank(), { l: true });
        else if (cto.has(dn)) c = Object.assign(blank(), { cto: true });
        else c = cellFrom(pat(wk, d));
        out[e.id][d] = c;
      });
    });
    return out;
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------- state ---------- */
  const F = { month: mkey(new Date()), sel: '', dept: '', q: '', draft: null, dirty: false, from: null, brush: '' };
  const months = () => { const n = new Date(), out = []; for (let i = -12; i <= 3; i++) out.push(mkey(new Date(n.getFullYear(), n.getMonth() + i, 1))); return out; };
  const pull = (mk) => {
    const saved = D().rosters[mk];
    F.month = mk; F.dirty = false;
    if (saved) { F.draft = clone(saved); F.from = 'saved'; } else { F.draft = gen(mk); F.from = 'generated'; }
    emps().forEach((e) => { if (!F.draft[e.id]) F.draft[e.id] = gen(mk)[e.id]; });
  };
  const visible = () => emps().filter((e) => (!F.dept || e.dept === F.dept) && (!F.q || (e.name + ' ' + e.id).toLowerCase().includes(F.q.toLowerCase())));
  const cellOf = (e, d) => { const r = F.draft[e] || (F.draft[e] = {}); return r[d] || (r[d] = blank()); };
  const touch = () => { F.dirty = true; const b = B.$('#rg-dirty'); if (b) b.hidden = false; };

  /* ---------- render ---------- */
  const slotOpts = (c) => `<option value="">Select</option>${D().slots.map((x) => `<option value="${x.id}" ${c.slot === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}${c.slot === 'custom' ? '<option value="custom" selected>Custom</option>' : ''}`;
  const chip = (k, label, on, title, ro) => `<label class="rg-chip ${k} ${on ? 'on' : ''} ${ro ? 'ro' : ''}" title="${title}"><input type="checkbox" data-chg="rg-flag" data-k="${k}" ${on ? 'checked' : ''} ${ro ? 'disabled' : ''}>${label}</label>`;
  const cellHtml = (e, d) => {
    const c = cellOf(e, d), lk = locked(d), sl = slotBy(c.slot);
    const cls = ['rg-c', c.off ? 'off' : '', c.l ? 'lv' : '', c.cto && !c.off && !c.l ? 'ct' : '', !c.off && !c.l && !c.cto && c.slot ? 'has' : '', c.cto ? 'cto' : '', dow(d) === 5 ? 'fri' : '', holidayOff(d) && dow(d) !== 5 ? 'hol' : '', d === todayIso() ? 'today' : '', lk ? 'lock' : ''].join(' ');
    const ro = !c.slot ? '<div class="rg-ro"><span>—</span></div>' : `<div class="rg-ro"><b>${esc(sl ? sl.name : 'Custom')}</b><span>${c.start || ''}${c.end ? ' – ' + c.end : ''}</span></div>`;
    const body = c.l ? '<div class="rg-state lv">On leave</div>' : c.off ? '<div class="rg-state off">Day off</div>' : c.cto ? '<div class="rg-state ct">CTO<small>Comp. time off</small></div>' : lk ? ro
      : `<select class="inp sm" data-chg="rg-slot" aria-label="Shift slot">${slotOpts(c)}</select><div class="rg-tm"><input class="inp sm" type="time" data-chg="rg-time" data-k="start" value="${c.start || ''}" aria-label="Start time"><i>–</i><input class="inp sm" type="time" data-chg="rg-time" data-k="end" value="${c.end || ''}" aria-label="End time"></div>`;
    return `<div class="${cls}" style="--sc:${slotColor(c.slot)}" data-e="${e}" data-d="${d}" ${lk ? 'title="Past date — locked"' : ''}>${body}<div class="rg-chips">${chip('cto', 'CTO', c.cto, 'Compensatory time off', lk)}${chip('off', 'Off', c.off, 'Day off', lk)}${chip('l', 'Leave', c.l, 'On leave', lk)}</div></div>`;
  };
  const gridHtml = () => {
    const ds = daysOf(F.month), list = visible(), td = todayIso();
    if (!list.length) return '<div class="rg-empty">No employees match the filter.</div>';
    const head = `<div class="rg-row rg-hd"><div class="rg-emp"><span class="rg-ht">Employee <em>${list.length}</em></span></div>${ds.map((d) => `<div class="rg-dh ${locked(d) ? 'past' : ''} ${dow(d) === 5 ? 'fri' : ''} ${holidayOff(d) && dow(d) !== 5 ? 'hol' : ''} ${d === td ? 'today' : ''}"><span>${DOW[dow(d)]}</span><b>${+d.slice(8)}</b></div>`).join('')}</div>`;
    const rows = list.map((e) => `<div class="rg-row" data-eid="${e.id}"><div class="rg-emp">${B.avatar(e.name, 32)}<div class="rg-ei"><b>${esc(e.name)}</b><span>${esc(e.id)} · ${esc(e.dept)}</span></div><select class="rg-fill" data-chg="rg-fill" aria-label="Fill month for ${esc(e.name)}" title="Fill the rest of the month"><option value="">Fill…</option>${D().slots.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}<option value="__off">All off</option></select></div>${ds.map((d) => cellHtml(e.id, d)).join('')}</div>`).join('');
    return head + rows;
  };
  const stats = () => {
    const ds = daysOf(F.month), list = visible(); let work = 0, off = 0, lv = 0, cto = 0;
    list.forEach((e) => ds.forEach((d) => { const c = cellOf(e.id, d); if (c.l) lv++; else if (c.off) off++; else if (c.slot) work++; if (c.cto) cto++; }));
    return `<span class="rg-st"><b>${list.length}</b>Employees</span><span class="rg-st w"><b>${work}</b>Shifts</span><span class="rg-st o"><b>${off}</b>Days off</span><span class="rg-st l"><b>${lv}</b>Leave</span><span class="rg-st c"><b>${cto}</b>CTO</span>`;
  };
  const legend = () => `<div class="rg-legend">${D().slots.map((x) => `<span><i class="rg-k" style="background:${slotColor(x.id)}"></i>${esc(x.name)} <em>${x.start}–${x.end}</em></span>`).join('')}<span><i class="rg-k off"></i>Day off</span><span><i class="rg-k lv"></i>Leave</span></div>`;
  const brushHint = () => (F.brush ? 'Click or drag across days to apply. Click the active tool again to stop painting.' : 'Pick a tool to paint many days quickly, or edit any day directly.');
  const brushBtn = (id, label, color) => `<button type="button" class="rg-br ${F.brush === id ? 'on' : ''}" data-act="rg-brush" data-b="${id}" style="--sc:${color}"><i></i>${label}</button>`;
  const brushBar = () => `<div class="rg-paint"><span class="rg-pl">${ic('edit', 14)}Paint</span>${D().slots.map((x) => brushBtn('slot:' + x.id, `${esc(x.name)} <em>${x.start}–${x.end}</em>`, slotColor(x.id))).join('')}${brushBtn('off', 'Day off', '#94a3b8')}${brushBtn('leave', 'Leave', '#3b82f6')}${brushBtn('cto', 'CTO', '#22c55e')}${brushBtn('clear', 'Clear', '#ef4444')}<span class="rg-ph" id="rg-ph">${brushHint()}</span></div>`;
  const redraw = () => { const w = B.$('#rg-wrap'), l = w ? w.scrollLeft : 0, t = w ? w.scrollTop : 0; if (w) { w.innerHTML = gridHtml(); w.scrollLeft = l; w.scrollTop = t; } const s = B.$('#rg-stats'); if (s) s.innerHTML = stats(); };
  /* scroll the grid so today's column is the first visible day (current month only) */
  const scrollToToday = () => {
    const w = B.$('#rg-wrap'); if (!w) return;
    const t = w.querySelector ? w.querySelector('.rg-dh.today') : null;
    if (!t) { w.scrollLeft = 0; return; }
    w.scrollLeft += t.getBoundingClientRect().left - w.getBoundingClientRect().left - 232 - 6;
  };
  const repaint = (el) => { el.outerHTML = cellHtml(el.dataset.e, el.dataset.d); const s = B.$('#rg-stats'); if (s) s.innerHTML = stats(); };

  const planner = () => {
    if (!F.draft) pull(F.month);
    const ml = months(), depts = [...new Set(emps().map((e) => e.dept))], ms = monthState(F.month);
    return `${B.head('Roster Planner', 'Create the monthly roster: paint shifts across days, or set each day yourself.', isHR() ? `<button class="btn" data-act="rg-slots">${ic('settings', 15)}Manage slots</button><button class="btn" data-act="rg-bulk">${ic('layers', 15)}Bulk assign</button><button class="btn primary" data-act="rg-save">${ic('check-circle', 16)}Save Roster</button>` : '', crumbs)}
      <div class="card pad rg-bar">
        <div class="rg-bar-l"><div class="rg-pullbox"><div class="fld"><label for="rg-msel">Select month</label><select class="inp" id="rg-msel" data-chg="rg-month">${ml.map((m) => `<option value="${m}" ${m === (F.sel || F.month) ? 'selected' : ''}>${mlabel(m)}</option>`).join('')}</select></div>
          <button class="btn ${F.sel ? 'primary' : ''}" id="rg-pullbtn" data-act="rg-pull">${ic('refresh', 15)}Pull Roster</button></div>
          <div class="fld"><label>Department</label><select class="inp" data-chg="rg-dept"><option value="">All departments</option>${depts.map((d) => `<option ${d === F.dept ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></div>
          <div class="fld"><label>Search</label><input class="inp" data-inp="rg-q" placeholder="Name or employee ID" value="${esc(F.q)}"></div></div>
        <div class="rg-bar-r"><span class="pill warn" id="rg-dirty" ${F.dirty ? '' : 'hidden'}><i></i>Unsaved changes</span><span class="muted" id="rg-src">${F.from === 'saved' ? 'Saved roster' : 'Auto-generated draft (not saved yet)'}</span></div>
      </div>
      <div class="rg-sub"><div class="rg-nav"><button class="icon-btn" data-act="rg-step" data-d="-1" aria-label="Previous month">${ic('left', 18)}</button><h3>${mlabel(F.month)}</h3><button class="icon-btn" data-act="rg-step" data-d="1" aria-label="Next month">${ic('right', 18)}</button></div><div class="rg-stats" id="rg-stats">${stats()}</div></div>
      <div class="rg-lockbar ${ms}">${ic('alert', 15)}${{ past: 'Past month — view only. Dates before today cannot be changed.', current: 'Dates before today are locked. You can edit today and the days ahead, or move to the next month.', future: 'Upcoming month — all dates can be edited.' }[ms]}</div>
      ${isHR() && ms !== 'past' ? brushBar() : legend()}
      <div class="rg-wrap ${F.brush ? 'painting' : ''}" id="rg-wrap">${gridHtml()}</div>`;
  };
  /* opening the page always lands on the current month with today in view (unsaved edits are kept) */
  B.page['roster-planner'] = () => { F.brush = ''; if (!F.dirty) { F.sel = ''; pull(mkey(new Date())); } B.onMount(scrollToToday); return planner(); };

  /* ---------- navigation / save ---------- */
  const guard = () => !F.dirty || window.confirm('You have unsaved changes. Discard them?');
  const rerender = () => { const v = B.$('#view .fade'); if (v) v.innerHTML = planner(); scrollToToday(); };
  B.chg['rg-month'] = (t) => { F.sel = t.value === F.month ? '' : t.value; const b = B.$('#rg-pullbtn'); if (b) b.classList.toggle('primary', !!F.sel); };
  B.act['rg-pull'] = () => { const target = F.sel || F.month; if (!guard()) return; F.sel = ''; F.brush = ''; pull(target); rerender(); B.toast(F.from === 'saved' ? 'Roster pulled for ' + mlabel(F.month) : 'No saved roster for ' + mlabel(F.month) + ' — draft generated'); };
  B.act['rg-step'] = (t) => { if (!guard()) return; F.sel = ''; F.brush = ''; const [y, m] = F.month.split('-').map(Number); pull(mkey(new Date(y, m - 1 + +t.dataset.d, 1))); rerender(); };
  B.chg['rg-dept'] = (t) => { F.dept = t.value; redraw(); };
  B.inp['rg-q'] = (t) => { F.q = t.value; redraw(); };
  B.act['rg-save'] = () => { D().rosters[F.month] = clone(F.draft); D().savedAt[F.month] = new Date().toISOString(); save(); F.dirty = false; F.from = 'saved'; const b = B.$('#rg-dirty'); if (b) b.hidden = true; const s = B.$('#rg-src'); if (s) s.textContent = 'Saved roster'; B.toast('Roster saved for ' + mlabel(F.month)); };

  /* ---------- painting ---------- */
  const paintCell = (el, brush, announce) => {
    const d = el.dataset.d, e = el.dataset.e;
    if (locked(d)) { if (announce) B.toast('Dates before today cannot be changed', 'bad'); return; }
    const c = cellOf(e, d);
    if (brush.startsWith('slot:')) Object.assign(c, cellFrom(brush.slice(5)));
    else if (brush === 'off') Object.assign(c, blank(), { off: true });
    else if (brush === 'leave') Object.assign(c, blank(), { l: true });
    else if (brush === 'cto') Object.assign(c, blank(), { cto: !c.cto });
    else if (brush === 'clear') Object.assign(c, blank());
    touch(); repaint(el);
  };
  B.act['rg-brush'] = (t) => {
    const id = t.dataset.b; F.brush = F.brush === id ? '' : id;
    B.$$('.rg-br').forEach((b) => b.classList.toggle('on', b.dataset.b === F.brush));
    const w = B.$('#rg-wrap'); if (w) w.classList.toggle('painting', !!F.brush);
    const h = B.$('#rg-ph'); if (h) h.textContent = brushHint();
  };
  let painting = false;
  document.addEventListener('mousedown', (ev) => { if (!F.brush || ev.button !== 0) return; const c = ev.target.closest && ev.target.closest('.rg-c'); if (!c) return; ev.preventDefault(); painting = F.brush !== 'cto'; paintCell(c, F.brush, true); });
  document.addEventListener('mouseover', (ev) => { if (!painting || !F.brush) return; const c = ev.target.closest && ev.target.closest('.rg-c'); if (c) paintCell(c, F.brush, false); });
  document.addEventListener('mouseup', () => { painting = false; });

  /* ---------- cell edits ---------- */
  const lockedMsg = (el) => { if (!locked(el.dataset.d)) return false; B.toast('Dates before today cannot be changed', 'bad'); repaint(el); return true; };
  B.chg['rg-flag'] = (t) => {
    const el = t.closest('.rg-c'); if (lockedMsg(el)) return;
    const c = cellOf(el.dataset.e, el.dataset.d), k = t.dataset.k; c[k] = t.checked;
    if (t.checked && k === 'cto') Object.assign(c, blank(), { cto: true });
    if (t.checked && k === 'off') Object.assign(c, blank(), { off: true });
    if (t.checked && k === 'l') Object.assign(c, blank(), { l: true });
    touch(); repaint(el);
  };
  B.chg['rg-slot'] = (t) => {
    const el = t.closest('.rg-c'); if (lockedMsg(el)) return;
    const c = cellOf(el.dataset.e, el.dataset.d), s = slotBy(t.value);
    if (c.cto) { B.toast('Untick CTO to choose a shift', 'bad'); repaint(el); return; }
    c.slot = t.value; c.start = s ? s.start : ''; c.end = s ? s.end : ''; touch(); repaint(el);
  };
  B.chg['rg-time'] = (t) => {
    const el = t.closest('.rg-c'); if (lockedMsg(el)) return;
    const c = cellOf(el.dataset.e, el.dataset.d); c[t.dataset.k] = t.value;
    const s = slotBy(c.slot); if (!s || s.start !== c.start || s.end !== c.end) c.slot = 'custom'; touch(); repaint(el);
  };

  /* ---------- row fill / bulk assign ---------- */
  B.chg['rg-fill'] = (t) => {
    const id = t.closest('.rg-row').dataset.eid, v = t.value; if (!v) return;
    daysOf(F.month).filter((d) => !locked(d)).forEach((d) => {
      const c = cellOf(id, d);
      if (v === '__off') { Object.assign(c, blank(), { off: true }); return; }
      if (c.l || c.cto || offDay(d)) return; Object.assign(c, cellFrom(v), { l: false });
    });
    touch(); redraw(); B.toast('Month filled for ' + (B.emp(id) || {}).name);
  };
  B.act['rg-bulk'] = () => {
    const ds = daysOf(F.month).filter((d) => !locked(d)), n = visible().length;
    if (!ds.length) { B.toast('This month is in the past — it cannot be changed', 'bad'); return; }
    B.modal({ title: 'Bulk assign', body: `<div class="as-note">${ic('users', 14)} Applies to the <b>${n}</b> employee(s) currently shown (department and search filters apply). Dates before today are never changed.</div>
      <div class="fgrid" style="grid-template-columns:1fr 1fr">${field('Shift slot', `<select class="inp" id="rgb-s" data-chg="rg-bulk-slot">${D().slots.map((s) => `<option value="${s.id}">${esc(s.name)} (${s.start}–${s.end})</option>`).join('')}<option value="__off">Day Off</option><option value="__l">On leave (L)</option></select>`)}${field('Skip weekly off / holidays', '<select class="inp" id="rgb-k"><option value="1">Yes, skip them</option><option value="0">No, overwrite everything</option></select>')}${field('From', `<input class="inp" type="date" id="rgb-f" min="${ds[0]}" max="${ds[ds.length - 1]}" value="${ds[0]}">`)}${field('To', `<input class="inp" type="date" id="rgb-t" min="${ds[0]}" max="${ds[ds.length - 1]}" value="${ds[ds.length - 1]}">`)}${field('Start time', `<input class="inp" type="time" id="rgb-st" value="${D().slots[0].start}">`)}${field('End time', `<input class="inp" type="time" id="rgb-en" value="${D().slots[0].end}">`)}</div><p class="muted" style="margin:8px 0 0">Times fill in from the selected slot; change them if this assignment needs different hours.</p>`,
      foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="rg-bulk-do">Apply</button>' });
  };
  B.chg['rg-bulk-slot'] = (t) => {
    const sl = slotBy(t.value), st = B.$('#rgb-st'), en = B.$('#rgb-en');
    st.disabled = en.disabled = !sl; st.value = sl ? sl.start : ''; en.value = sl ? sl.end : '';
  };
  B.act['rg-bulk-do'] = () => {
    const v = B.$('#rgb-s').value, skip = B.$('#rgb-k').value === '1', f = B.$('#rgb-f').value, t = B.$('#rgb-t').value, st = B.$('#rgb-st').value, en = B.$('#rgb-en').value;
    if (!f || !t || f > t) { B.toast('Choose a valid date range', 'bad'); return; }
    if (v[0] !== '_' && (!st || !en)) { B.toast('Set start and end time', 'bad'); return; }
    let n = 0;
    visible().forEach((e) => daysOf(F.month).filter((d) => d >= f && d <= t && !locked(d)).forEach((d) => {
      if (skip && offDay(d) && v !== '__off') return;
      const c = cellOf(e.id, d);
      if (c.cto && v[0] !== '_') return;
      if (v === '__off') Object.assign(c, blank(), { off: true });
      else if (v === '__l') Object.assign(c, blank(), { l: true });
      else { Object.assign(c, cellFrom(v)); const b = slotBy(v) || {}; if (st !== b.start || en !== b.end) Object.assign(c, { slot: 'custom', start: st, end: en }); }
      n++;
    }));
    B.closeModal(); touch(); redraw(); B.toast(n + ' day(s) updated');
  };

  /* ---------- shift slots ---------- */
  const slotRows = () => D().slots.map((s) => `<tr data-id="${s.id}"><td><span class="rg-dot" style="background:${slotColor(s.id)}"></span><input class="inp sm" data-chg="rg-sl" data-k="name" value="${esc(s.name)}" aria-label="Slot name"></td><td><input class="inp sm" type="time" data-chg="rg-sl" data-k="start" value="${s.start}"></td><td><input class="inp sm" type="time" data-chg="rg-sl" data-k="end" value="${s.end}"></td><td class="r"><button class="icon-btn sm" data-act="rg-sl-del" aria-label="Delete slot">${ic('trash', 15)}</button></td></tr>`).join('');
  B.act['rg-slots'] = () => B.modal({ title: 'Shift slots', body: `<p class="muted" style="margin:0 0 10px">Slot names appear in every roster cell. Changing a slot's time does not change days that already use it.</p>
    <table class="dt"><thead><tr><th>Slot name</th><th>Start</th><th>End</th><th></th></tr></thead><tbody id="rgs-body">${slotRows()}</tbody></table>
    <div class="fgrid" style="grid-template-columns:1.4fr 1fr 1fr auto;align-items:end;margin-top:14px">${field('New slot', '<input class="inp" id="rgs-n" placeholder="e.g. Weekend Duty">')}${field('Start', '<input class="inp" type="time" id="rgs-s" value="09:00">')}${field('End', '<input class="inp" type="time" id="rgs-e" value="17:00">')}<button class="btn primary" data-act="rg-sl-add">${ic('plus', 15)}Add</button></div>`,
    foot: '<button class="btn primary" data-act="rg-sl-done">Done</button>', wide: true });
  B.chg['rg-sl'] = (t) => { const s = slotBy(t.closest('tr').dataset.id); if (!s) return; const v = t.value.trim(); if (t.dataset.k === 'name' && !v) { t.value = s.name; return; } s[t.dataset.k] = v; save(); };
  B.act['rg-sl-add'] = () => {
    const n = B.$('#rgs-n').value.trim(), s = B.$('#rgs-s').value, e = B.$('#rgs-e').value;
    if (!n) { B.toast('Enter a slot name', 'bad'); return; } if (D().slots.some((x) => x.name.toLowerCase() === n.toLowerCase())) { B.toast('A slot with this name already exists', 'bad'); return; } if (!s || !e) { B.toast('Set start and end time', 'bad'); return; }
    D().slots.push({ id: 's-' + Date.now().toString(36), name: n, start: s, end: e }); save(); B.$('#rgs-body').innerHTML = slotRows(); B.$('#rgs-n').value = ''; B.toast('Slot added');
  };
  B.act['rg-sl-del'] = (t) => { if (D().slots.length <= 1) { B.toast('Keep at least one slot', 'bad'); return; } const id = t.closest('tr').dataset.id; D().slots = D().slots.filter((s) => s.id !== id); save(); B.$('#rgs-body').innerHTML = slotRows(); };
  B.act['rg-sl-done'] = () => { B.closeModal(); if (F.draft) { rerender(); } };

  /* ---------- registration ---------- */
  B.PAGES['roster-planner'] = { label: 'Roster Planner', icon: 'grid' };
  const m = B.NAV.find((x) => x.id === 'attendance');
  if (m && !m.items.includes('p:roster-planner')) { const i = m.items.indexOf('p:roster-master'); m.items.splice(i >= 0 ? i + 1 : m.items.length, 0, 'p:roster-planner'); }
})();
