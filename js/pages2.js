/* Bijoy HRMS — custom pages (part 2): Leaves, Payroll, Recruitment, Performance, Self Service, Reports, Settings, Announcements, Login */
(function () {
  const B = window.B;
  const { ic, esc, head, kpi, mkSeries } = B;
  const E = B.EMPLOYEES;
  const crumb = (m, l) => [{ label: 'HR', href: '#/' }, { label: m }, { label: l }];

  /* ================= LEAVES ================= */
  const LTC = { 'Casual Leave': 'c1', 'Sick Leave': 'c5', 'Earned Leave': 'c3', 'Leave Without Pay': 'c6', 'Compensatory Off': 'c4' };
  let lcal = { y: B.today.getFullYear(), m: B.today.getMonth() };
  B.page['leave-calendar'] = () => {
    const { y, m } = lcal, days = new Date(y, m + 1, 0).getDate(), off = new Date(y, m, 1).getDay();
    const deptOf = (n) => { const e = B.EMPLOYEES.find((x) => x.name === n); return e ? e.dept : ''; };
    const leaves = B.getRows('leave-application').filter((r) => r.vals[5] !== 'Rejected' && r.vals[5] !== 'Cancelled' && (!lcal.dept || deptOf(r.vals[0]) === lcal.dept));
    const on = (d) => leaves.filter((r) => { const a = B.parse(r.vals[2]), b = B.parse(r.vals[3]), x = new Date(y, m, d); return x >= a && x <= b; });
    let cells = ''; for (let i = 0; i < off; i++) cells += '<div class="cd out"></div>';
    for (let d = 1; d <= days; d++) {
      const ev = on(d), wd = (off + d - 1) % 7, isT = y === B.today.getFullYear() && m === B.today.getMonth() && d === B.today.getDate();
      cells += `<div class="cd ${wd === 5 ? 'wk' : ''} ${isT ? 'today' : ''}"><b>${d}</b>${ev.slice(0, 3).map((r) => `<a class="ce lt ${LTC[r.vals[1]] || 'c1'}" href="#/form/leave-application/${r.name}">${esc(r.vals[0].split(' ')[0])}</a>`).join('')}${ev.length > 3 ? `<span class="more">+${ev.length - 3} more</span>` : ''}</div>`;
    }
    const today = leaves.filter((r) => { const a = B.parse(r.vals[2]), b = B.parse(r.vals[3]); return B.today >= a && B.today <= b; }).slice(0, 4);
    return `${head('Leave Calendar', 'Team leaves at a glance', `<select class="inp sm" data-chg="lcal-dept"><option value="">All Departments</option>${B.DEPTS.map((d) => `<option ${d === lcal.dept ? 'selected' : ''}>${d}</option>`).join('')}</select><a class="btn primary" href="#/form/leave-application/new">${ic('plus', 16)}Apply Leave</a>`, crumb('Leaves', 'Leave Calendar'))}
      <div class="legend-row roster-leg">${Object.entries(LTC).map(([k, v]) => `<span><i class="sh ${v}"></i>${k}</span>`).join('')}</div>
      <div class="grid-3-1"><div class="card cal-card"><div class="cal-h"><button class="icon-btn" data-act="lcal2" data-d="-1">${ic('left')}</button><h3>${B.MONTHS_FULL[m]} ${y}</h3><button class="icon-btn" data-act="lcal2" data-d="1">${ic('right')}</button></div><div class="cal-grid">${B.DAYS.map((d, i) => `<div class="cw ${i === 5 ? 'wk' : ''}">${d}</div>`).join('')}${cells}</div></div>
      <div class="stack"><div class="card pad"><h3 class="ct">On leave today</h3><ul class="feed">${today.map((r) => `<li>${B.avatar(r.vals[0], 30)}<div><b>${r.vals[0]}</b><span>${r.vals[1]}</span></div></li>`).join('') || '<li class="muted">Everyone is in today 🎉</li>'}</ul></div>
        <div class="card pad"><h3 class="ct">Upcoming holidays</h3><ul class="feed">${[['Bijoya Dashami', '20 Oct'], ['Victory Day', '16 Dec'], ['Christmas Day', '25 Dec']].map((h) => `<li><span class="up-ic hl">${ic('coffee', 15)}</span><div><b>${h[0]}</b><span>${h[1]}</span></div></li>`).join('')}</ul></div></div></div>`;
  };
  B.chg['lcal-dept'] = (t) => { lcal.dept = t.value; B.route(); };
  B.act.lcal2 = (t) => { lcal.m += +t.dataset.d; if (lcal.m < 0) { lcal.m = 11; lcal.y--; } if (lcal.m > 11) { lcal.m = 0; lcal.y++; } B.route(); };

  let lbSel = null;
  B.page['leave-balance'] = () => {
    const lv = [['Casual Leave', 12, 'var(--c1)'], ['Sick Leave', 10, 'var(--c5)'], ['Earned Leave', 20, 'var(--c3)'], ['Compensatory Off', 4, 'var(--c4)']];
    const team = E.slice(1, 14), balOf = (e) => { const r = B.rng('lb' + e.id); return lv.map((l) => Math.round(r() * (l[1] - 2)) + 2); };
    const sel = team.find((e) => e.id === lbSel) || (B.role === 'employee' && team.find((e) => e.id === B.ME.id)) || team[0], sv = balOf(sel);
    return `${head('Leave Balance', 'Allocated, taken and remaining leaves', `<select class="inp sm" data-chg="lb-emp" aria-label="Employee">${team.map((e) => `<option value="${e.id}" ${e.id === sel.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select><select class="inp sm"><option>Leave Period 2026</option><option>2025</option></select><button class="btn" data-act="toast" data-msg="Report exported">${ic('download', 16)}Export</button>`, crumb('Leaves', 'Leave Balance'))}
      <div class="who" style="margin:0 0 12px">${B.avatar(sel.name, 34)}<span><b>${esc(sel.name)}</b> · ${esc(sel.dept)} · ${esc(sel.desig || '')}</span></div>
      <div class="rings">${lv.map((l, i) => `<div class="card pad ring-c">${B.ring((sv[i] / l[1]) * 100, 116, sv[i], 'remaining', l[2])}<b>${l[0]}</b><span>${l[1] - sv[i]} taken · ${l[1]} allocated</span></div>`).join('')}</div>
      <div class="card table-card"><div class="card-h"><h3 class="ct">Team balances</h3><span class="muted">Click a row to see that employee above</span></div><div class="tscroll"><table class="dt"><thead><tr><th>Employee</th><th>Department</th>${lv.map((l) => `<th>${l[0]}</th>`).join('')}<th class="r">Total</th></tr></thead><tbody>${team.map((e) => { const v = balOf(e); return `<tr data-act="lb-pick" data-id="${e.id}" style="cursor:pointer;${e.id === sel.id ? 'background:var(--accent-soft)' : ''}"><td><span class="who">${B.avatar(e.name, 26)}<span>${e.name}</span></span></td><td>${e.dept}</td>${v.map((x, i) => `<td>${B.prog((x / lv[i][1]) * 100, x)}</td>`).join('')}<td class="r"><b>${v.reduce((a, c) => a + c, 0)}</b></td></tr>`; }).join('')}</tbody></table></div></div>`;
  };
  B.chg['lb-emp'] = (t) => { lbSel = t.value; B.route(); };
  B.act['lb-pick'] = (t) => { lbSel = t.dataset.id; B.route(); };

  B.page['leave-control'] = () => `${head('Leave Control Panel', 'Allocate leaves to many employees at once', '', crumb('Leaves', 'Leave Control Panel'))}
    <div class="steps"><div class="step on"><b>1</b>Select employees</div><div class="step"><b>2</b>Leave details</div><div class="step"><b>3</b>Allocate</div></div>
    <div class="card pad"><h3 class="ct">Filter employees</h3><div class="fgrid f4">${[['Company', [B.COMPANY]], ['Department', ['All'].concat(B.DEPTS)], ['Designation', ['All', 'Software Engineer', 'Sales Executive', 'Accountant']], ['Employment Type', ['All', 'Full-time', 'Contract', 'Intern']], ['Branch', ['All'].concat(B.BRANCHES)], ['Employee Grade', ['All', 'Grade A', 'Grade B', 'Grade C']], ['Leave Period', ['2026', '2025']], ['Leave Type', ['Casual Leave', 'Sick Leave', 'Earned Leave']]].map((f) => `<div class="fld"><label>${f[0]}</label><select class="inp">${f[1].map((o) => `<option>${o}</option>`).join('')}</select></div>`).join('')}</div>
      <div class="ch-f"><button class="btn" data-act="toast" data-msg="Employees fetched">${ic('users', 15)}Get Employees</button></div></div>
    <div class="card table-card"><div class="card-h"><h3 class="ct">Employees <span class="count">12</span></h3></div><div class="tscroll"><table class="dt"><thead><tr><th class="ck"><input type="checkbox" checked></th><th>Employee</th><th>Department</th><th>Designation</th><th>Date of Joining</th></tr></thead><tbody>${E.slice(2, 14).map((e) => `<tr><td class="ck"><input type="checkbox" checked></td><td><span class="who">${B.avatar(e.name, 26)}<span>${e.name}</span></span></td><td>${e.dept}</td><td>${e.desig}</td><td>${B.fdate(e.doj)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card pad"><h3 class="ct">Allocation details</h3><div class="fgrid f4"><div class="fld"><label>From Date</label><input class="inp" type="date" value="${B.today.getFullYear()}-01-01"></div><div class="fld"><label>To Date</label><input class="inp" type="date" value="${B.today.getFullYear()}-12-31"></div><div class="fld"><label>New Leaves Allocated</label><input class="inp" type="number" value="12"></div><div class="fld"><label>Carry Forward</label><label class="switch"><input type="checkbox" checked><i></i></label></div></div>
      <div class="ch-f"><button class="btn primary" data-act="toast" data-msg="Leaves allocated to 12 employees">${ic('check-circle', 16)}Allocate Leave</button></div></div>`;

  /* ================= PAYROLL ================= */
  B.page['payroll-dash'] = () => {
    const tot = E.reduce((a, e) => a + e.salary, 0), ded = Math.round(tot * 0.112), months = Array.from({ length: 12 }, (_, i) => B.MONTHS[(B.today.getMonth() - 11 + i + 12) % 12]);
    const g = mkSeries('pg', 12, 24, 30).map((v) => v * 100000), n = g.map((v) => Math.round(v * 0.89));
    const comps = [['Basic', 50], ['House Rent', 25], ['Medical', 8], ['Conveyance', 5], ['Bonus', 12]].map((c) => ({ label: c[0], value: Math.round((tot * c[1]) / 100) }));
    const step = 3, steps = ['Create Entry', 'Fetch Employees', 'Generate Slips', 'Submit & Approve', 'Bank Payment'];
    return `${head('Payroll Dashboard', 'September 2026 payroll cycle', `<a class="btn" href="#/list/salary-slip">${ic('file', 16)}Salary Slips</a><a class="btn primary" href="#/page/payroll-process">${ic('zap', 16)}Run Payroll</a>`, crumb('Payroll', 'Dashboard'))}
      <section class="kpis">${kpi('dollar', 'Gross Payroll', B.money(tot), '+1.8%', mkSeries('p1', 12, 20, 30))}${kpi('card', 'Net Payable', B.money(tot - ded), '+1.6%', mkSeries('p2', 12, 20, 30), 'ok')}${kpi('percent', 'Deductions', B.money(ded), '+0.4%', mkSeries('p3', 12, 3, 9), 'warn')}${kpi('building', 'Employer Cost', B.money(tot * 1.09), '+2.0%', mkSeries('p4', 12, 22, 32))}${kpi('users', 'On Payroll', E.length, '+2')}${kpi('lock', 'Withheld Slips', '1', null, null, 'bad')}</section>
      <div class="card pad"><div class="ct-row"><h3 class="ct">Payroll run status</h3><span class="pill warn"><i></i>Processing · due in 2 days</span></div><div class="steps flow">${steps.map((s, i) => `<div class="step ${i < step ? 'done' : i === step ? 'on' : ''}"><b>${i < step ? ic('check', 14) : i + 1}</b>${s}</div>`).join('')}</div></div>
      <section class="grid-3-2"><div class="card pad"><div class="ct-row"><h3 class="ct">Payroll cost — last 12 months</h3><div class="legend-row"><span><i style="background:var(--c1)"></i>Gross</span><span><i style="background:var(--c3)"></i>Net</span></div></div>${B.area([{ name: 'Gross', data: g }, { name: 'Net', data: n, color: 'var(--c3)' }], months, { h: 240, fmt: B.money })}</div>
        <div class="card pad"><h3 class="ct">Salary components</h3>${B.donut(comps, { center: B.short(tot), label: 'Gross / mo', fmt: B.short })}</div></section>
      <section class="grid-2"><div class="card table-card"><div class="card-h"><h3 class="ct">Recent salary slips</h3><a class="link-btn" href="#/list/salary-slip">View all</a></div><div class="tscroll"><table class="dt"><tbody>${B.getRows('salary-slip').slice(0, 6).map((r) => `<tr data-act="row" data-href="#/form/salary-slip/${r.name}"><td><span class="who">${B.avatar(r.vals[0], 28)}<span><b>${r.vals[0]}</b><em class="sub">${r.name}</em></span></span></td><td class="r"><span class="num">${B.money(r.vals[6])}</span></td><td>${B.pill(r.vals[7])}</td></tr>`).join('')}</tbody></table></div></div>
        <div class="card pad"><h3 class="ct">Cost by department</h3>${B.hbars(B.DEPTS.map((d) => ({ label: d, value: E.filter((e) => e.dept === d).reduce((a, e) => a + e.salary, 0) + 180000 + (B.hash(d) % 200000) })), { multi: true, fmt: B.short })}</div></section>`;
  };

  let pp = { step: 0, prog: 0 };
  const ppSteps = ['Payroll Details', 'Employees', 'Salary Slips', 'Submit', 'Bank Entry'];
  const ppBody = () => {
    const rows = E.slice(0, 12), tot = rows.reduce((a, e) => a + e.salary, 0);
    if (pp.step === 0) return `<div class="fgrid f4">${[['Company', B.COMPANY], ['Posting Date', B.iso(B.today), 'date'], ['Payroll Frequency', 'Monthly'], ['Start Date', B.today.getFullYear() + '-' + B.pad(B.today.getMonth() + 1) + '-01', 'date'], ['End Date', B.iso(new Date(B.today.getFullYear(), B.today.getMonth() + 1, 0)), 'date'], ['Currency', 'BDT'], ['Payroll Payable Account', 'Payroll Payable - BT'], ['Cost Center', 'Main - BT']].map((f) => `<div class="fld"><label>${f[0]}</label><input class="inp" type="${f[2] || 'text'}" value="${f[1]}"></div>`).join('')}</div>
      <h4 class="sub-h">Filter employees</h4><div class="fgrid f4">${[['Branch', B.BRANCHES], ['Department', B.DEPTS], ['Designation', ['Software Engineer', 'Accountant']], ['Project', ['—']]].map((f) => `<div class="fld"><label>${f[0]}</label><select class="inp"><option>All</option>${f[1].map((o) => `<option>${o}</option>`).join('')}</select></div>`).join('')}</div>
      <label class="chk-row"><input type="checkbox" checked>Deduct tax for unsubmitted tax exemption proof</label><label class="chk-row"><input type="checkbox">Validate attachments &amp; attendance before processing</label>`;
    if (pp.step === 1) return `<div class="ct-row"><h4 class="sub-h">${rows.length} employees fetched</h4><button class="btn sm" data-act="toast" data-msg="Employees refreshed">${ic('refresh', 14)}Get Employees</button></div><div class="tscroll"><table class="dt"><thead><tr><th class="ck"><input type="checkbox" checked></th><th>Employee</th><th>Department</th><th>Designation</th><th class="r">Base</th></tr></thead><tbody>${rows.map((e) => `<tr><td class="ck"><input type="checkbox" checked></td><td><span class="who">${B.avatar(e.name, 26)}<span>${e.name}</span></span></td><td>${e.dept}</td><td>${e.desig}</td><td class="r">${B.money(e.salary)}</td></tr>`).join('')}</tbody></table></div>`;
    if (pp.step === 2) return `<div class="gen"><div class="gen-ic">${ic('zap', 30)}</div><h3>Create Salary Slips</h3><p>Salary slips will be generated in the background for the ${rows.length} selected employees.</p><div class="gen-bar">${B.prog(pp.prog)}</div><button class="btn primary" data-act="pp-gen" ${pp.prog >= 100 ? 'disabled' : ''}>${pp.prog >= 100 ? 'Slips created ✓' : 'Create Salary Slips'}</button></div>`;
    if (pp.step === 3) return `<div class="tscroll"><table class="dt"><thead><tr><th>Employee</th><th class="r">Gross</th><th class="r">Deductions</th><th class="r">Net</th><th>Status</th></tr></thead><tbody>${rows.map((e) => { const s = B.slipFor(e); return `<tr><td><span class="who">${B.avatar(e.name, 26)}<span>${e.name}</span></span></td><td class="r">${B.money(s.gross)}</td><td class="r">${B.money(s.dt)}</td><td class="r"><b>${B.money(s.net)}</b></td><td>${B.pill('Draft')}</td></tr>`; }).join('')}</tbody><tfoot><tr class="tot"><td>Total</td><td class="r">${B.money(tot)}</td><td class="r">${B.money(Math.round(tot * 0.112))}</td><td class="r">${B.money(Math.round(tot * 0.888))}</td><td></td></tr></tfoot></table></div>`;
    return `<div class="gen"><div class="gen-ic ok">${ic('check-circle', 30)}</div><h3>Ready for bank payment</h3><p>Total net payable <b>${B.money(Math.round(tot * 0.888))}</b> to ${rows.length} employees.</p><div class="ch-f center"><button class="btn" data-act="toast" data-msg="Bank remittance file downloaded">${ic('download', 15)}Bank Remittance</button><button class="btn primary" data-act="toast" data-msg="Journal entry created">${ic('dollar', 15)}Make Bank Entry</button></div></div>`;
  };
  const ppRender = () => {
    B.$('#pp-steps').innerHTML = ppSteps.map((s, i) => `<div class="step ${i < pp.step ? 'done' : i === pp.step ? 'on' : ''}"><b>${i < pp.step ? ic('check', 14) : i + 1}</b>${s}</div>`).join('');
    B.$('#pp-body').innerHTML = ppBody();
    B.$('#pp-back').disabled = pp.step === 0; B.$('#pp-next').style.display = pp.step === 4 ? 'none' : '';
    B.$('#pp-next').textContent = pp.step === 3 ? 'Submit Salary Slips' : 'Next';
  };
  B.page['payroll-process'] = () => { pp = { step: 0, prog: 0 }; B.onMount(ppRender); return `${head('Process Payroll', 'Payroll Entry wizard', `<a class="btn" href="#/list/payroll-entry">${ic('list', 16)}Payroll Entries</a>`, crumb('Payroll', 'Process Payroll'))}<div class="card pad"><div class="steps" id="pp-steps"></div><div id="pp-body" class="pp-body"></div><div class="ch-f between"><button class="btn" id="pp-back" data-act="pp-nav" data-d="-1">Back</button><button class="btn primary" id="pp-next" data-act="pp-nav" data-d="1">Next</button></div></div>`; };
  B.act['pp-nav'] = (t) => { if (pp.step === 2 && +t.dataset.d > 0 && pp.prog < 100) return B.toast('Create salary slips first', 'bad'); pp.step = Math.max(0, Math.min(4, pp.step + +t.dataset.d)); if (pp.step === 4) B.toast('Salary slips submitted'); ppRender(); };
  B.act['pp-gen'] = () => { const iv = setInterval(() => { pp.prog = Math.min(100, pp.prog + 10); if (pp.step === 2) ppRender(); if (pp.prog >= 100) clearInterval(iv); }, 160); };

  let slipEmp = E[3].id;
  B.page.payslip = () => {
    const e = B.emp(slipEmp), s = B.slipFor(e), m = B.MONTHS_FULL[B.today.getMonth()] + ' ' + B.today.getFullYear();
    return `${head('Payslip Viewer', 'Printable, brand-ready salary slip', `<select class="inp sm" data-chg="slip-emp">${E.map((x) => `<option value="${x.id}" ${x.id === slipEmp ? 'selected' : ''}>${x.name}</option>`).join('')}</select><button class="btn" data-act="toast" data-msg="Payslip emailed to ${esc(e.first)}">${ic('mail', 16)}Email</button><button class="btn primary" data-act="print">${ic('print', 16)}Print / PDF</button>`, crumb('Payroll', 'Payslip'))}
      <div class="paper"><div class="pp-h"><div class="pp-brand"><span class="logo-chip"><img src="logo.png" alt="Bijoy"></span><div><b>${B.COMPANY}</b><span>House 45, Road 27, Gulshan-1, Dhaka 1212 · hr@bijoy.com.bd</span></div></div><div class="pp-t"><em>PAYSLIP</em><b>${m}</b><span>Slip no. HR-SAL-${B.today.getFullYear()}-${e.id.slice(-3)}</span></div></div>
        <div class="pp-info">${[['Employee', e.name], ['Employee ID', e.id], ['Designation', e.desig], ['Department', e.dept], ['Date of Joining', B.fdate(e.doj)], ['Branch', e.branch], ['Bank A/C', '•••• 7741 (BRAC)'], ['Payment days', '26 / 26']].map((r) => `<div><span>${r[0]}</span><b>${esc(r[1])}</b></div>`).join('')}</div>
        <div class="pp-tables"><table><thead><tr><th>Earnings</th><th class="r">Amount</th></tr></thead><tbody>${s.earn.map((x) => `<tr><td>${x[0]}</td><td class="r">${B.money(x[1])}</td></tr>`).join('')}</tbody><tfoot><tr><td>Gross Earnings</td><td class="r">${B.money(s.gross)}</td></tr></tfoot></table>
          <table><thead><tr><th>Deductions</th><th class="r">Amount</th></tr></thead><tbody>${s.ded.map((x) => `<tr><td>${x[0]}</td><td class="r">${B.money(x[1])}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total Deductions</td><td class="r">${B.money(s.dt)}</td></tr></tfoot></table></div>
        <div class="pp-net"><div><span>Net Pay</span><b>${B.money(s.net)}</b></div><p>${B.words(s.net)} Taka Only</p></div>
        <div class="pp-f"><span>This is a system-generated payslip and does not require a signature.</span><div class="sig"><i></i>Authorized Signatory</div></div></div>`;
  };
  B.chg['slip-emp'] = (t) => { slipEmp = t.value; B.route(); };

  /* ================= RECRUITMENT ================= */
  B.page['recruit-dash'] = () => {
    const wk = Array.from({ length: 12 }, (_, i) => 'W' + (i + 1));
    const src = [['LinkedIn', 84], ['Bdjobs', 71], ['Referral', 46], ['Website', 30], ['Facebook', 17]].map((s) => ({ label: s[0], value: s[1] }));
    const jobs = B.getRows('job-opening').slice(0, 6);
    const iv = B.getRows('interview').slice(0, 5);
    return `${head('Recruitment Dashboard', 'Hiring health across all open positions', `<a class="btn" href="#/list/job-applicant/kanban">${ic('kanban', 16)}Pipeline</a><a class="btn primary" href="#/form/job-opening/new">${ic('plus', 16)}New Opening</a>`, crumb('Recruitment', 'Dashboard'))}
      <section class="kpis">${kpi('briefcase', 'Open Positions', 9, '+3', mkSeries('r1', 12, 3, 12))}${kpi('users', 'Applicants', 248, '+18%', mkSeries('r2', 12, 10, 40), 'ok')}${kpi('calendar', 'Interviews / week', 14, '+4', mkSeries('r3', 12, 4, 18))}${kpi('send', 'Offers Pending', 5, null, mkSeries('r4', 12, 1, 8), 'warn')}${kpi('clock', 'Avg Time to Hire', '27 d', '-3 d', mkSeries('r5', 12, 20, 40))}${kpi('check-circle', 'Offer Acceptance', '84%', '+6%', mkSeries('r6', 12, 60, 90), 'ok')}</section>
      <section class="grid-3-2"><div class="card pad"><h3 class="ct">Applications per week</h3>${B.area([{ name: 'Applicants', data: mkSeries('ra', 12, 10, 40) }, { name: 'Shortlisted', data: mkSeries('rb', 12, 3, 14), color: 'var(--c2)' }], wk, { h: 230 })}</div>
        <div class="card pad"><h3 class="ct">Applicant sources</h3>${B.donut(src, { center: 248, label: 'Applicants' })}</div></section>
      <section class="grid-2"><div class="card table-card"><div class="card-h"><h3 class="ct">Open positions</h3><a class="link-btn" href="#/list/job-opening">All openings</a></div><div class="tscroll"><table class="dt"><tbody>${jobs.map((r) => `<tr data-act="row" data-href="#/form/job-opening/${r.name}"><td><b>${r.vals[0]}</b><em class="sub">${r.vals[2]} · ${r.vals[3]}</em></td><td>${B.prog(Math.min(100, r.vals[5] * 1.2), r.vals[5])}</td><td>${B.pill(r.vals[6])}</td></tr>`).join('')}</tbody></table></div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Upcoming interviews</h3><a class="link-btn" href="#/list/interview/calendar">Calendar</a></div><ul class="feed">${iv.map((r) => `<li>${B.avatar(r.vals[0], 34)}<div><b>${r.vals[0]}</b><span>${r.vals[2]} · ${B.fdate(r.vals[3])}</span></div>${B.pill(r.vals[5])}</li>`).join('')}</ul></div></section>`;
  };

  /* ================= PERFORMANCE ================= */
  B.page['perf-dash'] = () => {
    const ph = [['Goal setting', 'done'], ['Self review', 'done'], ['Peer feedback', 'on'], ['Manager review', ''], ['Calibration', ''], ['Finalized', '']];
    return `${head('Performance Dashboard', 'H1 2026 Review cycle', `<a class="btn" href="#/list/appraisal-cycle">${ic('list', 16)}Cycles</a><a class="btn primary" href="#/form/appraisal-cycle/new">${ic('plus', 16)}New Cycle</a>`, crumb('Performance', 'Dashboard'))}
      <div class="card pad"><div class="ct-row"><h3 class="ct">H1 2026 Review</h3>${B.pill('In Progress')}</div><div class="steps flow">${ph.map((p, i) => `<div class="step ${p[1]}"><b>${p[1] === 'done' ? ic('check', 14) : i + 1}</b>${p[0]}</div>`).join('')}</div></div>
      <section class="grid-4">${[['Self reviews', 88, 'var(--c1)'], ['Peer feedback', 64, 'var(--c2)'], ['Manager reviews', 41, 'var(--c3)'], ['Calibrated', 12, 'var(--c4)']].map((r) => `<div class="card pad ring-c">${B.ring(r[1], 104, r[1] + '%', '', r[2])}<b>${r[0]}</b><span>of 26 employees</span></div>`).join('')}</section>
      <section class="grid-3-2"><div class="card pad"><h3 class="ct">Rating distribution</h3>${B.vbars([['1★', 1], ['2★', 3], ['3★', 8], ['4★', 10], ['5★', 4]].map((x, i) => ({ label: x[0], value: x[1] })), { h: 220, multi: true })}</div>
        <div class="card pad"><h3 class="ct">Average score by department</h3>${B.hbars(B.DEPTS.map((d) => ({ label: d, value: +(3.2 + (B.hash(d) % 17) / 10).toFixed(1) })), { multi: true })}</div></section>
      <div class="card table-card"><div class="card-h"><h3 class="ct">Top performers</h3></div><div class="tscroll"><table class="dt"><thead><tr><th>Employee</th><th>Department</th><th>Designation</th><th>Final score</th><th>Goals</th></tr></thead><tbody>${E.slice(3, 9).map((e, i) => `<tr><td><span class="who">${B.avatar(e.name, 28)}<span>${e.name}</span></span></td><td>${e.dept}</td><td>${e.desig}</td><td>${B.stars(5 - i * 0.25)}</td><td>${B.prog(96 - i * 6)}</td></tr>`).join('')}</tbody></table></div></div>`;
  };

  B.page.goals = () => {
    const tree = [['Delivery Timeliness', 'Company', [['Launch v2 payments module', 'Tanvir Ahmed', 78], ['Ship mobile app beta', 'Imran Hossain', 55], ['Automate payroll exports', 'Farhana Akter', 91]]], ['Customer Satisfaction', 'Company', [['Improve NPS to 60+', 'Sumaiya Begum', 48], ['Reduce ticket resolution time by 20%', 'Lamia Karim', 62]]], ['Revenue Target', 'Company', [['Hit Q3 revenue ৳ 5 Cr', 'Nusrat Jahan', 84], ['Onboard 10 enterprise clients', 'Mahmud Hasan', 30]]]];
    return `${head('Goals & OKRs', 'Company goals cascading to teams and individuals', `<div class="seg"><button class="on">Company</button><button>Team</button><button>Mine</button></div><a class="btn primary" href="#/form/goal/new">${ic('plus', 16)}New Goal</a>`, crumb('Performance', 'Goals'))}
      <div class="goal-tree">${tree.map((k, i) => { const avg = Math.round(k[2].reduce((a, g) => a + g[2], 0) / k[2].length); return `<div class="card pad gt"><div class="gt-h" data-act="gtg"><span class="gt-ic">${ic('target', 18)}</span><div><b>${k[0]}</b><span>${k[2].length} goals · ${k[1]}</span></div>${B.prog(avg)}${ic('down', 16)}</div><ul class="gt-b">${k[2].map((g) => `<li>${B.avatar(g[1], 28)}<div><b>${g[0]}</b><span>${g[1]} · due ${B.fdate(B.addDays(B.today, 30 + i * 20))}</span></div>${B.prog(g[2])}${B.pill(g[2] > 80 ? 'Completed' : 'In Progress')}</li>`).join('')}</ul></div>`; }).join('')}</div>`;
  };
  B.act.gtg = (t) => t.closest('.gt').classList.toggle('shut');

  /* ================= SELF SERVICE (mobile app preview) ================= */
  let ssIn = false;
  B.page['self-service'] = () => `${head('Employee Self Service', 'Mobile-first app for every employee — installable as a PWA', `<a class="btn" href="#/employee/${E[3].id}">${ic('user', 16)}Web profile</a>`, [{ label: 'HR', href: '#/' }, { label: 'Self Service' }])}
    <div class="phones">
      <div class="phone"><div class="ph-notch"></div><div class="ph-s"><div class="ph-top"><div><span>Good morning</span><b>Tasnim Rahman</b></div>${B.avatar('Tasnim Rahman', 38)}</div>
        <div class="ph-ci"><span class="ph-date">${new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span><button class="ci-btn" id="ss-ci" data-act="ss-ci">${ic('fingerprint', 40)}<b>Check In</b></button><span class="ph-loc">${ic('pin', 13)}Dhaka HQ · within 120 m</span></div>
        <div class="ph-h">Quick links</div><div class="ph-q">${[['calendar', 'Leave'], ['card', 'Expense'], ['file', 'Payslips'], ['coffee', 'Holidays'], ['clock', 'Shifts'], ['users', 'Team']].map((q) => `<div><span>${ic(q[0], 20)}</span>${q[1]}</div>`).join('')}</div>
        <div class="ph-h">Announcements</div><div class="ph-card"><b>Q3 Town-hall</b><span>Thursday, 4 PM · Auditorium</span></div></div><div class="ph-nav"><i class="on">${ic('home', 20)}</i><i>${ic('inbox', 20)}</i><i>${ic('bell', 20)}</i><i>${ic('user', 20)}</i></div></div>
      <div class="phone"><div class="ph-notch"></div><div class="ph-s"><div class="ph-top"><b class="ph-title">My Requests</b><span class="icon-btn">${ic('filter', 18)}</span></div><div class="ph-tabs"><span class="on">All</span><span>Leaves</span><span>Expense</span><span>Shifts</span></div>
        ${[['Sick Leave', '02–03 Oct · 2 days', 'Open'], ['Client Visit Expense', '৳ 8,450', 'Approved'], ['Casual Leave', '14 Sep · 1 day', 'Approved'], ['Work From Home', '20–22 Sep', 'Approved'], ['Travel Advance', '৳ 25,000', 'Rejected']].map((r) => `<div class="ph-req"><div><b>${r[0]}</b><span>${r[1]}</span></div>${B.pill(r[2])}</div>`).join('')}<button class="fab">${ic('plus', 22)}</button></div><div class="ph-nav"><i>${ic('home', 20)}</i><i class="on">${ic('inbox', 20)}</i><i>${ic('bell', 20)}</i><i>${ic('user', 20)}</i></div></div>
      <div class="phone"><div class="ph-notch"></div><div class="ph-s"><div class="ph-top"><b class="ph-title">New Leave</b><span class="icon-btn">${ic('x', 18)}</span></div>${[['Leave Type', 'Casual Leave'], ['From', '05 Oct 2026'], ['To', '06 Oct 2026'], ['Reason', 'Family function']].map((f) => `<div class="ph-f"><label>${f[0]}</label><div>${f[1]}</div></div>`).join('')}
        <div class="ph-bal"><div>${B.ring(66, 64, '8', '', 'var(--c1)')}<span>Casual left</span></div><div>${B.ring(80, 64, '8', '', 'var(--c5)')}<span>Sick left</span></div><div>${B.ring(70, 64, '14', '', 'var(--c3)')}<span>Earned left</span></div></div><button class="ph-btn">Submit Request</button></div><div class="ph-nav"><i>${ic('home', 20)}</i><i class="on">${ic('inbox', 20)}</i><i>${ic('bell', 20)}</i><i>${ic('user', 20)}</i></div></div>
      <div class="phone"><div class="ph-notch"></div><div class="ph-s"><div class="ph-prof">${B.avatar('Tasnim Rahman', 72)}<b>Tasnim Rahman</b><span>UI/UX Designer · Design</span></div>${[['Salary Slips', 'file'], ['Attendance History', 'clock'], ['Holiday List', 'coffee'], ['Tax Declaration', 'percent'], ['Documents', 'paperclip'], ['Settings', 'settings']].map((r) => `<div class="ph-row">${ic(r[1], 18)}<span>${r[0]}</span>${ic('right', 16)}</div>`).join('')}<button class="ph-btn out">${ic('logout', 16)}Log out</button></div><div class="ph-nav"><i>${ic('home', 20)}</i><i>${ic('inbox', 20)}</i><i>${ic('bell', 20)}</i><i class="on">${ic('user', 20)}</i></div></div></div>`;
  B.act['ss-ci'] = (t) => { ssIn = !ssIn; t.classList.toggle('on', ssIn); t.innerHTML = ic('fingerprint', 40) + `<b>${ssIn ? 'Check Out' : 'Check In'}</b>`; B.toast(ssIn ? 'Checked in · 09:58 AM' : 'Checked out · 07:02 PM'); };

  /* ================= REPORTS HUB ================= */
  let repF = { q: '', m: '' };
  const repGrid = () => {
    const list = B.REPORTS.filter((r) => (!repF.m || r.rmod === repF.m) && r.label.toLowerCase().includes(repF.q.toLowerCase()));
    return list.map((r) => `<a class="card sc rep" href="#/list/rpt-${r.id}/report"><span class="sc-ic alt">${ic('bars', 20)}</span><div><b>${esc(r.label)}</b><span>${r.type} · ${(B.NAV.find((n) => n.id === r.rmod) || {}).label || 'Setup'}</span></div>${ic('right', 16)}</a>`).join('') || `<div class="empty">${ic('search', 30)}<b>No reports match</b></div>`;
  };
  B.page.reports = () => { repF = { q: '', m: '' }; return `${head('Reports', `${B.REPORTS.length} standard reports across every module`, '', [{ label: 'HR', href: '#/' }, { label: 'Reports' }])}
    <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="repq" placeholder="Search reports…"></label><div class="chips scroll"><button class="chip on" data-act="repm" data-m="">All</button>${[...new Set(B.REPORTS.map((r) => r.rmod))].map((m) => `<button class="chip" data-act="repm" data-m="${m}">${(B.NAV.find((n) => n.id === m) || { label: 'Setup' }).label}</button>`).join('')}</div></div><div class="sc-grid" id="rep-grid">${repGrid()}</div>`; };
  B.inp.repq = (t) => { repF.q = t.value; B.$('#rep-grid').innerHTML = repGrid(); };
  B.act.repm = (t) => { repF.m = t.dataset.m; B.$$('.chips.scroll .chip').forEach((c) => c.classList.toggle('on', c === t)); B.$('#rep-grid').innerHTML = repGrid(); };

  /* ================= SETTINGS ================= */
  const sw = (l, h, on) => `<div class="set-row"><div><b>${l}</b>${h ? `<span>${h}</span>` : ''}</div><label class="switch"><input type="checkbox" ${on ? 'checked' : ''} data-chg="fdirty"><i></i></label></div>`;
  const sl = (l, h, opts, v) => `<div class="set-row"><div><b>${l}</b>${h ? `<span>${h}</span>` : ''}</div><select class="inp sm" data-chg="fdirty">${opts.map((o) => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
  const nm = (l, h, v) => `<div class="set-row"><div><b>${l}</b>${h ? `<span>${h}</span>` : ''}</div><input class="inp sm num-in" type="number" value="${v}" data-inp="fdirty"></div>`;
  const settingsPage = (title, sub, tabs, crumbL) => `${head(title, sub, `<button class="btn primary" data-act="fsave">${ic('check', 16)}Save</button>`, crumb('Setup', crumbL))}<div class="set-layout"><nav class="set-nav">${tabs.map((t, i) => `<button class="${i ? '' : 'on'}" data-act="stab" data-i="${i}">${ic(t[1], 16)}${t[0]}</button>`).join('')}</nav><div class="set-body">${tabs.map((t, i) => `<div class="card pad set-p" ${i ? 'hidden' : ''} data-i="${i}"><h3 class="ct">${t[0]}</h3>${t[2]}</div>`).join('')}</div></div>`;
  B.act.stab = (t) => { B.$$('.set-nav button').forEach((b) => b.classList.toggle('on', b === t)); B.$$('.set-p').forEach((p) => (p.hidden = p.dataset.i !== t.dataset.i)); };
  B.page['hr-settings'] = () => settingsPage('HR Settings', 'Global configuration for Bijoy HRMS', [
    ['Employee', 'users', sl('Employee Naming By', 'How new employee IDs are generated', ['Naming Series', 'Full Name', 'Employee Number'], 'Naming Series') + nm('Retirement Age', 'Used for retirement reminders', 60) + nm('Standard Working Hours', 'Per day, used for hour-based attendance', 8) + sw('Send Birthday Reminders', 'Notify HR managers daily', true) + sw('Send Work Anniversary Reminders', '', true) + sw('Expire Employee Advance on Cancel', '', false)],
    ['Leave & Expense', 'calendar', sw('Leave Approver Mandatory In Leave Application', '', true) + sw('Expense Approver Mandatory In Expense Claim', '', true) + sw('Show Leaves Of All Department Members In Calendar', '', true) + sw('Send Leave Notification', 'Email approvers on new applications', true) + sw('Auto Leave Encashment', 'Encash unused leaves at period end', false) + nm('Restrict Backdated Leave Applications (days)', '0 = allow any', 7) + sw('Allow Overlap Between Leaves', '', false)],
    ['Attendance & Shift', 'clock', sw('Allow Multiple Shift Assignments for Same Date', '', false) + sw('Auto Mark Absent for Unmarked Days', '', true) + nm('Late Entry Grace Period (min)', '', 10) + sw('Enable Geo-fenced Check-in', 'Require location within shift radius', true) + sw('Allow Employees to Check In from Mobile', '', true) + sl('Working Days Basis', '', ['Mon–Thu, Sat, Sun (Friday off)', 'Mon–Fri', 'Mon–Sat'], 'Mon–Thu, Sat, Sun (Friday off)')],
    ['Recruitment', 'briefcase', sw('Check Vacancies on Job Offer Creation', '', true) + sw('Send Interview Reminders', '', true) + nm('Interview Reminder Lead Time (hours)', '', 2) + sw('Send Interview Feedback Reminders', '', true) + sw('Auto-create Employee on Offer Acceptance', '', false)],
    ['Performance', 'award', sw('Enable Self Review', '', true) + sw('Enable Peer Feedback', '', true) + sl('Default Rating Scale', '', ['1–5 stars', '1–10', 'Percentage'], '1–5 stars') + sw('Show Ratings to Employees', 'After finalization', false)],
    ['Notifications', 'bell', sw('Email Notifications', '', true) + sw('Push Notifications (PWA)', '', true) + sw('Daily HR Digest', 'Sent at 8:00 AM', true) + sl('Default Language', '', ['English', 'বাংলা'], 'English')]
  ], 'HR Settings');
  B.page['payroll-settings'] = () => settingsPage('Payroll Settings', 'Rules applied when processing salaries', [
    ['General', 'settings', sl('Payroll Based On', '', ['Leave', 'Attendance'], 'Attendance') + sw('Include Holidays in Total Working Days', '', false) + nm('Max Working Hours Against Timesheet', '', 8) + sl('Consider Unmarked Attendance As', '', ['Present', 'Absent'], 'Absent') + nm('Daily Wages Fraction for Half Day', '', 0.5) + sw('Disable Rounded Total', '', false)],
    ['Salary Slip', 'file', sw('Email Salary Slip to Employee', '', true) + sw('Encrypt Salary Slips in Emails', 'Password: first 4 letters of name + birth year', true) + sw('Show Leave Balances in Salary Slip', '', true) + sw('Process Payroll Accounting Entry Based on Employee', '', false)],
    ['Tax', 'percent', sw('Deduct Tax for Unsubmitted Proofs', '', true) + sw('Deduct Tax for Unclaimed Employee Benefits', '', true) + sl('Tax Regime', '', ['Standard Slabs', 'Simplified'], 'Standard Slabs')],
    ['Accounts', 'dollar', sl('Default Payroll Payable Account', '', ['Payroll Payable - BT', 'Salary Payable - BT'], 'Payroll Payable - BT') + sl('Default Bank Account', '', ['BRAC Bank - Main', 'DBBL - Ops'], 'BRAC Bank - Main') + sl('Default Cost Center', '', ['Main - BT', 'Support - BT'], 'Main - BT')]
  ], 'Payroll Settings');

  /* ================= ANNOUNCEMENTS ================= */
  B.page.announcements = () => `${head('Announcements', 'Company-wide updates', `<button class="btn primary" data-act="toast" data-msg="Announcement editor opened">${ic('plus', 16)}New Announcement</button>`, [{ label: 'HR', href: '#/' }, { label: 'Announcements' }])}
    <div class="ann-feed">${[['Eid-ul-Adha holiday schedule published', 'The office will remain closed from 26 May to 31 May. Please plan hand-overs and update your out-of-office status.', 'Notice', 'Fatema Khatun', 2, true], ['Q3 town-hall this Thursday, 4 PM', 'Join us in the auditorium or online for company results, roadmap and an open Q&A with leadership.', 'Event', 'Rahim Uddin', 3, false], ['Health insurance enrolment is open', 'Choose your plan before 15 October. Dependents can be added from the Benefits section of your profile.', 'Benefits', 'Farhana Akter', 5, false], ['Welcome our new joiners 🎉', 'Please welcome five new colleagues joining Engineering, Design and Support this month.', 'People', 'Mitu Rahman', 8, false]].map((a) => `<article class="card pad ann-c ${a[5] ? 'pin' : ''}"><div class="ann-h">${B.avatar(a[3], 40)}<div><b>${a[3]}</b><span>HR · ${a[4]} days ago</span></div>${a[5] ? `<span class="pill info"><i></i>Pinned</span>` : ''}<span class="pill mute">${a[2]}</span></div><h3>${a[0]}</h3><p>${a[1]}</p><div class="ann-f"><button class="like" data-act="like">${ic('heart', 15)}<b>${4 + a[4] * 3}</b></button><span>${ic('message', 14)} ${a[4]}</span></div></article>`).join('')}</div>`;

  /* ================= LOGIN ================= */
  B.renderLogin = () => {
    const mods = [['users', 'Talent Acquisition'], ['calendar', 'Leave'], ['clock', 'Roster'], ['user-check', 'Attendance'], ['dollar', 'Payroll']];
    return `<div class="lgn">
    <aside class="lg-art"><div class="lg-mesh"></div><div class="lg-grid"></div><div class="orb o1"></div><div class="orb o2"></div>
      <div class="lg-top"><span class="logo-chip lg"><img src="logo.png" alt="Bijoy"></span><div class="lg-brand"><b>Bijoy</b><em>HRMS</em></div></div>
      <div class="lg-hero"><span class="lg-eyebrow">${ic('shield', 14)}Secure workspace for HR teams</span>
        <h1>One calm place for <em>people, time</em> and payroll.</h1>
        <p>From requisition to final settlement. Roster, attendance, leave and payroll follow your company policy and stay in sync.</p>
        <ul class="lg-mods">${mods.map((m) => `<li>${ic(m[0], 15)}${m[1]}</li>`).join('')}</ul></div>
      <div class="lg-float"><div class="card glass lgf-a"><div class="lgf-h"><span>${ic('user-check', 16)}</span><div><b>Present today</b><em>Tip Soi · ZKTeco · Mobile</em></div></div><div class="lgf-n">21<small> / 26</small></div><div class="lgf-bar"><i style="width:81%"></i></div></div>
        <div class="card glass lgf-b"><div class="lgf-h"><span>${ic('dollar', 16)}</span><div><b>September payroll</b><em>Ready for approval</em></div></div><div class="lgf-n">৳ 28.4 L</div><div class="lgf-chips"><span>Late slab applied</span><span>Locked</span></div></div>
        <div class="card glass lgf-c"><span class="lgf-dot"></span>3 leave requests waiting for you</div></div>
      <div class="lg-foot">© ${new Date().getFullYear()} Bijoy · Human Resource Management System</div>
    </aside>
    <main class="lg-form">${B.themeBtn('bordered theme-tg')}
      <form class="lg-card" id="lg-form" onsubmit="B.act['lg-submit']();return false" novalidate>
        <span class="logo-chip"><img src="logo.png" alt="Bijoy"></span>
        <h2>Welcome back</h2><p class="lg-sub">Sign in to continue to your HR workspace.</p>
        <div class="fld"><label for="lg-email">Work email</label><div class="lg-in">${ic('mail', 17)}<input id="lg-email" class="inp lg" type="email" value="rahim.uddin@bijoy.com.bd" autocomplete="username" placeholder="name@bijoy.com.bd"></div><small class="lg-err" id="lg-e1"></small></div>
        <div class="fld"><label for="lg-pw">Password</label><div class="lg-in">${ic('lock', 17)}<input id="lg-pw" class="inp lg" type="password" value="password123" autocomplete="current-password" placeholder="Enter your password"><button type="button" class="lg-eye" data-act="lg-eye" aria-label="Show password">${ic('eye', 17)}</button></div><small class="lg-err" id="lg-e2"></small></div>
        <div class="lf-row"><label class="chk-row"><input type="checkbox" checked>Keep me signed in</label><a class="link-btn" data-act="toast" data-msg="Reset link sent to your work email">Forgot password?</a></div>
        <button class="btn primary lg block lg-go" type="submit" data-act="lg-submit"><span class="lg-t">Sign in</span><span class="lg-spin"></span></button>
        <div class="or"><span>or continue with</span></div>
        <div class="lg-alt"><button type="button" class="btn lg" data-act="toast" data-msg="Redirecting to Google…"><svg width="17" height="17" viewBox="0 0 24 24"><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.4z"/><path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.6 14.7a7.2 7.2 0 0 1 0-4.6v-3H1.8a12 12 0 0 0 0 10.8z"/><path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3A12 12 0 0 0 1.8 7.1l3.8 3c.9-2.7 3.4-5.3 6.4-5.3z"/></svg>Google</button><button type="button" class="btn lg" data-act="toast" data-msg="Single sign-on (SSO) is configured by your administrator">${ic('shield', 16)}Company SSO</button></div>
        <p class="fine">Not in HR? <a href="#/page/self-service">Open the employee self-service app</a></p>
        <p class="lg-sec">${ic('lock', 13)}Encrypted connection · Access is logged for audit</p>
      </form></main></div>`;
  };

  B.act['lg-eye'] = (t) => { const i = B.$('#lg-pw'); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; t.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); t.classList.toggle('on', show); };
  B.act['lg-submit'] = () => {
    const e = B.$('#lg-email'), p = B.$('#lg-pw'), f = B.$('#lg-form'); if (!e || f.classList.contains('busy')) return;
    const ok1 = /^\S+@\S+\.\S+$/.test(e.value.trim()), ok2 = p.value.length >= 6;
    B.$('#lg-e1').textContent = ok1 ? '' : 'Enter a valid work email'; B.$('#lg-e2').textContent = ok2 ? '' : 'Password must be at least 6 characters';
    e.classList.toggle('err', !ok1); p.classList.toggle('err', !ok2); if (!ok1 || !ok2) { f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); return; }
    f.classList.add('busy'); setTimeout(() => { location.hash = '#/'; }, 900);
  };
})();
