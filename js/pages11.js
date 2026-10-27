/* Bijoy HRMS — Process pages that follow the HR requirements document:
   Approval chains (shared engine), Hiring requisitions + hiring process, Leave approvals,
   Rosters + late rules, Office attendance (Tip Soi + ZKTeco) and WFH open dates.
   Data lives in the browser (localStorage), same pattern as the Work From Home module. */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const KEY = 'bijoy-flow-db-v1';
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const day = (n, from) => { const d = from ? new Date(from + 'T00:00') : new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const fmtS = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—');
  const isFri = (d) => new Date(d + 'T00:00').getDay() === 5;
  const me = () => (B.role === 'employee' ? B.ME : B.ADMIN_EMP);
  const isHR = () => B.role !== 'employee';
  const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 99);
  const who = (n) => `<span class="as-who">${B.avatar(n, 26)}<span>${esc(n)}</span></span>`;
  const Kp = (i, t, v, tn) => B.kpi(i, t, v, null, null, tn);
  const kp = (a) => `<section class="kpis sm lv-stats" style="grid-template-columns:repeat(${a.length},minmax(0,1fr))">${a.join('')}</section>`;
  const tabs = (list, cur, act) => `<div class="seg sm as-tabs">${list.map((t) => `<button class="${t[0] === cur ? 'on' : ''}" data-act="${act}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>`;
  const field = (l, c, full) => `<div class="fld" ${full ? 'style="grid-column:1/-1"' : ''}><label>${l}</label>${c}</div>`;
  const grid = (c) => `<div class="fgrid" style="grid-template-columns:1fr 1fr">${c}</div>`;
  const rid = (t) => t.closest('[data-id]').dataset.id;
  const crumbs = (m, l) => [{ label: 'HR', href: '#/' }, { label: m }, { label: l }];
  const PILL = { Pending: 'warn', Approved: 'ok', Rejected: 'bad', Cancelled: 'mute', Approval: 'warn', Assets: 'info', Hiring: 'info', Filled: 'ok', Posted: 'ok', 'Not posted': 'mute', 'On time': 'ok', Late: 'warn', 'Extreme late': 'bad', Open: 'info', Cleared: 'ok', 'In progress': 'warn', Selected: 'ok', 'Not selected': 'bad', Connected: 'ok', Offline: 'bad', Received: 'ok', Waiting: 'warn' };
  const pill = (s) => B.pill(s, PILL[s] || 'mute');
  const emps = () => B.EMPLOYEES.filter((e) => e.status !== 'Left');
  const mgrName = (e) => { const m = e && B.emp(e.mgr); return m ? m.name : 'Rahim Uddin'; };
  const crossName = (e, lm) => { const heads = B.EMPLOYEES.slice(1, 9).filter((h) => h.name !== lm && h.dept !== (e && e.dept)); return heads[B.hash((e ? e.id : 'x') + 'clm') % heads.length].name; };

  /* =====================================================================
     SHARED APPROVAL ENGINE — chains are configured by HR in "Approval Chains"
     ===================================================================== */
  const DEFAULT_CHAINS = () => ({
    requisition: { label: 'Job Requisition', hrOverride: false, hrSets: true, stages: [{ k: 'lm', t: 'Line Manager' }, { k: 'clm', t: 'Cross Line Manager' }, { k: 'hr', t: 'HR' }, { k: 'lv', t: 'Level 1', sub: 'Director' }, { k: 'lv', t: 'Level 2', sub: 'CEO / MD' }] },
    leave: { label: 'Leave', hrOverride: true, stages: [{ k: 'lm', t: 'Line Manager' }, { k: 'clm', t: 'Cross Line Manager' }, { k: 'hr', t: 'HR' }] },
    wfh: { label: 'Work From Home', hrOverride: true, stages: [{ k: 'lm', t: 'Line Manager' }, { k: 'clm', t: 'Cross Line Manager' }, { k: 'hr', t: 'HR' }, { k: 'ceo', t: 'CEO / MD' }] }
  });
  const lab = (s) => s.t + (s.sub ? ' · ' + s.sub : '');
  const whoFor = (s, emp, lm) => (s.k === 'lm' ? lm || mgrName(emp) : s.k === 'clm' ? crossName(emp, lm || mgrName(emp)) : s.k === 'hr' ? 'Rahim Uddin' : s.k === 'ceo' ? 'Managing Director' : s.sub || s.t);
  /* stages for a new request. status seeds demo data: Approved = all done, Rejected = first stage rejected */
  function mkStages(type, emp, status, lm, at) {
    const e = typeof emp === 'string' ? B.EMPLOYEES.find((x) => x.name === emp) : emp, chain = D().chains[type].stages;
    return chain.map((s, i) => { const w = whoFor(s, e, lm); const st = { t: s.t, sub: s.sub || '', k: s.k, who: w, s: 'Pending', by: '', at: '', note: '' }; if (status === 'Approved') Object.assign(st, { s: 'Approved', by: w, at: at || day(-1) }); if (status === 'Rejected' && i === 0) Object.assign(st, { s: 'Rejected', by: w, at: at || day(-1) }); return st; });
  }
  const curIdx = (st) => st.findIndex((s) => s.s === 'Pending');
  const overall = (st) => (st.some((s) => s.s === 'Rejected') ? 'Rejected' : st.every((s) => s.s === 'Approved') ? 'Approved' : 'Pending');
  const approveOne = (st, by, note) => { const i = curIdx(st); if (i < 0) return -1; Object.assign(st[i], { s: 'Approved', by, at: today(), note: note || '' }); return i; };
  const approveAll = (st, by, note) => { st.forEach((s) => { if (s.s === 'Pending') Object.assign(s, { s: 'Approved', by: by + ' (HR override)', at: today(), note: note || '' }); }); };
  const rejectCur = (st, by, note) => { const i = curIdx(st); if (i >= 0) Object.assign(st[i], { s: 'Rejected', by, at: today(), note: note || '' }); return i; };
  const canAct = (s) => isHR() || s.who === me().name;
  function items(st, from) {
    const now = curIdx(st);
    return st.map((s, i) => ({ n: (from || 0) + i + 1, t: s.t, sub: s.s !== 'Pending' && s.by ? s.by : s.sub || '', c: s.s === 'Approved' ? 'done' : s.s === 'Rejected' ? 'bad' : i === now ? 'now' : '' }));
  }
  const tracker = (list) => `<div class="fl-trk-wrap"><ul class="cl-trk fl-trk">${list.map((i) => `<li class="${i.c}"><i>${i.c === 'done' ? ic('check', 13) : i.c === 'bad' ? ic('x', 13) : i.n}</i><span>${esc(i.t)}${i.sub ? `<em>${esc(i.sub)}</em>` : ''}</span></li>`).join('')}</ul></div>`;
  const trail = (st) => `<ul class="fl-trail">${st.map((s) => `<li class="${s.s.toLowerCase()}"><b>${esc(lab(s))}</b><span>${s.s === 'Pending' ? 'Waiting · ' + esc(s.who) : esc(s.s) + ' · ' + esc(s.by) + ' · ' + fmtS(s.at)}</span>${s.note ? `<em>“${esc(s.note)}”</em>` : ''}</li>`).join('')}</ul>`;

  /* open dates set by HR: no WFH approval needed on these days */
  const isOpen = (d) => !!D().openDates.find((o) => o.date === d);
  const rangeOpen = (f, t) => { let d = f, n = 0; while (d <= t) { if (!isFri(d)) { if (!isOpen(d)) return false; n++; } d = day(1, d); } return n > 0; };
  B.flow = { mkStages, curIdx, overall, approveOne, approveAll, rejectCur, canAct, tracker, items, trail, lab, isOpen, rangeOpen, titles: (t) => D().chains[t].stages.map(lab), chain: (t) => D().chains[t], openInfo: (d) => D().openDates.find((o) => o.date === d) };

  /* =====================================================================
     STORE + SEED
     ===================================================================== */
  let db = null;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  const D = () => { if (!db) { try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} if (!db || !db.chains) { db = { chains: DEFAULT_CHAINS(), seq: { rq: 0, lv: 0, hr: 0, emp: 50 } }; seedAll(); save(); } } return db; };
  const nid = (k, p) => p + B.pad(++D().seq[k], 4);

  const ASSETS = ['Laptop', 'Monitor', 'Mobile & SIM', 'ID card', 'Access card', 'Email account', 'Desk & chair', 'Headset'];
  const CHANNELS = ['LinkedIn', 'Bdjobs', 'Facebook', 'Company website', 'Employee referral'];
  const DOCS = ['National ID / Passport', 'Educational certificates', 'Experience letters', 'Passport-size photographs', 'Bank account details', 'Signed appointment letter', 'Emergency contact form'];
  const LEAVE_ALLOC = { 'Casual Leave': 10, 'Sick Leave': 14, 'Earned Leave': 18, 'Compensatory Off': 4, 'Maternity Leave': 112, 'Paternity Leave': 7, 'Leave Without Pay': 0 };
  const SKILLS = { tech: ['python', 'frappe', 'javascript', 'vue', 'mysql', 'linux', 'docker', 'api', 'git', 'testing', 'redis', 'react'], biz: ['sales', 'excel', 'communication', 'negotiation', 'crm', 'reporting', 'accounting', 'seo', 'customer support'] };

  function seedAll() {
    const d = db, A = (n) => B.EMPLOYEES.find((e) => e.name === n);
    /* --- requisitions --- */
    const rq = (o, status, cur) => {
      const r = Object.assign({ id: nid('rq', 'REQ-'), positions: 1, replacement: false, replaces: '', reason: '', expected: day(30), created: day(-5), state: 'Approval', assets: [], hire: '' }, o);
      r.stages = mkStages('requisition', A(r.by) || r.by, status === 'Approved' ? 'Approved' : '', mgrName(A(r.by)), day(-3));
      if (cur != null) r.stages.forEach((s, i) => { if (i < cur) Object.assign(s, { s: 'Approved', by: s.who, at: day(-4 + i) }); });
      if (status === 'Rejected') { Object.assign(r.stages[cur], { s: 'Rejected', by: r.stages[cur].who, at: day(-2), note: 'Headcount already covered by the Q4 plan' }); r.state = 'Rejected'; }
      d.reqs = d.reqs || []; d.reqs.push(r); return r;
    };
    rq({ desig: 'Senior Backend Engineer', dept: 'Engineering', positions: 2, by: 'Tanvir Ahmed', reason: 'New payments squad', created: day(-9) }, '', 2);
    rq({ desig: 'Support Agent', dept: 'Customer Support', positions: 1, by: 'Imran Hossain', replacement: true, replaces: 'Rafiq Islam', reason: 'Resigned, last working day next week', created: day(-4) }, '', 2);
    rq({ desig: 'Product Designer', dept: 'Design', by: 'Fatema Khatun', reason: 'Mobile app redesign', created: day(-1) }, '', 0);
    const r4 = rq({ desig: 'Sales Executive', dept: 'Sales', positions: 3, by: 'Sadia Islam', reason: 'Chattogram expansion', created: day(-12) }, 'Approved'); r4.state = 'Assets';
    const r5 = rq({ desig: 'DevOps Engineer', dept: 'Engineering', by: 'Tanvir Ahmed', replacement: true, replaces: 'Kamrul Hasan', reason: 'Transferred to Sylhet branch', created: day(-25) }, 'Approved'); r5.state = 'Hiring'; r5.assets = ['Laptop', 'Monitor', 'ID card', 'Email account'];
    rq({ desig: 'Content Strategist', dept: 'Marketing', by: 'Nusrat Jahan', reason: 'Extra campaign headcount', created: day(-8) }, 'Rejected', 1);
    /* --- hiring record for the requisition already in hiring --- */
    const h = { id: nid('hr', 'HIR-'), req: r5.id, title: r5.desig, positions: r5.positions, keywords: 'docker, linux, python, api', channels: {}, cands: [], rounds: [{ n: 'Round 1 · Screening', max: 100, pass: 50 }, { n: 'Round 2 · Technical', max: 100, pass: 60 }, { n: 'Round 3 · HR', max: 100, pass: 50 }], tab: 'post' };
    CHANNELS.forEach((c) => (h.channels[c] = { posted: ['LinkedIn', 'Bdjobs', 'Facebook'].includes(c), at: day(-14) }));
    h.cands = genCands(h, 12);
    h.cands.forEach((c, i) => { if (scoreOf(c, h.keywords) >= 50) c.short = true; });
    h.cands.filter((c) => c.short).forEach((c, i) => { if (i < 5) h.rounds.forEach((r, ri) => { if (ri <= (i === 4 ? 0 : 2)) c.marks[ri] = 45 + ((B.hash(c.name + ri) % 45)); }); });
    const s0 = h.cands.find((c) => c.short); if (s0) { [82, 78, 85].forEach((m, i) => (s0.marks[i] = m)); s0.sel = true; s0.ob = { sent: true, docs: { [DOCS[0]]: true, [DOCS[1]]: true, [DOCS[3]]: true } }; }
    r5.hire = h.id; d.hirings = [h]; d.hsel = h.id;
    /* --- leave requests --- */
    const lv = (emp, type, from, to, reason, status, cur, lm) => {
      const e = A(emp), r = { id: nid('lv', 'LV-'), emp, type, from, to, reason, created: day(-3), days: Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1) };
      r.stages = mkStages('leave', e, status === 'Approved' ? 'Approved' : '', lm || mgrName(e), day(-2));
      if (cur) r.stages.forEach((s, i) => { if (i < cur) Object.assign(s, { s: 'Approved', by: s.who, at: day(-2) }); });
      if (status === 'Rejected') { const i = cur || 0; Object.assign(r.stages[i], { s: 'Rejected', by: r.stages[i].who, at: day(-1), note: 'Project release week, please reschedule' }); }
      d.leaves = d.leaves || []; d.leaves.push(r); return r;
    };
    lv('Tasnim Rahman', 'Sick Leave', day(2), day(3), 'Fever and doctor advice', 'Pending', 1);
    lv('Tasnim Rahman', 'Casual Leave', day(-20), day(-20), 'Family function', 'Approved');
    lv('Kamrul Hasan', 'Casual Leave', day(5), day(6), 'Visiting family in Rajshahi', 'Pending', 0, 'Tasnim Rahman');
    lv('Maliha Chowdhury', 'Earned Leave', day(12), day(18), 'Annual vacation', 'Pending', 0, 'Tasnim Rahman');
    lv('Sadia Islam', 'Sick Leave', day(1), day(1), 'Dental procedure', 'Pending', 2);
    lv('Imran Hossain', 'Compensatory Off', day(4), day(4), 'Worked last Friday release', 'Pending', 1);
    lv('Mahmud Hasan', 'Casual Leave', day(-8), day(-7), 'Personal work', 'Rejected', 0);
    /* --- rosters --- */
    d.rosters = [
      { id: 'normal', name: 'Normal', type: 'Normal', start: '09:30', end: '18:30', hours: 9 },
      { id: 'open', name: 'Open', type: 'Open', start: '', end: '', hours: 8 },
      { id: 'morning', name: 'Morning', type: 'Custom', start: '06:00', end: '15:00', hours: 8 },
      { id: 'evening', name: 'Evening', type: 'Custom', start: '14:00', end: '23:00', hours: 8 },
      { id: 'night', name: 'Night', type: 'Custom', start: '22:00', end: '07:00', hours: 8 }
    ];
    d.assign = {}; d.late = { grace: 15, extreme: 30 };
    /* --- HR open dates (no WFH approval needed) --- */
    d.openDates = [{ date: day(5), reason: 'Heavy rain / waterlogging advisory', by: 'Rahim Uddin' }, { date: day(-10), reason: 'Transport strike', by: 'Rahim Uddin' }];
    d.devices = { tipsoi: { name: 'Tip Soi', model: 'Cloud attendance service', last: Date.now() - 4 * 60000, enrolled: 24, state: 'Connected', where: 'Dhaka HQ · Reception' }, zk: { name: 'ZKTeco device', model: 'ZKTeco biometric terminal', last: Date.now() - 2 * 60000, enrolled: 24, state: 'Connected', where: 'Dhaka HQ · Main gate' } };
  }

  /* =====================================================================
     PAGE PLUMBING
     ===================================================================== */
  const F = { rq: { tab: 'all' }, lv: { tab: 'all' }, ro: { tab: 'rosters', dept: '', sim: null }, hf: {} }, PG = {}; let cur = '';
  const rerender = () => { const v = B.$('#view .fade'); if (v && PG[cur]) v.innerHTML = PG[cur](); };
  const page = (n, fn) => { PG[n] = fn; B.page[n] = () => { cur = n; D(); return fn(); }; };
  const done = (msg) => { save(); B.closeModal(); rerender(); if (msg) B.toast(msg); };
  const sel = (opts, v, attrs) => `<select class="inp" ${attrs || ''}>${opts.map((o) => { const [val, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${val === v ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;

  /* =====================================================================
     1. APPROVAL CHAINS (HR setup)
     ===================================================================== */
  page('approval-chains', () => {
    const C = D().chains;
    const card = (k, note) => { const c = C[k]; return `<div class="card pad" data-id="${k}"><div class="ct-row"><h3 class="ct">${c.label} approval</h3>${k === 'requisition' ? `<button class="btn sm" data-act="fl-ch-add">${ic('plus', 14)}Add level</button>` : ''}</div>
      ${tracker(c.stages.map((s, i) => ({ n: i + 1, t: s.t, sub: s.sub, c: s.k === 'hr' ? 'now' : '' })))}
      <p class="muted" style="margin:0 0 10px">${note}</p>
      ${k === 'requisition' ? `<ul class="fl-lvls">${c.stages.map((s, i) => `<li data-i="${i}"><b>${i + 1}</b><span>${esc(s.t)}${s.sub ? ' · ' + esc(s.sub) : ''}</span>${s.k === 'lv' ? `<button class="icon-btn sm" data-act="fl-ch-del" aria-label="Remove level">${ic('trash', 15)}</button>` : '<em>fixed</em>'}</li>`).join('')}</ul>` : ''}
      <label class="fl-sw"><input type="checkbox" data-chg="flchov" ${c.hrOverride ? 'checked' : ''} ${k === 'requisition' ? 'disabled' : ''}><span><b>HR can approve at any stage</b><em>${k === 'requisition' ? 'HR decides the extra levels at its own step instead' : 'HR sees every pending request and can approve or reject it at any stage'}</em></span></label></div>`; };
    return `${B.head('Approval Chains', 'Who approves what, in which order. Used by Requisition, Leave and Work From Home.', '', crumbs('HR Setup', 'Approval Chains'))}
      <div class="stack">${card('requisition', 'Line Manager → Cross Line Manager → HR. HR decides who and how many more approvers are needed (Level 1 … N) when it approves a requisition.')}${card('leave', 'Employee applies by leave type. Line Manager → Cross Line Manager → HR.')}${card('wfh', 'Line Manager → Cross Line Manager → HR → CEO / MD. On an HR open date no approval is needed.')}</div>
      <div class="as-note" style="margin-top:16px">${ic('alert', 14)} Changing a chain affects new requests only. Requests already in flight keep the chain they started with.</div>`;
  });
  B.act['fl-ch-add'] = () => B.modal({ title: 'Add approval level', body: grid(field('Level title', `<input class="inp" id="flm-t" value="Level ${D().chains.requisition.stages.filter((s) => s.k === 'lv').length + 1}">`) + field('Role / designation', '<input class="inp" id="flm-s" placeholder="e.g. Director, CEO, MD, Chairman">')), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="fl-ch-do-add">Add level</button>' });
  B.act['fl-ch-do-add'] = () => { const t = B.$('#flm-t').value.trim(), s = B.$('#flm-s').value.trim(); if (!t) { B.toast('Enter a level title', 'bad'); return; } D().chains.requisition.stages.push({ k: 'lv', t, sub: s }); done('Level added'); };
  B.act['fl-ch-del'] = (t) => { D().chains.requisition.stages.splice(+t.closest('li').dataset.i, 1); done('Level removed'); };
  B.chg.flchov = (t) => { D().chains[rid(t)].hrOverride = t.checked; save(); B.toast('Saved'); };

  /* =====================================================================
     2. HIRING REQUISITIONS
     ===================================================================== */
  const reqById = (id) => D().reqs.find((r) => r.id === id);
  const reqItems = (r) => {
    const a = items(r.stages), n = a.length, ok = r.state === 'Hiring' || r.state === 'Filled';
    return a.concat([{ n: n + 1, t: 'Assets', sub: r.assets.length ? r.assets.length + ' items' : '', c: ok ? 'done' : r.state === 'Assets' ? 'now' : '' }, { n: n + 2, t: 'Hiring', sub: r.state === 'Filled' ? 'Filled' : '', c: r.state === 'Filled' ? 'done' : r.state === 'Hiring' ? 'now' : '' }]);
  };
  const reqCard = (r) => {
    const i = curIdx(r.stages), st = r.stages[i], hire = r.hire && D().hirings.find((h) => h.id === r.hire);
    let acts = '';
    if (r.state === 'Approval' && st && canAct(st)) acts = `<button class="btn sm" data-act="fl-rq-rej">${ic('x', 14)}Reject</button><button class="btn sm primary" data-act="fl-rq-ap">${ic('check', 14)}Approve as ${esc(lab(st))}</button>`;
    else if (r.state === 'Approval') acts = `<span class="muted">Waiting for ${esc(st.who)} (${esc(lab(st))})</span>`;
    if (r.state === 'Assets') acts = isHR() ? `<button class="btn sm primary" data-act="fl-rq-assets">${ic('briefcase', 14)}Assign assets & start hiring</button>` : '<span class="muted">HR is assigning assets</span>';
    if (r.state === 'Hiring' || r.state === 'Filled') acts = `<button class="btn sm primary" data-act="fl-rq-hire">${ic('users', 14)}Open hiring process</button>`;
    return `<div class="card pad fl-req" data-id="${r.id}"><div class="cl-q-h">${B.avatar(r.by, 40)}<div><b>${esc(r.desig)} <em class="fl-id">${r.id}</em></b><span>${esc(r.dept)} · requested by ${esc(r.by)} · ${fmtS(r.created)}</span></div>${pill(r.state)}</div>
      <div class="fl-tags">${r.replacement ? `<span class="fl-tag rep">${ic('refresh', 13)}Replacement of ${esc(r.replaces)}</span>` : `<span class="fl-tag">${ic('plus', 13)}New position</span>`}<span class="fl-tag">${ic('users', 13)}${r.positions} position${r.positions > 1 ? 's' : ''}</span><span class="fl-tag">${ic('calendar', 13)}Needed by ${fmtS(r.expected)}</span>${r.assets.length ? `<span class="fl-tag">${ic('briefcase', 13)}${r.assets.join(', ')}</span>` : ''}</div>
      ${tracker(reqItems(r))}
      ${r.reason ? `<div class="as-note">${esc(r.reason)}</div>` : ''}
      <div class="as-act"><button class="btn sm" data-act="fl-rq-view">Approval trail</button><span class="grow"></span>${acts}</div></div>`;
  };
  page('req-board', () => {
    const L = D().reqs, t = F.rq.tab, c = (s) => L.filter((r) => r.state === s).length;
    const list = L.filter((r) => t === 'all' || r.state === t);
    return `${B.head('Job Requisitions', 'Raise a requisition, get it approved level by level, then HR assigns assets and starts hiring.', `<a class="btn" href="#/page/approval-chains">${ic('settings', 15)}Approval chain</a><button class="btn primary" data-act="fl-rq-new">${ic('plus', 16)}New requisition</button>`, crumbs('Recruitment', 'Requisitions'))}
      ${kp([Kp('inbox', 'Awaiting approval', c('Approval'), c('Approval') ? 'warn' : ''), Kp('briefcase', 'Assets to assign', c('Assets'), c('Assets') ? 'warn' : ''), Kp('users', 'In hiring', c('Hiring')), Kp('check-circle', 'Filled', c('Filled'), 'ok'), Kp('x', 'Rejected', c('Rejected'), 'bad')])}
      <div class="filterbar">${tabs([['all', 'All'], ['Approval', 'Awaiting approval'], ['Assets', 'Assets'], ['Hiring', 'Hiring'], ['Filled', 'Filled'], ['Rejected', 'Rejected']], t, 'fl-rq-tab')}</div>
      <div class="cl-queue fl-queue">${list.map(reqCard).join('') || `<div class="card pad empty">${ic('search', 34)}<b>No requisitions here</b></div>`}</div>`;
  });
  B.act['fl-rq-tab'] = (t) => { F.rq.tab = t.dataset.t; rerender(); };
  B.act['fl-rq-view'] = (t) => { const r = reqById(rid(t)); B.modal({ title: `${r.id} · ${esc(r.desig)}`, wide: true, body: `${r.replacement ? `<div class="as-note">${ic('refresh', 14)} Replacement for <b>${esc(r.replaces)}</b></div>` : ''}<h4 style="margin:12px 0 8px">Approval trail</h4>${trail(r.stages)}`, foot: '<button class="btn primary" data-act="close-modal">Close</button>' }); };
  B.act['fl-rq-new'] = () => B.modal({ title: 'New job requisition', wide: true, body: grid(field('Designation', '<input class="inp" id="flm-d" placeholder="e.g. Senior Backend Engineer">') + field('Department', sel(B.DEPTS, B.DEPTS[0], 'id="flm-dp"')) + field('No. of positions', '<input type="number" min="1" max="20" class="inp" id="flm-n" value="1">') + field('Needed by', `<input type="date" class="inp" id="flm-x" value="${day(30)}">`) + field('Hiring type', sel([['new', 'New position'], ['rep', 'Replacement']], 'new', 'id="flm-ty" data-chg="flrqty"')) + `<div class="fld" id="flm-repw" hidden><label>Employee being replaced</label>${sel(emps().map((e) => e.name), '', 'id="flm-rep"')}</div>` + field('Justification', '<textarea class="inp" id="flm-r" rows="2" placeholder="Why is this position needed?"></textarea>', 1)) + `<p class="cl-hint">${ic('alert', 14)} Goes to: ${D().chains.requisition.stages.map(lab).join(' → ')}</p>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="fl-rq-save">Submit requisition</button>' });
  B.chg.flrqty = (t) => { B.$('#flm-repw').hidden = t.value !== 'rep'; };
  B.act['fl-rq-save'] = () => {
    const desig = B.$('#flm-d').value.trim(), rep = B.$('#flm-ty').value === 'rep';
    if (!desig) { B.toast('Designation is required', 'bad'); return; }
    const by = me().name, e = B.emp(me().id), r = { id: nid('rq', 'REQ-'), desig, dept: B.$('#flm-dp').value, positions: Math.max(1, +B.$('#flm-n').value || 1), by, replacement: rep, replaces: rep ? B.$('#flm-rep').value : '', reason: B.$('#flm-r').value.trim(), expected: B.$('#flm-x').value, created: today(), state: 'Approval', assets: [], hire: '' };
    r.stages = mkStages('requisition', e, '', mgrName(e)); D().reqs.unshift(r); F.rq.tab = 'all'; done(`${r.id} sent to ${r.stages[0].who}`);
  };
  const afterReq = (r) => { if (overall(r.stages) === 'Approved') r.state = 'Assets'; if (overall(r.stages) === 'Rejected') r.state = 'Rejected'; };
  B.act['fl-rq-ap'] = (t) => {
    const r = reqById(rid(t)), st = r.stages[curIdx(r.stages)];
    if (st.k === 'hr') { B.modal({ title: 'HR approval · choose the next approvers', wide: true, body: `<p style="margin-bottom:10px">${esc(r.desig)} · ${r.id}. HR decides who and how many approvers must sign off after this step. Leave all unchecked if HR approval is enough.</p><div class="fl-checks" data-id="${r.id}">${[['Level 1', 'Director'], ['Level 2', 'CEO / MD'], ['Level 3', 'Chairman'], ['Level 4', 'Board']].map((l) => `<label class="fl-chk"><input type="checkbox" class="fl-lv" data-t="${l[0]}" data-s="${l[1]}" ${r.stages.some((s) => s.k === 'lv' && s.t === l[0]) ? 'checked' : ''}><span><b>${l[0]}</b><em>${l[1]}</em></span></label>`).join('')}</div>${field('Comment (optional)', '<textarea class="inp" id="flm-n" rows="2"></textarea>')}`, foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="fl-rq-hrdo" data-id="${r.id}">Approve & forward</button>` }); return; }
    approveOne(r.stages, st.who); afterReq(r); done(r.state === 'Assets' ? 'Fully approved. HR can now assign assets' : 'Approved. Forwarded to ' + r.stages[curIdx(r.stages)].who);
  };
  B.act['fl-rq-hrdo'] = (t) => {
    const r = reqById(t.dataset.id), i = curIdx(r.stages); const picked = B.$$('.fl-lv').filter((x) => x.checked).map((x) => ({ k: 'lv', t: x.dataset.t, sub: x.dataset.s }));
    r.stages = r.stages.filter((s) => s.k !== 'lv' || s.s !== 'Pending'); approveOne(r.stages, r.stages[i].who, B.$('#flm-n').value.trim());
    picked.forEach((p) => r.stages.push(Object.assign(p, { who: p.sub, s: 'Pending', by: '', at: '', note: '' }))); afterReq(r);
    done(picked.length ? `Approved. ${picked.length} more level${picked.length > 1 ? 's' : ''} added: ${picked.map((p) => p.sub).join(', ')}` : 'Fully approved. HR can now assign assets');
  };
  B.act['fl-rq-rej'] = (t) => B.modal({ title: 'Reject requisition', body: field('Reason (visible to the requester)', '<textarea class="inp" id="flm-n" rows="3"></textarea>'), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="fl-rq-dorej" data-id="${rid(t)}">Reject</button>` });
  B.act['fl-rq-dorej'] = (t) => { const n = B.$('#flm-n').value.trim(); if (!n) { B.toast('Add a reason', 'bad'); return; } const r = reqById(t.dataset.id); rejectCur(r.stages, r.stages[curIdx(r.stages)].who, n); afterReq(r); done('Requisition rejected. Returned to requester'); };
  B.act['fl-rq-assets'] = (t) => { const r = reqById(rid(t)); B.modal({ title: 'Assign assets for the new hire', body: `<p style="margin-bottom:10px">Tick everything ${esc(r.desig)} will need on day one. Asset Management will reserve these.</p><div class="fl-checks">${ASSETS.map((a) => `<label class="fl-chk"><input type="checkbox" class="fl-as" value="${a}" ${['Laptop', 'ID card', 'Email account'].includes(a) ? 'checked' : ''}><span><b>${a}</b></span></label>`).join('')}</div>`, foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="fl-rq-doassets" data-id="${r.id}">Save & start hiring</button>` }); };
  B.act['fl-rq-doassets'] = (t) => {
    const r = reqById(t.dataset.id); r.assets = B.$$('.fl-as').filter((x) => x.checked).map((x) => x.value); r.state = 'Hiring';
    const h = { id: nid('hr', 'HIR-'), req: r.id, title: r.desig, positions: r.positions, keywords: '', channels: {}, cands: [], rounds: [{ n: 'Round 1 · Screening', max: 100, pass: 50 }, { n: 'Round 2 · Technical', max: 100, pass: 60 }], tab: 'post' };
    CHANNELS.forEach((c) => (h.channels[c] = { posted: false, at: '' })); r.hire = h.id; D().hirings.push(h); D().hsel = h.id; done('Assets reserved. Hiring started');
  };
  B.act['fl-rq-hire'] = (t) => { D().hsel = reqById(rid(t)).hire; location.hash = '#/page/hiring-flow'; };

  /* =====================================================================
     3. HIRING PROCESS
     ===================================================================== */
  const H = () => D().hirings.find((h) => h.id === D().hsel) || D().hirings[0];
  const scoreOf = (c, kws) => { const k = String(kws || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean); return k.length ? Math.round((100 * k.filter((x) => c.cv.toLowerCase().includes(x)).length) / k.length) : 0; };
  function genCands(h, n) {
    const posted = Object.keys(h.channels).filter((c) => h.channels[c].posted), isTech = /engineer|developer|devops|qa/i.test(h.title), pool = isTech ? SKILLS.tech : SKILLS.biz;
    return B.APPLICANTS.slice(0, n).map((name, i) => {
      const r = B.rng(h.id + name), pick = [], p2 = pool.slice(); const k = 4 + Math.floor(r() * 4); while (pick.length < k && p2.length) pick.push(p2.splice(Math.floor(r() * p2.length), 1)[0]);
      return { id: 'c' + i, name, email: name.toLowerCase().replace(/\s+/g, '.') + '@gmail.com', exp: 1 + Math.floor(r() * 8), src: posted[i % posted.length], cv: `${pick.join(', ')}. ${1 + Math.floor(r() * 8)} years experience.`, skills: pick, short: false, marks: {}, sel: null, ob: { sent: false, docs: {} }, emp: '' };
    });
  }
  const totalOf = (h, c) => { const m = h.rounds.map((r, i) => c.marks[i]); return m.every((x) => x != null) ? Math.round(m.reduce((a, b) => a + b, 0) / h.rounds.length) : null; };
  const resultOf = (h, c) => { const n = h.rounds.filter((r, i) => c.marks[i] != null).length; if (!n) return 'Pending'; if (h.rounds.some((r, i) => c.marks[i] != null && c.marks[i] < r.pass)) return 'Rejected'; return n === h.rounds.length ? 'Cleared' : 'In progress'; };
  const docsDone = (c) => DOCS.filter((d) => c.ob.docs[d]).length;
  const hSteps = (h) => {
    const posted = Object.values(h.channels).some((c) => c.posted), s = h.cands.filter((c) => c.short), iv = s.filter((c) => resultOf(h, c) === 'Cleared'), se = h.cands.filter((c) => c.sel === true), ob = se.filter((c) => c.ob.sent && docsDone(c) === DOCS.length), em = h.cands.filter((c) => c.emp);
    const flags = [posted, h.cands.length > 0, s.length > 0, iv.length > 0, se.length > 0, ob.length > 0, em.length > 0], names = ['Post job', 'CVs sorted', 'HR shortlist', 'Interviews', 'Selection', 'Onboarding & docs', 'Employee record'];
    const first = flags.indexOf(false);
    return names.map((t, i) => ({ n: i + 1, t, sub: i === 0 ? Object.values(h.channels).filter((c) => c.posted).length + ' channels' : i === 1 ? h.cands.length + ' CVs' : i === 2 ? s.length + ' shortlisted' : i === 3 ? iv.length + ' cleared' : i === 4 ? se.length + ' selected' : i === 6 ? em.length + ' created' : '', c: flags[i] ? 'done' : i === first ? 'now' : '' }));
  };
  page('hiring-flow', () => {
    const hs = D().hirings;
    if (!hs.length) return `${B.head('Hiring Process', 'Post, sort, shortlist, interview and onboard.', '', crumbs('Recruitment', 'Hiring Process'))}<div class="card pad empty">${ic('briefcase', 38)}<b>No approved requisition is in hiring yet</b><span>Once a requisition is fully approved and HR assigns assets, it appears here.</span><a class="btn primary" href="#/page/req-board">Open requisitions</a></div>`;
    const h = H(), t = h.tab, S = h.cands.filter((c) => c.short);
    let body = '';
    if (t === 'post') {
      body = `<div class="card pad"><div class="ct-row"><h3 class="ct">Post the job on multiple channels</h3><button class="btn sm primary" data-act="fl-h-post">${ic('send', 14)}Post to ticked channels</button></div><div class="fl-chan">${CHANNELS.map((c) => { const x = h.channels[c], n = h.cands.filter((k) => k.src === c).length; return `<label class="fl-chk ${x.posted ? 'on' : ''}"><input type="checkbox" class="fl-ch" value="${c}" ${x.posted ? 'checked disabled' : ''}><span><b>${c}</b><em>${x.posted ? 'Posted ' + fmtS(x.at) + ' · ' + n + ' CVs received' : 'Not posted'}</em></span>${pill(x.posted ? 'Posted' : 'Not posted')}</label>`; }).join('')}</div><p class="cl-hint">${ic('alert', 14)} CVs from every channel are collected into one list and sorted by keyword match in the next step.</p></div>`;
    } else if (t === 'cv') {
      const L = h.cands.slice().sort((a, b) => scoreOf(b, h.keywords) - scoreOf(a, h.keywords)), kws = h.keywords.toLowerCase().split(',').map((x) => x.trim()).filter(Boolean);
      body = `<div class="card pad"><div class="ct-row"><h3 class="ct">Collected CVs · sorted by keyword match</h3><button class="btn sm" data-act="fl-h-suggest">${ic('star', 14)}Tick all ≥ 60%</button></div><div class="fl-kw">${field('Keywords (comma separated)', `<input class="inp" id="fl-kw" value="${esc(h.keywords)}" placeholder="e.g. python, frappe, mysql" data-chg="flkw">`)}</div>
        ${L.length ? `<div class="tscroll"><table class="dt"><thead><tr><th>Candidate</th><th>Source</th><th>Experience</th><th>Skills in CV</th><th>Match</th><th class="r">HR shortlist</th></tr></thead><tbody>${L.map((c) => { const s = scoreOf(c, h.keywords); return `<tr data-id="${c.id}"><td>${who(c.name)}<em class="sub">${esc(c.email)}</em></td><td>${esc(c.src)}</td><td>${c.exp} yrs</td><td style="white-space:normal;min-width:220px">${c.skills.map((k) => `<span class="fl-sk ${kws.includes(k) ? 'hit' : ''}">${esc(k)}</span>`).join('')}</td><td><div class="fl-score"><i style="width:${s}%" class="${s >= 60 ? 'ok' : s >= 30 ? 'mid' : 'low'}"></i></div><b>${s}%</b></td><td class="r"><button class="btn sm ${c.short ? 'primary' : ''}" data-act="fl-h-short">${c.short ? ic('check', 14) + 'Shortlisted' : 'Shortlist'}</button></td></tr>`; }).join('')}</tbody></table></div>` : `<div class="empty">${ic('inbox', 34)}<b>No CVs yet</b><span>Post the job first.</span></div>`}</div>`;
    } else if (t === 'interview') {
      body = `<div class="card pad"><div class="ct-row"><h3 class="ct">Interview rounds · marking</h3><button class="btn sm" data-act="fl-h-round">${ic('plus', 14)}Add round</button></div><div class="fl-rounds">${h.rounds.map((r, i) => `<span class="fl-tag"><b>${i + 1}</b> ${esc(r.n.replace(/^Round \d+ · /, ''))} · pass ${r.pass}/${r.max}</span>`).join('')}</div>
        ${S.length ? `<div class="tscroll"><table class="dt"><thead><tr><th>Candidate</th>${h.rounds.map((r, i) => `<th>R${i + 1}</th>`).join('')}<th>Average</th><th>Result</th><th class="r"></th></tr></thead><tbody>${S.map((c) => { const tot = totalOf(h, c), res = resultOf(h, c); return `<tr data-id="${c.id}"><td>${who(c.name)}</td>${h.rounds.map((r, i) => `<td>${c.marks[i] == null ? '<span class="as-none">—</span>' : `<b class="${c.marks[i] >= r.pass ? 'fl-pass' : 'fl-fail'}">${c.marks[i]}</b>/${r.max}`}</td>`).join('')}<td>${tot == null ? '—' : tot + '%'}</td><td>${pill(res)}</td><td class="r"><button class="btn sm" data-act="fl-h-marks">${ic('edit', 14)}Enter marks</button></td></tr>`; }).join('')}</tbody></table></div>` : `<div class="empty">${ic('users', 34)}<b>Nobody shortlisted</b><span>HR shortlists CVs in the previous step.</span></div>`}</div>`;
    } else if (t === 'select') {
      const C = S.filter((c) => resultOf(h, c) === 'Cleared').sort((a, b) => totalOf(h, b) - totalOf(h, a)), n = h.cands.filter((c) => c.sel === true).length;
      body = `<div class="card pad"><div class="ct-row"><h3 class="ct">Selection</h3><span class="muted">${n} of ${h.positions} position${h.positions > 1 ? 's' : ''} filled by selection</span></div>${C.length ? `<div class="tscroll"><table class="dt"><thead><tr><th>Rank</th><th>Candidate</th><th>Average</th><th>Decision</th><th class="r"></th></tr></thead><tbody>${C.map((c, i) => `<tr data-id="${c.id}"><td><b>#${i + 1}</b></td><td>${who(c.name)}</td><td>${totalOf(h, c)}%</td><td>${c.sel === true ? pill('Selected') : c.sel === false ? pill('Not selected') : pill('Pending')}</td><td class="r"><button class="btn sm" data-act="fl-h-dec" data-v="0">${ic('x', 14)}Not selected</button> <button class="btn sm primary" data-act="fl-h-dec" data-v="1">${ic('check', 14)}Select</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${ic('award', 34)}<b>No candidate has cleared all rounds yet</b></div>`}</div>`;
    } else {
      const SE = h.cands.filter((c) => c.sel === true);
      body = SE.length ? `<div class="cl-queue">${SE.map((c) => { const n = docsDone(c), ok = c.ob.sent && n === DOCS.length; return `<div class="card pad" data-id="${c.id}"><div class="cl-q-h">${B.avatar(c.name, 40)}<div><b>${esc(c.name)}</b><span>${esc(h.title)} · ${esc(c.email)}</span></div>${c.emp ? pill('Selected') : ''}</div>
        <div class="as-act" style="margin:12px 0"><span class="muted">1. Onboarding form</span><span class="grow"></span>${c.ob.sent ? pill('Received') : `<button class="btn sm primary" data-act="fl-h-form">${ic('mail', 14)}Send form</button>`}</div>
        <h4 style="margin:6px 0 6px">2. Documents · ${n}/${DOCS.length}</h4><ul class="fl-docs">${DOCS.map((d, i) => `<li><label class="fl-chk"><input type="checkbox" class="fl-doc" data-d="${i}" ${c.ob.docs[d] ? 'checked' : ''} ${c.emp ? 'disabled' : ''}><span><b>${d}</b></span></label></li>`).join('')}</ul>
        <div class="as-act">${c.emp ? `<span class="fl-tag rep">${ic('user-check', 13)}Employee ${c.emp} created</span>` : `<span class="muted">3. Create the employee record when everything is in</span><span class="grow"></span><button class="btn sm primary" data-act="fl-h-emp" ${ok ? '' : 'disabled'}>${ic('user-plus', 14)}Create employee</button>`}</div></div>`; }).join('')}</div>` : `<div class="card pad empty">${ic('user-plus', 38)}<b>No one selected yet</b><span>Selected candidates get the onboarding form here.</span></div>`;
    }
    return `${B.head('Hiring Process', 'Post · collect CVs · sort by keyword · shortlist · interview with marking · onboard.', `<div style="min-width:260px">${sel(hs.map((x) => [x.id, `${x.id} · ${x.title}`]), h.id, 'data-chg="flhsel"')}</div><a class="btn" href="#/page/req-board">${ic('flag', 15)}Requisitions</a>`, crumbs('Recruitment', 'Hiring Process'))}
      <div class="card pad" style="margin-bottom:14px">${tracker(hSteps(h))}<div class="muted">${h.req} · ${esc(h.title)} · ${h.positions} position${h.positions > 1 ? 's' : ''}</div></div>
      <div class="filterbar">${tabs([['post', '1 · Post job'], ['cv', '2 · CVs & shortlist'], ['interview', '3 · Interviews'], ['select', '4 · Selection'], ['onboard', '5 · Onboarding']], t, 'fl-h-tab')}</div>${body}`;
  });
  B.chg.flhsel = (t) => { D().hsel = t.value; save(); rerender(); };
  B.act['fl-h-tab'] = (t) => { H().tab = t.dataset.t; save(); rerender(); };
  B.act['fl-h-post'] = () => {
    const h = H(), pick = B.$$('.fl-ch').filter((x) => x.checked && !x.disabled).map((x) => x.value); if (!pick.length) { B.toast('Tick at least one channel', 'bad'); return; }
    pick.forEach((c) => (h.channels[c] = { posted: true, at: today() })); const had = h.cands.length; h.cands = h.cands.concat(genCands(h, 16).filter((c, i) => i >= had && i < had + 6 * pick.length).map((c, i) => Object.assign(c, { id: 'c' + (had + i), src: pick[i % pick.length] })));
    if (!h.keywords) h.keywords = /engineer|developer|devops|qa/i.test(h.title) ? 'python, api, mysql, git' : 'communication, excel, sales';
    done(`Posted on ${pick.join(', ')}. ${h.cands.length} CVs collected`);
  };
  B.chg.flkw = (t) => { H().keywords = t.value; save(); rerender(); };
  B.act['fl-h-short'] = (t) => { const c = H().cands.find((x) => x.id === rid(t)); c.short = !c.short; save(); rerender(); };
  B.act['fl-h-suggest'] = () => { const h = H(); h.cands.forEach((c) => { if (scoreOf(c, h.keywords) >= 60) c.short = true; }); done('Ticked the strongest matches. HR can still change them'); };
  B.act['fl-h-round'] = () => B.modal({ title: 'Add interview round', body: grid(field('Round name', `<input class="inp" id="flm-n" value="Round ${H().rounds.length + 1} · ">`) + field('Out of', '<input type="number" class="inp" id="flm-m" value="100">') + field('Pass mark', '<input type="number" class="inp" id="flm-p" value="50">')), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="fl-h-doround">Add round</button>' });
  B.act['fl-h-doround'] = () => { const n = B.$('#flm-n').value.trim(); if (!n) { B.toast('Name the round', 'bad'); return; } H().rounds.push({ n, max: +B.$('#flm-m').value || 100, pass: +B.$('#flm-p').value || 50 }); done('Round added'); };
  B.act['fl-h-marks'] = (t) => { const h = H(), c = h.cands.find((x) => x.id === rid(t)); B.modal({ title: 'Interview marks · ' + esc(c.name), body: grid(h.rounds.map((r, i) => field(`${esc(r.n)} (pass ${r.pass}/${r.max})`, `<input type="number" min="0" max="${r.max}" class="inp fl-mk" data-i="${i}" value="${c.marks[i] == null ? '' : c.marks[i]}" placeholder="not held yet">`)).join('')), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="fl-h-domarks" data-id="${c.id}">Save marks</button>` }); };
  B.act['fl-h-domarks'] = (t) => { const h = H(), c = h.cands.find((x) => x.id === t.dataset.id); B.$$('.fl-mk').forEach((x) => { const i = +x.dataset.i; if (x.value === '') delete c.marks[i]; else c.marks[i] = Math.max(0, Math.min(h.rounds[i].max, +x.value)); }); done('Marks saved · ' + resultOf(h, c)); };
  B.act['fl-h-dec'] = (t) => { const h = H(), c = h.cands.find((x) => x.id === rid(t)), yes = t.dataset.v === '1'; if (yes && h.cands.filter((x) => x.sel === true).length >= h.positions) { B.toast('All positions are already filled by selected candidates', 'bad'); return; } c.sel = yes; done(yes ? c.name + ' selected. Onboarding form can be sent' : c.name + ' marked not selected'); };
  B.act['fl-h-form'] = (t) => { const c = H().cands.find((x) => x.id === rid(t)); c.ob.sent = true; done('Onboarding form emailed to ' + c.email); };
  document.addEventListener('change', (e) => { const t = e.target; if (!t.classList || !t.classList.contains('fl-doc')) return; const c = H().cands.find((x) => x.id === t.closest('[data-id]').dataset.id); c.ob.docs[DOCS[+t.dataset.d]] = t.checked; save(); rerender(); });
  B.act['fl-h-emp'] = (t) => {
    const h = H(), c = h.cands.find((x) => x.id === rid(t)); c.emp = 'HR-EMP-' + B.pad(++D().seq.emp, 5);
    if (h.cands.filter((x) => x.emp).length >= h.positions) { const r = reqById(h.req); if (r) r.state = 'Filled'; }
    done(`Employee record ${c.emp} created for ${c.name}`);
  };

  /* =====================================================================
     4. LEAVE APPROVALS
     ===================================================================== */
  const lvById = (id) => D().leaves.find((l) => l.id === id);
  const lvUsed = (emp, type) => D().leaves.filter((l) => l.emp === emp && l.type === type && overall(l.stages) !== 'Rejected' && l.status !== 'Cancelled').reduce((a, l) => a + l.days, 0);
  const lvStatus = (l) => (l.status === 'Cancelled' ? 'Cancelled' : overall(l.stages));
  const lvVisible = (l) => isHR() || l.emp === me().name || l.stages.some((s) => s.who === me().name);
  const lvCard = (l) => {
    const st = lvStatus(l), i = curIdx(l.stages), s = l.stages[i], hrOv = D().chains.leave.hrOverride;
    let acts = '';
    if (st === 'Pending' && s) {
      if (canAct(s)) acts = `<button class="btn sm" data-act="fl-lv-rej">${ic('x', 14)}Reject</button>${isHR() && hrOv && i < l.stages.length - 1 ? `<button class="btn sm" data-act="fl-lv-all" title="HR can approve at any stage">${ic('zap', 14)}HR: approve all stages</button>` : ''}<button class="btn sm primary" data-act="fl-lv-ap">${ic('check', 14)}Approve as ${isHR() && s.k !== 'hr' ? 'HR for ' : ''}${esc(lab(s))}</button>`;
      else acts = `<span class="muted">Waiting for ${esc(s.who)}</span>`;
      if (l.emp === me().name && !isHR()) acts += `<button class="btn sm" data-act="fl-lv-cancel">Cancel request</button>`;
    }
    const left = l.type === 'Leave Without Pay' ? '∞' : Math.max(0, (LEAVE_ALLOC[l.type] || 0) - lvUsed(l.emp, l.type));
    return `<div class="card pad fl-req" data-id="${l.id}"><div class="cl-q-h">${B.avatar(l.emp, 40)}<div><b>${esc(l.emp)} <em class="fl-id">${l.id}</em></b><span>${esc(l.type)} · ${fmtS(l.from)}${l.to !== l.from ? ' – ' + fmtS(l.to) : ''} · ${l.days} day${l.days > 1 ? 's' : ''}</span></div>${pill(st)}</div>
      <div class="fl-tags"><span class="fl-tag">${ic('tag', 13)}${esc(l.type)}</span><span class="fl-tag">${ic('pie', 13)}${left} day${left === 1 ? '' : 's'} left in this type</span></div>
      ${tracker(items(l.stages).concat([{ n: l.stages.length + 1, t: 'Approved', sub: st === 'Approved' ? 'Balance updated' : '', c: st === 'Approved' ? 'done' : '' }]))}
      <div class="as-note">${esc(l.reason)}</div><div class="as-act"><button class="btn sm" data-act="fl-lv-view">Approval trail</button><span class="grow"></span>${acts}</div></div>`;
  };
  page('leave-approvals', () => {
    const all = D().leaves.filter(lvVisible), t = F.lv.tab, c = (s) => all.filter((l) => lvStatus(l) === s).length, list = all.filter((l) => t === 'all' || lvStatus(l) === t);
    const mine = all.filter((l) => l.stages.some((s) => s.s === 'Pending' && canAct(s) && s === l.stages[curIdx(l.stages)])).length;
    return `${B.head(isHR() ? 'Leave Approvals' : 'My Leave & Team Approvals', 'Apply by leave type. Line Manager → Cross Line Manager → HR. HR can approve at any stage.', `<a class="btn" href="#/page/approval-chains">${ic('settings', 15)}Approval chain</a><button class="btn primary" data-act="fl-lv-new">${ic('plus', 16)}Apply for leave</button>`, crumbs('Leaves', 'Leave Approvals'))}
      ${kp([Kp('inbox', 'Waiting for me', mine, mine ? 'warn' : ''), Kp('clock', 'Pending', c('Pending')), Kp('check-circle', 'Approved', c('Approved'), 'ok'), Kp('x', 'Rejected', c('Rejected'), 'bad')])}
      <div class="filterbar">${tabs([['all', 'All'], ['Pending', 'Pending'], ['Approved', 'Approved'], ['Rejected', 'Rejected']], t, 'fl-lv-tab')}</div>
      <div class="cl-queue fl-queue">${list.map(lvCard).join('') || `<div class="card pad empty">${ic('calendar', 34)}<b>No leave requests</b></div>`}</div>`;
  });
  B.act['fl-lv-tab'] = (t) => { F.lv.tab = t.dataset.t; rerender(); };
  B.act['fl-lv-view'] = (t) => { const l = lvById(rid(t)); B.modal({ title: `${l.id} · ${esc(l.type)}`, wide: true, body: `<div class="cl-meta">${who(l.emp)}${pill(lvStatus(l))}<span>${fmt(l.from)}${l.to !== l.from ? ' → ' + fmt(l.to) : ''}</span></div><h4 style="margin:12px 0 8px">Approval trail</h4>${trail(l.stages)}`, foot: '<button class="btn primary" data-act="close-modal">Close</button>' }); };
  B.act['fl-lv-new'] = () => { const n = me().name; B.modal({ title: 'Apply for leave', wide: true, body: grid(field('Leave type', sel(Object.keys(LEAVE_ALLOC).map((k) => [k, `${k} (${k === 'Leave Without Pay' ? 'no limit' : Math.max(0, LEAVE_ALLOC[k] - lvUsed(n, k)) + ' days left'})`]), 'Casual Leave', 'id="flm-ty"')) + field('Approvers', `<input class="inp" value="${esc(D().chains.leave.stages.map(lab).join(' → '))}" disabled>`) + field('From', `<input type="date" class="inp" id="flm-f" value="${day(2)}">`) + field('To', `<input type="date" class="inp" id="flm-t" value="${day(2)}">`) + field('Reason', '<textarea class="inp" id="flm-r" rows="2"></textarea>', 1)), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="fl-lv-save">Submit</button>' }); };
  B.act['fl-lv-save'] = () => {
    const f = B.$('#flm-f').value, t = B.$('#flm-t').value || f, r = B.$('#flm-r').value.trim(), type = B.$('#flm-ty').value, n = me().name; if (!f || !r) { B.toast('Dates and reason are required', 'bad'); return; } if (t < f) { B.toast('End date is before the start date', 'bad'); return; }
    const days = Math.round((new Date(t) - new Date(f)) / 86400000) + 1; if (type !== 'Leave Without Pay' && days > LEAVE_ALLOC[type] - lvUsed(n, type)) { B.toast('Not enough ' + type + ' balance', 'bad'); return; }
    const e = B.emp(me().id), l = { id: nid('lv', 'LV-'), emp: n, type, from: f, to: t, days, reason: r, created: today(), stages: mkStages('leave', e, '', mgrName(e)) }; D().leaves.unshift(l); done(`${l.id} sent to ${l.stages[0].who}`);
  };
  B.act['fl-lv-ap'] = (t) => { const l = lvById(rid(t)), s = l.stages[curIdx(l.stages)], by = isHR() && s.k !== 'hr' ? 'Rahim Uddin (HR)' : s.who; approveOne(l.stages, by); done(overall(l.stages) === 'Approved' ? 'Fully approved. Leave balance updated' : 'Approved. Forwarded to ' + l.stages[curIdx(l.stages)].who); };
  B.act['fl-lv-all'] = (t) => { const l = lvById(rid(t)); approveAll(l.stages, 'Rahim Uddin'); done('Approved by HR at all remaining stages. Leave balance updated'); };
  B.act['fl-lv-cancel'] = (t) => { lvById(rid(t)).status = 'Cancelled'; done('Leave request cancelled'); };
  B.act['fl-lv-rej'] = (t) => B.modal({ title: 'Reject leave', body: field('Reason (visible to the employee)', '<textarea class="inp" id="flm-n" rows="3"></textarea>'), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="fl-lv-dorej" data-id="${rid(t)}">Reject</button>` });
  B.act['fl-lv-dorej'] = (t) => { const n = B.$('#flm-n').value.trim(); if (!n) { B.toast('Add a reason', 'bad'); return; } const l = lvById(t.dataset.id); rejectCur(l.stages, isHR() ? 'Rahim Uddin (HR)' : me().name, n); done('Leave rejected. Employee notified'); };

  /* =====================================================================
     5. ROSTERS + LATE RULES
     ===================================================================== */
  const rosterOf = (e) => { const R = D().rosters, a = D().assign[e.id]; if (a && R.find((r) => r.id === a)) return R.find((r) => r.id === a); if (e.dept === 'Management' || /^Head|^C[A-Z]O$|Director|Managing/.test(e.desig)) return R.find((r) => r.id === 'open'); if (e.dept === 'Customer Support') return R.find((r) => r.id === ['morning', 'evening', 'night'][B.hash(e.id) % 3]); return R[0]; };
  const mins = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  function classify(r, hhmm) {
    const L = D().late; if (r.type === 'Open') return { s: 'Open', d: 0, note: `Open roster: check in any time. ${r.hours} working hours are counted.` };
    let d = mins(hhmm) - mins(r.start); if (d < -720) d += 1440; if (d > 720) d -= 1440;
    if (d <= L.grace) return { s: 'On time', d, note: d <= 0 ? `Before roster start (${r.start}).` : `${d} min after ${r.start} is within the ${L.grace} min allowance.` };
    if (d <= L.extreme) return { s: 'Late', d, note: `${d} min after ${r.start}: more than ${L.grace} and up to ${L.extreme} min.` };
    return { s: 'Extreme late', d, note: `${d} min after ${r.start}: more than ${L.extreme} min.` };
  }
  const hhmm = (m) => B.pad(Math.floor(m / 60) % 24) + ':' + B.pad(m % 60);
  const hoursBetween = (a, b) => { let d = mins(b) - mins(a); if (d <= 0) d += 1440; return Math.round((d / 60) * 10) / 10; };
  page('roster-master', () => {
    const t = F.ro.tab, R = D().rosters, L = D().late; let body = '';
    if (t === 'rosters') {
      body = `<div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Roster</th><th>Type</th><th>Start</th><th>End</th><th>Working hours</th><th>Late rule</th><th>Employees</th></tr></thead><tbody>${R.map((r) => `<tr><td><b>${esc(r.name)}</b></td><td>${pill(r.type === 'Open' ? 'Open' : r.type)}</td><td>${r.start || 'Any time'}</td><td>${r.end || 'Any time'}</td><td>${r.hours} h${r.type === 'Open' ? ' per day' : ''}</td><td>${r.type === 'Open' ? '<span class="muted">Not applied</span>' : `On time ≤ ${L.grace} min`}</td><td>${emps().filter((e) => rosterOf(e).id === r.id).length}</td></tr>`).join('')}</tbody></table></div></div>
        <div class="as-note" style="margin-top:12px">${ic('clock', 14)} <b>Normal</b> is 09:30 – 18:30. <b>Open</b> staff can check in and out at any time and 8 working hours are counted each day. HR can add any number of custom rosters.</div>`;
    } else if (t === 'assign') {
      const rows = emps().filter((e) => !F.ro.dept || e.dept === F.ro.dept);
      body = `<div class="card pad" style="margin-bottom:14px"><h3 class="ct">Assign in bulk</h3><div class="fl-bulk">${sel([['', 'Department: choose']].concat(B.DEPTS.concat(['Management']).map((d) => [d, d])), '', 'id="fl-bd"')}${sel(R.map((r) => [r.id, r.name + (r.type === 'Open' ? ' (open)' : ' ' + r.start + '–' + r.end)]), 'normal', 'id="fl-br"')}<button class="btn primary" data-act="fl-ro-bulk">Apply to department</button></div></div>
        <div class="filterbar">${sel([['', 'Department: All']].concat(B.DEPTS.map((d) => [d, d])), F.ro.dept, 'data-chg="flrodept"')}</div>
        <div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Employee</th><th>Department</th><th>Designation</th><th>Assigned roster</th></tr></thead><tbody>${rows.map((e) => `<tr data-id="${e.id}"><td>${who(e.name)}</td><td>${esc(e.dept)}</td><td>${esc(e.desig)}</td><td>${sel(R.map((r) => [r.id, r.name + (r.type === 'Open' ? ' · open, 8 h' : ' · ' + r.start + '–' + r.end)]), rosterOf(e).id, 'data-chg="flroone"')}</td></tr>`).join('')}</tbody></table></div></div>`;
    } else if (t === 'rules') {
      body = `<div class="grid-2"><div class="card pad"><h3 class="ct">Late rule</h3><p class="muted" style="margin:0 0 12px">Measured from each employee's own roster start time. Open roster is exempt.</p>${grid(field('On time up to (min after start)', `<input type="number" min="0" class="inp" data-chg="flgrace" value="${L.grace}">`) + field('Late up to (min after start)', `<input type="number" min="1" class="inp" data-chg="flextreme" value="${L.extreme}">`))}<div class="as-note" style="margin-top:12px">${ic('alert', 14)} <b>Please confirm:</b> up to ${L.grace} min = on time, over ${L.grace} up to ${L.extreme} min = late, over ${L.extreme} min = extreme late.</div></div>
        <div class="card pad"><h3 class="ct">What it means for a 09:30 roster</h3><table class="dt"><thead><tr><th>Check-in</th><th>Status</th></tr></thead><tbody>${[['Up to ' + hhmm(570 + L.grace), 'On time'], [hhmm(570 + L.grace + 1) + ' – ' + hhmm(570 + L.extreme), 'Late'], ['After ' + hhmm(570 + L.extreme), 'Extreme late']].map((r) => `<tr><td>${r[0]}</td><td>${pill(r[1])}</td></tr>`).join('')}</tbody></table></div></div>`;
    } else {
      const s = F.ro.sim || { emp: emps()[14].id, time: '09:50' }, e = B.emp(s.emp), r = rosterOf(e), res = classify(r, s.time);
      body = `<div class="grid-2"><div class="card pad"><h3 class="ct">Try a check-in</h3>${grid(field('Employee', sel(emps().map((x) => [x.id, x.name]), s.emp, 'data-chg="flsimemp"')) + field('Check-in time', `<input type="time" class="inp" value="${s.time}" data-chg="flsimtime">`))}<p class="muted" style="margin-top:12px">Assigned roster: <b>${esc(r.name)}</b> ${r.type === 'Open' ? '(open, ' + r.hours + ' h)' : r.start + ' – ' + r.end}</p></div>
        <div class="card pad fl-sim ${res.s === 'On time' || res.s === 'Open' ? 'ok' : res.s === 'Late' ? 'warn' : 'bad'}"><h3 class="ct">Result</h3><div class="fl-big">${pill(res.s)}</div><p>${esc(res.note)}</p></div></div>`;
    }
    return `${B.head('Rosters & Late Rules', 'Normal, custom and open rosters. HR assigns a roster to every employee.', `<button class="btn primary" data-act="fl-ro-new">${ic('plus', 16)}Add custom roster</button>`, crumbs('Shift & Attendance', 'Rosters'))}
      <div class="filterbar">${tabs([['rosters', 'Rosters'], ['assign', 'Assignment'], ['rules', 'Late rules'], ['sim', 'Check-in tester']], t, 'fl-ro-tab')}</div>${body}`;
  });
  B.act['fl-ro-tab'] = (t) => { F.ro.tab = t.dataset.t; rerender(); };
  B.chg.flrodept = (t) => { F.ro.dept = t.value; rerender(); };
  B.chg.flroone = (t) => { D().assign[rid(t)] = t.value; save(); B.toast('Roster assigned'); };
  B.act['fl-ro-bulk'] = () => { const d = B.$('#fl-bd').value, r = B.$('#fl-br').value; if (!d) { B.toast('Choose a department', 'bad'); return; } const n = B.EMPLOYEES.filter((e) => e.dept === d && e.status !== 'Left'); n.forEach((e) => (D().assign[e.id] = r)); done(`${n.length} employees assigned to ${D().rosters.find((x) => x.id === r).name}`); };
  B.chg.flgrace = (t) => { D().late.grace = Math.max(0, +t.value || 0); if (D().late.extreme <= D().late.grace) D().late.extreme = D().late.grace + 1; save(); rerender(); };
  B.chg.flextreme = (t) => { D().late.extreme = Math.max(D().late.grace + 1, +t.value || 0); save(); rerender(); };
  B.chg.flsimemp = (t) => { F.ro.sim = Object.assign(F.ro.sim || { time: '09:50' }, { emp: t.value }); rerender(); };
  B.chg.flsimtime = (t) => { F.ro.sim = Object.assign(F.ro.sim || { emp: emps()[14].id }, { time: t.value || '09:30' }); rerender(); };
  B.act['fl-ro-new'] = () => B.modal({ title: 'Add custom roster', body: grid(field('Roster name', '<input class="inp" id="flm-n" placeholder="e.g. Early Bird">') + field('Working hours', '<input type="number" class="inp" id="flm-h" value="8" step="0.5">') + field('Start time', '<input type="time" class="inp" id="flm-s" value="08:00">') + field('End time', '<input type="time" class="inp" id="flm-e" value="17:00">')), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="fl-ro-save">Add roster</button>' });
  B.act['fl-ro-save'] = () => { const n = B.$('#flm-n').value.trim(); if (!n) { B.toast('Name the roster', 'bad'); return; } const s = B.$('#flm-s').value, e = B.$('#flm-e').value; D().rosters.push({ id: uid('r'), name: n, type: 'Custom', start: s, end: e, hours: +B.$('#flm-h').value || hoursBetween(s, e) }); done('Roster added'); };

  /* =====================================================================
     6. OFFICE ATTENDANCE — Tip Soi + ZKTeco
     ===================================================================== */
  const punches = () => emps().slice(0, 22).map((e) => {
    const r = rosterOf(e), rg = B.rng('pn' + e.id + today()), ro = r.type === 'Open' ? 600 : mins(r.start); let delay = Math.round(rg() * 52 - 16);
    if (B.hash(e.id) % 7 === 0) delay = 18 + Math.floor(rg() * 12); if (B.hash(e.id) % 11 === 0) delay = 36 + Math.floor(rg() * 25);
    const t = ro + delay, tip = rg() > 0.08 ? hhmm(t) : '', zk = rg() > 0.1 ? hhmm(t + (rg() > 0.5 ? 1 : 0)) : '', used = [tip, zk].filter(Boolean).sort()[0] || '';
    return { e, r, tip, zk, used, res: used ? classify(r, used) : null };
  });
  const ago = (ms) => Math.max(1, Math.round((Date.now() - ms) / 60000)) + ' min ago';
  page('office-attendance', () => {
    const P = punches(), D_ = D().devices, c = (s) => P.filter((p) => p.res && p.res.s === s).length;
    const dev = (k) => { const d = D_[k]; return `<div class="card pad"><div class="ct-row"><h3 class="ct">${ic(k === 'zk' ? 'fingerprint' : 'wifi', 17)} ${d.name}</h3>${pill(d.state)}</div><dl class="kv as-kv"><div><dt>Source</dt><dd>${d.model}</dd></div><div><dt>Location</dt><dd>${d.where}</dd></div><div><dt>Enrolled staff</dt><dd>${d.enrolled}</dd></div><div><dt>Last sync</dt><dd>${ago(d.last)}</dd></div><div><dt>Punches today</dt><dd>${P.filter((p) => (k === 'zk' ? p.zk : p.tip)).length}</dd></div></dl></div>`; };
    return `${B.head('Office Attendance', 'In-office attendance is captured from Tip Soi and one ZKTeco device and judged against each employee\'s roster.', `<button class="btn" data-act="fl-oa-sync">${ic('refresh', 15)}Sync devices</button><a class="btn primary" href="#/page/wfh-dash">${ic('home', 16)}Work From Home</a>`, crumbs('Shift & Attendance', 'Office Attendance'))}
      ${kp([Kp('user-check', 'Punched in today', P.filter((p) => p.used).length), Kp('check-circle', 'On time', c('On time') + c('Open'), 'ok'), Kp('clock', 'Late', c('Late'), 'warn'), Kp('alert', 'Extreme late', c('Extreme late'), 'bad'), Kp('x', 'No punch yet', P.filter((p) => !p.used).length)])}
      <section class="grid-2">${dev('tipsoi')}${dev('zk')}</section>
      <h3 class="ct" style="margin:20px 0 10px">Today's punches</h3>
      <div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Employee</th><th>Roster</th><th>Start</th><th>Tip Soi</th><th>ZKTeco</th><th>Counted</th><th>Status</th></tr></thead><tbody>${P.map((p) => `<tr><td>${who(p.e.name)}</td><td>${esc(p.r.name)}</td><td>${p.r.start || 'Any'}</td><td>${p.tip || '<span class="as-none">—</span>'}</td><td>${p.zk || '<span class="as-none">—</span>'}</td><td><b>${p.used || '—'}</b>${p.used && (!p.tip || !p.zk) ? '<em class="sub">from ' + (p.tip ? 'Tip Soi' : 'ZKTeco') + ' only</em>' : ''}</td><td>${p.res ? pill(p.res.s) + (p.res.s === 'Open' ? '<em class="sub">8 h counted</em>' : p.res.d > 0 ? `<em class="sub">${p.res.d} min after start</em>` : '') : pill('Waiting')}</td></tr>`).join('')}</tbody></table></div></div>`;
  });
  B.act['fl-oa-sync'] = () => { const d = D().devices; d.tipsoi.last = d.zk.last = Date.now(); save(); rerender(); B.toast('Tip Soi and ZKTeco synced'); };

  /* =====================================================================
     7. WFH — HR OPEN DATES
     ===================================================================== */
  page('wfh-open-dates', () => {
    const L = D().openDates.slice().sort((a, b) => b.date.localeCompare(a.date)), up = L.filter((o) => o.date >= today()).length;
    return `${B.head('HR Open Dates', 'On an open date nobody needs WFH approval. Employees just give attendance from home.', `<button class="btn primary" data-act="fl-od-new">${ic('plus', 16)}Add open date</button>`, crumbs('Work From Home', 'HR Open Dates'))}
      ${kp([Kp('calendar', 'Upcoming open dates', up, 'ok'), Kp('clock', 'Past open dates', L.length - up), Kp('check-circle', 'WFH approval chain', D().chains.wfh.stages.length + ' steps')])}
      <div class="as-note" style="margin-bottom:12px">${ic('alert', 14)} Normal WFH days go through: ${D().chains.wfh.stages.map(lab).join(' → ')}. HR can approve at any stage.</div>
      <div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Date</th><th>Reason</th><th>Set by</th><th>Status</th><th class="r"></th></tr></thead><tbody>${L.map((o) => `<tr data-id="${o.date}"><td><b>${fmt(o.date)}</b><em class="sub">${new Date(o.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long' })}</em></td><td>${esc(o.reason)}</td><td>${esc(o.by)}</td><td>${o.date === today() ? pill('Open') : o.date > today() ? B.pill('Upcoming', 'ok') : B.pill('Past', 'mute')}</td><td class="r">${o.date >= today() ? `<button class="btn sm" data-act="fl-od-del">${ic('trash', 14)}Remove</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty"><span>No open dates yet.</span></div></td></tr>'}</tbody></table></div></div>`;
  });
  B.act['fl-od-new'] = () => B.modal({ title: 'Add HR open date', body: grid(field('Date', `<input type="date" class="inp" id="flm-d" value="${day(1)}">`) + field('Reason', '<input class="inp" id="flm-r" placeholder="e.g. Transport strike">')) + `<p class="cl-hint">${ic('alert', 14)} Submitting makes every employee able to work from home on that date without an approval.</p>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="fl-od-save">Submit open date</button>' });
  B.act['fl-od-save'] = () => { const d = B.$('#flm-d').value, r = B.$('#flm-r').value.trim(); if (!d || !r) { B.toast('Date and reason are required', 'bad'); return; } if (isOpen(d)) { B.toast('That date is already open', 'bad'); return; } D().openDates.push({ date: d, reason: r, by: me().name }); done('Open date submitted. No WFH approval needed on ' + fmt(d)); };
  B.act['fl-od-del'] = (t) => { const d = t.closest('[data-id]').dataset.id; D().openDates = D().openDates.filter((o) => o.date !== d); done('Open date removed'); };
})();
