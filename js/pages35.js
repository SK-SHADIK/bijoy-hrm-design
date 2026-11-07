/* Sentradesk HRMS — Shift Request: current → requested shift, reason, approval trail and approve/reject (overrides the generic list) */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const fd = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const fs = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const wd = (d) => d.toLocaleDateString('en-GB', { weekday: 'short' });
  const SH = { Normal: ['09:30 – 18:30', 'c3'], Morning: ['06:00 – 15:00', 'c1'], Evening: ['14:00 – 23:00', 'c4'], Night: ['22:00 – 07:00', 'c2'], Open: ['Flexible · 8 h', 'c3'] };
  const REASONS = ['Childcare timing', 'Evening classes', 'Long commute — avoid peak hours', 'Health / medical routine', 'Swap with a teammate', 'Project coverage needed'];
  const TONE = { Draft: 'mute', Submitted: 'warn', Approved: 'ok', Rejected: 'bad' };
  const st = { q: '', s: 'all', t: 'all' };
  const KEY = 'sr35';
  let over = {}; try { over = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { over = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(over)); } catch (e) { /* ignore */ } };
  let cache = null;
  const chip = (s) => `<span class="sr-sh ${SH[s] ? SH[s][1] : ''}"><i></i>${esc(s)}</span>`;

  const records = () => {
    if (cache) return cache;
    const mgrs = B.EMPLOYEES.filter((e) => /manager|director|head|lead/i.test(e.desig || ''));
    cache = B.getRows('shift-request').map((r, i) => {
      const rr = B.rng('sr35' + i), nm = String(r.vals[0]), e = B.EMPLOYEES.find((x) => x.name === nm) || r.p || {};
      const keys = Object.keys(SH), to = r.vals[1] === 'General' ? 'Normal' : r.vals[1], cur = keys.filter((k) => k !== to)[Math.floor(rr() * (keys.length - 1))];
      const past = rr() < 0.4, days = 1 + Math.floor(rr() * 14), from = past ? addD(B.today, -(3 + Math.floor(rr() * 20))) : addD(B.today, 1 + Math.floor(rr() * 18)), end = addD(from, days - 1);
      let status = r.vals[4]; if (status === 'Draft' && rr() < 0.5) status = 'Submitted'; if (!past && status === 'Approved' && rr() < 0.4) status = 'Submitted'; if (over[r.name]) status = over[r.name];
      const appr = mgrs.filter((m) => m.id !== e.id)[i % Math.max(1, mgrs.length - 1)] || {};
      return { id: r.name, emp: nm, dept: e.dept || '', desig: e.desig || '', eid: e.id || '', cur, to, from, end, days, status, reason: REASONS[Math.floor(rr() * REASONS.length)], sub: addD(from, -(2 + Math.floor(rr() * 5))), appr: appr.name || 'Rahim Uddin' };
    }).sort((a, b) => b.from - a.from);
    return cache;
  };
  const rows = () => records().filter((r) => (st.s === 'all' || r.status === st.s) && (st.t === 'all' || r.to === st.t) && (!st.q || (r.emp + r.dept + r.id + r.reason + r.to).toLowerCase().includes(st.q.toLowerCase())));
  const live = (r) => r.status === 'Approved' && r.from <= B.today && r.end >= B.today;
  const range = (r) => fs(r.from) + (r.days > 1 ? ' – ' + fs(r.end) : '');

  const table = () => {
    const L = rows(); if (!L.length) return `<div class="card pad empty">${ic('search', 34)}<b>No shift requests match</b><span>Try a different filter.</span></div>`;
    return `<div class="card table-card"><div class="tscroll"><table class="dt iv-t"><thead><tr><th>Employee</th><th>Shift change</th><th>Dates</th><th class="r">Days</th><th>Reason</th><th>Status</th><th></th></tr></thead><tbody>${L.map((r) => `<tr data-act="sr-open" data-id="${r.id}"><td><span class="who">${B.avatar(r.emp, 34)}<span><b>${esc(r.emp)}</b><em class="sub">${esc(r.dept)} · ${r.id}</em></span></span></td><td><span class="sr-chg">${chip(r.cur)}<em>${ic('right', 14)}</em>${chip(r.to)}</span></td><td>${range(r)}<em class="sub">${wd(r.from)}${r.days > 1 ? ' – ' + wd(r.end) : ''}${live(r) ? ' · active now' : r.from > B.today ? ' · upcoming' : ''}</em></td><td class="r"><b>${r.days}</b></td><td>${esc(r.reason)}</td><td>${B.pill(r.status, TONE[r.status])}</td><td class="r">${ic('right', 16)}</td></tr>`).join('')}</tbody></table></div></div>`;
  };
  const kp = (i, l, v, c, sub) => `<div class="card ivk"><span class="ivk-i ${c || ''}">${ic(i, 18)}</span><div><b>${v}</b><span>${l}</span>${sub ? `<em class="ld-sub">${sub}</em>` : ''}</div></div>`;
  const switcher = () => `<div class="seg views">${[['', 'list', 'List'], ['kanban', 'kanban', 'Kanban'], ['report', 'bars', 'Report']].map((v) => `<a class="${v[0] === '' ? 'on' : ''}" href="#/list/shift-request${v[0] ? '/' + v[0] : ''}">${ic(v[1], 16)}<span>${v[2]}</span></a>`).join('')}</div>`;

  B.renderShiftReq = () => {
    const A = records(), c = (s) => A.filter((r) => r.status === s).length, now = A.filter(live).length;
    const pop = Object.keys(SH).map((k) => [k, A.filter((r) => r.to === k).length]).sort((a, b) => b[1] - a[1])[0];
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Shift & Attendance', href: '#/module/attendance' }, { label: 'Shift Request' }])}<h1>Shift Requests <span class="count">${A.length}</span></h1><p class="sub">Employees asking to move to a different shift, with the reason and approval status. Open one to review.</p></div>
        <div class="head-actions">${switcher()}<a class="btn primary" href="#/form/shift-request/new">${ic('plus', 16)}Add Shift Request</a></div></div>
      <section class="iv-kpis">${kp('refresh', 'Total requests', A.length, 'a')}${kp('clock', 'Awaiting approval', c('Submitted'), 'c', c('Submitted') ? 'needs a decision' : 'all caught up')}${kp('check-circle', 'Approved', c('Approved'), 'd', now + ' active now')}${kp('x', 'Rejected', c('Rejected'), 'e')}${kp('file', 'Drafts', c('Draft'), 'a')}${kp('trend', 'Most requested', pop[0], 'b', pop[1] + ' requests')}</section>
      <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="srq" value="${esc(st.q)}" placeholder="Search employee, shift, reason or ID…"></label>
        <div class="seg">${['all', 'Submitted', 'Approved', 'Rejected', 'Draft'].map((x) => `<button class="${st.s === x ? 'on' : ''}" data-act="sr-sf" data-v="${x}">${x === 'all' ? 'All' : x}${x === 'all' ? '' : ' <span class="count">' + c(x) + '</span>'}</button>`).join('')}</div>
        <select class="inp" style="max-width:190px" data-chg="srt"><option value="all">All requested shifts</option>${Object.keys(SH).map((x) => `<option ${st.t === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div id="sr-tbl" style="margin-top:14px">${table()}</div>`;
  };
  B.inp.srq = (t) => { st.q = t.value; const g = B.$('#sr-tbl'); if (g) g.innerHTML = table(); };
  B.chg.srt = (t) => { st.t = t.value; B.route(); };
  B.act['sr-sf'] = (t) => { st.s = t.dataset.v; B.route(); };

  const find = (id) => records().find((x) => x.id === id);
  const setS = (id, s, msg) => { over[id] = s; save(); const r = find(id); if (r) r.status = s; B.closeModal(); B.toast(msg); B.route(); };
  B.act['sr-approve'] = (t) => setS(t.dataset.id, 'Approved', 'Shift request approved');
  B.act['sr-reject'] = (t) => setS(t.dataset.id, 'Rejected', 'Shift request rejected');
  B.act['sr-submit'] = (t) => setS(t.dataset.id, 'Submitted', 'Request submitted for approval');

  B.act['sr-open'] = (t) => {
    const r = find(t.dataset.id); if (!r) return; const done = r.status === 'Approved' || r.status === 'Rejected';
    const steps = [['Requested', r.emp, r.status === 'Draft' ? null : fd(r.sub), r.status !== 'Draft'], ['Manager review', r.appr, done ? fd(addD(r.sub, 1)) : null, done], ['Roster updated', 'System', r.status === 'Approved' ? fd(addD(r.sub, 1)) : null, r.status === 'Approved']];
    const body = `<div class="oa-mh">${B.avatar(r.emp, 52)}<div><b>${esc(r.emp)}</b><span>${esc(r.desig)}${r.desig ? ' · ' : ''}${esc(r.dept)}</span><span>${r.id}</span></div>${B.pill(r.status, TONE[r.status])}</div>
      <div class="sr-cmp"><div><span>Current shift</span>${chip(r.cur)}<em>${SH[r.cur][0]}</em></div><b>${ic('right', 20)}</b><div class="to"><span>Requested shift</span>${chip(r.to)}<em>${SH[r.to][0]}</em></div></div>
      <div class="oa-mt"><div><span>From</span><b>${fd(r.from)}</b></div><div><span>To</span><b>${fd(r.end)}</b></div><div><span>Days</span><b>${r.days}</b></div><div><span>Approver</span><b>${esc(r.appr)}</b></div></div>
      <h4 class="oa-h">Reason</h4><div class="ar-note"><b>${esc(r.reason)}</b><span>${live(r) ? 'This change is active today.' : r.from > B.today ? 'Starts in ' + Math.round((r.from - B.today) / 864e5) + ' days.' : 'Period has ended.'}</span></div>
      <h4 class="oa-h">Approval trail</h4><ul class="oa-tl">${steps.map((s) => `<li class="${s[3] ? (r.status === 'Rejected' && s[0] === 'Manager review' ? 'out' : 'in') : 'out'}" style="${s[3] ? '' : 'opacity:.5'}"><i></i><div class="oa-tt"><b>${s[0]}</b></div><div class="oa-td">${esc(s[1])}<small>${s[2] || 'Pending'}</small></div></li>`).join('')}</ul>`;
    const id = esc(r.id), foot = (r.status === 'Submitted' ? `<button class="btn" data-act="sr-reject" data-id="${id}">Reject</button><button class="btn primary" data-act="sr-approve" data-id="${id}">Approve</button>` : r.status === 'Draft' ? `<button class="btn primary" data-act="sr-submit" data-id="${id}">Submit for approval</button>` : '') + '<button class="btn" data-act="close-modal">Close</button>';
    B.modal({ title: 'Shift Request · ' + r.id, body, wide: true, foot });
  };
})();
