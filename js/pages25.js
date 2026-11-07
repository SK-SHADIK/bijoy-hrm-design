/* Sentradesk HRMS — Leave Allocation: overview list + detailed allocation view (usage, ledger, rules) */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const X = () => B.lvx;
  const KEY = 'bijoy-lalloc-v1';
  const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const fmtS = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—');
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const today = () => iso(new Date());
  const diff = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);
  const TC = { 'Casual Leave': 'var(--accent)', 'Sick Leave': 'var(--bad)', 'Earned Leave': 'var(--ok)', 'Maternity Leave': 'var(--c4)', 'Paternity Leave': 'var(--c4)', 'Quarantine Leave': 'var(--warn)', 'Compensatory Off': 'var(--c2)', 'Leave Without Pay': 'var(--text-3)', 'Festival Leave': 'var(--c3)' };
  const chip = (t) => `<span class="la-ty" style="--lc:${TC[t] || 'var(--accent)'}"><i></i>${esc(t)}</span>`;
  const POL = ['Standard Policy', 'Manager Policy', 'Intern Policy', 'Contract Policy'];
  let store = null, q = '', sf = 'all', tf = 'all';
  const S = () => { if (store) return store; try { store = JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) {} return (store = store || { st: {} }); };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S())); } catch (e) {} };

  const all = () => B.getRows('leave-allocation').map((r) => {
    const [emp, type, from, to, n, st0] = r.vals, st = S().st[r.name] || st0, apps = X().D().apps.filter((a) => a.emp === emp && a.type === type && X().status(a) === 'Approved' && a.from <= to && a.to >= from);
    const alloc = +n || 0, appDays = apps.reduce((s, a) => s + a.days, 0), pendDays = X().D().apps.filter((a) => a.emp === emp && a.type === type && X().status(a) === 'Pending' && a.from <= to && a.to >= from).reduce((s, a) => s + a.days, 0);
    const used = Math.min(alloc, Math.round((B.hash(r.name) % 100) / 100 * alloc * 0.5) + appDays);
    return { id: r.name, emp, type, from, to, alloc, st, used, pend: Math.min(pendDays, alloc - used), apps, e: X().eByName(emp), left: alloc - used - Math.min(pendDays, alloc - used) };
  });
  const find = (id) => all().find((a) => a.id === id);
  const pill = (s) => B.pill(s, s === 'Submitted' ? 'ok' : s === 'Draft' ? 'warn' : 'mute');
  const period = (a) => { const t = today(); return a.to < t ? ['Ended', 'bad'] : a.from > t ? ['Starts in ' + diff(t, a.from) + ' d', 'info'] : [diff(t, a.to) + ' d left', diff(t, a.to) <= 30 ? 'warn' : 'ok']; };
  const kp = (i, l, v, c, sub) => `<div class="card ivk"><span class="ivk-i ${c || ''}">${ic(i, 18)}</span><div><b>${v}</b><span>${l}</span>${sub ? `<em class="ld-sub">${sub}</em>` : ''}</div></div>`;
  const switcher = (on) => `<div class="seg views">${[['', 'layers', 'Overview'], ['list', 'list', 'List'], ['kanban', 'kanban', 'Kanban'], ['report', 'bars', 'Report']].map((v) => `<a class="${v[0] === on ? 'on' : ''}" href="#/list/leave-allocation${v[0] ? '/' + v[0] : ''}">${ic(v[1], 16)}<span>${v[2]}</span></a>`).join('')}</div>`;

  /* ---------- list ---------- */
  const rows = () => all().filter((a) => (sf === 'all' || a.st === sf) && (tf === 'all' || a.type === tf) && (!q || (a.emp + a.type + a.id + (a.e.dept || '')).toLowerCase().includes(q.toLowerCase())));
  const tableHtml = () => {
    const L = rows(); if (!L.length) return `<div class="card pad empty">${ic('search', 34)}<b>No allocations match</b></div>`;
    return `<div class="card table-card"><div class="tscroll"><table class="dt iv-t la-t"><thead><tr><th>Employee</th><th>Leave type</th><th>Period</th><th class="r">Allocated</th><th>Usage</th><th>Status</th><th></th></tr></thead><tbody>${L.map((a) => { const p = period(a), pct = a.alloc ? Math.round((a.used / a.alloc) * 100) : 0; return `<tr data-act="row" data-href="#/list/leave-allocation/alloc/${encodeURIComponent(a.id)}"><td><span class="who">${B.avatar(a.emp, 36)}<span><b>${esc(a.emp)}</b><em class="sub">${esc(a.e.dept || '')} · ${a.id}</em></span></span></td><td>${chip(a.type)}</td><td>${fmtS(a.from)} – ${fmtS(a.to)}<em class="sub"><span class="la-pd ${p[1]}">${p[0]}</span></em></td><td class="r"><b>${a.alloc}</b><em class="sub">days</em></td><td><div class="la-us"><div class="la-sb"><u style="width:${pct}%;background:${TC[a.type] || 'var(--accent)'}"></u></div><span>${a.used} used · <b>${a.left}</b> left</span></div></td><td>${pill(a.st)}</td><td class="r">${ic('right', 16)}</td></tr>`; }).join('')}</tbody></table></div></div>`;
  };
  const listView = () => {
    const A = all(), c = (s) => A.filter((a) => a.st === s).length, tot = A.reduce((n, a) => n + a.alloc, 0), used = A.reduce((n, a) => n + a.used, 0), emps = new Set(A.map((a) => a.emp)).size;
    const exp = A.filter((a) => { const t = today(); return a.to >= t && diff(t, a.to) <= 30; }).length;
    const types = [...new Set(A.map((a) => a.type))];
    const byType = types.map((t) => ({ label: t.replace(' Leave', '').replace('Leave Without Pay', 'LWP').replace('Compensatory Off', 'Comp'), value: A.filter((a) => a.type === t).reduce((n, a) => n + a.alloc, 0) })).sort((x, y) => y.value - x.value);
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Leaves', href: '#/module/leaves' }, { label: 'Leave Allocation' }])}<h1>Leave Allocations <span class="count">${A.length}</span></h1><p class="sub">Leave entitlements granted to employees, how much has been used and what is left in each period.</p></div>
        <div class="head-actions">${switcher('')}<a class="btn primary" href="#/form/leave-allocation/new">${ic('plus', 16)}Add Leave Allocation</a></div></div>
      <section class="iv-kpis">${kp('layers', 'Allocations', A.length, 'a')}${kp('edit', 'Draft', c('Draft'), 'c', 'Not yet submitted')}${kp('check-circle', 'Submitted', c('Submitted'), 'd')}${kp('calendar', 'Days allocated', tot, 'a', emps + ' employees')}${kp('trend', 'Days used', used, 'b', Math.round((used / (tot || 1)) * 100) + '% utilisation')}${kp('clock', 'Ending in 30 days', exp, exp ? 'c' : 'd')}</section>
      <section class="dx-2"><div class="card pad"><div class="ct-row"><h3 class="ct">Days allocated by leave type</h3></div>${B.hbars(byType, { multi: true })}</div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Overall utilisation</h3><span class="pill info">${used} of ${tot} days</span></div><div class="la-ov">${B.ring(Math.round((used / (tot || 1)) * 100), 120, Math.round((used / (tot || 1)) * 100) + '%', 'used', 'var(--accent)')}<div class="snap-stats"><div><i style="background:var(--accent)"></i><span>Used</span><b>${used}</b></div><div><i style="background:var(--ok)"></i><span>Remaining</span><b>${tot - used}</b></div><div><i style="background:var(--warn)"></i><span>Draft days</span><b>${A.filter((a) => a.st === 'Draft').reduce((n, a) => n + a.alloc, 0)}</b></div><div><i style="background:var(--c4)"></i><span>Employees</span><b>${emps}</b></div></div></div></div></section>
      <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="alloq" value="${esc(q)}" placeholder="Search employee, department, leave type or ID…"></label>
        <div class="seg">${['all', 'Submitted', 'Draft'].map((x) => `<button class="${sf === x ? 'on' : ''}" data-act="lal-sf" data-v="${x}">${x === 'all' ? 'All' : x}${x === 'all' ? '' : ' <span class="count">' + c(x) + '</span>'}</button>`).join('')}</div>
        <select class="inp" style="max-width:190px" data-chg="lalt"><option value="all">All leave types</option>${types.map((t) => `<option ${tf === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div id="lal-tbl" style="margin-top:14px">${tableHtml()}</div>`;
  };
  B.inp.alloq = (t) => { q = t.value; const g = B.$('#lal-tbl'); if (g) g.innerHTML = tableHtml(); };
  B.chg.lalt = (t) => { tf = t.value; const g = B.$('#lal-tbl'); if (g) g.innerHTML = tableHtml(); };
  B.act['lal-sf'] = (t) => { sf = t.dataset.v; B.route(); };

  /* ---------- detail ---------- */
  let cur = '';
  const detail = (id) => {
    const a = find(id); if (!a) return `<div class="empty big">${ic('search', 44)}<b>Allocation not found</b><a class="btn primary" href="#/list/leave-allocation">Back</a></div>`;
    cur = a.id;
    const T = X().TYPES[a.type] || { carry: '—', doc: '—', dl: '—', ent: '—' }, t0 = today(), p = period(a), pct = a.alloc ? Math.round((a.used / a.alloc) * 100) : 0, pp = a.alloc ? Math.round((a.pend / a.alloc) * 100) : 0;
    const totalD = Math.max(1, diff(a.from, a.to) + 1), elapsed = Math.max(0, Math.min(totalD, diff(a.from, t0) + 1)), tpct = Math.round((elapsed / totalD) * 100);
    const pace = a.alloc ? (a.used / a.alloc) * 100 - tpct : 0;
    /* usage by month in the period */
    const ms = []; { const d = new Date(a.from + 'T00:00'); d.setDate(1); const end = new Date(a.to + 'T00:00'); while (d <= end && ms.length < 12) { ms.push(new Date(d)); d.setMonth(d.getMonth() + 1); } }
    const mval = ms.map((d) => { const k = d.getFullYear() + '-' + B.pad(d.getMonth() + 1); return { label: d.toLocaleDateString('en-GB', { month: 'short' }), value: a.apps.filter((x) => x.from.slice(0, 7) === k).reduce((n, x) => n + x.days, 0), color: TC[a.type] || 'var(--accent)' }; });
    /* ledger */
    let run = 0; const led = [{ d: a.from, t: 'Allocation', n: a.alloc, note: 'Leave allocation ' + a.id }];
    a.apps.slice().sort((x, y) => (x.from < y.from ? -1 : 1)).forEach((x) => led.push({ d: x.from, t: 'Leave taken', n: -x.days, note: x.id + ' · ' + fmtS(x.from) + (x.to !== x.from ? ' – ' + fmtS(x.to) : '') }));
    if (a.used - a.apps.reduce((n, x) => n + x.days, 0) > 0) led.splice(1, 0, { d: a.from, t: 'Opening usage', n: -(a.used - a.apps.reduce((n, x) => n + x.days, 0)), note: 'Leave taken before this system' });
    if (a.pend) led.push({ d: t0, t: 'Pending requests', n: -a.pend, note: 'Held until approval' });
    if (a.left > 0) led.push({ d: a.to, t: a.to < t0 ? 'Expired' : 'Scheduled expiry', n: -a.left, note: T.carry });
    led.forEach((x) => { run += x.n; x.run = run; });
    const mine = all().filter((x) => x.emp === a.emp && x.id !== a.id), pol = POL[B.hash(a.emp) % 4];
    const acts = a.st === 'Draft' ? `<button class="btn primary" data-act="lal-set" data-v="Submitted">${ic('check', 16)}Submit allocation</button>` : `<button class="btn" data-act="lal-set" data-v="Draft">Revert to draft</button>`;
    const kv = (l, v) => `<div><span>${l}</span><b>${v}</b></div>`;
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Leave Allocation', href: '#/list/leave-allocation' }, { label: a.emp }])}<h1>${esc(a.emp)} ${pill(a.st)}</h1><p class="sub">${a.id} · ${esc(a.type)} · ${fmtS(a.from)} – ${fmt(a.to)}</p></div>
        <div class="head-actions"><a class="btn" href="#/list/leave-allocation">${ic('left', 16)}All allocations</a><a class="btn" href="#/form/leave-allocation/${encodeURIComponent(a.id)}">${ic('edit', 16)}Edit</a>${acts}</div></div>
      <section class="iv-kpis">${kp('layers', 'Allocated', a.alloc + ' days', 'a')}${kp('trend', 'Used', a.used + ' days', 'b', pct + '% of entitlement')}${kp('check-circle', 'Remaining', a.left + ' days', a.left <= 2 ? 'e' : 'd', a.pend ? a.pend + ' held for pending' : 'Available to use')}${kp('calendar', 'Period', p[0], p[1] === 'bad' ? 'e' : 'c', fmtS(a.from) + ' – ' + fmtS(a.to))}${kp('shield', 'Usage pace', (pace > 10 ? '+' : '') + Math.round(pace) + '%', pace > 25 ? 'e' : pace < -25 ? 'c' : 'd', pace > 10 ? 'Using faster than time elapsed' : pace < -10 ? 'Using slower than time elapsed' : 'On track with time elapsed')}</section>
      <div class="iv-cwrap"><div class="iv-main">
        <div class="card pad"><div class="ct-row"><h3 class="ct">Entitlement usage</h3>${chip(a.type)}</div>
          <div class="la-big"><div class="la-bn"><b>${a.left}</b><span>days left of ${a.alloc}</span></div><div class="la-bb"><div class="la-sb big"><u style="width:${pct}%;background:${TC[a.type] || 'var(--accent)'}"></u><u class="p" style="width:${pp}%"></u></div><div class="la-bl"><span><i style="background:${TC[a.type] || 'var(--accent)'}"></i>Used ${a.used}</span><span><i class="p"></i>Pending ${a.pend}</span><span><i class="r"></i>Remaining ${a.left}</span></div></div></div>
          <div class="la-tm"><div class="la-tmh"><span>Time elapsed in period</span><b>${tpct}%</b></div><div class="la-sb"><u style="width:${tpct}%;background:var(--text-3)"></u></div><div class="la-tmf"><span>${fmtS(a.from)}</span><span>Today</span><span>${fmtS(a.to)}</span></div></div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Leave taken by month</h3><span class="muted">days, by start month</span></div>${mval.length ? B.vbars(mval, { h: 170 }) : '<p class="muted">No data</p>'}</div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Allocation ledger</h3><span class="count">${led.length}</span></div><div class="tscroll"><table class="dt la-led"><thead><tr><th>Date</th><th>Entry</th><th>Details</th><th class="r">Days</th><th class="r">Balance</th></tr></thead><tbody>${led.map((x) => `<tr><td>${fmtS(x.d)}</td><td><span class="la-en ${x.n > 0 ? 'plus' : 'minus'}">${ic(x.n > 0 ? 'plus' : 'minus', 12)}${x.t}</span></td><td class="muted">${esc(x.note)}</td><td class="r"><b class="${x.n > 0 ? 'la-pos' : 'la-neg'}">${x.n > 0 ? '+' : ''}${x.n}</b></td><td class="r">${x.run}</td></tr>`).join('')}</tbody></table></div></div>
      </div>
      <aside class="iv-side">
        <div class="card pad iv-prof la-emp">${B.avatar(a.emp, 56)}<div class="ivpf-i"><b>${esc(a.emp)}</b><span>${esc(a.e.desig || '')}</span><div class="ivpf-m"><span>${ic('org', 13)}${esc(a.e.dept || '')}</span>${a.e.doj ? `<span>${ic('calendar', 13)}Joined ${fmt(a.e.doj)}</span>` : ''}</div></div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Allocation details</h3></div><div class="al-kv">${kv('Allocation ID', a.id)}${kv('Leave type', esc(a.type))}${kv('Valid from', fmt(a.from))}${kv('Valid to', fmt(a.to))}${kv('Policy', pol)}${kv('Status', a.st)}</div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Rules for ${esc(a.type.replace(' Leave', ''))}</h3></div><div class="la-rules"><div><span>Entitlement</span><p>${esc(T.ent)}</p></div><div><span>Carry-forward / encashment</span><p>${esc(T.carry)}</p></div><div><span>Document</span><p>${esc(T.doc)}</p></div><div><span>Application deadline</span><p>${esc(T.dl)}</p></div></div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Other allocations</h3><span class="count">${mine.length}</span></div>${mine.length ? `<ul class="dx-hires">${mine.map((x) => `<li><div class="la-mini" style="--lc:${TC[x.type] || 'var(--accent)'}"></div><div><b>${esc(x.type)}</b><span>${x.alloc} days · ${x.left} left</span></div><a class="link-btn" href="#/list/leave-allocation/alloc/${encodeURIComponent(x.id)}">Open</a></li>`).join('')}</ul>` : `<p class="muted" style="margin:0">No other allocations for ${esc(a.emp.split(' ')[0])}.</p>`}</div>
      </aside></div>`;
  };
  B.act['lal-set'] = (t) => { const id = decodeURIComponent((location.hash.split('/alloc/')[1] || cur)); S().st[id] = t.dataset.v; save(); B.toast(t.dataset.v === 'Submitted' ? 'Allocation submitted' : 'Reverted to draft'); B.route(); };

  B.renderLeaveAlloc = (kind, id) => (kind === 'alloc' ? detail(id) : listView());
})();
