/* Bijoy HRMS — Disciplinary & Grievance module. Cases, show-cause notices, hearings, decisions and appeals; grievances with SLA.
   Data lives in the browser (localStorage) so the whole flow is usable in the design. */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const KEY = 'bijoy-dg-db-v1';
  const HR = ['Farhana Akter', 'Fatema Khatun', 'Mitu Rahman', 'Sumaiya Begum'];
  const SEV = ['Minor', 'Moderate', 'Major'];
  const PRI = ['Low', 'Medium', 'High'];
  const SLA_BY_PRI = { High: 3, Medium: 7, Low: 14 };
  const STEPS = ['Reported', 'Show-cause', 'Response', 'Hearing', 'Decision'];
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const day = (n, from) => { const d = from ? new Date(from + 'T00:00') : new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const me = () => (B.role === 'employee' ? B.ME : B.ADMIN_EMP);
  const empByName = (n) => B.EMPLOYEES.find((e) => e.name === n) || {};
  const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 99);
  const who = (n) => `<span class="as-who">${B.avatar(n, 26)}<span>${esc(n)}</span></span>`;
  const Kp = (i, t, v, tn) => B.kpi(i, t, v, null, null, tn);
  const kp = (a) => `<section class="kpis sm lv-stats" style="grid-template-columns:repeat(${a.length},minmax(0,1fr))">${a.join('')}</section>`;
  const tabs = (list, cur, act) => `<div class="seg sm as-tabs">${list.map((t) => `<button class="${t[0] === cur ? 'on' : ''}" data-act="${act}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>`;
  const field = (l, c, full) => `<div class="fld" ${full ? 'style="grid-column:1/-1"' : ''}><label>${l}</label>${c}</div>`;
  const grid = (c) => `<div class="fgrid" style="grid-template-columns:1fr 1fr">${c}</div>`;
  const sel = (id, list, cur) => `<select class="inp" id="${id}">${list.map((x) => `<option value="${esc(x.id || x)}" ${(x.id || x) === cur ? 'selected' : ''}>${esc(x.name || x)}</option>`).join('')}</select>`;
  const empSel = (id) => `<select class="inp" id="${id}">${B.EMPLOYEES.filter((e) => e.status !== 'Left').map((e) => `<option>${esc(e.name)}</option>`).join('')}</select>`;
  const rid = (t) => t.closest('[data-id]').dataset.id;
  const crumbs = (l) => [{ label: 'HR', href: '#/' }, { label: 'Disciplinary & Grievance', href: '#/page/dg-dash' }, { label: l }];
  const PILL = { Reported: 'mute', 'Show-cause issued': 'warn', 'Response received': 'info', 'Hearing scheduled': 'info', Closed: 'ok', Dismissed: 'mute', Appealed: 'warn', Open: 'warn', Investigating: 'info', Resolved: 'ok', High: 'bad', Medium: 'warn', Low: 'info', Minor: 'info', Moderate: 'warn', Major: 'bad', Scheduled: 'info', Held: 'ok', Cancelled: 'mute', Pending: 'warn', Acknowledged: 'ok', Responded: 'ok' };
  const pill = (s) => B.pill(s, PILL[s] || 'mute');

  /* ---------- seed ---------- */
  function seed() {
    const cats = [['c1', 'Attendance', 'Minor'], ['c2', 'Conduct', 'Moderate'], ['c3', 'Policy violation', 'Moderate'], ['c4', 'Performance', 'Minor'], ['c5', 'Harassment', 'Major'], ['c6', 'Fraud or theft', 'Major']].map((x) => ({ id: x[0], name: x[1], sev: x[2] }));
    const acts = [['a1', 'Verbal warning', 1, 6], ['a2', 'Written warning', 2, 12], ['a3', 'Final written warning', 3, 12], ['a4', 'Suspension', 4, 0], ['a5', 'Termination', 5, 0]].map((x) => ({ id: x[0], name: x[1], rank: x[2], validity: x[3] }));
    const gtypes = [['g1', 'Payroll', 5, 'Farhana Akter'], ['g2', 'Workplace', 7, 'Fatema Khatun'], ['g3', 'Facilities', 10, 'Mitu Rahman'], ['g4', 'Conduct', 5, 'Fatema Khatun'], ['g5', 'Harassment', 3, 'Sumaiya Begum']].map((x) => ({ id: x[0], name: x[1], sla: x[2], owner: x[3] }));
    const db = { cats, acts, gtypes, cases: [], notices: [], hearings: [], grvs: [], seq: { dc: 0, gr: 0, nt: 0, hr: 0 } };
    return db;
  }
  let db = null;
  const D = () => { if (!db) { try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} if (!db || !db.cases) { db = seed(); populate(); save(); } } return db; };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  const next = (k, p) => p + '-' + B.pad(++db.seq[k], 4);
  const by = (l, id) => l.find((x) => x.id === id);
  const cat = (c) => (by(D().cats, c.catId) || { name: '—' }).name;
  const act = (id) => by(D().acts, id) || { name: id };
  const tl = (c, t, by) => c.timeline.push({ d: today(), t, by: by || (B.role === 'employee' ? me().name : 'HR') });

  function newCase(o) {
    const c = Object.assign({ id: next('dc', 'DC'), status: 'Reported', step: 0, outcome: '', effective: '', findings: '', response: null, appeal: null, timeline: [], reported: today(), by: 'HR' }, o);
    tl(c, 'Case opened (' + c.sev + ' · ' + cat(c) + ')', c.by); D().cases.push(c); return c;
  }
  function addNotice(kind, c, subject, body, due) { const n = { id: next('nt', 'NT'), kind, caseId: c.id, emp: c.emp, date: today(), subject, body, due: due || '', ack: false, resp: '' }; D().notices.push(n); return n; }
  function issueShowCause(c, due, note) {
    const n = addNotice('Show-cause', c, 'Show-cause notice · ' + c.id, `It has been reported that ${c.title} (${fmt(c.incident)}).${note ? '\n\n' + note : ''}\n\nYou are requested to explain in writing why disciplinary action should not be taken against you. Please submit your reply by ${fmt(due)}.`, due);
    Object.assign(c, { status: 'Show-cause issued', step: 1 }); tl(c, 'Show-cause notice issued, reply due ' + fmt(due)); return n;
  }
  function populate() {
    const mk = (emp, catId, sev, title, incidentAgo, extra) => newCase(Object.assign({ emp, catId, sev, title, desc: title, incident: day(-incidentAgo), proposed: 'Written warning' }, extra || {}));
    const c1 = mk('Mahmud Hasan', 'c2', 'Major', 'Inappropriate behaviour in a client meeting', 16); issueShowCause(c1, day(-10)); c1.response = { text: 'I apologise. The client raised a sensitive issue and I reacted poorly.', date: day(-11) }; c1.status = 'Response received'; c1.step = 2; tl(c1, 'Employee response received');
    const h1 = { id: next('hr', 'HG'), caseId: c1.id, emp: c1.emp, date: day(2), time: '11:00', venue: 'Conference Room B', panel: 'Fatema Khatun (HR), Rahim Uddin (MD)', status: 'Scheduled', minutes: '' }; D().hearings.push(h1);
    Object.assign(c1, { status: 'Hearing scheduled', step: 3 }); tl(c1, 'Hearing scheduled for ' + fmt(h1.date)); addNotice('Hearing invite', c1, 'Hearing invitation · ' + c1.id, `You are invited to a disciplinary hearing on ${fmt(h1.date)} at ${h1.time} in ${h1.venue}. Panel: ${h1.panel}. You may bring a colleague for support.`);
    const c2 = mk('Kamrul Hasan', 'c1', 'Minor', 'Repeated late arrival (7 times in September)', 8); issueShowCause(c2, day(1));
    const c3 = mk('Towhid Hasan', 'c3', 'Moderate', 'Shared confidential data over personal email', 40); closeCase(c3, 'a2', day(-30), 'Policy breach confirmed. Employee admitted the mistake.'); c3.notice.ack = true;
    const c4 = mk('Maliha Chowdhury', 'c1', 'Minor', 'Unauthorised absence on 14 August', 55); closeCase(c4, 'a1', day(-50), 'First offence. Verbal warning given.'); c4.notice.ack = true;
    const c5 = mk('Tasnim Rahman', 'c1', 'Minor', 'Late arrival on 12, 14 and 21 September', 14); issueShowCause(c5, day(3));
    const c6 = mk('Imran Hossain', 'c3', 'Moderate', 'Misuse of company laptop for personal business', 3);
    const c7 = mk('Tasnim Rahman', 'c1', 'Minor', 'Late arrival in June', 110); closeCase(c7, 'a1', day(-105), 'Informal verbal warning. No further action.'); c7.notice.ack = true;
    D().cases.forEach((c) => { delete c.notice; });
    const g = (emp, anon, typeId, subject, details, pri, ago, status, assignee, thread) => { const t = by(D().gtypes, typeId), date = day(-ago), x = { id: next('gr', 'GR'), emp, anon, typeId, subject, details, priority: pri, date, due: day(t.sla, date), status, assignee, thread: thread || [], resolution: '' }; x.thread.unshift({ by: anon ? 'Anonymous' : emp, role: 'emp', d: date, text: details }); D().grvs.push(x); return x; };
    g('Tasnim Rahman', false, 'g1', 'Overtime hours missing from September payslip', 'I worked 14 overtime hours in September but they are not in my payslip.', 'High', 3, 'Open', 'Farhana Akter');
    g('Sumaiya Begum', true, 'g4', 'Manager shouting at team members in meetings', 'This happens regularly and the team is afraid to speak up.', 'High', 6, 'Investigating', 'Fatema Khatun', [{ by: 'Fatema Khatun', role: 'hr', d: day(-5), text: 'Thanks for raising this. I am speaking with the people involved.', internal: false }]);
    const g3 = g('Sadia Islam', false, 'g3', 'Air conditioning not working on 3rd floor', 'AC has been off for two weeks.', 'Low', 12, 'Resolved', 'Mitu Rahman', [{ by: 'Mitu Rahman', role: 'hr', d: day(-4), text: 'AC repaired and tested.', internal: false }]); g3.resolution = 'AC unit repaired by the vendor.';
    g('Imran Hossain', false, 'g2', 'Unfair distribution of workload in the team', 'The same three people take all urgent tickets.', 'Medium', 9, 'Investigating', 'Fatema Khatun');
    g('Tasnim Rahman', false, 'g3', 'Request for an ergonomic chair', 'My chair causes back pain after a few hours.', 'Low', 40, 'Resolved', 'Mitu Rahman', [{ by: 'Mitu Rahman', role: 'hr', d: day(-30), text: 'A new chair has been arranged.', internal: false }]).resolution = 'Chair replaced.';
    g('Nusrat Jahan', false, 'g1', 'Wrong tax deducted in August', 'Tax deducted looks higher than the slab.', 'Medium', 1, 'Open', 'Farhana Akter');
  }
  function closeCase(c, actId, effective, findings) {
    const a = act(actId); Object.assign(c, { status: 'Closed', step: 4, outcome: a.id, effective, findings });
    tl(c, 'Decision: ' + a.name); c.notice = addNotice(/warning/i.test(a.name) ? 'Warning' : 'Decision', c, a.name + ' · ' + c.id, `After reviewing the case (${c.title}), the decision is: ${a.name}, effective ${fmt(effective)}.\n\n${findings}`);
    c.notice.date = effective; return c;
  }

  /* ---------- derived ---------- */
  const open = (c) => c.status !== 'Closed' && c.status !== 'Dismissed';
  const grvOpen = (g) => g.status !== 'Resolved' && g.status !== 'Dismissed';
  const overdue = (g) => grvOpen(g) && g.due < today();
  const warnActive = (c) => { const a = act(c.outcome); return c.status === 'Closed' && a.validity && day(a.validity * 30, c.effective) >= today() && /warning/i.test(a.name); };
  const gname = (g) => (g.anon && B.role === 'employee' ? 'Anonymous' : g.anon ? 'Anonymous' : g.emp);

  /* ---------- page plumbing ---------- */
  const F = { cases: {}, grv: {}, hear: {}, setup: {}, mine: {} }, PG = {}; let cur = '';
  const rerender = () => { const v = B.$('#view .fade'); if (v && PG[cur]) v.innerHTML = PG[cur](); };
  const reset = (n) => { if (n === 'dg-cases') F.cases = { q: '', st: '', sev: '' }; if (n === 'dg-grievances') F.grv = { q: '', st: '', type: '' }; if (n === 'dg-hearings') F.hear = { tab: 'up' }; if (n === 'dg-setup') F.setup = { tab: 'cats' }; if (n === 'my-cases') F.mine = { tab: 'grv' }; };
  const page = (n, fn) => { PG[n] = fn; B.page[n] = () => { cur = n; D(); reset(n); return fn(); }; };
  const done = (msg) => { save(); B.closeModal(); rerender(); if (msg) B.toast(msg); };

  /* ---------- letter download ---------- */
  const letterHTML = (n) => `<!doctype html><meta charset="utf-8"><title>${esc(n.subject)}</title><body style="font-family:Arial,sans-serif;max-width:680px;margin:48px auto;line-height:1.65;color:#111"><h2 style="margin:0">${esc(B.COMPANY)}</h2><p style="color:#666;margin-top:2px">Human Resources</p><hr><p>Date: ${fmt(n.date)}<br>Ref: ${n.id} / ${n.caseId}</p><p>To: <b>${esc(n.emp)}</b></p><h3>${esc(n.subject)}</h3>${esc(n.body).replace(/\n/g, '<br>')}<p style="margin-top:36px">Regards,<br>Human Resources<br>${esc(B.COMPANY)}</p></body>`;
  B.act['dg-letter'] = (t) => { const n = by(D().notices, t.dataset.id); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([letterHTML(n)], { type: 'text/html' })); a.download = n.id + '-' + n.kind.toLowerCase().replace(/\s+/g, '-') + '.html'; document.body.appendChild(a); a.click(); a.remove(); B.toast('Letter downloaded'); };
  B.act['dg-view-letter'] = (t) => { const n = by(D().notices, rid(t)); B.modal({ title: esc(n.subject), wide: true, body: `<div class="cl-meta">${who(n.emp)}${pill(n.kind === 'Show-cause' ? (n.resp ? 'Responded' : 'Pending') : n.ack ? 'Acknowledged' : 'Pending')}<span>${fmt(n.date)}</span></div><div class="as-note" style="white-space:pre-line">${esc(n.body)}</div>${n.resp ? `<h4 style="margin:14px 0 6px">Employee response</h4><div class="as-note" style="white-space:pre-line">${esc(n.resp)}</div>` : ''}`, foot: `<button class="btn" data-act="dg-letter" data-id="${n.id}">${ic('download', 15)}Download</button><button class="btn primary" data-act="close-modal">Close</button>` }); };

  /* =========================== OVERVIEW =========================== */
  page('dg-dash', () => {
    const d = D(), oc = d.cases.filter(open), og = d.grvs.filter(grvOpen), up = d.hearings.filter((h) => h.status === 'Scheduled').sort((a, b) => a.date.localeCompare(b.date));
    const mx = Math.max(1, ...d.cats.map((c) => d.cases.filter((x) => x.catId === c.id).length)), mg = Math.max(1, ...d.gtypes.map((t) => d.grvs.filter((x) => x.typeId === t.id).length));
    const late = og.filter(overdue), recent = d.cases.flatMap((c) => c.timeline.map((t) => Object.assign({ c }, t))).sort((a, b) => b.d.localeCompare(a.d)).slice(0, 6);
    return `${B.head('Disciplinary & Grievance', 'Handle misconduct fairly and resolve grievances within their deadlines.', `<button class="btn" data-act="dg-new-grv">${ic('message', 15)}Log Grievance</button><button class="btn primary" data-act="dg-new-case">${ic('plus', 16)}New Case</button>`, [{ label: 'HR', href: '#/' }, { label: 'Disciplinary & Grievance' }])}
      ${kp([Kp('alert', 'Open cases', oc.length, 'warn'), Kp('message', 'Open grievances', og.length, 'warn'), Kp('calendar', 'Hearings scheduled', up.length), Kp('clock', 'Grievances past SLA', late.length, late.length ? 'bad' : ''), Kp('check-circle', 'Closed this month', d.cases.filter((c) => !open(c)).length + d.grvs.filter((g) => !grvOpen(g)).length, 'ok')])}
      ${late.length ? `<a class="card pad as-banner" href="#/page/dg-grievances">${ic('alert', 18)}<span><b>${late.length} grievance${late.length > 1 ? 's' : ''}</b> past the response deadline</span>${ic('right', 16)}</a>` : ''}
      <section class="grid-2"><div class="card pad"><h3 class="ct">Cases by category</h3><ul class="cl-cat as-bars">${d.cats.map((c) => `<li><span>${esc(c.name)}</span>${B.prog(Math.round((d.cases.filter((x) => x.catId === c.id).length / mx) * 100), '')}<b>${d.cases.filter((x) => x.catId === c.id).length}</b></li>`).join('')}</ul></div>
        <div class="card pad"><h3 class="ct">Grievances by type</h3><ul class="cl-cat as-bars">${d.gtypes.map((t) => `<li><span>${esc(t.name)}</span>${B.prog(Math.round((d.grvs.filter((x) => x.typeId === t.id).length / mg) * 100), '')}<b>${d.grvs.filter((x) => x.typeId === t.id).length}</b></li>`).join('')}</ul></div></section>
      <section class="grid-2"><div class="card pad"><div class="ct-row"><h3 class="ct">Upcoming hearings</h3><a class="link-btn" href="#/page/dg-hearings">All</a></div>${up.length ? `<ul class="feed">${up.slice(0, 4).map((h) => `<li><div><b>${esc(h.emp)}</b><span>${h.caseId} · ${fmt(h.date)} ${h.time} · ${esc(h.venue)}</span></div></li>`).join('')}</ul>` : '<div class="empty"><span>No hearings scheduled.</span></div>'}</div>
        <div class="card pad"><h3 class="ct">Recent activity</h3><ul class="as-hist">${recent.map((r) => `<li><i></i><div><b>${esc(r.t)}</b><span>${r.c.id} · ${esc(r.c.emp)} · ${fmt(r.d)}</span></div></li>`).join('')}</ul></div></section>`;
  });

  /* =========================== CASES =========================== */
  const caseRows = () => { const f = F.cases, q = (f.q || '').toLowerCase(); return D().cases.filter((c) => (!f.st || c.status === f.st) && (!f.sev || c.sev === f.sev) && (!q || (c.id + c.emp + c.title + cat(c)).toLowerCase().includes(q))).sort((a, b) => b.id.localeCompare(a.id)); };
  const caseTable = () => { const l = caseRows(); return l.length ? `<div class="tscroll"><table class="dt"><thead><tr><th>Employee</th><th>Case</th><th>Severity</th><th>Status</th><th class="r"></th></tr></thead><tbody>${l.map((c) => `<tr data-id="${c.id}"><td>${who(c.emp)}</td><td style="white-space:normal;min-width:260px"><b>${esc(c.title)}</b><em class="sub">${c.id} · ${esc(cat(c))} · ${fmt(c.incident)}</em></td><td>${pill(c.sev)}</td><td>${pill(c.status)}${c.outcome ? `<em class="sub">${esc(act(c.outcome).name)}</em>` : ''}</td><td class="r"><button class="btn sm" data-act="dgc-view">Open</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${ic('search', 34)}<b>No cases match</b></div>`; };
  const refreshCases = () => { const t = B.$('#dg-table'); if (t) t.innerHTML = caseTable(); };
  page('dg-cases', () => `${B.head('Disciplinary Cases', 'From the first report to the final decision, with a full audit trail.', `<button class="btn primary" data-act="dg-new-case">${ic('plus', 16)}New Case</button>`, crumbs('Cases'))}
    <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="dgcq" placeholder="Search case, employee, category…"></label><select class="inp sm" data-chg="dgcst"><option value="">Status: All</option>${['Reported', 'Show-cause issued', 'Response received', 'Hearing scheduled', 'Closed', 'Dismissed', 'Appealed'].map((s) => `<option>${s}</option>`).join('')}</select><select class="inp sm" data-chg="dgcsev"><option value="">Severity: All</option>${SEV.map((s) => `<option>${s}</option>`).join('')}</select></div>
    <div class="card table-card" id="dg-table">${caseTable()}</div>`);
  B.inp.dgcq = (t) => { F.cases.q = t.value; refreshCases(); }; B.chg.dgcst = (t) => { F.cases.st = t.value; refreshCases(); }; B.chg.dgcsev = (t) => { F.cases.sev = t.value; refreshCases(); };

  B.act['dg-new-case'] = () => { const d = D(); B.modal({ title: 'New Disciplinary Case', wide: true, body: grid(field('Employee', empSel('dgm-e'), 1) + field('Category', sel('dgm-c', d.cats, d.cats[0].id)) + field('Severity', sel('dgm-s', SEV, d.cats[0].sev)) + field('Incident date', `<input type="date" class="inp" id="dgm-d" value="${today()}">`) + field('Proposed action', sel('dgm-p', d.acts.map((a) => a.name), 'Written warning')) + field('Title', '<input class="inp" id="dgm-t" placeholder="Short description of the incident">', 1) + field('Details', '<textarea class="inp" id="dgm-n" rows="3" placeholder="Facts, dates and witnesses"></textarea>', 1) + '<label class="chk-row" style="grid-column:1/-1"><input type="checkbox" id="dgm-sc" checked>Issue a show-cause notice to the employee now</label>'), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="dg-save-case">Open case</button>' }); B.$('#dgm-c').onchange = (e) => { B.$('#dgm-s').value = by(D().cats, e.target.value).sev; }; };
  B.act['dg-save-case'] = () => {
    const title = B.$('#dgm-t').value.trim(); if (!title) { B.toast('Please add a title', 'bad'); return; }
    const c = newCase({ emp: B.$('#dgm-e').value, catId: B.$('#dgm-c').value, sev: B.$('#dgm-s').value, title, desc: B.$('#dgm-n').value.trim() || title, incident: B.$('#dgm-d').value || today(), proposed: B.$('#dgm-p').value });
    if (B.$('#dgm-sc').checked) issueShowCause(c, day(3)); done('Case ' + c.id + ' opened' + (c.step ? ', show-cause sent' : ''));
  };

  /* ---------- case detail ---------- */
  const trk = (s, dismissed) => `<ol class="cl-trk">${STEPS.map((x, i) => `<li class="${i < s || (s === 4 && !dismissed) ? 'done' : ''} ${i === s && s < 4 ? 'now' : ''}"><i>${i < s || (s === 4 && !dismissed) ? ic('check', 12) : i + 1}</i><span>${x}</span></li>`).join('')}</ol>`;
  const caseView = (id) => {
    const c = by(D().cases, id), hs = D().hearings.filter((h) => h.caseId === id), ns = D().notices.filter((n) => n.caseId === id), st = c.status;
    const btn = (a, l, p) => `<button class="btn ${p ? 'primary' : ''}" data-act="${a}" data-id="${id}">${l}</button>`;
    const acts = st === 'Reported' ? btn('dgc-dismiss', 'Dismiss') + btn('dgc-showcause', 'Issue show-cause', 1)
      : st === 'Show-cause issued' ? btn('dgc-dismiss', 'Dismiss') + btn('dgc-response', 'Record response', 1)
      : st === 'Response received' ? btn('dgc-dismiss', 'Dismiss') + btn('dgc-hearing', 'Schedule hearing') + btn('dgc-decide', 'Record decision', 1)
      : st === 'Hearing scheduled' ? btn('dgc-dismiss', 'Dismiss') + btn('dgc-hearing', 'Reschedule') + btn('dgc-decide', 'Record decision', 1)
      : st === 'Appealed' ? btn('dgc-uphold', 'Uphold decision') + btn('dgc-revoke', 'Revoke decision', 1) : '<button class="btn primary" data-act="close-modal">Close</button>';
    B.modal({ title: `${c.id} · ${esc(c.title)}`, wide: true, body: `<div class="cl-meta">${who(c.emp)}${pill(c.sev)}${pill(st)}<span>${esc(cat(c))} · incident ${fmt(c.incident)}</span></div>${trk(c.step, st === 'Dismissed')}
      <dl class="kv as-kv"><div><dt>Proposed action</dt><dd>${esc(c.proposed)}</dd></div><div><dt>Outcome</dt><dd>${c.outcome ? esc(act(c.outcome).name) + ' · effective ' + fmt(c.effective) : '—'}</dd></div></dl><p class="as-note">${esc(c.desc)}</p>
      ${c.response ? `<h4 style="margin:14px 0 6px">Employee response · ${fmt(c.response.date)}</h4><div class="as-note" style="white-space:pre-line">${esc(c.response.text)}</div>` : ''}
      ${c.appeal ? `<div class="as-issue">${ic('alert', 15)}<span><b>Appeal · ${fmt(c.appeal.date)}:</b> ${esc(c.appeal.text)}</span></div>` : ''}
      ${hs.length ? `<h4 style="margin:14px 0 6px">Hearings</h4><ul class="as-hist">${hs.map((h) => `<li><i></i><div><b>${fmt(h.date)} ${h.time} · ${esc(h.venue)} ${pill(h.status)}</b><span>${esc(h.panel)}${h.minutes ? ' · Minutes: ' + esc(h.minutes) : ''}</span></div></li>`).join('')}</ul>` : ''}
      ${ns.length ? `<h4 style="margin:14px 0 6px">Letters</h4><ul class="as-hist">${ns.map((n) => `<li><i></i><div><b>${esc(n.subject)}</b><span>${fmt(n.date)} · <a class="link-btn" data-act="dg-view-letter" data-id="${n.id}">View</a></span></div></li>`).join('')}</ul>` : ''}
      <h4 style="margin:14px 0 6px">Timeline</h4><ul class="as-hist">${c.timeline.slice().reverse().map((t) => `<li><i></i><div><b>${esc(t.t)}</b><span>${fmt(t.d)} · ${esc(t.by)}</span></div></li>`).join('')}</ul>`, foot: acts });
  };
  B.act['dgc-view'] = (t) => caseView(rid(t));
  const sub = (title, body, act, id, label) => B.modal({ title, body, foot: `<button class="btn" data-act="dgc-back" data-id="${id}">Back</button><button class="btn primary" data-act="${act}" data-id="${id}">${label}</button>` });
  B.act['dgc-back'] = (t) => caseView(t.dataset.id);
  B.act['dgc-showcause'] = (t) => sub('Issue show-cause notice', grid(field('Reply due by', `<input type="date" class="inp" id="dgm-due" value="${day(3)}">`) + field('Additional note', '<textarea class="inp" id="dgm-n" rows="3"></textarea>', 1)), 'dgc-do-showcause', t.dataset.id, 'Issue notice');
  B.act['dgc-do-showcause'] = (t) => { const c = by(D().cases, t.dataset.id); issueShowCause(c, B.$('#dgm-due').value || day(3), B.$('#dgm-n').value.trim()); done('Show-cause notice issued'); };
  B.act['dgc-response'] = (t) => sub('Record employee response', field('Response received from the employee', '<textarea class="inp" id="dgm-n" rows="4"></textarea>'), 'dgc-do-response', t.dataset.id, 'Save');
  B.act['dgc-do-response'] = (t) => { const v = B.$('#dgm-n').value.trim(); if (!v) { B.toast('Enter the response', 'bad'); return; } const c = by(D().cases, t.dataset.id); c.response = { text: v, date: today() }; Object.assign(c, { status: 'Response received', step: 2 }); tl(c, 'Employee response recorded'); done('Response recorded'); };
  B.act['dgc-hearing'] = (t) => sub('Schedule hearing', grid(field('Date', `<input type="date" class="inp" id="dgm-d" value="${day(3)}">`) + field('Time', '<input type="time" class="inp" id="dgm-tm" value="11:00">') + field('Venue', '<input class="inp" id="dgm-v" value="Conference Room B">', 1) + field('Panel', '<input class="inp" id="dgm-pn" value="Fatema Khatun (HR), Rahim Uddin (MD)">', 1)), 'dgc-do-hearing', t.dataset.id, 'Schedule & invite');
  B.act['dgc-do-hearing'] = (t) => {
    const c = by(D().cases, t.dataset.id); D().hearings.filter((h) => h.caseId === c.id && h.status === 'Scheduled').forEach((h) => { h.status = 'Cancelled'; });
    const h = { id: next('hr', 'HG'), caseId: c.id, emp: c.emp, date: B.$('#dgm-d').value, time: B.$('#dgm-tm').value, venue: B.$('#dgm-v').value.trim(), panel: B.$('#dgm-pn').value.trim(), status: 'Scheduled', minutes: '' }; D().hearings.push(h);
    Object.assign(c, { status: 'Hearing scheduled', step: 3 }); tl(c, 'Hearing scheduled for ' + fmt(h.date)); addNotice('Hearing invite', c, 'Hearing invitation · ' + c.id, `You are invited to a disciplinary hearing on ${fmt(h.date)} at ${h.time} in ${h.venue}. Panel: ${h.panel}. You may bring a colleague for support.`); done('Hearing scheduled, invitation sent');
  };
  B.act['dgc-decide'] = (t) => sub('Record decision', grid(field('Outcome', `<select class="inp" id="dgm-o"><option value="">No action</option>${D().acts.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select>`) + field('Effective from', `<input type="date" class="inp" id="dgm-d" value="${today()}">`) + field('Findings and reasoning', '<textarea class="inp" id="dgm-n" rows="3"></textarea>', 1)), 'dgc-do-decide', t.dataset.id, 'Save decision');
  B.act['dgc-do-decide'] = (t) => {
    const c = by(D().cases, t.dataset.id), o = B.$('#dgm-o').value, eff = B.$('#dgm-d').value || today(), f = B.$('#dgm-n').value.trim();
    if (!f) { B.toast('Add the findings', 'bad'); return; }
    D().hearings.filter((h) => h.caseId === c.id && h.status === 'Scheduled').forEach((h) => { h.status = 'Held'; });
    if (o) closeCase(c, o, eff, f); else { Object.assign(c, { status: 'Closed', step: 4, outcome: '', effective: eff, findings: f }); tl(c, 'Decision: No action'); const n = addNotice('Decision', c, 'Outcome · ' + c.id, `After reviewing the case (${c.title}), no disciplinary action will be taken.\n\n${f}`); n.date = eff; }
    delete c.notice; done('Decision recorded, letter generated');
  };
  B.act['dgc-dismiss'] = (t) => sub('Dismiss case', field('Reason', '<textarea class="inp" id="dgm-n" rows="3"></textarea>'), 'dgc-do-dismiss', t.dataset.id, 'Dismiss');
  B.act['dgc-do-dismiss'] = (t) => { const v = B.$('#dgm-n').value.trim(); if (!v) { B.toast('Add a reason', 'bad'); return; } const c = by(D().cases, t.dataset.id); Object.assign(c, { status: 'Dismissed', step: 4, findings: v }); tl(c, 'Case dismissed: ' + v); done('Case dismissed'); };
  B.act['dgc-uphold'] = (t) => { const c = by(D().cases, t.dataset.id); c.status = 'Closed'; c.appeal.status = 'Upheld'; tl(c, 'Appeal rejected, decision upheld'); done('Decision upheld'); };
  B.act['dgc-revoke'] = (t) => { const c = by(D().cases, t.dataset.id); c.status = 'Closed'; c.appeal.status = 'Revoked'; c.outcome = ''; tl(c, 'Appeal accepted, decision revoked'); done('Decision revoked'); };

  /* =========================== GRIEVANCES =========================== */
  const grvRows = () => { const f = F.grv, q = (f.q || '').toLowerCase(); return D().grvs.filter((g) => (!f.st || g.status === f.st) && (!f.type || g.typeId === f.type) && (!q || (g.id + g.emp + g.subject).toLowerCase().includes(q))).sort((a, b) => b.id.localeCompare(a.id)); };
  const grvTable = () => { const l = grvRows(); return l.length ? `<div class="tscroll"><table class="dt"><thead><tr><th>Raised by</th><th>Grievance</th><th>Assigned to</th><th>Due</th><th>Priority</th><th>Status</th><th class="r"></th></tr></thead><tbody>${l.map((g) => `<tr data-id="${g.id}"><td>${g.anon ? '<span class="as-none">Anonymous</span>' : who(g.emp)}</td><td style="white-space:normal;min-width:240px"><b>${esc(g.subject)}</b><em class="sub">${g.id} · ${esc((by(D().gtypes, g.typeId) || {}).name)} · ${fmt(g.date)}</em></td><td>${esc(g.assignee)}</td><td>${grvOpen(g) ? fmt(g.due) + (overdue(g) ? ' <span class="pill bad"><i></i>Overdue</span>' : '') : '—'}</td><td>${pill(g.priority)}</td><td>${pill(g.status)}</td><td class="r"><button class="btn sm" data-act="dgg-view">Open</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${ic('search', 34)}<b>No grievances match</b></div>`; };
  const refreshGrv = () => { const t = B.$('#dg-table'); if (t) t.innerHTML = grvTable(); };
  page('dg-grievances', () => `${B.head('Grievances', 'Employee concerns with a response deadline based on type and priority.', `<button class="btn primary" data-act="dg-new-grv">${ic('plus', 16)}Log Grievance</button>`, crumbs('Grievances'))}
    ${kp([Kp('message', 'Open', D().grvs.filter((g) => g.status === 'Open').length, 'warn'), Kp('activity', 'Investigating', D().grvs.filter((g) => g.status === 'Investigating').length), Kp('clock', 'Past deadline', D().grvs.filter(overdue).length, D().grvs.some(overdue) ? 'bad' : ''), Kp('check-circle', 'Resolved', D().grvs.filter((g) => g.status === 'Resolved').length, 'ok')])}
    <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="dggq" placeholder="Search grievance or employee…"></label><select class="inp sm" data-chg="dggst"><option value="">Status: All</option>${['Open', 'Investigating', 'Resolved', 'Dismissed'].map((s) => `<option>${s}</option>`).join('')}</select><select class="inp sm" data-chg="dggty"><option value="">Type: All</option>${D().gtypes.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></div>
    <div class="card table-card" id="dg-table">${grvTable()}</div>`);
  B.inp.dggq = (t) => { F.grv.q = t.value; refreshGrv(); }; B.chg.dggst = (t) => { F.grv.st = t.value; refreshGrv(); }; B.chg.dggty = (t) => { F.grv.type = t.value; refreshGrv(); };

  const grvForm = (admin) => grid((admin ? field('Raised by', empSel('dgg-e'), 1) : '') + field('Type', sel('dgg-t', D().gtypes, 'g1')) + field('Priority', sel('dgg-p', PRI, 'Medium')) + field('Subject', '<input class="inp" id="dgg-s" placeholder="Short summary">', 1) + field('Details', '<textarea class="inp" id="dgg-d" rows="4" placeholder="What happened, when and who was involved?"></textarea>', 1) + `<label class="chk-row" style="grid-column:1/-1"><input type="checkbox" id="dgg-a">Submit anonymously (HR will not see the name)</label>`);
  B.act['dg-new-grv'] = () => B.modal({ title: 'Log a Grievance', wide: true, body: grvForm(true), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="dg-save-grv" data-admin="1">Log</button>' });
  B.act['mc-new'] = () => B.modal({ title: 'Raise a Grievance', wide: true, body: grvForm(false) + `<p class="cl-hint">${ic('lock', 14)} Grievances are handled confidentially by HR. You can follow progress and reply here.</p>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="dg-save-grv">Submit</button>' });
  B.act['dg-save-grv'] = (t) => {
    const subj = B.$('#dgg-s').value.trim(), det = B.$('#dgg-d').value.trim(); if (!subj || !det) { B.toast('Subject and details are required', 'bad'); return; }
    const ty = by(D().gtypes, B.$('#dgg-t').value), p = B.$('#dgg-p').value, anon = B.$('#dgg-a').checked, emp = t.dataset.admin ? B.$('#dgg-e').value : me().name;
    const g = { id: next('gr', 'GR'), emp, anon, typeId: ty.id, subject: subj, details: det, priority: p, date: today(), due: day(Math.min(ty.sla, SLA_BY_PRI[p])), status: 'Open', assignee: ty.owner, thread: [{ by: anon ? 'Anonymous' : emp, role: 'emp', d: today(), text: det }], resolution: '' };
    D().grvs.push(g); done(g.id + ' submitted. Assigned to ' + ty.owner);
  };
  const thread = (g, viewerHR) => `<ul class="dg-thread">${g.thread.filter((m) => viewerHR || !m.internal).map((m) => `<li class="${m.role === 'hr' ? 'hr' : ''} ${m.internal ? 'int' : ''}"><b>${esc(m.by)}${m.internal ? ' · internal note' : ''}</b><span>${fmt(m.d)}</span><p>${esc(m.text)}</p></li>`).join('')}</ul>`;
  const grvView = (id, hr) => {
    const g = by(D().grvs, id), op = grvOpen(g), st = { Open: 0, Investigating: 1, Resolved: 2, Dismissed: 2 }[g.status];
    const btn = (a, l, p) => `<button class="btn ${p ? 'primary' : ''}" data-act="${a}" data-id="${id}">${l}</button>`;
    const foot = hr ? (op ? btn('dgg-assign', 'Reassign') + btn('dgg-escalate', 'Escalate') + (g.status === 'Open' ? btn('dgg-start', 'Start investigating') : '') + btn('dgg-close', 'Resolve / dismiss', 1) : btn('dgg-reopen', 'Reopen')) : (op ? btn('mc-send', 'Send reply', 1) : btn('dgg-reopen', 'Reopen'));
    B.modal({ title: `${g.id} · ${esc(g.subject)}`, wide: true, body: `<div class="cl-meta">${g.anon && !hr ? who(g.emp) + '<span class="pill mute"><i></i>Anonymous</span>' : g.anon ? '<span class="as-none">Anonymous</span>' : who(g.emp)}${pill(g.status)}${pill(g.priority)}<span>${esc((by(D().gtypes, g.typeId) || {}).name)} · ${fmt(g.date)}</span></div>
      <ol class="cl-trk">${['Raised', 'Investigating', g.status === 'Dismissed' ? 'Dismissed' : 'Resolved'].map((x, i) => `<li class="${i < st || (st === 2 && i === 2) ? 'done' : ''} ${i === st && st < 2 ? 'now' : ''}"><i>${i < st || (st === 2 && i === 2) ? ic('check', 12) : i + 1}</i><span>${x}</span></li>`).join('')}</ol>
      <dl class="kv as-kv"><div><dt>Assigned to</dt><dd>${esc(g.assignee)}</dd></div><div><dt>Response due</dt><dd>${op ? fmt(g.due) + (overdue(g) ? ' <span class="pill bad"><i></i>Overdue</span>' : '') : '—'}</dd></div></dl>
      ${g.resolution ? `<div class="as-note"><b>Resolution:</b> ${esc(g.resolution)}</div>` : ''}<h4 style="margin:14px 0 6px">Conversation</h4>${thread(g, hr)}
      ${op ? `<div style="margin-top:12px">${field(hr ? 'Reply or internal note' : 'Add a reply', `<textarea class="inp" id="dgg-r" rows="2" placeholder="${hr ? 'Visible to the employee unless marked internal' : 'Add more information or answer HR'}"></textarea>`)}${hr ? '<label class="chk-row" style="margin-top:8px"><input type="checkbox" id="dgg-int">Internal note (hidden from the employee)</label>' : ''}${hr ? `<button class="btn sm" style="margin-top:8px" data-act="dgg-reply" data-id="${id}">Post</button>` : ''}</div>` : ''}`, foot });
  };
  B.act['dgg-view'] = (t) => grvView(rid(t), true);
  B.act['mc-open'] = (t) => grvView(rid(t), false);
  B.act['dgg-reply'] = (t) => { const v = B.$('#dgg-r').value.trim(); if (!v) return; const g = by(D().grvs, t.dataset.id); g.thread.push({ by: me().name === 'Rahim Uddin' ? g.assignee : g.assignee, role: 'hr', d: today(), text: v, internal: !!(B.$('#dgg-int') || {}).checked }); save(); grvView(g.id, true); B.toast('Posted'); };
  B.act['mc-send'] = (t) => { const v = B.$('#dgg-r').value.trim(); if (!v) { B.toast('Write a reply first', 'bad'); return; } const g = by(D().grvs, t.dataset.id); g.thread.push({ by: g.anon ? 'Anonymous' : me().name, role: 'emp', d: today(), text: v }); save(); grvView(g.id, false); B.toast('Reply sent to HR'); };
  B.act['dgg-start'] = (t) => { const g = by(D().grvs, t.dataset.id); g.status = 'Investigating'; g.thread.push({ by: g.assignee, role: 'hr', d: today(), text: 'We have started looking into this.' }); done('Investigation started'); };
  B.act['dgg-assign'] = (t) => sub2('Reassign', field('Assign to', sel('dgm-a', HR, by(D().grvs, t.dataset.id).assignee)), 'dgg-do-assign', t.dataset.id, 'Reassign');
  const sub2 = (title, body, act, id, label) => B.modal({ title, body, foot: `<button class="btn" data-act="dgg-back" data-id="${id}">Back</button><button class="btn primary" data-act="${act}" data-id="${id}">${label}</button>` });
  B.act['dgg-back'] = (t) => grvView(t.dataset.id, true);
  B.act['dgg-do-assign'] = (t) => { const g = by(D().grvs, t.dataset.id); g.assignee = B.$('#dgm-a').value; g.thread.push({ by: 'HR', role: 'hr', d: today(), text: 'Reassigned to ' + g.assignee, internal: true }); done('Reassigned'); };
  B.act['dgg-escalate'] = (t) => { const g = by(D().grvs, t.dataset.id); g.priority = 'High'; g.due = day(2); g.thread.push({ by: 'HR', role: 'hr', d: today(), text: 'Escalated to high priority', internal: true }); done('Escalated, due in 2 days'); };
  B.act['dgg-close'] = (t) => sub2('Resolve or dismiss', field('Outcome', '<select class="inp" id="dgm-o"><option>Resolved</option><option>Dismissed</option></select>') + `<div style="height:10px"></div>` + field('Resolution / reason (visible to the employee)', '<textarea class="inp" id="dgm-n" rows="3"></textarea>'), 'dgg-do-close', t.dataset.id, 'Close grievance');
  B.act['dgg-do-close'] = (t) => { const v = B.$('#dgm-n').value.trim(); if (!v) { B.toast('Add a resolution note', 'bad'); return; } const g = by(D().grvs, t.dataset.id); g.status = B.$('#dgm-o').value; g.resolution = v; g.thread.push({ by: g.assignee, role: 'hr', d: today(), text: g.status + ': ' + v }); done('Grievance ' + g.status.toLowerCase()); };
  B.act['dgg-reopen'] = (t) => { const g = by(D().grvs, t.dataset.id); g.status = 'Open'; g.resolution = ''; g.due = day(3); g.thread.push({ by: B.role === 'employee' ? me().name : g.assignee, role: B.role === 'employee' ? 'emp' : 'hr', d: today(), text: 'Reopened' }); done('Grievance reopened'); };

  /* =========================== HEARINGS =========================== */
  page('dg-hearings', () => {
    const d = D(), up = F.hear.tab === 'up', l = d.hearings.filter((h) => (h.status === 'Scheduled') === up).sort((a, b) => (up ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));
    return `${B.head('Hearings', 'Disciplinary hearing schedule and minutes.', '', crumbs('Hearings'))}
      ${kp([Kp('calendar', 'Upcoming', d.hearings.filter((h) => h.status === 'Scheduled').length), Kp('check-circle', 'Held', d.hearings.filter((h) => h.status === 'Held').length, 'ok'), Kp('x', 'Cancelled', d.hearings.filter((h) => h.status === 'Cancelled').length)])}
      <div class="filterbar">${tabs([['up', 'Upcoming'], ['past', 'Past']], F.hear.tab, 'dgh-tab')}</div>
      <div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>When</th><th>Employee</th><th>Case</th><th>Panel</th><th>Status</th><th class="r"></th></tr></thead><tbody>${l.length ? l.map((h) => `<tr data-id="${h.id}"><td><b>${fmt(h.date)}</b><em class="sub">${h.time} · ${esc(h.venue)}</em></td><td>${who(h.emp)}</td><td>${h.caseId}<em class="sub">${esc((by(d.cases, h.caseId) || {}).title || '')}</em></td><td style="white-space:normal;min-width:180px">${esc(h.panel)}</td><td>${pill(h.status)}</td><td class="r">${h.status === 'Scheduled' ? '<button class="btn sm" data-act="dgh-held">Mark held</button> <button class="btn sm" data-act="dgh-cancel">Cancel</button>' : `<button class="btn sm" data-act="dgc-view" data-id="${h.caseId}">Case</button>`}</td></tr>`).join('') : '<tr><td colspan="6"><div class="empty"><span>Nothing here.</span></div></td></tr>'}</tbody></table></div></div>`;
  });
  B.act['dgh-tab'] = (t) => { F.hear.tab = t.dataset.t; rerender(); };
  B.act['dgh-held'] = (t) => B.modal({ title: 'Hearing minutes', body: field('Summary of the hearing', '<textarea class="inp" id="dgm-n" rows="4" placeholder="Key points raised, statements and outcome"></textarea>'), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="dgh-do-held" data-id="${rid(t)}">Save minutes</button>` });
  B.act['dgh-do-held'] = (t) => { const h = by(D().hearings, t.dataset.id), c = by(D().cases, h.caseId); h.status = 'Held'; h.minutes = B.$('#dgm-n').value.trim(); tl(c, 'Hearing held'); done('Minutes saved. Record the decision from the case'); };
  B.act['dgh-cancel'] = (t) => { const h = by(D().hearings, rid(t)); h.status = 'Cancelled'; tl(by(D().cases, h.caseId), 'Hearing cancelled'); done('Hearing cancelled'); };

  /* =========================== NOTICES & LETTERS =========================== */
  page('dg-notices', () => {
    const l = D().notices.slice().reverse();
    return `${B.head('Notices & Letters', 'Every show-cause notice, hearing invitation, warning and decision letter.', '', crumbs('Notices & Letters'))}
      ${kp([Kp('inbox', 'Awaiting reply', D().notices.filter((n) => n.kind === 'Show-cause' && !n.resp).length, 'warn'), Kp('eye', 'Not acknowledged', D().notices.filter((n) => n.kind !== 'Show-cause' && !n.ack).length, 'warn'), Kp('award', 'Active warnings', D().cases.filter(warnActive).length), Kp('file', 'Total letters', l.length)])}
      <div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Letter</th><th>Employee</th><th>Date</th><th>Status</th><th class="r"></th></tr></thead><tbody>${l.map((n) => `<tr data-id="${n.id}"><td><b>${esc(n.subject)}</b><em class="sub">${n.id} · ${n.kind}</em></td><td>${who(n.emp)}</td><td>${fmt(n.date)}</td><td>${pill(n.kind === 'Show-cause' ? (n.resp ? 'Responded' : 'Pending') : n.ack ? 'Acknowledged' : 'Pending')}${n.kind === 'Show-cause' && !n.resp && n.due ? `<em class="sub">Due ${fmt(n.due)}${n.due < today() ? ' · overdue' : ''}</em>` : ''}</td><td class="r"><button class="btn sm" data-act="dg-view-letter">View</button> <button class="icon-btn sm" data-act="dg-letter" data-id="${n.id}" aria-label="Download">${ic('download', 15)}</button></td></tr>`).join('')}</tbody></table></div></div>`;
  });

  /* =========================== SETUP =========================== */
  const M = {
    cats: { label: 'Offence categories', one: 'Category', list: 'cats', used: (x) => D().cases.filter((c) => c.catId === x.id).length, fields: [['name', 'Category name', 'text'], ['sev', 'Default severity', 'select', SEV]], row: (x) => [`<b>${esc(x.name)}</b>`, pill(x.sev)], heads: ['Category', 'Default severity'] },
    acts: { label: 'Action types', one: 'Action', list: 'acts', used: (x) => D().cases.filter((c) => c.outcome === x.id).length, fields: [['name', 'Action name', 'text'], ['rank', 'Severity order (1 = lightest)', 'number'], ['validity', 'Stays on record (months, 0 = permanent)', 'number']], row: (x) => [`<b>${esc(x.name)}</b>`, x.rank, x.validity ? x.validity + ' months' : 'Permanent'], heads: ['Action', 'Order', 'On record for'] },
    gtypes: { label: 'Grievance types', one: 'Grievance type', list: 'gtypes', used: (x) => D().grvs.filter((g) => g.typeId === x.id).length, fields: [['name', 'Type name', 'text'], ['sla', 'Response deadline (days)', 'number'], ['owner', 'Default owner', 'select', HR]], row: (x) => [`<b>${esc(x.name)}</b>`, x.sla + ' days', esc(x.owner)], heads: ['Type', 'Deadline', 'Default owner'] }
  };
  page('dg-setup', () => { const m = M[F.setup.tab], l = D()[m.list]; return `${B.head('Disciplinary Setup', 'Lists used when opening cases and logging grievances.', `<button class="btn primary" data-act="dgs-new">${ic('plus', 16)}New ${m.one}</button>`, crumbs('Setup'))}<div class="filterbar">${tabs(Object.keys(M).map((k) => [k, M[k].label]), F.setup.tab, 'dgs-tab')}</div><div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr>${m.heads.map((h) => `<th>${h}</th>`).join('')}<th class="r">In use</th><th class="r"></th></tr></thead><tbody>${l.map((x) => `<tr data-id="${x.id}">${m.row(x).map((c) => `<td>${c}</td>`).join('')}<td class="r">${m.used(x)}</td><td class="r"><button class="icon-btn sm" data-act="dgs-edit" aria-label="Edit">${ic('edit', 15)}</button><button class="icon-btn sm" data-act="dgs-del" aria-label="Delete">${ic('trash', 15)}</button></td></tr>`).join('')}</tbody></table></div></div>`; });
  B.act['dgs-tab'] = (t) => { F.setup.tab = t.dataset.t; rerender(); };
  const mForm = (m, x) => grid(m.fields.map((f) => { const v = x[f[0]] == null ? '' : x[f[0]], id = 'dgs-' + f[0]; return f[2] === 'select' ? field(f[1], `<select class="inp" id="${id}">${f[3].map((o) => `<option ${v === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`) : field(f[1], `<input class="inp" id="${id}" type="${f[2]}" value="${esc(v)}">`, f[0] === 'name'); }).join(''));
  B.act['dgs-new'] = () => { const m = M[F.setup.tab]; B.modal({ title: 'New ' + m.one, body: mForm(m, { sev: 'Minor', sla: 7, rank: D()[m.list].length + 1, validity: 6, owner: HR[0] }), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="dgs-save" data-id="">Save</button>' }); };
  B.act['dgs-edit'] = (t) => { const m = M[F.setup.tab], x = by(D()[m.list], rid(t)); B.modal({ title: 'Edit ' + m.one, body: mForm(m, x), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="dgs-save" data-id="${x.id}">Save</button>` }); };
  B.act['dgs-save'] = (t) => { const m = M[F.setup.tab], v = {}; m.fields.forEach((f) => { const e = B.$('#dgs-' + f[0]); v[f[0]] = f[2] === 'number' ? +e.value || 0 : e.value.trim(); }); if (!v.name) { B.toast('Name is required', 'bad'); return; } const x = t.dataset.id && by(D()[m.list], t.dataset.id); if (x) Object.assign(x, v); else D()[m.list].push(Object.assign({ id: uid(m.list[0]) }, v)); done(m.one + (x ? ' updated' : ' added')); };
  B.act['dgs-del'] = (t) => { const m = M[F.setup.tab], x = by(D()[m.list], rid(t)); if (m.used(x)) { B.toast(`In use by ${m.used(x)} record(s)`, 'bad'); return; } db[m.list] = D()[m.list].filter((y) => y !== x); done(m.one + ' deleted'); };

  /* =========================== EMPLOYEE: MY GRIEVANCES & NOTICES =========================== */
  page('my-cases', () => {
    const d = D(), n = me().name, mg = d.grvs.filter((g) => g.emp === n).slice().reverse(), mn = d.notices.filter((x) => x.emp === n).slice().reverse(), pend = mn.filter((x) => (x.kind === 'Show-cause' ? !x.resp : !x.ack)).length, aw = d.cases.filter((c) => c.emp === n && warnActive(c)).length;
    const body = F.mine.tab === 'notices' ? (mn.length ? `<div class="cl-queue">${mn.map((x) => { const c = by(d.cases, x.caseId), need = x.kind === 'Show-cause' ? !x.resp : !x.ack, can = c && c.status === 'Closed' && c.outcome && !c.appeal && x.kind !== 'Hearing invite' && day(7, x.date) >= today();
      return `<div class="card pad" data-id="${x.id}"><div class="as-top"><span class="as-ic">${ic(x.kind === 'Show-cause' ? 'alert' : x.kind === 'Hearing invite' ? 'calendar' : 'file', 20)}</span><div><b>${esc(x.subject)}</b><span>${x.kind} · ${fmt(x.date)}${x.kind === 'Show-cause' && !x.resp ? ' · reply by ' + fmt(x.due) : ''}</span></div>${pill(x.kind === 'Show-cause' ? (x.resp ? 'Responded' : 'Pending') : x.ack ? 'Acknowledged' : 'Pending')}</div><div class="as-note" style="white-space:pre-line">${esc(x.body)}</div>
        <div class="as-act"><button class="btn sm" data-act="dg-letter" data-id="${x.id}">${ic('download', 14)}Download</button><span class="grow"></span>${can ? '<button class="btn sm" data-act="mc-appeal">Appeal</button>' : ''}${x.kind === 'Show-cause' ? (x.resp ? '' : '<button class="btn sm primary" data-act="mc-reply">Submit response</button>') : (x.ack ? '' : '<button class="btn sm primary" data-act="mc-ack">Acknowledge</button>')}</div></div>`; }).join('')}</div>` : `<div class="card pad empty">${ic('check-circle', 34)}<b>No notices</b><span>You have no disciplinary notices.</span></div>`)
      : (mg.length ? `<div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Grievance</th><th>Assigned to</th><th>Status</th><th class="r"></th></tr></thead><tbody>${mg.map((g) => `<tr data-id="${g.id}"><td style="white-space:normal;min-width:240px"><b>${esc(g.subject)}</b><em class="sub">${g.id} · ${esc((by(d.gtypes, g.typeId) || {}).name)} · ${fmt(g.date)}${g.anon ? ' · anonymous' : ''}</em></td><td>${esc(g.assignee)}</td><td>${pill(g.status)}</td><td class="r"><button class="btn sm" data-act="mc-open">Open</button></td></tr>`).join('')}</tbody></table></div></div>` : `<div class="card pad empty">${ic('message', 34)}<b>No grievances</b><span>Raise one if something is wrong.</span></div>`);
    return `${B.head('My Grievances & Notices', 'Raise a concern confidentially and respond to notices from HR.', `<button class="btn primary" data-act="mc-new">${ic('plus', 16)}Raise a Grievance</button>`, [{ label: 'HR', href: '#/' }, { label: 'Grievances & Notices' }])}
      ${kp([Kp('message', 'Open grievances', mg.filter(grvOpen).length, 'warn'), Kp('check-circle', 'Resolved', mg.filter((g) => g.status === 'Resolved').length, 'ok'), Kp('alert', 'Notices needing action', pend, pend ? 'bad' : ''), Kp('award', 'Active warnings', aw, aw ? 'warn' : '')])}
      <div class="filterbar">${tabs([['grv', 'My grievances (' + mg.length + ')'], ['notices', 'Notices to me (' + mn.length + ')']], F.mine.tab, 'mc-tab')}</div>${body}`;
  });
  B.act['mc-tab'] = (t) => { F.mine.tab = t.dataset.t; rerender(); };
  B.act['mc-reply'] = (t) => B.modal({ title: 'Respond to show-cause notice', body: field('Your explanation', '<textarea class="inp" id="dgm-n" rows="5" placeholder="Explain what happened and any supporting facts"></textarea>') + '<label class="chk-row" style="margin-top:12px"><input type="checkbox" id="dgm-ok">I confirm this response is accurate</label>', foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="mc-do-reply" data-id="${rid(t)}">Submit response</button>` });
  B.act['mc-do-reply'] = (t) => { const v = B.$('#dgm-n').value.trim(); if (!v || !B.$('#dgm-ok').checked) { B.toast('Write your response and confirm it', 'bad'); return; } const n = by(D().notices, t.dataset.id), c = by(D().cases, n.caseId); n.resp = v; c.response = { text: v, date: today() }; Object.assign(c, { status: 'Response received', step: 2 }); tl(c, 'Employee submitted a response'); done('Response submitted to HR'); };
  B.act['mc-ack'] = (t) => { const n = by(D().notices, rid(t)); n.ack = true; const c = by(D().cases, n.caseId); if (c) tl(c, 'Letter acknowledged: ' + n.kind); done('Acknowledged'); };
  B.act['mc-appeal'] = (t) => B.modal({ title: 'Appeal this decision', body: field('Grounds for appeal', '<textarea class="inp" id="dgm-n" rows="4" placeholder="Why should the decision be reviewed?"></textarea>') + `<p class="cl-hint">${ic('alert', 14)} Appeals must be filed within 7 days of the decision.</p>`, foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="mc-do-appeal" data-id="${rid(t)}">Submit appeal</button>` });
  B.act['mc-do-appeal'] = (t) => { const v = B.$('#dgm-n').value.trim(); if (!v) { B.toast('Add your grounds', 'bad'); return; } const n = by(D().notices, t.dataset.id), c = by(D().cases, n.caseId); c.appeal = { text: v, date: today(), status: 'Pending' }; c.status = 'Appealed'; tl(c, 'Employee appealed the decision'); done('Appeal submitted'); };
})();
