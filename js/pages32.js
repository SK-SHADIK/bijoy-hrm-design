/* Sentradesk HRMS — Employee Checkin: punch log with consistent data, device chips, filters and a detail popup (overrides the generic list) */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const hhmm = (m) => B.pad(Math.floor(m / 60)) + ':' + B.pad(m % 60);
  const DEV = { 'Tip Soi': { c: 'tip', ic: 'wifi', loc: 'Dhaka HQ · Reception' }, 'ZKTeco device': { c: 'zk', ic: 'fingerprint', loc: 'Dhaka HQ · Main gate' }, 'WFH web portal': { c: 'web', ic: 'home', loc: 'Remote · Web portal' } };
  const SH = { Normal: [570, 1110], Morning: [360, 900], Evening: [840, 1380], Night: [1320, 420], Open: [600, 1080] };
  const shKey = (s) => Object.keys(SH).find((k) => s.indexOf(k) === 0) || 'Open';
  const st = { q: '', t: 'all', s: 'all', r: '7' };
  let cache = null;
  const dchip = (s) => `<span class="oa-dv ${DEV[s].c}">${ic(DEV[s].ic, 12)}${s}</span>`;
  const fd = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const wd = (d) => d.toLocaleDateString('en-GB', { weekday: 'short' });
  const typePill = (t) => B.pill(t, t === 'IN' ? 'ok' : 'bad');

  const records = () => {
    if (cache) return cache;
    cache = B.getRows('employee-checkin').map((r, i) => {
      const rr = B.rng('ck32' + i), nm = String(r.vals[0]), e = B.EMPLOYEES.find((x) => x.name === nm) || r.p || {};
      let date = addD(B.today, -Math.floor(i * 0.25)); while (date.getDay() === 5) date = addD(date, -1);
      const shift = r.vals[5], k = shKey(shift), [s0, e0] = SH[k], type = rr() < 0.5 ? 'IN' : 'OUT';
      const src = r.vals[3], dev = DEV[src] ? src : 'Tip Soi';
      let m = type === 'IN' ? s0 + Math.floor(rr() * 50) - 15 : (k === 'Night' ? e0 + 1440 : e0) + Math.floor(rr() * 50) - 10; if (m >= 1440) m -= 1440;
      const sec = Math.floor(rr() * 60), loc = dev === 'WFH web portal' ? 'Remote' : r.vals[4] === 'Remote' ? 'Dhaka HQ' : r.vals[4];
      const now = new Date(), isT = iso(date) === iso(now); if (isT) m = Math.min(m, now.getHours() * 60 + now.getMinutes() - 1 - i % 5);
      return { id: r.name, emp: nm, dept: e.dept || '', desig: e.desig || '', eid: e.id || '', d: date, date: iso(date), m, sec, type, src: dev, loc, shift };
    }).sort((a, b) => b.d - a.d || b.m - a.m);
    return cache;
  };
  const inRange = (r) => st.r === 'all' || (B.today - r.d) / 864e5 < +st.r;
  const rows = () => records().filter((r) => inRange(r) && (st.t === 'all' || r.type === st.t) && (st.s === 'all' || r.src === st.s) && (!st.q || (r.emp + r.dept + r.id + r.loc + r.shift).toLowerCase().includes(st.q.toLowerCase())));

  const table = () => {
    const L = rows(); if (!L.length) return `<div class="card pad empty">${ic('search', 34)}<b>No punches match</b><span>Try a different filter or date range.</span></div>`;
    return `<div class="card table-card"><div class="tscroll"><table class="dt iv-t"><thead><tr><th>Employee</th><th>Log type</th><th>Date</th><th>Time</th><th>Device</th><th>Location</th><th>Shift</th><th></th></tr></thead><tbody>${L.map((r) => `<tr data-act="ck-open" data-id="${r.id}"><td><span class="who">${B.avatar(r.emp, 34)}<span><b>${esc(r.emp)}</b><em class="sub">${esc(r.dept)} · ${r.id}</em></span></span></td><td>${typePill(r.type)}</td><td>${fd(r.d)}<em class="sub">${wd(r.d)}${r.date === iso(B.today) ? ' · today' : ''}</em></td><td><b>${hhmm(r.m)}</b><em class="sub">:${B.pad(r.sec)} sec</em></td><td>${dchip(r.src)}</td><td>${esc(r.loc)}</td><td>${esc(r.shift)}</td><td class="r">${ic('right', 16)}</td></tr>`).join('')}</tbody></table></div></div>`;
  };
  const kp = (i, l, v, c, sub) => `<div class="card ivk"><span class="ivk-i ${c || ''}">${ic(i, 18)}</span><div><b>${v}</b><span>${l}</span>${sub ? `<em class="ld-sub">${sub}</em>` : ''}</div></div>`;
  const switcher = () => `<div class="seg views">${[['', 'list', 'List'], ['kanban', 'kanban', 'Kanban'], ['report', 'bars', 'Report']].map((v) => `<a class="${v[0] === '' ? 'on' : ''}" href="#/list/employee-checkin${v[0] ? '/' + v[0] : ''}">${ic(v[1], 16)}<span>${v[2]}</span></a>`).join('')}</div>`;

  B.renderCheckins = () => {
    const A = records().filter(inRange), c = (f) => A.filter(f).length, people = new Set(A.map((r) => r.emp)).size;
    const dv = (s) => c((r) => r.src === s);
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Shift & Attendance', href: '#/module/attendance' }, { label: 'Employee Checkin' }])}<h1>Employee Checkin <span class="count">${A.length}</span></h1><p class="sub">Every punch from the biometric devices and the web portal, with time, device and location.</p></div>
        <div class="head-actions">${switcher()}<a class="btn primary" href="#/form/employee-checkin/new">${ic('plus', 16)}Add Employee Checkin</a></div></div>
      <section class="iv-kpis">${kp('fingerprint', 'Total punches', A.length, 'a', people + ' employees')}${kp('check-circle', 'Check ins', c((r) => r.type === 'IN'), 'd')}${kp('x', 'Check outs', c((r) => r.type === 'OUT'), 'e')}${kp('wifi', 'Tip Soi', dv('Tip Soi'), 'a')}${kp('fingerprint', 'ZKTeco', dv('ZKTeco device'), 'c')}${kp('home', 'Web portal (WFH)', dv('WFH web portal'), 'b')}</section>
      <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="ckq" value="${esc(st.q)}" placeholder="Search employee, department, location or ID…"></label>
        <div class="seg">${[['all', 'All'], ['IN', 'Check in'], ['OUT', 'Check out']].map((x) => `<button class="${st.t === x[0] ? 'on' : ''}" data-act="ck-tf" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
        <select class="inp" style="max-width:180px" data-chg="cks"><option value="all">All devices</option>${Object.keys(DEV).map((d) => `<option ${st.s === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
        <select class="inp" style="max-width:150px" data-chg="ckr">${[['1', 'Today'], ['7', 'Last 7 days'], ['14', 'Last 14 days'], ['all', 'All punches']].map((o) => `<option value="${o[0]}" ${st.r === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div>
      <div id="ck-tbl" style="margin-top:14px">${table()}</div>`;
  };
  B.inp.ckq = (t) => { st.q = t.value; const g = B.$('#ck-tbl'); if (g) g.innerHTML = table(); };
  B.chg.cks = (t) => { st.s = t.value; B.route(); };
  B.chg.ckr = (t) => { st.r = t.value; B.route(); };
  B.act['ck-tf'] = (t) => { st.t = t.dataset.v; B.route(); };

  B.act['ck-open'] = (t) => {
    const r = records().find((x) => x.id === t.dataset.id); if (!r) return;
    const day = records().filter((x) => x.emp === r.emp && x.date === r.date).sort((a, b) => a.m - b.m), hist = records().filter((x) => x.emp === r.emp);
    const body = `<div class="oa-mh">${B.avatar(r.emp, 52)}<div><b>${esc(r.emp)}</b><span>${esc(r.desig)}${r.desig ? ' · ' : ''}${esc(r.dept)}</span><span>${esc(r.shift)} · ${r.id}</span></div>${typePill(r.type)}</div>
      <div class="oa-mt"><div><span>Date</span><b>${fd(r.d)}</b></div><div><span>Time</span><b>${hhmm(r.m)}:${B.pad(r.sec)}</b></div><div><span>Device</span><b>${dchip(r.src)}</b></div><div><span>Location</span><b>${esc(r.loc)}</b></div></div>
      <h4 class="oa-h">All punches by ${esc(r.emp.split(' ')[0])} on this day</h4>
      <ul class="oa-tl">${day.map((x) => `<li class="${x.type === 'IN' ? 'in' : 'out'}"><i></i><div class="oa-tt"><b>${hhmm(x.m)}</b><span class="oa-ty ${x.type === 'IN' ? 'in' : 'out'}">${x.type === 'IN' ? 'Check in' : 'Check out'}</span></div><div class="oa-td">${dchip(x.src)}<small>${esc(x.loc)}</small></div></li>`).join('')}</ul>
      <h4 class="oa-h">Recent punches</h4><table class="dt oa-wk"><thead><tr><th>Date</th><th>Time</th><th>Type</th><th>Device</th></tr></thead><tbody>${hist.map((x) => `<tr><td>${fd(x.d)}</td><td>${hhmm(x.m)}</td><td>${typePill(x.type)}</td><td>${dchip(x.src)}</td></tr>`).join('')}</tbody></table>`;
    B.modal({ title: 'Checkin · ' + r.id, body, wide: true, foot: `<a class="btn" href="#/employee/${esc(r.eid)}">View employee</a><button class="btn primary" data-act="close-modal">Close</button>` });
  };
})();
