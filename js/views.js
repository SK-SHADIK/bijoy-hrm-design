/* Bijoy HRMS — generic DocType views: List, Report, Kanban, Calendar, Cards, and Form */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const NUMK = ['n', 'money', 'gross', 'ded', 'net'];
  const isNum = (c) => NUMK.includes(c.kind);
  const DESIGS = [...new Set(B.EMPLOYEES.map((e) => e.desig))];

  B.title = (doc, row) => {
    if (doc.names) return row.name;
    const k = doc.cols.findIndex((c) => c.kind === 'emp' || c.kind === 'applicant');
    return k >= 0 ? row.vals[k] : row.name;
  };
  B.docHref = (doc, name) => (doc.profile ? '#/employee/' + name : '#/form/' + doc.id + '/' + encodeURIComponent(name));
  B.crumbs = (items) => `<nav class="crumbs">${items.map((i, k) => (i.href ? `<a href="${i.href}">${esc(i.label)}</a>` : `<span>${esc(i.label)}</span>`) + (k < items.length - 1 ? ic('right', 12) : '')).join('')}</nav>`;

  /* ---------- Cells & controls ---------- */
  B.cell = (c, v) => {
    switch (c.kind) {
      case 'emp': case 'applicant': return `<span class="who">${B.avatar(v, 24)}<span>${esc(v)}</span></span>`;
      case 'st': return B.pill(v);
      case 'money': case 'gross': case 'ded': case 'net': return `<span class="num">${B.money(v)}</span>`;
      case 'date': case 'pdate': case 'fdate': return B.fdate(v);
      case 'datetime': return B.fdt(v);
      case 'pct': return B.prog(v);
      case 'stars': return B.stars(v);
      case 'bool': return v ? `<span class="chk-on">${ic('check', 13)}</span>` : '<span class="chk-off"></span>';
      case 'email': return `<span class="lnk">${esc(v)}</span>`;
      case 'n': return `<span class="num">${v}</span>`;
      default: return esc(v);
    }
  };
  B.control = (c, v, ro, cls) => {
    const dis = ro ? 'disabled' : '';
    const opts = (arr) => arr.map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('');
    const sel = (arr) => { if (v !== '' && v != null && !arr.includes(v)) arr = [v, ...arr]; return `<select class="inp ${cls || ''}" ${dis} data-chg="fdirty">${opts(arr)}</select>`; };
    switch (c.kind) {
      case 'emp': return sel(B.EMPLOYEES.map((e) => e.name));
      case 'applicant': return sel(B.APPLICANTS);
      case 'dept': return sel(['Management', ...B.DEPTS]);
      case 'branch': return sel(B.BRANCHES);
      case 'desig': return sel(DESIGS);
      case 'company': return sel([B.COMPANY, 'Bijoy Digital Services', 'Bijoy Foundation']);
      case 'st': case 'pick': return sel(c.arg === 'x' ? [] : c.arg.split('|'));
      case 'date': case 'pdate': case 'fdate': return `<input class="inp ${cls || ''}" type="date" value="${v}" ${dis} data-chg="fdirty">`;
      case 'datetime': return `<input class="inp ${cls || ''}" type="datetime-local" value="${v}" ${dis} data-chg="fdirty">`;
      case 'money': case 'gross': case 'ded': case 'net': return `<div class="adorn"><span>৳</span><input class="inp ${cls || ''}" type="number" value="${v}" ${dis} data-inp="fdirty"></div>`;
      case 'n': return `<input class="inp ${cls || ''}" type="number" value="${v}" ${dis} data-inp="fdirty">`;
      case 'pct': return `<div class="adorn end"><input class="inp ${cls || ''}" type="number" value="${v}" ${dis} data-inp="fdirty"><span>%</span></div>`;
      case 'stars': return B.stars(v, !ro);
      case 'bool': return `<label class="switch"><input type="checkbox" ${v ? 'checked' : ''} ${dis} data-chg="fdirty"><i></i></label>`;
      default: return `<input class="inp ${cls || ''}" type="${c.kind === 'email' ? 'email' : 'text'}" value="${esc(v)}" ${dis} data-inp="fdirty">`;
    }
  };

  /* ---------- List state ---------- */
  const state = {};
  const S = (id) => state[id] || (state[id] = { q: '', status: '', sort: 'modified', dir: 1, page: 0, size: 20, sel: new Set(), hidden: new Set(), group: '', filters: [], cal: { y: B.today.getFullYear(), m: B.today.getMonth() } });
  const cmp = (a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)));

  function visible(doc, s) {
    let rows = B.getRows(doc.id).slice();
    const si = B.statusColIdx(doc);
    if (s.q) { const q = s.q.toLowerCase(); rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.vals.some((v) => String(v).toLowerCase().includes(q))); }
    if (s.status && si >= 0) rows = rows.filter((r) => r.vals[si] === s.status);
    s.filters.forEach((f) => {
      rows = rows.filter((r) => {
        const v = r.vals[f.col], a = String(v).toLowerCase(), b = String(f.val).toLowerCase();
        return f.op === '=' ? a === b : f.op === '!=' ? a !== b : f.op === 'like' ? a.includes(b) : f.op === '>' ? Number(v) > Number(f.val) : Number(v) < Number(f.val);
      });
    });
    const k = s.sort === 'modified' ? null : s.sort === 'name' ? -1 : +s.sort;
    rows.sort((x, y) => (k === null ? x.modified - y.modified : k === -1 ? cmp(x.name, y.name) : cmp(x.vals[k], y.vals[k])) * s.dir);
    return rows;
  }

  /* ---------- Table ---------- */
  function shownCols(doc, s) { return doc.cols.map((c, ci) => ({ c, ci })).filter((x) => !(doc.names && x.ci === 0) && !s.hidden.has(x.ci)); }
  function tableHTML(doc, s, rows, report) {
    const cols = shownCols(doc, s);
    const total = rows.length;
    const pageRows = report ? rows : rows.slice(s.page * s.size, (s.page + 1) * s.size);
    const head = `<tr><th class="ck"><input type="checkbox" data-act="sel-all" ${s.sel.size && s.sel.size === pageRows.length ? 'checked' : ''}></th><th>Name</th>${cols.map((x) => `<th class="${isNum(x.c) ? 'r' : ''}">${esc(x.c.label)}</th>`).join('')}${report ? '' : '<th class="r">Modified</th>'}</tr>`;
    const rowHTML = (r) => `<tr data-act="row" data-href="${B.docHref(doc, r.name)}" class="${s.sel.has(r.name) ? 'sel' : ''}"><td class="ck"><input type="checkbox" data-act="sel" data-name="${esc(r.name)}" ${s.sel.has(r.name) ? 'checked' : ''}></td><td class="idc"><a href="${B.docHref(doc, r.name)}">${esc(r.name)}</a></td>${cols.map((x) => `<td class="${isNum(x.c) ? 'r' : ''}">${B.cell(x.c, r.vals[x.ci])}</td>`).join('')}${report ? '' : `<td class="r modc">${r.comments ? `<span class="cm">${ic('message', 13)}${r.comments}</span>` : ''}<span>${B.ago(r.modified)}</span></td>`}</tr>`;
    let body = '';
    if (report && s.group) {
      const gi = +s.group; const groups = {};
      pageRows.forEach((r) => (groups[r.vals[gi]] = groups[r.vals[gi]] || []).push(r));
      Object.keys(groups).sort().forEach((g) => {
        body += `<tr class="grp"><td colspan="${cols.length + 2}"><b>${esc(g)}</b><span>${groups[g].length} rows</span></td></tr>` + groups[g].map(rowHTML).join('');
      });
    } else body = pageRows.map(rowHTML).join('');
    if (!pageRows.length) body = `<tr><td colspan="${cols.length + 3}"><div class="empty">${ic('inbox', 34)}<b>No ${esc(doc.label)} found</b><span>Try adjusting your filters or create a new one.</span></div></td></tr>`;
    let foot = '';
    if (report) {
      foot = `<tr class="tot"><td></td><td>Total</td>${cols.map((x) => `<td class="r">${isNum(x.c) && x.c.kind !== 'n' ? B.money(rows.reduce((a, r) => a + r.vals[x.ci], 0)) : isNum(x.c) ? rows.reduce((a, r) => a + r.vals[x.ci], 0) : ''}</td>`).join('')}</tr>`;
    }
    const pager = report ? `<div class="pager"><span>${total} rows</span></div>` : `<div class="pager"><span>${total ? s.page * s.size + 1 : 0}–${Math.min((s.page + 1) * s.size, total)} of ${total}</span><div class="seg">${[20, 100, 500].map((n) => `<button class="${s.size === n ? 'on' : ''}" data-act="lsize" data-n="${n}">${n}</button>`).join('')}</div><span class="grow"></span><button class="btn sm" data-act="lpage" data-d="-1" ${s.page === 0 ? 'disabled' : ''}>${ic('left', 14)}Prev</button><button class="btn sm" data-act="lpage" data-d="1" ${(s.page + 1) * s.size >= total ? 'disabled' : ''}>Next${ic('right', 14)}</button></div>`;
    return `<div class="card table-card"><div class="tscroll"><table class="dt"><thead>${head}</thead><tbody>${body}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ''}</table></div>${pager}</div>`;
  }

  /* ---------- Auto chart for report view ---------- */
  function reportChart(doc, rows) {
    let gi = doc.cols.findIndex((c) => c.kind === 'st');
    if (gi < 0) gi = doc.cols.findIndex((c) => c.kind === 'dept');
    if (gi < 0) gi = doc.cols.findIndex((c) => c.kind === 'pick' && !(doc.names && c === doc.cols[0]));
    if (gi < 0) return '';
    const cnt = {}; rows.forEach((r) => (cnt[r.vals[gi]] = (cnt[r.vals[gi]] || 0) + 1));
    const data = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }));
    const ni = doc.cols.findIndex((c) => isNum(c) && c.kind !== 'n');
    return `<div class="grid-2"><div class="card pad"><h3 class="ct">${esc(doc.cols[gi].label)} distribution</h3>${B.donut(data, { center: rows.length, label: 'Rows' })}</div>
      <div class="card pad"><h3 class="ct">${ni >= 0 ? esc(doc.cols[ni].label) + ' by ' + esc(doc.cols[gi].label) : 'Records by ' + esc(doc.cols[gi].label)}</h3>${
        ni >= 0
          ? B.hbars(Object.keys(cnt).slice(0, 6).map((k) => ({ label: k, value: rows.filter((r) => r.vals[gi] === k).reduce((a, r) => a + r.vals[ni], 0) })), { multi: true, fmt: B.short })
          : B.hbars(data, { multi: true })
      }</div></div>`;
  }

  /* ---------- Kanban ---------- */
  function kanbanHTML(doc, s, rows) {
    const si = B.statusColIdx(doc);
    if (si < 0) return '';
    const stages = doc.cols[si].arg.split('|').filter((v, i, a) => a.indexOf(v) === i);
    return `<div class="kanban">${stages.map((stg) => {
      const list = rows.filter((r) => r.vals[si] === stg);
      return `<div class="kcol" data-stage="${esc(stg)}"><div class="kcol-h"><span class="dot ${B.pillClass(stg)}"></span><b>${esc(stg)}</b><em>${list.length}</em><button class="icon-btn sm" data-act="toast" data-msg="New ${esc(doc.label)} in ${esc(stg)}">${ic('plus', 15)}</button></div>
        <div class="kcol-b">${list.map((r) => kcard(doc, r)).join('') || '<div class="kempty">Drop here</div>'}</div></div>`;
    }).join('')}</div>`;
  }
  function kcard(doc, r) {
    const meta = doc.cols.map((c, i) => ({ c, v: r.vals[i] })).filter((x) => x.c.kind !== 'st' && x.c.kind !== 'emp' && x.c.kind !== 'applicant' && !(doc.names && x.c === doc.cols[0])).slice(0, 3);
    const who = doc.cols.find((c) => c.kind === 'emp' || c.kind === 'applicant');
    return `<div class="kcard" draggable="true" data-act="row" data-name="${esc(r.name)}" data-href="${B.docHref(doc, r.name)}"><div class="kc-t">${who ? B.avatar(B.title(doc, r), 28) : ''}<div><b>${esc(B.title(doc, r))}</b><span>${esc(r.name)}</span></div></div>
      <div class="kc-m">${meta.map((m) => `<div><em>${esc(m.c.label)}</em><span>${B.cell(m.c, m.v)}</span></div>`).join('')}</div></div>`;
  }

  /* ---------- Calendar ---------- */
  function calendarHTML(doc, s, rows) {
    const { y, m } = s.cal, ci = doc.cols.findIndex((c) => c.label === doc.cal), si = B.statusColIdx(doc);
    const first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate(), off = first.getDay();
    const byDay = {};
    rows.forEach((r) => { const d = B.parse(r.vals[ci]); if (d.getFullYear() === y && d.getMonth() === m) (byDay[d.getDate()] = byDay[d.getDate()] || []).push(r); });
    let cells = '';
    for (let i = 0; i < off; i++) cells += '<div class="cd out"></div>';
    for (let d = 1; d <= days; d++) {
      const wd = (off + d - 1) % 7, isT = y === B.today.getFullYear() && m === B.today.getMonth() && d === B.today.getDate();
      const ev = byDay[d] || [];
      cells += `<div class="cd ${wd === 5 ? 'wk' : ''} ${isT ? 'today' : ''}"><b>${d}</b>${ev.slice(0, 3).map((r) => `<a class="ce ${si >= 0 ? B.pillClass(r.vals[si]) : 'info'}" href="${B.docHref(doc, r.name)}" title="${esc(B.title(doc, r))}">${esc(B.title(doc, r))}</a>`).join('')}${ev.length > 3 ? `<span class="more">+${ev.length - 3} more</span>` : ''}</div>`;
    }
    return `<div class="card cal-card"><div class="cal-h"><button class="icon-btn" data-act="lcal" data-d="-1">${ic('left')}</button><h3>${B.MONTHS_FULL[m]} ${y}</h3><button class="icon-btn" data-act="lcal" data-d="1">${ic('right')}</button><span class="grow"></span><button class="btn sm" data-act="lcal" data-d="0">Today</button></div>
      <div class="cal-grid">${B.DAYS.map((d, i) => `<div class="cw ${i === 5 ? 'wk' : ''}">${d}</div>`).join('')}${cells}</div></div>`;
  }

  /* ---------- Employee cards ---------- */
  function cardsHTML(doc, s, rows) {
    return `<div class="emp-grid">${rows.map((r) => {
      const e = r.p;
      return `<a class="emp-card" href="#/employee/${e.id}"><div class="ec-top">${B.avatar(e.name, 64)}<span class="ec-st">${B.pill(e.status)}</span></div><h4>${esc(e.name)}</h4><p>${esc(e.desig)}</p>
        <div class="ec-tags"><span>${esc(e.dept)}</span><span>${esc(e.branch)}</span></div>
        <div class="ec-foot"><span>${ic('mail', 14)}</span><span>${ic('phone', 14)}</span><em>${esc(e.id)}</em></div></a>`;
    }).join('')}</div>`;
  }

  /* ---------- Sidebar counts ---------- */
  function sideHTML(doc, s) {
    const si = B.statusColIdx(doc), all = B.getRows(doc.id);
    if (si < 0) return '';
    const stages = doc.cols[si].arg.split('|').filter((v, i, a) => a.indexOf(v) === i);
    return `<aside class="lv-side card pad"><h4>Status</h4><button class="sd ${!s.status ? 'on' : ''}" data-act="lstatus" data-v=""><span>All</span><em>${all.length}</em></button>${stages.map((t) => `<button class="sd ${s.status === t ? 'on' : ''}" data-act="lstatus" data-v="${esc(t)}"><span class="dot ${B.pillClass(t)}"></span><span>${esc(t)}</span><em>${all.filter((r) => r.vals[si] === t).length}</em></button>`).join('')}
      <h4>Assigned To</h4><div class="sd-people">${B.avstack(B.EMPLOYEES.slice(1, 6).map((e) => e.name), 28)}<span>+ ${Math.max(all.length - 5, 0)}</span></div>
      <h4>Tags</h4><div class="chips"><span class="chip">urgent</span><span class="chip">review</span><span class="chip">+ Add</span></div></aside>`;
  }

  /* ---------- List page ---------- */
  function availViews(doc) {
    const v = [['list', 'list', 'List']];
    if (B.statusColIdx(doc) >= 0) v.push(['kanban', 'kanban', 'Kanban']);
    if (doc.cal) v.push(['calendar', 'calendar', 'Calendar']);
    v.push(['report', 'bars', 'Report']);
    if (doc.cards) v.unshift(['cards', 'grid', 'Cards']);
    return v;
  }
  function bodyHTML(doc, s, view) {
    const rows = visible(doc, s);
    let main;
    if (view === 'kanban') main = kanbanHTML(doc, s, rows);
    else if (view === 'calendar') main = calendarHTML(doc, s, rows);
    else if (view === 'cards') main = cardsHTML(doc, s, rows);
    else if (view === 'report') main = (doc.report ? '' : '') + reportChart(doc, rows) + tableHTML(doc, s, rows, true);
    else main = tableHTML(doc, s, rows, false);
    const bulk = s.sel.size ? `<div class="bulk"><b>${s.sel.size} selected</b><button class="btn sm" data-act="toast" data-msg="Submitted ${s.sel.size} documents">Submit</button><button class="btn sm" data-act="toast" data-msg="Assigned ${s.sel.size} documents">Assign To</button><button class="btn sm" data-act="toast" data-msg="Tags added">Add Tags</button><button class="btn sm" data-act="toast" data-msg="Export started">Export</button><button class="btn sm danger" data-act="toast" data-msg="Deleted ${s.sel.size} documents" data-clear="1">Delete</button><button class="icon-btn sm" data-act="lclear">${ic('x', 15)}</button></div>` : '';
    const side = view === 'list' || view === 'cards' ? sideHTML(doc, s) : '';
    return `${bulk}<div class="lv ${side ? 'has-side' : ''}">${side}<div class="lv-main">${main}</div></div>`;
  }
  const TONE = [['ok', /^(approved|active|present|paid|completed|submitted|hired|accepted|verified|resolved|done|selected|yes|enabled|filled|sent|on time|running)$/i], ['bad', /^(rejected|absent|cancelled|failed|closed|expired|no|disabled|overdue|terminated|lost)$/i], ['warn', /^(open|pending|draft|on leave|half day|late|hold|on hold|in progress|unpaid)$/i]];
  const tone = (v) => { const t = TONE.find((x) => x[1].test(String(v))); return t ? t[0] : ''; };
  function statsHTML(doc, rows) {
    const K = B.kpi, si = B.statusColIdx(doc), cnt = {};
    const cards = [];
    if (si >= 0) rows.forEach((r) => { const v = r.vals[si]; cnt[v] = (cnt[v] || 0) + 1; });
    const c = (k) => cnt[k] || 0;
    if (doc.id === 'attendance' || /^attendance$/.test(doc.label.toLowerCase())) {
      const di = doc.cols.findIndex((x) => x.label === 'Attendance Date'), li = doc.cols.findIndex((x) => x.label === 'Late Entry');
      const days = new Set(rows.map((r) => r.vals[di])).size;
      cards.push(['calendar', 'Total Work Days', days], ['user-check', 'Present', c('Present') + c('Work From Home'), 'ok'], ['x', 'Absent', c('Absent'), 'bad'], ['calendar', 'On Leave', c('On Leave'), 'warn'], ['clock', 'Half Day', c('Half Day')], ['clock', 'Late Entries', rows.filter((r) => r.vals[li] && r.vals[li] !== 'No').length, 'warn']);
    } else {
      cards.push([doc.icon || 'file', 'Total ' + doc.label, rows.length]);
      Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 3).forEach((e) => cards.push(['check-circle', e[0], e[1], tone(e[0])]));
      const mi = doc.cols.findIndex((x) => x.kind === 'money'), ni = doc.cols.findIndex((x) => x.kind === 'n');
      if (mi >= 0) cards.push(['dollar', 'Total ' + doc.cols[mi].label, B.money(rows.reduce((a, r) => a + (+r.vals[mi] || 0), 0))]);
      else if (ni >= 0) cards.push(['bars', 'Total ' + doc.cols[ni].label, rows.reduce((a, r) => a + (+r.vals[ni] || 0), 0)]);
    }
    return `<section class="kpis sm lv-stats" style="grid-template-columns:repeat(${Math.min(cards.length, 6)},minmax(0,1fr))">${cards.map((x) => K(x[0], x[1], x[2], null, null, x[3])).join('')}</section>`;
  }

  let cur = null; // { id, view }
  B.renderList = (id, view) => {
    const doc = B.docs[id], s = S(id);
    const views = availViews(doc);
    view = view || (doc.report ? 'report' : 'list');
    if (!views.some((v) => v[0] === view)) view = views[0][0];
    cur = { id, view };
    const rows0 = B.getRows(id);
    const si = B.statusColIdx(doc);
    const sortOpts = [['modified', 'Last Modified'], ['name', 'Name'], ...doc.cols.map((c, i) => [String(i), c.label]).filter((x, i) => !(doc.names && i === 0))];
    B.onMount(() => { const d = B.$('.lv-page'); if (d) wireKanban(); });
    return `<div class="lv-page" data-id="${id}">
      <div class="page-head"><div>${B.crumbs(doc.report ? [{ label: 'Reports', href: '#/page/reports' }, { label: doc.label }] : [{ label: 'HR', href: '#/' }, { label: (B.NAV.find((n) => n.id === doc.mod) || {}).label || 'Setup', href: '#/module/' + doc.mod }, { label: doc.label }])}
        <h1>${esc(doc.label)}<span class="count">${rows0.length}</span>${doc.report ? `<span class="pill info"><i></i>${esc(doc.rtype)}</span>` : ''}</h1></div>
        <div class="head-actions"><div class="seg views">${views.map((v) => `<a class="${v[0] === view ? 'on' : ''}" href="#/list/${id}/${v[0]}" title="${v[2]}">${ic(v[1], 16)}<span>${v[2]}</span></a>`).join('')}</div>
          ${B.dd(`<button class="icon-btn bordered" data-act="dd" aria-label="Menu">${ic('more')}</button>`, `<button data-act="toast" data-msg="Import wizard opened">${ic('upload', 15)}Import</button><button data-act="toast" data-msg="Exported to CSV">${ic('download', 15)}Export</button><button data-act="toast" data-msg="Print view opened">${ic('print', 15)}Print</button><button data-act="toast" data-msg="List settings opened">${ic('settings', 15)}List Settings</button><button data-act="toast" data-msg="Bulk edit opened">${ic('edit', 15)}Bulk Edit</button>`, 'right')}
          ${doc.report ? `<button class="btn" data-act="toast" data-msg="Report exported">${ic('download', 16)}Export</button>` : `<a class="btn primary" href="#/form/${id}/new">${ic('plus', 16)}Add ${esc(doc.label)}</a>`}</div></div>
      ${statsHTML(doc, rows0)}
      <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="lq" placeholder="Search ${esc(doc.label)}…" value="${esc(s.q)}"></label>
        ${si >= 0 ? `<select class="inp sm" data-chg="lstatusdd"><option value="">Status: All</option>${[...new Set(doc.cols[si].arg.split('|'))].map((t) => `<option ${s.status === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>` : ''}
        <button class="btn" data-act="lfilters">${ic('filter', 15)}Filters${s.filters.length ? `<em class="badge">${s.filters.length}</em>` : ''}</button>
        ${B.dd(`<button class="btn" data-act="dd">${ic('bars', 15)}Sort</button>`, sortOpts.map((o) => `<button data-act="lsort" data-v="${o[0]}" class="${String(s.sort) === o[0] ? 'on' : ''}">${esc(o[1])}${String(s.sort) === o[0] ? ic('check', 14) : ''}</button>`).join(''))}
        <button class="icon-btn bordered" data-act="ldir" title="Toggle order">${ic(s.dir > 0 ? 'down' : 'up', 16)}</button>
        ${view === 'report' || view === 'list' ? B.dd(`<button class="btn" data-act="dd">${ic('grid', 15)}Columns</button>`, `<div class="dd-title">Show columns</div>` + doc.cols.map((c, i) => (doc.names && i === 0 ? '' : `<label class="dd-chk"><input type="checkbox" data-chg="lcol" data-i="${i}" ${s.hidden.has(i) ? '' : 'checked'}>${esc(c.label)}</label>`)).join('')) : ''}
        ${view === 'report' ? `<select class="inp sm" data-chg="lgroup"><option value="">Group by…</option>${doc.cols.map((c, i) => (c.kind === 'st' || c.kind === 'pick' || c.kind === 'dept' || c.kind === 'branch' ? `<option value="${i}" ${String(s.group) === String(i) ? 'selected' : ''}>${esc(c.label)}</option>` : '')).join('')}</select>` : ''}
        <button class="icon-btn bordered" data-act="lrefresh" title="Refresh">${ic('refresh', 16)}</button></div>
      <div id="lv-body">${bodyHTML(doc, s, view)}</div></div>`;
  };
  function refresh() { const el = B.$('#lv-body'); if (!el || !cur) return; el.innerHTML = bodyHTML(B.docs[cur.id], S(cur.id), cur.view); wireKanban(); }

  function wireKanban() {
    const root = B.$('#lv-body'); if (!root || !cur) return;
    B.$$('.kcard', root).forEach((c) => {
      c.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', c.dataset.name); c.classList.add('drag'); });
      c.addEventListener('dragend', () => c.classList.remove('drag'));
    });
    B.$$('.kcol', root).forEach((col) => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); });
      col.addEventListener('dragleave', () => col.classList.remove('over'));
      col.addEventListener('drop', (e) => {
        e.preventDefault(); col.classList.remove('over');
        const doc = B.docs[cur.id], row = B.getRows(cur.id).find((r) => r.name === e.dataTransfer.getData('text/plain'));
        if (row) { row.vals[B.statusColIdx(doc)] = col.dataset.stage; B.toast(`${esc(B.title(doc, row))} moved to <b>${esc(col.dataset.stage)}</b>`); refresh(); }
      });
    });
  }

  B.inp.lq = (t) => { const s = S(cur.id); s.q = t.value; s.page = 0; refresh(); };
  B.chg.lstatusdd = (t) => { const s = S(cur.id); s.status = t.value; s.page = 0; refresh(); };
  B.chg.lgroup = (t) => { S(cur.id).group = t.value; refresh(); };
  B.chg.lcol = (t) => { const s = S(cur.id), i = +t.dataset.i; t.checked ? s.hidden.delete(i) : s.hidden.add(i); refresh(); };
  B.act.lstatus = (t) => { const s = S(cur.id); s.status = t.dataset.v; s.page = 0; const dd = B.$('[data-chg="lstatusdd"]'); if (dd) dd.value = t.dataset.v; refresh(); };
  B.act.lsort = (t) => { S(cur.id).sort = t.dataset.v; B.$$('.dd-menu button.on').forEach((b) => b.classList.remove('on')); refresh(); B.toast('Sorted'); };
  B.act.ldir = (t) => { const s = S(cur.id); s.dir *= -1; t.innerHTML = ic(s.dir > 0 ? 'down' : 'up', 16); refresh(); };
  B.act.lsize = (t) => { const s = S(cur.id); s.size = +t.dataset.n; s.page = 0; refresh(); };
  B.act.lpage = (t) => { S(cur.id).page += +t.dataset.d; refresh(); };
  B.act.lcal = (t) => { const s = S(cur.id), d = +t.dataset.d; if (!d) s.cal = { y: B.today.getFullYear(), m: B.today.getMonth() }; else { s.cal.m += d; if (s.cal.m < 0) { s.cal.m = 11; s.cal.y--; } if (s.cal.m > 11) { s.cal.m = 0; s.cal.y++; } } refresh(); };
  B.act.lrefresh = () => { refresh(); B.toast('List refreshed'); };
  B.act.lclear = () => { S(cur.id).sel.clear(); refresh(); };
  B.act.row = (t, e) => { if (e.target.closest('a,input,button')) return; location.hash = t.dataset.href; };
  B.act.sel = (t) => { const s = S(cur.id); t.checked ? s.sel.add(t.dataset.name) : s.sel.delete(t.dataset.name); refresh(); };
  B.act['sel-all'] = (t) => { const s = S(cur.id), rows = visible(B.docs[cur.id], s).slice(s.page * s.size, (s.page + 1) * s.size); s.sel.clear(); if (t.checked) rows.forEach((r) => s.sel.add(r.name)); refresh(); };
  const origToast = B.act.toast;
  B.act.toast = (t, e) => { origToast(t, e); if (t.dataset.clear && cur) { S(cur.id).sel.clear(); refresh(); } if (t.dataset.nav) location.hash = t.dataset.nav; };
  B.act.lfilters = () => {
    const doc = B.docs[cur.id], s = S(cur.id);
    const row = (f, i) => `<div class="frow" data-i="${i}"><select class="inp sm">${doc.cols.map((c, k) => `<option value="${k}" ${f.col === k ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select><select class="inp sm">${['=', '!=', 'like', '>', '<'].map((o) => `<option ${f.op === o ? 'selected' : ''}>${o}</option>`).join('')}</select><input class="inp sm" value="${esc(f.val)}" placeholder="value"><button class="icon-btn sm" data-act="frm">${ic('x', 15)}</button></div>`;
    B.modal({ title: 'Filters', body: `<div id="frows">${(s.filters.length ? s.filters : [{ col: B.statusColIdx(doc) >= 0 ? B.statusColIdx(doc) : 0, op: '=', val: '' }]).map(row).join('')}</div><button class="btn sm" data-act="fadd">${ic('plus', 14)}Add a filter</button>`, foot: `<button class="btn" data-act="fclear">Clear Filters</button><button class="btn primary" data-act="fapply">Apply Filters</button>` });
    B.fRow = row;
  };
  B.act.fadd = () => { B.$('#frows').insertAdjacentHTML('beforeend', B.fRow({ col: 0, op: '=', val: '' }, 99)); };
  B.act.frm = (t) => t.closest('.frow').remove();
  B.act.fclear = () => { S(cur.id).filters = []; B.closeModal(); B.route(); B.toast('Filters cleared'); };
  B.act.fapply = () => {
    S(cur.id).filters = B.$$('.frow').map((r) => { const [a, b, c] = B.$$('select,input', r); return { col: +a.value, op: b.value, val: c.value }; }).filter((f) => f.val !== '');
    B.closeModal(); B.route(); B.toast('Filters applied');
  };

  /* ---------- Form ---------- */
  const FILES = [['Scan_Document.pdf', '214 KB'], ['Supporting_Proof.png', '1.2 MB']];
  B.renderForm = (id, name) => {
    const doc = B.docs[id];
    const isNew = name === 'new';
    const row = isNew ? { name: 'New ' + doc.label, vals: B.newVals(doc), docstatus: 0, modified: 0, comments: 0, p: B.EMPLOYEES[0] } : B.getRows(id).find((r) => r.name === name) || B.getRows(id)[0];
    const ro = row.docstatus >= 1, cancelled = row.docstatus === 2;
    const si = B.statusColIdx(doc);
    const fields = doc.cols.map((c, i) => ({ c, i, v: row.vals[i] })).filter((f) => !(doc.names && f.i === 0));
    const half = Math.ceil(fields.length / 2) > 6 ? 6 : Math.max(fields.length, 1);
    const sect = (title, list) => (list.length ? `<div class="fsec"><h4>${title}</h4><div class="fgrid">${list.map((f) => `<div class="fld"><label>${esc(f.c.label)}</label>${B.control(f.c, f.v, ro && f.c.kind !== 'stars' ? true : ro)}</div>`).join('')}</div></div>` : '');
    const nameField = doc.names ? `<div class="fsec"><h4>${esc(doc.label)}</h4><div class="fgrid"><div class="fld"><label>${esc(doc.cols[0].label.replace(/:x$/, ''))} Name</label><input class="inp" value="${esc(row.name)}" data-inp="fdirty"></div></div></div>` : '';
    const childHTML = doc.child.map((ch, ci) => {
      const rows = isNew ? [] : B.getChildRows(doc, ci, row.name);
      const trs = rows.map((r, ri) => `<tr><td class="ck"><input type="checkbox"></td><td class="idx">${ri + 1}</td>${r.map((v, k) => `<td>${B.control(ch.cols[k], v, ro, 'cin')}</td>`).join('')}</tr>`).join('');
      return `<div class="fsec"><div class="ch-h"><h4>${esc(ch.title)}</h4></div><div class="card inner"><div class="tscroll"><table class="dt child" data-ci="${ci}"><thead><tr><th class="ck"><input type="checkbox"></th><th class="idx">No.</th>${ch.cols.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${trs || `<tr class="none"><td colspan="${ch.cols.length + 2}"><div class="empty sm">${ic('inbox', 22)}<span>No Data</span></div></td></tr>`}</tbody></table></div>
        <div class="ch-f"><button class="btn sm" data-act="addrow" data-ci="${ci}" ${ro ? 'disabled' : ''}>Add Row</button><button class="btn sm" data-act="delrow" ${ro ? 'disabled' : ''}>Delete</button></div></div></div>`;
    }).join('');
    const stVal = si >= 0 ? row.vals[si] : null;
    const status = isNew ? B.pill('Not Saved', 'info') : cancelled ? B.pill('Cancelled', 'bad') : ro ? B.pill(stVal && /paid|approved|completed|hired|accepted|cleared|resolved/i.test(stVal) ? stVal : 'Submitted', 'ok') : stVal ? B.pill(stVal) : B.pill('Enabled', 'ok');
    const title = isNew ? 'New ' + doc.label : B.title(doc, row);
    const links = (doc.links || []).map((l) => `<a class="conn" href="#/list/${l}"><span>${esc(B.docs[l].label)}</span><em>${1 + (B.hash(l + row.name) % 6)}</em><button class="icon-btn sm" tabindex="-1">${ic('plus', 14)}</button></a>`).join('');
    const tl = [
      ['created this', 'plus', row.modified + 4], ...(stVal ? [[`changed <b>Status</b> from <s>Draft</s> to <b>${esc(stVal)}</b>`, 'edit', row.modified + 1]] : []),
      ['commented: “Looks good, please proceed.”', 'message', row.modified]
    ];
    return `<div class="form-page" data-doc="${id}" data-name="${esc(row.name)}" data-locked="${ro ? 1 : 0}">
      <div class="page-head sticky"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: doc.label, href: '#/list/' + id }, { label: isNew ? 'New' : row.name }])}
        <div class="ftitle"><h1>${esc(title)}</h1><span id="f-status">${status}</span><span id="f-dirty"></span></div></div>
        <div class="head-actions">${B.dd(`<button class="btn" data-act="dd">Menu${ic('down', 14)}</button>`, `<button data-act="toast" data-msg="Duplicated as a new draft">${ic('copy', 15)}Duplicate</button><button data-act="toast" data-msg="Email dialog opened">${ic('mail', 15)}Email</button><button data-act="print">${ic('print', 15)}Print</button><button data-act="toast" data-msg="Link copied to clipboard">${ic('link', 15)}Copy Link</button><button class="danger" data-act="toast" data-msg="Document deleted" data-nav="#/list/${id}">${ic('trash', 15)}Delete</button>`, 'right')}
          ${doc.slip ? `<a class="btn" href="#/page/payslip">${ic('eye', 16)}View Payslip</a>` : ''}
          <button class="btn ${doc.sub ? '' : 'primary'}" data-act="fsave">Save</button>
          ${doc.sub ? `<button class="btn primary" data-act="fsubmit" id="f-submit" ${ro ? 'style="display:none"' : ''}>Submit</button><button class="btn danger-o" data-act="fcancel" id="f-cancel" ${ro && !cancelled ? '' : 'style="display:none"'}>Cancel</button>` : ''}</div></div>
      <div class="form-layout"><div class="form-main">
        <div class="tabs"><button class="on" data-act="ftab" data-t="det">Details</button>${links ? '<button data-act="ftab" data-t="con">Connections</button>' : ''}<button data-act="ftab" data-t="act">Activity</button></div>
        <div class="tabp" id="tab-det"><div class="card pad">${nameField}${sect('Details', fields.slice(0, half))}${sect('More Information', fields.slice(half))}</div>${childHTML}
          <div class="card pad"><div class="fsec"><h4>Remarks</h4><textarea class="inp" rows="3" placeholder="Add notes or remarks…" data-inp="fdirty" ${ro ? 'disabled' : ''}></textarea></div></div></div>
        ${links ? `<div class="tabp" id="tab-con" hidden><div class="card pad"><h4 class="ct">Connections</h4><div class="conns">${links}</div></div></div>` : ''}
        <div class="tabp" id="tab-act" hidden>${activity(tl, row)}</div>
      </div>
      <aside class="form-side"><div class="card pad side-c">
        <div class="sb"><h5>Assigned To</h5>${B.avstack([row.p.name, 'Farhana Akter'], 28)}<button class="link-btn" data-act="toast" data-msg="Assignment dialog opened">+ Assign</button></div>
        <div class="sb"><h5>Attachments</h5>${isNew ? '' : FILES.map((f) => `<div class="att">${ic('paperclip', 14)}<span>${f[0]}</span><em>${f[1]}</em></div>`).join('')}<button class="link-btn" data-act="toast" data-msg="File picker opened">+ Attach a file</button></div>
        <div class="sb"><h5>Tags</h5><div class="chips"><span class="chip">${esc(doc.mod)}</span><button class="chip add" data-act="toast" data-msg="Tag added">+ Add tag</button></div></div>
        <div class="sb"><h5>Shared With</h5>${B.avstack(['Sumaiya Begum', 'Kamrul Hasan', 'Arif Chowdhury'], 26)}</div>
        <div class="sb meta"><span>${ic('clock', 14)} ${isNew ? 'Not created yet' : `Last edited ${B.ago(row.modified)} ago`}</span><button class="like" data-act="like">${ic('heart', 15)}<b>${1 + (B.hash(row.name) % 5)}</b></button><span>${ic('message', 14)} ${row.comments}</span></div>
      </div></aside></div>
      ${activity(tl, row, true)}</div>`;
  };
  function activity(tl, row, inline) {
    if (inline) return '';
    return `<div class="card pad timeline"><h4 class="ct">Activity</h4><div class="cbox">${B.avatar('Rahim Uddin', 34)}<div><textarea class="inp" rows="2" id="cm-in" placeholder="Add a comment…"></textarea><button class="btn primary sm" data-act="comment">Comment</button></div></div>
      <ul id="tl-list">${tl.map((t) => `<li><i>${B.ic(t[1], 13)}</i><div><span><b>${esc(row.p.name)}</b> ${t[0]}</span><em>${B.ago(t[2])} ago</em></div></li>`).join('')}</ul></div>`;
  }
  B.inp.fdirty = B.chg.fdirty = () => { const f = B.$('#f-dirty'); if (f && !f.innerHTML) f.innerHTML = B.pill('Not Saved', 'info'); };
  B.act.fsave = () => { const f = B.$('#f-dirty'); if (f) f.innerHTML = ''; B.toast('Saved successfully'); };
  B.act.fsubmit = () => B.modal({ title: 'Confirm', body: '<p class="muted-p">Permanently Submit this document? Submitted documents can no longer be edited.</p>', foot: '<button class="btn" data-act="close-modal">No</button><button class="btn primary" data-act="fsubmit-yes">Yes, Submit</button>' });
  B.act['fsubmit-yes'] = () => {
    B.closeModal(); const p = B.$('.form-page'); p.dataset.locked = 1;
    B.$$('.fgrid .inp, .fgrid input, textarea, .child .inp', p).forEach((i) => (i.disabled = true));
    B.$('#f-status').innerHTML = B.pill('Submitted', 'ok'); B.$('#f-dirty').innerHTML = '';
    B.$('#f-submit').style.display = 'none'; B.$('#f-cancel').style.display = '';
    B.toast('Document submitted');
  };
  B.act.fcancel = () => { B.$('#f-status').innerHTML = B.pill('Cancelled', 'bad'); B.$('#f-cancel').style.display = 'none'; B.toast('Document cancelled', 'bad'); };
  B.act.ftab = (t) => { B.$$('.tabs button').forEach((b) => b.classList.toggle('on', b === t)); B.$$('.tabp').forEach((p) => (p.hidden = p.id !== 'tab-' + t.dataset.t)); };
  B.act.addrow = (t) => {
    const doc = B.docs[B.$('.form-page').dataset.doc], ch = doc.child[+t.dataset.ci], tb = B.$(`.child[data-ci="${t.dataset.ci}"] tbody`);
    B.$('.none', tb) && B.$('.none', tb).remove();
    const n = tb.rows.length + 1, blank = B.newVals({ cols: ch.cols });
    tb.insertAdjacentHTML('beforeend', `<tr><td class="ck"><input type="checkbox"></td><td class="idx">${n}</td>${ch.cols.map((c, k) => `<td>${B.control(c, blank[k], false, 'cin')}</td>`).join('')}</tr>`);
    B.inp.fdirty();
  };
  B.act.delrow = (t) => { const tb = t.closest('.card').querySelector('tbody'); B.$$('tr', tb).forEach((r) => { const c = B.$('input[type=checkbox]', r); if (c && c.checked) r.remove(); }); B.toast('Rows deleted'); };
  B.act.comment = () => {
    const i = B.$('#cm-in'); if (!i.value.trim()) return;
    B.$('#tl-list').insertAdjacentHTML('afterbegin', `<li><i>${B.ic('message', 13)}</i><div><span><b>You</b> commented: “${esc(i.value)}”</span><em>just now</em></div></li>`); i.value = ''; B.toast('Comment added');
  };
  B.act.like = (t) => { t.classList.toggle('on'); const b = B.$('b', t); b.textContent = +b.textContent + (t.classList.contains('on') ? 1 : -1); };
  B.act.print = () => window.print();
})();
