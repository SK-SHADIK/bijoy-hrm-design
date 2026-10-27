/* Bijoy HRMS — custom pages (part 1): Home, Module workspaces, Employee profile, Org chart, Attendance */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const E = B.EMPLOYEES;
  B.page = {};

  B.words = (() => {
    const o = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const t = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const two = (n) => (n < 20 ? o[n] : t[Math.floor(n / 10)] + (n % 10 ? '-' + o[n % 10] : ''));
    return (n) => {
      n = Math.round(n); let s = '';
      const cr = Math.floor(n / 1e7); n %= 1e7; const lk = Math.floor(n / 1e5); n %= 1e5; const th = Math.floor(n / 1e3); n %= 1e3; const h = Math.floor(n / 100); n %= 100;
      if (cr) s += two(cr) + ' Crore '; if (lk) s += two(lk) + ' Lakh '; if (th) s += two(th) + ' Thousand '; if (h) s += o[h] + ' Hundred ';
      if (n) s += (s ? 'and ' : '') + two(n);
      return s.trim() || 'Zero';
    };
  })();
  B.slipFor = (e) => {
    const g = e.salary, basic = Math.round(g * 0.5), hra = Math.round(g * 0.25), med = Math.round(g * 0.08), conv = Math.round(g * 0.05), fest = g - basic - hra - med - conv;
    const pf = Math.round(basic * 0.05), tax = Math.round(g > 120000 ? g * 0.06 : g > 70000 ? g * 0.03 : 0), pt = 200, loan = e.id.endsWith('7') ? 3000 : 0;
    const earn = [['Basic Salary', basic], ['House Rent Allowance', hra], ['Medical Allowance', med], ['Conveyance Allowance', conv], ['Festival / Performance Bonus', fest]];
    const ded = [['Provident Fund (5%)', pf], ['Income Tax (TDS)', tax], ['Professional Tax', pt]].concat(loan ? [['Loan Repayment', loan]] : []);
    const dt = ded.reduce((a, d) => a + d[1], 0);
    return { earn, ded, gross: g, dt, net: g - dt };
  };

  const head = (title, sub, actions, crumbs) => `<div class="page-head"><div>${crumbs ? B.crumbs(crumbs) : ''}<h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div><div class="head-actions">${actions || ''}</div></div>`;
  B.head = head;
  const kpi = (icon, label, value, delta, data, tone) => `<div class="card kpi ${tone || ''}"><div class="kpi-top"><span class="kpi-ic">${ic(icon, 18)}</span>${delta ? `<span class="delta ${delta[0] === '-' ? 'down' : 'up'}">${delta}</span>` : ''}</div><b>${value}</b><span>${label}</span>${data ? B.spark(data) : ''}</div>`;
  B.kpi = kpi;
  const mkSeries = (seed, n, lo, hi) => { const r = B.rng(seed); return Array.from({ length: n }, () => Math.round(lo + r() * (hi - lo))); };
  B.mkSeries = mkSeries;

  /* ================= HOME ================= */
  B.page.home = () => {
    const hr = new Date().getHours();
    const greet = hr < 12 ? ['শুভ সকাল', 'Good morning'] : hr < 17 ? ['শুভ অপরাহ্ন', 'Good afternoon'] : ['শুভ সন্ধ্যা', 'Good evening'];
    const days = Array.from({ length: 14 }, (_, i) => B.addDays(B.today, i - 13));
    const lab = days.map((d) => `${d.getDate()} ${B.MONTHS[d.getMonth()]}`);
    const deptCnt = B.DEPTS.map((d) => ({ label: d, value: E.filter((e) => e.dept === d).length }));
    const total = E.length;
    const stages = [['Applied', 248], ['Screened', 132], ['Interviewed', 64], ['Offered', 18], ['Hired', 11]];
    const appr = [
      ['Leave', 'Tasnim Rahman', 'Sick Leave · 2 days · 02–03 Oct', 'calendar'], ['Leave', 'Imran Hossain', 'Casual Leave · 1 day · 05 Oct', 'calendar'],
      ['Expense', 'Sadia Islam', 'Client visit · ৳ 8,450', 'card'], ['Attendance', 'Nazmul Haque', 'Work From Home · 3 days', 'user-check'],
      ['Shift', 'Mitu Rahman', 'Evening shift · 12–18 Oct', 'clock'], ['Advance', 'Arif Chowdhury', 'Travel advance · ৳ 25,000', 'moneyloan']
    ];
    const mods = B.NAV.filter((m) => !['selfservice', 'reports'].includes(m.id));
    return `<div class="home">
      <section class="hero"><div class="hero-in"><div><span class="eyebrow">${ic('sparkle', 14)} ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        <h1>${greet[1]}, Rahim</h1><p>You have <b>${appr.length} approvals</b> waiting, <b>3 interviews</b> today and payroll for September closes in <b>2 days</b>.</p>
        <div class="hero-actions"><button class="btn light" data-act="hero-checkin" id="hero-ci">${ic('fingerprint', 16)}Check In</button><a class="btn ghost-w" href="#/form/leave-application/new">${ic('calendar', 16)}Apply Leave</a><a class="btn ghost-w" href="#/page/payroll-process">${ic('zap', 16)}Run Payroll</a></div></div>
        <div class="hero-card"><div class="hc-t"><span>Today · Dhaka HQ</span>${B.pill('On Time', 'ok')}</div><div class="hc-time" id="hero-clock">--:--</div><div class="hc-s"><span>${ic('clock', 14)} Roster 09:30 – 18:30</span><span>${ic('wifi', 14)} Office network</span></div><div class="hc-bar"><i style="width:62%"></i></div><div class="hc-f"><span>Worked <b id="hero-worked">5h 32m</b></span><span>Break 45m</span></div></div></div></section>
      <section class="card pad myws"><div class="myws-h"><div>${B.avatar('Rahim Uddin', 40)}</div><div><h3 class="ct">My Workspace</h3><span>You are an employee too: your own attendance, leave, pay and todos.</span></div><a class="btn" href="#/page/my-dashboard">${ic('home', 15)}Open my dashboard</a></div>
        <div class="chips">${[['user', 'My Profile', '#/employee/HR-EMP-00001'], ['clock', 'My Attendance', '#/list/attendance'], ['calendar', 'Apply Leave', '#/form/leave-application/new'], ['pie', 'Leave Balance', '#/page/leave-balance'], ['file', 'My Payslips', '#/page/payslip'], ['card', 'Expense Claim', '#/form/expense-claim/new'], ['check-circle', 'My Todos', '#/page/todo']].map((c) => `<a class="chip" href="${c[2]}">${ic(c[0], 14)}${c[1]}</a>`).join('')}</div></section>
      <section class="kpis">${kpi('users', 'Total Employees', total, '+4.2%', mkSeries('k1', 12, 20, 40))}${kpi('user-check', 'Present Today', '21', '+2', mkSeries('k2', 12, 15, 24), 'ok')}${kpi('calendar', 'On Leave', '3', '-1', mkSeries('k3', 12, 1, 6), 'warn')}${kpi('briefcase', 'Open Positions', '9', '+3', mkSeries('k4', 12, 3, 12))}${kpi('inbox', 'Pending Approvals', appr.length, null, mkSeries('k5', 12, 3, 14), 'bad')}${kpi('dollar', 'Payroll (Sep)', B.money(E.reduce((a, e) => a + e.salary, 0)), '+1.8%', mkSeries('k6', 12, 24, 30))}</section>
      <section class="grid-3-2"><div class="card pad"><div class="ct-row"><h3 class="ct">Attendance overview</h3><div class="seg sm"><button class="on">14 days</button><button>30 days</button><button>90 days</button></div></div>
          ${B.area([{ name: 'Present', data: mkSeries('a', 14, 19, 25) }, { name: 'On Leave', data: mkSeries('b', 14, 1, 5), color: 'var(--c2)' }, { name: 'Absent', data: mkSeries('c', 14, 0, 3), color: 'var(--c5)' }], lab, { h: 230 })}
          <div class="legend-row"><span><i style="background:var(--c1)"></i>Present</span><span><i style="background:var(--c2)"></i>On Leave</span><span><i style="background:var(--c5)"></i>Absent</span></div></div>
        <div class="card pad"><h3 class="ct">Headcount by department</h3>${B.hbars(deptCnt, { multi: true })}</div></section>
      <section class="grid-3"><div class="card pad"><h3 class="ct">Hiring funnel</h3><div class="funnel">${stages.map((s, i) => `<div style="--w:${(s[1] / 248) * 100}%;--i:${i}"><span>${s[0]}</span><b>${s[1]}</b></div>`).join('')}</div></div>
        <div class="card pad"><h3 class="ct">Workforce mix</h3>${B.donut([{ label: 'Full-time', value: 20 }, { label: 'Contract', value: 3 }, { label: 'Intern', value: 2 }, { label: 'Part-time', value: 1 }], { center: 26, label: 'People' })}</div>
        <div class="card pad"><h3 class="ct">Leaves taken by type</h3>${B.vbars([{ label: 'Casual', value: 46 }, { label: 'Sick', value: 31 }, { label: 'Earned', value: 58 }, { label: 'Comp Off', value: 12 }, { label: 'LWP', value: 7 }], { h: 190, multi: true })}</div></section>
      <section class="grid-3-2"><div class="card pad"><div class="ct-row"><h3 class="ct">Pending approvals <span class="count" id="ap-count">${appr.length}</span></h3><a class="link-btn" href="#/list/leave-application">View all</a></div>
          <ul class="approvals" id="approvals">${appr.map((a) => `<li><span class="ap-ic">${ic(a[3], 16)}</span>${B.avatar(a[1], 34)}<div class="ap-t"><b>${a[1]}</b><span>${a[2]}</span></div><span class="pill mute">${a[0]}</span><div class="ap-b"><button class="btn sm ok" data-act="approve" data-r="1">${ic('check', 14)}Approve</button><button class="btn sm danger-o" data-act="approve" data-r="0">${ic('x', 14)}Reject</button></div></li>`).join('')}</ul></div>
        <div class="card pad"><h3 class="ct">Upcoming</h3><ul class="upc">
          ${[E[3], E[7], E[12]].map((e, i) => `<li><span class="up-ic bd">${ic('gift', 16)}</span>${B.avatar(e.name, 30)}<div><b>${e.name}</b><span>Birthday · ${B.fdate(B.addDays(B.today, i * 2 + 1)).slice(0, 6)}</span></div></li>`).join('')}
          ${[E[5], E[9]].map((e, i) => `<li><span class="up-ic an">${ic('award', 16)}</span>${B.avatar(e.name, 30)}<div><b>${e.name}</b><span>${i + 2}-year work anniversary</span></div></li>`).join('')}
          <li><span class="up-ic hl">${ic('coffee', 16)}</span><div class="pl"><b>Bijoya Dashami</b><span>Tue, 20 Oct · Public holiday</span></div></li>
          <li><span class="up-ic hl">${ic('coffee', 16)}</span><div class="pl"><b>Victory Day</b><span>Wed, 16 Dec · Public holiday</span></div></li></ul></div></section>
      <section class="grid-2"><div class="card pad"><div class="ct-row"><h3 class="ct">Notice Board</h3><a class="link-btn" href="#/page/announcements">See all</a></div>
          ${B.noticeWidget(3)}</div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Quick actions</h3></div><div class="qa">${[['user-plus', 'New Employee', '#/form/employee/new'], ['calendar', 'Leave Application', '#/form/leave-application/new'], ['card', 'Expense Claim', '#/form/expense-claim/new'], ['briefcase', 'Job Opening', '#/form/job-opening/new'], ['user-check', 'Mark Attendance', '#/page/attendance-tool'], ['file', 'Payslips', '#/list/salary-slip'], ['award', 'Appraisal', '#/list/appraisal'], ['bars', 'Reports', '#/page/reports']].map((q) => `<a href="${q[2]}"><span>${ic(q[0], 20)}</span>${q[1]}</a>`).join('')}</div></div></section>
      <section><div class="ct-row"><h3 class="ct">All modules</h3><span class="muted">Everything in Frappe HRMS, in one place</span></div><div class="mods">${mods.map((m) => `<a class="card mod" href="#/module/${m.id}"><span class="mod-ic">${ic(m.icon, 22)}</span><div><b>${m.label}</b><span>${m.desc}</span></div><em>${m.items.length}</em></a>`).join('')}</div></section></div>`;
  };
  B.act.approve = (t) => { const li = t.closest('li'), ok = t.dataset.r === '1'; li.classList.add('gone'); setTimeout(() => { li.remove(); const c = B.$('#ap-count'); if (c) c.textContent = B.$$('#approvals li').length; }, 250); B.toast(ok ? 'Request approved' : 'Request rejected', ok ? 'ok' : 'bad'); };
  let ciOn = false;
  B.act['hero-checkin'] = (t) => { ciOn = !ciOn; t.innerHTML = ic('fingerprint', 16) + (ciOn ? 'Check Out' : 'Check In'); B.toast(ciOn ? 'Checked in at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Checked out. See you tomorrow!'); };
  B.onHome = () => { const c = B.$('#hero-clock'); if (!c) return; const f = () => { const d = new Date(); if (c.isConnected) c.textContent = B.pad(d.getHours()) + ':' + B.pad(d.getMinutes()); else clearInterval(iv); }; const iv = setInterval(f, 15000); f(); };

  /* ================= MODULE WORKSPACE ================= */
  B.renderModule = (id) => {
    const m = B.NAV.find((n) => n.id === id); if (!m) return '<div class="empty">Module not found</div>';
    const items = m.items.map(B.navItem), docs = items.filter((i) => i.kind === 'l'), pages = items.filter((i) => i.kind === 'p');
    const reps = B.REPORTS.filter((r) => r.rmod === id);
    const first = docs[0] ? B.getRows(docs[0].id) : [];
    const tile = (i) => `<a class="card sc" href="${i.href}"><span class="sc-ic">${ic(i.icon, 20)}</span><div><b>${esc(i.label)}</b><span>${i.kind === 'l' ? B.getRows(i.id).length + ' records' : 'Tool / dashboard'}</span></div>${i.kind === 'l' ? `<span class="sc-add" data-act="go" data-href="#/form/${i.id}/new" title="New">${ic('plus', 15)}</span>` : ic('right', 16)}</a>`;
    return `<div class="module">${head(`<span class="mh-ic">${ic(m.icon, 26)}</span>${m.label}`, m.desc, `<a class="btn primary" href="${docs[0] ? '#/form/' + docs[0].id + '/new' : '#/'}">${ic('plus', 16)}New ${docs[0] ? esc(docs[0].label) : ''}</a>`, [{ label: 'HR', href: '#/' }, { label: m.label }])}
      <section class="kpis sm">${kpi(m.icon, docs[0] ? docs[0].label + ' records' : 'Tools', first.length || pages.length, '+' + (2 + first.length % 5))}${kpi('clock', 'Pending actions', 3 + (B.hash(id) % 9), null, null, 'warn')}${kpi('check-circle', 'Completed this month', 12 + (B.hash(id) % 40), '+8%', null, 'ok')}${kpi('bars', 'Reports available', reps.length || 1)}</section>
      ${pages.length ? `<h3 class="ct sec">Dashboards & Tools</h3><div class="sc-grid">${pages.map(tile).join('')}</div>` : ''}
      ${docs.length ? `<h3 class="ct sec">Documents</h3><div class="sc-grid">${docs.map(tile).join('')}</div>` : ''}
      ${reps.length ? `<h3 class="ct sec">Reports</h3><div class="sc-grid">${reps.map((r) => `<a class="card sc rep" href="#/list/rpt-${r.id}/report"><span class="sc-ic alt">${ic('bars', 20)}</span><div><b>${esc(r.label)}</b><span>${r.type}</span></div>${ic('right', 16)}</a>`).join('')}</div>` : ''}</div>`;
  };
  B.act.go = (t, e) => { e.preventDefault(); e.stopPropagation(); location.hash = t.dataset.href; };

  /* ================= EMPLOYEE PROFILE ================= */
  const monthHeat = (name, y, m) => {
    const r = B.rng(name + y + m), days = new Date(y, m + 1, 0).getDate(), off = new Date(y, m, 1).getDay();
    let cells = '', counts = { P: 0, A: 0, L: 0, H: 0, W: 0 };
    for (let i = 0; i < off; i++) cells += '<i class="hc out"></i>';
    for (let d = 1; d <= days; d++) {
      const wd = new Date(y, m, d).getDay(), fut = new Date(y, m, d) > B.today;
      let s;
      if (fut) s = 'f'; else if (wd === 5) s = 'off'; else { const x = r(); s = x < 0.76 ? 'P' : x < 0.82 ? 'A' : x < 0.89 ? 'L' : x < 0.93 ? 'H' : 'W'; counts[s]++; }
      cells += `<i class="hc ${s}" data-tip="${d} ${B.MONTHS[m]} · ${{ P: 'Present', A: 'Absent', L: 'On Leave', H: 'Half Day', W: 'Work From Home', off: 'Weekly off', f: '—' }[s]}"><b>${d}</b></i>`;
    }
    return { html: `<div class="hm-grid">${B.DAYS.map((d) => `<span class="${d === 'Fri' ? 'wk' : ''}">${d[0]}</span>`).join('')}${cells}</div>`, counts };
  };
  B.monthHeat = monthHeat;
  const legend = '<div class="legend-row hm-leg"><span><i class="lgd P"></i>Present</span><span><i class="lgd A"></i>Absent</span><span><i class="lgd L"></i>Leave</span><span><i class="lgd H"></i>Half day</span><span><i class="lgd W"></i>WFH</span><span><i class="lgd off"></i>Weekly off</span></div>';
  B.legendHeat = legend;
  const kv = (rows) => `<dl class="kv">${rows.map((r) => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('')}</dl>`;

  B.renderEmployee = (id) => {
    const e = B.emp(id) || E[3], mgr = e.mgr ? B.emp(e.mgr) : null, s = B.slipFor(e);
    const yrs = ((B.today - B.parse(e.doj)) / 31557600000).toFixed(1);
    const { html: heat, counts } = monthHeat(e.name, B.today.getFullYear(), B.today.getMonth());
    const lv = [['Casual Leave', 12, 4, 'var(--c1)'], ['Sick Leave', 10, 2, 'var(--c3)'], ['Earned Leave', 20, 6, 'var(--c2)'], ['Comp Off', 4, 1, 'var(--c4)']];
    const goals = [['Launch v2 payments module', 78], ['Reduce ticket resolution time by 20%', 55], ['Complete Frappe advanced certification', 92], ['Mentor two new joiners', 40]];
    const comp = [['Basic', s.earn[0][1]], ['HRA', s.earn[1][1]], ['Medical', s.earn[2][1]], ['Conveyance', s.earn[3][1]], ['Bonus', s.earn[4][1]]].map((c) => ({ label: c[0], value: c[1] }));
    return `<div class="profile">${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Employee', href: '#/list/employee' }, { label: e.id }])}
      <div class="card p-hero"><div class="p-cover"></div><div class="p-body"><div class="p-av">${B.avatar(e.name, 104)}<span class="online"></span></div>
        <div class="p-id"><h1>${esc(e.name)} ${B.pill(e.status)}</h1><p>${esc(e.desig)} · ${esc(e.dept)}</p><div class="chips"><span class="chip">${ic('hash', 12)}${e.id}</span><span class="chip">${ic('pin', 12)}${e.branch}</span><span class="chip">${ic('briefcase', 12)}${e.type}</span><span class="chip">${ic('mail', 12)}${e.email}</span></div></div>
        <div class="p-act"><button class="btn" data-act="toast" data-msg="Message composer opened">${ic('message', 16)}Message</button><a class="btn primary" href="#/form/employee/${e.id}">${ic('edit', 16)}Edit</a>${B.dd(`<button class="icon-btn bordered" data-act="dd">${ic('more')}</button>`, `<a href="#/form/employee-promotion/new" class="ddl">${ic('trend', 15)}Promote</a><a href="#/form/employee-transfer/new" class="ddl">${ic('refresh', 15)}Transfer</a><a href="#/form/employee-separation/new" class="ddl">${ic('user-minus', 15)}Separate</a><button data-act="toast" data-msg="Employee ID card generated">${ic('card', 15)}ID Card</button>`, 'right')}</div></div>
        <div class="p-stats"><div><b>${yrs} yrs</b><span>Tenure</span></div><div><b>${counts.P + counts.W}/${counts.P + counts.W + counts.A + counts.L + counts.H}</b><span>Days present</span></div><div><b>${lv.reduce((a, l) => a + l[2], 0)}</b><span>Leaves taken</span></div><div><b>4.5 ★</b><span>Last rating</span></div><div><b>${B.money(e.salary)}</b><span>Monthly gross</span></div></div></div>
      <div class="tabs pt">${['Overview', 'Attendance', 'Leaves', 'Payroll', 'Assets', 'Documents', 'Performance', 'Timeline'].map((t, i) => `<button class="${i ? '' : 'on'}" data-act="ptab" data-t="${t.toLowerCase()}">${t}</button>`).join('')}</div>
      <div class="ptab" id="pt-overview"><div class="grid-2-1"><div class="card pad"><h3 class="ct">Personal information</h3>${kv([['Date of birth', B.fdate(e.dob)], ['Gender', e.gender], ['Blood group', ['A+', 'B+', 'O+', 'AB+'][B.hash(e.id) % 4]], ['Marital status', ['Single', 'Married'][B.hash(e.name) % 2]], ['Mobile', e.phone], ['Personal email', e.first.toLowerCase() + '@gmail.com'], ['Current address', 'House 12, Road 5, Dhanmondi, Dhaka'], ['National ID', '19' + String(B.hash(e.id)).slice(0, 8) + '4471']])}
          <h3 class="ct sec">Job details</h3>${kv([['Company', B.COMPANY], ['Department', e.dept], ['Designation', e.desig], ['Grade', e.grade], ['Branch', e.branch], ['Date of joining', B.fdate(e.doj)], ['Employment type', e.type], ['Default shift', 'General (10-7)'], ['Holiday list', 'Bangladesh 2026'], ['Notice period', '60 days']])}</div>
        <div class="stack"><div class="card pad"><h3 class="ct">Reports to</h3>${mgr ? `<a class="who-row" href="#/employee/${mgr.id}">${B.avatar(mgr.name, 44)}<div><b>${mgr.name}</b><span>${mgr.desig}</span></div>${ic('right', 16)}</a>` : '<span class="muted">Top of organisation</span>'}
          <h3 class="ct sec">Emergency contact</h3>${kv([['Name', 'Rokeya Begum'], ['Relation', 'Mother'], ['Phone', '+880 1711-223344']])}</div>
          <div class="card pad"><h3 class="ct">Bank account</h3>${kv([['Bank', 'BRAC Bank'], ['Account no.', '•••• •••• 7741'], ['Routing no.', '060261726']])}</div>
          <div class="card pad"><h3 class="ct">Skills</h3><div class="chips">${['Python', 'Frappe', 'JavaScript', 'MariaDB', 'Communication', 'Leadership'].map((s2) => `<span class="chip">${s2}</span>`).join('')}</div></div></div></div></div>
      <div class="ptab" id="pt-attendance" hidden><div class="grid-2-1"><div class="card pad"><h3 class="ct">${B.MONTHS_FULL[B.today.getMonth()]} ${B.today.getFullYear()} attendance</h3>${heat}${legend}</div>
        <div class="card pad"><h3 class="ct">This month</h3><div class="mini-stats">${[['Present', counts.P, 'ok'], ['Absent', counts.A, 'bad'], ['On Leave', counts.L, 'warn'], ['Half Day', counts.H, 'warn'], ['WFH', counts.W, 'info']].map((c) => `<div class="${c[2]}"><b>${c[1]}</b><span>${c[0]}</span></div>`).join('')}</div>
        <h3 class="ct sec">Recent check-ins</h3><ul class="feed">${[0, 1, 2, 3].map((i) => `<li>${B.pill(i % 2 ? 'OUT' : 'IN')}<span>${B.fdate(B.addDays(B.today, -Math.floor(i / 2)))} · ${i % 2 ? '19:04' : '09:52'}</span><em>${i % 2 ? 'Biometric Gate A' : 'Mobile App'}</em></li>`).join('')}</ul></div></div></div>
      <div class="ptab" id="pt-leaves" hidden><div class="rings">${lv.map((l) => `<div class="card pad ring-c">${B.ring(((l[1] - l[2]) / l[1]) * 100, 110, l[1] - l[2], 'left', l[3])}<b>${l[0]}</b><span>${l[2]} used of ${l[1]}</span></div>`).join('')}</div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Leave history</h3><a class="btn sm primary" href="#/form/leave-application/new">${ic('plus', 14)}Apply</a></div><div class="tscroll"><table class="dt"><thead><tr><th>Leave type</th><th>From</th><th>To</th><th class="r">Days</th><th>Status</th></tr></thead><tbody>${B.getRows('leave-application').slice(0, 5).map((r) => `<tr><td>${r.vals[1]}</td><td>${B.fdate(r.vals[2])}</td><td>${B.fdate(r.vals[3])}</td><td class="r">${r.vals[4]}</td><td>${B.pill(r.vals[5])}</td></tr>`).join('')}</tbody></table></div></div></div>
      <div class="ptab" id="pt-payroll" hidden><div class="grid-2"><div class="card pad"><h3 class="ct">CTC breakdown (monthly)</h3>${B.donut(comp, { center: B.short(s.gross), label: 'Gross / mo', fmt: B.short })}</div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Recent payslips</h3><a class="link-btn" href="#/page/payslip">Open viewer</a></div><ul class="feed slips">${[0, 1, 2, 3, 4, 5].map((i) => { const d = new Date(B.today.getFullYear(), B.today.getMonth() - i, 1); return `<li><span class="up-ic bd">${ic('file', 16)}</span><div><b>${B.MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}</b><span>Net ${B.money(s.net)}</span></div>${B.pill(i ? 'Paid' : 'Draft')}<button class="icon-btn sm" data-act="toast" data-msg="Payslip downloaded">${ic('download', 15)}</button></li>`; }).join('')}</ul></div></div></div>
      <div class="ptab" id="pt-assets" hidden>${B.assetsFor(e.id)}</div>
      <div class="ptab" id="pt-documents" hidden><div class="docs-grid">${[['Appointment Letter.pdf', '182 KB'], ['National ID (front).jpg', '1.1 MB'], ['Academic Certificates.pdf', '3.4 MB'], ['Offer Letter.pdf', '210 KB'], ['NDA Signed.pdf', '96 KB'], ['Passport Photo.png', '412 KB']].map((f) => `<div class="card doc">${ic(f[0].endsWith('pdf') ? 'file' : 'eye', 26)}<b>${f[0]}</b><span>${f[1]}</span></div>`).join('')}<div class="card doc add" data-act="toast" data-msg="File picker opened">${ic('upload', 24)}<b>Upload document</b></div></div></div>
      <div class="ptab" id="pt-performance" hidden><div class="grid-2"><div class="card pad"><h3 class="ct">Current goals</h3>${goals.map((g) => `<div class="goal-r"><span>${g[0]}</span>${B.prog(g[1])}</div>`).join('')}</div>
        <div class="card pad"><h3 class="ct">Appraisal history</h3><ul class="feed">${[['H1 2026 Review', 4.5], ['FY 2025 Annual', 4.0], ['FY 2024 Annual', 3.5]].map((a) => `<li><div><b>${a[0]}</b><span>Manager score</span></div>${B.stars(a[1])}</li>`).join('')}</ul></div></div></div>
      <div class="ptab" id="pt-timeline" hidden><div class="card pad timeline"><ul>${[['Promoted to ' + e.desig, 'trend', '2 months ago'], ['Completed Frappe Bootcamp training', 'grad', '4 months ago'], ['Transferred to ' + e.branch, 'refresh', '1 year ago'], ['Probation confirmed', 'check-circle', '1.5 years ago'], ['Joined ' + B.COMPANY, 'user-plus', B.fdate(e.doj)]].map((t) => `<li><i>${ic(t[1], 13)}</i><div><span>${t[0]}</span><em>${t[2]}</em></div></li>`).join('')}</ul></div></div></div>`;
  };
  B.act.ptab = (t) => { B.$$('.pt button').forEach((b) => b.classList.toggle('on', b === t)); B.$$('.ptab').forEach((p) => (p.hidden = p.id !== 'pt-' + t.dataset.t)); };

  /* ================= ORG CHART ================= */
  B.page.orgchart = () => {
    const kids = (id) => E.filter((e) => e.mgr === id);
    const node = (e, depth) => {
      const k = kids(e.id);
      return `<li><div class="node ${depth === 0 ? 'root' : ''}" ${k.length ? `data-act="orgtg"` : ''}>${B.avatar(e.name, 40)}<b>${esc(e.name)}</b><span>${esc(e.desig)}</span>${k.length ? `<em>${ic('down', 12)}${k.length}</em>` : ''}</div>${k.length ? `<ul class="${depth >= 1 ? 'closed' : ''}">${k.map((c) => node(c, depth + 1)).join('')}</ul>` : ''}</li>`;
    };
    return `${head('Organization Chart', 'Reporting structure across Bijoy Technologies Ltd.', `<button class="btn" data-act="orgall" data-o="1">${ic('plus', 15)}Expand all</button><button class="btn" data-act="orgall" data-o="0">${ic('up', 15)}Collapse</button><div class="seg"><button data-act="orgzoom" data-z="-.1">−</button><button data-act="orgzoom" data-z=".1">+</button></div>`, [{ label: 'HR', href: '#/' }, { label: 'Organization Chart' }])}
      <div class="card org-wrap"><div class="org-scroll"><div class="tree" id="tree" style="--z:1"><ul>${node(E[0], 0)}</ul></div></div></div>`;
  };
  B.act.orgtg = (t) => { const ul = t.nextElementSibling; if (ul) ul.classList.toggle('closed'); };
  B.act.orgall = (t) => B.$$('#tree ul ul').forEach((u) => u.classList.toggle('closed', t.dataset.o === '0'));
  let zoom = 1;
  B.act.orgzoom = (t) => { zoom = Math.max(0.5, Math.min(1.4, zoom + +t.dataset.z)); B.$('#tree').style.setProperty('--z', zoom); };

  /* ================= ATTENDANCE ================= */
  B.page['attendance-dash'] = () => {
    const chk = B.getRows('employee-checkin').slice(0, 7);
    const dep = B.DEPTS.map((d, i) => ({ label: d, value: 78 + ((B.hash(d) % 22)) }));
    const st = [['Present', 21, 'user-check', 'ok'], ['Absent', 1, 'user-minus', 'bad'], ['Late', 4, 'clock', 'warn'], ['On Leave', 3, 'calendar', 'warn'], ['Work From Home', 2, 'wifi', 'info'], ['Half Day', 1, 'coffee', 'warn']];
    const opts = E.map((e) => `<option value="${e.id}">${e.name}</option>`).join('');
    return `${head('Attendance Dashboard', `Live view · ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`, `<a class="btn" href="#/page/upload-attendance">${ic('upload', 16)}Upload</a><a class="btn primary" href="#/page/attendance-tool">${ic('user-check', 16)}Mark Attendance</a>`, [{ label: 'HR', href: '#/' }, { label: 'Attendance Dashboard' }])}
      <section class="kpis six">${st.map((s) => kpi(s[2], s[0], s[1], null, null, s[3])).join('')}</section>
      <section class="grid-3-2"><div class="card pad"><div class="ct-row"><h3 class="ct">Employee attendance</h3><select class="inp sm" data-chg="att-emp">${opts}</select></div><div id="att-heat">${B.monthHeat(E[3].name, B.today.getFullYear(), B.today.getMonth()).html}</div>${legend}</div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Live check-ins</h3><span class="live"><i></i>Live</span></div><ul class="feed live-feed">${chk.map((r) => `<li>${B.avatar(r.vals[0], 32)}<div><b>${r.vals[0]}</b><span>${r.vals[3]} · ${r.vals[4]}</span></div>${B.pill(r.vals[1])}<em>${B.fdt(r.vals[2]).slice(-5)}</em></li>`).join('')}</ul></div></section>
      <section class="grid-3"><div class="card pad"><h3 class="ct">Attendance % by department</h3>${B.hbars(dep, { multi: true, fmt: (v) => v + '%' })}</div>
        <div class="card pad"><h3 class="ct">Check-in time distribution</h3>${B.vbars([['08', 2], ['09', 9], ['10', 11], ['11', 3], ['12', 1]].map((x) => ({ label: x[0] + ':00', value: x[1] })), { h: 180 })}</div>
        <div class="card pad"><h3 class="ct">Late arrivals</h3><ul class="feed">${[E[10], E[14], E[17], E[20]].map((e, i) => `<li>${B.avatar(e.name, 30)}<div><b>${e.name}</b><span>${e.dept}</span></div><span class="pill warn"><i></i>+${8 + i * 7} min</span></li>`).join('')}</ul></div></section>`;
  };
  B.chg['att-emp'] = (t) => { const e = B.emp(t.value); B.$('#att-heat').innerHTML = B.monthHeat(e.name, B.today.getFullYear(), B.today.getMonth()).html; };

  B.page['attendance-tool'] = () => {
    const rows = E.slice(0, 14);
    return `${head('Employee Attendance Tool', 'Mark attendance for multiple employees in one go', `<button class="btn" data-act="att-all" data-s="Present">${ic('check', 15)}Mark all Present</button><button class="btn primary" data-act="toast" data-msg="Attendance marked for 14 employees">${ic('check-circle', 16)}Mark Attendance</button>`, [{ label: 'HR', href: '#/' }, { label: 'Attendance' }, { label: 'Attendance Tool' }])}
      <div class="card pad"><div class="fgrid f4"><div class="fld"><label>Date</label><input class="inp" type="date" value="${B.iso(B.today)}"></div><div class="fld"><label>Company</label><select class="inp"><option>${B.COMPANY}</option></select></div><div class="fld"><label>Department</label><select class="inp"><option>All</option>${B.DEPTS.map((d) => `<option>${d}</option>`).join('')}</select></div><div class="fld"><label>Branch</label><select class="inp"><option>All</option>${B.BRANCHES.map((d) => `<option>${d}</option>`).join('')}</select></div></div></div>
      <div class="card table-card"><div class="tscroll"><table class="dt att-t"><thead><tr><th>Employee</th><th>Department</th><th>Status</th><th>Late</th></tr></thead><tbody>${rows.map((e) => `<tr><td><span class="who">${B.avatar(e.name, 30)}<span><b>${e.name}</b><em class="sub">${e.id}</em></span></span></td><td>${e.dept}</td><td><div class="seg att-seg">${['Present', 'Absent', 'Half Day', 'WFH', 'On Leave'].map((s, i) => `<button class="${i === 0 ? 'on ' : ''}s-${s.replace(' ', '')}" data-act="att-set">${s}</button>`).join('')}</div></td><td><label class="switch"><input type="checkbox"><i></i></label></td></tr>`).join('')}</tbody></table></div></div>`;
  };
  B.act['att-set'] = (t) => { B.$$('button', t.parentNode).forEach((b) => b.classList.toggle('on', b === t)); };
  B.act['att-all'] = () => { B.$$('.att-seg').forEach((s) => B.$$('button', s).forEach((b, i) => b.classList.toggle('on', i === 0))); B.toast('All marked Present'); };

  B.page['upload-attendance'] = () => `${head('Upload Attendance', 'Bulk import attendance from a CSV/Excel file', `<button class="btn" data-act="toast" data-msg="Template downloaded">${ic('download', 16)}Download Template</button>`, [{ label: 'HR', href: '#/' }, { label: 'Attendance' }, { label: 'Upload Attendance' }])}
    <div class="grid-2-1"><div class="card pad"><div class="fgrid"><div class="fld"><label>From Date</label><input class="inp" type="date" value="${B.iso(B.addDays(B.today, -30))}"></div><div class="fld"><label>To Date</label><input class="inp" type="date" value="${B.iso(B.today)}"></div></div>
      <label class="drop" id="drop">${ic('upload', 34)}<b>Drag & drop your file here</b><span>or click to browse · .csv, .xlsx up to 10 MB</span><input type="file" hidden data-chg="up-file"></label><div id="up-prog" class="up-prog" hidden><span id="up-name"></span>${B.prog(0)}</div>
      <div class="ch-f"><button class="btn primary" data-act="toast" data-msg="Import started in the background">${ic('check', 15)}Upload and Import</button></div></div>
      <div class="card pad"><h3 class="ct">Import guidelines</h3><ul class="checks"><li>${ic('check-circle', 16)}Use the downloaded template — do not rename columns</li><li>${ic('check-circle', 16)}Date format: <b>YYYY-MM-DD</b></li><li>${ic('check-circle', 16)}Status: Present, Absent, Half Day, Work From Home</li><li>${ic('check-circle', 16)}Existing records are overwritten only if enabled in HR Settings</li></ul></div></div>
    <div class="card table-card"><div class="card-h"><h3 class="ct">Recent imports</h3></div><div class="tscroll"><table class="dt"><thead><tr><th>File</th><th>Rows</th><th>Imported by</th><th>Date</th><th>Status</th></tr></thead><tbody>${[['attendance_sep_w4.xlsx', 182, 'Farhana Akter', 1, 'Completed'], ['attendance_sep_w3.csv', 176, 'Farhana Akter', 8, 'Completed'], ['zk_export_aug.csv', 640, 'Mitu Rahman', 30, 'Failed']].map((r) => `<tr><td>${r[0]}</td><td class="r">${r[1]}</td><td>${r[2]}</td><td>${B.fdate(B.addDays(B.today, -r[3]))}</td><td>${B.pill(r[4])}</td></tr>`).join('')}</tbody></table></div></div>`;
  B.chg['up-file'] = (t) => { const f = t.files[0]; if (!f) return; B.$('#up-prog').hidden = false; B.$('#up-name').textContent = f.name; let p = 0; const bar = B.$('#up-prog .prog i'), em = B.$('#up-prog em'); const iv = setInterval(() => { p += 12; bar.style.width = Math.min(p, 100) + '%'; em.textContent = Math.min(p, 100) + '%'; if (p >= 100) { clearInterval(iv); B.toast('File validated'); } }, 120); };

  const SH = { M: ['Morning', 'c1'], G: ['General', 'c3'], E: ['Evening', 'c4'], N: ['Night', 'c2'], O: ['Off', 'off'], L: ['Leave', 'lv'] };
  B.page['shift-roster'] = () => {
    const wk = Array.from({ length: 7 }, (_, i) => B.addDays(B.addDays(B.today, -B.today.getDay()), i));
    const rows = E.slice(3, 17);
    return `${head('Shift Roster', 'Weekly shift assignments · drag to reassign (design preview)', `<div class="seg"><button data-act="toast" data-msg="Previous week">${ic('left', 15)}</button><button class="on">This week</button><button data-act="toast" data-msg="Next week">${ic('right', 15)}</button></div><button class="btn primary" data-act="toast" data-msg="Shift Assignment tool opened">${ic('plus', 16)}Assign Shifts</button>`, [{ label: 'HR', href: '#/' }, { label: 'Shift & Attendance' }, { label: 'Shift Roster' }])}
      <div class="legend-row roster-leg">${Object.values(SH).map((s) => `<span><i class="sh ${s[1]}"></i>${s[0]}</span>`).join('')}</div>
      <div class="card table-card"><div class="tscroll"><table class="roster"><thead><tr><th>Employee</th>${wk.map((d) => `<th class="${d.getDay() === 5 ? 'wk' : ''} ${B.iso(d) === B.iso(B.today) ? 'today' : ''}"><span>${B.DAYS[d.getDay()]}</span><b>${d.getDate()}</b></th>`).join('')}</tr></thead><tbody>${rows.map((e) => { const r = B.rng('ro' + e.id); const base = ['M', 'G', 'E', 'N'][B.hash(e.id) % 4]; return `<tr><td><span class="who">${B.avatar(e.name, 28)}<span><b>${e.name}</b><em class="sub">${e.dept}</em></span></span></td>${wk.map((d) => { const k = d.getDay() === 5 ? 'O' : r() > 0.9 ? 'L' : r() > 0.85 ? 'G' : base; const s = SH[k]; return `<td class="${d.getDay() === 5 ? 'wk' : ''}"><span class="sh ${s[1]}" draggable="true">${k === 'O' || k === 'L' ? s[0] : s[0]}</span></td>`; }).join('')}</tr>`; }).join('')}</tbody></table></div></div>`;
  };
})();
