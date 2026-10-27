/* Bijoy HRMS — Loan & Advance management (design: mock data, actions show dialogs/toasts) */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const K = (i, t, v, tn) => B.kpi(i, t, v, null, null, tn);
  const kp = (arr) => `<section class="kpis sm lv-stats" style="grid-template-columns:repeat(${arr.length},minmax(0,1fr))">${arr.join('')}</section>`;
  const who = (n) => `<span class="as-who">${B.avatar(n, 26)}<span>${esc(n)}</span></span>`;
  const tabs = (list, cur, act) => `<div class="seg sm as-tabs">${list.map((t) => `<button class="${t[0] === cur ? 'on' : ''}" data-act="${act}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>`;
  const rid = (t) => t.closest('[data-id]').dataset.id;
  const PG = {}; let cur = '', S = { loan: 'loans', disc: 'cases', mine: 'grv' };
  const rerender = () => { const v = B.$('#view .fade'); if (v && PG[cur]) v.innerHTML = PG[cur](); };
  const page = (n, fn) => { PG[n] = fn; B.page[n] = () => { cur = n; return fn(); }; };
  const crumb = (m, l) => [{ label: 'HR', href: '#/' }, { label: m }, { label: l }];
  const done = (t) => { B.closeModal(); B.toast(t.dataset.msg); };
  B.act['l8-done'] = done;
  const field = (l, c, full) => `<div class="fld" ${full ? 'style="grid-column:1/-1"' : ''}><label>${l}</label>${c}</div>`;
  const grid = (c) => `<div class="fgrid" style="grid-template-columns:1fr 1fr">${c}</div>`;
  const empSel = (id) => `<select class="inp" ${id ? `id="${id}"` : ''}>${B.EMPLOYEES.filter((e) => e.status !== 'Left').map((e) => `<option>${esc(e.name)}</option>`).join('')}</select>`;

  /* ======================= LOANS & ADVANCES ======================= */
  const TYPES = { 'Salary Advance Loan': [0, 100000, 6], 'Personal Loan': [8, 500000, 36], 'Emergency Loan': [0, 50000, 12] };
  const emi = (p, rate, n) => { if (!p || !n) return 0; const r = rate / 1200; return Math.round(r ? (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : p / n); };
  // [id, employee, type, amount, months, paid months, status]
  const LOANS = [
    ['LN-0007', 'Tasnim Rahman', 'Personal Loan', 120000, 12, 5, 'Disbursed'], ['LN-0006', 'Imran Hossain', 'Salary Advance Loan', 60000, 6, 4, 'Disbursed'],
    ['LN-0005', 'Sadia Islam', 'Emergency Loan', 40000, 10, 2, 'Disbursed'], ['LN-0004', 'Nazmul Haque', 'Personal Loan', 250000, 24, 24, 'Closed']
  ];
  // [id, employee, type, amount, months, date, reason]
  const APPS = [
    ['LA-0031', 'Tasnim Rahman', 'Emergency Loan', 30000, 6, '04 Oct', 'Medical expenses for a family member'], ['LA-0032', 'Mitu Rahman', 'Personal Loan', 150000, 18, '03 Oct', 'Home renovation'],
    ['LA-0033', 'Arif Chowdhury', 'Salary Advance Loan', 50000, 5, '02 Oct', 'School admission fees']
  ];
  const ADV = [['ADV-0002', 'Tasnim Rahman', 'Client visit', 5000, 'Open'], ['ADV-0003', 'Kamrul Hasan', 'Training', 12000, 'Open'], ['ADV-0001', 'Tasnim Rahman', 'Travel', 8000, 'Settled'], ['ADV-0004', 'Rahim Uddin', 'Office purchase', 20000, 'Open']];
  const rate = (t) => TYPES[t][0];
  const schedule = (l) => { const p = l[3], r = rate(l[2]) / 1200, e = emi(p, rate(l[2]), l[4]); let bal = p; const rows = []; const d = new Date(2026, 4, 1); for (let i = 1; i <= l[4]; i++) { const int = Math.round(bal * r), pr = i === l[4] ? bal : e - int; bal -= pr; const m = new Date(d.getFullYear(), d.getMonth() + i - 1, 1); rows.push([i, m.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }), e, pr, int, Math.max(0, bal), i <= l[5] ? 'Paid' : i === l[5] + 1 ? 'Due' : 'Upcoming']); } return rows; };
  const lpill = (s) => B.pill(s, { Disbursed: 'info', Closed: 'ok', Pending: 'warn', Approved: 'ok', Rejected: 'bad', Paid: 'ok', Due: 'warn', Upcoming: 'mute', Open: 'warn', Settled: 'ok' }[s]);
  const loanRow = (l) => `<tr data-id="${l[0]}"><td>${who(l[1])}</td><td><b>${l[0]}</b><em class="sub">${l[2]}</em></td><td class="r">${B.money(l[3])}</td><td class="r">${B.money(emi(l[3], rate(l[2]), l[4]))}</td><td style="min-width:130px">${B.prog(Math.round((l[5] / l[4]) * 100), l[5] + '/' + l[4])}</td><td>${lpill(l[6])}</td><td class="r"><button class="btn sm" data-act="ln-sched">Schedule</button></td></tr>`;

  page('loan-dash', () => {
    const out = LOANS.filter((l) => l[6] === 'Disbursed').reduce((s, l) => s + l[3] - schedule(l).filter((r) => r[6] === 'Paid').reduce((a, r) => a + r[3], 0), 0);
    const body = S.loan === 'apps' ? `<div class="cl-queue">${APPS.map((a) => `<div class="card pad cl-q" data-id="${a[0]}"><div class="cl-q-h">${B.avatar(a[1], 40)}<div><b>${esc(a[1])}</b><span>${a[2]} · ${a[0]} · ${a[5]}</span></div><strong>${B.money(a[3])}</strong></div><dl class="kv" style="margin-top:12px"><div><dt>Tenure</dt><dd>${a[4]} months</dd></div><div><dt>Monthly EMI</dt><dd>${B.money(emi(a[3], rate(a[2]), a[4]))}</dd></div><div><dt>Purpose</dt><dd>${esc(a[6])}</dd></div></dl><div class="as-act"><button class="btn sm" data-act="ln-review">Review</button><span class="grow"></span><button class="btn sm" data-act="ln-reject">${ic('x', 14)}Reject</button><button class="btn sm primary" data-act="ln-review">${ic('check', 14)}Approve</button></div></div>`).join('')}</div>`
      : S.loan === 'adv' ? `<div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Employee</th><th>Advance</th><th class="r">Amount</th><th>Status</th><th class="r"></th></tr></thead><tbody>${ADV.map((a) => `<tr data-id="${a[0]}"><td>${who(a[1])}</td><td><b>${a[0]}</b><em class="sub">${a[2]}</em></td><td class="r">${B.money(a[3])}</td><td>${lpill(a[4])}</td><td class="r">${a[4] === 'Open' ? '<button class="btn sm" data-act="l8-done" data-msg="Reminder sent">Remind</button> <button class="btn sm" data-act="l8-done" data-msg="Marked as settled">Settle</button>' : ''}</td></tr>`).join('')}</tbody></table></div></div>`
      : S.loan === 'policy' ? `<div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Loan type</th><th class="r">Interest</th><th class="r">Max amount</th><th class="r">Max tenure</th><th>Eligibility</th></tr></thead><tbody>${Object.keys(TYPES).map((t) => `<tr><td><b>${t}</b></td><td class="r">${TYPES[t][0]}% p.a.</td><td class="r">${B.money(TYPES[t][1])}</td><td class="r">${TYPES[t][2]} months</td><td>${t.startsWith('Salary') ? 'Confirmed employees' : 'Min. 1 year of service'} · EMI ≤ 40% of net pay</td></tr>`).join('')}</tbody></table></div></div>`
      : `<div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Employee</th><th>Loan</th><th class="r">Amount</th><th class="r">EMI</th><th>Repaid</th><th>Status</th><th class="r"></th></tr></thead><tbody>${LOANS.map(loanRow).join('')}</tbody></table></div></div>`;
    return `${B.head('Loan & Advance Management', 'Review applications, track repayments deducted from payroll, and manage advances.', `<button class="btn" data-act="l8-done" data-msg="Exported to CSV">${ic('download', 15)}Export</button><button class="btn primary" data-act="ln-new" data-admin="1">${ic('plus', 16)}New Loan</button>`, crumb('Loans', 'Loan Management'))}
      ${kp([K('moneyloan', 'Outstanding', B.money(out)), K('inbox', 'Applications pending', APPS.length, 'warn'), K('dollar', 'Disbursed this month', B.money(120000)), K('clock', 'EMI this month', B.money(LOANS.filter((l) => l[6] === 'Disbursed').reduce((s, l) => s + emi(l[3], rate(l[2]), l[4]), 0)), 'ok'), K('alert', 'Open advances', ADV.filter((a) => a[4] === 'Open').length, 'warn')])}
      <div class="filterbar">${tabs([['loans', 'Active loans'], ['apps', 'Applications (' + APPS.length + ')'], ['adv', 'Advances'], ['policy', 'Loan policy']], S.loan, 'ln-tab')}</div>${body}`;
  });
  B.act['ln-tab'] = (t) => { S.loan = t.dataset.t; rerender(); };
  B.act['ln-sched'] = (t) => {
    const l = LOANS.find((x) => x[0] === rid(t)), r = schedule(l);
    B.modal({ title: `${l[0]} · repayment schedule`, wide: true, body: `<div class="cl-meta">${who(l[1])}${lpill(l[6])}<span>${l[2]} · ${B.money(l[3])} · ${l[4]} months @ ${rate(l[2])}%</span></div><div class="tscroll" style="max-height:340px;overflow:auto"><table class="dt"><thead><tr><th>#</th><th>Month</th><th class="r">EMI</th><th class="r">Principal</th><th class="r">Interest</th><th class="r">Balance</th><th>Status</th></tr></thead><tbody>${r.map((x) => `<tr><td>${x[0]}</td><td>${x[1]}</td><td class="r">${B.money(x[2])}</td><td class="r">${B.money(x[3])}</td><td class="r">${B.money(x[4])}</td><td class="r">${B.money(x[5])}</td><td>${lpill(x[6])}</td></tr>`).join('')}</tbody></table></div>`, foot: `<button class="btn" data-act="l8-done" data-msg="Statement downloaded">${ic('download', 15)}Statement</button><button class="btn primary" data-act="close-modal">Close</button>` });
  };
  B.act['ln-review'] = (t) => {
    const a = APPS.find((x) => x[0] === rid(t)), e = B.EMPLOYEES.find((x) => x.name === a[1]) || { salary: 60000 }, net = Math.round(e.salary * 0.86), em = emi(a[3], rate(a[2]), a[4]), ex = a[1] === 'Tasnim Rahman' ? 10500 : 0, ratio = Math.round(((em + ex) / net) * 100);
    B.modal({ title: 'Review ' + a[0], wide: true, body: `<div class="cl-meta">${who(a[1])}${lpill('Pending')}<span>${a[2]} · applied ${a[5]}</span></div>
      <dl class="kv as-kv"><div><dt>Requested</dt><dd>${B.money(a[3])} over ${a[4]} months</dd></div><div><dt>Monthly EMI</dt><dd>${B.money(em)}</dd></div><div><dt>Net monthly pay</dt><dd>${B.money(net)}</dd></div><div><dt>Existing EMI</dt><dd>${ex ? B.money(ex) : 'None'}</dd></div><div><dt>Total EMI / net pay</dt><dd>${ratio}% <span class="pill ${ratio <= 40 ? 'ok' : 'bad'}"><i></i>${ratio <= 40 ? 'Within 40% limit' : 'Above 40% limit'}</span></dd></div><div><dt>Max for this type</dt><dd>${B.money(TYPES[a[2]][1])}</dd></div></dl><p class="as-note">${esc(a[6])}</p>
      ${grid(field('Sanctioned amount (৳)', `<input type="number" class="inp" value="${a[3]}">`) + field('Tenure (months)', `<input type="number" class="inp" value="${a[4]}">`) + field('Comment', '<textarea class="inp" rows="2"></textarea>', 1))}`, foot: `<button class="btn" data-act="ln-reject" data-id="${a[0]}">Reject</button><button class="btn primary" data-act="l8-done" data-msg="Loan approved. Disbursement queued">Approve & disburse</button>` });
  };
  B.act['ln-reject'] = (t) => { const id = (t.closest('[data-id]') || t).dataset.id; B.modal({ title: 'Reject ' + id, body: field('Reason (visible to the employee)', '<textarea class="inp" rows="3"></textarea>'), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="l8-done" data-msg="Application rejected">Reject</button>' }); };

  const applyForm = (adm) => `${adm ? field('Employee', empSel(), 1) : ''}${grid(field('Loan type', `<select class="inp" id="lnm-t" data-chg="lncalc">${Object.keys(TYPES).map((t) => `<option>${t}</option>`).join('')}</select>`) + field('Amount (৳)', '<input type="number" class="inp" id="lnm-a" data-inp="lncalc" value="50000">') + field('Tenure (months)', '<input type="number" class="inp" id="lnm-n" data-inp="lncalc" value="6" min="1">') + field('Guarantor', empSel()) + field('Reason', '<textarea class="inp" rows="2" placeholder="Why do you need this loan?"></textarea>', 1))}
    <div class="cl-net" id="lnm-p"></div><p class="cl-hint">${ic('alert', 14)} EMI is deducted from your monthly salary. Total EMI must stay within 40% of net pay.</p>`;
  const calc = () => { const t = B.$('#lnm-t'); if (!t) return; const [r, mx, mt] = TYPES[t.value], a = +B.$('#lnm-a').value || 0, n = +B.$('#lnm-n').value || 0, e = emi(a, r, n), bad = a > mx || n > mt; B.$('#lnm-p').innerHTML = `<span>Interest rate</span><b>${r}% p.a.</b><span>Monthly EMI</span><b>${B.money(e)}</b><span>Total payable</span><b>${B.money(e * n)}</b>${bad ? `<span style="color:var(--bad);grid-column:1/-1">Limit for this type: ${B.money(mx)} over ${mt} months</span>` : ''}`; };
  B.inp.lncalc = calc; B.chg.lncalc = calc;
  B.act['ln-new'] = (t) => { B.modal({ title: t.dataset.admin ? 'New Loan' : 'Apply for a Loan', wide: true, body: applyForm(t.dataset.admin), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="l8-done" data-msg="${t.dataset.admin ? 'Loan created' : 'Application sent for approval'}">${t.dataset.admin ? 'Create' : 'Submit application'}</button>` }); calc(); };
  B.act['ln-adv'] = () => B.modal({ title: 'Request an Advance', body: grid(field('Purpose', `<select class="inp">${['Travel', 'Medical', 'Relocation', 'Training', 'Office Purchase'].map((x) => `<option>${x}</option>`).join('')}</select>`) + field('Amount (৳)', '<input type="number" class="inp" value="10000">') + field('Needed by', '<input type="date" class="inp">') + field('Settle against', '<select class="inp"><option>Expense claim</option><option>Salary deduction</option></select>') + field('Reason', '<textarea class="inp" rows="2"></textarea>', 1)), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="l8-done" data-msg="Advance request sent">Submit</button>' });

  page('my-loans', () => {
    const l = LOANS[0], r = schedule(l), paid = r.filter((x) => x[6] === 'Paid'), bal = r[l[5] - 1][5], mine = APPS.filter((a) => a[1] === 'Tasnim Rahman');
    return `${B.head('My Loans & Advances', 'Your loans, repayment schedule and advances.', `<button class="btn" data-act="ln-adv">${ic('moneyloan', 15)}Request Advance</button><button class="btn primary" data-act="ln-new">${ic('plus', 16)}Apply for Loan</button>`, crumb('Pay & Claims', 'My Loans'))}
      ${kp([K('moneyloan', 'Outstanding', B.money(bal)), K('card', 'Monthly EMI', B.money(emi(l[3], 8, 12))), K('calendar', 'Next deduction', '31 Oct'), K('check-circle', 'Eligible for', B.money(150000), 'ok')])}
      <div class="card pad"><div class="as-top"><span class="as-ic">${ic('dollar', 20)}</span><div><b>${l[2]} · ${l[0]}</b><span>${B.money(l[3])} · ${l[4]} months @ ${rate(l[2])}%</span></div>${lpill('Disbursed')}</div>${B.prog(Math.round((l[5] / l[4]) * 100), `${l[5]} of ${l[4]} EMIs paid`)}
        <dl class="kv" style="margin-top:12px"><div><dt>Paid so far</dt><dd>${B.money(paid.reduce((s, x) => s + x[2], 0))}</dd></div><div><dt>Remaining</dt><dd>${B.money(bal)}</dd></div><div><dt>Last repayment</dt><dd>30 Sep · salary deduction</dd></div></dl><div class="as-act"><button class="btn sm" data-id="${l[0]}" data-act="ln-sched">View schedule</button><button class="btn sm" data-act="l8-done" data-msg="Foreclosure request sent to HR">Request early closure</button></div></div>
      <div class="cl-adv" style="margin-top:16px"><span class="as-ic sm">${ic('moneyloan', 16)}</span><div><b>Open advance · ৳ 5,000</b><span>ADV-0002 · Client visit. Settle it against your next expense claim.</span></div></div>
      <h3 class="ct" style="margin:20px 0 10px">My applications</h3><div class="card table-card"><div class="tscroll"><table class="dt"><tbody>${mine.map((a) => `<tr><td><b>${a[2]}</b><em class="sub">${a[0]} · ${a[5]}</em></td><td class="r">${B.money(a[3])}</td><td>${a[4]} months</td><td>${lpill('Pending')}</td><td class="r"><button class="btn sm" data-act="l8-done" data-msg="Application withdrawn">Withdraw</button></td></tr>`).join('')}</tbody></table></div></div>`;
  });

})();
