/* Sentradesk HRMS — Attendance Request: overview list with consistent reasons, approval trail and approve/reject actions (overrides the generic list) */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const fd = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const fs = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const wd = (d) => d.toLocaleDateString('en-GB', { weekday: 'short' });
  const EXP = { 'Work From Home': ['Planned remote day', 'Client call from home', 'Family commitment'], 'On Duty': ['Client site visit', 'Field work', 'Vendor meeting'], 'Forgot to Checkin': ['Missed punch', 'Device not working', 'Network outage'], Other: ['Medical appointment', 'Personal work', 'Missed punch'] };
  const RI = { 'Work From Home': 'home', 'On Duty': 'briefcase', 'Forgot to Checkin': 'fingerprint', Other: 'edit' };
  const TONE = { Draft: 'mute', Submitted: 'warn', Approved: 'ok', Rejected: 'bad' };
  const st = { q: '', s: 'all', r: 'all' };
  const KEY = 'ar33';
  let over = {}; try { over = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { over = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(over)); } catch (e) { /* ignore */ } };
  let cache = null;

  const records = () => {
    if (cache) return cache;
    const mgrs = B.EMPLOYEES.filter((e) => /manager|director|head|lead/i.test(e.desig || ''));
    cache = B.getRows('attendance-request').map((r, i) => {
      const rr = B.rng('ar33' + i), nm = String(r.vals[0]), e = B.EMPLOYEES.find((x) => x.name === nm) || r.p || {};
      const reason = r.vals[3], exp = EXP[reason][Math.floor(rr() * EXP[reason].length)];
      const future = reason === 'Work From Home' && rr() < 0.4, days = reason === 'Forgot to Checkin' ? 1 : 1 + Math.floor(rr() * (reason === 'Other' ? 1 : 3));
      const from = future ? addD(B.today, 1 + Math.floor(rr() * 8)) : addD(B.today, -(1 + Math.floor(i * 0.9 + rr() * 3))), to = addD(from, days - 1);
      let status = over[r.name] || r.vals[5]; if (!over[r.name] && future && status === 'Approved' && rr() < 0.5) status = 'Submitted';
      const sub = addD(from > B.today ? B.today : from, -Math.floor(rr() * 2)), appr = (mgrs.filter((m) => m.id !== e.id)[i % Math.max(1, mgrs.length - 1)]) || {};
      return { id: r.name, emp: nm, dept: e.dept || '', desig: e.desig || '', eid: e.id || '', reason, exp, from, to, days, status, sub, appr: appr.name || 'Rahim Uddin', note: ['Please approve — attaching proof later.', 'Informed my manager verbally.', 'Could not mark attendance on the day.', 'Client meeting ran the whole day.'][Math.floor(rr() * 4)] };
    }).sort((a, b) => b.from - a.from);
    return cache;
  };
  const rows = () => records().filter((r) => (st.s === 'all' || r.status === st.s) && (st.r === 'all' || r.reason === st.r) && (!st.q || (r.emp + r.dept + r.id + r.reason + r.exp).toLowerCase().includes(st.q.toLowerCase())));
  const range = (r) => fs(r.from) + (r.days > 1 ? ' – ' + fs(r.to) : '');
  const rchip = (x) => `<span class="ar-r">${ic(RI[x] || 'edit', 13)}${esc(x)}</span>`;

  const table = () => {
    const L = rows(); if (!L.length) return `<div class="card pad empty">${ic('search', 34)}<b>No requests match</b><span>Try a different filter.</span></div>`;
    return `<div class="card table-card"><div class="tscroll"><table class="dt iv-t"><thead><tr><th>Employee</th><th>Reason</th><th>Dates</th><th class="r">Days</th><th>Explanation</th><th>Approver</th><th>Status</th><th></th></tr></thead><tbody>${L.map((r) => `<tr data-act="ar-open" data-id="${r.id}"><td><span class="who">${B.avatar(r.emp, 34)}<span><b>${esc(r.emp)}</b><em class="sub">${esc(r.dept)} · ${r.id}</em></span></span></td><td>${rchip(r.reason)}</td><td>${range(r)}<em class="sub">${wd(r.from)}${r.days > 1 ? ' – ' + wd(r.to) : ''}${r.from > B.today ? ' · upcoming' : ''}</em></td><td class="r"><b>${r.days}</b></td><td>${esc(r.exp)}</td><td>${r.status === 'Draft' ? '<span class="muted">Not submitted</span>' : esc(r.appr)}</td><td>${B.pill(r.status, TONE[r.status])}</td><td class="r">${ic('right', 16)}</td></tr>`).join('')}</tbody></table></div></div>`;
  };
  const kp = (i, l, v, c, sub) => `<div class="card ivk"><span class="ivk-i ${c || ''}">${ic(i, 18)}</span><div><b>${v}</b><span>${l}</span>${sub ? `<em class="ld-sub">${sub}</em>` : ''}</div></div>`;
  const switcher = () => `<div class="seg views">${[['', 'list', 'List'], ['kanban', 'kanban', 'Kanban'], ['calendar', 'calendar', 'Calendar'], ['report', 'bars', 'Report']].map((v) => `<a class="${v[0] === '' ? 'on' : ''}" href="#/list/attendance-request${v[0] ? '/' + v[0] : ''}">${ic(v[1], 16)}<span>${v[2]}</span></a>`).join('')}</div>`;

  B.renderAttReq = () => {
    const A = records(), c = (s) => A.filter((r) => r.status === s).length, days = A.filter((r) => r.status === 'Approved').reduce((n, r) => n + r.days, 0);
    const top = Object.keys(EXP).map((k) => [k, A.filter((r) => r.reason === k).length]).sort((a, b) => b[1] - a[1])[0];
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Shift & Attendance', href: '#/module/attendance' }, { label: 'Attendance Request' }])}<h1>Attendance Requests <span class="count">${A.length}</span></h1><p class="sub">Work-from-home, on-duty and missed-punch requests with their approval status. Open one to review and decide.</p></div>
        <div class="head-actions">${switcher()}<a class="btn primary" href="#/form/attendance-request/new">${ic('plus', 16)}Add Attendance Request</a></div></div>
      <section class="iv-kpis">${kp('edit', 'Total requests', A.length, 'a')}${kp('clock', 'Awaiting approval', c('Submitted'), 'c', c('Submitted') ? 'needs a decision' : 'all caught up')}${kp('check-circle', 'Approved', c('Approved'), 'd', days + ' days covered')}${kp('x', 'Rejected', c('Rejected'), 'e')}${kp('file', 'Drafts', c('Draft'), 'a', 'not submitted yet')}${kp('trend', 'Most common', top[0], 'b', top[1] + ' requests')}</section>
      <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="arq" value="${esc(st.q)}" placeholder="Search employee, reason, explanation or ID…"></label>
        <div class="seg">${['all', 'Submitted', 'Approved', 'Rejected', 'Draft'].map((x) => `<button class="${st.s === x ? 'on' : ''}" data-act="ar-sf" data-v="${x}">${x === 'all' ? 'All' : x}${x === 'all' ? '' : ' <span class="count">' + c(x) + '</span>'}</button>`).join('')}</div>
        <select class="inp" style="max-width:190px" data-chg="arr"><option value="all">All reasons</option>${Object.keys(EXP).map((x) => `<option ${st.r === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div id="ar-tbl" style="margin-top:14px">${table()}</div>`;
  };
  B.inp.arq = (t) => { st.q = t.value; const g = B.$('#ar-tbl'); if (g) g.innerHTML = table(); };
  B.chg.arr = (t) => { st.r = t.value; B.route(); };
  B.act['ar-sf'] = (t) => { st.s = t.dataset.v; B.route(); };

  const find = (id) => records().find((x) => x.id === id);
  const setS = (id, s, msg) => { over[id] = s; save(); const r = find(id); if (r) r.status = s; B.closeModal(); B.toast(msg); B.route(); };
  B.act['ar-approve'] = (t) => setS(t.dataset.id, 'Approved', 'Request approved');
  B.act['ar-reject'] = (t) => setS(t.dataset.id, 'Rejected', 'Request rejected');
  B.act['ar-submit'] = (t) => setS(t.dataset.id, 'Submitted', 'Request submitted for approval');

  B.act['ar-open'] = (t) => {
    const r = find(t.dataset.id); if (!r) return;
    const steps = [['Requested', r.emp, r.status === 'Draft' ? null : fd(r.sub), r.status !== 'Draft'], ['Manager review', r.appr, r.status === 'Approved' || r.status === 'Rejected' ? fd(addD(r.sub, 1)) : null, r.status === 'Approved' || r.status === 'Rejected'], ['Attendance updated', 'System', r.status === 'Approved' ? fd(addD(r.sub, 1)) : null, r.status === 'Approved']];
    const body = `<div class="oa-mh">${B.avatar(r.emp, 52)}<div><b>${esc(r.emp)}</b><span>${esc(r.desig)}${r.desig ? ' · ' : ''}${esc(r.dept)}</span><span>${r.id}</span></div>${B.pill(r.status, TONE[r.status])}</div>
      <div class="oa-mt"><div><span>Reason</span><b>${rchip(r.reason)}</b></div><div><span>From</span><b>${fd(r.from)}</b></div><div><span>To</span><b>${fd(r.to)}</b></div><div><span>Days</span><b>${r.days}</b></div><div><span>Approver</span><b>${esc(r.appr)}</b></div></div>
      <h4 class="oa-h">Explanation</h4><div class="ar-note"><b>${esc(r.exp)}</b><span>“${esc(r.note)}”</span></div>
      <h4 class="oa-h">Approval trail</h4><ul class="oa-tl">${steps.map((s) => `<li class="${s[3] ? (r.status === 'Rejected' && s[0] === 'Manager review' ? 'out' : 'in') : 'out'}" style="${s[3] ? '' : 'opacity:.5'}"><i></i><div class="oa-tt"><b>${s[0]}</b></div><div class="oa-td">${esc(s[1])}<small>${s[2] || 'Pending'}</small></div></li>`).join('')}</ul>`;
    const id = esc(r.id);
    const foot = (r.status === 'Submitted' ? `<button class="btn" data-act="ar-reject" data-id="${id}">Reject</button><button class="btn primary" data-act="ar-approve" data-id="${id}">Approve</button>` : r.status === 'Draft' ? `<button class="btn primary" data-act="ar-submit" data-id="${id}">Submit for approval</button>` : '') + '<button class="btn" data-act="close-modal">Close</button>';
    B.modal({ title: 'Attendance Request · ' + r.id, body, wide: true, foot });
  };
})();
