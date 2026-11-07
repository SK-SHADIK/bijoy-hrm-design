/* Sentradesk HRMS — Talent acquisition gaps: Rejection & Talent Pool, Offer management, Onboarding documents,
   Joining & first day (with no-show), Probation. Own localStorage db; reads the hiring flow db read-only. */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const KEY = 'bijoy-recruit2-db-v1', FLOWKEY = 'bijoy-flow-db-v1';
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const day = (n, from) => { const d = from ? new Date(from + 'T00:00') : new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const me = () => (B.role === 'employee' ? B.ME : B.ADMIN_EMP);
  const isHR = () => B.role !== 'employee';
  const who = (n) => `<span class="as-who">${B.avatar(n, 26)}<span>${esc(n)}</span></span>`;
  const Kp = (i, t, v, tn) => B.kpi(i, t, v, null, null, tn);
  const kp = (a) => `<section class="kpis sm lv-stats" style="grid-template-columns:repeat(${a.length},minmax(0,1fr))">${a.join('')}</section>`;
  const tabs = (list, cur, act) => `<div class="seg sm as-tabs">${list.map((t) => `<button class="${t[0] === cur ? 'on' : ''}" data-act="${act}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>`;
  const field = (l, c, full) => `<div class="fld" ${full ? 'style="grid-column:1/-1"' : ''}><label>${l}</label>${c}</div>`;
  const grid = (c) => `<div class="fgrid" style="grid-template-columns:1fr 1fr">${c}</div>`;
  const rid = (t) => t.closest('[data-id]').dataset.id;
  const crumbs = (m, l) => [{ label: 'HR', href: '#/' }, { label: m }, { label: l }];
  const sel = (opts, v, attrs) => `<select class="inp" ${attrs || ''}>${opts.map((o) => { const [val, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${val === v ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
  const PILL = { Draft: 'mute', Approval: 'warn', Approved: 'ok', Sent: 'info', Accepted: 'ok', Negotiating: 'warn', Declined: 'bad', Expired: 'bad', Cancelled: 'mute', Superseded: 'mute', Pending: 'warn', Submitted: 'info', Verified: 'ok', Rejected: 'bad', 'Talent Pool': 'info', Closed: 'mute', Considered: 'ok', Scheduled: 'info', 'In progress': 'warn', Active: 'ok', 'No-show': 'bad', Confirmed: 'ok', Extended: 'warn', Ended: 'bad', Overdue: 'bad', Probation: 'info' };
  const pill = (s) => B.pill(s, PILL[s] || 'mute');
  const money = (n) => B.money(n || 0);
  const nid = (p) => p + B.pad(++db.seq, 3);

  const DESIGS = [['Senior Backend Engineer', 'Engineering'], ['DevOps Engineer', 'Engineering'], ['UI/UX Designer', 'Design'], ['Sales Executive', 'Sales'], ['HR Executive', 'Human Resources'], ['Accounts Officer', 'Finance'], ['Customer Support Officer', 'Customer Support']];
  const deptOf = (d) => (DESIGS.find((x) => x[0] === d) || [0, 'Operations'])[1];
  const SK = { Engineering: ['python', 'api', 'mysql', 'git', 'docker', 'linux'], Design: ['figma', 'ux research', 'prototyping', 'branding'], Sales: ['negotiation', 'crm', 'communication', 'excel'], 'Human Resources': ['recruitment', 'payroll', 'labour law'], Finance: ['tally', 'excel', 'vat', 'audit'], 'Customer Support': ['communication', 'ticketing', 'bangla/english'] };
  const COMPS = [['Basic', 0.5], ['House Rent', 0.25], ['Medical', 0.1], ['Conveyance', 0.1], ['Mobile allowance', 0.05]];
  const split = (g) => { let left = g; return COMPS.map((c, i) => { const a = i === COMPS.length - 1 ? left : Math.round((g * c[1]) / 500) * 500; left -= a; return { n: c[0], a }; }); };
  const gross = (o) => o.comps.reduce((a, c) => a + c.a, 0);
  const DOCS = [
    { k: 'photo', l: 'Passport-size photo', m: 1 }, { k: 'nid', l: 'National ID / Passport', m: 1 }, { k: 'edu', l: 'Educational certificates', m: 1 },
    { k: 'exp', l: 'Experience / release letter', m: 1, exp: 1 }, { k: 'cv', l: 'Updated CV', m: 1 }, { k: 'bank', l: 'Bank / mobile-banking details', m: 1 },
    { k: 'emerg', l: 'Emergency contact & nominee', m: 1 }, { k: 'tin', l: 'TIN certificate (if available)', m: 0 }, { k: 'offer', l: 'Signed offer letter', m: 1 }, { k: 'ref', l: 'Reference / guarantor', m: 0 }
  ];
  const TASKS = [
    { k: 'idcard', l: 'ID card issued', g: 'Identity & access' }, { k: 'access', l: 'Email & system access created', g: 'Identity & access' },
    { k: 'assets', l: 'Asset handover form signed', g: 'Handover' }, { k: 'policy', l: 'Policy acknowledgement signed (Annex B)', g: 'Handover' },
    { k: 'roster', l: 'Roster assigned', g: 'Set-up' }, { k: 'leave', l: 'Leave balances set up', g: 'Set-up' }, { k: 'device', l: 'Attendance device enrolled', g: 'Set-up' }, { k: 'payroll', l: 'Payroll & bank details set up', g: 'Set-up' },
    { k: 'orient', l: 'Orientation done', g: 'Orientation' }
  ];
  const ASSET_DEFAULT = ['Laptop', 'Monitor', 'Headset', 'Access card', 'SIM / mobile'];

  /* ---------------- data ---------------- */
  let db = null;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  const D = () => { if (!db) { try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} if (!db || !db.offers) { seed(); save(); } expire(); } return db; };
  const flowDb = () => { try { return JSON.parse(localStorage.getItem(FLOWKEY)) || null; } catch (e) { return null; } };
  const ap = (i) => B.APPLICANTS[i % B.APPLICANTS.length];
  const skills = (desig, i) => { const p = SK[deptOf(desig)] || SK.Sales; return [p[i % p.length], p[(i + 2) % p.length], p[(i + 3) % p.length]].filter((x, j, a) => a.indexOf(x) === j); };
  const mkStages = (multi, status) => { const s = [{ t: 'HR', sub: '', k: 'hr', who: 'Rahim Uddin', s: 'Pending', by: '', at: '', note: '' }]; if (multi) s.push({ t: 'Higher management', sub: 'MD / Director', k: 'mgmt', who: 'Managing Director', s: 'Pending', by: '', at: '', note: '' }); if (status === 'Approved') s.forEach((x) => Object.assign(x, { s: 'Approved', by: x.who, at: day(-6) })); if (status === 'half') Object.assign(s[0], { s: 'Approved', by: s[0].who, at: day(-1) }); return s; };
  const mkOffer = (c) => Object.assign({ id: nid('OFR-'), cand: '', email: '', desig: '', dept: '', req: '', comps: split(60000), joining: day(20), probation: 3, valid: day(7), status: 'Draft', stages: [], rev: 0, revs: [], signed: '', sentAt: '', log: [], shortlist: [], after: '' }, c, { email: (c.cand || '').toLowerCase().replace(/\s+/g, '.') + '@gmail.com', dept: deptOf(c.desig) });
  function seed() {
    db = { seq: 0, emp: 80, multi: true, pending: [], cands: [], offers: [], onb: [], join: [], prob: [], docCfg: {}, tab: {}, sel: {} };
    const L = (o, m) => o.log.push({ at: today(), m });
    /* rejections */
    const R = [['Shafiq Rahman', 'Sales Executive', 'REQ-004', 'Round 1', 'Strong communication but limited CRM exposure', 'Talent Pool', 6], ['Mou Akter', 'UI/UX Designer', 'REQ-002', 'Shortlist', 'Portfolio below required level, good raw potential', 'Talent Pool', 9], ['Rashed Khan', 'Senior Backend Engineer', 'REQ-001', 'Round 2', 'Failed technical round (score 42/100)', 'Closed', 12], ['Tahmina Haque', 'Accounts Officer', 'REQ-003', 'Round 1', 'Salary expectation far above budget', 'Talent Pool', 20], ['Ariful Islam', 'DevOps Engineer', 'REQ-005', 'Round 2', 'Lacks production Linux experience', 'Talent Pool', 3], ['Nadia Sultana', 'Customer Support Officer', 'REQ-006', 'Shortlist', 'Not a culture fit in HR interview', 'Closed', 30], ['Hasibul Islam', 'Senior Backend Engineer', 'REQ-001', 'Round 1', 'Insufficient API design experience', 'Closed', 15]];
    R.forEach((r, i) => db.cands.push({ id: 'RJ-' + B.pad(i + 1, 3), name: r[0], desig: r[1], req: r[2], stage: r[3], reason: r[4], outcome: r[5], date: day(-r[6]), skills: skills(r[1], i), exp: 1 + (i % 5), considered: null, email: r[0].toLowerCase().replace(/\s+/g, '.') + '@gmail.com' }));
    db.cands[3].considered = { req: 'REQ-009 · Accounts Officer', at: day(-1) };
    db.pending = [{ name: 'Mahfuza Khatun', desig: 'HR Executive', req: 'REQ-007', stage: 'Round 1', skills: skills('HR Executive', 1), exp: 2 }, { name: 'Sabrina Yasmin', desig: 'Sales Executive', req: 'REQ-004', stage: 'Shortlist', skills: skills('Sales Executive', 2), exp: 4 }];
    /* offers */
    const O = [
      ['Sabrina Yasmin', 'Sales Executive', 'REQ-004', 52000, 'Draft', 0], ['Mahfuza Khatun', 'HR Executive', 'REQ-007', 48000, 'Approval', 0], ['Tahmina Haque', 'Accounts Officer', 'REQ-003', 55000, 'Approved', 0],
      ['Rashed Khan', 'Senior Backend Engineer', 'REQ-001', 95000, 'Sent', 0], ['Mou Akter', 'UI/UX Designer', 'REQ-002', 62000, 'Negotiating', 1], ['Ariful Islam', 'DevOps Engineer', 'REQ-005', 88000, 'Accepted', 0], ['Nadia Sultana', 'Customer Support Officer', 'REQ-006', 38000, 'Declined', 0], ['Hasibul Islam', 'Senior Backend Engineer', 'REQ-001', 90000, 'Expired', 0]
    ];
    O.forEach((r, i) => {
      const o = mkOffer({ cand: r[0], desig: r[1], req: r[2], comps: split(r[3]), status: r[4], rev: r[5], probation: i % 2 ? 6 : 3, joining: day(14 + i * 3), valid: r[4] === 'Expired' ? day(-3) : day(5 + i), shortlist: [ap(i + 8), ap(i + 10)], sentAt: ['Sent', 'Negotiating', 'Accepted', 'Declined', 'Expired'].includes(r[4]) ? day(-8) : '' });
      o.stages = mkStages(db.multi, r[4] === 'Draft' ? '' : r[4] === 'Approval' ? 'half' : 'Approved'); L(o, 'Offer prepared by HR');
      if (r[4] === 'Negotiating') { o.revs.push({ rev: 1, gross: 62000, note: 'Candidate asked ৳ 68,000 + earlier joining', at: day(-4) }); o.ask = 'Candidate asked ৳ 68,000 and joining 10 days earlier'; }
      if (r[4] === 'Accepted') { o.signed = 'signed-offer-ariful.pdf'; L(o, 'Accepted, signed copy received'); }
      if (r[4] === 'Declined') L(o, 'Candidate declined: accepted another offer');
      db.offers.push(o);
    });
    /* onboarding docs */
    const mk = (name, desig, off, due, st, exp) => { const o = { id: nid('ONB-'), cand: name, desig, offer: off, due, exp, docs: {}, rem: [], confirmed: false, assets: null, emp: '' }; DOCS.forEach((d, i) => { if (d.exp && !exp) return; const s = st[i % st.length]; o.docs[d.k] = { s, reason: s === 'Rejected' ? 'Image is blurry, please re-upload a clear scan' : '', at: s === 'Pending' ? '' : day(-2) }; }); return o; };
    db.onb = [
      mk('Ariful Islam', 'DevOps Engineer', 'OFR-006', day(4), ['Verified', 'Verified', 'Submitted', 'Verified'], true), mk('Sabrina Yasmin', 'Sales Executive', '', day(-2), ['Pending', 'Submitted', 'Pending'], false), mk('Mou Akter', 'UI/UX Designer', '', day(3), ['Submitted', 'Rejected', 'Verified'], true),
      mk('Tahmina Haque', 'Accounts Officer', '', day(6), ['Verified'], true), mk('Mahfuza Khatun', 'HR Executive', '', day(1), ['Verified', 'Submitted', 'Pending', 'Rejected'], false), mk('Hasibul Islam', 'Senior Backend Engineer', '', day(-1), ['Pending'], true)
    ];
    db.onb[3].docs.tin.s = 'Pending'; db.onb[3].docs.ref.s = 'Pending'; db.onb[3].docs.offer.s = 'Verified';
    db.docCfg = {};
    /* joining */
    const jt = (n) => { const t = {}; TASKS.slice(0, n).forEach((x) => (t[x.k] = true)); return t; };
    const J = [['Nusrat Jahan', 'Accounts Officer', day(0), false, 0, 'Scheduled'], ['Imran Hossain', 'Sales Executive', day(-1), true, 5, 'In progress'], ['Farhana Akter', 'HR Executive', day(-7), true, 9, 'Active'], ['Kamal Uddin', 'Customer Support Officer', day(4), true, 0, 'Scheduled'], ['Rubel Mia', 'DevOps Engineer', day(-3), true, 0, 'No-show'], ['Salma Begum', 'UI/UX Designer', day(9), false, 0, 'Scheduled']];
    db.join = J.map((r, i) => ({ id: nid('JN-'), cand: r[0], desig: r[1], joining: r[2], confirmed: r[3], tasks: jt(r[4]), status: r[5], emp: r[5] === 'Active' ? 'HR-EMP-0007' + i : '', assets: ['Laptop', 'Access card'], released: [], offer: '', log: [{ at: day(-10), m: 'Onboarding documents verified, employee record created' }].concat(r[5] === 'No-show' ? [{ at: day(-3), m: 'No-show on joining date. Offer cancelled, assets released, next candidate considered' }] : []) }));
    db.join[4].released = ['Laptop', 'Access card']; db.join[4].assets = [];
    /* probation */
    const E = B.EMPLOYEES.filter((e) => e.status === 'Active' && e.id !== 'HR-EMP-00001').slice(10, 18), P = [[-170, 6, 'Confirm'], [-60, 3, ''], [-80, 3, ''], [-100, 3, ''], [-30, 3, ''], [-150, 6, ''], [-10, 3, ''], [-200, 6, 'End']];
    db.prob = E.map((e, i) => { const p = P[i], end = day(p[1] * 30, day(p[0])), o = { id: 'PR-' + B.pad(i + 1, 3), emp: e.name, empId: e.id, desig: e.desig, dept: e.dept, lm: (B.emp(e.mgr) || {}).name || 'Rahim Uddin', salary: e.salary, start: day(p[0]), months: p[1], end, mid: null, fin: null, dec: null, exit: false }; if (i === 0) { o.fin = { rating: 4, comment: 'Delivers consistently, great team player.', at: day(-6), by: o.lm }; o.dec = { type: 'Confirm', at: day(-5), salary: e.salary, note: 'Confirmed as permanent' }; } if (i === 7) { o.fin = { rating: 2, comment: 'Repeated target misses despite coaching.', at: day(-9), by: o.lm }; o.dec = { type: 'End', at: day(-8), note: 'Performance below expectation' }; o.exit = true; } if (i === 2 || i === 5) o.mid = { rating: 3 + (i % 2), comment: 'On track, needs more ownership.', at: day(-20), by: o.lm }; if (i === 3) o.fin = { rating: 5, comment: 'Excellent. Recommend confirmation with increment.', at: day(-2), by: o.lm }; return o; });
  }
  function expire() { db.offers.forEach((o) => { if (o.status === 'Sent' && o.valid < today()) { o.status = 'Expired'; o.log.push({ at: today(), m: 'Offer validity passed, marked Expired automatically' }); } }); }
  const rerender = () => { const v = B.$('#view .fade'); if (v && PG[cur]) v.innerHTML = PG[cur](); };
  const PG = {}; let cur = '';
  const page = (n, fn) => { PG[n] = fn; B.page[n] = () => { cur = n; D(); return fn(); }; };
  const done = (msg) => { save(); B.closeModal(); rerender(); if (msg) B.toast(msg); };
  const tab = (p, d) => D().tab[p] || d;
  const mf = (title, id, label) => `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="${id}">${label}</button>`;
  const trail = (log) => `<ul class="fl-trail">${log.slice().reverse().map((l) => `<li class="approved"><b>${fmt(l.at)}</b><span>${esc(l.m)}</span></li>`).join('')}</ul>`;
  const tr = (st) => (B.flow && B.flow.tracker ? B.flow.tracker(B.flow.items(st)) : st.map((s) => `${esc(s.t)}: ${s.s}`).join(' → '));

  /* =====================================================================
     1. REJECTION & TALENT POOL
     ===================================================================== */
  const pendingList = () => {
    const d = D(), known = new Set(d.cands.map((c) => c.name)), list = d.pending.filter((p) => !known.has(p.name)).map((p) => Object.assign({ src: 'own' }, p)), f = flowDb();
    if (f && f.hirings) f.hirings.forEach((h) => (h.cands || []).forEach((c) => {
      const failed = h.rounds && h.rounds.some((r, i) => c.marks && c.marks[i] != null && c.marks[i] < r.pass);
      if (failed && !known.has(c.name) && !list.some((p) => p.name === c.name)) list.push({ src: 'flow', name: c.name, desig: h.title, req: h.req, stage: 'Interview', skills: c.skills || [], exp: c.exp || 0 });
    }));
    return list;
  };
  const noticeText = (c) => `Dear ${c.name},\n\nThank you for your interest in the ${c.desig} position at Sentradesk and for the time you invested in our selection process (stage: ${c.stage}). After careful consideration we will not be moving forward with your application.\n\n${c.outcome === 'Talent Pool' ? 'With your consent we will keep your profile in our talent pool and contact you when a suitable vacancy opens.' : 'Your application is now closed.'}\n\nWe wish you every success.\nHR, Sentradesk`;
  const ORDER = ['Shortlist', 'Round 1', 'Round 2', 'Round 3 · HR'];
  const stageChip = (st) => { const i = Math.max(0, ORDER.indexOf(st === 'Interview' ? 'Round 1' : st)); return `<span class="rj-st"><span class="rj-dots">${ORDER.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</span>${esc(st)}</span>`; };
  const ago = (iso) => { const n = Math.round((new Date() - new Date(iso + 'T00:00')) / 864e5); return n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : n + ' days ago'; };
  page('candidate-rejections', () => {
    const d = D(), t = tab('rj', 'pending'), pend = pendingList(), pool = d.cands.filter((c) => c.outcome === 'Talent Pool'), q = (d.q || '').toLowerCase(), lf = d.lf || 'all';
    const poolShown = pool.filter((c) => !q || (c.name + c.skills.join(' ') + c.desig).toLowerCase().includes(q));
    let body = '';
    if (t === 'pending') body = pend.length ? `<div class="rj-banner">${ic('mail', 16)}<div><b>${pend.length} candidate${pend.length > 1 ? 's' : ''} not yet informed</b><span>Sending a notice needs a reason and a decision: close the file, or keep the profile in the Talent Pool.</span></div></div>
      <div class="rj-list">${pend.map((p, i) => `<div class="card rj-row" data-id="${i}">${B.avatar(p.name, 44)}<div class="rj-main"><b>${esc(p.name)}</b><span>${esc(p.desig)} · ${esc(p.req)}</span></div><div class="rj-mid">${stageChip(p.stage)}</div><div class="rj-mid">${p.src === 'flow' ? '<span class="pill bad"><i></i>Failed round</span>' : '<span class="pill mute"><i></i>Manual entry</span>'}</div>${(p.skills || []).length ? `<div class="rj-sk">${p.skills.slice(0, 3).map((x) => `<span class="fl-tag">${esc(x)}</span>`).join('')}</div>` : ''}<button class="btn primary" data-act="rj-new" data-i="${i}">${ic('send', 15)}Send notice</button></div>`).join('')}</div>`
      : `<div class="card pad empty">${ic('check-circle', 38)}<b>No pending rejections</b><span>Every rejected candidate has been informed.</span></div>`;
    else if (t === 'log') {
      const L = d.cands.filter((c) => lf === 'all' || c.outcome === lf);
      const by = ORDER.concat(['Interview']).map((s) => ({ label: s, value: d.cands.filter((c) => c.stage === s).length })).filter((x) => x.value);
      body = `<section class="dx-2 rj-an"><div class="card pad"><div class="ct-row"><h3 class="ct">Rejected by stage</h3></div>${by.length ? B.hbars(by, { multi: true }) : '<p class="muted">No data yet.</p>'}</div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Outcome after notice</h3></div>${B.donut([{ label: 'Closed', value: d.cands.filter((c) => c.outcome === 'Closed').length }, { label: 'Talent Pool', value: pool.length }], { center: d.cands.length, label: 'Notices sent' })}</div></section>
      <div class="filterbar"><div class="seg">${['all', 'Closed', 'Talent Pool'].map((x) => `<button class="${lf === x ? 'on' : ''}" data-act="rj-of" data-v="${x}">${x === 'all' ? 'All outcomes' : x}</button>`).join('')}</div></div>
      <div class="card table-card"><div class="tscroll"><table class="dt iv-t"><thead><tr><th>Candidate</th><th>Position</th><th>Stage</th><th>Reason on file</th><th>Outcome</th><th>Notice sent</th><th class="r"></th></tr></thead><tbody>${L.map((c) => `<tr data-id="${c.id}"><td>${who(c.name)}</td><td>${esc(c.desig)}<em class="sub">${esc(c.req)}</em></td><td>${stageChip(c.stage)}</td><td class="rj-rs" title="${esc(c.reason)}">${esc(c.reason)}</td><td>${pill(c.outcome)}</td><td>${fmt(c.date)}<em class="sub">${ago(c.date)}</em></td><td class="r"><button class="btn sm" data-act="rj-view">${ic('mail', 14)}View notice</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">No records.</td></tr>'}</tbody></table></div></div>`;
    } else body = `<div class="filterbar"><label class="search">${ic('search', 16)}<input class="inp" placeholder="Search name, skill or position…" value="${esc(d.q || '')}" data-chg="rjq"></label><span class="muted">${poolShown.length} of ${pool.length} profiles</span></div>
      ${poolShown.length ? `<div class="rj-pool">${poolShown.map((c) => `<div class="card rj-pc" data-id="${c.id}"><div class="rj-pch">${B.avatar(c.name, 46)}<div><b>${esc(c.name)}</b><span>${esc(c.desig)} · ${c.exp} yr${c.exp > 1 ? 's' : ''} exp</span></div></div>
        <div class="rj-sk">${c.skills.map((x) => `<span class="fl-tag">${esc(x)}</span>`).join('')}</div>
        <p class="rj-q">${ic('message', 13)}${esc(c.reason)}</p>
        <div class="rj-pcf"><span class="muted">${ic('calendar', 12)} Added ${ago(c.date)} · ${esc(c.req)}</span>${c.considered ? `<span class="pill ok"><i></i>Considered · ${esc(c.considered.req.split(' · ')[0])}</span>` : `<button class="btn sm primary" data-act="rj-consider">${ic('user-plus', 14)}Consider</button>`}</div></div>`).join('')}</div>` : `<div class="card pad empty">${ic('users', 38)}<b>No matching candidates</b><span>Try a different search.</span></div>`}`;
    return `${B.head('Rejection & Talent Pool', 'Tell not-selected candidates with a recorded reason, then close the file or keep a good profile in the Talent Pool.', `<button class="btn primary" data-act="rj-new">${ic('plus', 16)}Reject a candidate</button>`, crumbs('Recruitment', 'Rejection & Talent Pool'))}
    ${kp([Kp('x', 'Rejected (noticed)', d.cands.length, 'bad'), Kp('mail', 'Awaiting notice', pend.length, 'warn'), Kp('users', 'In talent pool', pool.length, 'info'), Kp('check-circle', 'Closed', d.cands.filter((c) => c.outcome === 'Closed').length), Kp('user-plus', 'Considered again', d.cands.filter((c) => c.considered).length, 'ok')])}
    <div class="filterbar">${tabs([['pending', 'Awaiting notice <span class="count">' + pend.length + '</span>'], ['log', 'Rejection log <span class="count">' + d.cands.length + '</span>'], ['pool', 'Talent Pool <span class="count">' + pool.length + '</span>']], t, 'rj-tab')}</div>${body}`;
  });
  B.act['rj-of'] = (t) => { D().lf = t.dataset.v; save(); rerender(); };
  B.act['rj-tab'] = (t) => { D().tab.rj = t.dataset.t; save(); rerender(); };
  B.chg.rjq = (t) => { D().q = t.value; rerender(); const i = B.$('[data-chg="rjq"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
  B.act['rj-new'] = (t) => {
    const p = t.dataset.i != null && t.dataset.i !== '' ? pendingList()[+t.dataset.i] : null, pr = p || { name: '', desig: DESIGS[0][0], req: 'REQ-001', stage: 'Shortlist', skills: [] };
    B.modal({ title: 'Rejection notice', wide: true, body: `${grid(field('Candidate', `<input class="inp" id="rj-n" value="${esc(pr.name)}" ${p ? 'readonly' : ''}>`) + field('Position', sel(DESIGS.map((x) => x[0]), pr.desig, 'id="rj-d"')) + field('Requisition', `<input class="inp" id="rj-r" value="${esc(pr.req)}">`) + field('Rejected at', sel(['Shortlist', 'Round 1', 'Round 2', 'Round 3 · HR', 'Interview'], pr.stage, 'id="rj-s"')) + field('Skills / tags (comma separated)', `<input class="inp" id="rj-k" value="${esc((pr.skills || []).join(', '))}">`, 1) + field('Reason (required, kept on file)', '<textarea class="inp" id="rj-w" rows="3" placeholder="e.g. Failed technical round"></textarea>', 1))}
    <div class="fld"><label>After the notice</label><div style="display:flex;gap:18px"><label class="fl-chk"><input type="radio" name="rj-o" value="Closed" checked><span><b>Close</b> the candidate file</span></label><label class="fl-chk"><input type="radio" name="rj-o" value="Talent Pool"><span><b>Keep in Talent Pool</b> for future vacancies</span></label></div></div>
    <input type="hidden" id="rj-exp" value="${pr.exp || 2}">`, foot: mf('', 'rj-save', 'Send notice') });
  };
  B.act['rj-save'] = () => {
    const n = B.$('#rj-n').value.trim(), w = B.$('#rj-w').value.trim(); if (!n) { B.toast('Candidate name is required', 'bad'); return; } if (!w) { B.toast('A rejection reason is required', 'bad'); return; }
    const d = D(), desig = B.$('#rj-d').value, o = B.$$('[name="rj-o"]').find((x) => x.checked).value;
    const c = { id: 'RJ-' + B.pad(d.cands.length + 1, 3), name: n, desig, req: B.$('#rj-r').value.trim(), stage: B.$('#rj-s').value, reason: w, outcome: o, date: today(), skills: B.$('#rj-k').value.split(',').map((x) => x.trim()).filter(Boolean), exp: +B.$('#rj-exp').value, considered: null, email: n.toLowerCase().replace(/\s+/g, '.') + '@gmail.com' };
    d.cands.unshift(c); d.pending = d.pending.filter((p) => p.name !== n); done(`Notice sent to ${c.email}. ${o === 'Talent Pool' ? 'Added to Talent Pool' : 'File closed'}`);
  };
  B.act['rj-view'] = (t) => { const c = D().cands.find((x) => x.id === rid(t)); B.modal({ title: 'Rejection notice · ' + esc(c.name), body: `<pre style="white-space:pre-wrap;font:inherit">${esc(noticeText(c))}</pre><p class="muted">Reason on file: ${esc(c.reason)}</p>`, foot: '<button class="btn" data-act="close-modal">Close</button>' }); };
  B.act['rj-consider'] = (t) => {
    const f = flowDb(), reqs = ((f && f.reqs) || []).filter((r) => r.state === 'Hiring' || r.state === 'Approval').map((r) => `${r.id} · ${r.desig}`).concat(['REQ-009 · Accounts Officer', 'REQ-010 · Sales Executive']);
    B.modal({ title: 'Consider for vacancy', body: field('Open vacancy', sel(reqs, reqs[0], 'id="rj-v"')) + '<p class="muted">The candidate is flagged for the hiring team; HR contacts them to confirm interest.</p>', foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="rj-doconsider" data-id="${rid(t)}">Consider</button>` });
  };
  B.act['rj-doconsider'] = (t) => { const c = D().cands.find((x) => x.id === t.dataset.id); c.considered = { req: B.$('#rj-v').value, at: today() }; done(c.name + ' flagged for ' + c.considered.req); };

  /* =====================================================================
     2. OFFER MANAGEMENT
     ===================================================================== */
  const offById = (id) => D().offers.find((o) => o.id === id);
  const curSt = (o) => o.stages.findIndex((s) => s.s === 'Pending');
  const letter = (o) => `<div class="card pad" style="background:var(--bg,#fff)"><p style="text-align:right">${fmt(today())}</p><p>Dear <b>${esc(o.cand)}</b>,</p><p>We are pleased to offer you the position of <b>${esc(o.desig)}</b> (${esc(o.dept)}) at Sentradesk${o.rev ? ` (revised offer, revision ${o.rev})` : ''}.</p><table class="dt"><thead><tr><th>Salary component</th><th class="r">Monthly</th></tr></thead><tbody>${o.comps.map((c) => `<tr><td>${esc(c.n)}</td><td class="r">${money(c.a)}</td></tr>`).join('')}<tr><td><b>Gross salary</b></td><td class="r"><b>${money(gross(o))}</b></td></tr></tbody></table><p>Proposed joining date: <b>${fmt(o.joining)}</b>. Probation period: <b>${o.probation} months</b>. This offer is valid until <b>${fmt(o.valid)}</b>; please return a signed copy by then.</p><p>Regards,<br><b>Rahim Uddin</b>, HR</p></div>`;
  const offerActs = (o) => {
    const a = [], st = o.status;
    if (st === 'Draft') a.push(['of-sub', 'Submit for approval', 'primary'], ['of-edit', 'Edit', '']);
    if (st === 'Approval') { const s = o.stages[curSt(o)]; if (s && (isHR() || s.who === me().name)) a.push(['of-ap', 'Approve', 'primary'], ['of-rej', 'Reject', '']); }
    if (st === 'Approved') a.push(['of-prev', 'Preview & send', 'primary']);
    if (st === 'Sent') a.push(['of-acc', 'Accept', 'primary'], ['of-neg', 'Negotiate', ''], ['of-dec', 'Decline', '']);
    if (st === 'Negotiating') a.push(['of-rev', 'Revise offer', 'primary']);
    if ((st === 'Declined' || st === 'Expired') && !o.after) a.push(['of-next', 'Offer to next shortlisted', 'primary'], ['of-reopen', 'Reopen requisition', '']);
    return a;
  };
  const btns = (a, sm) => a.map((x) => `<button class="btn ${sm ? 'sm ' : ''}${x[2]}" data-act="${x[0]}">${x[1]}</button>`).join('');
  const dleft = (iso) => Math.round((new Date(iso + 'T00:00') - new Date(new Date().toDateString())) / 864e5);
  const OPEN = ['Draft', 'Approval', 'Approved', 'Sent', 'Negotiating'], CLOSED = ['Declined', 'Expired', 'Cancelled', 'Superseded'];
  const validTag = (o) => { if (!OPEN.includes(o.status)) return `<span class="muted">${fmt(o.valid)}</span>`; const n = dleft(o.valid); return `${fmt(o.valid)}<em class="sub ${n <= 3 ? 'of-late' : ''}">${n < 0 ? 'Overdue' : n === 0 ? 'Expires today' : 'in ' + n + ' days'}</em>`; };
  const apDots = (o) => (o.stages.length && o.status === 'Approval' ? `<span class="of-ad">${o.stages.map((s) => `<i class="${s.s === 'Approved' ? 'on' : ''}" title="${esc(s.t)}: ${s.s}"></i>`).join('')}</span>` : '');
  page('offers', () => {
    const d = D(); if (d.sel.of && offById(d.sel.of)) return offerDetail(offById(d.sel.of));
    const t = tab('of', 'all'), q = (d.oq || '').toLowerCase();
    const L = d.offers.filter((o) => (t === 'all' || (t === 'open' ? OPEN.includes(o.status) : t === 'closed' ? CLOSED.includes(o.status) : o.status === 'Accepted')) && (!q || (o.cand + o.desig + o.id + o.req).toLowerCase().includes(q)));
    const n = (s) => d.offers.filter((o) => o.status === s).length;
    const pipe = [['Draft', 'Draft', 'var(--text-3)'], ['Approval', 'Approval', 'var(--warn)'], ['Approved', 'Approved', 'var(--c3)'], ['Sent', 'Sent', 'var(--accent)'], ['Negotiating', 'Negotiating', 'var(--c4)'], ['Accepted', 'Accepted', 'var(--ok)'], ['Declined', 'Declined', 'var(--bad)'], ['Expired', 'Expired', 'var(--bad)']];
    const total = d.offers.length || 1, value = d.offers.filter((o) => ['Accepted', 'Sent', 'Negotiating', 'Approved'].includes(o.status)).reduce((a, o) => a + gross(o), 0);
    return `${B.head('Offer Management', 'Prepare, approve, send and track offers. Declined or expired offers move to the next shortlisted candidate or reopen the requisition.', `<button class="btn primary" data-act="of-new">${ic('plus', 16)}New offer</button>`, crumbs('Recruitment', 'Offers'))}
    ${kp([Kp('file', 'Awaiting approval', n('Approval'), 'warn'), Kp('send', 'Sent / negotiating', n('Sent') + n('Negotiating'), 'info'), Kp('check-circle', 'Accepted', n('Accepted'), 'ok'), Kp('x', 'Declined', n('Declined'), 'bad'), Kp('clock', 'Expired', n('Expired'), 'bad'), Kp('dollar', 'Monthly CTC in play', money(value), 'info')])}
    <div class="card pad of-pipe"><div class="of-ph"><div><b>Offer pipeline</b><span>${d.offers.length} offers across all stages</span></div><label class="of-chain"><span>${ic('shield', 14)}Approval chain</span>${sel([['single', 'Single stage · HR'], ['multi', 'Two stages · HR → Management']], d.multi ? 'multi' : 'single', 'data-chg="ofchain"')}</label></div>
      <div class="iv-bar of-bar">${pipe.map((x) => (n(x[0]) ? `<u style="flex:${n(x[0])};background:${x[2]}" data-tip="${x[1]}: ${n(x[0])}"></u>` : '')).join('')}</div>
      <div class="of-leg">${pipe.map((x) => `<span><i style="background:${x[2]}"></i>${n(x[0])}<em>${x[1]}</em></span>`).join('')}</div></div>
    <div class="filterbar">${tabs([['all', 'All'], ['open', 'In progress'], ['acc', 'Accepted'], ['closed', 'Declined / expired']], t, 'of-tab')}<label class="search">${ic('search', 16)}<input class="inp" placeholder="Search candidate, position, offer no…" value="${esc(d.oq || '')}" data-chg="ofq"></label></div>
    <div class="card table-card"><div class="tscroll"><table class="dt iv-t of-t"><thead><tr><th>Candidate</th><th>Position</th><th class="r">Monthly gross</th><th>Joining</th><th>Valid till</th><th>Status</th><th class="r">Next step</th></tr></thead><tbody>${L.map((o) => { const a = offerActs(o), pr = a.find((x) => x[2] === 'primary'); return `<tr data-id="${o.id}" data-act="of-open"><td><span class="who">${B.avatar(o.cand, 36)}<span><b>${esc(o.cand)}</b><em class="sub">${o.id}${o.rev ? ' · rev ' + o.rev : ''}</em></span></span></td><td>${esc(o.desig)}<em class="sub">${esc(o.dept)} · ${esc(o.req)}</em></td><td class="r"><b>${money(gross(o))}</b><em class="sub">${o.probation} mo probation</em></td><td>${fmt(o.joining)}</td><td>${validTag(o)}</td><td>${pill(o.status)}${apDots(o)}${o.after ? `<em class="sub">${esc(o.after)}</em>` : ''}</td><td class="r">${pr ? `<button class="btn sm primary" data-act="${pr[0]}">${pr[1]}</button>` : ''}<button class="btn sm" data-act="of-open">${ic('right', 14)}View</button></td></tr>`; }).join('') || `<tr><td colspan="7"><div class="empty">${ic('file', 34)}<b>No offers here</b></div></td></tr>`}</tbody></table></div></div>`;
  });
  B.chg.ofq = (t) => { D().oq = t.value; rerender(); const i = B.$('[data-chg="ofq"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
  B.act['of-open'] = (t, e) => { if (e && e.target.closest('button:not([data-act="of-open"]),a,select,input')) return; D().sel.of = rid(t); save(); rerender(); window.scrollTo(0, 0); };
  B.act['of-view'] = B.act['of-open'];
  B.act['of-back'] = () => { D().sel.of = null; save(); rerender(); window.scrollTo(0, 0); };

  /* ----- detailed view ----- */
  const offerDetail = (o) => {
    const g = gross(o), st = o.status, ix = ['Draft', 'Approval', 'Approved', 'Sent', 'Negotiating', 'Accepted'].indexOf(st);
    const steps = [['Prepared', fmt((o.log[0] || {}).at || today()), 'done'], ['Approval', st === 'Draft' ? 'Not submitted' : st === 'Approval' ? 'In progress' : 'Approved', st === 'Draft' ? '' : st === 'Approval' ? 'now' : 'done'],
      ['Sent to candidate', o.sentAt ? fmt(o.sentAt) : '—', ['Sent', 'Negotiating', 'Accepted', 'Declined', 'Expired'].includes(st) ? 'done' : st === 'Approved' ? 'now' : ''],
      ['Candidate response', st === 'Accepted' ? 'Accepted' : st === 'Declined' ? 'Declined' : st === 'Expired' ? 'Expired' : st === 'Negotiating' ? 'Negotiating' : st === 'Sent' ? 'Awaiting reply' : '—', st === 'Accepted' ? 'done' : st === 'Declined' || st === 'Expired' ? 'bad' : st === 'Sent' || st === 'Negotiating' ? 'now' : ''],
      ['Joining', st === 'Accepted' ? fmt(o.joining) : 'Expected ' + fmt(o.joining), st === 'Accepted' ? 'now' : '']];
    const nleft = dleft(o.valid), a = offerActs(o);
    const kv = (l, v) => `<div><span>${l}</span><b>${v}</b></div>`;
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Recruitment' }, { label: 'Offers', href: '#/page/offers' }, { label: o.cand }])}<h1>${esc(o.cand)} ${pill(st)}</h1><p class="sub">${o.id} · ${esc(o.desig)} · ${esc(o.dept)} · ${esc(o.req)}${o.rev ? ' · revision ' + o.rev : ''}</p></div>
        <div class="head-actions" data-id="${o.id}"><button class="btn" data-act="of-back">${ic('left', 16)}All offers</button>${btns(a)}</div></div>
      <section class="iv-kpis">${kp2('dollar', 'Monthly gross', money(g), 'a')}${kp2('dollar', 'Annual CTC', money(g * 12), 'b')}${kp2('calendar', 'Joining date', fmt(o.joining), 'a')}${kp2('clock', 'Offer validity', OPEN.includes(st) ? (nleft < 0 ? 'Overdue' : nleft + ' days left') : fmt(o.valid), nleft <= 3 && OPEN.includes(st) ? 'e' : 'c')}${kp2('shield', 'Probation', o.probation + ' months', 'd')}</section>
      <div class="iv-cwrap"><div class="iv-main">
        <div class="card pad iv-prof">${B.avatar(o.cand, 72)}<div class="ivpf-i"><b>${esc(o.cand)}</b><span>${esc(o.email)}</span><div class="ivpf-m"><span>${ic('briefcase', 13)}${esc(o.desig)}</span><span>${ic('org', 13)}${esc(o.dept)}</span><span>${ic('file', 13)}${esc(o.req)}</span></div>${o.signed ? `<span class="pill ok"><i></i>Signed copy: ${esc(o.signed)}</span>` : ''}</div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Compensation breakdown</h3><span class="pill info">${money(g * 12)} / year</span></div>
          <table class="dt jo-comp"><thead><tr><th>Component</th><th class="r">Monthly</th><th class="r">Annual</th><th class="r">Share</th></tr></thead><tbody>${o.comps.map((c) => `<tr><td>${esc(c.n)}</td><td class="r">${money(c.a)}</td><td class="r">${money(c.a * 12)}</td><td class="r muted">${Math.round((c.a / g) * 100)}%</td></tr>`).join('')}</tbody><tfoot><tr><td>Total gross</td><td class="r">${money(g)}</td><td class="r">${money(g * 12)}</td><td></td></tr></tfoot></table></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Offer terms</h3></div><div class="jo-kv">${kv('Designation', esc(o.desig))}${kv('Department', esc(o.dept))}${kv('Requisition', esc(o.req))}${kv('Probation', o.probation + ' months')}${kv('Proposed joining', fmt(o.joining))}${kv('Offer valid until', fmt(o.valid))}${kv('Offer sent', o.sentAt ? fmt(o.sentAt) : 'Not sent')}${kv('Revision', o.rev || 'Original')}</div></div>
        ${o.revs.length ? `<div class="card pad"><div class="ct-row"><h3 class="ct">Negotiation & revisions</h3></div><table class="dt"><thead><tr><th>Rev</th><th>Date</th><th class="r">Gross</th><th>Note</th></tr></thead><tbody>${o.revs.map((r) => `<tr><td>#${r.rev}</td><td>${fmt(r.at)}</td><td class="r">${money(r.gross)}</td><td>${esc(r.note || '—')}</td></tr>`).join('')}</tbody></table></div>` : ''}
        <div class="card pad"><div class="ct-row"><h3 class="ct">Offer letter preview</h3><button class="btn sm" data-act="toast" data-msg="Letter downloaded">${ic('download', 14)}Download</button></div>${letter(o)}</div>
      </div>
      <aside class="iv-side">
        <div class="card pad"><div class="ct-row"><h3 class="ct">Offer progress</h3></div><ul class="jo-tl">${steps.map((x) => `<li class="${x[2]}"><i></i><div><b>${x[0]}</b><span>${x[1]}</span></div></li>`).join('')}</ul></div>
        ${o.stages.length ? `<div class="card pad"><div class="ct-row"><h3 class="ct">Approval chain</h3></div><div class="of-apv">${o.stages.map((s) => `<div class="${s.s === 'Approved' ? 'ok' : s.s === 'Rejected' ? 'bad' : ''}">${B.avatar(s.who, 32)}<div><b>${esc(s.who)}</b><span>${esc(s.t)}${s.at ? ' · ' + fmt(s.at) : ''}</span>${s.note ? `<em>${esc(s.note)}</em>` : ''}</div>${pill(s.s)}</div>`).join('')}</div></div>` : ''}
        <div class="card pad"><div class="ct-row"><h3 class="ct">Activity</h3><span class="count">${o.log.length}</span></div>${trail(o.log)}</div>
      </aside></div>`;
  };
  const kp2 = (i, l, v, c) => `<div class="card ivk"><span class="ivk-i ${c}">${ic(i, 18)}</span><div><b>${v}</b><span>${l}</span></div></div>`;
  B.act['of-tab'] = (t) => { D().tab.of = t.dataset.t; save(); rerender(); };
  B.chg.ofchain = (t) => { D().multi = t.value === 'multi'; save(); rerender(); B.toast('New offers will use ' + (D().multi ? 'two-stage' : 'single-stage') + ' approval'); };
  const offForm = (o) => { const c = o.comps; return grid(field('Candidate', `<input class="inp" id="of-c" value="${esc(o.cand)}">`) + field('Designation', sel(DESIGS.map((x) => x[0]), o.desig || DESIGS[0][0], 'id="of-d"')) + field('Requisition', `<input class="inp" id="of-r" value="${esc(o.req || 'REQ-001')}">`) + field('Probation (months)', `<input type="number" min="0" max="12" class="inp" id="of-p" value="${o.probation}">`) + field('Proposed joining date', `<input type="date" class="inp" id="of-j" value="${o.joining}">`) + field('Offer valid until', `<input type="date" class="inp" id="of-v" value="${o.valid}">`)) + `<h4 style="margin:10px 0 6px">Salary structure (monthly)</h4>` + grid(c.map((x, i) => field(esc(x.n), `<input type="number" min="0" class="inp of-k" data-i="${i}" value="${x.a}">`)).join('')); };
  const readOffer = (o) => {
    const c = B.$('#of-c').value.trim(), j = B.$('#of-j').value, v = B.$('#of-v').value, comps = B.$$('.of-k').map((x, i) => ({ n: o.comps[i].n, a: Math.max(0, +x.value || 0) }));
    if (!c) { B.toast('Candidate is required', 'bad'); return null; } if (!comps[0].a) { B.toast('Enter the salary components', 'bad'); return null; } if (!j || !v) { B.toast('Joining date and validity date are required', 'bad'); return null; } if (v < today()) { B.toast('Validity date cannot be in the past', 'bad'); return null; } if (j < v) { B.toast('Joining date must be on or after the validity date', 'bad'); return null; }
    return { cand: c, desig: B.$('#of-d').value, req: B.$('#of-r').value.trim(), probation: +B.$('#of-p').value || 0, joining: j, valid: v, comps };
  };
  B.act['of-new'] = () => B.modal({ title: 'Prepare offer', wide: true, body: offForm(mkOffer({ cand: '', desig: DESIGS[0][0], comps: split(60000) })), foot: mf('', 'of-create', 'Save as draft') });
  B.act['of-create'] = () => { const o = mkOffer({}), r = readOffer(o); if (!r) return; Object.assign(o, r, { dept: deptOf(r.desig), email: r.cand.toLowerCase().replace(/\s+/g, '.') + '@gmail.com', shortlist: [ap(3), ap(5)] }); o.log.push({ at: today(), m: 'Offer prepared by ' + me().name }); D().offers.unshift(o); done('Draft offer ' + o.id + ' saved'); };
  B.act['of-edit'] = (t) => { const o = offById(rid(t)); B.modal({ title: 'Edit offer ' + o.id, wide: true, body: offForm(o), foot: mf('', 'of-upd', 'Save').replace('of-upd', 'of-upd" data-id="' + o.id) }); };
  B.act['of-upd'] = (t) => { const o = offById(t.dataset.id), r = readOffer(o); if (!r) return; Object.assign(o, r, { dept: deptOf(r.desig) }); done('Offer updated'); };
  const submit = (o, why) => { o.stages = mkStages(D().multi); o.status = 'Approval'; o.log.push({ at: today(), m: why || 'Submitted for approval (' + (D().multi ? 'HR + Higher management' : 'HR') + ')' }); };
  B.act['of-sub'] = (t) => { const o = offById(rid(t)); submit(o); done('Sent to ' + o.stages[0].who); };
  B.act['of-ap'] = (t) => {
    const o = offById(rid(t)), i = curSt(o), s = o.stages[i]; Object.assign(s, { s: 'Approved', by: isHR() ? s.who : me().name, at: today() });
    if (curSt(o) < 0) { o.status = 'Approved'; o.log.push({ at: today(), m: 'Fully approved' }); done('Offer approved. Ready to send'); } else { o.log.push({ at: today(), m: s.t + ' approved' }); done('Approved. Forwarded to ' + o.stages[curSt(o)].who); }
  };
  B.act['of-rej'] = (t) => B.modal({ title: 'Reject offer', body: field('Reason (returned to HR)', '<textarea class="inp" id="of-n" rows="3"></textarea>'), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="of-dorej" data-id="${rid(t)}">Reject</button>` });
  B.act['of-dorej'] = (t) => { const n = B.$('#of-n').value.trim(); if (!n) { B.toast('Add a reason', 'bad'); return; } const o = offById(t.dataset.id), s = o.stages[curSt(o)]; Object.assign(s, { s: 'Rejected', by: s.who, at: today(), note: n }); o.status = 'Draft'; o.log.push({ at: today(), m: s.t + ' rejected: ' + n + '. Returned to draft' }); done('Offer returned to HR as draft'); };
  B.act['of-prev'] = (t) => { const o = offById(rid(t)); B.modal({ title: 'Offer letter preview · ' + esc(o.cand), wide: true, body: letter(o), foot: `<button class="btn" data-act="close-modal">Close</button><button class="btn primary" data-act="of-send" data-id="${o.id}">${ic('send', 14)}Send to ${esc(o.email)}</button>` }); };
  B.act['of-send'] = (t) => { const o = offById(t.dataset.id); o.status = 'Sent'; o.sentAt = today(); o.log.push({ at: today(), m: 'Offer letter emailed to ' + o.email }); done('Offer letter sent'); };
  B.act['of-acc'] = (t) => B.modal({ title: 'Candidate accepted', body: field('Signed offer letter (required)', '<input type="file" class="inp" id="of-f">') + '<p class="muted">The signed copy is kept on file and an onboarding document checklist is opened.</p>', foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="of-doacc" data-id="${rid(t)}">Record acceptance</button>` });
  B.act['of-doacc'] = (t) => {
    const f = B.$('#of-f').files[0]; if (!f) { B.toast('Attach the signed copy first', 'bad'); return; }
    const o = offById(t.dataset.id), d = D(); o.status = 'Accepted'; o.signed = f.name; o.log.push({ at: today(), m: 'Accepted. Signed copy: ' + f.name });
    if (!d.onb.some((x) => x.offer === o.id)) { const x = { id: nid('ONB-'), cand: o.cand, desig: o.desig, offer: o.id, due: day(7), exp: true, docs: {}, rem: [], confirmed: false, assets: null, emp: '' }; DOCS.forEach((k) => (x.docs[k.k] = { s: k.k === 'offer' ? 'Verified' : 'Pending', reason: '', at: k.k === 'offer' ? today() : '' })); d.onb.unshift(x); }
    done('Accepted. Onboarding checklist opened');
  };
  B.act['of-neg'] = (t) => B.modal({ title: 'Candidate wants to negotiate', body: field('What does the candidate ask for?', '<textarea class="inp" id="of-n" rows="3" placeholder="e.g. 68,000 gross and joining 10 days earlier"></textarea>'), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="of-doneg" data-id="${rid(t)}">Record</button>` });
  B.act['of-doneg'] = (t) => { const n = B.$('#of-n').value.trim(); if (!n) { B.toast('Record the candidate request', 'bad'); return; } const o = offById(t.dataset.id); o.status = 'Negotiating'; o.ask = n; o.log.push({ at: today(), m: 'Negotiation requested: ' + n }); done('HR can now revise the offer'); };
  B.act['of-rev'] = (t) => { const o = offById(rid(t)); B.modal({ title: `Revise offer · revision ${o.rev + 1}`, wide: true, body: `<div class="as-note">${ic('flag', 15)}<span>${esc(o.ask || '')}. The revised offer goes through approval again.</span></div>` + offForm(o) + field('Revision note', '<input class="inp" id="of-rn" placeholder="What changed">'), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="of-dorev" data-id="${o.id}">Save & re-submit for approval</button>` }); };
  B.act['of-dorev'] = (t) => { const o = offById(t.dataset.id), r = readOffer(o); if (!r) return; Object.assign(o, r, { dept: deptOf(r.desig) }); o.rev++; o.revs.push({ rev: o.rev, gross: gross(o), note: B.$('#of-rn').value.trim(), at: today() }); submit(o, `Revision ${o.rev} (${money(gross(o))}) submitted for re-approval`); done('Revision ' + o.rev + ' sent for re-approval'); };
  B.act['of-dec'] = (t) => B.modal({ title: 'Candidate declined', body: field('Reason', '<input class="inp" id="of-n" placeholder="e.g. Accepted another offer">'), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="of-dodec" data-id="${rid(t)}">Record decline</button>` });
  B.act['of-dodec'] = (t) => { const o = offById(t.dataset.id); o.status = 'Declined'; o.log.push({ at: today(), m: 'Declined: ' + (B.$('#of-n').value.trim() || 'no reason given') }); done('Declined. Choose the next action'); };
  const nextFor = (o) => {
    const nm = o.shortlist.shift(); if (!nm) return null; const n = mkOffer({ cand: nm, desig: o.desig, req: o.req, comps: o.comps.map((c) => ({ n: c.n, a: c.a })), probation: o.probation, joining: day(21), valid: day(7), shortlist: o.shortlist.slice() }); n.log.push({ at: today(), m: `Created from ${o.id} (${o.cand} ${o.status.toLowerCase()})` }); return n;
  };
  B.act['of-next'] = (t) => { const o = offById(rid(t)), n = nextFor(o); if (!n) { B.toast('No shortlisted candidate left. Reopen the requisition', 'bad'); return; } o.after = 'Next: ' + n.cand; o.log.push({ at: today(), m: 'Offer passed to next shortlisted candidate ' + n.cand }); D().offers.unshift(n); done('Draft offer created for ' + n.cand); };
  B.act['of-reopen'] = (t) => { const o = offById(rid(t)); o.after = 'Requisition reopened'; o.log.push({ at: today(), m: 'Requisition ' + o.req + ' reopened for hiring' }); done(o.req + ' reopened'); };

  /* =====================================================================
     3. ONBOARDING DOCUMENTS
     ===================================================================== */
  const cfgM = (desig, d) => { const c = D().docCfg[desig]; return c && c[d.k] != null ? c[d.k] : !!d.m; };
  const docsFor = (x) => DOCS.filter((d) => !d.exp || x.exp);
  const mandOK = (x) => docsFor(x).filter((d) => cfgM(x.desig, d)).every((d) => (x.docs[d.k] || {}).s === 'Verified');
  const missing = (x) => docsFor(x).filter((d) => cfgM(x.desig, d) && (x.docs[d.k] || { s: 'Pending' }).s !== 'Verified');
  const onbById = (id) => D().onb.find((x) => x.id === id);
  page('onboarding-docs', () => {
    const d = D(), t = tab('ob', 'list'), over = (x) => x.due < today() && !x.emp && missing(x).length;
    if (t === 'cfg') {
      const des = DESIGS.map((x) => x[0]);
      return `${B.head('Onboarding Documents', 'HR settings: choose which documents are mandatory for each designation.', '', crumbs('Recruitment', 'Onboarding Documents'))}<div class="filterbar">${tabs([['list', 'Candidates'], ['cfg', 'HR settings']], t, 'ob-tab')}</div><div class="card pad"><div class="as-note">${ic('settings', 15)}<span>Tick = mandatory. HR can confirm a hire only when every mandatory document is Verified. Experience letter applies only to experienced hires.</span></div><div class="tscroll"><table class="dt"><thead><tr><th>Document</th>${des.map((x) => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${DOCS.map((o) => `<tr><td>${esc(o.l)}</td>${des.map((x) => `<td><input type="checkbox" data-chg="obcfg" data-d="${esc(x)}" data-k="${o.k}" ${cfgM(x, o) ? 'checked' : ''}></td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    }
    const s = d.onb.find((x) => x.id === d.sel.ob) || d.onb[0];
    const IC = { photo: 'user', nid: 'shield', edu: 'grad', exp: 'briefcase', cv: 'file', bank: 'dollar', emerg: 'phone', tin: 'file', offer: 'file', ref: 'users' };
    const st = (x) => { const all = docsFor(x), m = all.filter((o) => cfgM(x.desig, o)), val = (o) => (x.docs[o.k] || { s: 'Pending' }).s; return { all, m, v: m.filter((o) => val(o) === 'Verified').length, sub: all.filter((o) => val(o) === 'Submitted').length, rej: all.filter((o) => val(o) === 'Rejected').length, up: all.filter((o) => val(o) !== 'Pending').length, pct: m.length ? Math.round((m.filter((o) => val(o) === 'Verified').length / m.length) * 100) : 100, stage: x.emp ? 4 : x.assets ? 3 : x.confirmed ? 2 : mandOK(x) ? 1 : 0 }; };
    const dd = (iso) => Math.round((new Date(iso + 'T00:00') - new Date(new Date().toDateString())) / 864e5);
    const dueTag = (x) => { if (x.emp) return '<span class="muted">Completed</span>'; const n = dd(x.due); return `<span class="${n < 0 ? 'ob-late' : n <= 2 ? 'ob-soon' : ''}">${n < 0 ? Math.abs(n) + ' days overdue' : n === 0 ? 'Due today' : 'Due in ' + n + ' days'}</span>`; };
    const stageName = ['Collecting documents', 'Ready for HR confirm', 'Awaiting asset info', 'Ready for employee record', 'Employee created'];
    const S0 = st(s), miss = missing(s), offer = d.offers.find((o) => o.id === s.offer) || d.offers.find((o) => o.cand === s.cand && o.status === 'Accepted');
    const totalDocs = d.onb.reduce((a, x) => a + st(x).m.length, 0), totalVer = d.onb.reduce((a, x) => a + st(x).v, 0);
    const steps = [{ n: 1, t: 'Documents verified', c: mandOK(s) ? 'done' : 'now' }, { n: 2, t: 'HR confirms', c: s.confirmed ? 'done' : mandOK(s) ? 'now' : '' }, { n: 3, t: 'Asset info', c: s.assets ? 'done' : s.confirmed ? 'now' : '' }, { n: 4, t: 'Employee record', c: s.emp ? 'done' : s.assets ? 'now' : '' }];
    const cards = d.onb.map((x) => { const q = st(x), o = over(x); return `<div class="card ob-c ${x.id === s.id ? 'on' : ''} ${o ? 'late' : ''}" data-id="${x.id}" data-act="ob-open"><div class="ob-ch">${B.avatar(x.cand, 40)}<div><b>${esc(x.cand)}</b><span>${esc(x.desig)}</span></div>${B.ring(q.pct, 46, q.pct + '%', '', q.pct === 100 ? 'var(--ok)' : o ? 'var(--bad)' : 'var(--accent)')}</div>
        <div class="ob-cs"><span>${ic('check-circle', 13)}${q.v}/${q.m.length} verified</span>${q.sub ? `<span class="b">${ic('clock', 13)}${q.sub} to verify</span>` : ''}${q.rej ? `<span class="r">${ic('x', 13)}${q.rej} rejected</span>` : ''}</div>
        <div class="ob-cf"><span class="ob-stg">${[0, 1, 2, 3].map((k) => `<i class="${k < q.stage ? 'on' : ''}"></i>`).join('')}</span><em>${dueTag(x)}</em></div></div>`; }).join('');
    const docCard = (o) => { const x = s.docs[o.k] || { s: 'Pending', reason: '' }, m = cfgM(s.desig, o); const fm = x.s !== 'Pending' ? fileMeta(s, o) : null; const view = fm ? `<button class="btn sm" data-act="ob-file">${ic('file', 14)}View file</button>` : ''; const acts = view + (s.emp ? '' : x.s === 'Pending' || x.s === 'Rejected' ? `<button class="btn sm" data-act="ob-up">${ic('upload', 14)}${x.s === 'Rejected' ? 'Re-upload' : 'Upload'}</button>` : x.s === 'Submitted' ? `<button class="btn sm primary" data-act="ob-ver">${ic('check', 14)}Verify</button><button class="btn sm danger-o" data-act="ob-rej">Reject</button>` : '');
      return `<div class="ob-d ${x.s.toLowerCase()}" data-k="${o.k}"><span class="ob-di">${ic(IC[o.k] || 'file', 18)}</span><div class="ob-dm"><b>${esc(o.l)}</b><div>${m ? '<span class="fl-tag rep">Mandatory</span>' : '<span class="fl-tag">Optional</span>'}${pill(x.s)}</div>${x.reason ? `<em class="ob-rs">${ic('message', 12)}${esc(x.reason)}</em>` : ''}${fm ? `<span class="ob-fc" data-act="ob-file">${ic('file', 12)}${esc(fm.name)}<em>${fm.size}</em></span>` : ''}${x.at ? `<small>${x.s === 'Verified' ? 'Verified' : x.s === 'Rejected' ? 'Rejected' : 'Uploaded'} ${fmt(x.at)}</small>` : '<small>Not uploaded yet</small>'}</div><div class="ob-da">${acts}</div></div>`; };
    const mand = S0.all.filter((o) => cfgM(s.desig, o)), opt = S0.all.filter((o) => !cfgM(s.desig, o));
    const detail = `<div class="ob-detail" data-id="${s.id}"><div class="card pad iv-prof"><div class="ob-ph">${B.avatar(s.cand, 68)}</div><div class="ivpf-i"><b>${esc(s.cand)}</b><span>${esc(s.desig)} · ${esc(deptOf(s.desig))}</span><div class="ivpf-m"><span>${ic('briefcase', 13)}${s.exp ? 'Experienced hire' : 'Fresher'}</span><span>${ic('calendar', 13)}Documents due ${fmt(s.due)}</span>${offer ? `<span>${ic('send', 13)}Offer ${offer.id} · ${money(gross(offer))}/mo</span><span>${ic('user-check', 13)}Joining ${fmt(offer.joining)}</span>` : ''}</div><span class="pill ${s.emp ? 'ok' : 'info'}"><i></i>${stageName[S0.stage]}</span></div>${B.ring(S0.pct, 96, S0.pct + '%', 'mandatory', S0.pct === 100 ? 'var(--ok)' : 'var(--accent)')}</div>
      <div class="ob-tiles"><div><b>${S0.v}<small>/${S0.m.length}</small></b><span>Mandatory verified</span></div><div><b>${S0.sub}</b><span>Awaiting verification</span></div><div class="${S0.rej ? 'bad' : ''}"><b>${S0.rej}</b><span>Rejected</span></div><div><b>${S0.up}<small>/${S0.all.length}</small></b><span>Documents uploaded</span></div><div><b>${s.rem.length}</b><span>Reminders sent</span></div></div>
      <div class="card pad"><div class="ct-row"><h3 class="ct">Onboarding progress</h3></div>${B.flow ? B.flow.tracker(steps) : ''}</div>
      ${miss.length && !s.emp ? `<div class="rj-banner ob-alert">${ic('alert', 16)}<div><b>${miss.length} mandatory document${miss.length > 1 ? 's' : ''} not verified${s.due < today() ? ' · due date has passed' : ''}</b><span>${miss.map((x) => esc(x.l)).join(', ')}</span></div><button class="btn sm" data-act="ob-rem" ${s.emp ? 'disabled' : ''}>${ic('bell', 14)}Send reminder</button></div>` : ''}
      <div class="ob-cols"><div class="ob-docs"><div class="card pad"><div class="ct-row"><h3 class="ct">Mandatory documents <span class="count">${mand.length}</span></h3></div><div class="ob-dg">${mand.map(docCard).join('')}</div></div>${opt.length ? `<div class="card pad"><div class="ct-row"><h3 class="ct">Optional documents <span class="count">${opt.length}</span></h3></div><div class="ob-dg">${opt.map(docCard).join('')}</div></div>` : ''}</div>
        <div class="ob-side"><div class="card pad"><div class="ct-row"><h3 class="ct">Next action</h3></div><p class="muted" style="margin:0 0 10px">${s.emp ? 'Employee record created. The joining checklist is now open.' : !s.confirmed ? 'Once every mandatory document is verified, HR confirms the hire.' : !s.assets ? 'Review the tentative asset list before creating the employee record.' : 'All set. Create the employee record to start the joining checklist.'}</p>
          <div class="jo-acts">${s.emp ? `<span class="fl-tag rep">${ic('user-check', 13)}Employee ${s.emp} created</span><a class="btn" href="#/page/joining-tasks">Open joining checklist</a>` : !s.confirmed ? `<button class="btn primary" data-act="ob-conf" ${mandOK(s) ? '' : 'disabled title="All mandatory documents must be Verified"'}>${ic('check', 15)}HR confirm documents</button>` : !s.assets ? `<button class="btn primary" data-act="ob-assets">${ic('briefcase', 15)}HR modifies asset info</button>` : `<button class="btn primary" data-act="ob-emp">${ic('user-plus', 15)}Create employee record</button>`}<button class="btn" data-act="ob-rem" ${s.emp ? 'disabled' : ''}>${ic('bell', 15)}Send reminder${s.rem.length ? ' (' + s.rem.length + ')' : ''}</button></div></div>
          ${s.assets ? `<div class="card pad"><div class="ct-row"><h3 class="ct">Tentative assets</h3></div><div class="rj-sk">${s.assets.length ? s.assets.map((a) => `<span class="fl-tag">${esc(a)}</span>`).join('') : '<span class="muted">None</span>'}</div></div>` : ''}
          ${s.rem.length ? `<div class="card pad"><div class="ct-row"><h3 class="ct">Reminder history</h3></div><ul class="fl-trail">${s.rem.slice().reverse().map((r) => `<li class="approved"><b>${fmt(r)}</b><span>Reminder emailed to candidate</span></li>`).join('')}</ul></div>` : ''}</div></div></div>`;
    return `${B.head('Onboarding Documents', 'Collect, verify and gate the hire: documents, HR confirmation, asset info, then the employee record.', `<button class="btn" data-act="ob-tab" data-t="cfg">${ic('settings', 15)}HR settings</button>`, crumbs('Recruitment', 'Onboarding Documents'))}
    ${kp([Kp('users', 'In onboarding', d.onb.filter((x) => !x.emp).length), Kp('file', 'Awaiting verification', d.onb.reduce((a, x) => a + Object.values(x.docs).filter((y) => y.s === 'Submitted').length, 0), 'info'), Kp('x', 'Rejected docs', d.onb.reduce((a, x) => a + Object.values(x.docs).filter((y) => y.s === 'Rejected').length, 0), 'bad'), Kp('alert', 'Overdue with gaps', d.onb.filter(over).length, 'warn'), Kp('check-circle', 'Ready to confirm', d.onb.filter((x) => !x.confirmed && mandOK(x)).length, 'ok'), Kp('shield', 'Overall verified', Math.round((totalVer / (totalDocs || 1)) * 100) + '%', 'ok')])}
    <div class="filterbar">${tabs([['list', 'Candidates'], ['cfg', 'HR settings']], t, 'ob-tab')}</div>
    <div class="ob-strip">${cards}</div>${detail}`;
  });
  B.act['ob-tab'] = (t) => { D().tab.ob = t.dataset.t; save(); rerender(); };
  B.act['ob-open'] = (t) => { D().sel.ob = rid(t); save(); rerender(); };
  B.chg.obcfg = (t) => { const c = D().docCfg; (c[t.dataset.d] = c[t.dataset.d] || {})[t.dataset.k] = t.checked; save(); B.toast('Saved for ' + t.dataset.d); };
  const kOf = (t) => t.closest('[data-k]').dataset.k;
  const fileMeta = (x, o) => { const h = B.hash(x.id + o.k), img = o.k === 'photo'; return { name: x.cand.toLowerCase().replace(/[^a-z]+/g, '_') + '_' + o.k + (img ? '.jpg' : '.pdf'), size: img ? 180 + (h % 220) + ' KB' : (1 + (h % 30) / 10).toFixed(1) + ' MB', pages: img ? 1 : 1 + (h % 3), img, h }; };
  const previewBody = (x, o, fm) => {
    const c = esc(x.cand), n = (a, b) => a + (fm.h % (b - a));
    if (fm.img) return `<div class="ob-pv photo"><div class="ob-pp">${B.avatar(x.cand, 150)}</div><span>Passport-size photograph · ${fm.size}</span></div>`;
    const rows = { nid: [['Full name', c], ['ID number', '19' + n(85, 99) + '4' + String(1000000000 + fm.h % 8999999999).slice(0, 9)], ['Date of birth', '1996-04-12'], ['Issued by', 'Bangladesh Election Commission']], edu: [['Awarded to', c], ['Degree', 'Bachelor of Science'], ['Institution', 'University of Dhaka'], ['CGPA', (3 + (fm.h % 10) / 10).toFixed(2) + ' / 4.00']], exp: [['Employee', c], ['Previous employer', 'Nexus Tech Ltd.'], ['Tenure', n(2, 7) + ' years'], ['Status', 'Released with no dues']], cv: [['Candidate', c], ['Experience', x.exp ? n(2, 8) + ' years' : 'Fresher'], ['Education', 'B.Sc. in CSE'], ['Skills', 'Communication, Excel, Teamwork']], bank: [['Account holder', c], ['Bank', 'Dutch-Bangla Bank'], ['Account no.', '1' + String(100000000 + fm.h % 899999999)], ['Branch', 'Gulshan, Dhaka']], emerg: [['Employee', c], ['Emergency contact', 'Family member'], ['Phone', '+880 17' + String(10000000 + fm.h % 89999999)], ['Nominee', 'Spouse']], tin: [['Taxpayer', c], ['TIN', String(100000000000 + fm.h % 899999999999)], ['Circle', 'Dhaka, Tax Zone 5'], ['Issued', '2022']], offer: [['Candidate', c], ['Position', esc(x.desig)], ['Signed on', fmt(x.docs[o.k] && x.docs[o.k].at)], ['Signature', 'Present ✓']], ref: [['Candidate', c], ['Referee', 'Previous line manager'], ['Phone', '+880 18' + String(10000000 + fm.h % 89999999)], ['Relation', 'Reporting manager']] }[o.k] || [['Candidate', c]];
    return `<div class="ob-pv"><div class="ob-pg"><div class="ob-pgh"><b>${esc(o.l).toUpperCase()}</b><span>${fm.name}</span></div>${rows.map((r) => `<div class="ob-pgr"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}<div class="ob-pgl"></div><div class="ob-pgl s"></div><div class="ob-pgl"></div><div class="ob-pgs"><i></i>Authorised signature</div></div><span>Page 1 of ${fm.pages} · ${fm.size}</span></div>`;
  };
  B.act['ob-file'] = (t) => {
    const x = onbById(rid(t)), k = kOf(t), o = DOCS.find((q) => q.k === k), d = x.docs[k] || { s: 'Pending' }, fm = fileMeta(x, o);
    const foot = `<div data-id="${x.id}" data-k="${k}" style="display:contents"><button class="btn" data-act="close-modal">Close</button><button class="btn" data-act="toast" data-msg="Downloading ${fm.name}">${ic('download', 15)}Download</button>${d.s === 'Submitted' && !x.emp ? `<button class="btn danger-o" data-act="ob-rej">Reject</button><button class="btn primary" data-act="ob-ver">${ic('check', 15)}Verify</button>` : ''}</div>`;
    B.modal({ title: esc(o.l) + ' · ' + esc(x.cand), wide: true, body: `<div class="ob-fi"><span>${ic('file', 14)}${fm.name}</span><span>${fm.size}</span><span>Uploaded ${fmt(d.at)}</span>${pill(d.s)}</div>${d.reason ? `<div class="rj-banner" style="background:#fde8ec;color:#a3122b"><div><b>Rejection reason</b><span>${esc(d.reason)}</span></div></div>` : ''}${previewBody(x, o, fm)}`, foot });
  };
  B.act['ob-up'] = (t) => { const x = onbById(rid(t)); x.docs[kOf(t)] = { s: 'Submitted', reason: '', at: today() }; done('Uploaded. Waiting for HR verification'); };
  B.act['ob-ver'] = (t) => { const x = onbById(rid(t)); x.docs[kOf(t)] = { s: 'Verified', reason: '', at: today() }; done('Document verified'); };
  B.act['ob-rej'] = (t) => B.modal({ title: 'Reject document', body: field('Reason (shown to the employee, who re-uploads)', '<textarea class="inp" id="ob-n" rows="3"></textarea>'), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="ob-dorej" data-id="${rid(t)}" data-k="${kOf(t)}">Reject</button>` });
  B.act['ob-dorej'] = (t) => { const n = B.$('#ob-n').value.trim(); if (!n) { B.toast('A reason is required', 'bad'); return; } onbById(t.dataset.id).docs[t.dataset.k] = { s: 'Rejected', reason: n, at: today() }; done('Rejected. Employee asked to re-upload'); };
  B.act['ob-rem'] = (t) => { const x = onbById(rid(t)), m = missing(x); if (!m.length) { B.toast('Nothing is missing'); return; } x.rem.push(today()); done(`Reminder sent to ${x.cand}: ${m.length} document${m.length > 1 ? 's' : ''} outstanding`); };
  B.act['ob-conf'] = (t) => { const x = onbById(rid(t)); if (!mandOK(x)) { B.toast('Verify all mandatory documents first', 'bad'); return; } x.confirmed = true; done('Documents confirmed by HR. Now review the asset info'); };
  B.act['ob-assets'] = (t) => { const x = onbById(rid(t)); B.modal({ title: 'HR modifies asset info · ' + esc(x.cand), body: `<p style="margin-bottom:8px">Tentative device list from the requisition. Untick to remove, add extra items below.</p><div class="fl-checks">${ASSET_DEFAULT.map((a) => `<label class="fl-chk"><input type="checkbox" class="ob-as" value="${a}" checked><span>${a}</span></label>`).join('')}</div>${field('Additional items (comma separated)', '<input class="inp" id="ob-ax" placeholder="e.g. Docking station, Tablet">')}`, foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="ob-doassets" data-id="${x.id}">Save asset list</button>` }); };
  B.act['ob-doassets'] = (t) => { const x = onbById(t.dataset.id); x.assets = B.$$('.ob-as').filter((c) => c.checked).map((c) => c.value).concat(B.$('#ob-ax').value.split(',').map((s) => s.trim()).filter(Boolean)); done('Asset info saved'); };
  B.act['ob-emp'] = (t) => {
    const x = onbById(rid(t)), d = D(); if (!x.confirmed || !x.assets) return; x.emp = 'HR-EMP-' + B.pad(++d.emp, 5); const off = d.offers.find((o) => o.id === x.offer) || d.offers.find((o) => o.cand === x.cand && o.status === 'Accepted');
    d.join.unshift({ id: nid('JN-'), cand: x.cand, desig: x.desig, joining: off ? off.joining : day(10), confirmed: false, tasks: {}, status: 'Scheduled', emp: '', assets: x.assets.slice(), released: [], offer: off ? off.id : '', log: [{ at: today(), m: 'Employee record ' + x.emp + ' created from onboarding documents' }] });
    done(`Employee record ${x.emp} created. Joining task list opened`);
  };

  /* =====================================================================
     4. JOINING & FIRST DAY
     ===================================================================== */
  const joById = (id) => D().join.find((x) => x.id === id);
  const jProg = (j) => Math.round((100 * TASKS.filter((t) => j.tasks[t.k]).length) / TASKS.length);
  const bar = (p) => `<div style="height:8px;border-radius:6px;background:var(--line,#8883);overflow:hidden;min-width:90px"><div style="width:${p}%;height:100%;background:var(--ok,#2a9d6f)"></div></div>`;
  page('joining-tasks', () => {
    const d = D(), s = d.join.find((x) => x.id === d.sel.jn) || d.join[0], t = today();
    const cnt = (st) => d.join.filter((j) => j.status === st).length, P = jProg(s);
    const open = s.status !== 'Active' && s.status !== 'No-show', canNo = open && s.confirmed && s.joining <= t;
    const groups = [...new Set(TASKS.map((x) => x.g))];
    return `${B.head('Joining & First Day', 'HR confirms the joining date and works through the first-day checklist. A no-show cancels the offer and releases the assets.', '', crumbs('Lifecycle', 'Joining & First Day'))}
    ${kp([Kp('calendar', 'Joining this week', d.join.filter((j) => j.status !== 'No-show' && j.joining >= t && j.joining <= day(7)).length, 'info'), Kp('clock', 'In progress', cnt('In progress'), 'warn'), Kp('check-circle', 'Active', cnt('Active'), 'ok'), Kp('x', 'No-show', cnt('No-show'), 'bad')])}
    <div class="card pad"><div class="tscroll"><table class="dt"><thead><tr><th>New joiner</th><th>Designation</th><th>Joining date</th><th>Progress</th><th>Status</th><th class="r"></th></tr></thead><tbody>${d.join.map((j) => `<tr data-id="${j.id}" ${j.id === s.id ? 'style="background:var(--hover,#0001)"' : ''}><td>${who(j.cand)}</td><td>${esc(j.desig)}</td><td>${fmt(j.joining)} ${j.confirmed ? '' : '<em class="sub">tentative</em>'}</td><td>${bar(jProg(j))}<em class="sub">${jProg(j)}%</em></td><td>${pill(j.status)}</td><td class="r"><button class="btn sm" data-act="jn-open">Open</button></td></tr>`).join('')}</tbody></table></div></div>
    <div class="card pad" data-id="${s.id}" style="margin-top:14px"><div class="ct-row"><div class="cl-q-h">${B.avatar(s.cand, 40)}<div><b>${esc(s.cand)}</b><span>${esc(s.desig)} · joining ${fmt(s.joining)} ${s.confirmed ? '(confirmed)' : '(not confirmed)'}</span></div></div>${pill(s.status)}</div>
      <div style="display:flex;align-items:center;gap:10px;margin:10px 0"><div style="flex:1">${bar(P)}</div><b>${P}%</b></div>
      ${s.status === 'No-show' ? `<div class="as-note" style="border-color:var(--bad,#c33)">${ic('alert', 15)}<span>No-show. Offer cancelled, assets released (${s.released.map(esc).join(', ') || 'none'}), next candidate considered.</span></div>` : ''}
      ${groups.map((g) => `<h4 style="margin:10px 0 4px">${g}</h4><ul class="fl-docs">${TASKS.filter((x) => x.g === g).map((x) => `<li><label class="fl-chk"><input type="checkbox" data-chg="jntask" data-k="${x.k}" ${s.tasks[x.k] ? 'checked' : ''} ${!open || !s.confirmed ? 'disabled' : ''}><span><b>${x.l}</b></span></label></li>`).join('')}</ul>`).join('')}
      <div class="as-act" style="margin:12px 0">${open ? `<button class="btn sm" data-act="jn-date">${ic('calendar', 14)}${s.confirmed ? 'Change' : 'Confirm'} joining date</button>` : ''}<span class="grow"></span>${canNo ? `<button class="btn sm" data-act="jn-noshow" style="color:var(--bad,#c33)">${ic('x', 14)}Did not join (no-show)</button>` : ''}${open ? `<button class="btn sm primary" data-act="jn-active" ${P === 100 && s.confirmed ? '' : 'disabled title="Complete every task first"'}>${ic('user-check', 14)}Employee active</button>` : ''}</div>
      ${!s.confirmed && open ? `<p class="muted">Confirm the joining date before ticking tasks.</p>` : ''}<h4>Log</h4>${trail(s.log)}</div>`;
  });
  B.act['jn-open'] = (t) => { D().sel.jn = rid(t); save(); rerender(); };
  B.chg.jntask = (t) => { const j = joById(rid(t)); j.tasks[t.dataset.k] = t.checked; j.status = 'In progress'; if (!jProg(j)) j.status = 'Scheduled'; save(); rerender(); };
  B.act['jn-date'] = (t) => B.modal({ title: 'Confirm joining date', body: field('Joining date', `<input type="date" class="inp" id="jn-d" value="${joById(rid(t)).joining}">`), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="jn-dodate" data-id="${rid(t)}">Confirm</button>` });
  B.act['jn-dodate'] = (t) => { const v = B.$('#jn-d').value; if (!v) { B.toast('Pick a date', 'bad'); return; } const j = joById(t.dataset.id); j.joining = v; j.confirmed = true; j.log.push({ at: today(), m: 'HR confirmed joining date ' + fmt(v) }); done('Joining date confirmed'); };
  B.act['jn-active'] = (t) => { const j = joById(rid(t)); if (jProg(j) < 100) { B.toast('Finish all tasks first', 'bad'); return; } j.status = 'Active'; j.emp = j.emp || 'HR-EMP-' + B.pad(++D().emp, 5); j.log.push({ at: today(), m: 'First-day checklist complete. Employee is active, probation started' }); const d = D(); const o = d.offers.find((x) => x.id === j.offer) || d.offers.find((x) => x.cand === j.cand && x.status === 'Accepted'), m = o ? o.probation : 3; if (!d.prob.some((p) => p.emp === j.cand)) d.prob.unshift({ id: 'PR-' + B.pad(d.prob.length + 1, 3), emp: j.cand, empId: j.emp, desig: j.desig, dept: deptOf(j.desig), lm: 'Rahim Uddin', salary: o ? gross(o) : 50000, start: j.joining, months: m, end: day(m * 30, j.joining), mid: null, fin: null, dec: null, exit: false }); done(j.cand + ' is now an active employee'); };
  B.act['jn-noshow'] = (t) => B.modal({ title: 'Mark as no-show', body: `<div class="as-note">${ic('alert', 15)}<span>This cancels the offer, releases the reserved assets and offers the position to the next shortlisted candidate.</span></div>` + field('Note', '<input class="inp" id="jn-n" placeholder="e.g. Phone unreachable, no message">'), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="jn-doshow" data-id="${rid(t)}">Confirm no-show</button>` });
  B.act['jn-doshow'] = (t) => {
    const d = D(), j = joById(t.dataset.id), n = B.$('#jn-n').value.trim(); j.status = 'No-show'; j.released = j.assets.slice(); j.assets = []; const o = d.offers.find((x) => x.id === j.offer) || d.offers.find((x) => x.cand === j.cand && x.status === 'Accepted'); let msg = 'Offer cancelled, assets released';
    if (o) { o.status = 'Cancelled'; o.log.push({ at: today(), m: 'Cancelled: candidate did not join on ' + fmt(j.joining) }); const nx = nextFor(o); if (nx) { d.offers.unshift(nx); o.after = 'Next: ' + nx.cand; msg += `, draft offer created for ${nx.cand}`; } else { o.after = 'Requisition reopened'; msg += ', requisition reopened'; } }
    j.log.push({ at: today(), m: `No-show on ${fmt(j.joining)}${n ? ' (' + n + ')' : ''}. ${msg}` }); done(msg);
  };

  /* =====================================================================
     5. PROBATION
     ===================================================================== */
  const prById = (id) => D().prob.find((p) => p.id === id);
  const prSt = (p) => (p.dec ? (p.dec.type === 'Confirm' ? 'Confirmed' : p.dec.type === 'End' ? 'Ended' : 'Extended') : 'Probation');
  const open = (p) => !p.dec || p.dec.type === 'Extend';
  const daysTo = (d) => Math.round((new Date(d + 'T00:00') - new Date(today() + 'T00:00')) / 864e5);
  const isOver = (p) => open(p) && p.end < today(), soon = (p) => open(p) && p.end >= today() && daysTo(p.end) <= 30;
  const stars = (r) => '★'.repeat(r) + '☆'.repeat(5 - r);
  page('probation', () => {
    const d = D(), t = tab('pr', 'all'), L = d.prob.filter((p) => t === 'all' || (t === 'active' ? open(p) : t === 'soon' ? soon(p) : t === 'over' ? isOver(p) : !open(p)));
    return `${B.head('Probation', 'Line Manager reviews, then HR confirms, extends or ends the probation.', '', crumbs('Lifecycle', 'Probation'))}
    ${kp([Kp('clock', 'On probation', d.prob.filter(open).length, 'info'), Kp('calendar', 'Ending in 30 days', d.prob.filter(soon).length, 'warn'), Kp('alert', 'Overdue decisions', d.prob.filter(isOver).length, 'bad'), Kp('check-circle', 'Confirmed', d.prob.filter((p) => p.dec && p.dec.type === 'Confirm').length, 'ok'), Kp('x', 'Sent to Exit', d.prob.filter((p) => p.exit).length)])}
    <div class="filterbar">${tabs([['all', 'All'], ['active', 'On probation'], ['soon', 'Ending ≤ 30 days'], ['over', 'Overdue'], ['dec', 'Decided']], t, 'pr-tab')}</div>
    <div class="card pad"><div class="as-note">${ic('flag', 15)}<span>Rule: HR can decide only after the Line Manager's final review. Confirm updates status to Permanent (and salary if changed); End flags the employee for the Exit module.</span></div><div class="tscroll"><table class="dt"><thead><tr><th>Employee</th><th>Start</th><th>End</th><th>Duration</th><th>LM review</th><th>Status</th><th class="r">Actions</th></tr></thead><tbody>${L.map((p) => `<tr data-id="${p.id}" ${isOver(p) ? 'style="background:var(--bad-bg,#c331)"' : ''}><td>${who(p.emp)}<em class="sub">${esc(p.desig)} · LM ${esc(p.lm)}</em></td><td>${fmt(p.start)}</td><td>${fmt(p.end)}${isOver(p) ? ' ' + pill('Overdue') : soon(p) ? `<em class="sub">in ${daysTo(p.end)} days</em>` : ''}</td><td>${p.months} mo</td><td>${p.mid ? `Mid ${stars(p.mid.rating)}<br>` : ''}${p.fin ? `Final ${stars(p.fin.rating)}` : '<em class="sub">Final pending</em>'}</td><td>${pill(prSt(p))}${p.exit ? '<em class="sub">Sent to Exit module</em>' : ''}${p.dec && p.dec.type === 'Confirm' ? '<em class="sub">Permanent · ' + money(p.dec.salary) + '</em>' : ''}</td><td class="r" style="white-space:normal">${open(p) ? `<button class="btn sm" data-act="pr-rev">LM review</button> <button class="btn sm primary" data-act="pr-dec">HR decision</button>` : ''}<button class="btn sm" data-act="pr-view">Details</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">Nothing here.</td></tr>'}</tbody></table></div></div>`;
  });
  B.act['pr-tab'] = (t) => { D().tab.pr = t.dataset.t; save(); rerender(); };
  B.act['pr-rev'] = (t) => {
    const p = prById(rid(t)); B.modal({ title: 'Line Manager review · ' + esc(p.emp), body: grid(field('Review type', sel([['mid', 'Mid-way (optional)'], ['fin', 'Final']], p.mid ? 'fin' : 'mid', 'id="pr-t"')) + field('Rating', sel([[5, '5 · Outstanding'], [4, '4 · Good'], [3, '3 · Meets'], [2, '2 · Below'], [1, '1 · Poor']], 3, 'id="pr-r"'))) + field('Comment (required)', '<textarea class="inp" id="pr-c" rows="3"></textarea>'), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-dorev" data-id="${p.id}">Submit review</button>` });
  };
  B.act['pr-dorev'] = (t) => { const c = B.$('#pr-c').value.trim(); if (!c) { B.toast('A comment is required', 'bad'); return; } const p = prById(t.dataset.id); p[B.$('#pr-t').value] = { rating: +B.$('#pr-r').value, comment: c, at: today(), by: p.lm }; done('Review recorded'); };
  B.act['pr-dec'] = (t) => {
    const p = prById(rid(t)); if (!p.fin) { B.toast('Line Manager final review is pending. HR cannot decide yet', 'bad'); return; }
    B.modal({ title: 'HR decision · ' + esc(p.emp), body: `<div class="as-note">${ic('star', 15)}<span>Final review ${stars(p.fin.rating)}: ${esc(p.fin.comment)}</span></div>${field('Decision', sel(['Confirm', 'Extend', 'End'], 'Confirm', 'id="pr-x" data-chg="prx" data-pid="' + p.id + '"'))}<div id="pr-f">${decFields('Confirm', p)}</div>`, foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-dodec" data-id="${p.id}">Save decision</button>` });
  };
  const decFields = (x, p) => (x === 'Confirm' ? field(`Salary after confirmation (current ${money(p.salary)}; leave same if unchanged)`, `<input type="number" class="inp" id="pr-s" value="${p.salary}">`) : x === 'Extend' ? field('New probation end date (required)', `<input type="date" class="inp" id="pr-e" min="${day(1, p.end)}" value="${day(30, p.end)}">`) : field('Reason for ending (required)', '<textarea class="inp" id="pr-n" rows="3"></textarea>')) + (x !== 'End' ? field('Note', '<input class="inp" id="pr-n2">') : '');
  B.chg.prx = (t) => { const p = prById(t.dataset.pid) || {}; B.$('#pr-f').innerHTML = decFields(t.value, p); };
  B.act['pr-dodec'] = (t) => {
    const p = prById(t.dataset.id), x = B.$('#pr-x').value, at = today();
    if (x === 'Confirm') { const s = +B.$('#pr-s').value; if (!s) { B.toast('Enter the salary', 'bad'); return; } p.dec = { type: 'Confirm', at, salary: s, note: (B.$('#pr-n2').value || '').trim() }; const ch = s !== p.salary; p.salary = s; const e = B.emp(p.empId); if (e && ch) e.salary = s; done(`Confirmed as permanent${ch ? ', salary updated to ' + money(s) : ''}`); }
    else if (x === 'Extend') { const e = B.$('#pr-e').value; if (!e || e <= p.end) { B.toast('Enter a new end date after ' + fmt(p.end), 'bad'); return; } p.dec = { type: 'Extend', at, note: (B.$('#pr-n2').value || '').trim(), from: p.end }; p.end = e; p.fin = null; done('Probation extended to ' + fmt(e) + '. Final review needed again'); }
    else { const n = B.$('#pr-n').value.trim(); if (!n) { B.toast('A reason is required', 'bad'); return; } p.dec = { type: 'End', at, note: n }; p.exit = true; done('Probation ended. Sent to Exit module'); }
  };
  B.act['pr-view'] = (t) => { const p = prById(rid(t)); const rv = (n, r) => (r ? `<li><b>${n}</b> ${stars(r.rating)} · ${esc(r.by)} · ${fmt(r.at)}<br>${esc(r.comment)}</li>` : `<li><b>${n}</b> not submitted</li>`); B.modal({ title: esc(p.emp) + ' · probation', body: `<p>${fmt(p.start)} to ${fmt(p.end)} (${p.months} months) · salary ${money(p.salary)}</p><ul>${rv('Mid-way review', p.mid)}${rv('Final review', p.fin)}</ul>${p.dec ? `<p><b>HR decision:</b> ${p.dec.type} · ${fmt(p.dec.at)}${p.dec.note ? ' · ' + esc(p.dec.note) : ''}</p>` : ''}${p.exit ? `<p>${pill('Ended')} Sent to Exit module</p>` : ''}`, foot: '<button class="btn" data-act="close-modal">Close</button>' }); };

  /* ---------------- registration ---------------- */
  const reg = (id, label, icon, mod) => { B.PAGES[id] = { label, icon }; const m = B.NAV && B.NAV.find((x) => x.id === mod); if (m && !m.items.includes('p:' + id)) m.items.push('p:' + id); };
  reg('candidate-rejections', 'Rejection & Talent Pool', 'users', 'recruit');
  reg('offers', 'Offer Management', 'file', 'recruit');
  reg('onboarding-docs', 'Onboarding Documents', 'check-circle', 'recruit');
  reg('joining-tasks', 'Joining & First Day', 'user-check', 'lifecycle');
  reg('probation', 'Probation', 'clock', 'lifecycle');
})();
