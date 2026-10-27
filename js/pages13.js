/* Bijoy HRMS — Leave rules gaps: Apply for leave (rules engine), Sick overflow & LWP, Compensatory leave,
   Management actions on approved leave, Leave reports, Leave types & rules.
   Own store 'bijoy-leaves-db-v1'. Reads holidays from 'bijoy-holiday-db-v1' ({days:[{date,type}]}) when present. */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const KEY = 'bijoy-leaves-db-v1', HKEY = 'bijoy-holiday-db-v1';
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const day = (n, from) => { const d = from ? new Date(from + 'T00:00') : new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const fmtS = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—');
  const wd = (d) => new Date(d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short' });
  const diff = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 86400000);
  const me = () => (B.role === 'employee' ? B.ME : B.ADMIN_EMP);
  const isHR = () => B.role !== 'employee';
  const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 99);
  const who = (n) => `<span class="as-who">${B.avatar(n, 26)}<span>${esc(n)}</span></span>`;
  const Kp = (i, t, v, tn) => B.kpi(i, t, v, null, null, tn);
  const kp = (a) => `<section class="kpis sm lv-stats" style="grid-template-columns:repeat(${a.length},minmax(0,1fr))">${a.join('')}</section>`;
  const tabs = (list, cur, act) => `<div class="seg sm as-tabs">${list.map((t) => `<button class="${t[0] === cur ? 'on' : ''}" data-act="${act}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>`;
  const field = (l, c, full) => `<div class="fld" ${full ? 'style="grid-column:1/-1"' : ''}><label>${l}</label>${c}</div>`;
  const grid = (c, cols) => `<div class="fgrid" style="grid-template-columns:${cols || '1fr 1fr'}">${c}</div>`;
  const sel = (opts, v, attrs) => `<select class="inp" ${attrs || ''}>${opts.map((o) => { const [val, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${val === v ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
  const crumbs = (l) => [{ label: 'HR', href: '#/' }, { label: 'Leaves' }, { label: l }];
  const PILL = { Pending: 'warn', Approved: 'ok', Rejected: 'bad', Cancelled: 'mute', Available: 'ok', Used: 'mute', Lapsed: 'bad', Recorded: 'ok', 'Submitted to HR': 'info', Blocked: 'bad', Credited: 'ok', Sent: 'ok', 'Not sent': 'warn' };
  const pill = (s) => B.pill(s, PILL[s] || 'mute');
  const emps = () => B.EMPLOYEES.filter((e) => e.status !== 'Left');
  const eByName = (n) => B.EMPLOYEES.find((e) => e.name === n) || B.ADMIN_EMP;
  const mgrName = (e) => { const m = e && B.emp(e.mgr); return m ? m.name : 'Rahim Uddin'; };
  const rid = (t) => t.closest('[data-id]').dataset.id;

  /* ---------- holidays + day counter ---------- */
  const holDb = () => { try { const h = JSON.parse(localStorage.getItem(HKEY)); return h && Array.isArray(h.days) ? h.days : []; } catch (e) { return []; } };
  const holInfo = (d) => { if (new Date(d + 'T00:00').getDay() === 5) return 'Weekly off (Friday)'; const h = holDb().find((x) => x.date === d); return h ? (h.type || 'Holiday') : ''; };
  const isHol = (d) => !!holInfo(d);
  const addWd = (d, n) => { let c = 0; while (c < n) { d = day(1, d); if (!isHol(d)) c++; } return d; };
  const nextWd = (d) => { d = day(1, d); while (isHol(d)) d = day(1, d); return d; };
  /* Casual/Sick/Earned/Paternity/LWP: a holiday INSIDE the period counts, one just before/after is not. Maternity/Quarantine: calendar days. */
  const CAL = ['Maternity Leave', 'Quarantine Leave'];
  function countDays(type, from, to) {
    if (!from || !to || to < from) return { days: 0, list: [] };
    const all = []; for (let d = from; d <= to; d = day(1, d)) all.push(d);
    if (CAL.includes(type)) return { days: all.length, list: all.map((d) => ({ d, c: true, why: 'Calendar day' })) };
    let a = 0, z = all.length - 1; while (a <= z && isHol(all[a])) a++; while (z >= a && isHol(all[z])) z--;
    const list = all.map((d, i) => { const h = holInfo(d); if (!h) return { d, c: true, why: 'Working day' }; if (i > a && i < z) return { d, c: true, why: h + ' inside period, counted' }; return { d, c: false, why: h + (i < a ? ' before period' : ' after period') + ', not counted' }; });
    return { days: list.filter((x) => x.c).length, list };
  }

  /* ---------- types + rules ---------- */
  const TYPES = {
    'Casual Leave': { alloc: 10, gender: '', carry: 'No carry-forward, no encashment', doc: 'None', dl: 'Apply before. Emergency: within 3 working days after return', ent: '10 days / year' },
    'Sick Leave': { alloc: 14, gender: '', carry: 'No carry-forward', doc: "Doctor's certificate if more than 3 days", dl: 'Within 3 working days after return (or before)', ent: '14 days / year. Overflow: Casual, Earned, then LWP' },
    'Earned Leave': { alloc: 18, gender: '', carry: 'Rule to be defined', doc: 'None (rule to be defined)', dl: 'Rule to be defined', ent: 'Configurable balance (rule to be defined)' },
    'Maternity Leave': { alloc: 120, gender: 'Female', carry: 'Not applicable', doc: 'Medical certificate with expected delivery date', dl: 'Apply in advance', ent: '120 calendar days, full pay. Max 2 times in service. Not if 2+ surviving children' },
    'Paternity Leave': { alloc: 5, gender: 'Male', carry: 'Not applicable', doc: 'Proof of birth on return', dl: 'Must start within 30 days of birth', ent: '5 days paid per child, one stretch' },
    'Quarantine Leave': { alloc: 14, gender: '', carry: 'Not applicable', doc: 'Doctor / government advice / test report / official notice', dl: 'As advised', ent: 'Up to 14 days per occasion' },
    'Compensatory Off': { alloc: 0, gender: '', carry: 'Lapses 60 days after earning', doc: 'Approved holiday-work permission', dl: 'Apply at least 3 days before the day off', ent: '1 day per approved holiday work (6+ hours)' },
    'Leave Without Pay': { alloc: 0, gender: '', carry: 'Not applicable', doc: 'Reasons in writing', dl: 'In advance', ent: 'No limit; deducted from salary by Payroll' }
  };
  const DOC_TYPES = ['Doctor advice', 'Government advice', 'Test report', 'Official notice'];

  /* ---------- store + seed ---------- */
  let db = null;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  const D = () => { if (!db) { try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} if (!db || !db.apps) { db = { seq: 0, apps: [], perms: [], hours: [], credits: [], over: [], payroll: [], audit: [], cfg: { earned: 18 } }; seed(); save(); } } return db; };
  const nid = () => 'LA-' + B.pad(++D().seq, 4);
  const curIdx = (st) => st.findIndex((s) => s.s === 'Pending');
  const overall = (st) => (st.some((s) => s.s === 'Rejected') ? 'Rejected' : st.every((s) => s.s === 'Approved') ? 'Approved' : 'Pending');
  const status = (a) => (a.status === 'Cancelled' ? 'Cancelled' : overall(a.stages));
  const stageNote = (s) => s.t + (s.sub ? ' · ' + s.sub : '');
  function stages(emp, st, at) {
    const e = typeof emp === 'string' ? eByName(emp) : emp, lm = mgrName(e);
    if (B.flow && B.flow.mkStages) return B.flow.mkStages('leave', e, st || '', lm, at);
    const mk = (t, w) => ({ t, sub: '', k: t, who: w, s: st === 'Approved' ? 'Approved' : 'Pending', by: st === 'Approved' ? w : '', at: st === 'Approved' ? at || day(-1) : '', note: '' });
    return [mk('Line Manager', lm), mk('Cross Line Manager', 'Zahid Hasan'), mk('HR', 'Rahim Uddin')];
  }
  function mkApp(o) {
    const e = eByName(o.emp), c = countDays(o.type, o.from, o.to), a = Object.assign({ id: nid(), days: c.days, created: today(), status: '', file: '', hand: '', contact: '', reason: '' }, o);
    a.orig = a.days; a.stages = o.stages || stages(e, '');
    D().apps.unshift(a); return a;
  }
  function seed() {
    const E = emps(), n = (i) => E[i % E.length].name, T = Object.keys(TYPES);
    const rows = [];
    for (let i = 0; i < 26; i++) {
      const emp = n(i + 2), type = T[[0, 1, 0, 1, 2, 7, 0, 1, 5, 2, 0, 7, 1][i % 13]], f = i % 4 === 0 ? day(3 + i) : day(((i * 5) % 70) - 40), to = day(type === 'Sick Leave' ? 1 + (i % 3) : i % 3, f);
      rows.push({ emp, type, from: f, to, i });
    }
    rows.forEach((r) => {
      const st = r.i % 4 === 0 ? 'Approved' : r.i % 7 === 3 ? 'Rejected' : r.i % 3 === 1 ? 'Pending' : 'Approved';
      const a = mkApp({ emp: r.emp, type: r.type, from: r.from, to: r.to, reason: ['Family function', 'Fever and rest', 'Personal work', 'Travel to village home', 'Medical check-up', 'Home repair'][r.i % 6], hand: n(r.i + 5), contact: '01711-' + B.pad(100000 + r.i * 7331, 6).slice(0, 6), created: day(-(3 + (r.i % 9))), stages: stages(r.emp, st === 'Approved' ? 'Approved' : st === 'Rejected' ? 'Rejected' : '', day(-2)) });
      if (st === 'Rejected') a.stages[0].note = 'Project deadline that week. Please reapply after release.';
      if (st === 'Pending' && r.i % 2) { a.stages[0].s = 'Approved'; a.stages[0].by = a.stages[0].who; a.stages[0].at = day(-1); }
      if (r.type === 'Sick Leave' && a.days > 3) a.file = 'doctor-certificate.pdf';
    });
    /* compensatory */
    const P = [[4, -6, 'Recorded', 8], [7, -12, 'Recorded', 7], [9, -20, 'Recorded', 6.5], [11, -40, 'Recorded', 9], [13, -58, 'Recorded', 8], [5, 4, 'Pending', 0], [6, 9, 'Approved', 0], [8, -3, 'Submitted to HR', 0]];
    P.forEach(([i, off, s, h], k) => {
      const emp = n(i), date = day(off), p = { id: 'HP-' + B.pad(k + 1, 3), emp, date, reason: ['Month-end billing closure', 'Server migration', 'Customer outage support', 'Audit preparation'][k % 4], approver: mgrName(eByName(emp)), status: s, by: s === 'Pending' ? '' : mgrName(eByName(emp)), created: day(off - 2) };
      D().perms.push(p);
      if (h) { D().hours.push({ id: uid('h'), emp, date, hours: h, res: h >= 6 ? 'Credited' : 'Blocked', note: h >= 6 ? '1 comp day credited' : 'Less than 6 hours' }); if (h >= 6) { p.credited = true; D().credits.push({ id: 'CC-' + B.pad(D().credits.length + 1, 3), emp, earned: date, hours: h, expires: day(60, date), perm: p.id }); } }
    });
    D().hours.push({ id: uid('h'), emp: n(10), date: day(-4), hours: 7, res: 'Blocked', note: 'No approved holiday-work permission' });
    const c = D().credits.find((x) => x.emp === n(11)); if (c) { const a = mkApp({ emp: c.emp, type: 'Compensatory Off', from: day(-15), to: day(-15), reason: 'Comp day off', stages: stages(c.emp, 'Approved') }); c.usedBy = a.id; }
    /* sick overflow seed */
    [[2, 17, 3, 9], [3, 22, 6, 2], [4, 29, 0, 0], [6, 12, 10, 18], [8, 19, 2, 4], [10, 15, 10, 18], [12, 25, 4, 5]].forEach(([i, sick, cas, ear]) => D().over.push({ emp: n(i), sick, casualLeft: cas, earnedLeft: ear, ext: 0, extTo: 'Earned', ov: '', note: '', sent: 0 }));
    D().over[1].ext = 3; D().over[1].extTo = 'LWP'; D().over[1].note = 'Doctor did not recommend extension';
  }

  /* ---------- balances ---------- */
  const base = (emp, t) => (t === 'Casual Leave' ? B.hash(emp + t) % 5 : t === 'Sick Leave' ? B.hash(emp + t) % 6 : t === 'Earned Leave' ? B.hash(emp + t) % 7 : 0);
  const live = (a) => status(a) !== 'Rejected' && status(a) !== 'Cancelled';
  const used = (emp, t) => D().apps.filter((a) => a.emp === emp && a.type === t && live(a)).reduce((s, a) => s + a.days, 0);
  const alloc = (t) => (t === 'Earned Leave' ? D().cfg.earned : TYPES[t].alloc);
  const bal = (emp, t) => alloc(t) - base(emp, t) - used(emp, t);
  const priorMat = (emp) => { const h = B.hash(emp) % 5; return (h === 0 ? 2 : h === 1 ? 1 : 0) + D().apps.filter((a) => a.emp === emp && a.type === 'Maternity Leave' && status(a) === 'Approved').length; };
  const freeCredits = (emp) => D().credits.filter((c) => c.emp === emp && day(0) <= c.expires && (!c.usedBy || !live(D().apps.find((a) => a.id === c.usedBy) || { stages: [{ s: 'Rejected' }] })));
  const credState = (c) => { const ap = c.usedBy && D().apps.find((a) => a.id === c.usedBy); if (ap && live(ap)) return 'Used'; return c.expires < today() ? 'Lapsed' : 'Available'; };
  const left = (c) => diff(today(), c.expires);
  const leftBadge = (c) => { const l = left(c); return credState(c) !== 'Available' ? '' : B.pill(l + ' day' + (l === 1 ? '' : 's') + ' left', l <= 7 ? 'bad' : l <= 21 ? 'warn' : 'ok'); };
  const audit = (kind, ref, emp, action, reason, detail) => D().audit.unshift({ at: Date.now(), kind, ref, emp, action, reason, detail, by: me().name });

  /* ---------- plumbing ---------- */
  const PG = {}, F = { tab: 'reg', cp: 'perm', q: '', dept: '' }; let cur = '';
  const rerender = () => { const v = B.$('#view .fade'); if (v && PG[cur]) v.innerHTML = PG[cur](); };
  const page = (n, fn) => { PG[n] = fn; B.page[n] = () => { cur = n; D(); return fn(); }; };
  const done = (msg) => { save(); B.closeModal(); rerender(); if (msg) B.toast(msg); };
  const statusHead = (a) => { const i = curIdx(a.stages); return status(a) === 'Pending' && a.stages[i] ? 'Waiting · ' + a.stages[i].who : ''; };
  const canAct = (s) => isHR() || s.who === me().name;
  const trk = (a) => (B.flow && B.flow.tracker && B.flow.items ? B.flow.tracker(B.flow.items(a.stages)) : '');

  /* =====================================================================
     1. APPLY FOR LEAVE (rules engine)
     ===================================================================== */
  const S = { emp: '', type: 'Casual Leave', from: '', to: '', reason: '', hand: '', contact: '', file: '', doc: 'Doctor advice', kids: '0', birth: '', edd: '', cc: '' };
  const IDS = { emp: 'lvf-emp', type: 'lvf-ty', from: 'lvf-f', to: 'lvf-t', reason: 'lvf-r', hand: 'lvf-h', contact: 'lvf-c', doc: 'lvf-dt', kids: 'lvf-k', birth: 'lvf-b', edd: 'lvf-e', cc: 'lvf-cc' };
  const grab = () => { Object.keys(IDS).forEach((k) => { const el = document.getElementById(IDS[k]); if (el) S[k] = el.value; }); };
  const initS = () => { if (!S.emp || !isHR()) S.emp = isHR() && S.emp ? S.emp : me().name; if (!S.from) { S.from = day(2); S.to = day(2); } };
  const ck = (g, t, ok, msg) => ({ g, t, ok: !!ok, msg });
  function evaluate(f) {
    const T = TYPES[f.type], e = eByName(f.emp), c = countDays(f.type, f.from, f.to), d = c.days, t0 = today(), K = [];
    const adv = f.from > t0, ret = nextWd(f.to), emergencyOk = t0 <= addWd(ret, 3);
    if (!f.from || !f.to || f.to < f.from) K.push(ck('Eligibility', 'Valid dates', false, 'Choose a valid From / To range'));
    else if (d < 1) K.push(ck('Eligibility', 'Counted days', false, 'Only holidays around the period: nothing to count as leave'));
    if (T.gender) K.push(ck('Eligibility', 'Gender: ' + T.gender + ' only', e.gender === T.gender, e.gender === T.gender ? e.gender + ' employee' : f.type + ' is for ' + T.gender.toLowerCase() + ' employees only'));
    const t = f.type;
    if (t === 'Casual Leave') {
      const b = bal(f.emp, t); K.push(ck('Eligibility', 'Balance (no carry-forward)', d <= b, d <= b ? b + ' day(s) left, applying ' + d : 'Only ' + b + ' casual day(s) left, applying ' + d));
      K.push(ck('Deadline', 'Apply before, or emergency within 3 working days after return', adv || (f.from <= t0 && emergencyOk), adv ? 'Applied in advance' : emergencyOk ? 'Emergency: allowed until ' + fmtS(addWd(ret, 3)) : 'Window closed on ' + fmtS(addWd(ret, 3)) + ' (3 working days after return)'));
      K.push(ck('Document', 'No document needed', true, 'Not required'));
    } else if (t === 'Sick Leave') {
      const b = bal(f.emp, t); K.push(ck('Eligibility', 'Balance (overflow rule)', true, d <= b ? b + ' day(s) left' : 'Exceeds balance by ' + (d - Math.max(0, b)) + ' day(s): overflow is adjusted Casual, then Earned, then LWP'));
      K.push(ck('Deadline', 'Within 3 working days after return', adv || t0 <= addWd(ret, 3), t0 <= addWd(ret, 3) ? 'Allowed until ' + fmtS(addWd(ret, 3)) : 'Window closed on ' + fmtS(addWd(ret, 3))));
      K.push(ck('Document', d > 3 ? "Doctor's certificate (more than 3 days)" : 'Certificate not needed (3 days or fewer)', d <= 3 || f.file, d <= 3 ? 'Not required' : f.file ? f.file : "Attach the doctor's certificate"));
    } else if (t === 'Earned Leave') {
      const b = bal(f.emp, t); K.push(ck('Eligibility', 'Balance (configurable)', d <= b, b + ' day(s) left of ' + alloc(t)));
      K.push(ck('Deadline', 'Rule to be defined', true, 'Earned leave rule is yet to be defined by management'));
      K.push(ck('Document', 'Rule to be defined', true, 'Not required for now'));
    } else if (t === 'Maternity Leave') {
      const pm = priorMat(f.emp), kids = Number(f.kids || 0);
      K.push(ck('Eligibility', 'Maximum 2 maternity leaves in service', pm < 2, pm < 2 ? pm + ' taken so far' : 'Already taken ' + pm + ' times'));
      K.push(ck('Eligibility', 'Fewer than 2 surviving children', kids < 2, kids < 2 ? kids + ' surviving child(ren)' : kids + ' surviving children: not eligible'));
      K.push(ck('Eligibility', 'Maximum 120 calendar days', d <= 120, d + ' calendar day(s) applied'));
      K.push(ck('Deadline', 'Apply in advance', adv, adv ? 'Starts ' + fmtS(f.from) : 'Maternity leave must be applied before it starts'));
      K.push(ck('Document', 'Medical certificate + expected delivery date', f.file && f.edd, f.file && f.edd ? f.file + ', EDD ' + fmtS(f.edd) : (f.file ? '' : 'Attach medical certificate. ') + (f.edd ? '' : 'Enter expected delivery date')));
    } else if (t === 'Paternity Leave') {
      const dup = D().apps.some((a) => a.emp === f.emp && a.type === t && live(a) && a.birth === f.birth && f.birth);
      K.push(ck('Eligibility', '5 days paid per child, one stretch', d <= 5 && !dup, dup ? 'Paternity leave already taken for this child' : d + ' day(s) applied (max 5)'));
      const g = f.birth ? diff(f.birth, f.from) : -1;
      K.push(ck('Deadline', 'Start within 30 days of birth', f.birth && g >= 0 && g <= 30, !f.birth ? 'Enter child birth date' : g < 0 ? 'Leave starts before the birth date' : g <= 30 ? 'Starts ' + g + ' day(s) after birth' : 'Starts ' + g + ' days after birth (limit 30)'));
      K.push(ck('Document', 'Proof of birth on return', true, 'Submit proof of birth when you return to work'));
    } else if (t === 'Quarantine Leave') {
      K.push(ck('Eligibility', 'Up to 14 days per occasion', d <= 14, d + ' day(s) applied'));
      K.push(ck('Deadline', 'As advised by authority', true, 'No fixed deadline'));
      K.push(ck('Document', f.doc + ' attached', !!f.file, f.file ? f.doc + ': ' + f.file : 'Attach doctor / government advice / test report / official notice'));
    } else if (t === 'Compensatory Off') {
      const cr = D().credits.find((x) => x.id === f.cc), fr = freeCredits(f.emp);
      K.push(ck('Eligibility', 'Available compensatory credit', !!cr && fr.includes(cr), cr ? 'Credit ' + cr.id + ' earned ' + fmtS(cr.earned) : fr.length ? 'Select a credit' : 'No available credit'));
      K.push(ck('Eligibility', 'Single day', d === 1 && f.from === f.to, 'One credit = one day off'));
      K.push(ck('Deadline', 'At least 3 days before the day off', diff(t0, f.from) >= 3, diff(t0, f.from) >= 3 ? diff(t0, f.from) + ' days notice' : 'Apply at least 3 days ahead (earliest ' + fmtS(day(3)) + ')'));
      K.push(ck('Deadline', 'Within 60 days of earning', !!cr && f.from <= cr.expires, cr ? 'Credit lapses ' + fmtS(cr.expires) : 'Pick a credit first'));
      K.push(ck('Document', 'Approved holiday-work permission', !!cr, cr ? 'Permission ' + cr.perm : 'Permission needed'));
    } else if (t === 'Leave Without Pay') {
      K.push(ck('Eligibility', 'No balance limit', true, 'Deducted from salary by Payroll'));
      K.push(ck('Deadline', 'Apply in advance', adv, adv ? 'In advance' : 'LWP must be applied in advance'));
      K.push(ck('Document', 'Reasons in writing', (f.reason || '').trim().length >= 10, 'Write the reasons (at least 10 characters)'));
    }
    return { K, c, d };
  }
  const chk = (k) => `<li class="${k.ok ? 'ok' : 'bad'}" style="display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--line,#e6e8ee)"><span style="color:var(--${k.ok ? 'ok' : 'bad'},${k.ok ? '#16a34a' : '#dc2626'});flex:none">${ic(k.ok ? 'check-circle' : 'x', 18)}</span><span><b>${esc(k.t)}</b><br><span class="muted">${esc(k.msg)}</span></span></li>`;
  const bdown = (c) => `<div class="tscroll"><div style="display:flex;flex-wrap:wrap;gap:6px">${c.list.map((x) => `<span class="pill ${x.c ? (x.why.includes('inside') ? 'info' : 'ok') : 'mute'}" title="${esc(x.why)}"><i></i>${fmtS(x.d)} ${wd(x.d)} · ${x.c ? 'counted' : 'not counted'}</span>`).join('')}</div></div><p class="muted" style="margin:6px 0 0;font-size:12px">${c.list.filter((x) => !x.c || x.why.includes('inside')).map((x) => esc(fmtS(x.d) + ': ' + x.why)).join(' · ') || 'No holidays in this range.'}</p>`;
  page('leave-apply', () => {
    initS(); const e = eByName(S.emp), T = TYPES[S.type], r = evaluate(S), fail = r.K.filter((k) => !k.ok), t = S.type;
    const mine = D().apps.filter((a) => isHR() || a.emp === me().name || a.stages.some((s) => s.who === me().name));
    const inp = (id, v, ph, tp) => `<input class="inp" id="${id}" type="${tp || 'text'}" value="${esc(v)}" placeholder="${ph || ''}">`;
    const ch = (id, v, tp) => `<input class="inp" id="${id}" type="${tp || 'date'}" value="${esc(v)}" data-chg="l13f">`;
    let extra = '';
    if (t === 'Maternity Leave') extra = field('Surviving children (declare)', `<input class="inp" id="lvf-k" type="number" min="0" value="${esc(S.kids)}" data-chg="l13f">`) + field('Expected delivery date', ch('lvf-e', S.edd));
    if (t === 'Paternity Leave') extra = field('Child birth date', ch('lvf-b', S.birth));
    if (t === 'Quarantine Leave') extra = field('Document type', sel(DOC_TYPES, S.doc, 'id="lvf-dt" data-chg="l13f"'));
    if (t === 'Compensatory Off') extra = field('Credit to use', sel([['', 'Select credit']].concat(freeCredits(S.emp).map((c) => [c.id, `${c.id} · earned ${fmtS(c.earned)} · lapses ${fmtS(c.expires)}`])), S.cc, 'id="lvf-cc" data-chg="l13f"'), 1);
    return `${B.head('Apply for Leave', 'Rules are checked live. Submit stays blocked until every Eligibility, Deadline and Document check passes.', `<a class="btn" href="#/page/leave-rules">${ic('book', 15)}Leave types &amp; rules</a>`, crumbs('Apply for Leave'))}
      ${kp([Kp('calendar', 'Casual left', bal(S.emp, 'Casual Leave') + ' / ' + alloc('Casual Leave')), Kp('activity', 'Sick left', Math.max(0, bal(S.emp, 'Sick Leave')) + ' / ' + alloc('Sick Leave')), Kp('briefcase', 'Earned left', bal(S.emp, 'Earned Leave') + ' / ' + alloc('Earned Leave')), Kp('clock', 'Comp credits', freeCredits(S.emp).length, freeCredits(S.emp).length ? 'ok' : ''), Kp('x', 'Check failures', fail.length, fail.length ? 'bad' : 'ok')])}
      <section class="grid-2">
      <div class="card pad"><h3 class="ct">${ic('edit', 17)} Leave application</h3>
        ${grid((isHR() ? field('Employee', sel(emps().map((x) => x.name), S.emp, 'id="lvf-emp" data-chg="l13f"')) : field('Employee', `<input class="inp" value="${esc(S.emp)}" disabled>`)) + field('Leave type', sel(Object.keys(TYPES), t, 'id="lvf-ty" data-chg="l13t"')) + field('From', ch('lvf-f', S.from)) + field('To', ch('lvf-t', S.to)) + field('Total days (computed)', `<input class="inp" value="${r.d} day${r.d === 1 ? '' : 's'}" disabled>`) + field('Approvers', `<input class="inp" disabled value="Line Manager → Cross LM → HR">`) + extra + field('Reason', `<textarea class="inp" id="lvf-r" rows="2">${esc(S.reason)}</textarea>`, 1) + field('Work handed over to', sel([['', 'Select colleague']].concat(emps().filter((x) => x.name !== S.emp).map((x) => x.name)), S.hand, 'id="lvf-h"')) + field('Contact number during leave', inp('lvf-c', S.contact, '01XXX-XXXXXX')) + field('Attachment (file name only, mock)', `<input class="inp" type="file" data-chg="l13file">${S.file ? `<em class="sub">${ic('paperclip', 12)} ${esc(S.file)}</em>` : ''}`, 1))}
        <div class="as-note" style="margin-top:12px">${ic('alert', 14)} ${esc(T.ent)}. Deadline: ${esc(T.dl)}. Document: ${esc(T.doc)}.${t === 'Earned Leave' ? ' <b>Earned leave rule is to be defined.</b>' : ''}</div>
        <h4 style="margin:14px 0 8px">Counted-day breakdown</h4>${bdown(r.c)}
        <div class="as-act" style="margin-top:14px"><span class="grow"></span><button class="btn primary" data-act="l13-sub" ${fail.length ? 'style="opacity:.55"' : ''}>${ic('send', 15)}Submit application</button></div></div>
      <div class="card pad"><div class="ct-row"><h3 class="ct">${ic('shield', 17)} Validation</h3>${fail.length ? B.pill(fail.length + ' failed: submit blocked', 'bad') : B.pill('All checks passed', 'ok')}</div>
        ${['Eligibility', 'Deadline', 'Document'].map((g) => `<h4 style="margin:12px 0 2px">${g}</h4><ul style="list-style:none;margin:0;padding:0">${r.K.filter((k) => k.g === g).map(chk).join('')}</ul>`).join('')}
        ${fail.length ? `<div class="as-note" style="margin-top:12px;border-color:var(--bad,#dc2626)">${ic('x', 14)} Blocked: ${esc(fail[0].msg)}</div>` : ''}
      </div></section>
      <h3 class="ct" style="margin:20px 0 10px">${isHR() ? 'All leave applications' : 'My leave applications'}</h3>
      <div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>ID</th><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Stage</th><th>Status</th><th class="r"></th></tr></thead><tbody>${mine.slice(0, 40).map(appRow).join('') || '<tr><td colspan="8" class="muted">No applications</td></tr>'}</tbody></table></div></div>`;
  });
  function appRow(a) {
    const st = status(a), i = curIdx(a.stages), s = a.stages[i]; let act = '';
    if (st === 'Pending' && s) act = canAct(s) ? `<button class="btn sm" data-act="l13-rej">Reject</button><button class="btn sm primary" data-act="l13-ap">Approve</button>` : '';
    if (st === 'Pending' && a.emp === me().name) act += `<button class="btn sm" data-act="l13-cancel">Withdraw</button>`;
    return `<tr data-id="${a.id}"><td>${a.id}</td><td>${who(a.emp)}</td><td>${esc(a.type)}</td><td>${fmtS(a.from)}${a.to !== a.from ? ' – ' + fmtS(a.to) : ''}</td><td>${a.days}</td><td>${esc(statusHead(a) || (st === 'Rejected' ? esc((a.stages.find((x) => x.s === 'Rejected') || {}).note || '') : '—'))}</td><td>${pill(st)}</td><td class="r">${act}</td></tr>`;
  }
  B.chg.l13f = () => { grab(); rerender(); };
  B.chg.l13t = (t) => { grab(); const ty = t.value; if (ty === 'Maternity Leave') S.to = day(119, S.from); else if (ty === 'Paternity Leave') S.to = day(4, S.from); else if (ty === 'Compensatory Off') S.to = S.from; S.cc = ''; rerender(); };
  B.chg.l13file = (t) => { grab(); S.file = t.files && t.files[0] ? t.files[0].name : ''; rerender(); };
  B.act['l13-sub'] = () => {
    grab(); const r = evaluate(S), fail = r.K.find((k) => !k.ok);
    if (fail) { B.toast('Blocked: ' + fail.msg, 'bad'); return; }
    if (!S.reason.trim() || !S.hand || !S.contact.trim()) { B.toast('Reason, work handed over to and contact number are required', 'bad'); return; }
    const a = mkApp({ emp: S.emp, type: S.type, from: S.from, to: S.to, reason: S.reason.trim(), hand: S.hand, contact: S.contact.trim(), file: S.file, birth: S.birth, edd: S.edd, kids: S.kids });
    if (S.type === 'Compensatory Off') { const c = D().credits.find((x) => x.id === S.cc); if (c) c.usedBy = a.id; }
    Object.assign(S, { reason: '', hand: '', contact: '', file: '', cc: '', birth: '', edd: '' }); save(); rerender(); B.toast(`${a.id} submitted: ${a.days} day(s), sent to ${a.stages[0].who}`);
  };
  const aById = (id) => D().apps.find((a) => a.id === id);
  B.act['l13-ap'] = (t) => { const a = aById(rid(t)), s = a.stages[curIdx(a.stages)]; if (!s) return; Object.assign(s, { s: 'Approved', by: isHR() && s.who !== me().name ? 'Rahim Uddin (HR)' : s.who, at: today() }); done(status(a) === 'Approved' ? 'Fully approved. Balance updated' : 'Approved. Forwarded to ' + a.stages[curIdx(a.stages)].who); };
  B.act['l13-cancel'] = (t) => { aById(rid(t)).status = 'Cancelled'; done('Application withdrawn'); };
  B.act['l13-rej'] = (t) => B.modal({ title: 'Reject leave', body: field('Decline reason (visible to employee)', '<textarea class="inp" id="l13-n" rows="3"></textarea>'), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="l13-dorej" data-id="${rid(t)}">Reject</button>` });
  B.act['l13-dorej'] = (t) => { const n = B.$('#l13-n').value.trim(); if (!n) { B.toast('Add a reason', 'bad'); return; } const a = aById(t.dataset.id), s = a.stages[curIdx(a.stages)]; if (s) Object.assign(s, { s: 'Rejected', by: me().name, at: today(), note: n }); done('Leave rejected'); };

  /* =====================================================================
     2. SICK OVERFLOW & LWP
     ===================================================================== */
  const SPLIT_LBL = { c: 'Casual', e: 'Earned', l: 'LWP', w: 'Waived' }, SPLIT_COL = { c: 'var(--c1)', e: 'var(--c2)', l: 'var(--c5)', w: 'var(--c4)' };
  function split(r) {
    const over = Math.max(0, r.sick - 14), o = { c: 0, e: 0, l: 0, w: 0, over };
    let el = r.earnedLeft;
    if (r.ov === 'Waive') o.w = over; else if (r.ov === 'Casual') o.c = over; else if (r.ov === 'Earned') o.e = over; else if (r.ov === 'LWP') o.l = over;
    else { o.c = Math.min(over, r.casualLeft); o.e = Math.min(over - o.c, el); o.l = over - o.c - o.e; }
    el = Math.max(0, r.earnedLeft - o.e);
    if (r.ext > 0) { if (r.extTo === 'Earned') { const x = Math.min(r.ext, el); o.e += x; o.l += r.ext - x; } else o.l += r.ext; }
    return o;
  }
  const stack = (o) => { const tot = o.c + o.e + o.l + o.w || 1; return `<div style="display:flex;height:14px;border-radius:7px;overflow:hidden;background:var(--bg2,#eef0f5);min-width:140px">${['c', 'e', 'l', 'w'].map((k) => (o[k] ? `<i title="${SPLIT_LBL[k]} ${o[k]}" style="width:${(o[k] / tot) * 100}%;background:${SPLIT_COL[k]}"></i>` : '')).join('')}</div>`; };
  page('sick-overflow', () => {
    const R = D().over, S_ = R.map((r) => ({ r, o: split(r) })), tl = S_.reduce((a, x) => a + x.o.l, 0), unsent = S_.reduce((a, x) => a + Math.max(0, x.o.l - x.r.sent), 0);
    return `${B.head('Sick Leave Overflow & LWP', 'When sick leave used passes 14 days, the extra days are adjusted against Casual, then Earned, then Leave Without Pay.', isHR() ? `<button class="btn primary" data-act="l13-pay-all">${ic('send', 15)}Send LWP to Payroll</button>` : '', crumbs('Sick Overflow & LWP'))}
      ${kp([Kp('users', 'Employees tracked', R.length), Kp('alert', 'Over 14 sick days', S_.filter((x) => x.o.over > 0).length, 'warn'), Kp('x', 'LWP days', tl, tl ? 'bad' : ''), Kp('send', 'Waiting to go to Payroll', unsent, unsent ? 'warn' : 'ok')])}
      <div class="as-note" style="margin-bottom:12px">${ic('alert', 14)} Order of adjustment: <b>Casual → Earned → LWP</b>. A doctor-not-recommended extension goes to Earned or LWP only. Management may override with a written note.</div>
      <div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Employee</th><th>Sick used</th><th>Over 14</th><th>Split</th><th>Casual</th><th>Earned</th><th>LWP</th><th>Note</th><th class="r"></th></tr></thead><tbody>${S_.map(({ r, o }, i) => `<tr data-id="${i}"><td>${who(r.emp)}</td><td>${r.sick}</td><td>${o.over ? B.pill(o.over + ' d', 'warn') : '—'}${r.ext ? `<em class="sub">+${r.ext} d extension → ${r.extTo}</em>` : ''}</td><td>${o.over || r.ext ? stack(o) : '<span class="muted">Within limit</span>'}</td><td>${o.c}</td><td>${o.e}</td><td>${o.l ? `<b style="color:var(--bad,#dc2626)">${o.l}</b>` : 0}${o.w ? `<em class="sub">waived ${o.w}</em>` : ''}</td><td>${r.ov ? B.pill('Override: ' + r.ov, 'info') : ''}<em class="sub">${esc(r.note)}</em></td><td class="r">${isHR() ? `<button class="btn sm" data-act="l13-ov-edit">Adjust</button>${o.l - r.sent > 0 ? `<button class="btn sm" data-act="l13-pay">To Payroll</button>` : ''}` : ''}</td></tr>`).join('')}</tbody></table></div></div>
      <p class="muted" style="font-size:12px;margin:8px 0">${Object.keys(SPLIT_LBL).map((k) => `<span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${SPLIT_COL[k]};margin:0 4px 0 10px"></span>${SPLIT_LBL[k]}`).join('')}</p>
      <h3 class="ct" style="margin:20px 0 10px">${ic('send', 17)} Sent to Payroll (LWP days)</h3>
      <div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Ref</th><th>Employee</th><th>LWP days</th><th>Payroll month</th><th>Sent</th><th>By</th></tr></thead><tbody>${D().payroll.map((p) => `<tr><td>${p.id}</td><td>${who(p.emp)}</td><td><b>${p.days}</b></td><td>${esc(p.month)}</td><td>${fmt(p.at)}</td><td>${esc(p.by)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nothing sent yet</td></tr>'}</tbody></table></div></div>
      <h3 class="ct" style="margin:20px 0 10px">Override &amp; adjustment audit</h3>${auditTbl('overflow')}`;
  });
  const auditTbl = (kind) => `<div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>When</th><th>Employee</th><th>Action</th><th>Detail</th><th>Reason</th><th>By</th></tr></thead><tbody>${D().audit.filter((x) => !kind || x.kind === kind).slice(0, 30).map((x) => `<tr><td>${new Date(x.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td>${esc(x.emp)}</td><td><b>${esc(x.action)}</b></td><td>${esc(x.detail || '')}</td><td>${esc(x.reason)}</td><td>${esc(x.by)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No entries yet</td></tr>'}</tbody></table></div></div>`;
  B.act['l13-ov-edit'] = (t) => { const r = D().over[+rid(t)]; B.modal({ title: 'Adjust ' + esc(r.emp), body: grid(field('Sick days used', `<input class="inp" id="l13-su" type="number" min="0" value="${r.sick}">`) + field('Doctor-not-recommended extension (days)', `<input class="inp" id="l13-ex" type="number" min="0" value="${r.ext}">`) + field('Extension adjusted against', sel(['Earned', 'LWP'], r.extTo, 'id="l13-et"')) + field('Management discretion override', sel([['', 'None (automatic)'], 'Casual', 'Earned', 'LWP', 'Waive'], r.ov, 'id="l13-ov"')) + field('Note (required for extension or override)', `<textarea class="inp" id="l13-nt" rows="2">${esc(r.note)}</textarea>`, 1)), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="l13-ov-save" data-id="${rid(t)}">Save</button>` }); };
  B.act['l13-ov-save'] = (t) => {
    const r = D().over[+t.dataset.id], su = +B.$('#l13-su').value || 0, ex = +B.$('#l13-ex').value || 0, ov = B.$('#l13-ov').value, nt = B.$('#l13-nt').value.trim();
    if ((ex > 0 || ov) && !nt) { B.toast('A note is required for an extension or an override', 'bad'); return; }
    audit('overflow', 'OV', r.emp, ov ? 'Override: ' + ov : ex ? 'Extension to ' + B.$('#l13-et').value : 'Edited', nt || 'Sick days corrected', `sick ${r.sick}→${su}, ext ${ex}`);
    Object.assign(r, { sick: su, ext: ex, extTo: B.$('#l13-et').value, ov, note: nt }); done('Saved with audit entry');
  };
  const pay = (r) => { const o = split(r), n = o.l - r.sent; if (n <= 0) return 0; D().payroll.unshift({ id: 'PY-' + B.pad(D().payroll.length + 1, 3), emp: r.emp, days: n, month: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), at: today(), by: me().name }); r.sent += n; audit('overflow', 'PY', r.emp, 'Sent to Payroll', 'LWP deduction', n + ' day(s)'); return n; };
  B.act['l13-pay'] = (t) => { const n = pay(D().over[+rid(t)]); done(n + ' LWP day(s) sent to Payroll'); };
  B.act['l13-pay-all'] = () => { const n = D().over.reduce((a, r) => a + pay(r), 0); if (!n) { B.toast('No new LWP days to send', 'bad'); return; } done(n + ' LWP day(s) sent to Payroll'); };

  /* =====================================================================
     3. COMPENSATORY LEAVE
     ===================================================================== */
  const permOf = (emp, date) => D().perms.find((p) => p.emp === emp && p.date === date && p.status === 'Recorded');
  page('comp-leave', () => {
    const t = F.cp, e = me().name, hr = isHR(), P = D().perms.filter((p) => hr || p.emp === e || p.approver === e), C = D().credits.filter((c) => hr || c.emp === e);
    const av = C.filter((c) => credState(c) === 'Available'), exp = av.filter((c) => left(c) <= 14);
    const tabsH = tabs([['perm', 'Holiday work permissions'], ['hrs', 'Hours & credit'], ['led', 'Ledger'], ['off', 'Day-off requests']], t, 'l13-cp-tab');
    let body = '';
    if (t === 'perm') body = `<div class="as-note" style="margin-bottom:12px">${ic('alert', 14)} Flow: Dept Head / Line Manager approves <b>before</b> work, employee submits to HR, HR records the holiday as a working day. Without a recorded permission no compensatory day is earned.</div><div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>ID</th><th>Employee</th><th>Holiday</th><th>Work reason</th><th>Approver</th><th>Status</th><th class="r"></th></tr></thead><tbody>${P.map((p) => `<tr data-id="${p.id}"><td>${p.id}</td><td>${who(p.emp)}</td><td>${fmtS(p.date)} ${wd(p.date)}<em class="sub">${esc(holInfo(p.date) || 'Not a holiday')}</em></td><td>${esc(p.reason)}</td><td>${esc(p.approver)}</td><td>${pill(p.status)}</td><td class="r">${p.status === 'Pending' && (hr || p.approver === e) ? `<button class="btn sm" data-act="l13-pm-rej">Reject</button><button class="btn sm primary" data-act="l13-pm-ap">Approve</button>` : ''}${p.status === 'Approved' && (hr || p.emp === e) ? `<button class="btn sm primary" data-act="l13-pm-hr">Submit to HR</button>` : ''}${p.status === 'Submitted to HR' && hr ? `<button class="btn sm primary" data-act="l13-pm-rec">Record as working day</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No permissions</td></tr>'}</tbody></table></div></div>`;
    if (t === 'hrs') body = `<div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Employee</th><th>Date</th><th>Hours</th><th>Result</th><th>Note</th></tr></thead><tbody>${D().hours.filter((h) => hr || h.emp === e).map((h) => `<tr><td>${who(h.emp)}</td><td>${fmt(h.date)}</td><td>${h.hours} h</td><td>${h.res === 'Credited' ? B.pill('1 day credited', 'ok') : B.pill('No credit', 'bad')}</td><td>${ic(h.res === 'Credited' ? 'check-circle' : 'lock', 13)} ${esc(h.note)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No hours logged</td></tr>'}</tbody></table></div></div>`;
    if (t === 'led') body = `<div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Credit</th><th>Employee</th><th>Earned</th><th>Hours</th><th>Lapses (60 days)</th><th>Days left</th><th>Status</th><th class="r"></th></tr></thead><tbody>${C.map((c) => `<tr data-id="${c.id}"><td>${c.id}</td><td>${who(c.emp)}</td><td>${fmt(c.earned)}</td><td>${c.hours} h</td><td>${fmt(c.expires)}</td><td>${leftBadge(c) || '—'}</td><td>${pill(credState(c))}</td><td class="r">${credState(c) === 'Available' && (hr || c.emp === e) ? `<button class="btn sm primary" data-act="l13-off-new">Apply day off</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="8" class="muted">No credits</td></tr>'}</tbody></table></div></div>`;
    if (t === 'off') body = `<div class="as-note" style="margin-bottom:12px">${ic('alert', 14)} Day off needs at least 3 days notice and must fall within 60 days of earning. The supervisor may approve, decline or offer another date.</div><div class="cl-queue fl-queue">${D().apps.filter((a) => a.type === 'Compensatory Off' && (hr || a.emp === e || a.stages.some((s) => s.who === e))).map((a) => { const st = status(a), s = a.stages[curIdx(a.stages)]; return `<div class="card pad fl-req" data-id="${a.id}"><div class="cl-q-h">${B.avatar(a.emp, 40)}<div><b>${esc(a.emp)} <em class="fl-id">${a.id}</em></b><span>Day off ${fmt(a.from)} ${wd(a.from)}</span></div>${pill(st)}</div>${a.offer ? `<div class="as-note">${ic('calendar', 14)} Supervisor offered <b>${fmt(a.offer)}</b> instead.</div>` : ''}<div class="as-act"><span class="muted">${esc(statusHead(a))}</span><span class="grow"></span>${st === 'Pending' && s && canAct(s) ? `<button class="btn sm" data-act="l13-off-offer">Offer another date</button><button class="btn sm" data-act="l13-rej">Decline</button><button class="btn sm primary" data-act="l13-ap">Approve</button>` : ''}${st === 'Pending' && a.offer && a.emp === e ? `<button class="btn sm primary" data-act="l13-off-acc">Accept offer</button>` : ''}</div></div>`; }).join('') || `<div class="card pad empty"><b>No day-off requests</b></div>`}</div>`;
    return `${B.head('Compensatory Leave', 'Holiday work permission, hours, 60-day credit ledger and day-off requests.', `<button class="btn" data-act="l13-hrs-new">${ic('clock', 15)}Log hours worked</button><button class="btn primary" data-act="l13-pm-new">${ic('plus', 16)}Holiday work permission</button>`, crumbs('Compensatory Leave'))}
      ${kp([Kp('check-circle', 'Available credits', av.length, 'ok'), Kp('alert', 'Expiring in 14 days', exp.length, exp.length ? 'warn' : ''), Kp('clock', 'Permissions pending', P.filter((p) => p.status !== 'Recorded' && p.status !== 'Rejected').length), Kp('x', 'Lapsed', C.filter((c) => credState(c) === 'Lapsed').length, 'bad')])}
      <div class="filterbar">${tabsH}</div>${body}`;
  });
  B.act['l13-cp-tab'] = (t) => { F.cp = t.dataset.t; rerender(); };
  const empSel = (id) => (isHR() ? field('Employee', sel(emps().map((x) => x.name), me().name, `id="${id}"`)) : field('Employee', `<input class="inp" id="${id}" value="${esc(me().name)}" disabled>`));
  B.act['l13-pm-new'] = () => B.modal({ title: 'Holiday work permission', body: grid(empSel('l13-pe') + field('Holiday to work on', `<input class="inp" type="date" id="l13-pd" value="${day(1)}">`) + field('Reason for work', '<textarea class="inp" id="l13-pr" rows="2"></textarea>', 1)) + `<p class="cl-hint">${ic('alert', 14)} Must be approved by Dept Head / Line Manager before the holiday work starts.</p>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="l13-pm-save">Request approval</button>' });
  B.act['l13-pm-save'] = () => {
    const emp = B.$('#l13-pe').value, d = B.$('#l13-pd').value, r = B.$('#l13-pr').value.trim();
    if (!d || !r) { B.toast('Date and reason are required', 'bad'); return; } if (d < today()) { B.toast('Permission must be approved BEFORE working. Pick today or a future date', 'bad'); return; }
    if (!isHol(d)) { B.toast('That date is not a holiday or weekly off', 'bad'); return; } if (D().perms.some((p) => p.emp === emp && p.date === d && p.status !== 'Rejected')) { B.toast('A permission already exists for that date', 'bad'); return; }
    D().perms.unshift({ id: 'HP-' + B.pad(D().perms.length + 1, 3), emp, date: d, reason: r, approver: mgrName(eByName(emp)), status: 'Pending', by: '', created: today() }); done('Sent to ' + mgrName(eByName(emp)) + ' for approval');
  };
  const permBy = (t) => D().perms.find((p) => p.id === rid(t));
  B.act['l13-pm-ap'] = (t) => { const p = permBy(t); p.status = 'Approved'; p.by = me().name; done('Approved. Employee can now submit to HR'); };
  B.act['l13-pm-rej'] = (t) => { const p = permBy(t); p.status = 'Rejected'; p.by = me().name; done('Permission rejected'); };
  B.act['l13-pm-hr'] = (t) => { permBy(t).status = 'Submitted to HR'; done('Submitted to HR'); };
  B.act['l13-pm-rec'] = (t) => { permBy(t).status = 'Recorded'; done('Holiday recorded as a working day'); };
  B.act['l13-hrs-new'] = () => B.modal({ title: 'Log holiday hours worked', body: grid(empSel('l13-he') + field('Date worked', `<input class="inp" type="date" id="l13-hd" value="${today()}">`) + field('Hours worked', '<input class="inp" type="number" id="l13-hh" min="0" max="24" step="0.5" value="8">')) + `<p class="cl-hint">${ic('alert', 14)} 6 or more hours with a recorded permission earns 1 compensatory day. No permission means no credit.</p>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="l13-hrs-save">Save</button>' });
  B.act['l13-hrs-save'] = () => {
    const emp = B.$('#l13-he').value, d = B.$('#l13-hd').value, h = +B.$('#l13-hh').value; if (!d || !h) { B.toast('Date and hours are required', 'bad'); return; }
    const p = permOf(emp, d); let res = 'Credited', note = '1 comp day credited';
    if (!p) { res = 'Blocked'; note = 'No approved holiday-work permission'; } else if (p.credited) { res = 'Blocked'; note = 'Already credited for this permission'; } else if (h < 6) { res = 'Blocked'; note = 'Less than 6 hours'; }
    D().hours.unshift({ id: uid('h'), emp, date: d, hours: h, res, note });
    if (res === 'Credited') { p.credited = true; D().credits.push({ id: 'CC-' + B.pad(D().credits.length + 1, 3), emp, earned: d, hours: h, expires: day(60, d), perm: p.id }); }
    F.cp = 'hrs'; done(res === 'Credited' ? '1 compensatory day credited. Lapses ' + fmtS(day(60, d)) : 'No credit: ' + note);
  };
  B.act['l13-off-new'] = (t) => { const c = D().credits.find((x) => x.id === rid(t)); B.modal({ title: 'Apply compensatory day off', body: grid(field('Credit', `<input class="inp" disabled value="${c.id} · lapses ${fmtS(c.expires)}">`) + field('Day off date', `<input class="inp" type="date" id="l13-od" value="${day(3)}" min="${day(3)}" max="${c.expires}">`)) + `<p class="cl-hint">${ic('alert', 14)} At least 3 days notice and on or before ${fmt(c.expires)}.</p>`, foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="l13-off-save" data-id="${c.id}">Apply</button>` }); };
  B.act['l13-off-save'] = (t) => {
    const c = D().credits.find((x) => x.id === t.dataset.id), d = B.$('#l13-od').value;
    if (!d) { B.toast('Pick a date', 'bad'); return; } if (diff(today(), d) < 3) { B.toast('Apply at least 3 days before the day off', 'bad'); return; } if (d > c.expires) { B.toast('Credit lapses on ' + fmt(c.expires) + '. Pick an earlier date', 'bad'); return; } if (isHol(d)) { B.toast('That day is already a holiday', 'bad'); return; }
    const a = mkApp({ emp: c.emp, type: 'Compensatory Off', from: d, to: d, reason: 'Compensatory day off for ' + fmt(c.earned) }); c.usedBy = a.id; F.cp = 'off'; done('Day-off request sent to ' + a.stages[0].who);
  };
  B.act['l13-off-offer'] = (t) => B.modal({ title: 'Offer another date', body: field('Alternative date', `<input class="inp" id="l13-ofd" type="date" value="${day(5)}" min="${day(1)}">`) + field('Reason', '<textarea class="inp" id="l13-ofr" rows="2"></textarea>'), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="l13-off-doffer" data-id="${rid(t)}">Offer</button>` });
  B.act['l13-off-doffer'] = (t) => { const d = B.$('#l13-ofd').value; if (!d || !B.$('#l13-ofr').value.trim()) { B.toast('Date and reason are required', 'bad'); return; } const a = aById(t.dataset.id), c = D().credits.find((x) => x.usedBy === a.id); if (c && d > c.expires) { B.toast('Credit lapses ' + fmt(c.expires), 'bad'); return; } a.offer = d; done('Alternative date offered to ' + a.emp); };
  B.act['l13-off-acc'] = (t) => { const a = aById(rid(t)); a.from = a.to = a.offer; a.offer = ''; a.stages.forEach((s) => { if (s.s === 'Pending') Object.assign(s, { s: 'Approved', by: s.who, at: today() }); }); done('Offer accepted. Day off confirmed for ' + fmt(a.from)); };

  /* =====================================================================
     4. MANAGEMENT ACTIONS ON APPROVED LEAVE
     ===================================================================== */
  const mgmtList = () => D().apps.filter((a) => status(a) === 'Approved' && a.type !== 'Compensatory Off' && a.to >= day(-7)).sort((a, b) => a.from.localeCompare(b.from));
  page('leave-mgmt-actions', () => {
    const L = mgmtList(), hr = isHR();
    return `${B.head('Management Actions on Approved Leave', 'Reschedule, approve fewer days, cancel or call an employee back. A written reason is mandatory and every action is audited.', '', crumbs('Management Actions'))}
      ${kp([Kp('calendar', 'Approved leave (current / upcoming)', L.length), Kp('clock', 'Starting within 7 days', L.filter((a) => a.from >= today() && diff(today(), a.from) <= 7).length, 'warn'), Kp('refresh', 'Actions taken', D().audit.filter((x) => x.kind === 'mgmt').length), Kp('check-circle', 'Days restored', D().audit.filter((x) => x.kind === 'mgmt').reduce((s, x) => s + (x.restored || 0), 0), 'ok')])}
      ${hr ? '' : `<div class="as-note" style="margin-bottom:12px">${ic('lock', 14)} Actions are available to management and HR only.</div>`}
      <div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>ID</th><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Balance after</th><th class="r">Action</th></tr></thead><tbody>${L.map((a) => `<tr data-id="${a.id}"><td>${a.id}</td><td>${who(a.emp)}</td><td>${esc(a.type)}</td><td>${fmtS(a.from)}${a.to !== a.from ? ' – ' + fmtS(a.to) : ''}${a.from <= today() && a.to >= today() ? ' ' + B.pill('On leave', 'info') : ''}${a.orig !== a.days ? `<em class="sub">originally ${a.orig} d</em>` : ''}</td><td>${a.days}</td><td>${a.type === 'Leave Without Pay' ? '—' : bal(a.emp, a.type) + ' left'}</td><td class="r">${hr ? `<button class="btn sm" data-act="l13-m-res">Reschedule</button><button class="btn sm" data-act="l13-m-few">Fewer days</button><button class="btn sm" data-act="l13-m-call">Call back</button><button class="btn sm" data-act="l13-m-can">Cancel</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No approved leave</td></tr>'}</tbody></table></div></div>
      <h3 class="ct" style="margin:20px 0 10px">${ic('list', 17)} Audit trail</h3>${auditTbl('mgmt')}`;
  });
  const reasonF = '<div class="fld"><label>Reason (required)</label><textarea class="inp" id="l13-mr" rows="2"></textarea></div>';
  const mModal = (title, a, body, act) => B.modal({ title: `${title} · ${a.id}`, body: `<div class="cl-meta">${who(a.emp)}<span>${esc(a.type)} · ${fmt(a.from)} → ${fmt(a.to)} · ${a.days} day(s)</span></div><div style="margin-top:12px">${body}${reasonF}</div>`, foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="${act}" data-id="${a.id}">Confirm</button>` });
  B.act['l13-m-res'] = (t) => { const a = aById(rid(t)); mModal('Reschedule', a, grid(field('New from', `<input class="inp" type="date" id="l13-m1" value="${a.from}">`) + field('New to', `<input class="inp" type="date" id="l13-m2" value="${a.to}">`)), 'l13-m-dores'); };
  B.act['l13-m-few'] = (t) => { const a = aById(rid(t)); mModal('Approve fewer days', a, field('Approve only (days from start)', `<input class="inp" type="number" id="l13-m1" min="1" max="${a.days - 1}" value="${Math.max(1, a.days - 1)}">`), 'l13-m-dofew'); };
  B.act['l13-m-call'] = (t) => { const a = aById(rid(t)); mModal('Call employee back', a, field('Employee returns on', `<input class="inp" type="date" id="l13-m1" value="${a.from > today() ? a.from : day(1)}">`) + `<p class="cl-hint">Days from the return date to the end of leave are restored to the balance.</p>`, 'l13-m-docall'); };
  B.act['l13-m-can'] = (t) => { const a = aById(rid(t)); mModal('Cancel approved leave', a, `<p class="cl-hint">${ic('alert', 14)} All ${a.days} day(s) will be restored to ${esc(a.emp)}'s ${esc(a.type)} balance.</p>`, 'l13-m-docan'); };
  const mReason = () => { const r = B.$('#l13-mr').value.trim(); if (!r) B.toast('A reason is required for this action', 'bad'); return r; };
  const mlog = (a, action, r, det, restored) => { audit('mgmt', a.id, a.emp, action, r, det); D().audit[0].restored = restored || 0; };
  B.act['l13-m-dores'] = (t) => {
    const a = aById(t.dataset.id), r = mReason(); if (!r) return; const f = B.$('#l13-m1').value, to = B.$('#l13-m2').value; if (!f || !to || to < f) { B.toast('Choose a valid new date range', 'bad'); return; }
    const d = countDays(a.type, f, to).days, extra = d - a.days; if (a.type !== 'Leave Without Pay' && a.type !== 'Maternity Leave' && extra > bal(a.emp, a.type)) { B.toast('Not enough ' + a.type + ' balance for the new dates', 'bad'); return; }
    const old = `${fmtS(a.from)}-${fmtS(a.to)} (${a.days}d)`; Object.assign(a, { from: f, to, days: d }); mlog(a, 'Rescheduled', r, `${old} → ${fmtS(f)}-${fmtS(to)} (${d}d)`, Math.max(0, -extra)); done('Leave rescheduled');
  };
  B.act['l13-m-dofew'] = (t) => {
    const a = aById(t.dataset.id), r = mReason(); if (!r) return; const n = +B.$('#l13-m1').value; if (!(n >= 1 && n < a.days)) { B.toast('Enter fewer days than currently approved', 'bad'); return; }
    let to = a.from, c = 0; while (countDays(a.type, a.from, to).days < n && c++ < 400) to = day(1, to); const d = countDays(a.type, a.from, to).days, was = a.days; Object.assign(a, { to, days: d }); mlog(a, 'Approved fewer days', r, `${was} → ${d} day(s)`, was - d); done(`Approved ${d} day(s). ${was - d} restored to balance`);
  };
  B.act['l13-m-docall'] = (t) => {
    const a = aById(t.dataset.id), r = mReason(); if (!r) return; const d = B.$('#l13-m1').value; if (!d || d <= a.from || d > a.to) { B.toast('Return date must fall inside the leave period (after its first day)', 'bad'); return; }
    const to = day(-1, d), nd = countDays(a.type, a.from, to).days, was = a.days; Object.assign(a, { to, days: nd }); mlog(a, 'Called back', r, `Returns ${fmt(d)}; ${was} → ${nd} day(s)`, was - nd); done(`${a.emp} called back. ${was - nd} day(s) restored`);
  };
  B.act['l13-m-docan'] = (t) => { const a = aById(t.dataset.id), r = mReason(); if (!r) return; const was = a.days; a.status = 'Cancelled'; mlog(a, 'Cancelled', r, `${a.type} ${fmtS(a.from)}-${fmtS(a.to)}`, was); done(`Leave cancelled. ${was} day(s) restored`); };

  /* =====================================================================
     5. LEAVE REPORTS
     ===================================================================== */
  const dayWaited = (a) => { const l = a.stages.filter((s) => s.s === 'Approved' && s.at).map((s) => s.at).sort().pop(); return Math.max(0, diff(l || a.created, today())); };
  const tbl = (head, rows) => `<div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${head.length}" class="muted">No data</td></tr>`}</tbody></table></div></div>`;
  page('leave-reports', () => {
    const t = F.tab, A = D().apps, ty = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave', 'Quarantine Leave', 'Compensatory Off', 'Leave Without Pay'];
    const short = (x) => x.replace(' Leave', '').replace('Leave Without Pay', 'LWP').replace('Compensatory Off', 'Comp');
    let body = '';
    if (t === 'reg') body = tbl(['ID', 'Employee', 'Type', 'Dates', 'Days', 'Status', 'Approver / stage', 'Decline reason'], A.filter((a) => !F.q || a.emp.toLowerCase().includes(F.q.toLowerCase())).map((a) => { const st = status(a), rj = a.stages.find((s) => s.s === 'Rejected'), last = a.stages.filter((s) => s.s === 'Approved').pop(); return `<tr><td>${a.id}</td><td>${who(a.emp)}</td><td>${esc(a.type)}</td><td>${fmtS(a.from)}${a.to !== a.from ? ' – ' + fmtS(a.to) : ''}</td><td>${a.days}</td><td>${pill(st)}</td><td>${esc(st === 'Pending' ? statusHead(a) : rj ? rj.by : last ? last.by : '—')}</td><td>${esc(rj ? rj.note : '')}</td></tr>`; }));
    if (t === 'pend') body = tbl(['ID', 'Employee', 'Type', 'Dates', 'Current stage', 'Waiting on', 'Waiting time'], A.filter((a) => status(a) === 'Pending').map((a) => { const s = a.stages[curIdx(a.stages)], w = dayWaited(a); return `<tr><td>${a.id}</td><td>${who(a.emp)}</td><td>${esc(a.type)}</td><td>${fmtS(a.from)}–${fmtS(a.to)}</td><td>${esc(stageNote(s))}</td><td>${esc(s.who)}</td><td>${B.pill(w + ' day' + (w === 1 ? '' : 's'), w >= 3 ? 'bad' : w >= 2 ? 'warn' : 'ok')}</td></tr>`; }));
    if (t === 'dept') {
      const dd = {}; A.filter(live).forEach((a) => { const d = eByName(a.emp).dept || 'Other'; (dd[d] = dd[d] || {})[a.type] = ((dd[d] || {})[a.type] || 0) + a.days; });
      const mm = {}; A.filter(live).forEach((a) => { const m = a.from.slice(0, 7); (mm[m] = mm[m] || {})[a.type] = (mm[m][a.type] || 0) + a.days; });
      const depts = Object.keys(dd).sort(), tot = (o) => Object.values(o).reduce((s, v) => s + v, 0);
      body = `<section class="grid-2"><div class="card pad"><h3 class="ct">Days by department</h3>${B.hbars(depts.map((d) => ({ label: d, value: tot(dd[d]) })), { multi: true })}</div><div class="card pad"><h3 class="ct">Days by type</h3>${B.hbars(ty.map((x) => ({ label: short(x), value: A.filter((a) => live(a) && a.type === x).reduce((s, a) => s + a.days, 0) })), { multi: true })}</div></section>
        <h3 class="ct" style="margin:20px 0 10px">Department × type (days)</h3>${tbl(['Department'].concat(ty.map(short), ['Total']), depts.map((d) => `<tr><td><b>${esc(d)}</b></td>${ty.map((x) => `<td>${dd[d][x] || '·'}</td>`).join('')}<td><b>${tot(dd[d])}</b></td></tr>`))}
        <h3 class="ct" style="margin:20px 0 10px">Month × type (days, by start month)</h3>${tbl(['Month'].concat(ty.map(short), ['Total']), Object.keys(mm).sort().map((m) => `<tr><td><b>${new Date(m + '-01T00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</b></td>${ty.map((x) => `<td>${mm[m][x] || '·'}</td>`).join('')}<td><b>${tot(mm[m])}</b></td></tr>`))}`;
    }
    if (t === 'comp') body = tbl(['Credit', 'Employee', 'Earned', 'Lapses', 'Days left', 'Status'], D().credits.map((c) => `<tr><td>${c.id}</td><td>${who(c.emp)}</td><td>${fmt(c.earned)}</td><td>${fmt(c.expires)}</td><td>${leftBadge(c) || '—'}</td><td>${pill(credState(c))}</td></tr>`));
    if (t === 'lwp') { const rows = D().over.map((r) => ({ r, o: split(r) })).filter((x) => x.o.l || x.o.over); body = `<div class="as-note" style="margin-bottom:12px">${ic('send', 14)} Sent to Payroll: ${D().payroll.reduce((s, p) => s + p.days, 0)} LWP day(s) in ${D().payroll.length} batch(es). Apply LWP leave is counted separately below.</div>` + tbl(['Employee', 'Sick used', 'Over 14', 'Casual', 'Earned', 'LWP', 'Payroll'], rows.map(({ r, o }) => `<tr><td>${who(r.emp)}</td><td>${r.sick}</td><td>${o.over}</td><td>${o.c}</td><td>${o.e}</td><td><b>${o.l}</b></td><td>${o.l ? pill(r.sent >= o.l ? 'Sent' : 'Not sent') : '—'}</td></tr>`)) + `<h3 class="ct" style="margin:20px 0 10px">Approved LWP applications</h3>` + tbl(['ID', 'Employee', 'Dates', 'Days', 'Status'], A.filter((a) => a.type === 'Leave Without Pay').map((a) => `<tr><td>${a.id}</td><td>${who(a.emp)}</td><td>${fmtS(a.from)}–${fmtS(a.to)}</td><td>${a.days}</td><td>${pill(status(a))}</td></tr>`)); }
    return `${B.head('Leave Reports', 'Register, pending approvals, department summary, compensatory credits and LWP sent to Payroll.', '', crumbs('Leave Reports'))}
      ${kp([Kp('list', 'Applications', A.length), Kp('clock', 'Pending', A.filter((a) => status(a) === 'Pending').length, 'warn'), Kp('check-circle', 'Approved', A.filter((a) => status(a) === 'Approved').length, 'ok'), Kp('x', 'Rejected', A.filter((a) => status(a) === 'Rejected').length, 'bad'), Kp('calendar', 'Days taken / booked', A.filter(live).reduce((s, a) => s + a.days, 0))])}
      <div class="filterbar">${tabs([['reg', 'Leave register'], ['pend', 'Pending approvals'], ['dept', 'Summary by department'], ['comp', 'Compensatory'], ['lwp', 'LWP & overflow']], t, 'l13-rp-tab')}${t === 'reg' ? `<input class="inp" id="l13-q" data-chg="l13q" placeholder="Search employee" value="${esc(F.q)}" style="max-width:220px">` : ''}</div>${body}`;
  });
  B.act['l13-rp-tab'] = (t) => { F.tab = t.dataset.t; rerender(); };
  B.chg.l13q = (t) => { F.q = t.value; rerender(); };

  /* =====================================================================
     6. LEAVE TYPES & RULES
     ===================================================================== */
  page('leave-rules', () => `${B.head('Leave Types & Rules', 'Entitlement, carry-forward, supporting document and application deadline for every leave type.', `<a class="btn primary" href="#/page/leave-apply">${ic('plus', 16)}Apply for leave</a>`, crumbs('Leave Types & Rules'))}
    <div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Leave type</th><th>Entitlement</th><th>Who</th><th>Carry / encash</th><th>Document</th><th>Deadline</th></tr></thead><tbody>${Object.keys(TYPES).map((k) => { const T = TYPES[k]; return `<tr><td><b>${k}</b>${k === 'Earned Leave' ? '<em class="sub">Rule to be defined</em>' : ''}</td><td>${esc(T.ent)}</td><td>${T.gender ? B.pill(T.gender + ' only', 'info') : 'All employees'}</td><td>${esc(T.carry)}</td><td>${esc(T.doc)}</td><td>${esc(T.dl)}</td></tr>`; }).join('')}</tbody></table></div></div>
    <div class="as-note" style="margin-top:12px">${ic('calendar', 14)} <b>Holiday counting (Casual, Sick, Earned, Paternity, LWP):</b> a weekly or festival holiday inside the leave period counts as leave. A holiday just before or after the period is not counted. Example: Thu to Sat with Friday = 3 days; Thursday only = 1; Saturday only = 1. Friday is the weekly off${holDb().length ? '; ' + holDb().length + ' festival / alternate-Saturday holiday(s) loaded from the holiday calendar.' : '.'}</div>
    <div class="as-note" style="margin-top:10px">${ic('alert', 14)} Sick leave beyond 14 days: adjusted Casual, then Earned, then LWP. See <a href="#/page/sick-overflow">Sick Overflow &amp; LWP</a>.</div>`);

  /* ---------- registration ---------- */
  [['leave-apply', 'Apply for Leave', 'edit'], ['sick-overflow', 'Sick Overflow & LWP', 'activity'], ['comp-leave', 'Compensatory Leave', 'clock'], ['leave-mgmt-actions', 'Management Actions', 'settings'], ['leave-reports', 'Leave Reports', 'pie'], ['leave-rules', 'Leave Types & Rules', 'book']].forEach(([id, label, icon]) => {
    B.PAGES[id] = { label, icon };
    const m = B.NAV.find((x) => x.id === 'leaves'); if (m && !m.items.includes('p:' + id)) m.items.push('p:' + id);
  });
})();
