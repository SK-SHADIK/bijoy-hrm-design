/* Sentradesk HRMS — Attendance Dashboard: today's snapshot, live check-ins, employee month view, weekly trend, late & absent lists */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const E = B.EMPLOYEES;
  const MFULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const iso0 = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const cal = { y: B.today.getFullYear(), m: B.today.getMonth(), sel: iso0(B.today) };
  const DOWS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  let feed = 'all';

  const kp = (i, l, v, c, sub) => `<div class="card ivk"><span class="ivk-i ${c || ''}">${ic(i, 18)}</span><div><b>${v}</b><span>${l}</span>${sub ? `<em class="ld-sub">${sub}</em>` : ''}</div></div>`;
  const live = () => B.getRows('employee-checkin').slice(0, 12);
  /* company-wide attendance for one day (deterministic sample data) */
  const dayInfo = (k) => {
    const d = new Date(k + 'T00:00'), t0 = new Date(B.today.getFullYear(), B.today.getMonth(), B.today.getDate());
    if (d > t0) return { f: 1 };
    if (d.getDay() === 5) return { off: 1 };
    const staff = E.filter((x) => x.status !== 'Left'), r = B.rng('att-co' + k), pick = (n, off) => { const o = []; for (let i = 0; i < n; i++) o.push(staff[Math.floor(r() * staff.length)]); return o.filter((x, i, a) => a.indexOf(x) === i); };
    let A, L, H, W, late;
    if (+d === +t0) { A = 1; L = 3; H = 1; W = 2; late = 4; } else { A = Math.floor(r() * 4); L = 1 + Math.floor(r() * 4); H = Math.floor(r() * 3); W = Math.floor(r() * 4); late = Math.floor(r() * 6); }
    const exp = staff.length + 2, P = Math.max(0, exp - A - L - H - W), pct = Math.round(((P + W + H * 0.5) / exp) * 100);
    return { P, A, L, H, W, late, exp, pct, who: { A: pick(A), L: pick(L), H: pick(H), W: pick(W), late: pick(late) } };
  };
  const monthAgg = () => { const n = new Date(cal.y, cal.m + 1, 0).getDate(), g = { P: 0, A: 0, L: 0, H: 0, W: 0, late: 0, exp: 0, days: 0, best: null, worst: null }; for (let i = 1; i <= n; i++) { const k = cal.y + '-' + B.pad(cal.m + 1) + '-' + B.pad(i), x = dayInfo(k); if (x.f || x.off) continue; g.days++; ['P', 'A', 'L', 'H', 'W', 'late', 'exp'].forEach((f) => { g[f] += x[f]; }); if (!g.best || x.pct > g.best.pct) g.best = { k, pct: x.pct }; if (!g.worst || x.pct < g.worst.pct) g.worst = { k, pct: x.pct }; } g.pct = g.exp ? Math.round(((g.P + g.W + g.H * 0.5) / g.exp) * 100) : 0; return g; };
  const calHtml = () => {
    const g = monthAgg(), first = new Date(cal.y, cal.m, 1), days = new Date(cal.y, cal.m + 1, 0).getDate(), t0 = iso0(B.today);
    let cells = ''; for (let i = 0; i < first.getDay(); i++) cells += '<div class="ac out"></div>';
    for (let i = 1; i <= days; i++) {
      const k = cal.y + '-' + B.pad(cal.m + 1) + '-' + B.pad(i), x = dayInfo(k), cls = x.off ? 'off' : x.f ? 'fut' : x.pct >= 92 ? 'good' : x.pct >= 85 ? 'mid' : 'low';
      cells += `<div class="ac ${cls} ${k === t0 ? 'today' : ''} ${k === cal.sel ? 'sel' : ''}" data-act="at-day" data-d="${k}" ${x.f || x.off ? '' : `data-tip="${x.P} present · ${x.A} absent · ${x.L} leave · ${x.W} WFH · ${x.late} late"`}><b>${i}</b>${x.f ? '' : x.off ? '<em>Off</em>' : `<strong>${x.pct}%</strong><span class="ab"><u style="flex:${x.P + x.W};background:var(--ok)"></u><u style="flex:${x.H};background:var(--warn)"></u><u style="flex:${x.L};background:var(--c4)"></u><u style="flex:${x.A};background:var(--bad)"></u></span>`}</div>`;
    }
    const sx = dayInfo(cal.sel), lab = new Date(cal.sel + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    const grp = (t, key, tone) => (sx.who[key] && sx.who[key].length ? `<div class="ad-g ${tone}"><b>${t} <small>${sx.who[key].length}</small></b><div>${sx.who[key].map((e) => `<span class="ad-p">${B.avatar(e.name, 22)}${esc(e.name.split(' ')[0])}</span>`).join('')}</div></div>` : '');
    const det = sx.f ? '<p class="muted" style="margin:0">Future date, no attendance yet.</p>' : sx.off ? '<p class="muted" style="margin:0">Weekly off (Friday).</p>' : `<div class="ad-n"><div><b>${sx.pct}%</b><span>attendance</span></div><div><b>${sx.P}</b><span>Present</span></div><div><b>${sx.late}</b><span>Late</span></div><div><b>${sx.A}</b><span>Absent</span></div><div><b>${sx.L}</b><span>Leave</span></div><div><b>${sx.W}</b><span>WFH</span></div></div>${grp('Absent', 'A', 'bad')}${grp('On leave', 'L', 'info')}${grp('Late', 'late', 'warn')}${grp('Work from home', 'W', 'ok')}`;
    return `<div class="at-cal"><div class="at-cn"><button class="icon-btn bordered" data-act="at-nav" data-d="-1" aria-label="Previous">${ic('left')}</button><b>${MFULL[cal.m]} ${cal.y}</b><button class="icon-btn bordered" data-act="at-nav" data-d="1" aria-label="Next">${ic('right')}</button></div>
      <div class="at-ms"><div class="P"><b>${g.P}</b><span>Present</span></div><div class="A"><b>${g.A}</b><span>Absent</span></div><div class="L"><b>${g.L}</b><span>Leave</span></div><div class="H"><b>${g.H}</b><span>Half day</span></div><div class="W"><b>${g.W}</b><span>WFH</span></div><div class="R"><b>${g.pct}%</b><span>Attendance</span></div></div>
      <div class="ac-grid">${DOWS.map((d, i) => `<span class="${i === 5 ? 'wk' : ''}">${d}</span>`).join('')}${cells}</div>
      <div class="at-key"><span><i class="good"></i>92%+</span><span><i class="mid"></i>85–91%</span><span><i class="low"></i>Below 85%</span><span><i class="off"></i>Weekly off</span>${g.best ? `<em>Best ${B.fdate(g.best.k).slice(0, 6)} (${g.best.pct}%) · Lowest ${B.fdate(g.worst.k).slice(0, 6)} (${g.worst.pct}%)</em>` : ''}</div>
      <div class="ad-box"><div class="ad-h"><b>${lab}</b><span>Company-wide · click any date</span></div>${det}</div></div>`;
  };
  const feedHtml = () => { const L = live().filter((r) => feed === 'all' || r.vals[1] === feed); return L.length ? `<ul class="feed live-feed at-feed">${L.map((r) => `<li>${B.avatar(r.vals[0], 34)}<div><b>${esc(r.vals[0])}</b><span><i class="at-dev">${ic(/Remote|WFH/.test(r.vals[3] + r.vals[4]) ? 'wifi' : 'fingerprint', 11)}</i>${esc(r.vals[3])} · ${esc(r.vals[4])}</span></div>${B.pill(r.vals[1])}<em>${B.fdt(r.vals[2]).slice(-5)}</em></li>`).join('')}</ul>` : '<p class="muted">No entries.</p>'; };

  B.page['attendance-dash'] = () => {
    const staff = E.filter((x) => x.status !== 'Left'), n = { Present: 21, Absent: 1, Late: 4, 'On Leave': 3, 'Work From Home': 2, 'Half Day': 1 };
    const exp = n.Present + n.Absent + n['On Leave'] + n['Work From Home'] + n['Half Day'], pct = Math.round(((n.Present + n['Work From Home']) / exp) * 100);
    const seg = [['Present', n.Present, 'var(--ok)'], ['WFH', n['Work From Home'], 'var(--accent)'], ['Half day', n['Half Day'], 'var(--warn)'], ['On leave', n['On Leave'], 'var(--c4)'], ['Absent', n.Absent, 'var(--bad)']];
    const dep = B.DEPTS.map((d) => ({ label: d, value: 78 + (B.hash(d) % 22) })).sort((a, b) => b.value - a.value);
    const r = B.rng('att-week'), days = Array.from({ length: 7 }, (_, i) => { const d = B.addDays(B.today, i - 6); return { label: B.DAYS[d.getDay()], value: d.getDay() === 5 ? 0 : 82 + Math.round(r() * 16), color: i === 6 ? 'var(--accent)' : 'var(--c2)' }; });
    const dist = [['08', 2], ['09', 9], ['10', 11], ['11', 3], ['12', 1]].map((x) => ({ label: x[0] + ':00', value: x[1], color: x[0] === '10' ? 'var(--accent)' : 'var(--c2)' }));
    const late = [E[10], E[14], E[17], E[20]].map((e, i) => ({ e, m: 8 + i * 7, rep: 2 + ((i * 3) % 4) })), absent = [E[6]].concat(E.length > 22 ? [] : []);
    const noIn = [E[8], E[12]];
    const opts = E.map((e) => `<option value="${e.id}" ${e.id === cal.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('');
    const dt = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    return `${B.head('Attendance Dashboard', `Live view · ${dt}`, `<a class="btn" href="#/page/upload-attendance">${ic('upload', 16)}Upload</a><a class="btn primary" href="#/page/attendance-tool">${ic('user-check', 16)}Mark Attendance</a>`, [{ label: 'HR', href: '#/' }, { label: 'Attendance Dashboard' }])}
      <section class="card pad at-hero"><div class="at-hl"><div class="at-hr">${B.ring(pct, 128, pct + '%', 'present today', 'var(--ok)')}</div><div class="at-ht"><b>${n.Present + n['Work From Home']} of ${exp} in today</b><span>${n.Late} arrived late · ${n.Absent} absent · ${n['On Leave']} on leave</span><div class="at-pr"><div><b>09:12</b><span>Avg. check-in</span></div><div><b>${Math.round(((n.Present - n.Late) / n.Present) * 100)}%</b><span>On-time rate</span></div><div><b>8.4h</b><span>Avg. hours</span></div></div></div></div>
        <div class="at-hb"><div class="snap-bar at-bar">${seg.map((s) => `<u style="flex:${s[1]};background:${s[2]}" data-tip="${s[0]}: ${s[1]}"></u>`).join('')}</div><div class="at-lg">${seg.map((s) => `<span><i style="background:${s[2]}"></i>${s[1]}<em>${s[0]}</em></span>`).join('')}</div></div></section>
      <section class="iv-kpis">${kp('user-check', 'Present', n.Present, 'd', Math.round((n.Present / exp) * 100) + '% of staff')}${kp('user-minus', 'Absent', n.Absent, 'e', 'Not informed')}${kp('clock', 'Late', n.Late, 'c', 'Avg. +' + Math.round(late.reduce((a, x) => a + x.m, 0) / late.length) + ' min')}${kp('calendar', 'On leave', n['On Leave'], 'b', 'Approved')}${kp('wifi', 'Work from home', n['Work From Home'], 'a', 'Remote today')}${kp('coffee', 'Half day', n['Half Day'], 'c')}</section>
      <section class="grid-3-2"><div class="card pad"><div class="ct-row"><h3 class="ct">Attendance calendar</h3><span class="pill info">All employees</span></div><div id="att-heat">${calHtml()}</div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Live check-ins</h3><span class="live"><i></i>Live</span></div><div class="seg sm" style="margin-bottom:10px">${[['all', 'All'], ['IN', 'In'], ['OUT', 'Out']].map((x) => `<button class="${feed === x[0] ? 'on' : ''}" data-act="at-feed" data-v="${x[0]}">${x[1]}</button>`).join('')}</div><div id="at-fd">${feedHtml()}</div></div></section>
      <section class="dx-2"><div class="card pad"><div class="ct-row"><h3 class="ct">Last 7 days</h3><span class="muted">% present</span></div>${B.vbars(days, { h: 170, fmt: (v) => (v ? v + '%' : 'Off') })}</div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Check-in time distribution</h3><span class="pill info">Peak 10:00</span></div>${B.vbars(dist, { h: 170 })}</div></section>
      <section class="grid-3"><div class="card pad"><div class="ct-row"><h3 class="ct">Attendance % by department</h3></div>${B.hbars(dep, { multi: true, fmt: (v) => v + '%' })}</div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Late arrivals <span class="count">${late.length}</span></h3></div><ul class="feed">${late.map((x) => `<li>${B.avatar(x.e.name, 32)}<div><b>${esc(x.e.name)}</b><span>${esc(x.e.dept)} · ${x.rep}× this month</span></div><span class="pill ${x.m > 20 ? 'bad' : 'warn'}"><i></i>+${x.m} min</span></li>`).join('')}</ul></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Needs attention</h3></div><div class="ld-alerts">
          <div class="bad"><span>${ic('user-minus', 16)}</span><div><b>${absent[0].name} absent</b><em>No leave or WFH on record</em></div><button class="btn sm" data-act="toast" data-msg="Reminder sent to ${esc(absent[0].first)}">Notify</button></div>
          ${noIn.map((e) => `<div class="warn"><span>${ic('clock', 16)}</span><div><b>${esc(e.name)} not checked in</b><em>${esc(e.dept)} · expected by 09:30</em></div><button class="btn sm" data-act="toast" data-msg="Reminder sent to ${esc(e.first)}">Remind</button></div>`).join('')}
          <div class="ok"><span>${ic('wifi', 16)}</span><div><b>Devices online</b><em>Tip Soi · ZKTeco · Web portal</em></div></div></div></div></section>`;
  };
  B.act['at-day'] = (t) => { cal.sel = t.dataset.d; const h = B.$('#att-heat'); if (h) h.innerHTML = calHtml(); };
  B.act['at-nav'] = (t) => { cal.m += +t.dataset.d; if (cal.m < 0) { cal.m = 11; cal.y--; } if (cal.m > 11) { cal.m = 0; cal.y++; } const h = B.$('#att-heat'); if (h) h.innerHTML = calHtml(); };
  B.act['at-feed'] = (t) => { feed = t.dataset.v; t.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === t)); const f = B.$('#at-fd'); if (f) f.innerHTML = feedHtml(); };
})();
