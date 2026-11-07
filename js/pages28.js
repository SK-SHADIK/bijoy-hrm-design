/* Sentradesk HRMS — Leave Policy Assignment: policy overview + assignment list + detailed assignment view */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const X = () => B.lvx;
  const KEY = 'bijoy-lpa-v1';
  const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const fmtS = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—');
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const today = () => iso(new Date());
  const diff = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);
  const TYPES = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Festival Leave'];
  const POL = {
    'Standard Policy': { c: 'var(--accent)', who: 'Full-time employees', icon: 'users', d: { 'Casual Leave': 10, 'Sick Leave': 14, 'Earned Leave': 18, 'Festival Leave': 5 }, note: 'Default policy for all permanent staff after probation.' },
    'Manager Policy': { c: 'var(--ok)', who: 'Managers and department heads', icon: 'shield', d: { 'Casual Leave': 12, 'Sick Leave': 14, 'Earned Leave': 22, 'Festival Leave': 5 }, note: 'Extra casual and earned days for people-management roles.' },
    'Intern Policy': { c: 'var(--warn)', who: 'Interns', icon: 'book', d: { 'Casual Leave': 6, 'Sick Leave': 7, 'Earned Leave': 0, 'Festival Leave': 3 }, note: 'Reduced entitlement. No earned leave during the internship.' },
    'Contract Policy': { c: 'var(--c4)', who: 'Fixed-term contract staff', icon: 'file', d: { 'Casual Leave': 8, 'Sick Leave': 10, 'Earned Leave': 0, 'Festival Leave': 5 }, note: 'Entitlement for the contract duration. No carry-forward.' }
  };
  const ts = (t) => t.replace(' Leave', '');
  const tot = (p) => Object.values(POL[p].d).reduce((a, b) => a + b, 0);
  let store = null, q = '', sf = 'all', pf = 'all';
  const S = () => { if (store) return store; try { store = JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) {} return (store = store || { st: {}, pol: {}, al: {} }); };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S())); } catch (e) {} };

  const all = () => B.getRows('leave-policy-assignment').map((r) => {
    const [emp, pol0, from, to, al0, st0] = r.vals, pol = S().pol[r.name] || pol0, t = today();
    return { id: r.name, emp, pol, from, to, al: S().al[r.name] != null ? S().al[r.name] : !!al0, st: S().st[r.name] || st0, e: X().eByName(emp), state: to < t ? 'Ended' : from > t ? 'Upcoming' : 'Active' };
  });
  const find = (id) => all().find((a) => a.id === id);
  const pill = (s) => B.pill(s, s === 'Submitted' ? 'ok' : 'warn');
  const polChip = (p) => `<span class="la-ty" style="--lc:${(POL[p] || POL['Standard Policy']).c}"><i></i>${esc(p)}</span>`;
  const stPill = (s) => B.pill(s, s === 'Active' ? 'ok' : s === 'Upcoming' ? 'info' : 'mute');
  const kp = (i, l, v, c, sub) => `<div class="card ivk"><span class="ivk-i ${c || ''}">${ic(i, 18)}</span><div><b>${v}</b><span>${l}</span>${sub ? `<em class="ld-sub">${sub}</em>` : ''}</div></div>`;
  const switcher = (on) => `<div class="seg views">${[['', 'users', 'Overview'], ['list', 'list', 'List'], ['kanban', 'kanban', 'Kanban'], ['report', 'bars', 'Report']].map((v) => `<a class="${v[0] === on ? 'on' : ''}" href="#/list/leave-policy-assignment${v[0] ? '/' + v[0] : ''}">${ic(v[1], 16)}<span>${v[2]}</span></a>`).join('')}</div>`;
  const chips = (p) => TYPES.filter((t) => POL[p].d[t]).map((t) => `<span class="lp-d" title="${t}"><b>${POL[p].d[t]}</b>${ts(t).slice(0, 1)}</span>`).join('');

  /* ---------- list ---------- */
  const rows = () => all().filter((a) => (sf === 'all' || a.st === sf) && (pf === 'all' || a.pol === pf) && (!q || (a.emp + a.pol + a.id + (a.e.dept || '')).toLowerCase().includes(q.toLowerCase())));
  const tableHtml = () => {
    const L = rows(); if (!L.length) return `<div class="card pad empty">${ic('search', 34)}<b>No assignments match</b></div>`;
    return `<div class="card table-card"><div class="tscroll"><table class="dt iv-t la-t"><thead><tr><th>Employee</th><th>Policy</th><th>Effective period</th><th>Entitlement (days / year)</th><th>Allocation</th><th>Status</th><th></th></tr></thead><tbody>${L.map((a) => `<tr data-act="row" data-href="#/list/leave-policy-assignment/pa/${encodeURIComponent(a.id)}"><td><span class="who">${B.avatar(a.emp, 36)}<span><b>${esc(a.emp)}</b><em class="sub">${esc(a.e.dept || '')} · ${a.id}</em></span></span></td><td>${polChip(a.pol)}</td><td>${fmtS(a.from)} – ${fmtS(a.to)}<em class="sub">${stPill(a.state)}</em></td><td><span class="lp-ds">${chips(a.pol)}</span><em class="sub">${tot(a.pol)} days total</em></td><td>${a.al ? '<span class="pill ok"><i></i>Allocated</span>' : '<span class="pill mute"><i></i>Not allocated</span>'}</td><td>${pill(a.st)}</td><td class="r">${ic('right', 16)}</td></tr>`).join('')}</tbody></table></div></div>`;
  };
  const listView = () => {
    const A = all(), c = (s) => A.filter((a) => a.st === s).length, emps = new Set(A.map((a) => a.emp)).size, alloc = A.filter((a) => a.al).length, exp = A.filter((a) => a.state === 'Active' && diff(today(), a.to) <= 30).length;
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Leaves', href: '#/module/leaves' }, { label: 'Leave Policy Assignment' }])}<h1>Leave Policy Assignments <span class="count">${A.length}</span></h1><p class="sub">Which leave policy applies to whom, for how long, and whether the leaves have been allocated.</p></div>
        <div class="head-actions">${switcher('')}<a class="btn primary" href="#/form/leave-policy-assignment/new">${ic('plus', 16)}Add Assignment</a></div></div>
      <section class="iv-kpis">${kp('users', 'Assignments', A.length, 'a')}${kp('check-circle', 'Submitted', c('Submitted'), 'd')}${kp('edit', 'Draft', c('Draft'), 'c')}${kp('user', 'Employees covered', emps, 'b')}${kp('layers', 'Leaves allocated', alloc + ' / ' + A.length, 'a', A.length - alloc + ' pending allocation')}${kp('clock', 'Ending in 30 days', exp, exp ? 'c' : 'd')}</section>
      <div class="lp-pols">${Object.keys(POL).map((p) => { const n = A.filter((a) => a.pol === p).length; return `<div class="card lp-pc ${pf === p ? 'on' : ''}" style="--lc:${POL[p].c}" data-act="lp-pf" data-v="${esc(p)}"><div class="lp-ph"><span>${ic(POL[p].icon, 18)}</span><div><b>${p}</b><em>${POL[p].who}</em></div></div><div class="lp-pn"><b>${n}</b><span>assigned</span><i></i><b>${tot(p)}</b><span>days / yr</span></div><div class="lp-ds">${chips(p)}</div></div>`; }).join('')}</div>
      <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="lpq" value="${esc(q)}" placeholder="Search employee, department, policy or ID…"></label>
        <div class="seg">${['all', 'Submitted', 'Draft'].map((x) => `<button class="${sf === x ? 'on' : ''}" data-act="lp-sf" data-v="${x}">${x === 'all' ? 'All' : x}${x === 'all' ? '' : ' <span class="count">' + c(x) + '</span>'}</button>`).join('')}</div>
        <select class="inp" style="max-width:200px" data-chg="lppf"><option value="all">All policies</option>${Object.keys(POL).map((p) => `<option ${pf === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
      <div id="lp-tbl" style="margin-top:14px">${tableHtml()}</div>`;
  };
  B.inp.lpq = (t) => { q = t.value; const g = B.$('#lp-tbl'); if (g) g.innerHTML = tableHtml(); };
  B.chg.lppf = (t) => { pf = t.value; B.route(); };
  B.act['lp-pf'] = (t) => { pf = pf === t.dataset.v ? 'all' : t.dataset.v; B.route(); };
  B.act['lp-sf'] = (t) => { sf = t.dataset.v; B.route(); };

  /* ---------- detail ---------- */
  let cur = '';
  const detail = (id) => {
    const a = find(id); if (!a) return `<div class="empty big">${ic('search', 44)}<b>Assignment not found</b><a class="btn primary" href="#/list/leave-policy-assignment">Back</a></div>`;
    cur = a.id; const L = X(), P = POL[a.pol], t0 = today(), A = all();
    const total = Math.max(1, diff(a.from, a.to) + 1), el = Math.max(0, Math.min(total, diff(a.from, t0) + 1)), pct = Math.round((el / total) * 100);
    const rows2 = TYPES.map((t) => { const ent = P.d[t], live = L.TYPES[t] ? L.bal(a.emp, t) : null, used = L.TYPES[t] ? L.base(a.emp, t) + L.used(a.emp, t) : 0; return { t, ent, used: Math.min(used, ent), left: ent ? Math.max(0, ent - Math.min(used, ent)) : 0 }; });
    const same = A.filter((x) => x.pol === a.pol && x.id !== a.id), mine = A.filter((x) => x.emp === a.emp && x.id !== a.id);
    const steps = [['Assigned', 'Policy linked to employee', 'done'], ['Submitted', a.st === 'Submitted' ? 'Approved by HR' : 'Waiting for HR to submit', a.st === 'Submitted' ? 'done' : 'now'], ['Effective', a.state === 'Upcoming' ? 'Starts ' + fmtS(a.from) : 'From ' + fmtS(a.from), a.state === 'Upcoming' ? '' : a.st === 'Submitted' ? 'done' : ''], ['Leaves allocated', a.al ? 'Balances created' : 'Not allocated yet', a.al ? 'done' : a.st === 'Submitted' ? 'now' : ''], ['Ends', a.state === 'Ended' ? 'Ended ' + fmtS(a.to) : fmtS(a.to) + ' · in ' + diff(t0, a.to) + ' d', a.state === 'Ended' ? 'done' : '']];
    const acts = (a.st === 'Draft' ? `<button class="btn primary" data-act="lp-set" data-v="Submitted">${ic('check', 16)}Submit assignment</button>` : `<button class="btn" data-act="lp-set" data-v="Draft">Revert to draft</button>`) + (!a.al && a.st === 'Submitted' ? `<button class="btn ok" data-act="lp-alloc">${ic('layers', 16)}Allocate leaves</button>` : '');
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Leave Policy Assignment', href: '#/list/leave-policy-assignment' }, { label: a.emp }])}<h1>${esc(a.emp)} ${pill(a.st)}</h1><p class="sub">${a.id} · ${esc(a.pol)} · ${fmtS(a.from)} – ${fmt(a.to)}</p></div>
        <div class="head-actions"><a class="btn" href="#/list/leave-policy-assignment">${ic('left', 16)}All assignments</a><a class="btn" href="#/form/leave-policy-assignment/${encodeURIComponent(a.id)}">${ic('edit', 16)}Edit</a>${acts}</div></div>
      <section class="iv-kpis">${kp(P.icon, 'Policy', a.pol.replace(' Policy', ''), 'a', P.who)}${kp('layers', 'Days per year', tot(a.pol), 'b', TYPES.filter((t) => P.d[t]).length + ' leave types')}${kp('calendar', 'Effective', a.state, a.state === 'Active' ? 'd' : a.state === 'Ended' ? 'e' : 'c', fmtS(a.from) + ' – ' + fmtS(a.to))}${kp('check-circle', 'Allocation', a.al ? 'Allocated' : 'Pending', a.al ? 'd' : 'c', a.al ? 'Balances created' : 'Not yet allocated')}${kp('clock', 'Period left', a.state === 'Ended' ? '0 d' : a.state === 'Upcoming' ? total + ' d' : diff(t0, a.to) + ' d', 'a', pct + '% elapsed')}</section>
      <div class="iv-cwrap"><div class="iv-main">
        <div class="card pad"><div class="ct-row"><h3 class="ct">What ${esc(a.pol)} grants</h3><span class="pill info">${tot(a.pol)} days / year</span></div><p class="muted" style="margin:0 0 14px">${esc(P.note)}</p>
          <div class="lp-gr">${rows2.map((r) => `<div class="lp-g ${r.ent ? '' : 'none'}"><div class="lp-gh"><span>${esc(r.t)}</span><b>${r.ent || '—'}<small>${r.ent ? ' days' : ''}</small></b></div>${r.ent ? `<div class="la-sb"><u style="width:${Math.round((r.used / r.ent) * 100)}%;background:${P.c}"></u></div><div class="la-sf"><span>Used <b>${r.used}</b></span><span>Left <b>${r.left}</b></span></div>` : '<div class="la-sf"><span>Not included in this policy</span></div>'}</div>`).join('')}</div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Policy comparison</h3><span class="muted">days per year</span></div><div class="tscroll"><table class="dt lp-cmp"><thead><tr><th>Policy</th>${TYPES.map((t) => `<th class="r">${ts(t)}</th>`).join('')}<th class="r">Total</th></tr></thead><tbody>${Object.keys(POL).map((p) => `<tr class="${p === a.pol ? 'me' : ''}"><td>${polChip(p)}${p === a.pol ? '<em class="la-now"> this one</em>' : ''}</td>${TYPES.map((t) => `<td class="r ${POL[p].d[t] === 0 ? 'muted' : ''}">${POL[p].d[t] || '—'}</td>`).join('')}<td class="r"><b>${tot(p)}</b></td></tr>`).join('')}</tbody></table></div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Assignment timeline</h3></div><ul class="jo-tl">${steps.map((s) => `<li class="${s[2]}"><i></i><div><b>${s[0]}</b><span>${s[1]}</span></div></li>`).join('')}</ul><div class="la-tm" style="margin-top:14px"><div class="la-tmh"><span>Time elapsed in effective period</span><b>${a.state === 'Upcoming' ? '0' : pct}%</b></div><div class="la-sb"><u style="width:${a.state === 'Upcoming' ? 0 : pct}%;background:var(--text-3)"></u></div><div class="la-tmf"><span>${fmtS(a.from)}</span><span>${fmtS(a.to)}</span></div></div></div>
      </div>
      <aside class="iv-side">
        <div class="card pad iv-prof la-emp">${B.avatar(a.emp, 56)}<div class="ivpf-i"><b>${esc(a.emp)}</b><span>${esc(a.e.desig || '')}</span><div class="ivpf-m"><span>${ic('org', 13)}${esc(a.e.dept || '')}</span><span>${ic('briefcase', 13)}${esc(a.e.type || 'Full-time')}</span>${a.e.doj ? `<span>${ic('calendar', 13)}Joined ${fmt(a.e.doj)}</span>` : ''}</div></div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Change policy</h3></div><p class="muted" style="margin:0 0 8px">Applies to: ${esc(P.who)}.</p><select class="inp" data-chg="lppol">${Object.keys(POL).map((p) => `<option ${p === a.pol ? 'selected' : ''}>${p}</option>`).join('')}</select>${a.e.type && ((a.e.type === 'Intern' && a.pol !== 'Intern Policy') || (a.e.type === 'Contract' && a.pol !== 'Contract Policy')) ? `<div class="rj-banner" style="margin:10px 0 0"><div><b>Policy mismatch</b><span>${esc(a.e.type)} staff usually get the ${esc(a.e.type)} Policy.</span></div></div>` : ''}</div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Also on ${esc(a.pol.replace(' Policy', ''))} policy</h3><span class="count">${same.length}</span></div>${same.length ? `<ul class="dx-hires">${same.slice(0, 5).map((x) => `<li>${B.avatar(x.emp, 30)}<div><b>${esc(x.emp)}</b><span>${esc(x.e.dept || '')}</span></div><a class="link-btn" href="#/list/leave-policy-assignment/pa/${encodeURIComponent(x.id)}">Open</a></li>`).join('')}</ul>` : '<p class="muted" style="margin:0">No one else.</p>'}</div>
        ${mine.length ? `<div class="card pad"><div class="ct-row"><h3 class="ct">Other assignments for ${esc(a.emp.split(' ')[0])}</h3></div><ul class="dx-hires">${mine.map((x) => `<li><div class="la-mini" style="--lc:${POL[x.pol].c}"></div><div><b>${esc(x.pol)}</b><span>${fmtS(x.from)} – ${fmtS(x.to)}</span></div><a class="link-btn" href="#/list/leave-policy-assignment/pa/${encodeURIComponent(x.id)}">Open</a></li>`).join('')}</ul></div>` : ''}
      </aside></div>`;
  };
  const here = () => decodeURIComponent((location.hash.split('/pa/')[1] || cur));
  B.act['lp-set'] = (t) => { S().st[here()] = t.dataset.v; save(); B.toast(t.dataset.v === 'Submitted' ? 'Assignment submitted' : 'Reverted to draft'); B.route(); };
  B.act['lp-alloc'] = () => { S().al[here()] = true; save(); B.toast('Leaves allocated from policy'); B.route(); };
  B.chg.lppol = (t) => { S().pol[here()] = t.value; save(); B.toast('Policy changed to ' + t.value); B.route(); };

  B.renderLeavePolicyAssign = (kind, id) => (kind === 'pa' ? detail(id) : listView());
})();
