/* Sentradesk HRMS — Leave Calendar: month grid with holidays, filters, day detail panel and agenda view (overrides the simple page) */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const X = () => B.lvx;
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const today = () => iso(new Date());
  const fmtS = (d) => new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const diff = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);
  const TC = { 'Casual Leave': 'var(--accent)', 'Sick Leave': 'var(--bad)', 'Earned Leave': 'var(--ok)', 'Maternity Leave': 'var(--c4)', 'Paternity Leave': 'var(--c4)', 'Quarantine Leave': 'var(--warn)', 'Compensatory Off': 'var(--c4)', 'Leave Without Pay': 'var(--c2)' };
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MFULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const now = new Date();
  const st = { y: now.getFullYear(), m: now.getMonth(), dept: 'all', hide: {}, sel: today(), view: 'month' };

  const apps = () => X().D().apps.filter((a) => { const s = X().status(a); return (s === 'Approved' || s === 'Pending') && (st.dept === 'all' || X().eByName(a.emp).dept === st.dept) && !st.hide[a.type]; });
  const on = (A, d) => A.filter((a) => a.from <= d && a.to >= d);
  const holName = (d) => { const h = X().holInfo(d); return h && !/Weekly off/.test(h) ? h : ''; };
  const staff = () => B.EMPLOYEES.filter((e) => e.status !== 'Left' && (st.dept === 'all' || e.dept === st.dept)).length || 1;
  const col = (t) => TC[t] || 'var(--accent)';
  const shortT = (t) => t.replace(' Leave', '').replace('Leave Without Pay', 'LWP').replace('Compensatory Off', 'Comp');
  const kp = (i, l, v, c, sub) => `<div class="card ivk"><span class="ivk-i ${c || ''}">${ic(i, 18)}</span><div><b>${v}</b><span>${l}</span>${sub ? `<em class="ld-sub">${sub}</em>` : ''}</div></div>`;

  const dayPanel = (A) => {
    const d = st.sel, L = on(A, d), h = holName(d), wk = new Date(d + 'T00:00').getDay() === 5, away = L.length, pct = Math.round((away / staff()) * 100);
    const label = new Date(d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    const byDept = {}; L.forEach((a) => { const k = X().eByName(a.emp).dept || 'Other'; byDept[k] = (byDept[k] || 0) + 1; });
    return `<div class="card pad lc-day"><div class="lc-dh"><div><b>${label}</b><span>${d === today() ? 'Today' : diff(today(), d) > 0 ? 'In ' + diff(today(), d) + ' days' : Math.abs(diff(today(), d)) + ' days ago'}</span></div>${h ? `<span class="pill info"><i></i>${esc(h)}</span>` : wk ? '<span class="pill mute"><i></i>Weekly off</span>' : ''}</div>
      <div class="lc-cov"><div class="lc-cn"><b>${away}</b><span>away</span></div><div class="lc-cb"><div class="la-sb"><u style="width:${Math.min(100, pct * 3)}%;background:${pct >= 20 ? 'var(--bad)' : pct >= 10 ? 'var(--warn)' : 'var(--ok)'}"></u></div><span>${pct}% of ${staff()} staff${pct >= 20 ? ' · coverage risk' : ''}</span></div></div>
      ${L.length ? `<ul class="lc-pl">${L.map((a) => { const e = X().eByName(a.emp), s = X().status(a); return `<li style="--lc:${col(a.type)}">${B.avatar(a.emp, 34)}<div><b>${esc(a.emp)}</b><span>${esc(e.dept || '')} · ${esc(shortT(a.type))} · ${fmtS(a.from)}${a.to !== a.from ? ' – ' + fmtS(a.to) : ''}</span></div>${s === 'Pending' ? '<span class="pill warn"><i></i>Pending</span>' : ''}<a class="icon-btn sm" href="#/list/leave-application/app/${encodeURIComponent(a.id)}" aria-label="Open">${ic('right', 14)}</a></li>`; }).join('')}</ul>` : `<div class="empty">${ic('check-circle', 30)}<b>${h || wk ? 'Day off' : 'Everyone is in'}</b></div>`}
      ${Object.keys(byDept).length > 1 ? `<div class="lc-dd">${Object.keys(byDept).map((k) => `<span>${esc(k)} <b>${byDept[k]}</b></span>`).join('')}</div>` : ''}</div>`;
  };

  B.page['leave-calendar'] = () => {
    const A = apps(), t0 = today(), first = new Date(st.y, st.m, 1), last = new Date(st.y, st.m + 1, 0), lead = first.getDay();
    const mS = iso(first), mE = iso(last), inMonth = A.filter((a) => a.from <= mE && a.to >= mS);
    const cnt = {}; for (let d = 1; d <= last.getDate(); d++) { const k = st.y + '-' + B.pad(st.m + 1) + '-' + B.pad(d); cnt[k] = on(A, k).length; }
    const busiest = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0], hmax = Math.max(1, ...Object.values(cnt));
    const days = inMonth.reduce((n, a) => n + Math.max(0, Math.min(diff(a.from < mS ? mS : a.from, a.to > mE ? mE : a.to) + 1, 99)), 0);
    const away = on(A, t0).length, pend = inMonth.filter((a) => X().status(a) === 'Pending').length;
    const depts = [...new Set(B.EMPLOYEES.map((e) => e.dept))].sort(), types = Object.keys(X().TYPES);
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<div class="lc-c blank"></div>';
    for (let d = 1; d <= last.getDate(); d++) {
      const k = st.y + '-' + B.pad(st.m + 1) + '-' + B.pad(d), L = on(A, k), dow = new Date(k + 'T00:00').getDay(), h = holName(k), n = L.length;
      cells += `<div class="lc-c ${dow === 5 ? 'off' : ''} ${h ? 'hol' : ''} ${k === t0 ? 'today' : ''} ${k === st.sel ? 'sel' : ''}" data-act="lcx-day" data-d="${k}" style="--h:${n ? Math.max(.06, n / hmax * .22).toFixed(2) : 0}"><div class="lc-ch"><b>${d}</b>${n > 3 ? `<em>${n}</em>` : ''}</div>${h ? `<div class="lc-hn">${ic('coffee', 11)}${esc(h)}</div>` : ''}${L.slice(0, h ? 2 : 3).map((a) => `<div class="lc-p ${X().status(a) === 'Pending' ? 'pend' : ''}" style="--lc:${col(a.type)}" title="${esc(a.emp)} · ${esc(a.type)}"><i></i>${esc(a.emp.split(' ')[0])}</div>`).join('')}${n > (h ? 2 : 3) ? `<div class="lc-more">+${n - (h ? 2 : 3)} more</div>` : ''}</div>`;
    }
    const agendaDays = []; for (let d = 1; d <= last.getDate(); d++) { const k = st.y + '-' + B.pad(st.m + 1) + '-' + B.pad(d); if (on(A, k).length || holName(k)) agendaDays.push(k); }
    const agenda = `<div class="card pad lc-ag">${agendaDays.map((k) => { const L = on(A, k), h = holName(k); return `<div class="lc-ar ${k === t0 ? 'today' : ''}"><div class="lc-ad"><b>${new Date(k + 'T00:00').getDate()}</b><span>${DOW[new Date(k + 'T00:00').getDay()]}</span></div><div class="lc-al">${h ? `<span class="lc-hn big">${ic('coffee', 12)}${esc(h)}</span>` : ''}${L.map((a) => `<span class="lc-p ${X().status(a) === 'Pending' ? 'pend' : ''}" style="--lc:${col(a.type)}"><i></i>${esc(a.emp)} · ${esc(shortT(a.type))}</span>`).join('')}</div><button class="btn sm" data-act="lcx-day" data-d="${k}">Details</button></div>`; }).join('') || `<div class="empty">${ic('check-circle', 34)}<b>No leave this month</b></div>`}</div>`;
    const hol = [...new Set((() => { const o = []; for (let i = 0; i < 120 && o.length < 4; i++) { const k = iso(new Date(Date.now() + i * 864e5)); if (holName(k)) o.push(k); } return o; })())];
    const byType = types.map((t) => ({ label: shortT(t), value: inMonth.filter((a) => a.type === t).reduce((n, a) => n + a.days, 0), color: col(t) })).filter((x) => x.value);
    return `${B.head('Leave Calendar', 'Who is away, when, and where coverage is thin. Click any day for details.', `<select class="inp sm" data-chg="lcxd"><option value="all">All departments</option>${depts.map((d) => `<option ${st.dept === d ? 'selected' : ''}>${d}</option>`).join('')}</select><div class="seg sm"><button class="${st.view === 'month' ? 'on' : ''}" data-act="lcx-view" data-v="month">${ic('calendar', 14)}Month</button><button class="${st.view === 'agenda' ? 'on' : ''}" data-act="lcx-view" data-v="agenda">${ic('list', 14)}Agenda</button></div><a class="btn primary" href="#/page/leave-apply">${ic('plus', 16)}Apply Leave</a>`, [{ label: 'HR', href: '#/' }, { label: 'Leaves', href: '#/module/leaves' }, { label: 'Leave Calendar' }])}
      <section class="iv-kpis">${kp('users', 'Away today', away, 'c', Math.round((away / staff()) * 100) + '% of staff')}${kp('calendar', 'Leave days this month', days, 'a', inMonth.length + ' requests')}${kp('trend', 'Busiest day', busiest && cnt[busiest] ? fmtS(busiest) : '—', 'b', busiest && cnt[busiest] ? cnt[busiest] + ' people away' : 'No leave')}${kp('clock', 'Pending approval', pend, pend ? 'c' : 'd', 'shown dashed')}</section>
      <div class="lc-filters"><span class="lc-fl">Leave types</span>${types.filter((t) => TC[t]).map((t) => `<button class="lc-chip ${st.hide[t] ? 'off' : ''}" style="--lc:${col(t)}" data-act="lcx-type" data-t="${esc(t)}"><i></i>${esc(shortT(t))}</button>`).join('')}</div>
      <div class="lc-wrap"><div class="card lc-cal"><div class="lc-nav"><button class="icon-btn bordered" data-act="lcx-nav" data-d="-1" aria-label="Previous">${ic('left')}</button><h3>${MFULL[st.m]} <span>${st.y}</span></h3><button class="icon-btn bordered" data-act="lcx-nav" data-d="1" aria-label="Next">${ic('right')}</button><button class="btn sm" data-act="lcx-today">Today</button><span class="grow"></span><span class="lc-key"><i class="p"></i>Approved <i class="d"></i>Pending <i class="h"></i>Holiday</span></div>
        ${st.view === 'agenda' ? agenda : `<div class="lc-grid">${DOW.map((d, i) => `<div class="lc-w ${i === 5 ? 'off' : ''}">${d}</div>`).join('')}${cells}</div>`}</div>
        <div class="lc-side">${dayPanel(A)}
          <div class="card pad"><div class="ct-row"><h3 class="ct">Upcoming holidays</h3></div>${hol.length ? `<ul class="lc-hl">${hol.map((k) => `<li><div class="lv-date"><em>${new Date(k + 'T00:00').toLocaleDateString('en-GB', { month: 'short' })}</em><strong>${new Date(k + 'T00:00').getDate()}</strong></div><div><b>${esc(holName(k))}</b><span>${DOW[new Date(k + 'T00:00').getDay()]} · in ${diff(today(), k)} days</span></div></li>`).join('')}</ul>` : '<p class="muted" style="margin:0">No holidays in the next 4 months.</p>'}</div>
          <div class="card pad"><div class="ct-row"><h3 class="ct">This month by type</h3></div>${byType.length ? B.hbars(byType, { multi: true }) : '<p class="muted" style="margin:0">No leave this month.</p>'}</div></div></div>`;
  };
  const re = () => B.route();
  B.act['lcx-nav'] = (t) => { st.m += +t.dataset.d; if (st.m < 0) { st.m = 11; st.y--; } if (st.m > 11) { st.m = 0; st.y++; } re(); };
  B.act['lcx-today'] = () => { const n = new Date(); st.y = n.getFullYear(); st.m = n.getMonth(); st.sel = today(); re(); };
  B.act['lcx-day'] = (t) => { st.sel = t.dataset.d; re(); };
  B.act['lcx-view'] = (t) => { st.view = t.dataset.v; re(); };
  B.act['lcx-type'] = (t) => { st.hide[t.dataset.t] = !st.hide[t.dataset.t]; re(); };
  B.chg.lcxd = (t) => { st.dept = t.value; re(); };
})();
