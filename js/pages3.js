/* Bijoy HRMS — Employee (self-service) dashboard */
(function () {
  const B = window.B;
  const { ic, esc, kpi, mkSeries } = B;
  B.ME = B.emp('HR-EMP-00015');
  B.ADMIN_EMP = B.emp('HR-EMP-00001'); // the admin is also an employee

  B.page.me = (who) => {
    const e = who || B.ME, mgr = B.emp(e.mgr), s = B.slipFor(e);
    const hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    const { html: heat, counts } = B.monthHeat(e.name, B.today.getFullYear(), B.today.getMonth());
    const lv = [['Casual', 12, 4, 'var(--c1)'], ['Sick', 10, 2, 'var(--c5)'], ['Earned', 20, 6, 'var(--c3)'], ['Comp Off', 4, 1, 'var(--c4)']];
    const left = lv.reduce((a, l) => a + l[1] - l[2], 0);
    const mates = B.EMPLOYEES.filter((x) => x.dept === e.dept && x.id !== e.id).slice(0, 5);
    const reqs = [['Sick Leave', '02–03 Oct · 2 days', 'Open', 'calendar'], ['Client visit expense', '৳ 8,450', 'Approved', 'card'], ['Casual Leave', '14 Sep · 1 day', 'Approved', 'calendar'], ['Work From Home', '20–22 Sep', 'Approved', 'user-check'], ['Travel advance', '৳ 25,000', 'Rejected', 'moneyloan']];
    const goals = [['Launch v2 payments module', 78], ['Reduce ticket resolution time', 55], ['Frappe advanced certification', 92]];
    const todo = [['Complete self review — H1 2026', 'Due in 3 days', 'award', 'warn'], ['Submit tax exemption proof', 'Due 15 Oct', 'percent', 'warn'], ['Acknowledge new leave policy', 'Pending', 'file', 'info']];
    return `<div class="home me">
      <section class="hero"><div class="hero-in"><div><span class="eyebrow">${ic('sparkle', 14)} ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        <h1>${greet}, ${esc(e.first)}</h1><p>You have <b>3 tasks</b> to complete, <b>${left} leave days</b> available and your September payslip is <b>ready</b>.</p>
        <div class="hero-actions"><a class="btn light" href="#/form/leave-application/new">${ic('calendar', 16)}Apply Leave</a><a class="btn ghost-w" href="#/form/expense-claim/new">${ic('card', 16)}Expense Claim</a><a class="btn ghost-w" href="#/form/attendance-request/new">${ic('edit', 16)}Attendance Request</a></div></div>
        <div class="hero-card"><div class="hc-t"><span>${ic('pin', 13)} Dhaka HQ · Normal roster</span><span class="pill warn" id="me-st"><i></i>Not checked in</span></div><div class="hc-time" id="me-time">--:--</div>
          <div class="hc-s"><span>${ic('clock', 14)} Roster 09:30 – 18:30</span><span>${ic('wifi', 14)} Within office radius</span></div>
          <button class="btn light block me-ci" id="me-ci" data-act="me-ci">${ic('fingerprint', 16)}Check In</button><div class="hc-f"><span>Worked <b id="me-w">0h 00m</b></span><span>Break 45m</span></div></div></div></section>
      <section class="kpis">${kpi('user-check', 'Present this month', counts.P + counts.W, '+2', mkSeries('e1', 12, 12, 24), 'ok')}${kpi('calendar', 'Leave balance', left + ' d', null, mkSeries('e2', 12, 10, 30))}${kpi('clock', 'Late marks', counts.H + 1, null, mkSeries('e3', 12, 0, 5), 'warn')}${kpi('dollar', 'Last net pay', B.money(s.net), '+1.2%', mkSeries('e4', 12, 20, 30))}${kpi('inbox', 'Open requests', 1, null, null, 'bad')}${kpi('target', 'Goal progress', '75%', '+8%', mkSeries('e5', 12, 30, 80))}</section>
      <section class="card pad" style="margin-bottom:18px"><div class="ct-row"><h3 class="ct">Notice Board</h3><a class="link-btn" href="#/page/announcements">See all</a></div>${B.noticeWidget(3)}</section>
      <section class="grid-3-2"><div class="card pad"><div class="ct-row"><h3 class="ct">My attendance · ${B.MONTHS_FULL[B.today.getMonth()]}</h3><a class="link-btn" href="#/list/attendance">History</a></div>${heat}${B.legendHeat}</div>
        <div class="stack"><div class="card pad"><div class="ct-row"><h3 class="ct">My leave balance</h3><a class="link-btn" href="#/page/leave-balance">Details</a></div><div class="me-rings">${lv.map((l) => `<div>${B.ring(((l[1] - l[2]) / l[1]) * 100, 84, l[1] - l[2], '', l[3])}<span>${l[0]}</span></div>`).join('')}</div></div>
          ${B.todoCard()}</div></section>
      <section class="card pad" style="margin-bottom:18px"><div class="ct-row"><h3 class="ct">My Assets</h3><a class="link-btn" href="#/page/my-assets">See all</a></div>${B.assetWidget(e.id)}</section>
      <section class="grid-3-2"><div class="card table-card"><div class="card-h"><h3 class="ct">My requests</h3><a class="link-btn" href="#/list/leave-application">View all</a></div><div class="tscroll"><table class="dt"><tbody>${reqs.map((r) => `<tr><td><span class="who"><span class="ap-ic">${ic(r[3], 16)}</span><span><b>${r[0]}</b><em class="sub">${r[1]}</em></span></span></td><td class="r">${B.pill(r[2])}</td></tr>`).join('')}</tbody></table></div></div>
        <div class="card pad me-slip"><div class="ct-row"><h3 class="ct">Latest payslip</h3>${B.pill('Draft')}</div><b class="big">${B.money(s.net)}</b><span class="muted">${B.MONTHS_FULL[B.today.getMonth()]} ${B.today.getFullYear()} · net pay</span>
          <div class="mini-stats slip-ms"><div><b>${B.short(s.gross)}</b><span>Gross</span></div><div><b>${B.short(s.dt)}</b><span>Deductions</span></div></div>
          <div class="ch-f"><a class="btn sm primary" href="#/page/payslip">${ic('eye', 14)}View</a><button class="btn sm" data-act="toast" data-msg="Payslip downloaded">${ic('download', 14)}Download</button></div></div></section>
      <section class="grid-3"><div class="card pad"><h3 class="ct">My goals</h3>${goals.map((g) => `<div class="goal-r"><span>${g[0]}</span>${B.prog(g[1])}</div>`).join('')}<a class="link-btn" href="#/page/goals">All goals →</a></div>
        <div class="card pad"><h3 class="ct">My team</h3>${mgr ? `<a class="who-row" href="#/employee/${mgr.id}">${B.avatar(mgr.name, 40)}<div><b>${mgr.name}</b><span>Reporting manager · ${mgr.desig}</span></div></a>` : ''}<ul class="feed">${mates.map((m) => `<li>${B.avatar(m.name, 30)}<div><b>${m.name}</b><span>${m.desig}</span></div><span class="dot ${m.status === 'On Leave' ? 'warn' : 'ok'}"></span></li>`).join('')}</ul></div>
        <div class="card pad"><h3 class="ct">Upcoming</h3><ul class="upc">${[['Bijoya Dashami', 'Tue, 20 Oct · Public holiday', 'hl', 'coffee'], ['Victory Day', 'Wed, 16 Dec · Public holiday', 'hl', 'coffee'], [B.EMPLOYEES[3].name + "'s birthday", 'In 2 days', 'bd', 'gift'], ['Q3 town-hall', 'Thursday, 4 PM', 'an', 'award']].map((u) => `<li><span class="up-ic ${u[2]}">${ic(u[3], 16)}</span><div><b>${u[0]}</b><span>${u[1]}</span></div></li>`).join('')}</ul></div></section></div>`;
  };
  let on = false, t0 = 0, iv;
  B.act['me-ci'] = (t) => {
    on = !on; const st = B.$('#me-st');
    t.innerHTML = ic('fingerprint', 16) + (on ? 'Check Out' : 'Check In');
    st.className = 'pill ' + (on ? 'ok' : 'warn'); st.innerHTML = '<i></i>' + (on ? 'Checked in' : 'Checked out');
    clearInterval(iv);
    if (on) { t0 = Date.now(); iv = setInterval(() => { const m = Math.floor((Date.now() - t0) / 60000); const w = B.$('#me-w'); if (w) w.textContent = Math.floor(m / 60) + 'h ' + B.pad(m % 60) + 'm'; }, 5000); }
    B.toast(on ? 'Checked in at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Checked out. See you tomorrow!');
  };
  B.page['my-dashboard'] = () => B.page.me(B.ADMIN_EMP);
  B.onMe = () => { const c = B.$('#me-time'); if (!c) return; const f = () => { const d = new Date(); c.textContent = B.pad(d.getHours()) + ':' + B.pad(d.getMinutes()); }; f(); setInterval(() => { if (c.isConnected) f(); }, 15000); };
})();
