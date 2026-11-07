/* Sentradesk HRMS — Leave Balance: team overview + per-employee balance detail (overrides the old simple page) */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const X = () => B.lvx;
  const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const fmtS = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—');
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const today = () => iso(new Date());
  const diff = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);
  const TC = { 'Casual Leave': 'var(--accent)', 'Sick Leave': 'var(--bad)', 'Earned Leave': 'var(--ok)', 'Compensatory Off': 'var(--c4)' };
  const chip = (t) => `<span class="la-ty" style="--lc:${TC[t] || 'var(--accent)'}"><i></i>${esc(t)}</span>`;
  const MAIN = ['Casual Leave', 'Sick Leave', 'Earned Leave'];
  let q = '', dept = 'all', lowOnly = false;

  const team = () => B.EMPLOYEES.filter((e) => e.status !== 'Left' && e.id !== 'HR-EMP-00001');
  const balances = (e) => {
    const L = X(), apps = L.D().apps.filter((a) => a.emp === e.name), out = MAIN.map((t) => {
      const al = L.alloc(t), taken = L.base(e.name, t) + apps.filter((a) => a.type === t && L.status(a) === 'Approved').reduce((n, a) => n + a.days, 0), pend = apps.filter((a) => a.type === t && L.status(a) === 'Pending').reduce((n, a) => n + a.days, 0);
      return { t, al, taken, pend, left: al - taken - pend };
    });
    const cr = L.D().credits.filter((c) => c.emp === e.name), t0 = today();
    if (cr.length) { const left = cr.filter((c) => !c.usedBy && c.expires >= t0).length; out.push({ t: 'Compensatory Off', al: cr.length, taken: cr.filter((c) => c.usedBy).length, pend: 0, left, credits: cr }); }
    return out;
  };
  const isLow = (b) => b.al > 0 && (b.left <= 2 || b.left / b.al <= 0.2);
  const totals = (e) => { const b = balances(e); return { left: b.reduce((n, x) => n + Math.max(0, x.left), 0), taken: b.reduce((n, x) => n + x.taken, 0), al: b.reduce((n, x) => n + x.al, 0), low: b.filter(isLow) }; };
  const col = (b) => (b.left < 0 ? 'var(--bad)' : isLow(b) ? 'var(--warn)' : 'var(--ok)');
  const kp = (i, l, v, c, sub) => `<div class="card ivk"><span class="ivk-i ${c || ''}">${ic(i, 18)}</span><div><b>${v}</b><span>${l}</span>${sub ? `<em class="ld-sub">${sub}</em>` : ''}</div></div>`;
  const onLeave = (e) => X().D().apps.some((a) => a.emp === e.name && X().status(a) === 'Approved' && a.from <= today() && a.to >= today());

  /* ---------- team overview ---------- */
  const rowsHtml = () => {
    const L = team().filter((e) => (dept === 'all' || e.dept === dept) && (!q || (e.name + e.dept + (e.desig || '')).toLowerCase().includes(q.toLowerCase())) && (!lowOnly || totals(e).low.length));
    if (!L.length) return `<div class="card pad empty">${ic('search', 34)}<b>No employees match</b></div>`;
    return `<div class="card table-card"><div class="tscroll"><table class="dt iv-t lb-t"><thead><tr><th>Employee</th><th>Casual</th><th>Sick</th><th>Earned</th><th>Comp-off</th><th class="r">Days left</th><th>Health</th><th></th></tr></thead><tbody>${L.map((e) => { const b = balances(e), t = totals(e), cell = (x) => (x ? `<div class="lb-c"><div class="la-sb"><u style="width:${Math.max(0, Math.min(100, (x.left / (x.al || 1)) * 100))}%;background:${col(x)}"></u></div><span><b style="color:${col(x)}">${x.left}</b>/${x.al}</span></div>` : '<span class="muted">—</span>'); return `<tr data-act="row" data-href="#/page/leave-balance/${e.id}"><td><span class="who">${B.avatar(e.name, 36)}<span><b>${esc(e.name)}</b><em class="sub">${esc(e.dept)} · ${esc(e.desig || '')}</em></span></span></td>${MAIN.map((m) => `<td>${cell(b.find((x) => x.t === m))}</td>`).join('')}<td>${cell(b.find((x) => x.t === 'Compensatory Off'))}</td><td class="r"><b>${t.left}</b></td><td>${onLeave(e) ? '<span class="pill info"><i></i>On leave</span>' : t.low.length ? `<span class="pill warn"><i></i>${t.low.length} low</span>` : '<span class="pill ok"><i></i>Healthy</span>'}</td><td class="r">${ic('right', 16)}</td></tr>`; }).join('')}</tbody></table></div></div>`;
  };
  const listView = () => {
    const T = team(), tt = T.map(totals), allLeft = tt.reduce((n, x) => n + x.left, 0), low = tt.filter((x) => x.low.length).length;
    const avg = (t) => Math.round(T.reduce((n, e) => n + balances(e).find((x) => x.t === t).left, 0) / (T.length || 1));
    const depts = [...new Set(T.map((e) => e.dept))].sort();
    return `${B.head('Leave Balance', 'Entitlement, leave taken and days left for every employee. Open a person for the full picture.', `<select class="inp sm" aria-label="Period"><option>Leave Period 2026</option><option>2025</option></select><button class="btn" data-act="toast" data-msg="Balance report exported">${ic('download', 16)}Export</button>`, [{ label: 'HR', href: '#/' }, { label: 'Leaves', href: '#/module/leaves' }, { label: 'Leave Balance' }])}
      <section class="iv-kpis">${kp('users', 'Employees', T.length, 'a')}${kp('calendar', 'Days left (company)', allLeft, 'd', 'Across casual, sick, earned & comp-off')}${kp('alert', 'Low balance', low, low ? 'c' : 'd', 'Employees with a type at 2 days or less')}${kp('clock', 'Avg. casual left', avg('Casual Leave'), 'a', 'of ' + X().alloc('Casual Leave') + ' days')}${kp('shield', 'Avg. sick left', avg('Sick Leave'), 'b', 'of ' + X().alloc('Sick Leave') + ' days')}${kp('trend', 'Avg. earned left', avg('Earned Leave'), 'd', 'of ' + X().alloc('Earned Leave') + ' days')}</section>
      <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="lbq" value="${esc(q)}" placeholder="Search employee, department or designation…"></label>
        <select class="inp" style="max-width:200px" data-chg="lbd"><option value="all">All departments</option>${depts.map((d) => `<option ${dept === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
        <label class="fl-chk lb-low"><input type="checkbox" data-chg="lblow" ${lowOnly ? 'checked' : ''}><span>Low balance only</span></label></div>
      <div id="lb-tbl" style="margin-top:14px">${rowsHtml()}</div>`;
  };
  B.inp.lbq = (t) => { q = t.value; const g = B.$('#lb-tbl'); if (g) g.innerHTML = rowsHtml(); };
  B.chg.lbd = (t) => { dept = t.value; const g = B.$('#lb-tbl'); if (g) g.innerHTML = rowsHtml(); };
  B.chg.lblow = (t) => { lowOnly = t.checked; const g = B.$('#lb-tbl'); if (g) g.innerHTML = rowsHtml(); };

  /* ---------- employee detail ---------- */
  const detail = (id) => {
    const e = team().find((x) => x.id === id) || B.EMPLOYEES.find((x) => x.id === id); if (!e) return `<div class="empty big">${ic('search', 44)}<b>Employee not found</b><a class="btn primary" href="#/page/leave-balance">Back</a></div>`;
    const L = X(), b = balances(e), t = totals(e), apps = L.D().apps.filter((a) => a.emp === e.name).sort((x, y) => (x.from < y.from ? 1 : -1)), t0 = today();
    const pct = t.al ? Math.round((t.taken / t.al) * 100) : 0, boss = L.mgrName(e), now = onLeave(e);
    const D = team().filter((x) => x.dept === e.dept), dAvg = Math.round(D.reduce((n, x) => n + totals(x).taken, 0) / (D.length || 1)), cAvg = Math.round(team().reduce((n, x) => n + totals(x).taken, 0) / (team().length || 1));
    const upc = apps.filter((a) => L.live(a) && a.to >= t0).reverse(), hist = apps.filter((a) => a.to < t0 || !L.live(a)).slice(0, 6);
    const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 11 + i); return d; });
    const trend = months.map((d, i) => { const k = d.getFullYear() + '-' + B.pad(d.getMonth() + 1); return { label: d.toLocaleDateString('en-GB', { month: 'short' }), value: apps.filter((a) => L.live(a) && a.from.slice(0, 7) === k).reduce((n, a) => n + a.days, 0), color: i === 11 ? 'var(--accent)' : 'var(--c2)' }; });
    const ins = [];
    b.forEach((x) => { if (x.left < 0) ins.push(['bad', 'alert', x.t + ' is over the limit by ' + Math.abs(x.left) + ' day(s)', 'Extra days are adjusted against other leave types or become LWP.']); else if (isLow(x)) ins.push(['warn', 'alert', x.t + ' is running low: ' + x.left + ' of ' + x.al + ' days left', 'Plan remaining leave carefully until the period ends.']); });
    const ec = b.find((x) => x.t === 'Earned Leave'); if (ec && ec.left >= 8) ins.push(['info', 'calendar', ec.left + ' earned-leave days are unused', 'Consider planning time off. Carry-forward rule is yet to be defined.']);
    const co = b.find((x) => x.t === 'Compensatory Off'); if (co && co.credits) { const soon = co.credits.filter((c) => !c.usedBy && c.expires >= t0 && diff(t0, c.expires) <= 30).sort((p, q2) => (p.expires < q2.expires ? -1 : 1))[0]; if (soon) ins.push(['warn', 'coffee', 'A comp-off day lapses on ' + fmtS(soon.expires), diff(t0, soon.expires) + ' days left to use it.']); }
    if (upc.some((a) => L.status(a) === 'Pending')) ins.push(['info', 'clock', upc.filter((a) => L.status(a) === 'Pending').length + ' request(s) waiting for approval', 'Pending days are already held against the balance.']);
    if (!ins.length) ins.push(['ok', 'check-circle', 'Balances look healthy', 'No low balances or lapsing credits.']);
    const ringCard = (x) => `<div class="card pad lb-rc"><div class="lb-rh">${chip(x.t)}${isLow(x) ? '<span class="pill warn"><i></i>Low</span>' : ''}</div>${B.ring(x.al ? Math.max(0, (x.left / x.al) * 100) : 0, 112, Math.max(0, x.left), 'days left', col(x))}<div class="lb-rs"><div><b>${x.al}</b><span>Entitled</span></div><div><b>${x.taken}</b><span>Taken</span></div><div><b>${x.pend}</b><span>Pending</span></div></div></div>`;
    const stack = b.filter((x) => x.al).map((x) => `<u style="flex:${x.al};--c:${TC[x.t]}" data-tip="${x.t}: ${x.taken} used of ${x.al}"><i style="width:${Math.min(100, (x.taken / x.al) * 100)}%"></i></u>`).join('');
    return `${B.head('Leave Balance · ' + esc(e.name), 'Entitlement, usage, trends and what to watch for this person.', `<a class="btn" href="#/page/leave-balance">${ic('left', 16)}All employees</a><button class="btn" data-act="toast" data-msg="Statement exported">${ic('download', 16)}Export</button><a class="btn primary" href="#/page/leave-apply">${ic('plus', 16)}Apply leave</a>`, [{ label: 'HR', href: '#/' }, { label: 'Leave Balance', href: '#/page/leave-balance' }, { label: e.name }])}
      <div class="card pad lb-hero"><div class="lb-hp">${B.avatar(e.name, 76)}<div><b>${esc(e.name)}</b><span>${esc(e.desig || '')} · ${esc(e.dept)}</span><div class="ivpf-m"><span>${ic('user', 13)}Reports to ${esc(boss)}</span>${e.doj ? `<span>${ic('calendar', 13)}Joined ${fmt(e.doj)}</span>` : ''}<span class="pill ${now ? 'info' : 'ok'}"><i></i>${now ? 'On leave today' : 'In office'}</span></div></div></div>
        <div class="lb-hb"><div class="lb-hn"><b>${t.left}</b><span>days left in total</span></div><div class="lb-hs"><div class="snap-bar lb-stack">${stack}</div><div class="lb-hl"><span>${t.taken} of ${t.al} days used · ${pct}%</span><span class="${t.taken > dAvg ? 'lb-up' : 'lb-dn'}">${t.taken > dAvg ? '▲' : '▼'} ${Math.abs(t.taken - dAvg)} vs ${esc(e.dept)} avg</span></div></div></div></div>
      <section class="lb-rings">${b.map(ringCard).join('')}</section>
      <div class="iv-cwrap"><div class="iv-main">
        <div class="card pad"><div class="ct-row"><h3 class="ct">Leave taken · last 12 months</h3><span class="muted">days, by start month</span></div>${B.vbars(trend, { h: 180 })}</div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Upcoming & pending</h3><span class="count">${upc.length}</span></div>${upc.length ? `<ul class="ld-up la-his">${upc.map((a) => `<li style="--lc:${TC[a.type] || 'var(--accent)'}"><div class="ld-i"><b>${esc(a.type)}</b><span>${fmtS(a.from)}${a.to !== a.from ? ' – ' + fmtS(a.to) : ''} · ${a.days} day${a.days > 1 ? 's' : ''}</span><small>${ic('clock', 12)}${a.from > t0 ? 'Starts in ' + diff(t0, a.from) + ' days' : 'In progress'}</small></div><div class="ld-r">${B.pill(L.status(a), L.status(a) === 'Approved' ? 'ok' : 'warn')}<a class="link-btn" href="#/list/leave-application/app/${encodeURIComponent(a.id)}">Open</a></div></li>`).join('')}</ul>` : '<p class="muted">No upcoming leave.</p>'}</div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Recent history</h3></div>${hist.length ? `<div class="tscroll"><table class="dt"><thead><tr><th>Type</th><th>Dates</th><th class="r">Days</th><th>Status</th><th></th></tr></thead><tbody>${hist.map((a) => `<tr data-act="row" data-href="#/list/leave-application/app/${encodeURIComponent(a.id)}" style="cursor:pointer"><td>${chip(a.type)}</td><td>${fmtS(a.from)}${a.to !== a.from ? ' – ' + fmtS(a.to) : ''}</td><td class="r"><b>${a.days}</b></td><td>${B.pill(L.status(a), { Approved: 'ok', Rejected: 'bad', Pending: 'warn' }[L.status(a)] || 'mute')}</td><td class="r">${ic('right', 14)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No past leave.</p>'}</div>
      </div>
      <aside class="iv-side">
        <div class="card pad"><div class="ct-row"><h3 class="ct">Insights</h3></div><div class="ld-alerts">${ins.map((x) => `<div class="${x[0] === 'info' ? 'ok' : x[0]}"><span>${ic(x[1], 16)}</span><div><b>${esc(x[2])}</b><em>${esc(x[3])}</em></div></div>`).join('')}</div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">How ${esc(e.name.split(' ')[0])} compares</h3><span class="muted">days taken</span></div><div class="lb-cmp">${[['You', t.taken, 'var(--accent)'], [esc(e.dept) + ' avg', dAvg, 'var(--c2)'], ['Company avg', cAvg, 'var(--text-3)']].map((r) => `<div><span>${r[0]}</span><i><u style="width:${Math.min(100, (r[1] / Math.max(1, t.taken, dAvg, cAvg)) * 100)}%;background:${r[2]}"></u></i><b>${r[1]}</b></div>`).join('')}</div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Leave rules</h3></div><div class="la-rules">${b.filter((x) => X().TYPES[x.t]).map((x) => `<div><span>${esc(x.t)}</span><p>${esc(X().TYPES[x.t].ent)}</p></div>`).join('')}</div><a class="link-btn" style="margin-top:10px;display:inline-block" href="#/page/leave-rules">All leave types & rules</a></div>
      </aside></div>`;
  };

  B.page['leave-balance'] = () => { const id = decodeURIComponent((location.hash.split('/page/leave-balance/')[1] || '')); return id ? detail(id) : listView(); };
})();
