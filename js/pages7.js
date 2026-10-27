/* Bijoy HRMS — Expense claims (design only: static mock data, actions show toasts) */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const ST = { Draft: 'mute', 'Pending Supervisor': 'warn', 'Pending Finance': 'warn', Approved: 'info', Paid: 'ok', Rejected: 'bad' };
  const CATS = ['Travel', 'Food', 'Accommodation', 'Fuel', 'Communication', 'Medical', 'Others'];
  const LIMIT = { Travel: 10000, Food: 1500, Accommodation: 8000, Fuel: 5000, Communication: 2000, Medical: 15000, Others: 3000 };
  const STEPS = ['Submitted', 'Supervisor', 'Finance', 'Paid'];
  // [id, employee, title, date, lines[[cat, desc, amount, receipt]], status, sanctioned]
  const C = [
    ['EXP-0042', 'Tasnim Rahman', 'Client visit · Chattogram', '28 Sep', [['Travel', 'Dhaka–Chattogram bus', 1800, 'ticket.pdf'], ['Accommodation', 'Hotel, 1 night', 5200, 'hotel-bill.pdf'], ['Food', 'Client lunch', 2100, 'lunch.jpg']], 'Paid', 8800],
    ['EXP-0045', 'Tasnim Rahman', 'Team lunch', '01 Oct', [['Food', 'Lunch for 6 people', 2400, 'receipt.jpg']], 'Pending Supervisor', 0],
    ['EXP-0047', 'Tasnim Rahman', 'Internet bill · September', '02 Oct', [['Communication', 'Broadband bill', 1500, 'bill.pdf']], 'Approved', 1500],
    ['EXP-0048', 'Tasnim Rahman', 'Software subscription', '29 Sep', [['Others', 'Design tool, monthly', 4500, 'invoice.pdf']], 'Rejected', 0],
    ['EXP-0050', 'Tasnim Rahman', 'Taxi fares', '03 Oct', [['Travel', 'Office to client site', 900, '']], 'Draft', 0]
  ];
  const TEAM = [
    ['EXP-0051', 'Kamrul Hasan', 'Site visit fuel', '03 Oct', [['Fuel', 'Petrol, company bike', 3200, 'fuel.jpg']], 'Pending Supervisor', 0],
    ['EXP-0052', 'Maliha Chowdhury', 'Training course fee', '03 Oct', [['Others', 'Online course', 2800, 'invoice.pdf']], 'Pending Supervisor', 0],
    ['EXP-0053', 'Towhid Hasan', 'Medical check-up', '02 Oct', [['Medical', 'Annual health check', 5000, 'report.pdf']], 'Pending Supervisor', 0],
    ['EXP-0049', 'Kamrul Hasan', 'Mobile recharge', '30 Sep', [['Communication', 'Monthly recharge', 800, 'sms.png']], 'Pending Finance', 800]
  ];
  const ALL = C.concat(TEAM, [
    ['EXP-0054', 'Rahim Uddin', 'Board meeting catering', '04 Oct', [['Food', 'Catering for 12', 9500, 'invoice.pdf']], 'Pending Finance', 0],
    ['EXP-0044', 'Tanvir Ahmed', 'Conference travel', '27 Sep', [['Travel', 'Flight, Dhaka–Cox’s Bazar', 18500, 'eticket.pdf']], 'Approved', 18500],
    ['EXP-0043', 'Mahmud Hasan', 'Hotel · Dhaka', '26 Sep', [['Accommodation', 'Two nights', 7000, 'bill.pdf']], 'Paid', 7000],
    ['EXP-0046', 'Imran Hossain', 'Client dinner', '01 Oct', [['Food', 'Dinner with client', 4200, 'bill.jpg']], 'Pending Supervisor', 0]
  ]);
  const total = (c) => c[4].reduce((s, l) => s + l[2], 0);
  const over = (c) => c[4].some((l) => l[2] > LIMIT[l[0]]);
  const pill = (s) => B.pill(s, ST[s]);
  const K = (i, t, v, tn) => B.kpi(i, t, v, null, null, tn);
  const stage = (s) => (s === 'Rejected' ? -1 : s === 'Draft' ? -2 : { 'Pending Supervisor': 1, 'Pending Finance': 2, Approved: 2, Paid: 3 }[s]);
  const find = (id) => ALL.find((c) => c[0] === id);
  const who = (n) => `<span class="as-who">${B.avatar(n, 26)}<span>${esc(n)}</span></span>`;
  const flag = (c) => (over(c) ? ' <span class="pill bad"><i></i>Over policy</span>' : '');

  const tracker = (c) => { const s = stage(c[5]); return `<ol class="cl-trk">${STEPS.map((x, i) => `<li class="${s >= 0 && i < s ? 'done' : ''} ${s === i ? 'now' : ''} ${s === -1 && i === 1 ? 'bad' : ''}"><i>${s >= 0 && i < s ? ic('check', 12) : i + 1}</i><span>${x}</span></li>`).join('')}</ol>`; };

  /* ---------- My claims (employee, and admin as employee) ---------- */
  B.page['my-claims'] = () => {
    const l = C, sum = (f) => B.money(l.filter(f).reduce((s, c) => s + total(c), 0));
    return `${B.head('My Expense Claims', 'Submit expenses and follow them through approval and payment.', `<button class="btn primary" data-act="cl-new">${ic('plus', 16)}New Claim</button>`, [{ label: 'HR', href: '#/' }, { label: 'Expenses & Travel' }, { label: 'My Claims' }])}
      <section class="kpis sm lv-stats" style="grid-template-columns:repeat(4,minmax(0,1fr))">${K('card', 'Total claimed', B.money(l.reduce((s, c) => s + total(c), 0)))}${K('clock', 'Pending approval', sum((c) => /Pending/.test(c[5])), 'warn')}${K('check-circle', 'Paid', sum((c) => c[5] === 'Paid'), 'ok')}${K('alert', 'Rejected', sum((c) => c[5] === 'Rejected'), 'bad')}</section>
      <div class="card pad cl-adv"><span class="as-ic sm">${ic('moneyloan', 16)}</span><div><b>Open advance · ৳ 5,000</b><span>ADV-0002 · Client visit. Link it to a claim and it is settled automatically on payment.</span></div></div>
      <div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Claim</th><th>Date</th><th class="r">Claimed</th><th class="r">Sanctioned</th><th>Status</th><th class="r"></th></tr></thead><tbody>${l.map((c) => `<tr data-id="${c[0]}"><td><b>${esc(c[2])}</b>${flag(c)}<em class="sub">${c[0]} · ${c[4].length} item${c[4].length > 1 ? 's' : ''}</em></td><td>${c[3]}</td><td class="r">${B.money(total(c))}</td><td class="r">${c[6] ? B.money(c[6]) : '—'}</td><td>${pill(c[5])}</td><td class="r"><button class="btn sm" data-act="cl-view">View</button></td></tr>`).join('')}</tbody></table></div></div>`;
  };

  /* ---------- Team approvals (employee acting as supervisor) ---------- */
  B.page['team-claims'] = () => `${B.head('Team Claim Approvals', 'Expense claims from your direct reports waiting for your approval.', '', [{ label: 'HR', href: '#/' }, { label: 'Expenses & Travel' }, { label: 'Team Approvals' }])}
    <section class="kpis sm lv-stats" style="grid-template-columns:repeat(3,minmax(0,1fr))">${K('inbox', 'Waiting for me', 3, 'warn')}${K('dollar', 'Amount pending', B.money(11000))}${K('check-circle', 'Approved this month', 6, 'ok')}</section>
    <div class="cl-queue">${TEAM.filter((c) => c[5] === 'Pending Supervisor').map((c) => `<div class="card pad cl-q" data-id="${c[0]}"><div class="cl-q-h">${B.avatar(c[1], 40)}<div><b>${esc(c[1])}</b><span>${esc(c[2])} · ${c[0]} · ${c[3]}</span></div><strong>${B.money(total(c))}</strong></div>
      <ul class="cl-lines">${c[4].map((l) => `<li><span class="chip">${l[0]}</span><span>${esc(l[1])}</span><em>${l[3] ? ic('paperclip', 13) + esc(l[3]) : 'No receipt'}</em><b class="${l[2] > LIMIT[l[0]] ? 'over' : ''}">${B.money(l[2])}</b></li>`).join('')}</ul>${over(c) ? `<div class="as-issue">${ic('alert', 15)}<span>Above the policy limit for this category.</span></div>` : ''}
      <div class="as-act"><button class="btn sm" data-act="cl-view">Details</button><span class="grow"></span><button class="btn sm" data-act="cl-reject">${ic('x', 14)}Reject</button><button class="btn sm primary" data-act="cl-approve">${ic('check', 14)}Approve</button></div></div>`).join('')}</div>
    <h3 class="ct" style="margin:22px 0 10px">Recently decided by me</h3>
    <div class="card table-card"><div class="tscroll"><table class="dt"><tbody>${TEAM.filter((c) => c[5] === 'Pending Finance').map((c) => `<tr data-id="${c[0]}"><td>${who(c[1])}</td><td><b>${esc(c[2])}</b><em class="sub">${c[0]}</em></td><td class="r">${B.money(total(c))}</td><td>${pill('Approved by me')}</td><td class="r"><button class="btn sm" data-act="cl-view">View</button></td></tr>`).join('')}</tbody></table></div></div>`;

  /* ---------- Expense dashboard (admin / finance) ---------- */
  B.page['expense-dash'] = () => {
    const cat = CATS.map((k) => [k, ALL.reduce((s, c) => s + c[4].filter((l) => l[0] === k).reduce((a, l) => a + l[2], 0), 0)]), max = Math.max(...cat.map((x) => x[1]));
    return `${B.head('Expense Management', 'Claims across the company: approve, pay and keep an eye on spend.', `<button class="btn" data-act="toast" data-msg="Exported to CSV">${ic('download', 15)}Export</button>`, [{ label: 'HR', href: '#/' }, { label: 'Expenses & Travel' }, { label: 'Expense Management' }])}
      <section class="kpis sm lv-stats" style="grid-template-columns:repeat(5,minmax(0,1fr))">${K('card', 'Total claimed', B.money(ALL.reduce((s, c) => s + total(c), 0)))}${K('user-check', 'With supervisors', ALL.filter((c) => c[5] === 'Pending Supervisor').length, 'warn')}${K('clock', 'Awaiting finance', ALL.filter((c) => c[5] === 'Pending Finance').length, 'warn')}${K('dollar', 'Approved, unpaid', B.money(ALL.filter((c) => c[5] === 'Approved').reduce((s, c) => s + c[6], 0)))}${K('check-circle', 'Paid this month', B.money(ALL.filter((c) => c[5] === 'Paid').reduce((s, c) => s + c[6], 0)), 'ok')}</section>
      <section><div class="card table-card"><div class="card-h"><h3 class="ct">All claims</h3><select class="inp sm" aria-label="Status"><option>Status: All</option>${Object.keys(ST).map((s) => `<option>${s}</option>`).join('')}</select></div><div class="tscroll"><table class="dt"><thead><tr><th>Employee</th><th>Claim</th><th class="r">Amount</th><th>Stage</th><th class="r"></th></tr></thead><tbody>${ALL.filter((c) => c[5] !== 'Draft').map((c) => `<tr data-id="${c[0]}"><td>${who(c[1])}</td><td><b>${esc(c[2])}</b>${flag(c)}<em class="sub">${c[0]} · ${c[3]}</em></td><td class="r">${B.money(total(c))}</td><td>${pill(c[5])}</td><td class="r"><button class="btn sm ${c[5] === 'Pending Finance' || c[5] === 'Approved' ? 'primary' : ''}" data-act="cl-view">${c[5] === 'Pending Finance' ? 'Review' : c[5] === 'Approved' ? 'Pay' : 'View'}</button></td></tr>`).join('')}</tbody></table></div></div></section>
      <section class="grid-2"><div class="card pad"><h3 class="ct">Spend by category</h3><ul class="cl-cat">${cat.map((x) => `<li><span>${x[0]}</span>${B.prog(Math.round((x[1] / max) * 100), '')}<b>${B.money(x[1])}</b></li>`).join('')}</ul></div><div class="card pad"><h3 class="ct">Policy limits per item</h3><ul class="cl-lim">${CATS.map((k) => `<li><span>${k}</span><b>${B.money(LIMIT[k])}</b></li>`).join('')}</ul></div></section>`;
  };

  /* ---------- Claim detail ---------- */
  B.act['cl-view'] = (t) => {
    const c = find(t.closest('[data-id]').dataset.id), mine = C.includes(c), s = c[5], admin = B.role !== 'employee', page = B.$('.cl-q') ? 'team' : '';
    const acts = (s === 'Pending Supervisor' && (page === 'team' || (admin && !mine))) ? `<button class="btn" data-act="cl-reject">Reject</button><button class="btn primary" data-act="cl-approve">Approve</button>`
      : (admin && s === 'Pending Finance') ? `<button class="btn" data-act="cl-reject">Reject</button><button class="btn primary" data-act="cl-approve">Approve</button>`
      : (admin && s === 'Approved') ? `<button class="btn primary" data-act="cl-pay">Mark as paid</button>`
      : mine && s === 'Draft' ? `<button class="btn" data-act="toast" data-msg="Draft deleted">Delete</button><button class="btn primary" data-act="toast" data-msg="Claim submitted to your supervisor">Submit</button>`
      : mine && /Pending/.test(s) ? `<button class="btn" data-act="toast" data-msg="Claim withdrawn">Withdraw</button>` : '';
    B.modal({ title: `${c[0]} · ${esc(c[2])}`, wide: true, body: `<div class="cl-meta">${who(c[1])}${pill(s)}${flag(c)}<span>${c[3]}</span></div>${tracker(c)}
      ${s === 'Rejected' ? `<div class="as-issue">${ic('alert', 15)}<span><b>Rejected by Fatema Khatun:</b> Not covered by policy. Raise a purchase request instead.</span></div>` : ''}
      <table class="dt cl-tbl"><thead><tr><th>Category</th><th>Description</th><th>Receipt</th><th class="r">Amount</th></tr></thead><tbody>${c[4].map((l) => `<tr><td>${l[0]}</td><td>${esc(l[1])}</td><td>${l[3] ? `<span class="chip">${ic('paperclip', 13)}${esc(l[3])}</span>` : '<span class="as-none">Missing</span>'}</td><td class="r ${l[2] > LIMIT[l[0]] ? 'cl-over' : ''}">${B.money(l[2])}${l[2] > LIMIT[l[0]] ? `<em>limit ${B.money(LIMIT[l[0]])}</em>` : ''}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="3">Total claimed</td><td class="r"><b>${B.money(total(c))}</b></td></tr>${c[6] ? `<tr><td colspan="3">Sanctioned</td><td class="r"><b>${B.money(c[6])}</b></td></tr>` : ''}</tfoot></table>
      <h4 style="margin:16px 0 8px">Timeline</h4><ul class="as-hist"><li><i></i><div><b>Submitted</b><span>${c[3]} · ${esc(c[1])}</span></div></li>${stage(s) >= 2 ? `<li><i></i><div><b>Approved by supervisor</b><span>Fatema Khatun</span></div></li>` : ''}${stage(s) >= 3 ? `<li><i></i><div><b>Paid via bank transfer</b><span>Finance · ref TXN-88210</span></div></li>` : ''}</ul>`, foot: acts || `<button class="btn" data-act="close-modal">Close</button>` });
  };

  /* ---------- Approve / reject / pay dialogs ---------- */
  const cur = (t) => { const r = t.closest('[data-id]'); return r ? find(r.dataset.id) : find(B.$('.modal-h h3').textContent.split(' ')[0]); };
  B.act['cl-approve'] = (t) => {
    const cl = cur(t);
    B.modal({ title: 'Approve ' + cl[0], body: `<p style="margin-bottom:12px"><b>${esc(cl[2])}</b> · ${esc(cl[1])}</p><div class="fgrid" style="grid-template-columns:1fr"><div class="fld"><label>Sanctioned amount (৳)</label><input type="number" class="inp" value="${total(cl)}"></div><div class="fld"><label>Comment <em style="font-weight:400">(optional)</em></label><textarea class="inp" rows="3"></textarea></div></div>`, foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="cl-done" data-msg="Claim approved and sent on">Approve</button>` });
  };
  B.act['cl-reject'] = (t) => {
    const c = cur(t);
    B.modal({ title: 'Reject ' + c[0], body: `<div class="fld"><label>Reason (visible to the employee)</label><textarea class="inp" rows="4" placeholder="Why is this claim being rejected?"></textarea></div>`, foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="cl-done" data-msg="Claim rejected">Reject claim</button>` });
  };
  B.act['cl-pay'] = () => {
    B.modal({ title: 'Mark as paid', body: `<div class="fgrid" style="grid-template-columns:1fr 1fr"><div class="fld"><label>Payment method</label><select class="inp"><option>Bank transfer</option><option>Cash</option><option>Add to payroll</option></select></div><div class="fld"><label>Payment date</label><input type="date" class="inp"></div><div class="fld" style="grid-column:1/-1"><label>Reference</label><input class="inp" placeholder="Transaction or voucher no."></div></div><div class="cl-net"><span>Sanctioned</span><b>৳ 18,500</b><span>Advance adjusted</span><b>− ৳ 5,000</b><span>Net payable</span><b>৳ 13,500</b></div>`, foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="cl-done" data-msg="Marked as paid">Confirm payment</button>` });
  };
  B.act['cl-done'] = (t) => { B.closeModal(); B.toast(t.dataset.msg); };

  /* ---------- New claim form ---------- */
  const row = (l) => `<div class="cl-row"><input type="date" class="inp sm"><select class="inp sm">${CATS.map((c) => `<option ${l && l[0] === c ? 'selected' : ''}>${c}</option>`).join('')}</select><input class="inp sm" placeholder="Description" value="${l ? esc(l[1]) : ''}"><input type="number" class="inp sm" placeholder="Amount" value="${l ? l[2] : ''}"><label class="btn sm cl-file">${ic('paperclip', 13)}Receipt<input type="file" hidden></label><button class="icon-btn sm" data-act="cl-rm" aria-label="Remove">${ic('x', 15)}</button></div>`;
  B.act['cl-new'] = () => B.modal({ title: 'New Expense Claim', wide: true, body: `<div class="fgrid" style="grid-template-columns:1fr 1fr"><div class="fld" style="grid-column:1/-1"><label>Claim title</label><input class="inp" placeholder="e.g. Client visit · Chattogram"></div><div class="fld"><label>Link an advance <em style="font-weight:400">(optional)</em></label><select class="inp"><option>None</option><option>ADV-0002 · ৳ 5,000 open</option></select></div><div class="fld"><label>Approver</label><input class="inp" value="Fatema Khatun (your supervisor)" disabled></div></div>
    <h4 style="margin:16px 0 8px">Expense items</h4><div class="cl-head"><span>Date</span><span>Category</span><span>Description</span><span>Amount</span><span>Receipt</span><span></span></div><div id="cl-lines">${row()}</div>
    <button class="btn sm" data-act="cl-add" style="margin-top:8px">${ic('plus', 14)}Add item</button><p class="cl-hint">${ic('alert', 14)} Receipts are required for items above ৳ 500. Items over the category limit are flagged for the approver.</p>`, foot: `<button class="btn" data-act="cl-done" data-msg="Saved as draft">Save draft</button><button class="btn primary" data-act="cl-done" data-msg="Claim submitted to your supervisor">Submit for approval</button>` });
  B.act['cl-add'] = () => B.$('#cl-lines').insertAdjacentHTML('beforeend', row());
  B.act['cl-rm'] = (t) => { const r = t.closest('.cl-row'); if (B.$$('.cl-row').length > 1) r.remove(); };
})();
