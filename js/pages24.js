/* Sentradesk HRMS — Leave Applications: dashboard-style list + detailed view with the employee's leave summary */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const X = () => B.lvx;
  const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const fmtS = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—');
  const wd = (d) => new Date(d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short' });
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const today = () => iso(new Date());
  const diff = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);
  const PILL = { Pending: 'warn', Approved: 'ok', Rejected: 'bad', Cancelled: 'mute' };
  const pill = (s) => B.pill(s, PILL[s] || 'mute');
  const TC = { 'Casual Leave': 'var(--accent)', 'Sick Leave': 'var(--bad)', 'Earned Leave': 'var(--ok)', 'Maternity Leave': 'var(--c4)', 'Paternity Leave': 'var(--c4)', 'Quarantine Leave': 'var(--warn)', 'Compensatory Off': 'var(--c2)', 'Leave Without Pay': 'var(--text-3)' };
  const chip = (t) => `<span class="la-ty" style="--lc:${TC[t] || 'var(--accent)'}"><i></i>${esc(t)}</span>`;
  let q = '', sf = 'all', tf = 'all';

  const apps = () => X().D().apps.slice().sort((a, b) => (a.created < b.created ? 1 : a.created > b.created ? -1 : a.id < b.id ? 1 : -1));
  const find = (id) => X().D().apps.find((a) => a.id === id);
  const stage = (a) => { const i = X().curIdx(a.stages); return a.stages[i]; };

  /* employee leave summary: entitlement, taken, pending, balance for each applicable type */
  const summary = (emp) => {
    const L = X(), e = L.eByName(emp), mine = X().D().apps.filter((a) => a.emp === emp);
    return Object.keys(L.TYPES).filter((t) => !L.TYPES[t].gender || L.TYPES[t].gender === e.gender).map((t) => {
      const al = L.alloc(t), taken = L.base(emp, t) + mine.filter((a) => a.type === t && L.status(a) === 'Approved').reduce((n, a) => n + a.days, 0), pend = mine.filter((a) => a.type === t && L.status(a) === 'Pending').reduce((n, a) => n + a.days, 0);
      return { t, al, taken, pend, left: al - taken - pend };
    });
  };
  const leftFor = (a) => { const r = summary(a.emp).find((x) => x.t === a.type); return r || { al: 0, taken: 0, pend: 0, left: 0 }; };

  const switcher = (on) => `<div class="seg views">${[['', 'file', 'Applications'], ['list', 'list', 'List'], ['kanban', 'kanban', 'Kanban'], ['calendar', 'calendar', 'Calendar'], ['report', 'bars', 'Report']].map((v) => `<a class="${v[0] === on ? 'on' : ''}" href="#/list/leave-application${v[0] ? '/' + v[0] : ''}">${ic(v[1], 16)}<span>${v[2]}</span></a>`).join('')}</div>`;
  const kp = (i, l, v, c, sub) => `<div class="card ivk"><span class="ivk-i ${c || ''}">${ic(i, 18)}</span><div><b>${v}</b><span>${l}</span>${sub ? `<em class="ld-sub">${sub}</em>` : ''}</div></div>`;

  /* ---------- list ---------- */
  const rows = () => apps().filter((a) => (sf === 'all' || X().status(a) === sf) && (tf === 'all' || a.type === tf) && (!q || (a.emp + a.type + a.id + (X().eByName(a.emp).dept || '')).toLowerCase().includes(q.toLowerCase())));
  const tableHtml = () => {
    const L = rows(), t0 = today();
    if (!L.length) return `<div class="card pad empty">${ic('search', 34)}<b>No leave applications match</b><span>Try a different filter.</span></div>`;
    return `<div class="card table-card"><div class="tscroll"><table class="dt iv-t la-t"><thead><tr><th>Employee</th><th>Leave type</th><th>Dates</th><th class="r">Days</th><th>Balance after</th><th>Approval</th><th>Status</th><th></th></tr></thead><tbody>${L.map((a) => {
      const e = X().eByName(a.emp), st = X().status(a), b = leftFor(a), s = stage(a), now = a.from <= t0 && a.to >= t0 && st === 'Approved', al = b.al || 1;
      const appr = st === 'Pending' && s ? `<span class="la-wait">${ic('clock', 12)}${esc(s.who)}</span><em class="sub">Waiting ${X().dayWaited(a)} d</em>` : st === 'Approved' ? `<span class="muted">${esc((a.stages[a.stages.length - 1] || {}).by || 'Approved')}</span><em class="sub">${fmtS((a.stages[a.stages.length - 1] || {}).at)}</em>` : st === 'Rejected' ? `<span class="muted">${esc((a.stages.find((x) => x.s === 'Rejected') || {}).by || '—')}</span>` : '<span class="muted">—</span>';
      return `<tr data-act="row" data-href="#/list/leave-application/app/${encodeURIComponent(a.id)}"><td><span class="who">${B.avatar(a.emp, 36)}<span><b>${esc(a.emp)}</b><em class="sub">${esc(e.dept || '')} · ${a.id}</em></span></span></td><td>${chip(a.type)}</td><td>${fmtS(a.from)}${a.to !== a.from ? ' – ' + fmtS(a.to) : ''}<em class="sub">${wd(a.from)}${a.to !== a.from ? ' – ' + wd(a.to) : ''}${now ? ' · on leave now' : ''}</em></td><td class="r"><b>${a.days}</b></td><td>${b.al ? `<div class="al-dp"><i><u style="width:${Math.max(0, Math.min(100, (b.left / al) * 100))}%;background:${b.left < 0 ? 'var(--bad)' : b.left <= 2 ? 'var(--warn)' : 'var(--ok)'}"></u></i><span>${b.left}/${b.al}</span></div>` : '<span class="muted">No limit</span>'}</td><td>${appr}</td><td>${pill(st)}</td><td class="r">${ic('right', 16)}</td></tr>`;
    }).join('')}</tbody></table></div></div>`;
  };
  const listView = () => {
    const A = apps(), t0 = today(), c = (s) => A.filter((a) => X().status(a) === s).length;
    const now = A.filter((a) => X().status(a) === 'Approved' && a.from <= t0 && a.to >= t0).length;
    const days = A.filter((a) => X().live(a)).reduce((n, a) => n + a.days, 0);
    const types = Object.keys(X().TYPES);
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Leaves', href: '#/module/leaves' }, { label: 'Leave Application' }])}<h1>Leave Applications <span class="count">${A.length}</span></h1><p class="sub">Every request with its approval stage and the employee's remaining balance. Open one for the full picture.</p></div>
        <div class="head-actions">${switcher('')}<a class="btn primary" href="#/page/leave-apply">${ic('plus', 16)}Apply for leave</a></div></div>
      <section class="iv-kpis">${kp('file', 'Applications', A.length, 'a')}${kp('clock', 'Pending', c('Pending'), 'c')}${kp('check-circle', 'Approved', c('Approved'), 'd')}${kp('x', 'Rejected', c('Rejected'), 'e')}${kp('users', 'On leave today', now, 'b')}${kp('calendar', 'Days taken / booked', days, 'a')}</section>
      <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="laq" value="${esc(q)}" placeholder="Search employee, department, leave type or ID…"></label>
        <div class="seg">${['all', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map((x) => `<button class="${sf === x ? 'on' : ''}" data-act="la-sf" data-v="${x}">${x === 'all' ? 'All' : x}${x === 'all' ? '' : ' <span class="count">' + c(x) + '</span>'}</button>`).join('')}</div>
        <select class="inp" style="max-width:190px" data-chg="latf"><option value="all">All leave types</option>${types.map((t) => `<option ${tf === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div id="la-tbl" style="margin-top:14px">${tableHtml()}</div>`;
  };
  B.inp.laq = (t) => { q = t.value; const g = B.$('#la-tbl'); if (g) g.innerHTML = tableHtml(); };
  B.chg.latf = (t) => { tf = t.value; const g = B.$('#la-tbl'); if (g) g.innerHTML = tableHtml(); };
  B.act['la-sf'] = (t) => { sf = t.dataset.v; B.route(); };

  /* ---------- detail ---------- */
  let cur = '';
  const detail = (id) => {
    const a = find(id); if (!a) return `<div class="empty big">${ic('search', 44)}<b>Application not found</b><a class="btn primary" href="#/list/leave-application">Back</a></div>`;
    cur = a.id;
    const L = X(), e = L.eByName(a.emp), st = L.status(a), sum = summary(a.emp), mine = sum.find((x) => x.t === a.type), t0 = today();
    const cd = L.countDays(a.type, a.from, a.to), cs = L.curIdx(a.stages), s = a.stages[cs];
    const myApps = L.D().apps.filter((x) => x.emp === a.emp && x.id !== a.id).sort((x, y) => (x.from < y.from ? 1 : -1)).slice(0, 5);
    const overlap = L.D().apps.filter((x) => x.id !== a.id && L.live(x) && x.emp !== a.emp && (L.eByName(x.emp).dept === e.dept) && x.from <= a.to && x.to >= a.from);
    const canAct = st === 'Pending' && s && (L.isHR() || s.who === L.me().name);
    const acts = canAct ? `<button class="btn danger-o" data-act="la-rej">${ic('x', 16)}Reject</button><button class="btn primary" data-act="la-ap">${ic('check', 16)}Approve as ${esc(s.t)}</button>` : st === 'Pending' || st === 'Approved' ? `<button class="btn" data-act="la-cancel">Cancel request</button>` : '';
    const mgr = L.mgrName(e), takenAll = sum.reduce((n, x) => n + (x.al ? x.taken : 0), 0), allocAll = sum.reduce((n, x) => n + x.al, 0);
    const kv = (l, v) => `<div><span>${l}</span><b>${v}</b></div>`;
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Leave Application', href: '#/list/leave-application' }, { label: a.emp }])}<h1>${esc(a.emp)} ${pill(st)}</h1><p class="sub">${a.id} · ${esc(a.type)} · applied ${fmt(a.created)}</p></div>
        <div class="head-actions"><a class="btn" href="#/list/leave-application">${ic('left', 16)}All applications</a>${acts}</div></div>
      <section class="iv-kpis">${kp('calendar', 'Days requested', a.days, 'a', fmtS(a.from) + (a.to !== a.from ? ' – ' + fmtS(a.to) : ''))}${kp('shield', mine ? 'Balance before request' : 'Balance', mine && mine.al ? mine.left + (st === 'Pending' || st === 'Approved' ? a.days : 0) : '—', 'b', mine && mine.al ? 'of ' + mine.al + ' ' + esc(a.type.replace(' Leave', '')) + ' days' : 'No fixed limit')}${kp('check-circle', 'Balance after', mine && mine.al ? mine.left : '—', mine && mine.left < 0 ? 'e' : mine && mine.left <= 2 ? 'c' : 'd', mine && mine.left < 0 ? 'Exceeds balance' : st === 'Pending' ? 'if approved' : st === 'Approved' ? 'after this leave' : 'unchanged')}${kp('clock', st === 'Pending' ? 'Waiting' : 'Decision', st === 'Pending' ? L.dayWaited(a) + ' days' : st, st === 'Pending' && L.dayWaited(a) >= 3 ? 'e' : 'c', st === 'Pending' && s ? 'on ' + esc(s.who) : '')}</section>
      <div class="iv-cwrap"><div class="iv-main">
        <div class="card pad"><div class="ct-row"><h3 class="ct">Leave summary · ${esc(a.emp)}</h3><span class="pill info">${takenAll} of ${allocAll} days used</span></div>
          <div class="la-sum">${sum.map((x) => { const pct = x.al ? Math.min(100, Math.round(((x.taken + x.pend) / x.al) * 100)) : 0; return `<div class="la-sr ${x.t === a.type ? 'on' : ''}"><div class="la-sh">${chip(x.t)}${x.al ? `<b>${x.left}<small> left</small></b>` : '<b>—</b>'}</div>${x.al ? `<div class="la-sb"><u style="width:${Math.min(100, (x.taken / x.al) * 100)}%;background:${TC[x.t] || 'var(--accent)'}"></u><u class="p" style="width:${Math.min(100 - Math.min(100, (x.taken / x.al) * 100), (x.pend / x.al) * 100)}%"></u></div>` : '<div class="la-sb none"></div>'}<div class="la-sf"><span>Entitled <b>${x.al || '—'}</b></span><span>Used <b>${x.taken}</b></span><span>Pending <b>${x.pend}</b></span></div></div>`; }).join('')}</div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Request details</h3>${chip(a.type)}</div><div class="jo-kv">${kv('From', fmt(a.from) + ' (' + wd(a.from) + ')')}${kv('To', fmt(a.to) + ' (' + wd(a.to) + ')')}${kv('Counted days', a.days)}${kv('Applied on', fmt(a.created))}${kv('Handover to', esc(a.hand || '—'))}${kv('Contact during leave', esc(a.contact || '—'))}</div>
          <div class="la-reason">${ic('message', 14)}<div><span>Reason</span><p>${esc(a.reason || 'No reason provided')}</p></div></div>${a.file ? `<div class="la-file">${ic('file', 14)}<b>${esc(a.file)}</b><button class="btn sm" data-act="toast" data-msg="Opening ${esc(a.file)}">View file</button></div>` : ''}
          <h4 class="la-h4">Day-by-day count</h4><div class="la-days">${cd.list.map((x) => `<div class="${x.c ? 'on' : 'off'}" data-tip="${esc(x.why)}"><span>${wd(x.d)}</span><b>${new Date(x.d + 'T00:00').getDate()}</b><em>${x.c ? 'Counted' : 'Not counted'}</em></div>`).join('')}</div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Other leaves by ${esc(a.emp.split(' ')[0])}</h3></div>${myApps.length ? `<ul class="ld-up la-his">${myApps.map((x) => `<li style="--lc:${TC[x.type] || 'var(--accent)'}"><div class="ld-i"><b>${esc(x.type)}</b><span>${fmtS(x.from)}${x.to !== x.from ? ' – ' + fmtS(x.to) : ''} · ${x.days} day${x.days > 1 ? 's' : ''}</span></div><div class="ld-r">${pill(L.status(x))}<a class="link-btn" href="#/list/leave-application/app/${encodeURIComponent(x.id)}">Open</a></div></li>`).join('')}</ul>` : '<p class="muted">No other leave applications.</p>'}</div>
      </div>
      <aside class="iv-side">
        <div class="card pad iv-prof la-emp">${B.avatar(a.emp, 56)}<div class="ivpf-i"><b>${esc(a.emp)}</b><span>${esc(e.desig || '')}</span><div class="ivpf-m"><span>${ic('org', 13)}${esc(e.dept || '')}</span><span>${ic('user', 13)}Reports to ${esc(mgr)}</span>${e.doj ? `<span>${ic('calendar', 13)}Joined ${fmt(e.doj)}</span>` : ''}</div></div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Approval chain</h3></div><div class="of-apv">${a.stages.map((x, i) => `<div class="${x.s === 'Approved' ? 'ok' : x.s === 'Rejected' ? 'bad' : ''}">${B.avatar(x.who, 32)}<div><b>${esc(x.who)}</b><span>${esc(L.stageNote(x))}${x.at ? ' · ' + fmtS(x.at) : ''}</span>${x.note ? `<em>${esc(x.note)}</em>` : ''}${i === cs && st === 'Pending' ? '<em class="la-now">Current stage</em>' : ''}</div>${pill(x.s)}</div>`).join('')}</div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Team on leave in these dates</h3><span class="count">${overlap.length}</span></div>${overlap.length ? `<ul class="dx-hires">${overlap.slice(0, 5).map((x) => `<li>${B.avatar(x.emp, 30)}<div><b>${esc(x.emp)}</b><span>${esc(x.type)} · ${fmtS(x.from)}${x.to !== x.from ? ' – ' + fmtS(x.to) : ''}</span></div></li>`).join('')}</ul>` : `<p class="muted" style="margin:0">No one else from ${esc(e.dept || 'the department')} is away. Coverage looks fine.</p>`}</div>
      </aside></div>`;
  };
  const here = () => decodeURIComponent((location.hash.split('/app/')[1] || cur || ''));
  B.act['la-ap'] = () => { const L = X(), a = find(here()); if (!a) return; const i = L.curIdx(a.stages), s = a.stages[i]; if (!s) return; Object.assign(s, { s: 'Approved', by: L.isHR() ? s.who : L.me().name, at: today() }); L.save(); B.toast(L.curIdx(a.stages) < 0 ? 'Leave fully approved' : 'Approved. Forwarded to ' + a.stages[L.curIdx(a.stages)].who); B.route(); };
  B.act['la-rej'] = () => B.modal({ title: 'Reject leave application', body: '<div class="fld"><label>Reason (shown to the employee)</label><textarea class="inp" id="la-n" rows="3"></textarea></div>', foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="la-dorej">Reject</button>' });
  B.act['la-dorej'] = () => { const n = (B.$('#la-n').value || '').trim(); if (!n) { B.toast('A reason is required', 'bad'); return; } const L = X(), a = find(here()), s = a.stages[L.curIdx(a.stages)]; Object.assign(s, { s: 'Rejected', by: L.isHR() ? s.who : L.me().name, at: today(), note: n }); L.save(); B.closeModal(); B.toast('Leave rejected', 'bad'); B.route(); };
  B.act['la-cancel'] = () => { const a = find(here()); if (!a) return; a.status = 'Cancelled'; X().save(); B.toast('Leave request cancelled'); B.route(); };

  B.renderLeaveApps = (kind, id) => (kind === 'app' ? detail(id) : listView());
})();
