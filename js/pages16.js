/* Bijoy HRMS — Bangladesh-policy Payroll workbench:
   policy rules, monthly run wizard, payment, versioned payslips, corrections, salary profiles,
   statutory items, final settlement and payroll reports. Data lives in localStorage (demo only).
   All statutory rates are configurable placeholders that must be confirmed (Labour Act 2006 / tax rules). */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const KEY = 'bijoy-payroll-db-v1', LOCK = 'bijoy-payroll-lock-v1';
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const day = (n, from) => { const d = from ? new Date(from + 'T00:00') : new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const fmtS = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—');
  const me = () => (B.role === 'employee' ? B.ME : B.ADMIN_EMP);
  const isHR = () => B.role !== 'employee';
  const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 99);
  const M = (n) => B.money(n || 0);
  const who = (n) => `<span class="as-who">${B.avatar(n, 26)}<span>${esc(n)}</span></span>`;
  const Kp = (i, t, v, tn) => B.kpi(i, t, v, null, null, tn);
  const kp = (a) => `<section class="kpis sm lv-stats" style="grid-template-columns:repeat(${a.length},minmax(0,1fr))">${a.join('')}</section>`;
  const tabs = (p, list, cur) => `<div class="seg sm as-tabs">${list.map((t) => `<button class="${t[0] === cur ? 'on' : ''}" data-act="pr-tab" data-p="${p}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>`;
  const field = (l, c, full) => `<div class="fld" ${full ? 'style="grid-column:1/-1"' : ''}><label>${l}</label>${c}</div>`;
  const grid = (c) => `<div class="fgrid" style="grid-template-columns:1fr 1fr">${c}</div>`;
  const crumbs = (l) => [{ label: 'HR', href: '#/' }, { label: 'Payroll' }, { label: l }];
  const PILL = { Pending: 'warn', Approved: 'ok', Rejected: 'bad', Paid: 'ok', Failed: 'bad', Open: 'info', Locked: 'warn', Calculated: 'info', Review: 'warn', Current: 'ok', Superseded: 'mute', Draft: 'mute', Prepared: 'info', 'In approval': 'warn', Reversed: 'mute', Applied: 'ok', 'Pending HR': 'warn', 'Pending approver': 'warn', 'Retry ready': 'info', Complete: 'ok', Published: 'ok', Unpublished: 'mute', Probation: 'warn', Confirmed: 'ok', Active: 'ok', Cancelled: 'mute', 'To be confirmed': 'warn', Reopened: 'info', Unpaid: 'bad', 'To confirm': 'warn' };
  const pill = (s) => B.pill(s, PILL[s] || 'mute');
  const tbc = '<span class="pr-tbc">To be confirmed</span>';
  const stripT = (s) => String(s).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
  const sum = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0);
  const gv = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const sv = (o, p, v) => { const k = p.split('.'), l = k.pop(); const t = k.reduce((a, x) => a[x], o); t[l] = v; };
  /* months */
  const ym = (d) => d.slice(0, 7);
  const curM = () => ym(today());
  const addM = (m, n) => { const d = new Date(m + '-01T00:00'); d.setMonth(d.getMonth() + n); return iso(d).slice(0, 7); };
  const dim = (m) => new Date(+m.slice(0, 4), +m.slice(5), 0).getDate();
  const mStart = (m) => m + '-01', mEnd = (m) => m + '-' + B.pad(dim(m));
  const mLab = (m) => new Date(m + '-01T00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  const mShort = (m) => new Date(m + '-01T00:00').toLocaleDateString('en-GB', { month: 'short' });
  const workDays = (m) => { let n = 0; for (let i = 1; i <= dim(m); i++) if (new Date(m + '-' + B.pad(i) + 'T00:00').getDay() !== 5) n++; return n; };
  const monthsBetween = (a, b) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7)) - (+b.slice(8, 10) < +a.slice(8, 10) ? 1 : 0);

  /* =====================================================================
     STORE
     ===================================================================== */
  let db = null;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  const D = () => { if (!db) { try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} if (!db || !db.vers) { db = {}; seed(); save(); } } return db; };
  const locks = () => { try { const a = JSON.parse(localStorage.getItem(LOCK)); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const setLocks = (a) => { try { localStorage.setItem(LOCK, JSON.stringify(Array.from(new Set(a)).sort())); } catch (e) {} };
  const nid = (k, p, l) => { const d = D(); d.seq = d.seq || {}; d.seq[k] = (d.seq[k] || 0) + 1; return p + B.pad(d.seq[k], l || 4); };
  const audit = (what, old, nw, reason, approver) => { D().audit.unshift({ at: new Date().toISOString().slice(0, 16).replace('T', ' '), by: me().name, what, old: String(old == null ? '—' : old), nw: String(nw == null ? '—' : nw), reason: reason || '', approver: approver || '—' }); };
  const emps = () => B.EMPLOYEES.filter((e) => e.status !== 'Left');
  const doj = (e) => (db && db.join && db.join[e.id]) || e.doj;
  const lastDayOf = (e) => { const s = (D().settle || []).find((x) => x.emp === e.id && x.status !== 'Cancelled'); return s ? s.lwd : null; };

  const DEFAULT_RULES = () => ({
    rateMode: '30', wdays: 26, lwpBase: 'gross', bothLate: true, cutoff: '11:00', cutoffLWP: true, openExempt: true, encashEarned: false,
    slabs: [{ f: 1, t: 2, d: 0 }, { f: 3, t: 5, d: 1 }, { f: 6, t: 8, d: 2 }, { f: 9, t: 11, d: 3 }, { f: 12, t: null, d: 0, per: 3, tbc: true }],
    early: { free: 2, pen: 0.5 },
    comps: [{ k: 'basic', n: 'Basic', type: 'pg', v: 55 }, { k: 'hra', n: 'House rent', type: 'pb', v: 50 }, { k: 'med', n: 'Medical', type: 'fx', v: 1500 }, { k: 'conv', n: 'Conveyance', type: 'fx', v: 1000 }, { k: 'oth', n: 'Other allowance', type: 'bal', v: 0 }],
    leaveTypes: [{ t: 'Casual Leave', p: 'Paid' }, { t: 'Sick Leave', p: 'Paid' }, { t: 'Maternity Leave', p: 'Paid', note: 'Full pay' }, { t: 'Paternity Leave', p: 'Paid' }, { t: 'Compensatory Off', p: 'Paid' }, { t: 'Quarantine Leave', p: 'To confirm' }, { t: 'Earned Leave', p: 'To confirm' }, { t: 'Leave Without Pay', p: 'Unpaid' }, { t: 'Public / weekly holidays', p: 'Paid' }]
  });
  const COMP_TYPES = [['fx', 'Fixed ৳'], ['pg', '% of gross'], ['pb', '% of basic'], ['bal', 'Balance of gross']];
  const rulesFor = (mk) => { const v = D().vers.filter((x) => x.eff <= mEnd(mk)).sort((a, b) => a.eff.localeCompare(b.eff)); return (v.length ? v[v.length - 1] : D().vers[0]).r; };

  /* ---------------- attendance (adapter: B.attMonthly if present, else seeded) ---------------- */
  function att(id, mk) {
    const rg = B.rng('pa' + id + mk), h = B.hash(id) % 13;
    const x = rg(), late = x < 0.55 ? Math.floor(rg() * 3) : x < 0.82 ? 3 + Math.floor(rg() * 6) : 9 + Math.floor(rg() * 6);
    const a = {
      late: late, extreme: Math.min(4, Math.floor(rg() * rg() * 5)), afterCut: rg() < 0.1 ? 1 : 0, absent: rg() < 0.08 ? 1 : rg() < 0.03 ? 2 : 0, early: Math.floor(rg() * rg() * 6),
      leaves: [], wfh: Math.floor(rg() * 5), od: rg() < 0.2 ? 1 : 0, excused: rg() < 0.25 ? 1 + Math.floor(rg() * 2) : 0, open: h === 5
    };
    if (rg() < 0.3) a.leaves.push({ t: 'Casual Leave', days: 1 + Math.floor(rg() * 2) });
    if (rg() < 0.2) a.leaves.push({ t: 'Sick Leave', days: 1 + Math.floor(rg() * 2) });
    if (rg() < 0.05) a.leaves.push({ t: 'Earned Leave', days: 2 });
    if (rg() < 0.03) a.leaves.push({ t: 'Leave Without Pay', days: 1 + Math.floor(rg() * 2) });
    try {
      if (typeof B.attMonthly === 'function') {
        const m = B.attMonthly(mk), r = Array.isArray(m) ? m.find((q) => (q.emp || q.id || q.empId) === id) : m && m[id];
        if (r) {
          const pick = (...k) => { for (const z of k) if (r[z] != null && typeof r[z] === 'number') return r[z]; };
          const set = (f, v) => { if (v != null) a[f] = v; };
          set('late', pick('late', 'lateCount', 'lates')); set('extreme', pick('extreme', 'extremeLate', 'extremeLates')); set('afterCut', pick('afterCut', 'afterCutoff', 'lateAbsent'));
          set('absent', pick('absent', 'absents', 'lwp')); set('early', pick('early', 'earlyLeave', 'earlyLeaves')); set('wfh', pick('wfh')); set('od', pick('od', 'outsideDuty'));
          if (Array.isArray(r.leaves)) a.leaves = r.leaves.map((l) => ({ t: l.t || l.type, days: l.days || l.n || 1 }));
          if (r.open != null) a.open = !!r.open;
        }
      }
    } catch (e) {}
    return a;
  }

  /* ---------------- salary at a date (probation -> confirmed, revisions) ---------------- */
  const prof = (id) => { const p = D().prof; return p[id] || (p[id] = { revs: [] }); };
  function salaryAt(e, date) {
    const p = prof(e.id), revs = (D().revs || []).filter((r) => r.emp === e.id && r.status === 'Approved').sort((a, b) => a.eff.localeCompare(b.eff));
    let s = e.salary;
    if (revs.length) { s = revs[0].old; revs.forEach((r) => { if (r.eff <= date) s = r.new; }); }
    if (p.prob && date < p.prob.confirm && !(revs.length && revs[0].eff <= date)) s = p.prob.salary;
    return s;
  }
  function grossFor(e, mk) { const n = dim(mk); let t = 0; for (let i = 1; i <= n; i++) t += salaryAt(e, mk + '-' + B.pad(i)); return Math.round(t / n); }
  function compLines(g, comps) {
    const out = []; let basic = 0, used = 0;
    comps.forEach((c) => {
      let a = 0;
      if (c.type === 'fx') a = +c.v; else if (c.type === 'pg') a = g * c.v / 100; else if (c.type === 'pb') a = basic * c.v / 100; else a = Math.max(0, g - used);
      a = Math.round(a); if (c.k === 'basic') basic = a; used += a; out.push({ n: c.n, amt: a, k: c.k });
    });
    const diff = g - sum(out, (x) => x.amt); if (diff && out.length) out[out.length - 1].amt += diff;
    return out;
  }
  const slabDays = (R, c) => { for (const s of R.slabs) { if (c >= s.f && (s.t == null || c <= s.t)) return s.per ? Math.floor(c / s.per) : s.d; } return 0; };
  const loanLeft = (l) => l.total - sum(l.paid || [], (p) => p.amt);
  const recLeft = (r) => (r.paid || []).length;

  /* ---------------- tax (simplified, all values configurable & to be confirmed) ---------------- */
  function taxMonthly(S, annual) {
    const ex = Math.min(annual * S.exemptPct / 100, S.exemptCap), tx = Math.max(0, annual - ex); let rem = tx, tax = 0;
    for (const sl of S.slabs) { const amt = sl.upto == null ? rem : Math.min(rem, sl.upto); tax += amt * sl.rate / 100; rem -= amt; if (rem <= 0) break; }
    tax = Math.max(0, tax - (S.rebate || 0)); if (tax > 0) tax = Math.max(tax, S.minTax || 0);
    return Math.round(tax / 12);
  }
  function confirmedBy(e, mk, S) { const p = prof(e.id); if (p.prob) return mEnd(mk) >= p.prob.confirm; return monthsBetween(doj(e), mEnd(mk)) >= S.pf.after; }

  /* =====================================================================
     DEDUCTIONS ENGINE — order: leave > absent/LWP > late > early-leave > manual > statutory/other
     ===================================================================== */
  function calcEmp(e, mk, R, o) {
    o = o || {}; const d = D(), S = d.stat, dm = dim(mk), s0 = mStart(mk), en = o.lwd && o.lwd < mEnd(mk) ? o.lwd : mEnd(mk), from = doj(e) > s0 ? doj(e) : s0;
    const emDays = Math.max(0, Math.round((new Date(en + 'T00:00') - new Date(from + 'T00:00')) / 864e5) + 1), f = Math.min(1, emDays / dm);
    const G = grossFor(e, mk), cl = compLines(G, R.comps), basicFull = cl[0].amt, rate = R.rateMode === 'wd' ? (R.wdays || workDays(mk)) : 30;
    const bd = basicFull / rate, gd = (R.lwpBase === 'basic' ? basicFull : G) / rate, A = att(e.id, mk), mon = mShort(mk);
    const earn = cl.map((c) => ({ n: c.n, amt: Math.round(c.amt * f), note: f < 1 ? `${emDays} of ${dm} days` : '' }));
    const gross = sum(earn, (x) => x.amt), ded = [], add = [], flags = [], notes = [];
    const L = (cat, n, amt, reason, src) => ded.push({ cat, n, amt: Math.round(amt), reason, src });
    if (f < 1) notes.push(`Partial month: ${emDays} of ${dm} days (${doj(e) > s0 ? 'joined ' + fmtS(doj(e)) : 'left ' + fmtS(en)}) — gross pro-rated ${M(G)} × ${emDays}/${dm}`);
    /* 1. approved leave first */
    A.leaves.forEach((l) => {
      const pol = (R.leaveTypes.find((x) => x.t === l.t) || { p: 'Paid' }).p, unp = pol === 'Unpaid';
      L('leave', l.t, unp ? l.days * gd : 0, `${l.days} day(s) approved ${l.t} — ${unp ? 'unpaid: ' + l.days + ' × ' + M(gd) + ' daily rate' : pol === 'Paid' ? 'paid leave, no deduction' : 'policy to confirm — treated as paid for now'}`, 'Leave application (approved)');
      if (pol === 'To confirm') flags.push(`${l.t} pay policy is “to confirm”`);
    });
    if (A.wfh || A.od) notes.push(`${A.wfh} approved WFH day(s) and ${A.od} outside duty day(s): never counted late or absent`);
    if (A.excused) notes.push(`${A.excused} late/absent entr${A.excused > 1 ? 'ies' : 'y'} excused by approved leave/WFH/outside duty (already removed)`);
    /* 2. absent / LWP */
    const cutN = R.cutoffLWP ? A.afterCut : 0, lwp = A.absent + cutN;
    if (lwp) L('absent', 'Absent / LWP', lwp * gd, `${A.absent} absent${cutN ? ' + ' + cutN + ' arrival after ' + R.cutoff + ' (LWP, not counted late)' : ''} = ${lwp} LWP day(s) × ${M(gd)} (${R.lwpBase} ÷ ${rate})`, 'Attendance · Absent / LWP');
    /* 3. late slabs — BASIC only; Late and Extreme late both count */
    const lateN = A.late + (R.bothLate ? A.extreme : 0) + (R.cutoffLWP ? 0 : A.afterCut);
    if (A.open && R.openExempt) { if (lateN) notes.push('Open roster: late rules do not apply'); }
    else if (lateN) {
      const dd = slabDays(R, lateN), top = R.slabs[R.slabs.length - 1];
      L('late', 'Late entries', dd * bd, `${lateN} late entries in ${mon} (${A.late} Late${R.bothLate ? ' + ' + A.extreme + ' Extreme late' : ''}) → ${dd} day(s) basic × ${M(bd)}${dd ? '' : ' (within allowance, no deduction)'}`, 'Attendance · Late slabs (basic only)');
      if (top.tbc && lateN >= top.f) flags.push(`${lateN} late entries: 12+ rule (+1 day per ${top.per}) is “to confirm”`);
    }
    /* 4. early leave */
    if (A.early && !(A.open && R.openExempt)) { const x = Math.max(0, A.early - R.early.free), dd = x * R.early.pen; L('early', 'Early leave', dd * bd, `${A.early} early-leave entries in ${mon}; ${R.early.free} free → ${x} × ${R.early.pen} day basic × ${M(bd)}`, 'Attendance · Early leave'); }
    /* 5. manual */
    (d.manual || []).filter((m) => m.emp === e.id && m.month === mk).forEach((m) => L('manual', 'Manual deduction', m.amount, m.reason, `Manual · ${m.by} · ${fmtS(m.at)}`));
    /* 6. statutory / other */
    const eb = earn[0].amt;
    if (S.tax.on) { const tin = (d.tin || {})[e.id], t = Math.round(taxMonthly(S.tax, G * 12) * f); if (t > 0) { L('stat', 'Income tax (TDS/AIT)', t, `Estimated annual tax slab on ${M(G * 12)} gross, ÷ 12${tin ? ' · TIN ' + tin : ''}`, 'Statutory · Income tax'); if (!tin) flags.push('Taxable but no TIN on file'); } }
    if (S.pf.on && e.type === 'Full-time' && confirmedBy(e, mk, S)) L('stat', 'Provident fund (employee)', eb * S.pf.ee / 100, `${S.pf.ee}% of basic ${M(eb)} (employer ${S.pf.er}% = ${M(eb * S.pf.er / 100)} is a company cost)`, 'Statutory · Provident fund');
    if (!o.settle) {
      (d.loans || []).filter((l) => l.emp === e.id && l.start <= mk && loanLeft(l) > 0 && !(l.paid || []).some((p) => p.m === mk)).forEach((l) => L('stat', 'Advance / loan instalment', Math.min(l.inst, loanLeft(l)), `${l.id} ${l.kind}: instalment ${M(Math.min(l.inst, loanLeft(l)))}, balance after ${M(loanLeft(l) - Math.min(l.inst, loanLeft(l)))}`, 'Advance / loan register'));
      (S.assets || []).filter((a) => a.emp === e.id && a.status === 'Approved' && !a.applied).forEach((a) => L('stat', 'Asset recovery', a.amount, `${a.what} not returned — ${a.src} (HR approved)`, 'Asset recovery · ' + a.src));
      (d.recov || []).filter((r) => r.emp === e.id && r.status === 'Approved' && r.start <= mk && recLeft(r) < r.n && !(r.paid || []).includes(mk)).forEach((r) => L('stat', 'Overpayment recovery', r.per, `Instalment ${recLeft(r) + 1} of ${r.n} for ${r.what} (approved by ${r.approvedBy})`, 'Corrections · Overpayment recovery'));
    }
    /* additions: arrears / adjustments / bonus */
    (d.arrears || []).filter((a) => a.emp === e.id && a.applyMonth === mk && a.status === 'Approved').forEach((a) => add.push({ n: 'Arrears', amt: a.amount, reason: `Arrears for ${mLab(a.forMonth)} (month it belongs to): ${a.reason}`, src: 'Corrections · Arrears' }));
    (d.adj || []).filter((a) => a.emp === e.id && a.applyMonth === mk && a.status === 'Approved').forEach((a) => (a.amount >= 0 ? add : ded).push(a.amount >= 0 ? { n: 'Adjustment', amt: a.amount, reason: a.reason, src: 'Revised payroll ' + mLab(a.forMonth) } : { cat: 'stat', n: 'Adjustment', amt: -a.amount, reason: a.reason, src: 'Revised payroll ' + mLab(a.forMonth) }));
    if (S.fest.on && S.fest.list.some((x) => x.month === mk) && e.type === 'Full-time' && monthsBetween(doj(e), mEnd(mk)) >= S.fest.minService) add.push({ n: 'Festival bonus', amt: Math.round(S.fest.basis === 'basic' ? basicFull * S.fest.pct / 100 : S.fest.fixed), reason: `Festival bonus ${S.fest.list.find((x) => x.month === mk).name}`, src: 'Statutory · Festival bonus' });
    const totalDed = sum(ded, (x) => x.amt), totalAdd = sum(add, (x) => x.amt), net = gross - totalDed + totalAdd;
    if (net <= 0) flags.push('Net pay is zero or negative'); else if (totalDed > gross * 0.5) flags.push('Deductions exceed 50% of gross');
    if (f < 1) flags.push('Partial month (pro-rated)'); if (ded.some((x) => x.cat === 'manual')) flags.push('Manual deduction applied'); if (add.length) flags.push('Arrears / bonus included');
    if (lwp >= 3) flags.push(`${lwp} LWP days`);
    const cat = (c) => sum(ded.filter((x) => x.cat === c), (x) => x.amt);
    return { emp: e.id, name: e.name, dept: e.dept, desig: e.desig, month: mk, G, gross, basic: eb, bd, gd, earn, ded, add, totalDed, totalAdd, net, flags, notes, att: A, byCat: { leave: cat('leave'), absent: cat('absent'), late: cat('late'), early: cat('early'), manual: cat('manual'), stat: cat('stat') }, employer: S.pf.on && confirmedBy(e, mk, S) && e.type === 'Full-time' ? Math.round(eb * S.pf.er / 100) : 0 };
  }
  const payEmps = (mk) => emps().filter((e) => doj(e) <= mEnd(mk) && (!lastDayOf(e) || ym(lastDayOf(e)) > mk));
  const mon = (mk) => { const m = D().months; return m[mk] || (m[mk] = { status: 'Open', ex: {} }); };
  const rowsOf = (mk) => { const m = mon(mk); return m.rows || payEmps(mk).map((e) => calcEmp(e, mk, rulesFor(mk))); };
  const frozen = (mk) => !!mon(mk).rows;

  /* month lifecycle side effects */
  function finalize(mk, by) {
    const d = D(), m = mon(mk), rows = rowsOf(mk); m.rows = JSON.parse(JSON.stringify(rows)); m.status = 'Approved';
    rows.forEach((r) => {
      (d.loans || []).filter((l) => l.emp === r.emp && l.start <= mk && loanLeft(l) > 0 && !(l.paid || []).some((p) => p.m === mk)).forEach((l) => { (l.paid = l.paid || []).push({ m: mk, amt: Math.min(l.inst, loanLeft(l)) }); });
      (d.stat.assets || []).filter((a) => a.emp === r.emp && a.status === 'Approved' && !a.applied).forEach((a) => (a.applied = mk));
      (d.recov || []).filter((x) => x.emp === r.emp && x.status === 'Approved' && x.start <= mk && recLeft(x) < x.n && !(x.paid || []).includes(mk)).forEach((x) => x.paid.push(mk));
      (d.arrears || []).filter((a) => a.emp === r.emp && a.applyMonth === mk && a.status === 'Approved').forEach((a) => (a.applied = mk));
      (d.adj || []).filter((a) => a.emp === r.emp && a.applyMonth === mk && a.status === 'Approved').forEach((a) => (a.applied = mk));
      mkSlip(r, 1, 'Generated on payroll approval', by);
    });
  }
  function undoFinal(mk) {
    const d = D(); (d.loans || []).forEach((l) => (l.paid = (l.paid || []).filter((p) => p.m !== mk))); (d.stat.assets || []).forEach((a) => { if (a.applied === mk) a.applied = ''; });
    (d.recov || []).forEach((x) => (x.paid = (x.paid || []).filter((p) => p !== mk))); (d.arrears || []).forEach((a) => { if (a.applied === mk) a.applied = ''; }); (d.adj || []).forEach((a) => { if (a.applied === mk) a.applied = ''; });
    d.slips.forEach((s) => { if (s.month === mk && s.status === 'Current') { s.status = 'Superseded'; s.pub = s.pub; s.why = 'Month reopened'; } });
    delete mon(mk).rows;
  }
  function mkSlip(r, v, why, by) {
    const d = D(); d.slips.filter((s) => s.emp === r.emp && s.month === r.month && s.status === 'Current').forEach((s) => (s.status = 'Superseded'));
    const pm = pmOf(r.emp);
    d.slips.push({ id: nid('slip', 'SLP-', 5), emp: r.emp, name: r.name, month: r.month, v, status: 'Current', gen: today(), by: by || me().name, why: why || '', pub: false, pubAt: '', snap: { earn: r.earn, ded: r.ded, add: r.add, gross: r.gross, totalDed: r.totalDed, totalAdd: r.totalAdd, net: r.net }, method: methodLabel(pm) });
  }

  /* payment helpers */
  const BANKS = ['BRAC Bank', 'Dutch-Bangla Bank', 'City Bank', 'Islami Bank', 'Eastern Bank'], BRANCHES = ['Gulshan', 'Motijheel', 'Banani', 'Agrabad', 'Dhanmondi'];
  const pmOf = (id) => { const p = D().pm; return p[id] || (p[id] = defPm(id)); };
  function defPm(id) {
    const h = B.hash(id + 'pm'), x = h % 20, dg = (n) => String(B.hash(id + n)).padStart(10, '0').slice(0, 10);
    if (x < 12) return { type: 'bank', bank: BANKS[h % 5], branch: BRANCHES[(h >> 3) % 5], acc: '10' + dg('a'), routing: '0' + dg('r').slice(0, 8) };
    if (x < 17) return { type: 'bkash', number: '01' + [7, 8, 9][h % 3] + dg('m').slice(0, 8) };
    if (x < 19) return { type: 'nagad', number: '01' + [3, 6][h % 2] + dg('n').slice(0, 8) };
    return { type: 'cash' };
  }
  const methodLabel = (p) => (p.type === 'bank' ? `Bank · ${p.bank} (${p.branch}) · A/C ${p.acc}` : p.type === 'bkash' ? `bKash · ${p.number}` : p.type === 'nagad' ? `Nagad · ${p.number}` : 'Cash');
  const channel = (p) => (p.type === 'bank' ? p.bank : p.type === 'bkash' ? 'bKash' : p.type === 'nagad' ? 'Nagad' : 'Cash');
  const payInfo = (emp, mk) => { let r = null; (D().batches || []).forEach((b) => b.items.forEach((i) => { if (i.emp === emp && b.month === mk && i.status === 'Paid') r = { date: i.date, ref: i.ref, batch: b.id }; })); return r; };
  const paidCount = (mk) => sum(D().batches.filter((b) => b.month === mk), (b) => b.items.filter((i) => i.status === 'Paid').length);
  function checkMonthPaid(mk) { const m = mon(mk), rows = rowsOf(mk); if (m.status === 'Approved' && rows.every((r) => payInfo(r.emp, mk))) { m.status = 'Paid'; m.paidAt = today(); } }
  function publishPaid(mk) { D().slips.forEach((s) => { if (s.month === mk && s.status === 'Current' && !s.pub && payInfo(s.emp, mk)) { s.pub = true; s.pubAt = today(); } }); }

  /* =====================================================================
     SEED
     ===================================================================== */
  function seed() {
    const d = db, E = emps(), cm = curM(), A = (i) => E[i];
    d.seq = {}; d.audit = []; d.months = {}; d.manual = []; d.prof = {}; d.revs = []; d.pm = {}; d.batches = []; d.slips = []; d.arrears = []; d.recov = []; d.adj = []; d.reopen = []; d.bankReq = []; d.settle = []; d.tin = {}; d.loans = []; d.join = {};
    d.vers = [{ eff: '2026-01-01', by: 'Rahim Uddin', at: '2026-01-02', note: 'Initial Bangladesh policy', r: DEFAULT_RULES() }];
    d.draft = JSON.parse(JSON.stringify(d.vers[0].r)); d.draftEff = day(1); d.approver = 'Managing Director'; d.approvers = ['Managing Director', 'Chief Financial Officer', 'Chief Executive Officer'];
    d.stat = {
      tax: { on: true, exemptPct: 33.33, exemptCap: 450000, rebate: 0, minTax: 0, slabs: [{ upto: 350000, rate: 0 }, { upto: 100000, rate: 5 }, { upto: 300000, rate: 10 }, { upto: 400000, rate: 15 }, { upto: 500000, rate: 20 }, { upto: null, rate: 25 }] },
      pf: { on: true, ee: 10, er: 10, after: 6, basis: 'basic' },
      fest: { on: true, basis: 'basic', pct: 100, fixed: 0, minService: 6, prorata: true, list: [{ name: 'Eid-ul-Fitr', month: addM(cm, 5) }, { name: 'Eid-ul-Adha', month: addM(cm, 8) }] },
      grat: { on: true, minYears: 5, days: 30, basis: 'basic' },
      ot: { on: false, mult: 2, divisor: 208, basis: 'basic' },
      assets: [{ id: 'AR-0001', emp: A(9).id, what: 'Laptop charger and bag', amount: 4500, src: 'Exit module', status: 'Pending HR', applied: '' }]
    };
    E.forEach((e, i) => { if (e.salary > 60000 || i % 3 === 0) d.tin[e.id] = String(B.hash(e.id + 'tin')).padStart(12, '0').slice(0, 12); });
    /* new joiner mid-month, probation, revisions */
    d.join[A(20).id] = cm + '-12';
    const pe = A(12); d.prof[pe.id] = { revs: [], grade: pe.grade, prob: { salary: Math.round(pe.salary * 0.8 / 500) * 500, confirm: day(15) } };
    [3, 6, 14].forEach((i, k) => { const e = A(i), old = Math.round(e.salary / 1.1 / 500) * 500; d.revs.push({ id: nid('rev', 'REV-'), emp: e.id, type: ['Increment', 'Promotion', 'Correction'][k], eff: addM(cm, -2) + '-01', old, new: e.salary, grade: e.grade, reason: ['Annual increment', 'Promoted to senior role', 'Basic corrected after audit'][k], status: 'Approved', created: addM(cm, -3) + '-20', stages: [{ t: 'HR', who: 'Rahim Uddin', s: 'Approved', by: 'Rahim Uddin', at: addM(cm, -3) + '-22' }, { t: 'Higher management', who: 'Managing Director', s: 'Approved', by: 'Managing Director', at: addM(cm, -3) + '-25' }] }); });
    [5, 8].forEach((i, k) => { const e = A(i), nw = Math.round(e.salary * 1.08 / 500) * 500; d.revs.push({ id: nid('rev', 'REV-'), emp: e.id, type: k ? 'Promotion' : 'Increment', eff: addM(cm, 1) + '-01', old: e.salary, new: nw, grade: e.grade, reason: k ? 'Team lead promotion' : 'Annual increment', status: 'Pending', created: day(-4), stages: [{ t: 'HR', who: 'Rahim Uddin', s: k ? 'Pending' : 'Approved', by: k ? '' : 'Rahim Uddin', at: k ? '' : day(-2) }, { t: 'Higher management', who: 'Managing Director', s: 'Pending', by: '', at: '' }] }); });
    d.bankReq.push({ id: nid('bank', 'BNK-'), emp: A(10).id, old: methodLabel(defPm(A(10).id)), nw: { type: 'bkash', number: '01711223344' }, reason: 'Moved salary to bKash', status: 'Pending HR', created: day(-2), src: 'Employee request' });
    /* loans, manual deductions, corrections */
    d.loans.push({ id: 'LN-0001', emp: A(7).id, kind: 'Salary advance', total: 30000, inst: 5000, start: addM(cm, -3), paid: [] }, { id: 'LN-0002', emp: A(11).id, kind: 'Personal loan', total: 120000, inst: 10000, start: addM(cm, -2), paid: [] });
    d.manual.push({ id: nid('man', 'MD-'), month: addM(cm, -2), emp: A(4).id, amount: 1500, reason: 'Damaged ID card replacement', by: 'Rahim Uddin', at: addM(cm, -2) + '-20' });
    d.manual.push({ id: nid('man', 'MD-'), month: cm, emp: A(2).id, amount: 800, reason: 'Parking card lost', by: 'Rahim Uddin', at: day(-3) });
    d.arrears.push({ id: nid('arr', 'ARR-'), emp: A(3).id, forMonth: addM(cm, -1), applyMonth: cm, amount: 2400, reason: 'Backdated increment difference', status: 'Approved', by: 'Rahim Uddin', applied: '' });
    d.recov.push({ id: nid('rec', 'REC-'), emp: A(13).id, what: 'overpaid salary (Aug duplicate allowance)', total: 18000, mode: 'inst', n: 3, per: 6000, start: cm, status: 'Approved', approvedBy: 'Rahim Uddin', paid: [], created: day(-6) });
    d.recov.push({ id: nid('rec', 'REC-'), emp: A(16).id, what: 'overpaid salary (wrong LWP posting)', total: 5200, mode: 'once', n: 1, per: 5200, start: cm, status: 'Pending HR', approvedBy: '', paid: [], created: day(-1) });
    audit('Salary revision approved', M(A(3).salary), M(A(3).salary), 'Annual increment — REV approvals HR then Managing Director', 'Managing Director');
    d.audit[0].at = addM(cm, -3) + '-25 11:20';
    d.reopen.push({ id: nid('ro', 'RO-'), month: addM(cm, -1), reason: 'Wrong late count for one employee', by: 'Rahim Uddin', at: day(-5), hr: 'Approved', approver: 'Pending', status: 'Pending', created: day(-5) });
    /* final settlement (exit in progress) */
    d.settle.push({ id: nid('fs', 'FS-'), emp: A(18).id, lwd: cm + '-20', clearance: 'Pending', override: '', assetAmt: 2500, noticeShort: 5, allow: 0, arrears: 0, elBal: 6, encash: false, status: 'Draft', stages: [], created: day(-4) });
    /* three past months: calculate, approve, pay, publish */
    [-3, -2, -1].forEach((n) => {
      const mk = addM(cm, n); d.months[mk] = { status: 'Locked', ex: {}, lockedBy: 'Rahim Uddin', lockedAt: mk + '-28', approver: d.approver, approval: { by: d.approver, at: addM(mk, 1) + '-02', note: 'Approved' } };
      setLocks(locks().concat(mk)); finalize(mk, 'Rahim Uddin');
      const rows = d.months[mk].rows, pd = addM(mk, 1) + '-05';
      d.batches.push({ id: nid('pb', 'PB-'), month: mk, date: pd, kind: 'Payment', by: 'Rahim Uddin', items: rows.map((r) => { const p = pmOf(r.emp); return { emp: r.emp, name: r.name, amt: r.net, method: p, ch: channel(p), status: 'Paid', date: pd, ref: 'TXN' + String(B.hash(r.emp + mk)).slice(0, 7), reason: '' }; }) });
      d.months[mk].status = 'Paid'; d.months[mk].paidAt = pd; publishPaid(mk);
    });
    const s = d.slips.find((x) => x.month === addM(cm, -1)); if (s) { const r = JSON.parse(JSON.stringify(d.months[s.month].rows.find((x) => x.emp === s.emp))); s.status = 'Superseded'; s.why2 = 'Regenerated'; d.slips.push(Object.assign({}, s, { id: nid('slip', 'SLP-', 5), v: 2, status: 'Current', why: 'Regenerated after late count correction', gen: day(-3), pub: true, pubAt: day(-3) })); audit('Payslip regenerated (v2)', 'v1', 'v2', 'Late count correction for ' + r.name, 'Rahim Uddin'); }
    d.pm[A(10).id] = defPm(A(10).id);
    /* log a settled audit sample for the corrections report */
    audit('Overpayment recovery approved', '—', M(18000) + ' in 3 instalments', 'Duplicate allowance paid in ' + mLab(addM(cm, -2)), 'Rahim Uddin');
  }

  /* =====================================================================
     PAGE PLUMBING
     ===================================================================== */
  const PG = {}; let cur = '';
  const T = { rules: 'policy', pay: 'batches', corr: 'arrears', prof: 'profiles', stat: 'tax', set: 'list', rep: 'sheet' };
  const RUN = { mk: null, step: null, open: {}, conf: false }, REP = { mk: null, grp: 'emp', csv: null };
  const rerender = () => { const v = B.$('#view .fade'); if (v && PG[cur]) v.innerHTML = PG[cur](); };
  const page = (n, fn) => { PG[n] = fn; B.page[n] = () => { cur = n; D(); return isHR() || n === 'payslips-v' ? fn() : noAccess(); }; };
  const done = (msg) => { save(); B.closeModal(); rerender(); if (msg) B.toast(msg); };
  const noAccess = () => `${B.head('Payroll', 'HR access only', '', crumbs('Restricted'))}<div class="as-note">${ic('lock', 14)} Payroll screens are visible to HR and approvers only. Employees can open <a href="#/page/payslips-v">their own payslips</a>.</div>`;
  const tbl = (head, rows, cls) => `<div class="card table-card"><div class="tscroll"><table class="dt ${cls || ''}"><thead><tr>${head.map((h) => `<th${/^>/.test(h) ? ' class="r"' : ''}>${h.replace(/^>/, '')}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.join('') : `<tr><td colspan="${head.length}" class="as-none">Nothing to show yet.</td></tr>`}</tbody></table></div></div>`;
  const inp = (p, o) => { o = o || {}; const v = gv(D(), p); return `<input class="inp pr-in" ${o.type === 'time' ? 'type="time"' : o.type === 'date' ? 'type="date"' : o.n ? 'type="number" step="' + (o.step || 'any') + '"' : ''} value="${esc(v == null ? '' : v)}" data-chg="pr-set" data-p="${p}" ${o.n ? 'data-n="1"' : ''} ${o.nullable ? 'data-nullable="1"' : ''} ${o.r ? 'data-r="1"' : ''} ${o.w ? 'style="width:' + o.w + '"' : ''}>`; };
  const sel = (p, opts, o) => { o = o || {}; const v = gv(D(), p); return `<select class="inp pr-in" data-chg="pr-set" data-p="${p}" ${o.r ? 'data-r="1"' : ''}>${opts.map((x) => `<option value="${x[0]}" ${String(x[0]) === String(v) ? 'selected' : ''}>${x[1]}</option>`).join('')}</select>`; };
  const chk = (p, label, o) => `<label class="pr-chk"><input type="checkbox" data-chg="pr-set" data-p="${p}" ${gv(D(), p) ? 'checked' : ''} ${o && o.r ? 'data-r="1"' : ''}> ${label}</label>`;
  B.chg['pr-set'] = (t) => {
    let v = t.type === 'checkbox' ? t.checked : t.dataset.n ? (t.value === '' && t.dataset.nullable ? null : parseFloat(t.value) || 0) : t.value;
    sv(D(), t.dataset.p, v); save(); if (t.dataset.r) rerender(); B.toast('Saved');
  };
  B.act['pr-tab'] = (t) => { T[t.dataset.p] = t.dataset.t; rerender(); };
  const dlCsv = (name, head, rows) => {
    const q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"', csv = [head].concat(rows).map((r) => r.map((c) => q(stripT(c))).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); B.toast('Downloaded ' + name);
  };
  const stageTrk = (st) => (B.flow && B.flow.tracker ? B.flow.tracker(B.flow.items(st)) : `<p>${st.map((s) => esc(s.t) + ': ' + s.s).join(' → ')}</p>`);
  const mkStg = (arr) => arr.map(([t, w]) => ({ t, who: w, s: 'Pending', by: '', at: '', note: '' }));
  const stgNow = (st) => st.findIndex((s) => s.s === 'Pending');
  const monthSel = (id, val, act, only) => `<select class="inp pr-in" id="${id}" data-chg="${act}" style="width:auto">${[-3, -2, -1, 0].map((n) => addM(curM(), n)).filter((m) => !only || only(m)).map((m) => `<option value="${m}" ${m === val ? 'selected' : ''}>${mLab(m)}</option>`).join('')}</select>`;

  /* =====================================================================
     1. PAYROLL RULES (policy config, effective-dated)
     ===================================================================== */
  const pubBanner = () => { const d = D(), a = JSON.stringify(d.draft) !== JSON.stringify(d.vers[d.vers.length - 1].r); return a ? `<div class="as-note pr-warn">${ic('alert', 14)} You have unpublished changes. Months already locked keep the policy they were calculated with. <button class="btn sm primary" data-act="pr-pub">Publish as new version</button></div>` : `<div class="as-note">${ic('check-circle', 14)} Policy is published. Current version applies from ${fmt(d.vers[d.vers.length - 1].eff)}.</div>`; };
  page('payroll-rules', () => {
    const d = D(), R = d.draft, t = T.rules, cur_ = d.vers[d.vers.length - 1];
    const slabRows = R.slabs.map((s, i) => `<tr><td><input class="inp pr-in" type="number" value="${s.f}" data-chg="pr-set" data-p="draft.slabs.${i}.f" data-n="1" style="width:70px"></td><td>${s.t == null ? '<b>and above</b>' : `<input class="inp pr-in" type="number" value="${s.t}" data-chg="pr-set" data-p="draft.slabs.${i}.t" data-n="1" style="width:70px">`}</td>
      <td>${s.per ? `+1 day per <input class="inp pr-in" type="number" value="${s.per}" data-chg="pr-set" data-p="draft.slabs.${i}.per" data-n="1" style="width:60px"> late entries (days = entries ÷ ${s.per}) ${tbc}` : `<input class="inp pr-in" type="number" step="0.5" value="${s.d}" data-chg="pr-set" data-p="draft.slabs.${i}.d" data-n="1" style="width:70px"> day(s) of basic${s.d === 0 ? ' <em class="sub">no deduction</em>' : ''}`}</td></tr>`).join('');
    const policy = `<section class="grid-2">
      <div class="card pad"><h3 class="ct">Daily rate</h3>
        <div class="fgrid" style="grid-template-columns:1fr 1fr">${field('Daily rate = monthly basic ÷', sel('draft.rateMode', [['30', '30 (default)'], ['wd', 'Working days of the month']], { r: 1 }))}${field('Fixed working days (if used)', inp('draft.wdays', { n: 1 }))}${field('Absent / LWP / pro-rata base', sel('draft.lwpBase', [['gross', 'Gross salary ÷ rate'], ['basic', 'Basic ÷ rate']]) + ' ' + tbc)}</div>
        <div class="as-note">${ic('alert', 14)} Late and early-leave deductions are always computed on <b>basic only</b>. Partial months (join / leave / LWP) use the daily rate.</div></div>
      <div class="card pad"><h3 class="ct">Attendance rules</h3>
        <div class="pr-stack">${chk('draft.bothLate', 'Late <b>and</b> Extreme late both count towards the late slab')}${chk('draft.cutoffLWP', 'Arrival after cut-off is <b>LWP</b> and is not counted as late')}
        <div>${field('Absent cut-off time', inp('draft.cutoff', { type: 'time' }))}</div>${chk('draft.openExempt', 'Open-roster employees are exempt from late / early-leave rules')}
        <p class="cl-hint">${ic('check-circle', 14)} Approved leave, WFH and outside duty are never counted late or absent.</p></div></div></section>
      <h3 class="ct" style="margin:20px 0 10px">Late slab table (on basic)</h3>
      <div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>From entry</th><th>To entry</th><th>Deduction</th></tr></thead><tbody>${slabRows}</tbody></table></div></div>
      <section class="grid-2" style="margin-top:16px"><div class="card pad"><h3 class="ct">Early-leave handling ${tbc}</h3><div class="fgrid" style="grid-template-columns:1fr 1fr">${field('Free early-leave entries / month', inp('draft.early.free', { n: 1 }))}${field('Penalty per extra entry (day of basic)', inp('draft.early.pen', { n: 1, step: '0.25' }))}</div></div>
      <div class="card pad"><h3 class="ct">Payroll approver</h3>${field('Final approver for the monthly run', `<select class="inp pr-in" data-chg="pr-appr">${d.approvers.map((a) => `<option ${a === d.approver ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>`)}<p class="cl-hint">Used in step 5 of the monthly run. Changing it affects only runs not yet submitted.</p></div></section>`;
    const sampleG = d.sampleG || 60000, cl = compLines(sampleG, R.comps);
    const comps = `<div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Component</th><th>Type</th><th>Value</th><th class="r">On sample gross</th></tr></thead><tbody>${R.comps.map((c, i) => `<tr><td><b>${esc(c.n)}</b></td><td>${i === 0 ? 'Percent of gross' : sel(`draft.comps.${i}.type`, COMP_TYPES, { r: 1 })}</td><td>${c.type === 'bal' ? '<em class="sub">remainder of gross</em>' : `<input class="inp pr-in" type="number" value="${c.v}" data-chg="pr-set" data-p="draft.comps.${i}.v" data-n="1" data-r="1" style="width:110px"> ${c.type === 'fx' ? '৳' : '%'}`}</td><td class="r">${M(cl[i].amt)}</td></tr>`).join('')}<tr><td colspan="3"><b>Gross</b></td><td class="r"><b>${M(sampleG)}</b></td></tr></tbody></table></div></div>
      <div class="as-note" style="margin-top:12px">Sample gross: <input class="inp pr-in" type="number" value="${sampleG}" data-chg="pr-sample" style="width:120px"> · House rent is a percentage of basic; “Other” takes the remainder. Salary profiles apply these components to each employee's gross.</div>`;
    const leave = `<div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Leave / day type</th><th>Pay treatment</th><th>Note</th></tr></thead><tbody>${R.leaveTypes.map((l, i) => `<tr><td><b>${esc(l.t)}</b></td><td>${i === R.leaveTypes.length - 1 ? 'Paid' : sel(`draft.leaveTypes.${i}.p`, [['Paid', 'Paid'], ['Unpaid', 'Unpaid'], ['To confirm', 'To confirm (paid for now)']], { r: 1 })} ${l.p === 'To confirm' ? tbc : pill(l.p)}</td><td>${esc(l.note || (l.p === 'To confirm' ? 'Awaiting management decision' : ''))}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="as-note" style="margin-top:12px">${chk('draft.encashEarned', 'Allow Earned leave encashment in final settlement') } ${tbc} · Casual and Sick leave are never encashed.</div>`;
    const vers = tbl(['Version', 'Effective from', 'Published by', 'Note', 'Status'], d.vers.slice().reverse().map((v, i) => `<tr><td><b>v${d.vers.length - i}</b></td><td>${fmt(v.eff)}</td><td>${esc(v.by)} · ${fmtS(v.at)}</td><td>${esc(v.note)}</td><td>${i === 0 ? pill('Current') : pill('Superseded')}</td></tr>`));
    return `${B.head('Payroll Policy', 'Bangladesh payroll rules. Effective-dated: a new version applies only to months on or after its date.', `<button class="btn" data-act="pr-reset">${ic('refresh', 15)}Discard draft</button><button class="btn primary" data-act="pr-pub">${ic('check', 15)}Publish new version</button>`, crumbs('Payroll Policy'))}
      ${kp([Kp('file', 'Policy version', 'v' + d.vers.length), Kp('calendar', 'Effective from', fmtS(cur_.eff), 'ok'), Kp('clock', 'Late rule items to confirm', R.slabs.filter((s) => s.tbc).length + R.leaveTypes.filter((l) => l.p === 'To confirm').length, 'warn'), Kp('lock', 'Locked months', locks().length)])}
      ${pubBanner()}<div style="margin:14px 0 12px">${tabs('rules', [['policy', 'Rate & late rules'], ['comps', 'Salary components'], ['leave', 'Paid / unpaid leave'], ['vers', 'Versions']], t)}</div>
      ${t === 'policy' ? policy : t === 'comps' ? comps : t === 'leave' ? leave : vers}`;
  });
  B.chg['pr-appr'] = (t) => { D().approver = t.value; save(); B.toast('Approver set to ' + t.value); };
  B.chg['pr-sample'] = (t) => { D().sampleG = +t.value || 60000; save(); rerender(); };
  B.act['pr-reset'] = () => { D().draft = JSON.parse(JSON.stringify(D().vers[D().vers.length - 1].r)); done('Draft reset to the published version'); };
  B.act['pr-pub'] = () => B.modal({ title: 'Publish policy version', body: grid(field('Effective from', `<input type="date" class="inp" id="prm-eff" value="${D().draftEff}">`) + field('Change note', '<input class="inp" id="prm-note" placeholder="What changed and why">')) + `<p class="cl-hint">${ic('lock', 14)} Locked / paid months never change. Use Corrections for anything that needs to flow into old months.</p>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-pub-ok">Publish</button>' });
  B.act['pr-pub-ok'] = () => {
    const d = D(), eff = B.$('#prm-eff').value, note = B.$('#prm-note').value.trim(); if (!eff || !note) { B.toast('Effective date and change note are required', 'bad'); return; }
    if (d.vers.some((v) => v.eff === eff)) { B.toast('A version already starts on that date', 'bad'); return; }
    d.vers.push({ eff, by: me().name, at: today(), note, r: JSON.parse(JSON.stringify(d.draft)) }); audit('Payroll policy v' + d.vers.length + ' published', 'v' + (d.vers.length - 1), 'v' + d.vers.length, note, d.approver); done('Policy v' + d.vers.length + ' published');
  };

  /* =====================================================================
     2. PAYROLL RUN WIZARD
     ===================================================================== */
  const STEPS = [['Collect & lock', 'lock'], ['Deductions engine', 'percent'], ['Calculate net', 'dollar'], ['HR review', 'eye'], ['Approval', 'shield'], ['Payment', 'card']];
  const MAXSTEP = { Open: 1, Locked: 2, Calculated: 3, Review: 4, 'Pending approver': 5, Approved: 6, Paid: 6 };
  const CATS = [['leave', 'Approved leave'], ['absent', 'Absent / LWP'], ['late', 'Late slabs'], ['early', 'Early leave'], ['manual', 'Manual'], ['stat', 'Statutory / other']];
  const runMk = () => { if (!RUN.mk) { const c = curM(); RUN.mk = [-3, -2, -1, 0].map((n) => addM(c, n)).reverse().find((m) => mon(m).status !== 'Paid') || c; } return RUN.mk; };
  const exceptions = (rows) => rows.filter((r) => r.flags.length);
  function breakdown(r) {
    const lines = r.ded.map((x) => `<tr><td>${esc((CATS.find((c) => c[0] === x.cat) || [0, x.cat])[1])}</td><td>${esc(x.n)}</td><td class="r">${M(x.amt)}</td><td>${esc(x.reason)}</td><td><em class="sub">${esc(x.src)}</em></td></tr>`).join('');
    const adds = r.add.map((x) => `<tr class="pr-add"><td>Addition</td><td>${esc(x.n)}</td><td class="r">+ ${M(x.amt)}</td><td>${esc(x.reason)}</td><td><em class="sub">${esc(x.src)}</em></td></tr>`).join('');
    return `<div class="pr-bd"><div class="pr-bd-top"><div><b>Earnings</b>${r.earn.map((x) => `<span>${esc(x.n)} <i>${M(x.amt)}</i></span>`).join('')}<span class="tot">Gross <i>${M(r.gross)}</i></span></div>
      <div><b>Rates</b><span>Daily basic rate <i>${M(r.bd)}</i></span><span>Daily LWP rate <i>${M(r.gd)}</i></span><span>Late / absent: ${r.att.late}+${r.att.extreme} / ${r.att.absent + r.att.afterCut}</span></div></div>
      <table class="dt pr-bdt"><thead><tr><th>Group</th><th>Item</th><th class="r">Amount</th><th>Reason</th><th>Source</th></tr></thead><tbody>${lines || '<tr><td colspan="5" class="as-none">No deductions this month.</td></tr>'}${adds}</tbody></table>
      <div class="pr-eq">Net = ${M(r.gross)} gross − ${M(r.totalDed)} deductions + ${M(r.totalAdd)} arrears / bonus = <b>${M(r.net)}</b></div>
      ${r.notes.map((n) => `<p class="cl-hint">${ic('alert', 14)} ${esc(n)}</p>`).join('')}${r.flags.map((n) => `<p class="cl-hint pr-flag">${ic('flag', 14)} ${esc(n)}</p>`).join('')}</div>`;
  }
  function resultTable(rows, mode) {
    const head = mode === 'ded' ? ['', 'Employee', '>Gross'].concat(CATS.map((c) => '>' + c[1]), ['>Total']) : ['', 'Employee', '>Gross', '>Deductions', '>Arrears / bonus', '>Net pay', 'Flags'];
    const body = rows.map((r) => {
      const o = RUN.open[r.emp], c = mode === 'ded' ? CATS.map((x) => `<td class="r">${r.byCat[x[0]] ? M(r.byCat[x[0]]) : '<span class="as-none">—</span>'}</td>`).join('') + `<td class="r"><b>${M(r.totalDed)}</b></td>` : `<td class="r">${M(r.totalDed)}</td><td class="r">${r.totalAdd ? '+ ' + M(r.totalAdd) : '—'}</td><td class="r"><b>${M(r.net)}</b></td><td>${r.flags.length ? `<span class="pr-fl">${ic('flag', 12)} ${r.flags.length}</span>` : pill('Approved').replace('Approved', 'Clear')}</td>`;
      return `<tr data-id="${r.emp}" class="pr-row"><td><button class="icon-btn" data-act="pr-x" aria-label="Breakdown">${ic(o ? 'down' : 'right', 14)}</button></td><td>${who(r.name)}<em class="sub">${esc(r.dept)}</em></td><td class="r">${M(r.gross)}</td>${c}</tr>${o ? `<tr class="pr-xrow"><td></td><td colspan="${head.length - 1}">${breakdown(r)}</td></tr>` : ''}`;
    });
    return tbl(head, body, 'pr-dt');
  }
  B.act['pr-x'] = (t) => { const id = t.closest('[data-id]').dataset.id; RUN.open[id] = !RUN.open[id]; rerender(); };
  const runKpis = (rows) => kp([Kp('users', 'Employees paid', rows.length), Kp('dollar', 'Gross payroll', M(sum(rows, (r) => r.gross))), Kp('percent', 'Total deductions', M(sum(rows, (r) => r.totalDed)), 'warn'), Kp('gift', 'Arrears / bonus', M(sum(rows, (r) => r.totalAdd))), Kp('card', 'Net payable', M(sum(rows, (r) => r.net)), 'ok'), Kp('flag', 'Exceptions', exceptions(rows).length, exceptions(rows).length ? 'bad' : 'ok')]);
  page('payroll-run', () => {
    const d = D(), mk = runMk(), m = mon(mk), rows = rowsOf(mk), max = MAXSTEP[m.status] || 1, st = Math.min(RUN.step || max, max), R = rulesFor(mk);
    const stepper = `<ul class="cl-trk fl-trk pr-steps">${STEPS.map((s, i) => `<li class="${i + 1 < max || (m.status === 'Paid') ? 'done' : i + 1 === max ? 'now' : ''} ${i + 1 === st ? 'sel' : ''}"><button data-act="pr-step" data-n="${i + 1}"><i>${i + 1 < max || m.status === 'Paid' ? ic('check', 13) : i + 1}</i><span>${s[0]}</span></button></li>`).join('')}</ul>`;
    let body = '';
    const excl = emps().filter((e) => doj(e) <= mEnd(mk) && !payEmps(mk).includes(e));
    if (st === 1) {
      const A = payEmps(mk).map((e) => ({ e, a: att(e.id, mk) }));
      body = `<div class="card pad"><div class="ct-row"><h3 class="ct">${ic('lock', 17)} Collect attendance and lock ${mLab(mk)}</h3>${pill(m.status === 'Open' ? 'Open' : 'Locked')}</div>
        <p>HR confirms the cut-off date. After locking, attendance, leave and roster screens for this month are read-only and payroll is calculated from this snapshot.</p>
        <div class="fgrid" style="grid-template-columns:repeat(4,1fr)"><div class="fld"><label>Month</label>${monthSel('pr-m', mk, 'pr-month')}</div><div class="fld"><label>Cut-off date</label><input class="inp" type="date" id="pr-cut" value="${m.cut || (mk === curM() ? today() : mEnd(mk))}" ${m.status !== 'Open' ? 'disabled' : ''}></div><div class="fld"><label>Working days</label><input class="inp" value="${R.rateMode === 'wd' ? workDays(mk) : workDays(mk) + ' (rate ÷ 30)'}" disabled></div><div class="fld"><label>Policy version</label><input class="inp" value="v${d.vers.indexOf(d.vers.filter((v) => v.eff <= mEnd(mk)).pop()) + 1} (effective ${fmtS(d.vers.filter((v) => v.eff <= mEnd(mk)).pop().eff)})" disabled></div></div>
        ${m.status === 'Open' ? `<label class="pr-chk" style="margin-top:12px"><input type="checkbox" id="pr-confirm" ${RUN.conf ? 'checked' : ''} data-chg="pr-conf"> HR confirms attendance, leave and WFH records are final up to the cut-off date</label><div class="as-act"><button class="btn primary" data-act="pr-lock">${ic('lock', 15)}Lock ${mLab(mk)}</button></div>` : `<div class="as-note">${ic('lock', 14)} Locked by ${esc(m.lockedBy || 'HR')} on ${fmt(m.lockedAt)}. Reopening needs HR + approver permission in <a href="#/page/payroll-corrections">Corrections</a>.</div>`}
        ${excl.length ? `<div class="as-note">${ic('user-minus', 14)} In final settlement (not in this run): ${excl.map((e) => esc(e.name)).join(', ')}</div>` : ''}</div>
        <h3 class="ct" style="margin:18px 0 10px">Attendance snapshot</h3>${tbl(['Employee', '>Late', '>Extreme', '>After ' + R.cutoff, '>Absent', '>Early leave', 'Approved leave', '>WFH / OD', 'Roster'], A.map(({ e, a }) => `<tr><td>${who(e.name)}</td><td class="r">${a.late}</td><td class="r">${a.extreme}</td><td class="r">${a.afterCut}</td><td class="r">${a.absent}</td><td class="r">${a.early}</td><td>${a.leaves.map((l) => esc(l.t.replace(' Leave', '')) + ' ' + l.days + 'd').join(', ') || '—'}</td><td class="r">${a.wfh} / ${a.od}</td><td>${a.open ? 'Open (exempt)' : 'Normal'}</td></tr>`))}`;
    } else if (st === 2 || st === 3) {
      const can = ['Locked', 'Calculated', 'Review'].includes(m.status);
      body = st === 2 ? `<div class="card pad"><h3 class="ct">${ic('percent', 17)} Deductions engine — fixed order</h3><ol class="pr-order">${['Approved leave (paid / unpaid per policy)', 'Absent / LWP (incl. arrivals after ' + R.cutoff + ')', 'Late slabs — on basic only (Late + Extreme late)', 'Early-leave penalties', 'Manual deductions (reason required)', 'Statutory & other: income tax, PF, advance / loan instalments, asset recovery, overpayment recovery'].map((x) => `<li>${x}</li>`).join('')}</ol>
        <div class="as-act">${can ? `<button class="btn" data-act="pr-manual">${ic('plus', 15)}Manual deduction</button>` : ''}${m.status === 'Locked' ? `<button class="btn primary" data-act="pr-to3">Proceed to net calculation ${ic('right', 15)}</button>` : ''}</div></div><div style="height:14px"></div>${resultTable(rows, 'ded')}`
        : `<div class="as-note" style="margin-bottom:12px">${ic('alert', 14)} Net pay = gross − deductions + arrears / bonus. Expand a row to see the reason and source of every line.</div>${resultTable(rows, 'net')}<div class="as-act">${m.status === 'Calculated' ? `<button class="btn primary" data-act="pr-to4">Send to HR review ${ic('right', 15)}</button>` : ''}${can ? `<button class="btn" data-act="pr-manual">${ic('plus', 15)}Manual deduction</button>` : ''}</div>`;
    } else if (st === 4) {
      const ex = exceptions(rows), left = ex.filter((r) => !m.ex[r.emp]);
      body = `<div class="card pad"><h3 class="ct">${ic('eye', 17)} HR review of exceptions</h3><p>${ex.length} employee(s) have exceptions. Review each one and record a note. ${left.length ? '<b>' + left.length + ' still to review.</b>' : 'All reviewed.'}</p></div><div style="height:12px"></div>
        ${tbl(['Employee', '>Net pay', 'Exceptions', 'Review'], ex.map((r) => `<tr data-id="${r.emp}"><td>${who(r.name)}</td><td class="r">${M(r.net)}</td><td>${r.flags.map((f) => `<span class="pr-fl">${ic('flag', 12)} ${esc(f)}</span>`).join(' ')}</td><td>${m.ex[r.emp] ? pill('Approved').replace('Approved', 'Reviewed') + `<em class="sub">${esc(m.ex[r.emp].note)} · ${esc(m.ex[r.emp].by)}</em>` : m.status === 'Review' ? `<button class="btn sm" data-act="pr-rev">Mark reviewed</button>` : '—'}</td></tr>`))}
        <div class="as-act">${m.status === 'Review' ? `<button class="btn primary" data-act="pr-to5" ${left.length ? 'disabled' : ''}>Proceed to approval ${ic('right', 15)}</button>` : ''}</div>`;
    } else if (st === 5) {
      const ap = m.apStages;
      body = `<div class="card pad"><h3 class="ct">${ic('shield', 17)} Payroll approval</h3><div class="fgrid" style="grid-template-columns:1fr 1fr"><div class="fld"><label>Approver</label>${m.status === 'Review' ? `<select class="inp" data-chg="pr-appr">${d.approvers.map((a) => `<option ${a === d.approver ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>` : `<input class="inp" disabled value="${esc(ap ? ap[0].who : d.approver)}">`}</div><div class="fld"><label>Net payable</label><input class="inp" disabled value="${M(sum(rows, (r) => r.net))}"></div></div>
        ${ap ? stageTrk(ap) : ''}${m.rejNote ? `<div class="as-note pr-warn">${ic('x', 14)} Previously rejected: ${esc(m.rejNote)}</div>` : ''}
        <div class="as-act">${m.status === 'Review' ? `<button class="btn primary" data-act="pr-submit">Submit for approval</button>` : m.status === 'Pending approver' ? `<button class="btn primary" data-act="pr-appok">${ic('check', 15)}Approve as ${esc(ap[0].who)}</button><button class="btn" data-act="pr-apprej">Reject</button>` : `<span>${pill('Approved')} by ${esc(m.approval ? m.approval.by : '')} on ${fmt(m.approval && m.approval.at)}</span>`}</div></div>`;
    } else {
      const items = D().batches.filter((b) => b.month === mk);
      body = `<div class="card pad"><h3 class="ct">${ic('card', 17)} Payment</h3>${m.status === 'Approved' || m.status === 'Paid' ? `<p>${paidCount(mk)} of ${rows.length} employees paid. Payslips are published to each employee after payment.</p><div class="as-act"><a class="btn primary" href="#/page/payroll-payment">Go to Payment</a><a class="btn" href="#/page/payslips-v">View payslips</a></div>` : `<div class="as-note">${ic('lock', 14)} Payment opens only after the payroll is approved.</div>`}${items.length ? `<p class="cl-hint">Batches: ${items.map((b) => b.id).join(', ')}</p>` : ''}</div>`;
    }
    return `${B.head('Monthly Payroll Run', 'Collect → deductions → net → review → approval → payment. Late deductions use basic only.', `${monthSel('pr-m2', mk, 'pr-month')}<a class="btn" href="#/page/payroll-rules">${ic('settings', 15)}Policy</a>`, crumbs('Monthly Run'))}
      ${runKpis(rows)}<div class="card pad" style="padding:6px 10px">${stepper}</div><div style="height:14px"></div>${body}`;
  });
  B.chg['pr-month'] = (t) => { RUN.mk = t.value; RUN.step = null; RUN.conf = false; rerender(); };
  B.chg['pr-conf'] = (t) => { RUN.conf = t.checked; };
  B.act['pr-step'] = (t) => { RUN.step = +t.dataset.n; rerender(); };
  const setStatus = (mk, s, step) => { mon(mk).status = s; RUN.step = step || null; save(); rerender(); };
  B.act['pr-lock'] = () => {
    const mk = runMk(), c = B.$('#pr-confirm'); if (!c || !c.checked) { B.toast('HR must confirm the cut-off before locking', 'bad'); return; }
    const m = mon(mk); m.cut = B.$('#pr-cut').value; m.lockedBy = me().name; m.lockedAt = today(); setLocks(locks().concat(mk)); audit('Month locked', 'Open', 'Locked', 'HR confirmed cut-off ' + fmt(m.cut)); setStatus(mk, 'Locked', 2); B.toast(mLab(mk) + ' locked for payroll');
  };
  B.act['pr-to3'] = () => { setStatus(runMk(), 'Calculated', 3); };
  B.act['pr-to4'] = () => { setStatus(runMk(), 'Review', 4); };
  B.act['pr-to5'] = () => { RUN.step = 5; rerender(); };
  B.act['pr-manual'] = () => B.modal({ title: 'Manual deduction', body: grid(field('Employee', `<select class="inp" id="prm-e">${payEmps(runMk()).map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select>`) + field('Amount (৳)', '<input type="number" class="inp" id="prm-a" min="1">')) + field('Reason (required)', '<textarea class="inp" id="prm-r" rows="2" placeholder="Why is this deducted?"></textarea>', true) + `<p class="cl-hint">${ic('alert', 14)} Shown on the payslip with this reason. Recorded in the audit trail.</p>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-manual-ok">Add deduction</button>' });
  B.act['pr-manual-ok'] = () => {
    const e = B.$('#prm-e').value, a = +B.$('#prm-a').value, r = B.$('#prm-r').value.trim(); if (!(a > 0)) { B.toast('Enter an amount', 'bad'); return; } if (!r) { B.toast('A reason is required', 'bad'); return; }
    const mk = runMk(); D().manual.push({ id: nid('man', 'MD-'), month: mk, emp: e, amount: a, reason: r, by: me().name, at: today() }); audit('Manual deduction', '—', M(a) + ' · ' + B.emp(e).name, r); RUN.open[e] = true; done('Manual deduction added');
  };
  B.act['pr-rev'] = (t) => { RUN.rev = t.closest('[data-id]').dataset.id; B.modal({ title: 'Review exception', body: field('Review note', '<textarea class="inp" id="prm-n" rows="3" placeholder="e.g. Verified with line manager"></textarea>', true), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-rev-ok">Mark reviewed</button>' }); };
  B.act['pr-rev-ok'] = () => { const n = B.$('#prm-n').value.trim(); if (!n) { B.toast('Add a review note', 'bad'); return; } mon(runMk()).ex[RUN.rev] = { note: n, by: me().name }; done('Marked reviewed'); };
  B.act['pr-submit'] = () => { const mk = runMk(), m = mon(mk); m.apStages = mkStg([[D().approver, D().approver]]); m.rejNote = ''; setStatus(mk, 'Pending approver', 5); B.toast('Submitted to ' + D().approver); };
  B.act['pr-appok'] = () => { const mk = runMk(), m = mon(mk), s = m.apStages[0]; Object.assign(s, { s: 'Approved', by: s.who, at: today() }); m.approval = { by: s.who, at: today(), note: '' }; finalize(mk, s.who); audit('Payroll approved', 'Pending approver', 'Approved', mLab(mk) + ' · net ' + M(sum(m.rows, (r) => r.net)), s.who); setStatus(mk, 'Approved', 6); B.toast('Payroll approved — payslips v1 generated'); };
  B.act['pr-apprej'] = () => B.modal({ title: 'Reject payroll', body: field('Reason', '<textarea class="inp" id="prm-n" rows="3"></textarea>', true), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-apprej-ok">Reject</button>' });
  B.act['pr-apprej-ok'] = () => { const n = B.$('#prm-n').value.trim(); if (!n) { B.toast('A reason is required', 'bad'); return; } const mk = runMk(), m = mon(mk); m.rejNote = n; m.apStages = null; mon(mk).ex = {}; B.closeModal(); setStatus(mk, 'Review', 4); B.toast('Rejected — back to HR review', 'bad'); };

  /* =====================================================================
     3. PAYROLL PAYMENT
     ===================================================================== */
  const PAY = { mk: null };
  const payMk = () => { if (!PAY.mk) { const c = curM(); PAY.mk = [0, -1, -2, -3].map((n) => addM(c, n)).find((m) => mon(m).status === 'Approved') || c; } return PAY.mk; };
  const bIds = (b) => b.items.map((i) => i.emp + '|' + b.id);
  const findItem = (id) => { const [e, bid] = id.split('|'); const b = D().batches.find((x) => x.id === bid); return { b, i: b && b.items.find((x) => x.emp === e) }; };
  const advCsv = (b) => dlCsv(`bank-advice-${b.id}.csv`, ['Batch', 'Month', 'Channel', 'Employee', 'Employee ID', 'Bank / wallet', 'Branch', 'Account / number', 'Routing', 'Amount (BDT)', 'Run date', 'Status', 'Reference'],
    b.items.slice().sort((a, c) => a.ch.localeCompare(c.ch)).map((i) => [b.id, b.month, i.ch, i.name, i.emp, i.method.type === 'bank' ? i.method.bank : i.method.type, i.method.branch || '', i.method.acc || i.method.number || '', i.method.routing || '', i.amt, b.date, i.status, i.ref || '']));
  B.act['pr-csv-b'] = (t) => advCsv(D().batches.find((b) => b.id === t.dataset.id));
  const batchCard = (b) => {
    const gs = {}; b.items.forEach((i) => (gs[i.ch] = gs[i.ch] || []).push(i));
    const paid = b.items.filter((i) => i.status === 'Paid').length;
    return `<div class="card pad pr-batch"><div class="ct-row"><h3 class="ct">${ic('send', 17)} ${b.id} · ${esc(b.kind)} <em class="sub">${mLab(b.month)} · run date ${fmt(b.date)} · ${paid}/${b.items.length} paid · ${M(sum(b.items, (i) => i.amt))}</em></h3>
      <span class="pr-btns"><button class="btn sm" data-act="pr-csv-b" data-id="${b.id}">${ic('download', 14)}Download CSV</button>${paid ? `<button class="btn sm" data-act="pr-rvs" data-id="${b.id}">Reverse</button>` : ''}</span></div>
      ${Object.keys(gs).sort().map((ch) => `<h4 class="pr-grp">${esc(ch)} <em class="sub">${gs[ch].length} payments · ${M(sum(gs[ch], (i) => i.amt))}</em></h4>${tbl(['Employee', ch === 'Cash' ? 'Details' : gs[ch][0].method.type === 'bank' ? 'Branch · Account · Routing' : 'Wallet number', '>Amount', 'Status', 'Reference / reason', ''], gs[ch].map((i) => `<tr data-id="${i.emp}|${b.id}"><td>${who(i.name)}</td><td>${i.method.type === 'bank' ? esc(i.method.branch) + ' · ' + esc(i.method.acc) + ' · ' + esc(i.method.routing) : esc(i.method.number || 'Collect from HR')}</td><td class="r">${M(i.amt)}</td><td>${pill(i.status === 'Failed' && i.ready ? 'Retry ready' : i.status)}</td><td>${i.status === 'Paid' ? esc(i.ref) + '<em class="sub">' + fmt(i.date) + '</em>' : i.status === 'Failed' ? '<span class="pr-bad">' + esc(i.reason) + '</span>' : i.status === 'Reversed' ? esc(i.reason) : '—'}</td>
        <td class="r">${i.status === 'Pending' ? `<button class="btn sm primary" data-act="pr-paid">Mark paid</button> <button class="btn sm" data-act="pr-fail">Failed</button>` : i.status === 'Failed' && !i.ready ? (i.req && (D().bankReq.find((q) => q.id === i.req) || {}).status === 'Pending HR' ? '<em class="sub">Awaiting HR approval</em>' : `<button class="btn sm" data-act="pr-fix">Correct details</button>`) : ''}</td></tr>`), 'pr-pt')}`).join('')}</div>`;
  };
  page('payroll-payment', () => {
    const d = D(), mk = payMk(), m = mon(mk), rows = rowsOf(mk), ok = m.status === 'Approved' || m.status === 'Paid', t = T.pay;
    const bs = d.batches.filter((b) => b.month === mk), its = bs.reduce((a, b) => a.concat(b.items), []), net = sum(rows, (r) => r.net), paid = sum(its.filter((i) => i.status === 'Paid'), (i) => i.amt);
    const failed = its.filter((i) => i.status === 'Failed'), ready = failed.filter((i) => i.ready);
    const methods = tbl(['Employee', 'Method', 'Details', ''], emps().map((e) => { const p = pmOf(e.id); return `<tr data-id="${e.id}"><td>${who(e.name)}</td><td>${esc(channel(p))}</td><td>${esc(methodLabel(p))}</td><td class="r"><button class="btn sm" data-act="pr-pm-edit">Request change</button></td></tr>`; }));
    const fq = d.bankReq.filter((q) => q.itemRef);
    const failTab = `<div class="as-note">${ic('alert', 14)} Failed payments: HR corrects the account details, a second HR approval is required, then the payment is retried in a new batch.</div><div style="height:12px"></div>${tbl(['Batch', 'Employee', '>Amount', 'Failure reason', 'Correction', ''], failed.map((i) => { const f = findItem(i.emp + '|' + (bs.find((b) => b.items.includes(i)) || {}).id), q = d.bankReq.find((x) => x.id === i.req); return `<tr data-id="${i.emp}|${bs.find((b) => b.items.includes(i)).id}"><td>${bs.find((b) => b.items.includes(i)).id}</td><td>${who(i.name)}</td><td class="r">${M(i.amt)}</td><td>${esc(i.reason)}</td><td>${q ? pill(q.status) + '<em class="sub">' + esc(typeof q.nw === 'string' ? q.nw : methodLabel(q.nw)) + '</em>' : '<em class="sub">No correction yet</em>'}</td><td class="r">${!q || q.status === 'Rejected' ? '<button class="btn sm" data-act="pr-fix">Correct details</button>' : q.status === 'Pending HR' ? `<button class="btn sm primary" data-act="pr-bank-ok" data-id="${q.id}">HR approve</button>` : '<em class="sub">Ready</em>'}</td></tr>`; }))}<div class="as-act"><button class="btn primary" data-act="pr-retry" ${ready.length ? '' : 'disabled'}>${ic('refresh', 15)}Create retry batch (${ready.length})</button></div>`;
    return `${B.head('Payroll Payment', 'Pay only after approval. Bank advice grouped by bank / wallet, with a downloadable CSV.', `${monthSel('pr-pm', mk, 'pr-paymonth')}<button class="btn primary" data-act="pr-pb-new">${ic('plus', 16)}New payment batch</button>`, crumbs('Payment'))}
      ${kp([Kp('card', 'Net payable', M(net)), Kp('check-circle', 'Paid', M(paid), 'ok'), Kp('clock', 'Pending', its.filter((i) => i.status === 'Pending').length + ' payments', 'warn'), Kp('x', 'Failed', failed.length, failed.length ? 'bad' : 'ok'), Kp('file', 'Payslips published', d.slips.filter((s) => s.month === mk && s.pub && s.status === 'Current').length)])}
      ${ok ? `<div class="as-note">${ic('check-circle', 14)} ${mLab(mk)} is ${m.status === 'Paid' ? 'fully paid' : 'approved — ready for payment'}. Payslips are published to each employee as their payment is marked Paid.</div>` : `<div class="as-note pr-warn">${ic('lock', 14)} ${mLab(mk)} is “${esc(m.status)}”. Payment is blocked until the payroll is approved in the <a href="#/page/payroll-run">Monthly Run</a>.</div>`}
      <div style="margin:14px 0 12px">${tabs('pay', [['batches', 'Batches & bank advice'], ['failed', 'Failed & retry (' + failed.length + ')'], ['methods', 'Payment methods']], t)}</div>
      ${t === 'batches' ? (bs.length ? bs.slice().reverse().map(batchCard).join('<div style="height:14px"></div>') : '<div class="as-note">No batches for this month yet.</div>') : t === 'failed' ? failTab : methods}`;
  });
  B.chg['pr-paymonth'] = (t) => { PAY.mk = t.value; rerender(); };
  function newBatch(mk, date, kind, items) {
    const b = { id: nid('pb', 'PB-'), month: mk, date, kind, by: me().name, items: items.map((r) => { const p = JSON.parse(JSON.stringify(pmOf(r.emp))); return { emp: r.emp, name: r.name, amt: r.net, method: p, ch: channel(p), status: 'Pending', date: '', ref: '', reason: '' }; }) };
    D().batches.push(b); return b;
  }
  B.act['pr-pb-new'] = () => {
    const mk = payMk(), m = mon(mk); if (!(m.status === 'Approved')) { B.toast(m.status === 'Paid' ? mLab(mk) + ' is already fully paid' : 'Payment is allowed only after payroll approval', 'bad'); return; }
    const open = rowsOf(mk).filter((r) => !D().batches.some((b) => b.month === mk && b.items.some((i) => i.emp === r.emp && ['Paid', 'Pending'].includes(i.status))) && !D().batches.some((b) => b.month === mk && b.items.some((i) => i.emp === r.emp && i.status === 'Failed' && !i.retried)));
    if (!open.length) { B.toast('Every employee is already in a batch', 'bad'); return; }
    B.modal({ title: 'New payment batch · ' + mLab(mk), body: `<p>${open.length} employees · ${M(sum(open, (r) => r.net))}</p>` + grid(field('Payment run date', `<input type="date" class="inp" id="prm-d" value="${today()}">`) + field('Basis', '<input class="inp" disabled value="Approved payroll, each employee\'s saved method">')), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-pb-ok">Generate batch</button>' });
  };
  B.act['pr-pb-ok'] = () => {
    const mk = payMk(), date = B.$('#prm-d').value; if (!date) { B.toast('Choose a run date', 'bad'); return; }
    const open = rowsOf(mk).filter((r) => !D().batches.some((b) => b.month === mk && b.items.some((i) => i.emp === r.emp && (['Paid', 'Pending'].includes(i.status) || (i.status === 'Failed' && !i.retried)))));
    const b = newBatch(mk, date, 'Payment', open); T.pay = 'batches'; audit('Payment batch created', '—', b.id, mLab(mk) + ' · ' + open.length + ' payments'); done(b.id + ' generated');
  };
  B.act['pr-paid'] = (t) => { RUN.pi = t.closest('[data-id]').dataset.id; B.modal({ title: 'Mark as paid', body: grid(field('Payment date', `<input type="date" class="inp" id="prm-d" value="${today()}">`) + field('Reference / TXN id (required)', '<input class="inp" id="prm-r" placeholder="e.g. TXN8891203">')), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-paid-ok">Mark paid</button>' }); };
  B.act['pr-paid-ok'] = () => {
    const { b, i } = findItem(RUN.pi), dt = B.$('#prm-d').value, r = B.$('#prm-r').value.trim(); if (!dt || !r) { B.toast('Date and reference are required', 'bad'); return; }
    Object.assign(i, { status: 'Paid', date: dt, ref: r }); checkMonthPaid(b.month); publishPaid(b.month); done(i.name + ' paid — payslip published');
  };
  B.act['pr-fail'] = (t) => { RUN.pi = t.closest('[data-id]').dataset.id; B.modal({ title: 'Mark payment failed', body: field('Failure reason (required)', '<select class="inp" id="prm-s"><option>Invalid account number</option><option>Account closed / dormant</option><option>Wrong routing number</option><option>Wallet number not registered</option><option>Bank rejected the transfer</option></select>', true) + field('Details', '<input class="inp" id="prm-r" placeholder="Optional note from the bank">', true), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-fail-ok">Mark failed</button>' }); };
  B.act['pr-fail-ok'] = () => { const { i } = findItem(RUN.pi); i.status = 'Failed'; i.reason = B.$('#prm-s').value + (B.$('#prm-r').value.trim() ? ' — ' + B.$('#prm-r').value.trim() : ''); i.ready = false; T.pay = 'failed'; done('Marked failed'); };
  const pmFields = (p) => `<div class="fgrid" style="grid-template-columns:1fr 1fr">${field('Method', `<select class="inp" id="prm-t" data-chg="pr-pmtype">${[['bank', 'Bank account'], ['bkash', 'bKash'], ['nagad', 'Nagad'], ['cash', 'Cash']].map((x) => `<option value="${x[0]}" ${p.type === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select>`)}<div></div></div>
    <div id="prm-bank" ${p.type === 'bank' ? '' : 'hidden'}><div class="fgrid" style="grid-template-columns:1fr 1fr">${field('Bank', `<input class="inp" id="prm-bk" value="${esc(p.bank || '')}">`)}${field('Branch', `<input class="inp" id="prm-br" value="${esc(p.branch || '')}">`)}${field('Account number', `<input class="inp" id="prm-ac" value="${esc(p.acc || '')}">`)}${field('Routing number (9 digits)', `<input class="inp" id="prm-ro" value="${esc(p.routing || '')}">`)}</div></div>
    <div id="prm-mob" ${p.type === 'bkash' || p.type === 'nagad' ? '' : 'hidden'}>${field('Mobile wallet number', `<input class="inp" id="prm-nu" value="${esc(p.number || '')}" placeholder="01XXXXXXXXX">`, true)}</div>`;
  B.chg['pr-pmtype'] = (t) => { B.$('#prm-bank').hidden = t.value !== 'bank'; B.$('#prm-mob').hidden = !(t.value === 'bkash' || t.value === 'nagad'); };
  const readPm = () => {
    const type = B.$('#prm-t').value, p = { type };
    if (type === 'bank') { p.bank = B.$('#prm-bk').value.trim(); p.branch = B.$('#prm-br').value.trim(); p.acc = B.$('#prm-ac').value.trim(); p.routing = B.$('#prm-ro').value.trim(); if (!p.bank || !p.branch) return 'Bank and branch are required'; if (!/^\d{8,17}$/.test(p.acc)) return 'Account number must be 8–17 digits'; if (!/^\d{9}$/.test(p.routing)) return 'Routing number must be 9 digits'; }
    if (type === 'bkash' || type === 'nagad') { p.number = B.$('#prm-nu').value.trim(); if (!/^01\d{9}$/.test(p.number)) return 'Wallet number must be 11 digits starting with 01'; }
    return p;
  };
  B.act['pr-fix'] = (t) => { RUN.pi = t.closest('[data-id]').dataset.id; const { i } = findItem(RUN.pi); RUN.pmEmp = i.emp; B.modal({ title: 'Correct payment details · ' + i.name, body: `<p class="cl-hint" style="margin:0 0 10px">${ic('alert', 14)} Failure: ${esc(i.reason)}. HR approval is required before the retry.</p>` + pmFields(pmOf(i.emp)) + field('Reason', '<input class="inp" id="prm-why" value="Corrected after failed payment">', true), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-fix-ok">Submit for HR approval</button>' }); };
  B.act['pr-fix-ok'] = () => {
    const p = readPm(); if (typeof p === 'string') { B.toast(p, 'bad'); return; } const { i } = findItem(RUN.pi), q = { id: nid('bank', 'BNK-'), emp: i.emp, old: methodLabel(pmOf(i.emp)), nw: p, reason: B.$('#prm-why').value.trim() || 'Corrected', status: 'Pending HR', created: today(), src: 'Payment failure', itemRef: RUN.pi };
    D().bankReq.push(q); i.req = q.id; T.pay = 'failed'; done('Correction sent for HR approval');
  };
  B.act['pr-pm-edit'] = (t) => { RUN.pmEmp = t.closest('[data-id]').dataset.id; B.modal({ title: 'Request payment-method change · ' + B.emp(RUN.pmEmp).name, body: pmFields(pmOf(RUN.pmEmp)) + field('Reason (required)', '<input class="inp" id="prm-why">', true) + `<p class="cl-hint">${ic('lock', 14)} Applies to future payments only after HR approval. Paid months do not change.</p>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-pm-ok">Submit for approval</button>' }); };
  B.act['pr-pm-ok'] = () => { const p = readPm(); if (typeof p === 'string') { B.toast(p, 'bad'); return; } const why = B.$('#prm-why').value.trim(); if (!why) { B.toast('A reason is required', 'bad'); return; } D().bankReq.push({ id: nid('bank', 'BNK-'), emp: RUN.pmEmp, old: methodLabel(pmOf(RUN.pmEmp)), nw: p, reason: why, status: 'Pending HR', created: today(), src: 'HR request' }); T.prof = 'bank'; done('Sent for HR approval — see Salary Profiles › Bank & mobile'); };
  function approveBank(id, ok) {
    const q = D().bankReq.find((x) => x.id === id); if (!q) return; q.status = ok ? 'Approved' : 'Rejected'; q.by = me().name; q.at = today();
    if (ok) { D().pm[q.emp] = q.nw; if (q.itemRef) { const { i } = findItem(q.itemRef); if (i) i.ready = true; } }
    audit('Payment method ' + (ok ? 'approved' : 'rejected'), q.old, ok ? methodLabel(q.nw) : '—', q.reason, me().name);
  }
  B.act['pr-bank-ok'] = (t) => { approveBank(t.dataset.id, true); done('Approved by HR'); };
  B.act['pr-bank-no'] = (t) => { approveBank(t.dataset.id, false); done('Rejected'); };
  B.act['pr-retry'] = () => {
    const mk = payMk(), ready = []; D().batches.filter((b) => b.month === mk).forEach((b) => b.items.forEach((i) => { if (i.status === 'Failed' && i.ready && !i.retried) ready.push(i); }));
    if (!ready.length) { B.toast('No corrected payments to retry', 'bad'); return; }
    const rows = rowsOf(mk).filter((r) => ready.some((i) => i.emp === r.emp)), b = newBatch(mk, today(), 'Retry', rows); ready.forEach((i) => { i.retried = b.id; i.status = 'Failed'; i.reason += ' (retried in ' + b.id + ')'; i.ready = false; }); T.pay = 'batches'; done('Retry batch ' + b.id + ' created');
  };
  B.act['pr-rvs'] = (t) => { RUN.rb = t.dataset.id; B.modal({ title: 'Reverse batch ' + RUN.rb, body: field('Reason (required)', '<textarea class="inp" id="prm-r" rows="2"></textarea>', true) + `<p class="cl-hint">${ic('alert', 14)} Paid items become “Reversed”, payslips are unpublished and the month can then be reopened.</p>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-rvs-ok">Reverse</button>' }); };
  B.act['pr-rvs-ok'] = () => { const r = B.$('#prm-r').value.trim(); if (!r) { B.toast('A reason is required', 'bad'); return; } const b = D().batches.find((x) => x.id === RUN.rb); b.items.forEach((i) => { if (i.status === 'Paid') { i.status = 'Reversed'; i.reason = r; D().slips.forEach((s) => { if (s.emp === i.emp && s.month === b.month) s.pub = false; }); } }); const m = mon(b.month); if (m.status === 'Paid') m.status = 'Approved'; audit('Payment batch reversed', b.id, 'Reversed', r, me().name); done('Batch reversed'); };

  /* =====================================================================
     4. PAYSLIPS WITH VERSION HISTORY
     ===================================================================== */
  const SL = { mk: '', q: '' };
  page('payslips-v', () => {
    const d = D(), emp = B.role === 'employee', mine = emp ? B.ME.id : null;
    let L = d.slips.filter((s) => (!emp || (s.emp === mine && s.pub)) && (!SL.mk || s.month === SL.mk) && (!SL.q || s.name.toLowerCase().includes(SL.q.toLowerCase())));
    L = L.sort((a, b) => b.month.localeCompare(a.month) || a.name.localeCompare(b.name) || b.v - a.v);
    const cur_ = d.slips.filter((s) => s.status === 'Current');
    return `${B.head(emp ? 'My Payslips' : 'Payslips', emp ? 'Your published payslips. Superseded versions are kept for reference.' : 'Every payslip is versioned. Regenerating creates a new version and marks the old one Superseded.', '', crumbs('Payslips'))}
      ${emp ? '' : kp([Kp('file', 'Current payslips', cur_.length), Kp('check-circle', 'Published', cur_.filter((s) => s.pub).length, 'ok'), Kp('clock', 'Awaiting publish', cur_.filter((s) => !s.pub).length, 'warn'), Kp('refresh', 'Regenerated (v2+)', d.slips.filter((s) => s.v > 1).length)])}
      <div class="filterbar" style="margin:14px 0"><select class="inp" data-chg="pr-slmk" style="width:auto"><option value="">All months</option>${[-3, -2, -1, 0].map((n) => addM(curM(), n)).map((m) => `<option value="${m}" ${SL.mk === m ? 'selected' : ''}>${mLab(m)}</option>`).join('')}</select>${emp ? '' : `<input class="inp" placeholder="Search employee" value="${esc(SL.q)}" data-inp="pr-slq" style="width:220px">`}</div>
      ${tbl(['Employee', 'Month', 'Version', 'Status', '>Net pay', 'Method', 'Paid on', 'Published', ''], L.map((s) => { const pi = payInfo(s.emp, s.month); return `<tr data-id="${s.id}" class="${s.status === 'Superseded' ? 'pr-sup' : ''}"><td>${who(s.name)}</td><td>${mLab(s.month)}</td><td><b>v${s.v}</b></td><td>${pill(s.status)}</td><td class="r">${M(s.snap.net)}</td><td>${esc(s.method)}</td><td>${pi ? fmt(pi.date) : '—'}</td><td>${s.pub ? pill('Published') : pill('Unpublished')}</td>
        <td class="r"><button class="btn sm" data-act="pr-slview">View</button>${!emp && s.status === 'Current' ? (!s.pub ? ` <button class="btn sm primary" data-act="pr-slpub">Publish</button>` : '') + ` <button class="btn sm" data-act="pr-slregen">Regenerate</button>` : ''}</td></tr>`; }))}`;
  });
  B.chg['pr-slmk'] = (t) => { SL.mk = t.value; rerender(); };
  B.inp['pr-slq'] = (t) => { SL.q = t.value; const p = t.selectionStart; rerender(); const n = B.$('[data-inp="pr-slq"]'); if (n) { n.focus(); n.setSelectionRange(p, p); } };
  const slipHtml = (s) => {
    const d = D(), pi = payInfo(s.emp, s.month), e = B.emp(s.emp), hist = d.slips.filter((x) => x.emp === s.emp && x.month === s.month).sort((a, b) => b.v - a.v), sn = s.snap;
    return `<div class="pr-slip ${s.status === 'Superseded' ? 'sup' : ''}">${s.status === 'Superseded' ? '<div class="pr-wm">SUPERSEDED</div>' : ''}
      <div class="pr-sl-h"><div><b>Bijoy</b><em class="sub">Payslip · ${mLab(s.month)}</em></div><div>${pill(s.status)} <b>v${s.v}</b></div></div>
      <dl class="kv as-kv"><div><dt>Employee</dt><dd>${esc(s.name)} (${esc(s.emp)})</dd></div><div><dt>Designation</dt><dd>${esc(e ? e.desig : '')} · ${esc(e ? e.dept : '')}</dd></div><div><dt>Payment method</dt><dd>${esc(s.method)}</dd></div><div><dt>Paid on</dt><dd>${pi ? fmt(pi.date) + ' · ' + esc(pi.ref) : 'Not yet paid'}</dd></div></dl>
      <div class="grid-2"><div><h4 class="pr-grp">Earnings</h4><table class="dt">${sn.earn.map((x) => `<tr><td>${esc(x.n)}${x.note ? '<em class="sub">' + esc(x.note) + '</em>' : ''}</td><td class="r">${M(x.amt)}</td></tr>`).join('')}<tr><td><b>Gross</b></td><td class="r"><b>${M(sn.gross)}</b></td></tr>${sn.add.map((x) => `<tr><td>${esc(x.n)}<em class="sub">${esc(x.reason)}</em></td><td class="r">+ ${M(x.amt)}</td></tr>`).join('')}</table></div>
      <div><h4 class="pr-grp">Deductions</h4><table class="dt">${sn.ded.filter((x) => x.amt > 0).map((x) => `<tr><td>${esc(x.n)}<em class="sub">${esc(x.reason)}</em></td><td class="r">${M(x.amt)}</td></tr>`).join('') || '<tr><td class="as-none">No deductions</td><td></td></tr>'}<tr><td><b>Total deductions</b></td><td class="r"><b>${M(sn.totalDed)}</b></td></tr></table></div></div>
      <div class="pr-net">Net pay <b>${M(sn.net)}</b></div>${s.why ? `<p class="cl-hint">${ic('refresh', 14)} v${s.v}: ${esc(s.why)} · ${fmt(s.gen)} · ${esc(s.by)}</p>` : ''}
      <h4 class="pr-grp">Version history</h4><ul class="fl-trail">${hist.map((h) => `<li class="${h.status === 'Current' ? 'approved' : ''}"><b>v${h.v}</b><span>${esc(h.status)} · generated ${fmt(h.gen)} · ${h.pub ? 'published ' + fmt(h.pubAt) : 'not published'}</span>${h.why ? `<em>“${esc(h.why)}”</em>` : ''}</li>`).join('')}</ul></div>`;
  };
  B.act['pr-slview'] = (t) => { const s = D().slips.find((x) => x.id === t.closest('[data-id]').dataset.id); B.modal({ title: 'Payslip · ' + esc(s.name), wide: true, body: slipHtml(s), foot: '<button class="btn" data-act="pr-print">Print</button><button class="btn primary" data-act="close-modal">Close</button>' }); };
  B.act['pr-print'] = () => window.print();
  B.act['pr-slpub'] = (t) => { const s = D().slips.find((x) => x.id === t.closest('[data-id]').dataset.id); if (!payInfo(s.emp, s.month)) { B.toast('A payslip can be published only after payment', 'bad'); return; } s.pub = true; s.pubAt = today(); done('Published to ' + s.name); };
  B.act['pr-slregen'] = (t) => { RUN.sl = t.closest('[data-id]').dataset.id; B.modal({ title: 'Regenerate payslip', body: field('Reason (required)', '<textarea class="inp" id="prm-r" rows="2" placeholder="e.g. Corrected bank details / late count"></textarea>', true) + `<p class="cl-hint">${ic('alert', 14)} A new version is created. The current version becomes “Superseded” and stays visible in history. Payroll figures of the locked month do not change.</p>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-slregen-ok">Regenerate</button>' }); };
  B.act['pr-slregen-ok'] = () => {
    const r = B.$('#prm-r').value.trim(); if (!r) { B.toast('A reason is required', 'bad'); return; }
    const s = D().slips.find((x) => x.id === RUN.sl), row = mon(s.month).rows && mon(s.month).rows.find((x) => x.emp === s.emp); if (!row) { B.toast('Payroll row not found', 'bad'); return; }
    const hadPub = s.pub; mkSlip(row, s.v + 1, r); const n = D().slips[D().slips.length - 1]; if (hadPub) { n.pub = true; n.pubAt = today(); } audit('Payslip regenerated', 'v' + s.v, 'v' + n.v, r + ' · ' + s.name); done('Payslip v' + n.v + ' created; v' + s.v + ' marked Superseded');
  };

  /* =====================================================================
     5. CORRECTIONS
     ===================================================================== */
  const nextOpen = (after) => { let m = curM(); while (m <= (after || '') || ['Approved', 'Pending approver', 'Paid'].includes(mon(m).status)) m = addM(m, 1); return m; };
  const apprBtns = (k, id, st) => (st === 'Pending HR' ? `<button class="btn sm primary" data-act="pr-co-ok" data-k="${k}" data-id="${id}">HR approve</button> <button class="btn sm" data-act="pr-co-no" data-k="${k}" data-id="${id}">Reject</button>` : '');
  const lockedMonths = () => [-3, -2, -1, 0].map((n) => addM(curM(), n)).filter((m) => locks().includes(m));
  function reopenBlock(mk) {
    const m = mon(mk), paid = D().batches.filter((b) => b.month === mk).reduce((n, b) => n + b.items.filter((i) => i.status === 'Paid').length, 0);
    if (paid > 0 || m.status === 'Paid') return `${mLab(mk)} has ${paid} payment(s) marked Paid. A month can be reopened only if it is unpaid or its payments are reversed (Payment › Reverse).`;
    return '';
  }
  page('payroll-corrections', () => {
    const d = D(), t = T.corr, cm = curM();
    const arr = tbl(['ID', 'Employee', 'Belongs to month', 'Applied in', '>Amount', 'Reason', 'Status', ''], d.arrears.map((a) => `<tr><td>${a.id}</td><td>${who(B.emp(a.emp).name)}</td><td><b>${mLab(a.forMonth)}</b></td><td>${a.applied ? mLab(a.applied) : mLab(a.applyMonth)}</td><td class="r">${M(a.amount)}</td><td>${esc(a.reason)}</td><td>${pill(a.applied ? 'Applied' : a.status)}</td><td class="r">${apprBtns('arr', a.id, a.status)}</td></tr>`));
    const rec = tbl(['ID', 'Employee', 'What', '>Total', 'Plan', 'Progress', 'Status', ''], d.recov.map((r) => `<tr><td>${r.id}</td><td>${who(B.emp(r.emp).name)}</td><td>${esc(r.what)}</td><td class="r">${M(r.total)}</td><td>${r.mode === 'once' ? 'One go' : r.n + ' × ' + M(r.per)}</td><td>${recLeft(r)} / ${r.n}</td><td>${pill(r.status)}</td><td class="r">${apprBtns('rec', r.id, r.status)}</td></tr>`));
    const adj = tbl(['ID', 'Employee', 'Revised month', '>Difference', 'Applied as line in', 'Reason', 'Status', ''], d.adj.map((a) => `<tr><td>${a.id}</td><td>${who(B.emp(a.emp).name)}</td><td>${mLab(a.forMonth)}</td><td class="r">${a.amount >= 0 ? '+ ' : '− '}${M(Math.abs(a.amount))}</td><td>${mLab(a.applyMonth)}</td><td>${esc(a.reason)}</td><td>${pill(a.applied ? 'Applied' : a.status)}</td><td class="r">${apprBtns('adj', a.id, a.status)}</td></tr>`));
    const ro = tbl(['ID', 'Month', 'Reason', 'Requested', 'HR', 'Approver (' + esc(d.approver) + ')', 'Status', ''], d.reopen.map((r) => `<tr data-id="${r.id}"><td>${r.id}</td><td><b>${mLab(r.month)}</b></td><td>${esc(r.reason)}</td><td>${esc(r.by)} · ${fmtS(r.at)}</td><td>${pill(r.hr === 'Pending' ? 'Pending' : r.hr)}</td><td>${pill(r.approver)}</td><td>${pill(r.status === 'Done' ? 'Reopened' : r.status)}</td><td class="r">${r.status === 'Pending' ? (r.hr === 'Pending' ? `<button class="btn sm primary" data-act="pr-ro-hr">HR approve</button> ` : `<button class="btn sm primary" data-act="pr-ro-ap">Approver approve</button> `) + `<button class="btn sm" data-act="pr-ro-no">Reject</button>` : ''}</td></tr>`));
    const aud = tbl(['When', 'By', 'What', 'Old', 'New', 'Reason', 'Approver'], d.audit.map((a) => `<tr><td>${esc(a.at)}</td><td>${esc(a.by)}</td><td><b>${esc(a.what)}</b></td><td>${esc(a.old)}</td><td>${esc(a.nw)}</td><td>${esc(a.reason)}</td><td>${esc(a.approver)}</td></tr>`));
    return `${B.head('Payroll Corrections', 'Arrears, overpayment recovery, revised payroll and month reopening. Old months are never edited — fixes flow into an open month.', `<button class="btn" data-act="pr-co-new" data-k="arr">${ic('plus', 15)}Arrears</button><button class="btn" data-act="pr-co-new" data-k="rec">${ic('plus', 15)}Recovery</button><button class="btn" data-act="pr-co-new" data-k="adj">${ic('plus', 15)}Revised payroll</button><button class="btn primary" data-act="pr-ro-new">${ic('lock', 15)}Request reopen</button>`, crumbs('Corrections'))}
      ${kp([Kp('gift', 'Arrears pending', d.arrears.filter((a) => a.status === 'Pending HR').length, 'warn'), Kp('refresh', 'Recoveries active', d.recov.filter((r) => r.status === 'Approved' && recLeft(r) < r.n).length), Kp('edit', 'Revised-payroll lines', d.adj.length), Kp('lock', 'Reopen requests', d.reopen.filter((r) => r.status === 'Pending').length, 'warn'), Kp('file', 'Audit entries', d.audit.length)])}
      <div class="as-note" style="margin-top:14px">${ic('alert', 14)} Rules: arrears appear as a separate line naming the month they belong to · overpayments are recovered in one go or HR-approved instalments · revised payroll creates an adjustment line in the next open month (${mLab(nextOpen())}) · a locked month can be reopened only with HR + approver permission and only if it is unpaid or reversed.</div>
      <div style="margin:14px 0 12px">${tabs('corr', [['arrears', 'Arrears'], ['recov', 'Overpayment recovery'], ['adj', 'Revised payroll'], ['reopen', 'Reopen month'], ['audit', 'Audit trail'], ['report', 'Monthly report']], t)}</div>
      ${t === 'arrears' ? arr : t === 'recov' ? rec : t === 'adj' ? adj : t === 'reopen' ? ro : t === 'audit' ? aud : corrReport()}`;
  });
  function corrReport(mk) {
    const d = D(); mk = mk || REP.mk || addM(curM(), -1); const arr = d.arrears.filter((a) => a.applyMonth === mk || a.forMonth === mk), adj = d.adj.filter((a) => a.applyMonth === mk || a.forMonth === mk), rec = d.recov.filter((r) => r.start <= mk && (r.paid || []).includes(mk)), ro = d.reopen.filter((r) => r.month === mk);
    const rows = [].concat(arr.map((a) => ['Arrears', B.emp(a.emp).name, 'For ' + mLab(a.forMonth) + ', applied ' + mLab(a.applyMonth), a.amount, a.status]), rec.map((r) => ['Recovery', B.emp(r.emp).name, r.what, -r.per, 'Instalment']), adj.map((a) => ['Adjustment', B.emp(a.emp).name, a.reason, a.amount, a.status]), ro.map((r) => ['Reopen request', '—', r.reason, 0, r.status]));
    REP.csv = { name: `corrections-${mk}.csv`, head: ['Type', 'Employee', 'Detail', 'Amount', 'Status'], rows: rows.map((r) => r.map(String)) };
    return `<div class="filterbar" style="margin-bottom:12px">${monthSel('pr-cm', mk, 'pr-repmonth')}<button class="btn sm" data-act="pr-rep-csv">${ic('download', 14)}Download CSV</button></div>${tbl(['Type', 'Employee', 'Detail', '>Amount', 'Status'], rows.map((r) => `<tr><td>${r[0]}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td class="r">${r[3] ? M(r[3]) : '—'}</td><td>${esc(r[4])}</td></tr>`))}<p class="cl-hint">Net correction effect: ${M(sum(rows, (r) => +r[3]))} · ${audCount(mk)} audit entries in the month</p>`;
  }
  const audCount = (mk) => D().audit.filter((a) => a.at.slice(0, 7) === mk).length;
  B.chg['pr-repmonth'] = (t) => { REP.mk = t.value; rerender(); };
  B.act['pr-rep-csv'] = () => { if (REP.csv) dlCsv(REP.csv.name, REP.csv.head, REP.csv.rows); };
  const empSel = (id) => `<select class="inp" id="${id}">${emps().map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select>`;
  B.act['pr-co-new'] = (t) => {
    const k = t.dataset.k, months = (sel) => [-3, -2, -1].map((n) => addM(curM(), n)).map((m) => `<option value="${m}">${mLab(m)}</option>`).join('');
    const body = k === 'arr' ? grid(field('Employee', empSel('prm-e')) + field('Belongs to month', `<select class="inp" id="prm-m">${months()}</select>`) + field('Amount (৳)', '<input type="number" class="inp" id="prm-a" min="1">') + field('Paid in', `<input class="inp" disabled value="${mLab(nextOpen())} (next open month)">`)) + field('Reason (required)', '<input class="inp" id="prm-r">', true)
      : k === 'rec' ? grid(field('Employee', empSel('prm-e')) + field('Total to recover (৳)', '<input type="number" class="inp" id="prm-a" min="1">') + field('Plan', '<select class="inp" id="prm-p"><option value="once">One go</option><option value="3">3 instalments</option><option value="6">6 instalments</option><option value="12">12 instalments</option></select>') + field('Starts in', `<input class="inp" disabled value="${mLab(nextOpen())}">`)) + field('What was overpaid (required)', '<input class="inp" id="prm-r">', true)
        : grid(field('Employee', empSel('prm-e')) + field('Month being revised', `<select class="inp" id="prm-m">${months()}</select>`) + field('Revised net pay (৳)', '<input type="number" class="inp" id="prm-a" min="0">') + field('Adjustment line in', `<input class="inp" disabled value="${mLab(nextOpen())} (next month, default)">`)) + field('Reason (required)', '<input class="inp" id="prm-r">', true);
    RUN.ck = k; B.modal({ title: k === 'arr' ? 'Add arrears' : k === 'rec' ? 'Overpayment recovery' : 'Revised payroll', body: body + `<p class="cl-hint">${ic('lock', 14)} The old month is not changed. Needs HR approval before it is applied.</p>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-co-ok2">Submit</button>' });
  };
  B.act['pr-co-ok2'] = () => {
    const k = RUN.ck, d = D(), e = B.$('#prm-e').value, a = +B.$('#prm-a').value, r = B.$('#prm-r').value.trim(); if (!r) { B.toast('A reason is required', 'bad'); return; }
    if (k === 'adj') {
      const mk = B.$('#prm-m').value, row = (mon(mk).rows || []).find((x) => x.emp === e); if (!row) { B.toast('That employee has no payroll row in ' + mLab(mk), 'bad'); return; } if (!(a >= 0)) { B.toast('Enter the revised net pay', 'bad'); return; }
      const diff = a - row.net; if (!diff) { B.toast('Revised net equals the paid net — nothing to adjust', 'bad'); return; }
      d.adj.push({ id: nid('adj', 'ADJ-'), emp: e, forMonth: mk, applyMonth: nextOpen(mk), amount: diff, reason: `Revised ${mLab(mk)} net ${M(row.net)} → ${M(a)}: ${r}`, status: 'Pending HR', applied: '' }); audit('Revised payroll', M(row.net), M(a), r);
    } else {
      if (!(a > 0)) { B.toast('Enter an amount', 'bad'); return; }
      if (k === 'arr') { d.arrears.push({ id: nid('arr', 'ARR-'), emp: e, forMonth: B.$('#prm-m').value, applyMonth: nextOpen(), amount: a, reason: r, status: 'Pending HR', by: me().name, applied: '' }); audit('Arrears raised', '—', M(a), r); }
      else { const pl = B.$('#prm-p').value, n = pl === 'once' ? 1 : +pl; d.recov.push({ id: nid('rec', 'REC-'), emp: e, what: r, total: a, mode: pl === 'once' ? 'once' : 'inst', n, per: Math.ceil(a / n), start: nextOpen(), status: 'Pending HR', approvedBy: '', paid: [], created: today() }); audit('Overpayment recovery raised', '—', M(a) + (n > 1 ? ' in ' + n + ' instalments' : ' in one go'), r); }
    }
    T.corr = k === 'arr' ? 'arrears' : k === 'rec' ? 'recov' : 'adj'; done('Submitted for HR approval');
  };
  B.act['pr-co-ok'] = (t) => { const L = { arr: 'arrears', rec: 'recov', adj: 'adj' }[t.dataset.k], x = D()[L].find((q) => q.id === t.dataset.id); x.status = 'Approved'; if (x.approvedBy !== undefined) x.approvedBy = me().name; audit(t.dataset.id + ' approved', 'Pending HR', 'Approved', x.reason || x.what, me().name); done('Approved — will apply in ' + mLab(x.applyMonth || x.start)); };
  B.act['pr-co-no'] = (t) => { const L = { arr: 'arrears', rec: 'recov', adj: 'adj' }[t.dataset.k], x = D()[L].find((q) => q.id === t.dataset.id); x.status = 'Rejected'; audit(t.dataset.id + ' rejected', 'Pending HR', 'Rejected', x.reason || x.what, me().name); done('Rejected'); };
  B.act['pr-ro-new'] = () => { const L = lockedMonths(); B.modal({ title: 'Request to reopen a locked month', body: field('Locked month', `<select class="inp" id="prm-m">${L.map((m) => `<option value="${m}">${mLab(m)} — ${esc(mon(m).status)}</option>`).join('')}</select>`, true) + field('Reason (required)', '<textarea class="inp" id="prm-r" rows="2"></textarea>', true) + `<p class="cl-hint">${ic('lock', 14)} Needs HR approval and then the payroll approver. Allowed only when the month is unpaid or its payments are reversed.</p>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-ro-ok">Request</button>' }); };
  B.act['pr-ro-ok'] = () => {
    const mk = B.$('#prm-m') && B.$('#prm-m').value, r = B.$('#prm-r').value.trim(); if (!mk) { B.toast('No locked month to reopen', 'bad'); return; } if (!r) { B.toast('A reason is required', 'bad'); return; }
    const blk = reopenBlock(mk); if (blk) { B.toast(blk, 'bad'); return; } if (D().reopen.some((q) => q.month === mk && q.status === 'Pending')) { B.toast('A reopen request is already open for this month', 'bad'); return; }
    D().reopen.push({ id: nid('ro', 'RO-'), month: mk, reason: r, by: me().name, at: today(), hr: 'Pending', approver: 'Pending', status: 'Pending' }); audit('Reopen requested', 'Locked', 'Request', r); T.corr = 'reopen'; done('Reopen request sent');
  };
  const roOf = (t) => D().reopen.find((q) => q.id === t.closest('[data-id]').dataset.id);
  B.act['pr-ro-hr'] = (t) => { const q = roOf(t); q.hr = 'Approved'; audit('Reopen: HR approved', 'Pending', 'Approved', q.reason, me().name); done('HR approved — waiting for ' + D().approver); };
  B.act['pr-ro-no'] = (t) => { const q = roOf(t); q.status = 'Rejected'; q.hr = q.hr === 'Pending' ? 'Rejected' : q.hr; q.approver = 'Rejected'; audit('Reopen rejected', 'Request', 'Rejected', q.reason, me().name); done('Request rejected'); };
  B.act['pr-ro-ap'] = (t) => {
    const q = roOf(t), blk = reopenBlock(q.month); if (blk) { B.toast(blk, 'bad'); return; }
    q.approver = 'Approved'; q.status = 'Done'; undoFinal(q.month); const m = mon(q.month); m.status = 'Open'; m.ex = {}; m.apStages = null; setLocks(locks().filter((x) => x !== q.month)); RUN.mk = q.month; RUN.step = null;
    audit('Month reopened', 'Locked', 'Open', q.reason, D().approver); done(mLab(q.month) + ' reopened — slips of that month are superseded and must be regenerated');
  };

  /* =====================================================================
     6. SALARY PROFILES & REVISIONS
     ===================================================================== */
  const SP = { id: null };
  const stateOf = (e) => { const p = prof(e.id); return p.prob && today() < p.prob.confirm ? 'Probation' : 'Confirmed'; };
  page('salary-profiles', () => {
    const d = D(), t = T.prof, R = rulesFor(curM());
    const profiles = tbl(['Employee', 'Grade', 'Status', '>Probation salary', '>Current gross', '>Basic', 'Effective from', ''], emps().map((e) => { const g = salaryAt(e, today()), p = prof(e.id), cl = compLines(g, R.comps), rv = d.revs.filter((r) => r.emp === e.id && r.status === 'Approved').sort((a, b) => b.eff.localeCompare(a.eff))[0]; return `<tr data-id="${e.id}"><td>${who(e.name)}<em class="sub">${esc(e.desig)}</em></td><td>${esc(p.grade || e.grade)}</td><td>${pill(stateOf(e))}${p.prob && stateOf(e) === 'Probation' ? '<em class="sub">confirms ' + fmtS(p.prob.confirm) + '</em>' : ''}</td><td class="r">${p.prob ? M(p.prob.salary) : '—'}</td><td class="r"><b>${M(g)}</b></td><td class="r">${M(cl[0].amt)}</td><td>${fmt(rv ? rv.eff : doj(e))}</td><td class="r"><button class="btn sm" data-act="pr-sp-view">View</button> <button class="btn sm" data-act="pr-rev-new">Revise</button></td></tr>`; }));
    const revs = tbl(['ID', 'Employee', 'Type', 'Effective', '>Old', '>New', 'Approval flow', 'Status', ''], d.revs.slice().reverse().map((r) => `<tr data-id="${r.id}"><td>${r.id}</td><td>${who(B.emp(r.emp).name)}</td><td>${esc(r.type)}</td><td>${fmt(r.eff)}</td><td class="r">${M(r.old)}</td><td class="r"><b>${M(r.new)}</b> <em class="sub">${r.new > r.old ? '+' : ''}${Math.round((r.new / r.old - 1) * 100)}%</em></td><td>${stageTrk(r.stages)}</td><td>${pill(r.status)}</td><td class="r">${r.status === 'Pending' ? `<button class="btn sm primary" data-act="pr-srev-ok">Approve as ${esc(r.stages[stgNow(r.stages)].t)}</button> <button class="btn sm" data-act="pr-srev-no">Reject</button>` : ''}</td></tr>`));
    const bank = tbl(['Request', 'Employee', 'Current', 'Requested', 'Reason', 'Source', 'Status', ''], d.bankReq.slice().reverse().map((q) => `<tr><td>${q.id}</td><td>${who(B.emp(q.emp).name)}</td><td>${esc(q.old)}</td><td>${esc(typeof q.nw === 'string' ? q.nw : methodLabel(q.nw))}</td><td>${esc(q.reason)}</td><td>${esc(q.src)}</td><td>${pill(q.status)}</td><td class="r">${q.status === 'Pending HR' ? `<button class="btn sm primary" data-act="pr-bank-ok" data-id="${q.id}">HR approve</button> <button class="btn sm" data-act="pr-bank-no" data-id="${q.id}">Reject</button>` : ''}</td></tr>`));
    return `${B.head('Salary Profiles & Revisions', 'Salary components per employee, probation vs confirmed salary, and effective-dated revisions with full history.', `<button class="btn primary" data-act="pr-rev-new">${ic('plus', 16)}New revision</button>`, crumbs('Salary Profiles'))}
      ${kp([Kp('users', 'On probation', emps().filter((e) => stateOf(e) === 'Probation').length, 'warn'), Kp('trend', 'Revisions pending', d.revs.filter((r) => r.status === 'Pending').length, 'warn'), Kp('check-circle', 'Revisions approved', d.revs.filter((r) => r.status === 'Approved').length, 'ok'), Kp('card', 'Bank / wallet changes pending', d.bankReq.filter((q) => q.status === 'Pending HR').length, 'warn')])}
      <div class="as-note" style="margin-top:14px">${ic('lock', 14)} Revisions are effective-dated and need approval HR → Higher management. Payroll months already locked are never changed; any backdated difference becomes an arrears line.</div>
      <div style="margin:14px 0 12px">${tabs('prof', [['profiles', 'Profiles'], ['revs', 'Revisions & history'], ['bank', 'Bank & mobile banking']], t)}</div>${t === 'profiles' ? profiles : t === 'revs' ? revs : bank}`;
  });
  B.act['pr-sp-view'] = (t) => {
    const e = B.emp(t.closest('[data-id]').dataset.id), g = salaryAt(e, today()), cl = compLines(g, rulesFor(curM())), p = prof(e.id), rv = D().revs.filter((r) => r.emp === e.id).sort((a, b) => b.eff.localeCompare(a.eff));
    B.modal({ title: esc(e.name) + ' · salary profile', wide: true, body: `<dl class="kv as-kv"><div><dt>Grade</dt><dd>${esc(p.grade || e.grade)}</dd></div><div><dt>Joined</dt><dd>${fmt(doj(e))}</dd></div><div><dt>Status</dt><dd>${stateOf(e)}</dd></div><div><dt>Method</dt><dd>${esc(methodLabel(pmOf(e.id)))}</dd></div></dl>
      <div class="grid-2"><div><h4 class="pr-grp">Components (gross ${M(g)})</h4><table class="dt">${cl.map((c) => `<tr><td>${esc(c.n)}</td><td class="r">${M(c.amt)}</td></tr>`).join('')}</table></div>
      <div><h4 class="pr-grp">Probation / confirmation</h4>${p.prob ? `<p>Probation salary <b>${M(p.prob.salary)}</b> → confirmed salary <b>${M(e.salary)}</b> on <b>${fmt(p.prob.confirm)}</b>.</p>${today() < p.prob.confirm ? `<button class="btn sm primary" data-act="pr-confirm-now" data-id="${e.id}">Confirm today</button>` : ''}` : '<p class="as-none">Confirmed employee — no probation salary.</p>'}</div></div>
      <h4 class="pr-grp">Revision history</h4>${rv.length ? `<ul class="fl-trail">${rv.map((r) => `<li class="${r.status === 'Approved' ? 'approved' : r.status.toLowerCase()}"><b>${esc(r.type)} · ${fmt(r.eff)}</b><span>${M(r.old)} → ${M(r.new)} · ${esc(r.status)}</span><em>“${esc(r.reason)}”</em></li>`).join('')}</ul>` : '<p class="as-none">No revisions yet.</p>'}`, foot: '<button class="btn primary" data-act="close-modal">Close</button>' });
  };
  B.act['pr-confirm-now'] = (t) => { const p = prof(t.dataset.id); audit('Employee confirmed', 'Probation salary ' + M(p.prob.salary), 'Confirmed salary', 'Confirmed on ' + fmt(today()), me().name); p.prob.confirm = today(); done('Confirmed — new salary from today; old months unchanged'); };
  B.act['pr-rev-new'] = (t) => { const row = t.closest && t.closest('[data-id]'); const sel_ = row && B.emp(row.dataset.id) ? row.dataset.id : ''; B.modal({ title: 'New salary revision', body: grid(field('Employee', `<select class="inp" id="prm-e" data-chg="pr-revemp">${emps().map((e) => `<option value="${e.id}" ${e.id === sel_ ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select>`) + field('Type', '<select class="inp" id="prm-t"><option>Increment</option><option>Promotion</option><option>Correction</option></select>') + field('Effective from', `<input type="date" class="inp" id="prm-d" value="${nextOpen() + '-01'}">`) + field('New gross (৳)', '<input type="number" class="inp" id="prm-a" min="1">') + field('New grade (optional)', '<input class="inp" id="prm-g">') + field('Current gross', '<input class="inp" id="prm-cur" disabled>')) + field('Reason (required)', '<input class="inp" id="prm-r">', true) + `<p class="cl-hint">${ic('lock', 14)} Approval: HR → Higher management. Old payroll months never change; backdated differences become arrears.</p>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-rev-ok2">Submit for approval</button>' }); B.chg['pr-revemp'](B.$('#prm-e')); };
  B.chg['pr-revemp'] = (t) => { const e = B.emp(t.value); B.$('#prm-cur').value = M(salaryAt(e, today())); };
  B.act['pr-rev-ok2'] = () => {
    const d = D(), e = B.emp(B.$('#prm-e').value), eff = B.$('#prm-d').value, nw = +B.$('#prm-a').value, r = B.$('#prm-r').value.trim(), old = salaryAt(e, eff);
    if (!eff || !(nw > 0)) { B.toast('Effective date and new gross are required', 'bad'); return; } if (nw === old) { B.toast('New gross equals the current gross', 'bad'); return; } if (!r) { B.toast('A reason is required', 'bad'); return; }
    if (d.revs.some((x) => x.emp === e.id && x.status === 'Pending')) { B.toast('This employee already has a pending revision', 'bad'); return; }
    d.revs.push({ id: nid('rev', 'REV-'), emp: e.id, type: B.$('#prm-t').value, eff, old, new: nw, grade: B.$('#prm-g').value.trim() || prof(e.id).grade || e.grade, reason: r, status: 'Pending', created: today(), stages: mkStg([['HR', 'Rahim Uddin'], ['Higher management', d.approver]]) }); audit('Salary revision requested', M(old), M(nw), r); T.prof = 'revs'; done('Revision submitted: HR → Higher management');
  };
  const revOf = (t) => D().revs.find((q) => q.id === t.closest('[data-id]').dataset.id);
  B.act['pr-srev-ok'] = (t) => {
    const r = revOf(t), i = stgNow(r.stages), s = r.stages[i]; Object.assign(s, { s: 'Approved', by: s.who, at: today() });
    if (r.stages.every((x) => x.s === 'Approved')) {
      r.status = 'Approved'; if (r.grade) prof(r.emp).grade = r.grade; const cm = curM(); let n = 0;
      lockedMonths().filter((m) => m >= ym(r.eff) && m < cm && mon(m).rows).forEach((m) => { const row = mon(m).rows.find((x) => x.emp === r.emp); if (!row) return; const f = m === ym(r.eff) ? (dim(m) - +r.eff.slice(8) + 1) / dim(m) : 1, diff = Math.round((r.new - r.old) * f); if (diff > 0) { D().arrears.push({ id: nid('arr', 'ARR-'), emp: r.emp, forMonth: m, applyMonth: nextOpen(), amount: diff, reason: `${r.type} ${r.id} backdated to ${fmt(r.eff)}`, status: 'Pending HR', by: 'System', applied: '' }); n++; } });
      audit('Salary revision approved', M(r.old), M(r.new), r.type + ' effective ' + fmt(r.eff), s.who); done('Revision approved' + (n ? ' · ' + n + ' arrears line(s) raised for locked months' : ''));
    } else { audit('Revision stage approved', r.id, s.t, r.reason, s.who); done(s.t + ' approved — next: ' + r.stages[stgNow(r.stages)].t); }
  };
  B.act['pr-srev-no'] = (t) => { const r = revOf(t); r.status = 'Rejected'; r.stages[stgNow(r.stages)].s = 'Rejected'; audit('Salary revision rejected', M(r.old), M(r.new), r.reason, me().name); done('Revision rejected'); };

  /* =====================================================================
     7. STATUTORY & OTHER ITEMS (all rates to be confirmed)
     ===================================================================== */
  const tog = (p, label) => `<div class="ct-row"><h3 class="ct">${label} ${tbc}</h3>${chk(p, 'Enabled', { r: 1 })}</div>`;
  page('statutory-items', () => {
    const d = D(), S = d.stat, t = T.stat;
    const elig = emps().filter((e) => e.type === 'Full-time' && confirmedBy(e, curM(), S));
    let body = '';
    if (t === 'tax') body = `<div class="card pad">${tog('stat.tax.on', 'Income tax (TDS / AIT)')}<div class="fgrid" style="grid-template-columns:repeat(4,1fr)">${field('Exempt share of income (%)', inp('stat.tax.exemptPct', { n: 1 }))}${field('Exemption cap (৳/yr)', inp('stat.tax.exemptCap', { n: 1 }))}${field('Tax rebate (৳/yr)', inp('stat.tax.rebate', { n: 1 }))}${field('Minimum tax (৳/yr)', inp('stat.tax.minTax', { n: 1 }))}</div>
      <h4 class="pr-grp">Slab table (annual taxable income, applied top-down)</h4><table class="dt"><thead><tr><th>Slice up to (৳)</th><th>Rate %</th></tr></thead><tbody>${S.tax.slabs.map((s, i) => `<tr><td>${s.upto == null ? '<b>Remainder</b>' : inp(`stat.tax.slabs.${i}.upto`, { n: 1, w: '140px' })}</td><td>${inp(`stat.tax.slabs.${i}.rate`, { n: 1, w: '90px' })}</td></tr>`).join('')}</tbody></table></div>
      <h3 class="ct" style="margin:18px 0 10px">TIN register</h3>${tbl(['Employee', 'TIN', '>Monthly gross', '>Estimated monthly tax'], emps().map((e) => `<tr><td>${who(e.name)}</td><td><input class="inp pr-in" value="${esc(d.tin[e.id] || '')}" placeholder="No TIN" data-chg="pr-set" data-p="tin.${e.id}" style="width:160px"></td><td class="r">${M(salaryAt(e, today()))}</td><td class="r">${M(taxMonthly(S.tax, salaryAt(e, today()) * 12))}</td></tr>`))}`;
    else if (t === 'pf') body = `<div class="card pad">${tog('stat.pf.on', 'Provident fund')}<div class="fgrid" style="grid-template-columns:repeat(4,1fr)">${field('Employee contribution (% of basic)', inp('stat.pf.ee', { n: 1 }))}${field('Employer contribution (% of basic)', inp('stat.pf.er', { n: 1 }))}${field('Eligible after probation (months)', inp('stat.pf.after', { n: 1 }))}${field('Applies to', '<input class="inp" disabled value="Full-time employees">')}</div>
      <p class="cl-hint">${ic('user-check', 14)} ${elig.length} employees are eligible this month. Probation salary profiles use their confirmation date.</p></div>${tbl(['Employee', '>Basic', '>Employee PF', '>Employer PF'], rowsOf(curM()).slice(0, 12).map((r) => `<tr><td>${who(r.name)}</td><td class="r">${M(r.basic)}</td><td class="r">${M(sum(r.ded.filter((x) => /Provident/.test(x.n)), (x) => x.amt))}</td><td class="r">${M(r.employer)}</td></tr>`))}`;
    else if (t === 'fest') body = `<div class="card pad">${tog('stat.fest.on', 'Festival bonus')}<div class="fgrid" style="grid-template-columns:repeat(4,1fr)">${field('Basis', sel('stat.fest.basis', [['basic', '% of basic'], ['fixed', 'Fixed amount']], { r: 1 }))}${field('Percent of basic', inp('stat.fest.pct', { n: 1 }))}${field('Fixed amount (৳)', inp('stat.fest.fixed', { n: 1 }))}${field('Minimum service (months)', inp('stat.fest.minService', { n: 1 }))}</div>${chk('stat.fest.prorata', 'Pro-rata for employees who leave or join mid-year')}
      <h4 class="pr-grp">Festival months (${S.fest.list.length} per year)</h4>${S.fest.list.map((f, i) => `<div class="fgrid" style="grid-template-columns:1fr 1fr">${field('Festival', inp(`stat.fest.list.${i}.name`))}${field('Paid in month (YYYY-MM)', inp(`stat.fest.list.${i}.month`))}</div>`).join('')}</div>`;
    else if (t === 'grat') body = `<div class="card pad">${tog('stat.grat.on', 'Gratuity')}<div class="fgrid" style="grid-template-columns:repeat(3,1fr)">${field('Minimum continuous service (years)', inp('stat.grat.minYears', { n: 1 }))}${field('Days of basic per completed year', inp('stat.grat.days', { n: 1 }))}${field('Basis', '<input class="inp" disabled value="Last drawn basic ÷ 30">')}</div><p class="cl-hint">${ic('alert', 14)} Paid only through Final Settlement. Rules must be confirmed against company policy and the Labour Act 2006.</p></div>`;
    else if (t === 'adv') body = `<div class="ct-row"><h3 class="ct">Advance / loan instalments ${tbc}</h3><button class="btn primary" data-act="pr-loan-new">${ic('plus', 15)}Add advance / loan</button></div>${tbl(['ID', 'Employee', 'Type', '>Total', '>Instalment', 'Starts', '>Balance', 'Status'], d.loans.map((l) => `<tr><td>${l.id}</td><td>${who(B.emp(l.emp).name)}</td><td>${esc(l.kind)}</td><td class="r">${M(l.total)}</td><td class="r">${M(l.inst)}</td><td>${mLab(l.start)}</td><td class="r">${M(loanLeft(l))}</td><td>${pill(loanLeft(l) > 0 ? 'Active' : 'Complete')}</td></tr>`))}<p class="cl-hint">Instalments are deducted automatically at step ② of the run until the balance is zero.</p>`;
    else if (t === 'asset') body = `<div class="ct-row"><h3 class="ct">Asset recovery ${tbc}</h3><button class="btn primary" data-act="pr-as-new">${ic('plus', 15)}Add recovery</button></div>${tbl(['ID', 'Employee', 'Asset / reason', '>Amount', 'Source', 'Status', ''], S.assets.map((a) => `<tr data-id="${a.id}"><td>${a.id}</td><td>${who(B.emp(a.emp).name)}</td><td>${esc(a.what)}</td><td class="r">${M(a.amount)}</td><td>${esc(a.src)}</td><td>${pill(a.applied ? 'Applied' : a.status)}</td><td class="r">${a.status === 'Pending HR' ? `<button class="btn sm primary" data-act="pr-as-ok">HR approve</button>` : ''}</td></tr>`))}<p class="cl-hint">Amounts arrive from the Exit module and need HR approval before they are deducted.</p>`;
    else body = `<div class="card pad">${tog('stat.ot.on', 'Overtime')}<div class="fgrid" style="grid-template-columns:repeat(3,1fr)">${field('Rate multiplier', inp('stat.ot.mult', { n: 1 }))}${field('Hourly divisor (monthly hours)', inp('stat.ot.divisor', { n: 1 }))}${field('Basis', '<input class="inp" disabled value="Basic">')}</div><p class="cl-hint">${ic('lock', 14)} Disabled by default. When enabled, approved overtime hours would be paid at ${S.ot.mult}× basic ÷ ${S.ot.divisor}.</p></div>`;
    return `${B.head('Statutory & Other Items', 'Income tax, provident fund, festival bonus, gratuity, advances, asset recovery and overtime — each configurable.', '', crumbs('Statutory Items'))}
      <div class="as-note pr-warn">${ic('alert', 14)} <b>Every rate and rule here is a placeholder.</b> Confirm against the Bangladesh Labour Act 2006, the current income tax rules and company policy before going live.</div>
      ${kp([Kp('percent', 'Income tax', S.tax.on ? 'On' : 'Off', S.tax.on ? 'ok' : ''), Kp('shield', 'Provident fund', S.pf.on ? S.pf.ee + '% + ' + S.pf.er + '%' : 'Off', S.pf.on ? 'ok' : ''), Kp('gift', 'Festival bonus', S.fest.on ? 'On' : 'Off'), Kp('award', 'Gratuity', S.grat.on ? 'On' : 'Off'), Kp('clock', 'Overtime', S.ot.on ? 'On' : 'Off (default)')])}
      <div style="margin:14px 0 12px">${tabs('stat', [['tax', 'Income tax'], ['pf', 'Provident fund'], ['fest', 'Festival bonus'], ['grat', 'Gratuity'], ['adv', 'Advance / loan'], ['asset', 'Asset recovery'], ['ot', 'Overtime']], t)}</div>${body}`;
  });
  B.act['pr-loan-new'] = () => B.modal({ title: 'Add advance / loan', body: grid(field('Employee', empSel('prm-e')) + field('Type', '<select class="inp" id="prm-t"><option>Salary advance</option><option>Personal loan</option></select>') + field('Total (৳)', '<input type="number" class="inp" id="prm-a" min="1">') + field('Instalment per month (৳)', '<input type="number" class="inp" id="prm-i" min="1">') + field('First deduction month', `<input type="month" class="inp" id="prm-m" value="${nextOpen()}">`)), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-loan-ok">Add</button>' });
  B.act['pr-loan-ok'] = () => { const a = +B.$('#prm-a').value, i = +B.$('#prm-i').value, m = B.$('#prm-m').value; if (!(a > 0) || !(i > 0) || !m) { B.toast('Total, instalment and start month are required', 'bad'); return; } if (i > a) { B.toast('Instalment cannot exceed the total', 'bad'); return; } D().loans.push({ id: nid('ln', 'LN-'), emp: B.$('#prm-e').value, kind: B.$('#prm-t').value, total: a, inst: i, start: m, paid: [] }); audit('Advance / loan added', '—', M(a), B.$('#prm-t').value); T.stat = 'adv'; done('Added'); };
  B.act['pr-as-new'] = () => B.modal({ title: 'Asset recovery', body: grid(field('Employee', empSel('prm-e')) + field('Amount (৳)', '<input type="number" class="inp" id="prm-a" min="1">')) + field('Asset / reason (required)', '<input class="inp" id="prm-r" placeholder="e.g. Laptop not returned">', true) + `<p class="cl-hint">${ic('lock', 14)} Source: Exit module. Needs HR approval before deduction.</p>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-as-ok2">Submit</button>' });
  B.act['pr-as-ok2'] = () => { const a = +B.$('#prm-a').value, r = B.$('#prm-r').value.trim(); if (!(a > 0) || !r) { B.toast('Amount and reason are required', 'bad'); return; } D().stat.assets.push({ id: nid('as', 'AR-'), emp: B.$('#prm-e').value, what: r, amount: a, src: 'Exit module', status: 'Pending HR', applied: '' }); T.stat = 'asset'; done('Sent for HR approval'); };
  B.act['pr-as-ok'] = (t) => { const a = D().stat.assets.find((x) => x.id === t.closest('[data-id]').dataset.id); a.status = 'Approved'; audit('Asset recovery approved', '—', M(a.amount), a.what, me().name); done('Approved — will be deducted in the next run'); };

  /* =====================================================================
     8. FINAL SETTLEMENT
     ===================================================================== */
  const FS = { sel: null };
  function calcSettle(s) {
    const e = B.emp(s.emp), mk = ym(s.lwd), S = D().stat, R = rulesFor(mk), r = calcEmp(e, mk, R, { lwd: s.lwd, settle: true }), mths = Math.max(0, monthsBetween(doj(e), s.lwd)), yrs = Math.floor(mths / 12), gdG = r.G / 30;
    const earn = [{ n: `Salary ${fmtS(ym(s.lwd) + '-01')} – ${fmtS(s.lwd)} (pro-rated)`, amt: r.gross, why: `Gross ${M(r.G)} × ${new Date(s.lwd + 'T00:00').getDate()}/${dim(mk)} days` }];
    if (s.allow > 0) earn.push({ n: 'Pending allowances', amt: s.allow, why: 'Entered by HR' });
    if (s.arrears > 0) earn.push({ n: 'Arrears', amt: s.arrears, why: 'Entered by HR' });
    r.add.forEach((x) => earn.push({ n: x.n, amt: x.amt, why: x.reason }));
    if (S.fest.on && S.fest.prorata) { const ok = mths >= S.fest.minService, per = S.fest.basis === 'basic' ? r.basic * S.fest.pct / 100 : S.fest.fixed, amt = ok ? Math.round(per * S.fest.list.length * (+s.lwd.slice(5, 7)) / 12) : 0; earn.push({ n: 'Festival bonus (pro-rata)', amt, why: ok ? `${S.fest.list.length} bonuses × ${M(per)} × ${+s.lwd.slice(5, 7)}/12 months` : `Minimum service ${S.fest.minService} months not met` }); }
    const eln = R.encashEarned ? Math.round(s.elBal * gdG) : 0; earn.push({ n: 'Earned leave encashment', amt: s.encash && R.encashEarned ? eln : 0, why: !R.encashEarned ? 'Not allowed by policy (to confirm). Casual / Sick leave are never encashed.' : s.encash ? `${s.elBal} day(s) × ${M(gdG)}` : 'Not selected' });
    if (S.pf.on && e.type === 'Full-time' && confirmedBy(e, s.lwd.slice(0, 7), S)) earn.push({ n: 'Provident fund balance', amt: Math.round(r.basic * Math.min(mths, 120) * (S.pf.ee + S.pf.er) / 100 / 1), why: `${Math.min(mths, 120)} months × (${S.pf.ee}% + ${S.pf.er}%) of basic (estimate)` });
    const gOk = S.grat.on && yrs >= S.grat.minYears; earn.push({ n: 'Gratuity', amt: gOk ? Math.round(r.basic * S.grat.days / 30 * yrs) : 0, why: gOk ? `${yrs} completed years × ${S.grat.days} days of basic` : S.grat.on ? `Service ${yrs} yr < minimum ${S.grat.minYears} yr` : 'Gratuity disabled' });
    const ded = r.ded.map((x) => ({ n: x.n, amt: x.amt, why: x.reason }));
    D().loans.filter((l) => l.emp === s.emp && loanLeft(l) > 0).forEach((l) => ded.push({ n: l.kind + ' balance', amt: loanLeft(l), why: `${l.id}: outstanding balance recovered in full` }));
    if (s.assetAmt > 0) ded.push({ n: 'Asset recovery', amt: s.assetAmt, why: 'Amount from Exit module (HR approved)' });
    if (s.noticeShort > 0) ded.push({ n: 'Notice-period shortfall', amt: Math.round(s.noticeShort * gdG), why: `${s.noticeShort} day(s) × ${M(gdG)} gross daily rate` });
    const gross = sum(earn, (x) => x.amt), tot = sum(ded, (x) => x.amt);
    return { earn, ded, gross, tot, net: gross - tot, svc: `${Math.floor(mths / 12)}y ${mths % 12}m` };
  }
  const fsGate = (s) => (s.clearance === 'Complete' ? '' : s.override ? '' : 'Clearance is not complete. A settlement can be prepared only after clearance, or with an HR override note.');
  page('final-settlement', () => {
    const d = D(), L = d.settle, s = L.find((x) => x.id === FS.sel) || null, ix = s ? L.indexOf(s) : -1;
    const list = tbl(['ID', 'Employee', 'Last working day', 'Clearance', 'Status', '>Net settlement', ''], L.map((x) => `<tr data-id="${x.id}" class="${x === s ? 'pr-selrow' : ''}"><td>${x.id}</td><td>${who(B.emp(x.emp).name)}</td><td>${fmt(x.lwd)}</td><td>${pill(x.clearance === 'Complete' ? 'Complete' : x.override ? 'Pending' : 'Pending')}${x.override ? '<em class="sub">HR override</em>' : ''}</td><td>${pill(x.status)}</td><td class="r">${M((x.calc || calcSettle(x)).net)}</td><td class="r"><button class="btn sm" data-act="pr-fs-open">Open</button></td></tr>`));
    let det = '';
    if (s) {
      const c = s.calc && s.status !== 'Draft' && s.status !== 'Prepared' ? s.calc : calcSettle(s), edit = s.status === 'Draft' || s.status === 'Prepared', P = `settle.${ix}`, R = rulesFor(ym(s.lwd));
      det = `<div class="card pad"><div class="ct-row"><h3 class="ct">${ic('user-minus', 17)} ${esc(B.emp(s.emp).name)} · ${s.id}</h3>${pill(s.status)}</div>
        <div class="fgrid" style="grid-template-columns:repeat(4,1fr)">${field('Last working day', edit ? inp(P + '.lwd', { type: 'date', r: 1 }) : `<input class="inp" disabled value="${fmt(s.lwd)}">`)}${field('Clearance status (Exit module)', edit ? sel(P + '.clearance', [['Pending', 'Pending'], ['Complete', 'Complete']], { r: 1 }) : `<input class="inp" disabled value="${s.clearance}">`)}${field('Asset recovery (৳, from Exit)', edit ? inp(P + '.assetAmt', { n: 1, r: 1 }) : `<input class="inp" disabled value="${s.assetAmt}">`)}${field('Notice shortfall (days)', edit ? inp(P + '.noticeShort', { n: 1, r: 1 }) : `<input class="inp" disabled value="${s.noticeShort}">`)}
        ${field('Pending allowances (৳)', edit ? inp(P + '.allow', { n: 1, r: 1 }) : `<input class="inp" disabled value="${s.allow}">`)}${field('Arrears (৳)', edit ? inp(P + '.arrears', { n: 1, r: 1 }) : `<input class="inp" disabled value="${s.arrears}">`)}${field('Earned leave balance (days)', edit ? inp(P + '.elBal', { n: 1, r: 1 }) : `<input class="inp" disabled value="${s.elBal}">`)}${field('Service', `<input class="inp" disabled value="${c.svc}">`)}</div>
        ${s.clearance !== 'Complete' && edit ? `<div class="as-note pr-warn">${ic('lock', 14)} ${fsGate(s) || 'HR override recorded: ' + esc(s.override)}<div style="margin-top:8px">${field('HR override note', `<input class="inp pr-in" value="${esc(s.override)}" data-chg="pr-set" data-p="${P}.override" data-r="1" placeholder="Why can this be prepared before clearance?">`, true)}</div></div>` : ''}
        ${edit ? `<div class="as-note">${chk(P + '.encash', 'Encash Earned leave', { r: 1 })} ${R.encashEarned ? '' : '<b>Blocked:</b> policy does not allow encashment (to confirm).'} Casual / Sick leave balances are never encashed.</div>` : ''}
        <div class="grid-2" style="margin-top:14px"><div><h4 class="pr-grp">Earnings</h4>${tbl(['Item', '>Amount', 'Basis'], c.earn.map((x) => `<tr><td>${esc(x.n)}</td><td class="r">${M(x.amt)}</td><td><em class="sub">${esc(x.why)}</em></td></tr>`).concat([`<tr><td><b>Total earnings</b></td><td class="r"><b>${M(c.gross)}</b></td><td></td></tr>`]))}</div>
        <div><h4 class="pr-grp">Deductions</h4>${tbl(['Item', '>Amount', 'Reason'], c.ded.map((x) => `<tr><td>${esc(x.n)}</td><td class="r">${M(x.amt)}</td><td><em class="sub">${esc(x.why)}</em></td></tr>`).concat([`<tr><td><b>Total deductions</b></td><td class="r"><b>${M(c.tot)}</b></td><td></td></tr>`]))}</div></div>
        <div class="pr-net">Net settlement <b>${M(c.net)}</b></div>${s.stages && s.stages.length ? stageTrk(s.stages) : ''}
        <div class="as-act">${s.status === 'Draft' ? `<button class="btn primary" data-act="pr-fs-prep">Prepare settlement</button>` : s.status === 'Prepared' ? `<button class="btn primary" data-act="pr-fs-sub">Submit: HR → Accounts</button>` : s.status === 'In approval' ? `<button class="btn primary" data-act="pr-fs-ok">Approve as ${esc(s.stages[stgNow(s.stages)].t)}</button><button class="btn" data-act="pr-fs-no">Reject</button>` : s.status === 'Approved' ? `<button class="btn primary" data-act="pr-fs-pay">${ic('card', 15)}Pay settlement</button>` : `<span>${pill('Paid')} ${fmt(s.paidAt)} · ${esc(s.ref)}</span>`}<button class="btn" data-act="pr-fs-view">${ic('print', 15)}Settlement statement</button></div></div>`;
    }
    return `${B.head('Final Settlement', 'Triggered by the Exit module. Prepared only after clearance; approval HR → Accounts.', `<button class="btn primary" data-act="pr-fs-new">${ic('plus', 16)}New settlement</button>`, crumbs('Final Settlement'))}
      ${kp([Kp('user-minus', 'Open settlements', L.filter((x) => x.status !== 'Paid').length), Kp('lock', 'Clearance pending', L.filter((x) => x.clearance !== 'Complete' && x.status !== 'Paid').length, 'warn'), Kp('clock', 'In approval', L.filter((x) => x.status === 'In approval').length), Kp('check-circle', 'Paid', L.filter((x) => x.status === 'Paid').length, 'ok')])}
      <div style="height:14px"></div>${list}<div style="height:16px"></div>${det}`;
  });
  B.act['pr-fs-open'] = (t) => { FS.sel = t.closest('[data-id]').dataset.id; rerender(); };
  const curFs = () => D().settle.find((x) => x.id === FS.sel);
  B.act['pr-fs-new'] = () => B.modal({ title: 'New final settlement', body: grid(field('Employee', `<select class="inp" id="prm-e">${emps().filter((e) => !D().settle.some((s) => s.emp === e.id && s.status !== 'Cancelled')).map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select>`) + field('Last working day', `<input type="date" class="inp" id="prm-d" value="${today()}">`) + field('Clearance status', '<select class="inp" id="prm-c"><option>Pending</option><option>Complete</option></select>') + field('Asset recovery (৳)', '<input type="number" class="inp" id="prm-a" value="0" min="0">')) + `<p class="cl-hint">${ic('alert', 14)} Normally created automatically when an exit is approved in the Exit module.</p>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-fs-new-ok">Create</button>' });
  B.act['pr-fs-new-ok'] = () => { const e = B.$('#prm-e').value, l = B.$('#prm-d').value; if (!e || !l) { B.toast('Choose an employee and last working day', 'bad'); return; } const s = { id: nid('fs', 'FS-'), emp: e, lwd: l, clearance: B.$('#prm-c').value, override: '', assetAmt: +B.$('#prm-a').value || 0, noticeShort: 0, allow: 0, arrears: 0, elBal: B.hash(e) % 12, encash: false, status: 'Draft', stages: [], created: today() }; D().settle.push(s); FS.sel = s.id; done('Settlement created'); };
  B.act['pr-fs-prep'] = () => { const s = curFs(), g = fsGate(s); if (g) { B.toast(g, 'bad'); return; } s.status = 'Prepared'; s.calc = calcSettle(s); audit('Settlement prepared', 'Draft', 'Prepared', s.clearance === 'Complete' ? 'Clearance complete' : 'HR override: ' + s.override); done('Settlement prepared'); };
  B.act['pr-fs-sub'] = () => { const s = curFs(); s.calc = calcSettle(s); s.stages = mkStg([['HR', 'Rahim Uddin'], ['Accounts', 'Accounts Manager']]); s.status = 'In approval'; done('Submitted: HR → Accounts'); };
  B.act['pr-fs-ok'] = () => { const s = curFs(), i = stgNow(s.stages); Object.assign(s.stages[i], { s: 'Approved', by: s.stages[i].who, at: today() }); if (stgNow(s.stages) < 0) { s.status = 'Approved'; audit('Settlement approved', 'In approval', 'Approved', s.id, 'Accounts Manager'); } done(s.status === 'Approved' ? 'Approved by HR and Accounts' : 'HR approved — Accounts next'); };
  B.act['pr-fs-no'] = () => { const s = curFs(); s.stages[stgNow(s.stages)].s = 'Rejected'; s.status = 'Prepared'; s.stages = []; done('Rejected — back to Prepared'); };
  B.act['pr-fs-pay'] = () => B.modal({ title: 'Pay settlement', body: grid(field('Payment date', `<input type="date" class="inp" id="prm-d" value="${today()}">`) + field('Reference (required)', '<input class="inp" id="prm-r">')), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="pr-fs-pay-ok">Mark paid</button>' });
  B.act['pr-fs-pay-ok'] = () => { const s = curFs(), r = B.$('#prm-r').value.trim(); if (!r) { B.toast('Payment reference is required', 'bad'); return; } s.status = 'Paid'; s.paidAt = B.$('#prm-d').value; s.ref = r; audit('Settlement paid', 'Approved', 'Paid', s.id + ' · ' + r); done('Settlement paid'); };
  const stmtHtml = (s) => { const c = s.calc || calcSettle(s), e = B.emp(s.emp); return `<div class="pr-slip"><div class="pr-sl-h"><div><b>Bijoy · Final Settlement Statement</b><em class="sub">${s.id} · ${pillTxt(s.status)}</em></div><div>${fmt(today())}</div></div>
    <dl class="kv as-kv"><div><dt>Employee</dt><dd>${esc(e.name)} (${esc(e.id)})</dd></div><div><dt>Designation</dt><dd>${esc(e.desig)} · ${esc(e.dept)}</dd></div><div><dt>Joined</dt><dd>${fmt(doj(e))}</dd></div><div><dt>Last working day</dt><dd>${fmt(s.lwd)} · service ${c.svc}</dd></div></dl>
    <div class="grid-2"><div><h4 class="pr-grp">Earnings</h4><table class="dt">${c.earn.map((x) => `<tr><td>${esc(x.n)}<em class="sub">${esc(x.why)}</em></td><td class="r">${M(x.amt)}</td></tr>`).join('')}<tr><td><b>Total</b></td><td class="r"><b>${M(c.gross)}</b></td></tr></table></div><div><h4 class="pr-grp">Deductions</h4><table class="dt">${c.ded.filter((x) => x.amt).map((x) => `<tr><td>${esc(x.n)}<em class="sub">${esc(x.why)}</em></td><td class="r">${M(x.amt)}</td></tr>`).join('') || '<tr><td class="as-none">None</td><td></td></tr>'}<tr><td><b>Total</b></td><td class="r"><b>${M(c.tot)}</b></td></tr></table></div></div>
    <div class="pr-net">Net settlement payable <b>${M(c.net)}</b></div><div class="pr-sign"><span>Employee</span><span>HR</span><span>Accounts</span></div></div>`; };
  const pillTxt = (s) => esc(s);
  B.act['pr-fs-view'] = () => B.modal({ title: 'Settlement statement', wide: true, body: stmtHtml(curFs()), foot: '<button class="btn" data-act="pr-print">Print</button><button class="btn primary" data-act="close-modal">Close</button>' });
  B.act['pr-fs-view2'] = (t) => { FS.sel = t.closest('[data-id]').dataset.id; B.modal({ title: 'Settlement statement', wide: true, body: stmtHtml(curFs()), foot: '<button class="btn" data-act="pr-print">Print</button><button class="btn primary" data-act="close-modal">Close</button>' }); };

  /* =====================================================================
     9. PAYROLL REPORTS
     ===================================================================== */
  const repOut = (name, head, rows, note) => { REP.csv = { name, head: head.map((h) => h.replace(/^>/, '')), rows }; return `<div class="filterbar" style="margin-bottom:12px"><span class="as-count" style="margin:0">${rows.length} rows</span><button class="btn sm" data-act="pr-rep-csv" style="margin-left:auto">${ic('download', 14)}Download CSV</button></div>${tbl(head, rows.map((r) => `<tr>${r.map((c, i) => `<td${head[i] && head[i][0] === '>' ? ' class="r"' : ''}>${c}</td>`).join('')}</tr>`))}${note ? `<p class="cl-hint">${note}</p>` : ''}`; };
  const repMonths = () => [-3, -2, -1, 0].map((n) => addM(curM(), n));
  page('payroll-reports', () => {
    const t = T.rep, mk = REP.mk || addM(curM(), -1), rows = rowsOf(mk), d = D(); let body = '';
    const tot = (a, f) => M(sum(a, f));
    if (t === 'sheet') {
      const grp = REP.grp === 'dept';
      if (!grp) body = repOut(`payroll-sheet-${mk}.csv`, ['Employee', 'Department', '>Basic', '>Gross', '>Leave', '>LWP', '>Late', '>Early', '>Manual', '>Statutory', '>Total deductions', '>Arrears/bonus', '>Net pay'], rows.map((r) => [esc(r.name), esc(r.dept), M(r.basic), M(r.gross), M(r.byCat.leave), M(r.byCat.absent), M(r.byCat.late), M(r.byCat.early), M(r.byCat.manual), M(r.byCat.stat), M(r.totalDed), M(r.totalAdd), '<b>' + M(r.net) + '</b>']).concat([['<b>Total</b>', '', tot(rows, (r) => r.basic), tot(rows, (r) => r.gross), tot(rows, (r) => r.byCat.leave), tot(rows, (r) => r.byCat.absent), tot(rows, (r) => r.byCat.late), tot(rows, (r) => r.byCat.early), tot(rows, (r) => r.byCat.manual), tot(rows, (r) => r.byCat.stat), tot(rows, (r) => r.totalDed), tot(rows, (r) => r.totalAdd), '<b>' + tot(rows, (r) => r.net) + '</b>']]));
      else { const g = {}; rows.forEach((r) => (g[r.dept] = g[r.dept] || []).push(r)); body = repOut(`payroll-by-department-${mk}.csv`, ['Department', '>Employees', '>Gross', '>Deductions', '>Arrears/bonus', '>Net pay'], Object.keys(g).sort().map((k) => [esc(k), String(g[k].length), tot(g[k], (r) => r.gross), tot(g[k], (r) => r.totalDed), tot(g[k], (r) => r.totalAdd), '<b>' + tot(g[k], (r) => r.net) + '</b>'])); }
    } else if (t === 'ded') {
      const ms = repMonths(), R = ms.map((m) => rowsOf(m));
      body = repOut('deduction-summary.csv', ['Deduction group'].concat(ms.map((m) => '>' + mLab(m))), CATS.map((c, i) => [c[1]].concat(R.map((r) => tot(r, (x) => x.byCat[c[0]])))).concat([['<b>Total deductions</b>'].concat(R.map((r) => '<b>' + tot(r, (x) => x.totalDed) + '</b>'))]), `Current month (${mLab(curM())}) is a live calculation until approved.`);
    } else if (t === 'bank') {
      const bs = d.batches.filter((b) => b.month === mk), items = bs.length ? bs.reduce((a, b) => a.concat(b.items.map((i) => Object.assign({ bid: b.id }, i))), []) : rows.map((r) => { const p = pmOf(r.emp); return { bid: '(not generated)', name: r.name, amt: r.net, method: p, ch: channel(p), status: 'Not paid' }; });
      body = repOut(`bank-advice-${mk}.csv`, ['Channel', 'Batch', 'Employee', 'Account / number', 'Routing', '>Amount', 'Status'], items.sort((a, b) => a.ch.localeCompare(b.ch)).map((i) => [esc(i.ch), esc(i.bid), esc(i.name), esc(i.method.acc || i.method.number || 'Cash'), esc(i.method.routing || ''), M(i.amt), esc(i.status)]), `Totals by channel: ${Object.entries(items.reduce((o, i) => ((o[i.ch] = (o[i.ch] || 0) + i.amt), o), {})).map(([k, v]) => esc(k) + ' ' + M(v)).join(' · ')}`);
    } else if (t === 'slips') body = repOut(`payslips-${mk}.csv`, ['Employee', 'Version', 'Status', 'Published', '>Net pay'], d.slips.filter((s) => s.month === mk).sort((a, b) => a.name.localeCompare(b.name) || a.v - b.v).map((s) => [esc(s.name), 'v' + s.v, esc(s.status), s.pub ? 'Yes' : 'No', M(s.snap.net)]));
    else if (t === 'taxpf') body = repOut(`tax-pf-${mk}.csv`, ['Employee', 'TIN', '>Gross', '>Income tax', '>PF employee', '>PF employer', '>PF total'], rows.map((r) => { const tx = sum(r.ded.filter((x) => /tax/i.test(x.n)), (x) => x.amt), pf = sum(r.ded.filter((x) => /Provident/.test(x.n)), (x) => x.amt); return [esc(r.name), esc(d.tin[r.emp] || '—'), M(r.gross), M(tx), M(pf), M(r.employer), M(pf + r.employer)]; }), 'Rates are placeholders to be confirmed against current tax rules and PF policy.');
    else if (t === 'corr') body = corrReport(mk);
    else if (t === 'fs') body = `${tbl(['ID', 'Employee', 'Last working day', '>Net settlement', 'Status', ''], d.settle.map((s) => `<tr data-id="${s.id}"><td>${s.id}</td><td>${who(B.emp(s.emp).name)}</td><td>${fmt(s.lwd)}</td><td class="r">${M((s.calc || calcSettle(s)).net)}</td><td>${pill(s.status)}</td><td class="r"><button class="btn sm" data-act="pr-fs-view2">Statement</button></td></tr>`))}`;
    else body = repOut('salary-revision-history.csv', ['ID', 'Employee', 'Type', 'Effective', '>Old', '>New', 'Status', 'Approved by'], d.revs.slice().sort((a, b) => b.eff.localeCompare(a.eff)).map((r) => [r.id, esc(B.emp(r.emp).name), esc(r.type), fmt(r.eff), M(r.old), M(r.new), esc(r.status), esc(r.stages.filter((s) => s.s === 'Approved').map((s) => s.by).join(' → ') || '—')]));
    const showMonth = !['fs', 'revs'].includes(t);
    return `${B.head('Payroll Reports', 'Monthly sheet, deductions, bank advice, payslips, tax & PF, corrections, final settlement and revision history.', '', crumbs('Reports'))}
      ${kp([Kp('users', 'Employees (' + mShort(mk) + ')', rows.length), Kp('dollar', 'Gross', M(sum(rows, (r) => r.gross))), Kp('percent', 'Deductions', M(sum(rows, (r) => r.totalDed)), 'warn'), Kp('card', 'Net', M(sum(rows, (r) => r.net)), 'ok')])}
      <div class="filterbar" style="margin:14px 0 8px">${showMonth ? monthSel('pr-rm', mk, 'pr-repmonth') : ''}${t === 'sheet' ? `<div class="seg sm"><button class="${REP.grp === 'emp' ? 'on' : ''}" data-act="pr-repgrp" data-g="emp">By employee</button><button class="${REP.grp === 'dept' ? 'on' : ''}" data-act="pr-repgrp" data-g="dept">By department</button></div>` : ''}</div>
      <div style="margin-bottom:12px">${tabs('rep', [['sheet', 'Monthly payroll sheet'], ['ded', 'Deduction summary'], ['bank', 'Bank advice'], ['slips', 'Payslips'], ['taxpf', 'Tax & PF'], ['corr', 'Corrections & arrears'], ['fs', 'Final settlement'], ['revs', 'Salary revisions']], t)}</div>${body}`;
  });
  B.act['pr-repgrp'] = (t) => { REP.grp = t.dataset.g; rerender(); };

  /* =====================================================================
     REGISTRATION
     ===================================================================== */
  const REG = { 'payroll-rules': ['Payroll Policy', 'settings'], 'payroll-run': ['Monthly Payroll Run', 'dollar'], 'payroll-payment': ['Payroll Payment', 'card'], 'payslips-v': ['Payslips', 'file'], 'payroll-corrections': ['Payroll Corrections', 'edit'], 'salary-profiles': ['Salary Profiles', 'layers'], 'statutory-items': ['Statutory & Other', 'percent'], 'final-settlement': ['Final Settlement', 'user-minus'], 'payroll-reports': ['Payroll Reports', 'bars'] };
  Object.keys(REG).forEach((k) => { B.PAGES[k] = { label: REG[k][0], icon: REG[k][1] }; });
  const mod = (B.NAV || []).find((m) => m.id === 'payroll'); if (mod) Object.keys(REG).forEach((k) => { if (mod.items.indexOf('p:' + k) < 0) mod.items.push('p:' + k); });
})();
