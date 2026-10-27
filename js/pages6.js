/* Bijoy HRMS — Asset management: masters (types, manufacturers, vendors, locations), register, assignments, requests, maintenance.
   Data lives in the browser (localStorage) so the whole flow is usable in the design. */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const KEY = 'bijoy-asset-db-v2';
  const STATUS = { Available: 'ok', Assigned: 'info', 'In Repair': 'warn', Retired: 'mute' };
  const CONDS = ['New', 'Good', 'Fair', 'Damaged'];
  const KINDS = ['Preventive', 'Repair', 'Inspection', 'Upgrade'];
  const MST = ['Scheduled', 'In Progress', 'Completed'];
  const ICONS = ['grid', 'sidebar', 'eye', 'phoneui', 'zap', 'layers', 'truck', 'card', 'key', 'briefcase', 'tag', 'wifi', 'lock', 'book', 'settings'];
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const meId = () => (B.role === 'employee' ? B.ME : B.ADMIN_EMP).id;
  const nm = (id) => (B.emp(id) || { name: '—' }).name;
  const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 99);

  /* ---------- seed ---------- */
  function seed() {
    const T = (id, name, prefix, icon, life, warranty, serial) => ({ id, name, prefix, icon, life, warranty, serial, desc: '' });
    const types = [T('ty1', 'Laptop', 'LAP', 'grid', 4, 2, true), T('ty2', 'Desktop', 'DSK', 'sidebar', 5, 3, true), T('ty3', 'Monitor', 'MON', 'eye', 5, 3, true), T('ty4', 'Mobile Phone', 'MOB', 'phoneui', 3, 1, true), T('ty5', 'Tablet', 'TAB', 'phoneui', 3, 1, true), T('ty6', 'Peripheral', 'PER', 'zap', 3, 1, false), T('ty7', 'Furniture', 'FUR', 'layers', 10, 5, false), T('ty8', 'Vehicle', 'VEH', 'truck', 8, 2, true), T('ty9', 'Access Card', 'ACC', 'card', 5, 1, true), T('ty10', 'Software License', 'LIC', 'key', 1, 1, false)];
    const M = (id, name, country, website, email, phone) => ({ id, name, country, website, email, phone });
    const mfrs = [M('mf1', 'Apple', 'USA', 'apple.com', 'support@apple.com', '+1 800 275 2273'), M('mf2', 'Dell', 'USA', 'dell.com', 'support@dell.com', '+880 9604 111 222'), M('mf3', 'Lenovo', 'China', 'lenovo.com', 'support@lenovo.com', '+880 9612 345 678'), M('mf4', 'HP', 'USA', 'hp.com', 'support@hp.com', '+880 9611 000 123'), M('mf5', 'Samsung', 'South Korea', 'samsung.com', 'care@samsung.com', '+880 16233'), M('mf6', 'Logitech', 'Switzerland', 'logitech.com', 'help@logitech.com', ''), M('mf7', 'Herman Miller', 'USA', 'hermanmiller.com', '', ''), M('mf8', 'HID Global', 'USA', 'hidglobal.com', '', ''), M('mf9', 'Honda', 'Japan', 'honda.com', '', ''), M('mf10', 'Adobe', 'USA', 'adobe.com', 'support@adobe.com', '')];
    const V = (id, name, contact, phone, email, address, tin) => ({ id, name, contact, phone, email, address, tin });
    const vendors = [V('vn1', 'Star Tech & Engineering', 'Mizanur Rahman', '+880 1711-223344', 'corporate@startech.example', 'Jahangir Tower, Dhaka', '123456789012'), V('vn2', 'Ryans Computers', 'Shafiq Alam', '+880 1819-556677', 'b2b@ryans.example', 'Bashundhara City, Dhaka', '234567890123'), V('vn3', 'Global Brand Pvt. Ltd.', 'Nasrin Akter', '+880 1914-889900', 'sales@globalbrand.example', 'Gulshan-2, Dhaka', '345678901234'), V('vn4', 'Rangs Motors', 'Habib Hossain', '+880 1713-000111', 'fleet@rangs.example', 'Tejgaon, Dhaka', '456789012345')];
    const locs = [{ id: 'lc1', name: 'Dhaka HQ', kind: 'Office', address: 'House 45, Road 27, Gulshan-1' }, { id: 'lc2', name: 'Chattogram Branch', kind: 'Office', address: 'Agrabad C/A, Chattogram' }, { id: 'lc3', name: 'Sylhet Branch', kind: 'Office', address: 'Zindabazar, Sylhet' }, { id: 'lc4', name: 'IT Store', kind: 'Warehouse', address: 'Dhaka HQ, Basement 1' }, { id: 'lc5', name: 'With employee', kind: 'Remote', address: '' }];
    const tn = {}; types.forEach((t) => { tn[t.name] = t; });
    const A = (name, type, mfr, model, serial, vendor, cost, buyAgo, warrYears, cond, status, emp, sinceAgo, ack, loc) => ({ name, typeId: tn[type].id, mfrId: mfr, model, serial, vendorId: vendor, invoice: 'INV-' + (2000 + Math.floor(Math.abs(cost) % 900)), buy: day(-buyAgo), cost, warranty: day(-buyAgo + warrYears * 365), life: tn[type].life, salvage: Math.round(cost * 0.1), locId: emp ? 'lc5' : loc || 'lc4', cond, status, emp, since: emp ? day(-sinceAgo) : '', ack: !!ack, issue: '', notes: '' });
    const raw = [
      A('MacBook Pro 14"', 'Laptop', 'mf1', 'MKGP3', 'C02XK1LMQ6L4', 'vn1', 245000, 420, 2, 'Good', 'Assigned', 'HR-EMP-00001', 400, 1),
      A('Dell Latitude 5440', 'Laptop', 'mf2', 'Latitude 5440', 'DL5440-8841', 'vn2', 118000, 300, 3, 'Good', 'Assigned', 'HR-EMP-00015', 290, 1),
      A('Dell P2422H Monitor', 'Monitor', 'mf2', 'P2422H', 'CN-0P24-3391', 'vn2', 24500, 300, 3, 'Good', 'Assigned', 'HR-EMP-00015', 290, 1),
      A('iPhone 14', 'Mobile Phone', 'mf1', 'A2882', 'F2LXQ0T9PN', 'vn1', 135000, 200, 1, 'Good', 'Assigned', 'HR-EMP-00001', 190, 1),
      A('Logitech MX Keys + Mouse', 'Peripheral', 'mf6', 'MX Keys Combo', 'LG-MX-5521', 'vn2', 17500, 300, 1, 'Fair', 'Assigned', 'HR-EMP-00015', 290, 0),
      A('ThinkPad T14', 'Laptop', 'mf3', 'T14 Gen 3', 'PF3K8D21', 'vn2', 132000, 500, 3, 'Good', 'Assigned', 'HR-EMP-00003', 480, 1),
      A('HP EliteBook 840', 'Laptop', 'mf4', '840 G9', 'CND3421QX9', 'vn1', 126000, 650, 3, 'Fair', 'Assigned', 'HR-EMP-00005', 640, 1),
      A('Samsung Galaxy Tab S8', 'Tablet', 'mf5', 'SM-X700', 'R52T10XA9PK', 'vn3', 78000, 150, 1, 'New', 'Assigned', 'HR-EMP-00009', 140, 1),
      A('Office Access Card #0142', 'Access Card', 'mf8', 'iCLASS SE', 'AC-0142', 'vn3', 600, 120, 5, 'Good', 'Assigned', 'HR-EMP-00015', 119, 1),
      A('Ergonomic Chair', 'Furniture', 'mf7', 'Aeron B', 'HM-AER-2231', 'vn3', 85000, 700, 10, 'Good', 'Assigned', 'HR-EMP-00001', 690, 1),
      A('Adobe Creative Cloud', 'Software License', 'mf10', 'All Apps', 'ACC-LIC-7712', 'vn3', 72000, 100, 1, 'New', 'Assigned', 'HR-EMP-00004', 95, 1),
      A('Dell OptiPlex 7010', 'Desktop', 'mf2', 'OptiPlex 7010', 'DOP7010-221', 'vn2', 98000, 900, 3, 'Fair', 'In Repair', null, 0, 0, 'lc4'),
      A('MacBook Air M2', 'Laptop', 'mf1', 'MLY33', 'C02ZL7PQ1M', 'vn1', 168000, 30, 1, 'New', 'Available', null, 0, 0, 'lc4'),
      A('Lenovo ThinkVision 27"', 'Monitor', 'mf3', 'T27h-30', 'VN-TV27-8820', 'vn2', 31000, 40, 3, 'New', 'Available', null, 0, 0, 'lc4'),
      A('Honda CB150 (Pool Bike)', 'Vehicle', 'mf9', 'CB150R', 'DHK-METRO-LA-77-4821', 'vn4', 285000, 800, 2, 'Good', 'Available', null, 0, 0, 'lc1'),
      A('Old Dell Inspiron', 'Laptop', 'mf2', 'Inspiron 3520', 'INS-3520-0091', 'vn2', 65000, 1500, 3, 'Damaged', 'Retired', null, 0, 0, 'lc4')
    ];
    const assets = [], assigns = [], cnt = {};
    raw.forEach((a) => {
      const t = types.find((x) => x.id === a.typeId); cnt[t.prefix] = (cnt[t.prefix] || 0) + 1;
      a.id = t.prefix + '-' + B.pad(cnt[t.prefix], 4);
      a.hist = [{ d: a.buy, t: 'Added to inventory', by: 'Admin' }];
      if (a.emp) { a.hist.push({ d: a.since, t: 'Assigned to ' + nm(a.emp), by: 'Admin' }); assigns.push({ id: uid('as'), asset: a.id, emp: a.emp, from: a.since, to: '', cOut: a.cond, cIn: '', note: '' }); }
      assets.push(a);
    });
    const maint = [
      { id: 'mt1', asset: 'DSK-0001', kind: 'Repair', date: day(-6), vendor: 'vn2', cost: 4500, notes: 'Power supply failure, awaiting part', status: 'In Progress', next: '' },
      { id: 'mt2', asset: 'LAP-0002', kind: 'Preventive', date: day(5), vendor: '', cost: 0, notes: 'Annual cleaning and battery check', status: 'Scheduled', next: '' },
      { id: 'mt3', asset: 'VEH-0001', kind: 'Inspection', date: day(-2), vendor: 'vn4', cost: 0, notes: 'Insurance and fitness renewal', status: 'Scheduled', next: '' },
      { id: 'mt4', asset: 'LAP-0003', kind: 'Upgrade', date: day(-40), vendor: 'vn2', cost: 9500, notes: 'RAM 16 → 32 GB', status: 'Completed', next: '' }
    ];
    const reqs = [{ id: 'rq1', emp: 'HR-EMP-00015', typeId: 'ty5', reason: 'Need a tablet for client demos and field visits.', date: day(-2), status: 'Pending', asset: '', note: '' }, { id: 'rq2', emp: 'HR-EMP-00003', typeId: 'ty3', reason: 'Second monitor for development work.', date: day(-4), status: 'Pending', asset: '', note: '' }];
    return { types, mfrs, vendors, locs, assets, assigns, maint, reqs };
  }
  let db = null;
  const D = () => { if (!db) { try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} if (!db || !db.assets) db = seed(); } return db; };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D())); } catch (e) {} };
  const by = (list, id) => list.find((x) => x.id === id);
  const aById = (id) => by(D().assets, id);
  const typ = (a) => by(D().types, a.typeId) || { name: '—', icon: 'grid', prefix: 'AST', life: 0, warranty: 1 };
  const mfr = (a) => (by(D().mfrs, a.mfrId) || { name: '—' }).name;
  const loc = (a) => (by(D().locs, a.locId) || { name: '—' }).name;
  const vend = (a) => (by(D().vendors, a.vendorId) || { name: '—' }).name;
  const forEmp = (id) => D().assets.filter((a) => a.emp === id && a.status === 'Assigned');
  const log = (a, t) => a.hist.push({ d: today(), t, by: B.role === 'employee' ? nm(meId()) : 'Admin' });
  const warr = (a) => (a.warranty < today() ? ['Expired', 'bad'] : a.warranty < day(60) ? ['Expiring', 'warn'] : ['Active', 'ok']);
  const bookValue = (a) => { if (!a.life) return a.cost; const yrs = Math.max(0, (Date.now() - new Date(a.buy + 'T00:00')) / 31557600000); return Math.round(a.cost - (a.cost - (a.salvage || 0)) * Math.min(1, yrs / a.life)); };
  const nextTag = (t) => { const mx = Math.max(0, ...D().assets.filter((a) => a.id.startsWith(t.prefix + '-')).map((a) => +a.id.split('-')[1] || 0)); return t.prefix + '-' + B.pad(mx + 1, 4); };
  const person = (id) => (id ? `<span class="as-who">${B.avatar(nm(id), 26)}<span>${esc(nm(id))}</span></span>` : '<span class="as-none">Unassigned</span>');
  const opts = (list, sel, blank) => (blank ? `<option value="">${blank}</option>` : '') + list.map((x) => `<option value="${esc(x.id)}" ${x.id === sel ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  const empOpts = (sel) => B.EMPLOYEES.filter((e) => e.status !== 'Left').map((e) => `<option value="${e.id}" ${e.id === sel ? 'selected' : ''}>${esc(e.name)} · ${esc(e.dept)}</option>`).join('');
  const Kp = (i, t, v, tn) => B.kpi(i, t, v, null, null, tn);
  const kpis = (arr, n) => `<section class="kpis sm lv-stats" style="grid-template-columns:repeat(${n || arr.length},minmax(0,1fr))">${arr.join('')}</section>`;
  const toCSV = (rows) => rows.map((r) => r.map((c) => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
  const crumbs = (l) => [{ label: 'HR', href: '#/' }, { label: 'Asset Management', href: '#/page/asset-dash' }, { label: l }];
  const tabs = (list, cur, act) => `<div class="seg sm as-tabs">${list.map((t) => `<button class="${t[0] === cur ? 'on' : ''}" data-act="${act}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>`;

  /* ---------- employee-facing helpers (profile tab, dashboard card) ---------- */
  B.assetsFor = (empId) => {
    const l = forEmp(empId);
    return l.length ? `<div class="as-grid">${l.map((a) => `<div class="card pad as-c"><div class="as-top"><span class="as-ic">${ic(typ(a).icon, 20)}</span><div><b>${esc(a.name)}</b><span>${esc(typ(a).name)} · ${esc(mfr(a))}</span></div></div><dl class="kv"><div><dt>Asset tag</dt><dd>${a.id}</dd></div><div><dt>Serial no.</dt><dd>${esc(a.serial) || '—'}</dd></div><div><dt>Assigned on</dt><dd>${fmt(a.since)}</dd></div><div><dt>Condition</dt><dd>${a.cond}</dd></div></dl></div>`).join('')}</div>` : `<div class="card pad empty">${ic('briefcase', 34)}<b>No assets assigned</b><span>Nothing is tagged to this employee.</span></div>`;
  };
  B.assetWidget = (empId) => {
    const l = forEmp(empId);
    return l.length ? `<ul class="ann">${l.slice(0, 4).map((a) => `<li><a href="#/page/my-assets" class="ann-a"><span class="as-ic sm">${ic(typ(a).icon, 16)}</span><div><b>${esc(a.name)}</b><span>${a.id} · ${esc(typ(a).name)}</span></div>${ic('right', 16)}</a></li>`).join('')}</ul>` : '<div class="empty"><span>No assets assigned to you.</span></div>';
  };

  /* ---------- page plumbing ---------- */
  const F = { reg: {}, asg: {}, mnt: {}, mst: {} };
  const PG = {};
  let cur = '';
  const rerender = () => { const v = B.$('#view .fade'); if (v && PG[cur]) v.innerHTML = PG[cur](); };
  const reset = (n) => { if (n === 'assets') F.reg = { q: '', type: '', mfr: '', st: '', loc: '' }; if (n === 'asset-assign') F.asg = { tab: 'current', q: '' }; if (n === 'asset-maint') F.mnt = { st: '' }; if (n === 'asset-masters') F.mst = { tab: 'types' }; };
  const page = (n, fn) => { PG[n] = fn; B.page[n] = () => { cur = n; reset(n); return fn(); }; };
  const done = (msg) => { save(); B.closeModal(); rerender(); if (msg) B.toast(msg); };
  const rid = (t) => t.closest('[data-id]').dataset.id;

  /* =========================== OVERVIEW =========================== */
  page('asset-dash', () => {
    const d = D(), act = d.assets.filter((a) => a.status !== 'Retired'), assigned = act.filter((a) => a.status === 'Assigned').length;
    const maxT = Math.max(1, ...d.types.map((t) => act.filter((a) => a.typeId === t.id).length));
    const soon = act.filter((a) => warr(a)[0] !== 'Active').sort((a, b) => a.warranty.localeCompare(b.warranty)).slice(0, 5);
    const mdue = d.maint.filter((m) => m.status !== 'Completed').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
    const rec = d.assets.flatMap((a) => a.hist.map((h) => Object.assign({ a }, h))).sort((x, y) => y.d.localeCompare(x.d)).slice(0, 6);
    const pend = d.reqs.filter((r) => r.status === 'Pending').length;
    return `${B.head('Asset Management', 'Everything about company assets: inventory, assignments, requests and upkeep.', `<button class="btn" data-act="as-export">${ic('download', 15)}Export</button><a class="btn" href="#/page/asset-assign">${ic('user-check', 15)}Assign Asset</a><button class="btn primary" data-act="as-new">${ic('plus', 16)}New Asset</button>`, [{ label: 'HR', href: '#/' }, { label: 'Asset Management' }])}
      ${kpis([Kp('briefcase', 'Total assets', act.length), Kp('dollar', 'Purchase value', B.money(act.reduce((s, a) => s + a.cost, 0))), Kp('trend', 'Book value', B.money(act.reduce((s, a) => s + bookValue(a), 0)), 'ok'), Kp('user-check', 'Assigned', assigned + ' / ' + act.length), Kp('zap', 'In repair', act.filter((a) => a.status === 'In Repair').length, 'warn'), Kp('alert', 'Warranty alerts', soon.length, 'bad')], 6)}
      ${pend ? `<a class="card pad as-banner" href="#/page/asset-assign" data-go="req">${ic('inbox', 18)}<span><b>${pend} asset request${pend > 1 ? 's' : ''}</b> waiting for your decision</span>${ic('right', 16)}</a>` : ''}
      <section class="grid-2"><div class="card pad"><h3 class="ct">Assets by type</h3><ul class="cl-cat as-bars">${d.types.map((t) => `<li><span>${esc(t.name)}</span>${B.prog(Math.round(act.filter((a) => a.typeId === t.id).length / maxT * 100), '')}<b>${act.filter((a) => a.typeId === t.id).length}</b></li>`).join('')}</ul></div>
        <div class="card pad"><h3 class="ct">By status</h3><div class="as-stat">${Object.keys(STATUS).map((s) => `<div><b>${d.assets.filter((a) => a.status === s).length}</b>${B.pill(s, STATUS[s])}</div>`).join('')}</div>
          <h3 class="ct" style="margin-top:20px">Warranty expiring or expired</h3>${soon.length ? `<ul class="feed">${soon.map((a) => `<li><div><b>${esc(a.name)}</b><span>${a.id} · ${fmt(a.warranty)}</span></div>${B.pill(warr(a)[0], warr(a)[1])}</li>`).join('')}</ul>` : '<div class="empty"><span>No warranty alerts.</span></div>'}</div></section>
      <section class="grid-2"><div class="card pad"><div class="ct-row"><h3 class="ct">Maintenance queue</h3><a class="link-btn" href="#/page/asset-maint">All</a></div>${mdue.length ? `<ul class="feed">${mdue.map((m) => `<li><div><b>${esc(m.kind)} · ${esc((aById(m.asset) || {}).name || m.asset)}</b><span>${m.asset} · ${fmt(m.date)}</span></div>${B.pill(m.status, m.status === 'In Progress' ? 'warn' : 'info')}</li>`).join('')}</ul>` : '<div class="empty"><span>Nothing scheduled.</span></div>'}</div>
        <div class="card pad"><h3 class="ct">Recent activity</h3><ul class="as-hist">${rec.map((h) => `<li><i></i><div><b>${esc(h.t)}</b><span>${h.a.id} · ${esc(h.a.name)} · ${fmt(h.d)}</span></div></li>`).join('')}</ul></div></section>`;
  });
  B.act['as-export'] = () => { const d = D(); download('assets.csv', toCSV([['Tag', 'Name', 'Type', 'Manufacturer', 'Model', 'Serial', 'Vendor', 'Location', 'Status', 'Assigned to', 'Purchase date', 'Cost', 'Book value', 'Warranty until']].concat(regRows().map((a) => [a.id, a.name, typ(a).name, mfr(a), a.model, a.serial, vend(a), loc(a), a.status, a.emp ? nm(a.emp) : '', a.buy, a.cost, bookValue(a), a.warranty])))); B.toast('Exported ' + regRows().length + ' assets'); };

  /* =========================== REGISTER =========================== */
  function regRows() {
    const f = F.reg || {}, q = (f.q || '').toLowerCase();
    return D().assets.filter((a) => (!f.type || a.typeId === f.type) && (!f.mfr || a.mfrId === f.mfr) && (!f.st || a.status === f.st) && (!f.loc || a.locId === f.loc) && (!q || (a.id + a.name + a.serial + a.model + mfr(a) + nm(a.emp)).toLowerCase().includes(q)));
  }
  function regTable() {
    const l = regRows();
    if (!l.length) return `<div class="empty">${ic('search', 34)}<b>No assets match</b><span>Try different filters.</span></div>`;
    return `<div class="tscroll"><table class="dt"><thead><tr><th>Tag</th><th>Asset</th><th class="c-loc">Location</th><th>Assigned to</th><th>Status</th><th class="r">Book value</th><th class="r">Action</th></tr></thead><tbody>${l.map((a) => `<tr data-id="${a.id}"><td><b>${a.id}</b></td><td><b>${esc(a.name)}</b>${a.issue ? ' <span class="pill bad"><i></i>Issue</span>' : ''}<em class="sub">${esc(typ(a).name)} · ${esc(mfr(a))}${a.serial ? ' · ' + esc(a.serial) : ''}</em></td><td class="c-loc">${esc(loc(a))}</td><td>${person(a.emp)}</td><td>${B.pill(a.status, STATUS[a.status])}</td><td class="r">${B.money(bookValue(a))}</td>
      <td class="r"><button class="btn sm" data-act="as-view">View</button> ${a.status === 'Available' ? '<button class="btn sm primary" data-act="as-assign">Assign</button>' : a.status === 'Assigned' ? '<button class="btn sm" data-act="as-return">Return</button>' : ''}</td></tr>`).join('')}</tbody></table></div>`;
  }
  const refreshReg = () => { const t = B.$('#as-table'); if (t) { t.innerHTML = regTable(); B.$('#as-count').textContent = regRows().length + ' of ' + D().assets.length; } };
  page('assets', () => {
    const d = D();
    return `${B.head('Asset Register', 'Every asset the company owns, with its owner and lifecycle status.', `<button class="btn" data-act="as-export">${ic('download', 15)}Export CSV</button><button class="btn primary" data-act="as-new">${ic('plus', 16)}New Asset</button>`, crumbs('Asset Register'))}
      <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="asq" placeholder="Search tag, name, serial, model, employee…"></label>
        <select class="inp sm" data-chg="astype">${opts(d.types, '', 'Type: All')}</select><select class="inp sm" data-chg="asmfr">${opts(d.mfrs, '', 'Manufacturer: All')}</select><select class="inp sm" data-chg="asloc">${opts(d.locs, '', 'Location: All')}</select>
        <select class="inp sm" data-chg="asst"><option value="">Status: All</option>${Object.keys(STATUS).map((c) => `<option>${c}</option>`).join('')}</select><span class="as-count" id="as-count">${d.assets.length} of ${d.assets.length}</span></div>
      <div class="card table-card" id="as-table">${regTable()}</div>`;
  });
  B.inp.asq = (t) => { F.reg.q = t.value; refreshReg(); };
  B.chg.astype = (t) => { F.reg.type = t.value; refreshReg(); }; B.chg.asmfr = (t) => { F.reg.mfr = t.value; refreshReg(); }; B.chg.asloc = (t) => { F.reg.loc = t.value; refreshReg(); }; B.chg.asst = (t) => { F.reg.st = t.value; refreshReg(); };

  /* ---------- create / edit asset ---------- */
  const assetForm = (a) => {
    const d = D(), t0 = a.typeId ? by(d.types, a.typeId) : d.types[0];
    return `<div class="fgrid as-f" style="grid-template-columns:1fr 1fr">
      <div class="fld" style="grid-column:1/-1"><label>Asset name</label><input class="inp" id="asm-n" value="${esc(a.name || '')}" placeholder="e.g. Dell Latitude 5440"></div>
      <div class="fld"><label>Asset type</label><select class="inp" id="asm-t" data-chg="astypesel" ${a.id ? 'disabled' : ''}>${opts(d.types, t0.id)}</select></div>
      <div class="fld"><label>Asset tag</label><input class="inp" id="asm-tag" value="${a.id || nextTag(t0)}" disabled></div>
      <div class="fld"><label>Manufacturer</label><select class="inp" id="asm-m">${opts(d.mfrs, a.mfrId, 'Select…')}</select></div>
      <div class="fld"><label>Model</label><input class="inp" id="asm-mo" value="${esc(a.model || '')}"></div>
      <div class="fld"><label>Serial / identifier${t0.serial ? ' *' : ''}</label><input class="inp" id="asm-s" value="${esc(a.serial || '')}"></div>
      <div class="fld"><label>Condition</label><select class="inp" id="asm-k">${CONDS.map((c) => `<option ${(a.cond || 'New') === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="fld"><label>Vendor</label><select class="inp" id="asm-v">${opts(d.vendors, a.vendorId, 'Select…')}</select></div>
      <div class="fld"><label>Invoice no.</label><input class="inp" id="asm-i" value="${esc(a.invoice || '')}"></div>
      <div class="fld"><label>Purchase date</label><input type="date" class="inp" id="asm-d" value="${a.buy || today()}"></div>
      <div class="fld"><label>Purchase cost (৳)</label><input type="number" min="0" class="inp" id="asm-p" value="${a.cost || ''}"></div>
      <div class="fld"><label>Warranty until</label><input type="date" class="inp" id="asm-w" value="${a.warranty || day(t0.warranty * 365)}"></div>
      <div class="fld"><label>Location</label><select class="inp" id="asm-l">${opts(d.locs, a.locId || 'lc4')}</select></div>
      <div class="fld"><label>Useful life (years)</label><input type="number" min="0" class="inp" id="asm-life" value="${a.life == null ? t0.life : a.life}"></div>
      <div class="fld"><label>Salvage value (৳)</label><input type="number" min="0" class="inp" id="asm-sv" value="${a.salvage == null ? '' : a.salvage}" placeholder="0"></div>
      <div class="fld" style="grid-column:1/-1"><label>Notes</label><textarea class="inp" id="asm-no" rows="2">${esc(a.notes || '')}</textarea></div></div>`;
  };
  B.chg.astypesel = (t) => { const ty = by(D().types, t.value); B.$('#asm-tag').value = nextTag(ty); B.$('#asm-life').value = ty.life; B.$('#asm-w').value = day(ty.warranty * 365); };
  B.act['as-new'] = () => B.modal({ title: 'New Asset', wide: true, body: assetForm({}), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="as-save" data-id="">Add Asset</button>' });
  B.act['as-edit'] = (t) => { const a = aById(t.dataset.id); B.modal({ title: 'Edit ' + a.id, wide: true, body: assetForm(a), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="as-save" data-id="${a.id}">Save</button>` }); };
  B.act['as-save'] = (t) => {
    const name = B.$('#asm-n').value.trim(), ty = by(D().types, B.$('#asm-t').value), serial = B.$('#asm-s').value.trim();
    if (!name) { B.toast('Asset name is required', 'bad'); return; }
    if (ty.serial && !serial) { B.toast(ty.name + ' needs a serial number', 'bad'); return; }
    const dup = D().assets.find((x) => serial && x.serial === serial && x.id !== t.dataset.id); if (dup) { B.toast('Serial already used by ' + dup.id, 'bad'); return; }
    const v = { name, mfrId: B.$('#asm-m').value, model: B.$('#asm-mo').value.trim(), serial, cond: B.$('#asm-k').value, vendorId: B.$('#asm-v').value, invoice: B.$('#asm-i').value.trim(), buy: B.$('#asm-d').value, cost: +B.$('#asm-p').value || 0, warranty: B.$('#asm-w').value, locId: B.$('#asm-l').value, life: +B.$('#asm-life').value || 0, salvage: +B.$('#asm-sv').value || 0, notes: B.$('#asm-no').value.trim() };
    const a = t.dataset.id && aById(t.dataset.id);
    if (a) { Object.assign(a, v); log(a, 'Details updated'); } else { const n = Object.assign({ id: nextTag(ty), typeId: ty.id, status: 'Available', emp: null, since: '', ack: false, issue: '', hist: [] }, v); log(n, 'Added to inventory'); D().assets.push(n); }
    done(a ? 'Asset updated' : 'Asset added');
  };
  B.act['as-del'] = (t) => { const a = aById(t.dataset.id); if (a.emp) { B.toast('Return the asset before deleting it', 'bad'); return; } db.assets = D().assets.filter((x) => x !== a); db.assigns = D().assigns.filter((x) => x.asset !== a.id); db.maint = D().maint.filter((x) => x.asset !== a.id); done('Asset deleted'); };

  /* ---------- assign / return / transfer ---------- */
  function openAssign(o) {
    o = o || {};
    const a = o.assetId && aById(o.assetId), pool = D().assets.filter((x) => x.status === 'Available' && (!o.typeId || x.typeId === o.typeId));
    B.modal({ title: a ? 'Assign ' + a.id : 'Assign an asset', body: `<div class="fgrid" style="grid-template-columns:1fr 1fr">
      <div class="fld" style="grid-column:1/-1"><label>Asset</label>${a ? `<input class="inp" value="${esc(a.id + ' · ' + a.name)}" disabled>` : `<select class="inp" id="asm-a">${pool.length ? pool.map((x) => `<option value="${x.id}">${x.id} · ${esc(x.name)}</option>`).join('') : '<option value="">No available asset of this type</option>'}</select>`}</div>
      <div class="fld" style="grid-column:1/-1"><label>Employee</label><select class="inp" id="asm-e">${empOpts(o.empId || '')}</select></div>
      <div class="fld"><label>Assign date</label><input type="date" class="inp" id="asm-ad" value="${today()}"></div><div class="fld"><label>Condition</label><select class="inp" id="asm-k">${CONDS.map((c) => `<option ${(a ? a.cond : 'Good') === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="fld" style="grid-column:1/-1"><label>Note <em style="font-weight:400">(optional)</em></label><input class="inp" id="asm-no" placeholder="Accessories handed over, etc."></div></div>`, foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="as-do-assign" data-id="${a ? a.id : ''}" data-req="${o.reqId || ''}">Assign</button>` });
  }
  B.act['as-assign'] = (t) => openAssign({ assetId: rid(t) || t.dataset.id });
  B.act['as-assign-any'] = () => openAssign();
  B.act['as-do-assign'] = (t) => {
    const a = aById(t.dataset.id || (B.$('#asm-a') || {}).value); if (!a) { B.toast('Choose an asset', 'bad'); return; }
    const e = B.$('#asm-e').value, cOut = B.$('#asm-k').value, from = B.$('#asm-ad').value || today();
    Object.assign(a, { status: 'Assigned', emp: e, since: from, cond: cOut, ack: false, issue: '', locId: 'lc5' });
    D().assigns.push({ id: uid('as'), asset: a.id, emp: e, from, to: '', cOut, cIn: '', note: B.$('#asm-no').value.trim() }); log(a, 'Assigned to ' + nm(e));
    if (t.dataset.req) { const r = by(D().reqs, t.dataset.req); if (r) Object.assign(r, { status: 'Fulfilled', asset: a.id }); }
    done(`${a.id} assigned to ${nm(e)}`);
  };
  const closeAssign = (a, cIn) => { const x = D().assigns.find((s) => s.asset === a.id && !s.to); if (x) { x.to = today(); x.cIn = cIn; } };
  B.act['as-return'] = (t) => { const a = aById(rid(t) || t.dataset.id); B.modal({ title: 'Return ' + a.id, body: `<p style="margin-bottom:12px"><b>${esc(a.name)}</b> from ${esc(nm(a.emp))}</p><div class="fgrid" style="grid-template-columns:1fr"><div class="fld"><label>Condition on return</label><select class="inp" id="asm-k">${CONDS.map((c) => `<option ${a.cond === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div><div class="fld"><label>Return to</label><select class="inp" id="asm-l">${opts(D().locs.filter((l) => l.id !== 'lc5'), 'lc4')}</select></div></div>`, foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="as-do-return" data-id="${a.id}">Confirm return</button>` }); };
  B.act['as-do-return'] = (t) => { const a = aById(t.dataset.id), who = nm(a.emp), c = B.$('#asm-k').value; closeAssign(a, c); log(a, 'Returned by ' + who + ' (' + c + ')'); Object.assign(a, { status: c === 'Damaged' ? 'In Repair' : 'Available', emp: null, since: '', ack: false, issue: '', cond: c, locId: B.$('#asm-l').value }); if (c === 'Damaged') D().maint.push({ id: uid('mt'), asset: a.id, kind: 'Repair', date: today(), vendor: '', cost: 0, notes: 'Returned damaged by ' + who, status: 'In Progress', next: '' }); done(a.id + ' returned'); };
  B.act['as-transfer'] = (t) => { const a = aById(t.dataset.id); B.modal({ title: 'Transfer ' + a.id, body: `<p style="margin-bottom:12px">Currently with <b>${esc(nm(a.emp))}</b></p><div class="fld"><label>Transfer to</label><select class="inp" id="asm-e">${empOpts('')}</select></div>`, foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="as-do-transfer" data-id="${a.id}">Transfer</button>` }); };
  B.act['as-do-transfer'] = (t) => { const a = aById(t.dataset.id), e = B.$('#asm-e').value; if (e === a.emp) { B.toast('Choose a different employee', 'bad'); return; } closeAssign(a, a.cond); D().assigns.push({ id: uid('as'), asset: a.id, emp: e, from: today(), to: '', cOut: a.cond, cIn: '', note: 'Transferred from ' + nm(a.emp) }); log(a, 'Transferred ' + nm(a.emp) + ' → ' + nm(e)); Object.assign(a, { emp: e, since: today(), ack: false }); done('Transferred to ' + nm(e)); };
  const retire = (a, st, msg) => { if (a.emp) closeAssign(a, a.cond); log(a, msg); a.status = st; a.emp = null; a.since = ''; a.ack = false; };
  B.act['as-retire'] = (t) => { retire(aById(t.dataset.id), 'Retired', 'Retired'); done('Asset retired'); };
  B.act['as-fixed'] = (t) => { const a = aById(t.dataset.id); log(a, 'Repaired and back in stock'); a.status = 'Available'; D().maint.filter((m) => m.asset === a.id && m.status !== 'Completed').forEach((m) => { m.status = 'Completed'; }); done('Back in stock'); };
  B.act['as-clear-issue'] = (t) => { const a = aById(t.dataset.id); a.issue = ''; log(a, 'Issue marked resolved'); done('Issue resolved'); };

  /* ---------- asset detail ---------- */
  B.act['as-view'] = (t) => {
    const a = aById(rid(t)), w = warr(a), st = a.status, ty = typ(a), hist = D().assigns.filter((s) => s.asset === a.id).reverse(), ms = D().maint.filter((m) => m.asset === a.id).reverse();
    const acts = [st === 'Available' ? `<button class="btn primary" data-act="as-assign" data-id="${a.id}">Assign</button>` : '', st === 'Assigned' ? `<button class="btn" data-act="as-return" data-id="${a.id}">Return</button><button class="btn" data-act="as-transfer" data-id="${a.id}">Transfer</button>` : '', st === 'Available' || st === 'Assigned' ? `<button class="btn" data-act="mt-new" data-id="${a.id}">${ic('settings', 15)}Maintenance</button>` : '', st === 'In Repair' ? `<button class="btn primary" data-act="as-fixed" data-id="${a.id}">Mark repaired</button>` : '', st !== 'Retired' && st !== 'Assigned' ? `<button class="btn" data-act="as-retire" data-id="${a.id}">Retire</button>` : '', a.issue ? `<button class="btn" data-act="as-clear-issue" data-id="${a.id}">Resolve issue</button>` : '', `<button class="btn" data-act="as-edit" data-id="${a.id}">${ic('edit', 15)}Edit</button>`, st !== 'Assigned' ? `<button class="btn" data-act="as-del" data-id="${a.id}">${ic('trash', 15)}</button>` : ''].join('');
    B.modal({ title: `${a.id} · ${esc(a.name)}`, wide: true, body: `<div class="as-top" style="margin-bottom:14px"><span class="as-ic">${ic(ty.icon, 22)}</span><div>${B.pill(st, STATUS[st])} ${a.issue ? '<span class="pill bad"><i></i>Issue reported</span>' : ''}</div></div>${a.issue ? `<div class="as-issue">${ic('alert', 15)} <span>${esc(a.issue)}</span></div>` : ''}
      <dl class="kv as-kv"><div><dt>Type</dt><dd>${esc(ty.name)}</dd></div><div><dt>Manufacturer / model</dt><dd>${esc(mfr(a))} ${esc(a.model)}</dd></div><div><dt>Serial no.</dt><dd>${esc(a.serial) || '—'}</dd></div><div><dt>Condition</dt><dd>${a.cond}</dd></div><div><dt>Vendor / invoice</dt><dd>${esc(vend(a))} · ${esc(a.invoice) || '—'}</dd></div><div><dt>Location</dt><dd>${esc(loc(a))}</dd></div><div><dt>Purchased</dt><dd>${fmt(a.buy)} · ${B.money(a.cost)}</dd></div><div><dt>Book value</dt><dd>${B.money(bookValue(a))} <em>${a.life ? a.life + '-yr straight line' : 'no depreciation'}</em></dd></div><div><dt>Warranty</dt><dd>${fmt(a.warranty)} <span class="pill ${w[1]}"><i></i>${w[0]}</span></dd></div><div><dt>Assigned to</dt><dd>${a.emp ? `${esc(nm(a.emp))} <em>since ${fmt(a.since)}${a.ack ? ' · acknowledged' : ' · awaiting acknowledgment'}</em>` : '—'}</dd></div></dl>${a.notes ? `<p class="as-note">${esc(a.notes)}</p>` : ''}
      <h4 style="margin:16px 0 8px">Assignment history</h4>${hist.length ? `<ul class="as-hist">${hist.map((s) => `<li><i></i><div><b>${esc(nm(s.emp))}</b><span>${fmt(s.from)} → ${s.to ? fmt(s.to) : 'present'}${s.cIn ? ' · returned ' + s.cIn : ''}</span></div></li>`).join('')}</ul>` : '<p class="as-none">Never assigned.</p>'}
      ${ms.length ? `<h4 style="margin:16px 0 8px">Maintenance</h4><ul class="as-hist">${ms.map((m) => `<li><i></i><div><b>${m.kind} · ${m.status}</b><span>${fmt(m.date)}${m.cost ? ' · ' + B.money(m.cost) : ''} · ${esc(m.notes)}</span></div></li>`).join('')}</ul>` : ''}
      <h4 style="margin:16px 0 8px">Activity log</h4><ul class="as-hist">${a.hist.slice().reverse().map((h) => `<li><i></i><div><b>${esc(h.t)}</b><span>${fmt(h.d)} · ${esc(h.by)}</span></div></li>`).join('')}</ul>`, foot: acts });
  };

  /* =========================== ASSIGNMENTS =========================== */
  page('asset-assign', () => {
    const d = D(), f = F.asg, pend = d.reqs.filter((r) => r.status === 'Pending').length, q = (f.q || '').toLowerCase();
    const cur0 = d.assigns.filter((s) => !s.to), cr = (f.tab === 'history' ? d.assigns.filter((s) => s.to) : cur0).filter((s) => { const a = aById(s.asset) || {}; return !q || (nm(s.emp) + s.asset + (a.name || '')).toLowerCase().includes(q); }).sort((x, y) => y.from.localeCompare(x.from));
    let body;
    if (f.tab === 'requests') {
      body = d.reqs.length ? `<div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Employee</th><th>Asset type</th><th>Reason</th><th>Requested</th><th>Status</th><th class="r"></th></tr></thead><tbody>${d.reqs.slice().reverse().map((r) => `<tr data-id="${r.id}"><td>${person(r.emp)}</td><td>${esc((by(d.types, r.typeId) || {}).name)}</td><td style="white-space:normal;min-width:220px">${esc(r.reason)}${r.note ? `<em class="sub">${esc(r.note)}</em>` : ''}</td><td>${fmt(r.date)}</td><td>${B.pill(r.status, r.status === 'Pending' ? 'warn' : r.status === 'Fulfilled' ? 'ok' : 'bad')}${r.asset ? `<em class="sub">${r.asset}</em>` : ''}</td><td class="r">${r.status === 'Pending' ? '<button class="btn sm" data-act="rq-reject">Reject</button> <button class="btn sm primary" data-act="rq-approve">Assign</button>' : ''}</td></tr>`).join('')}</tbody></table></div></div>` : `<div class="card pad empty">${ic('inbox', 34)}<b>No requests</b></div>`;
    } else {
      body = `<div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Employee</th><th>Asset</th><th>Assigned</th><th>${f.tab === 'history' ? 'Returned' : 'Held for'}</th><th>${f.tab === 'history' ? 'Condition' : 'Receipt'}</th><th class="r"></th></tr></thead><tbody>${cr.length ? cr.map((s) => { const a = aById(s.asset) || { name: s.asset }, days = Math.round(((s.to ? new Date(s.to) : new Date()) - new Date(s.from)) / 864e5); return `<tr data-id="${s.asset}"><td>${person(s.emp)}</td><td><b>${esc(a.name)}</b><em class="sub">${s.asset}${a.typeId ? ' · ' + esc(typ(a).name) : ''}</em></td><td>${fmt(s.from)}</td><td>${f.tab === 'history' ? fmt(s.to) : days + ' days'}</td><td>${f.tab === 'history' ? `${s.cOut} → ${s.cIn || '—'}` : (a.ack ? '<span class="pill ok"><i></i>Acknowledged</span>' : '<span class="pill warn"><i></i>Pending</span>')}</td><td class="r">${f.tab === 'history' ? '' : '<button class="btn sm" data-act="as-transfer">Transfer</button> <button class="btn sm" data-act="as-return">Return</button>'}</td></tr>`; }).join('') : '<tr><td colspan="6"><div class="empty"><span>Nothing here.</span></div></td></tr>'}</tbody></table></div></div>`;
    }
    return `${B.head('Asset Assignments', 'Who has what, the full hand-over history and employee asset requests.', `<button class="btn primary" data-act="as-assign-any">${ic('user-check', 16)}Assign Asset</button>`, crumbs('Assignments'))}
      ${kpis([Kp('user-check', 'Currently assigned', cur0.length, 'ok'), Kp('clock', 'Awaiting acknowledgment', cur0.filter((s) => !(aById(s.asset) || {}).ack).length, 'warn'), Kp('inbox', 'Open requests', pend, pend ? 'warn' : ''), Kp('check-circle', 'Available to assign', d.assets.filter((a) => a.status === 'Available').length)])}
      <div class="filterbar">${tabs([['current', 'Current'], ['history', 'History'], ['requests', 'Requests' + (pend ? ' (' + pend + ')' : '')]], f.tab, 'as-atab')}${f.tab !== 'requests' ? `<label class="search">${ic('search', 16)}<input data-inp="asaq" placeholder="Search employee or asset…" value="${esc(f.q)}"></label>` : ''}</div>${body}`;
  });
  B.act['as-atab'] = (t) => { F.asg.tab = t.dataset.t; rerender(); };
  B.inp.asaq = (t) => { F.asg.q = t.value; const p = t.selectionStart; rerender(); const i = B.$('[data-inp="asaq"]'); if (i) { i.focus(); i.setSelectionRange(p, p); } };
  B.act['rq-approve'] = (t) => { const r = by(D().reqs, rid(t)); openAssign({ empId: r.emp, typeId: r.typeId, reqId: r.id }); };
  B.act['rq-reject'] = (t) => { const r = by(D().reqs, rid(t)); B.modal({ title: 'Reject request', body: '<div class="fld"><label>Reason (visible to the employee)</label><textarea class="inp" id="asm-no" rows="3"></textarea></div>', foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="rq-do-reject" data-id="${r.id}">Reject</button>` }); };
  B.act['rq-do-reject'] = (t) => { const r = by(D().reqs, t.dataset.id); r.status = 'Rejected'; r.note = B.$('#asm-no').value.trim(); done('Request rejected'); };

  /* =========================== MAINTENANCE =========================== */
  page('asset-maint', () => {
    const d = D(), st = F.mnt.st, l = d.maint.filter((m) => !st || m.status === st).sort((a, b) => b.date.localeCompare(a.date));
    const overdue = d.maint.filter((m) => m.status === 'Scheduled' && m.date < today()).length;
    return `${B.head('Asset Maintenance', 'Schedule servicing, track repairs and their cost.', `<button class="btn primary" data-act="mt-new" data-id="">${ic('plus', 16)}New Maintenance</button>`, crumbs('Maintenance'))}
      ${kpis([Kp('clock', 'Scheduled', d.maint.filter((m) => m.status === 'Scheduled').length), Kp('zap', 'In progress', d.maint.filter((m) => m.status === 'In Progress').length, 'warn'), Kp('alert', 'Overdue', overdue, overdue ? 'bad' : ''), Kp('dollar', 'Cost to date', B.money(d.maint.reduce((s, m) => s + (+m.cost || 0), 0)))])}
      <div class="filterbar"><select class="inp sm" data-chg="mtst"><option value="">Status: All</option>${MST.map((s) => `<option ${st === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr><th>Asset</th><th>Type</th><th>Date</th><th>Vendor</th><th class="r">Cost</th><th>Status</th><th class="r"></th></tr></thead><tbody>${l.length ? l.map((m) => { const a = aById(m.asset) || { name: m.asset }; return `<tr data-id="${m.id}"><td><b>${esc(a.name)}</b><em class="sub">${m.asset}</em></td><td>${m.kind}<em class="sub" style="white-space:normal;min-width:160px">${esc(m.notes)}</em></td><td>${fmt(m.date)}${m.status === 'Scheduled' && m.date < today() ? ' <span class="pill bad"><i></i>Overdue</span>' : ''}</td><td>${esc((by(d.vendors, m.vendor) || { name: '—' }).name)}</td><td class="r">${m.cost ? B.money(m.cost) : '—'}</td><td>${B.pill(m.status, m.status === 'Completed' ? 'ok' : m.status === 'In Progress' ? 'warn' : 'info')}</td><td class="r">${m.status === 'Scheduled' ? '<button class="btn sm" data-act="mt-start">Start</button> ' : ''}${m.status !== 'Completed' ? '<button class="btn sm primary" data-act="mt-complete">Complete</button> ' : ''}<button class="icon-btn sm" data-act="mt-del" aria-label="Delete">${ic('trash', 15)}</button></td></tr>`; }).join('') : '<tr><td colspan="7"><div class="empty"><span>No maintenance records.</span></div></td></tr>'}</tbody></table></div></div>`;
  });
  B.chg.mtst = (t) => { F.mnt.st = t.value; rerender(); };
  B.act['mt-new'] = (t) => {
    const d = D(), pre = t.dataset.id;
    B.modal({ title: 'New Maintenance', wide: true, body: `<div class="fgrid" style="grid-template-columns:1fr 1fr"><div class="fld" style="grid-column:1/-1"><label>Asset</label><select class="inp" id="mtm-a">${d.assets.filter((a) => a.status !== 'Retired').map((a) => `<option value="${a.id}" ${a.id === pre ? 'selected' : ''}>${a.id} · ${esc(a.name)}</option>`).join('')}</select></div>
      <div class="fld"><label>Kind</label><select class="inp" id="mtm-k">${KINDS.map((k) => `<option>${k}</option>`).join('')}</select></div><div class="fld"><label>Date</label><input type="date" class="inp" id="mtm-d" value="${today()}"></div>
      <div class="fld"><label>Vendor / service centre</label><select class="inp" id="mtm-v">${opts(d.vendors, '', 'In-house')}</select></div><div class="fld"><label>Estimated cost (৳)</label><input type="number" min="0" class="inp" id="mtm-c"></div>
      <div class="fld" style="grid-column:1/-1"><label>Notes</label><textarea class="inp" id="mtm-n" rows="2"></textarea></div><label class="chk-row" style="grid-column:1/-1"><input type="checkbox" id="mtm-r">Take the asset out of service (mark In Repair)</label></div>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="mt-save">Save</button>' });
  };
  B.act['mt-save'] = () => {
    const a = aById(B.$('#mtm-a').value), kind = B.$('#mtm-k').value, d = B.$('#mtm-d').value || today(), out = B.$('#mtm-r').checked;
    if (out && a.emp) { closeAssign(a, a.cond); a.emp = null; a.since = ''; a.ack = false; }
    D().maint.push({ id: uid('mt'), asset: a.id, kind, date: d, vendor: B.$('#mtm-v').value, cost: +B.$('#mtm-c').value || 0, notes: B.$('#mtm-n').value.trim(), status: out || d <= today() ? 'In Progress' : 'Scheduled', next: '' });
    if (out) a.status = 'In Repair'; log(a, kind + ' maintenance ' + (out ? 'started' : 'scheduled')); done('Maintenance saved');
  };
  B.act['mt-start'] = (t) => { const m = by(D().maint, rid(t)); m.status = 'In Progress'; done(); };
  B.act['mt-complete'] = (t) => { const m = by(D().maint, rid(t)); B.modal({ title: 'Complete maintenance', body: `<div class="fgrid" style="grid-template-columns:1fr 1fr"><div class="fld"><label>Final cost (৳)</label><input type="number" min="0" class="inp" id="mtm-c" value="${m.cost || ''}"></div><div class="fld"><label>Next service (optional)</label><input type="date" class="inp" id="mtm-nx"></div><div class="fld" style="grid-column:1/-1"><label>Work done</label><textarea class="inp" id="mtm-n" rows="2">${esc(m.notes)}</textarea></div></div>`, foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="mt-do-complete" data-id="${m.id}">Complete</button>` }); };
  B.act['mt-do-complete'] = (t) => {
    const m = by(D().maint, t.dataset.id), a = aById(m.asset); Object.assign(m, { status: 'Completed', cost: +B.$('#mtm-c').value || 0, notes: B.$('#mtm-n').value.trim(), next: B.$('#mtm-nx').value });
    if (a) { log(a, m.kind + ' completed'); if (a.status === 'In Repair' && !D().maint.some((x) => x.asset === a.id && x.status !== 'Completed' && x !== m)) a.status = 'Available'; if (m.next) D().maint.push({ id: uid('mt'), asset: a.id, kind: 'Preventive', date: m.next, vendor: m.vendor, cost: 0, notes: 'Follow-up to ' + m.kind, status: 'Scheduled', next: '' }); }
    done('Maintenance completed');
  };
  B.act['mt-del'] = (t) => { db.maint = D().maint.filter((m) => m.id !== rid(t)); done('Record deleted'); };

  /* =========================== MASTERS =========================== */
  const MASTERS = {
    types: { label: 'Asset Types', one: 'Asset Type', list: 'types', used: (x) => D().assets.filter((a) => a.typeId === x.id).length, fields: [['name', 'Type name', 'text'], ['prefix', 'Tag prefix (3 letters)', 'text'], ['icon', 'Icon', 'icon'], ['life', 'Useful life (years)', 'number'], ['warranty', 'Default warranty (years)', 'number'], ['serial', 'Serial number required', 'check'], ['desc', 'Description', 'text', 1]], cols: (x) => [`<span class="as-ic sm">${ic(x.icon, 15)}</span> <b>${esc(x.name)}</b>`, x.prefix, x.life + ' yrs', x.warranty + ' yr'], heads: ['Type', 'Prefix', 'Life', 'Warranty'] },
    mfrs: { label: 'Manufacturers', one: 'Manufacturer', list: 'mfrs', used: (x) => D().assets.filter((a) => a.mfrId === x.id).length, fields: [['name', 'Manufacturer name', 'text'], ['country', 'Country', 'text'], ['website', 'Website', 'text'], ['email', 'Support email', 'text'], ['phone', 'Support phone', 'text']], cols: (x) => [`<b>${esc(x.name)}</b>`, esc(x.country), esc(x.website), esc(x.email || x.phone || '—')], heads: ['Manufacturer', 'Country', 'Website', 'Support'] },
    vendors: { label: 'Vendors', one: 'Vendor', list: 'vendors', used: (x) => D().assets.filter((a) => a.vendorId === x.id).length, fields: [['name', 'Vendor name', 'text'], ['contact', 'Contact person', 'text'], ['phone', 'Phone', 'text'], ['email', 'Email', 'text'], ['tin', 'TIN / BIN', 'text'], ['address', 'Address', 'text', 1]], cols: (x) => [`<b>${esc(x.name)}</b>`, esc(x.contact), esc(x.phone), esc(x.email)], heads: ['Vendor', 'Contact', 'Phone', 'Email'] },
    locs: { label: 'Locations', one: 'Location', list: 'locs', used: (x) => D().assets.filter((a) => a.locId === x.id).length, fields: [['name', 'Location name', 'text'], ['kind', 'Kind', 'select', ['Office', 'Warehouse', 'Remote']], ['address', 'Address', 'text', 1]], cols: (x) => [`<b>${esc(x.name)}</b>`, x.kind, esc(x.address || '—'), ''], heads: ['Location', 'Kind', 'Address', ''] }
  };
  page('asset-masters', () => {
    const k = F.mst.tab, M = MASTERS[k], l = D()[M.list];
    return `${B.head('Asset Masters', 'Set up the lists used when creating assets.', `<button class="btn primary" data-act="ms-new">${ic('plus', 16)}New ${M.one}</button>`, crumbs('Masters'))}
      <div class="filterbar">${tabs(Object.keys(MASTERS).map((x) => [x, MASTERS[x].label]), k, 'ms-tab')}</div>
      <div class="card table-card"><div class="tscroll"><table class="dt"><thead><tr>${M.heads.map((h) => `<th>${h}</th>`).join('')}<th class="r">Assets</th><th class="r"></th></tr></thead><tbody>${l.map((x) => `<tr data-id="${x.id}">${M.cols(x).map((c) => `<td>${c}</td>`).join('')}<td class="r">${M.used(x)}</td><td class="r"><button class="icon-btn sm" data-act="ms-edit" aria-label="Edit">${ic('edit', 15)}</button><button class="icon-btn sm" data-act="ms-del" aria-label="Delete">${ic('trash', 15)}</button></td></tr>`).join('')}</tbody></table></div></div>`;
  });
  B.act['ms-tab'] = (t) => { F.mst.tab = t.dataset.t; rerender(); };
  const msForm = (M, x) => `<div class="fgrid" style="grid-template-columns:1fr 1fr">${M.fields.map((f) => { const v = x[f[0]] == null ? '' : x[f[0]], id = 'msf-' + f[0], full = f[3] === 1 ? 'grid-column:1/-1' : '';
    if (f[2] === 'check') return `<label class="chk-row" style="grid-column:1/-1"><input type="checkbox" id="${id}" ${x[f[0]] ? 'checked' : ''}>${f[1]}</label>`;
    if (f[2] === 'icon') return `<div class="fld"><label>${f[1]}</label><select class="inp" id="${id}">${ICONS.map((i) => `<option ${v === i ? 'selected' : ''}>${i}</option>`).join('')}</select></div>`;
    if (f[2] === 'select') return `<div class="fld"><label>${f[1]}</label><select class="inp" id="${id}">${f[3].map((i) => `<option ${v === i ? 'selected' : ''}>${i}</option>`).join('')}</select></div>`;
    return `<div class="fld" style="${full}"><label>${f[1]}</label><input class="inp" id="${id}" type="${f[2]}" value="${esc(v)}"></div>`; }).join('')}</div>`;
  B.act['ms-new'] = () => { const M = MASTERS[F.mst.tab]; B.modal({ title: 'New ' + M.one, body: msForm(M, { icon: 'grid', life: 3, warranty: 1, kind: 'Office' }), foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="ms-save" data-id="">Save</button>' }); };
  B.act['ms-edit'] = (t) => { const M = MASTERS[F.mst.tab], x = by(D()[M.list], rid(t)); B.modal({ title: 'Edit ' + M.one, body: msForm(M, x), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="ms-save" data-id="${x.id}">Save</button>` }); };
  B.act['ms-save'] = (t) => {
    const M = MASTERS[F.mst.tab], v = {}; M.fields.forEach((f) => { const el = B.$('#msf-' + f[0]); v[f[0]] = f[2] === 'check' ? el.checked : f[2] === 'number' ? +el.value || 0 : el.value.trim(); });
    if (!v.name) { B.toast('Name is required', 'bad'); return; }
    if (D()[M.list].some((x) => x.name.toLowerCase() === v.name.toLowerCase() && x.id !== t.dataset.id)) { B.toast(M.one + ' already exists', 'bad'); return; }
    if (M.list === 'types') { v.prefix = (v.prefix || v.name.slice(0, 3)).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); if (!v.prefix) { B.toast('Prefix must be letters', 'bad'); return; } }
    const x = t.dataset.id && by(D()[M.list], t.dataset.id);
    if (x) Object.assign(x, v); else D()[M.list].push(Object.assign({ id: uid(M.list.slice(0, 2)) }, v));
    done(M.one + (x ? ' updated' : ' added'));
  };
  B.act['ms-del'] = (t) => { const M = MASTERS[F.mst.tab], x = by(D()[M.list], rid(t)); if (M.used(x)) { B.toast(`${M.used(x)} asset(s) use this ${M.one.toLowerCase()}`, 'bad'); return; } if (M.list === 'locs' && x.id === 'lc5') { B.toast('This location is used for assigned assets', 'bad'); return; } db[M.list] = D()[M.list].filter((y) => y !== x); done(M.one + ' deleted'); };

  /* =========================== MY ASSETS =========================== */
  page('my-assets', () => {
    const id = meId(), l = forEmp(id), ack = l.filter((a) => !a.ack).length, rq = D().reqs.filter((r) => r.emp === id).slice().reverse();
    return `${B.head('My Assets', 'Company assets that are tagged to you', `${ack ? `<button class="btn" data-act="as-ack-all">${ic('check', 15)}Acknowledge all (${ack})</button>` : ''}<button class="btn primary" data-act="rq-new">${ic('plus', 16)}Request an asset</button>`, [{ label: 'HR', href: '#/' }, { label: 'My Assets' }])}
      ${kpis([Kp('briefcase', 'Assets with me', l.length), Kp('alert', 'Awaiting acknowledgment', ack, ack ? 'warn' : ''), Kp('dollar', 'Total value', B.money(l.reduce((s, a) => s + a.cost, 0)))], 3)}
      ${l.length ? `<div class="as-grid">${l.map((a) => { const w = warr(a); return `<div class="card pad as-c" data-id="${a.id}"><div class="as-top"><span class="as-ic">${ic(typ(a).icon, 20)}</span><div><b>${esc(a.name)}</b><span>${esc(typ(a).name)} · ${esc(mfr(a))}</span></div>${a.ack ? '' : '<span class="pill warn"><i></i>New</span>'}</div>
        <dl class="kv"><div><dt>Asset tag</dt><dd><b>${a.id}</b></dd></div><div><dt>Serial no.</dt><dd>${esc(a.serial) || '—'}</dd></div><div><dt>Assigned on</dt><dd>${fmt(a.since)}</dd></div><div><dt>Condition</dt><dd>${a.cond}</dd></div><div><dt>Warranty</dt><dd>${fmt(a.warranty)} <span class="pill ${w[1]}"><i></i>${w[0]}</span></dd></div></dl>
        ${a.issue ? `<div class="as-issue">${ic('alert', 15)} <span>Issue reported: ${esc(a.issue)}</span></div>` : ''}
        <div class="as-act">${a.ack ? `<span class="as-ok">${ic('check-circle', 15)}Received</span>` : '<button class="btn sm primary" data-act="as-ack">Acknowledge receipt</button>'}<button class="btn sm" data-act="as-report">${ic('alert', 14)}Report issue</button></div></div>`; }).join('')}</div>` : `<div class="card pad empty">${ic('briefcase', 34)}<b>No assets assigned to you</b><span>When IT or HR tags an asset to you, it will show up here.</span></div>`}
      ${rq.length ? `<h3 class="ct" style="margin:22px 0 10px">My requests</h3><div class="card table-card"><div class="tscroll"><table class="dt"><tbody>${rq.map((r) => `<tr data-id="${r.id}"><td><b>${esc((by(D().types, r.typeId) || {}).name)}</b><em class="sub" style="white-space:normal">${esc(r.reason)}</em></td><td>${fmt(r.date)}</td><td>${B.pill(r.status, r.status === 'Pending' ? 'warn' : r.status === 'Fulfilled' ? 'ok' : 'bad')}${r.note ? `<em class="sub">${esc(r.note)}</em>` : ''}${r.asset ? `<em class="sub">${r.asset}</em>` : ''}</td><td class="r">${r.status === 'Pending' ? '<button class="btn sm" data-act="rq-cancel">Cancel</button>' : ''}</td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
  });
  B.act['as-ack'] = (t) => { const a = aById(rid(t)); a.ack = true; log(a, 'Receipt acknowledged by ' + nm(a.emp)); done('Receipt acknowledged'); };
  B.act['as-ack-all'] = () => { forEmp(meId()).forEach((a) => { if (!a.ack) { a.ack = true; log(a, 'Receipt acknowledged by ' + nm(a.emp)); } }); done('All assets acknowledged'); };
  B.act['as-report'] = (t) => { const a = aById(rid(t)); B.modal({ title: 'Report an issue · ' + a.id, body: `<div class="fld"><label>What is wrong?</label><textarea class="inp" id="asm-i" rows="4" placeholder="Describe the problem">${esc(a.issue)}</textarea></div>`, foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="as-report-save" data-id="${a.id}">Submit</button>` }); };
  B.act['as-report-save'] = (t) => { const v = B.$('#asm-i').value.trim(); if (!v) { B.toast('Please describe the issue', 'bad'); return; } const a = aById(t.dataset.id); a.issue = v; log(a, 'Issue reported: ' + v); done('Issue reported to IT'); };
  B.act['rq-new'] = () => B.modal({ title: 'Request an asset', body: `<div class="fgrid" style="grid-template-columns:1fr"><div class="fld"><label>What do you need?</label><select class="inp" id="rqm-t">${opts(D().types)}</select></div><div class="fld"><label>Why do you need it?</label><textarea class="inp" id="rqm-r" rows="3" placeholder="Short justification for IT / HR"></textarea></div></div>`, foot: '<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="rq-save">Submit request</button>' });
  B.act['rq-save'] = () => { const r = B.$('#rqm-r').value.trim(); if (!r) { B.toast('Please add a reason', 'bad'); return; } D().reqs.push({ id: uid('rq'), emp: meId(), typeId: B.$('#rqm-t').value, reason: r, date: today(), status: 'Pending', asset: '', note: '' }); done('Request sent to IT'); };
  B.act['rq-cancel'] = (t) => { db.reqs = D().reqs.filter((r) => r.id !== rid(t)); done('Request cancelled'); };
})();
