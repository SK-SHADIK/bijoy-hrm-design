/* Sentradesk HRMS — Employee dashboard (top of the Employee Lifecycle workspace): headcount, mix, tenure, pipeline, joiners, birthdays */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
  const rows = (id) => { try { return B.docs[id] ? B.getRows(id).length : 0; } catch (e) { return 0; } };
  const yrs = (iso) => (B.today - B.parse(iso)) / 31557600000;
  const nextOcc = (iso) => { const d = B.parse(iso); let n = new Date(B.today.getFullYear(), d.getMonth(), d.getDate()); if (n < B.today) n = new Date(B.today.getFullYear() + 1, d.getMonth(), d.getDate()); return n; };
  const inDays = (d) => Math.round((d - B.today) / 86400000);
  const bucket = (vals, edges, labels) => labels.map((l, i) => ({ label: l, value: vals.filter((v) => v >= edges[i] && v < edges[i + 1]).length }));
  const card = (title, body, right, cls) => `<div class="card pad ${cls || ''}"><div class="ct-row"><h3 class="ct">${title}</h3>${right || ''}</div>${body}</div>`;

  B.empDashboard = () => {
    const E = B.EMPLOYEES, total = E.length;
    const active = E.filter((e) => e.status === 'Active'), onLeave = E.filter((e) => e.status === 'On Leave'), left = E.filter((e) => e.status === 'Left');
    const working = E.filter((e) => e.status !== 'Left');
    const joiners = working.filter((e) => yrs(e.doj) <= 0.5).sort((a, b) => (a.doj < b.doj ? 1 : -1));
    const recent = working.slice().sort((a, b) => (a.doj < b.doj ? 1 : -1)).slice(0, 5);
    const avgTen = working.length ? working.reduce((a, e) => a + yrs(e.doj), 0) / working.length : 0;
    const females = working.filter((e) => e.gender === 'Female').length;
    const series = (seed) => B.mkSeries(seed, 12, 8, 30);
    const kpis = [
      B.kpi('users', 'Total employees', total, '+' + Math.max(joiners.length, 1), series('ek1')),
      B.kpi('user-check', 'Active', active.length, pct(active.length, total) + '%', series('ek2'), 'ok'),
      B.kpi('calendar', 'On leave', onLeave.length, null, series('ek3'), 'warn'),
      B.kpi('user-plus', 'New joiners (6 mo)', joiners.length, null, series('ek4')),
      B.kpi('user-minus', 'Separated', left.length, null, series('ek5'), 'bad'),
      B.kpi('clock', 'Avg. tenure', avgTen.toFixed(1) + ' yrs', null, series('ek6'))
    ].join('');
    const dept = B.DEPTS.map((d) => ({ label: d, value: working.filter((e) => e.dept === d).length })).filter((d) => d.value).concat(working.some((e) => e.dept === 'Management') ? [{ label: 'Management', value: working.filter((e) => e.dept === 'Management').length }] : []).sort((a, b) => b.value - a.value);
    const types = ['Full-time', 'Contract', 'Intern'].map((t) => ({ label: t, value: working.filter((e) => e.type === t).length })).filter((t) => t.value);
    const branches = B.BRANCHES.map((b) => ({ label: b, value: working.filter((e) => e.branch === b).length })).filter((b) => b.value);
    const tenure = bucket(working.map((e) => yrs(e.doj)), [0, 1, 2, 3, 5, 99], ['< 1 yr', '1–2', '2–3', '3–5', '5+ yrs']);
    const ages = bucket(working.map((e) => yrs(e.dob)), [0, 25, 30, 35, 40, 99], ['< 25', '25–29', '30–34', '35–39', '40+']);
    const pipe = [['employee-onboarding', 'Onboarding', 'user-plus', 'ok'], ['employee-promotion', 'Promotions', 'trend', 'info'], ['employee-transfer', 'Transfers', 'refresh', 'warn'], ['employee-separation', 'Separations', 'user-minus', 'bad']];
    const events = [];
    working.forEach((e) => {
      const b = nextOcc(e.dob), a = nextOcc(e.doj);
      if (inDays(b) <= 45) events.push({ e, kind: 'bd', d: b, label: 'Birthday' });
      if (inDays(a) <= 45 && yrs(e.doj) >= 0.9) events.push({ e, kind: 'an', d: a, label: Math.round(yrs(e.doj)) + '-year anniversary' });
    });
    events.sort((x, y) => x.d - y.d);
    const heads = E.filter((e) => e.id !== 'HR-EMP-00001' && e.mgr === 'HR-EMP-00001' && e.status !== 'Left');
    const when = (d) => { const n = inDays(d); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : 'In ' + n + ' days'; };
    return `<section class="kpis">${kpis}</section>
      <section class="grid-3">${card('Headcount by department', B.hbars(dept, { multi: true }))}
        ${card('Employment type', B.donut(types, { center: working.length, label: 'Working' }))}
        ${card('Gender diversity', `<div class="edd-gen">${B.ring(pct(females, working.length), 120, pct(females, working.length) + '%', 'Women', 'var(--c4)')}<ul class="legend"><li><i style="background:var(--c4)"></i><span>Female</span><b>${females}</b></li><li><i style="background:var(--c1)"></i><span>Male</span><b>${working.length - females}</b></li></ul></div>`)}</section>
      <section class="grid-3">${card('Tenure distribution', B.vbars(tenure, { h: 190, multi: true }))}
        ${card('Age groups', B.vbars(ages, { h: 190, multi: true }))}
        ${card('By location', B.hbars(branches, { multi: true }))}</section>
      <section class="edd-pipe">${pipe.map((p) => `<a class="card edd-pt ${p[3]}" href="#/list/${p[0]}"><span>${ic(p[2], 20)}</span><div><b>${rows(p[0])}</b><em>${p[1]}</em></div>${ic('right', 16)}</a>`).join('')}</section>
      <section class="grid-3-2">${card('Recent joiners', `<ul class="edd-l">${recent.map((e) => `<li>${B.avatar(e.name, 38)}<div><b>${esc(e.name)}</b><span>${esc(e.desig)} · ${esc(e.dept)}</span></div><em>${B.fdate(e.doj)}</em><a class="btn sm" href="#/employee/${e.id}">Details</a></li>`).join('')}</ul>`, `<a class="link-btn" href="#/list/employee">View all</a>`)}
        ${card('Birthdays & anniversaries', events.length ? `<ul class="edd-l">${events.slice(0, 6).map((v) => `<li><span class="edd-ev ${v.kind}">${ic(v.kind === 'bd' ? 'gift' : 'award', 15)}</span><div><b>${esc(v.e.name)}</b><span>${v.label}</span></div><em>${when(v.d)}</em></li>`).join('')}</ul>` : '<div class="eds-none">' + ic('gift', 18) + '<span>Nothing in the next 45 days</span></div>', '<span class="muted">Next 45 days</span>')}</section>
      <section class="grid-2">${card('Department heads', `<div class="edd-heads">${heads.map((e) => `<a class="edd-h" href="#/employee/${e.id}">${B.avatar(e.name, 40)}<div><b>${esc(e.name)}</b><span>${esc(e.desig)}</span></div></a>`).join('')}</div>`)}
        ${card('Workforce at a glance', `<dl class="edd-gl"><div><dt>Active rate</dt><dd>${pct(active.length, total)}%</dd></div><div><dt>Attrition</dt><dd>${pct(left.length, total)}%</dd></div><div><dt>Avg. tenure</dt><dd>${avgTen.toFixed(1)} yrs</dd></div><div><dt>Full-time share</dt><dd>${pct(working.filter((e) => e.type === 'Full-time').length, working.length)}%</dd></div><div><dt>Avg. monthly gross</dt><dd>${B.short(Math.round(working.reduce((a, e) => a + e.salary, 0) / (working.length || 1)))}</dd></div><div><dt>Locations</dt><dd>${branches.length}</dd></div></dl>`)}</section>`;
  };
})();
