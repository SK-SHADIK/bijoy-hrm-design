/* Bijoy HRMS — app shell, router, command palette, theme */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  let mode = null;
  B.role = 'admin'; try { B.role = localStorage.getItem('bijoy-role') || 'admin'; } catch (e) {}
  /* modules from the HR requirements document come first in the sidebar */
  B.REQ_NAV = ['recruit', 'leaves', 'attendance', 'wfh', 'payroll'];
  const EMP_NAV = [['Overview', [['home', 'My Dashboard', '#/'], ['user', 'My Profile', '#/employee/HR-EMP-00015'], ['check-circle', 'My Todos', '#/page/todo'], ['briefcase', 'My Assets', '#/page/my-assets'], ['bell', 'Notice Board', '#/page/announcements'], ['phoneui', 'Mobile App', '#/page/self-service']]],
    ['Time & Leave', [['clock', 'My Attendance', '#/list/attendance'], ['home', 'Work From Home', '#/page/my-wfh'], ['check-circle', 'Team WFH Approvals', '#/page/team-wfh'], ['edit', 'Attendance Requests', '#/list/attendance-request'], ['calendar', 'My Leaves', '#/list/leave-application'], ['check-circle', 'Leave Approvals', '#/page/leave-approvals'], ['pie', 'Leave Balance', '#/page/leave-balance'], ['calendar', 'Leave Calendar', '#/page/leave-calendar'], ['coffee', 'Holiday List', '#/list/holiday-list'], ['refresh', 'Shift Requests', '#/list/shift-request']]],
    ['Pay & Claims', [['file', 'My Payslips', '#/page/payslip'], ['card', 'My Expense Claims', '#/page/my-claims'], ['check-circle', 'Team Claim Approvals', '#/page/team-claims'], ['moneyloan', 'Advances', '#/page/my-loans'], ['plane', 'Travel Requests', '#/list/travel-request'], ['percent', 'Tax Declaration', '#/list/tax-exemption-declaration'], ['heart', 'Benefit Claims', '#/list/benefit-claim'], ['dollar', 'My Loans', '#/page/my-loans']]],
    ['Support & Tasks', [['inbox', 'My Tickets', '#/list/ticket'], ['plus', 'Raise a Ticket', '#/form/ticket/new'], ['check-circle', 'My Tasks', '#/list/task'], ['kanban', 'Task Board', '#/list/task/kanban']]],
    ['Growth', [['award', 'My Appraisals', '#/list/appraisal'], ['flag', 'Goals', '#/page/goals'], ['grad', 'Training', '#/list/training-event'], ['gift', 'Referrals', '#/list/employee-referral'], ['flag', 'Hiring Requisitions', '#/page/req-board'], ['alert', 'Grievances & Notices', '#/page/my-cases']]],
    ['Company', [['users', 'Directory', '#/list/employee/cards'], ['org', 'Org Chart', '#/page/orgchart']]]];
  B.act.role = (t) => { B.role = t.dataset.r; try { localStorage.setItem('bijoy-role', B.role); } catch (e) {} mode = null; location.hash === '#/' ? B.route() : (location.hash = '#/'); };

  B.themeBtn = (cls) => `<button class="icon-btn ${cls || ''}" data-act="theme" aria-label="Toggle theme" title="Toggle theme"><span class="i-moon">${ic('moon')}</span><span class="i-sun">${ic('sun')}</span></button>`;
  B.act.theme = () => {
    const d = document.documentElement, t = d.dataset.theme === 'dark' ? 'light' : 'dark';
    d.dataset.theme = t; try { localStorage.setItem('bijoy-theme', t); } catch (e) {}
  };

  const NOTIFS = [['Tasnim Rahman applied for Sick Leave', 'calendar', '5 min ago', true], ['Payroll for September is ready for review', 'dollar', '1 hr ago', true], ['3 interviews scheduled for today', 'users', '2 hr ago', true], ['Imran Hossain submitted an expense claim', 'card', 'Yesterday', false], ['Appraisal cycle H1 2026 moved to Peer Feedback', 'award', '2 days ago', false]];
  const NEW = [['user-plus', 'Employee', 'employee'], ['calendar', 'Leave Application', 'leave-application'], ['card', 'Expense Claim', 'expense-claim'], ['briefcase', 'Job Opening', 'job-opening'], ['edit', 'Attendance Request', 'attendance-request'], ['file', 'Salary Slip', 'salary-slip'], ['inbox', 'Ticket', 'ticket'], ['check-circle', 'Task', 'task']];

  const MY_NAV = [['home', 'My Dashboard', '#/page/my-dashboard'], ['user', 'My Profile', '#/employee/HR-EMP-00001'], ['clock', 'My Attendance', '#/list/attendance'], ['home', 'My Work From Home', '#/page/my-wfh'], ['calendar', 'My Leaves', '#/list/leave-application'], ['file', 'My Payslips', '#/page/payslip'], ['card', 'My Expense Claims', '#/page/my-claims'], ['briefcase', 'My Assets', '#/page/my-assets'], ['check-circle', 'My Todos', '#/page/todo']];
  function shell() {
    const emp = B.role === 'employee', U = emp ? B.ME : { name: 'Rahim Uddin', desig: 'HR Manager' };
    const links = emp ? EMP_NAV.map((g) => `<div class="nm open"><div class="nm-h"><a href="#" onclick="return false"><span>${g[0]}</span></a></div><div class="nm-items flat">${g[1].map((i) => `<a href="${i[2]}" data-href="${i[2]}">${ic(i[0], 15)}<span>${i[1]}</span></a>`).join('')}</div></div>`).join('') : (() => { const nm = (m) => `<div class="nm" data-m="${m.id}"><div class="nm-h"><a href="#/module/${m.id}" data-act="nm-lbl">${ic(m.icon, 18)}<span>${m.label}</span></a><button class="nm-t" data-act="nm-tg" aria-label="Toggle ${m.label}">${ic('down', 15)}</button></div><div class="nm-items">${m.items.map((tok) => { const i = B.navItem(tok); return `<a href="${i.href}" data-href="${i.href}">${ic(i.icon, 15)}<span>${esc(i.label)}</span></a>`; }).join('')}</div></div>`; const first = B.NAV.filter((m) => B.REQ_NAV.includes(m.id)).sort((a, b) => B.REQ_NAV.indexOf(a.id) - B.REQ_NAV.indexOf(b.id)); return first.map(nm).join('') + `<div class="nm" data-m="my"><div class="nm-h"><a href="#/page/my-dashboard" data-act="nm-lbl">${ic('user', 18)}<span>My Workspace</span></a><button class="nm-t" data-act="nm-tg" aria-label="Toggle My Workspace">${ic('down', 15)}</button></div><div class="nm-items">${MY_NAV.map((i) => `<a href="${i[2]}" data-href="${i[2]}">${ic(i[0], 15)}<span>${i[1]}</span></a>`).join('')}</div></div>` + B.NAV.filter((m) => !B.REQ_NAV.includes(m.id)).map(nm).join(''); })();
    B.$('#app').innerHTML = `<div class="app" id="shell"><div class="scrim" data-act="nav-close"></div>
      <aside class="sidebar" id="sidebar"><div class="sb-brand"><a href="#/" class="brand"><span class="logo-mark"><img src="bijoy-mark.png" alt="Bijoy"></span><div><b>Bijoy</b><em>HRMS</em></div></a><button class="icon-btn sm only-m" data-act="nav-close" aria-label="Close menu">${ic('x', 18)}</button></div>
        <button class="sb-search" data-act="cmd">${ic('search', 16)}<span>Search or jump to…</span><kbd>Ctrl K</kbd></button>
        <nav class="sb-nav" id="sb-nav">${emp ? '' : `<a class="nl home" href="#/" data-href="#/">${ic('home', 18)}<span>HR Home</span></a>`}${links}</nav>
        <div class="sb-foot"><a href="#/employee/${emp ? B.ME.id : 'HR-EMP-00001'}">${B.avatar(U.name, 36)}<div><b>${U.name}</b><span>${emp ? U.desig : 'HR Manager'}</span></div></a><a class="icon-btn" href="#/login" title="Log out">${ic('logout', 17)}</a></div></aside>
      <div class="main"><header class="topbar"><button class="icon-btn" data-act="nav-open" aria-label="Menu">${ic('menu', 20)}</button><button class="icon-btn only-d" data-act="nav-collapse" aria-label="Collapse sidebar">${ic('sidebar', 19)}</button>
        <button class="tb-search" data-act="cmd">${ic('search', 16)}<span>Search employees, documents, reports…</span><kbd>Ctrl K</kbd></button><span class="grow"></span>
        <div class="seg role-sw"><button class="${emp ? '' : 'on'}" data-act="role" data-r="admin">${ic('shield', 14)}<span>Admin</span></button><button class="${emp ? 'on' : ''}" data-act="role" data-r="employee">${ic('user', 14)}<span>Employee</span></button></div>
        <span class="co-chip">${ic('building', 15)}${B.COMPANY}</span>
        ${B.dd(`<button class="btn primary sm" data-act="dd">${ic('plus', 15)}<span class="hide-m">New</span></button>`, NEW.map((n) => `<a href="#/form/${n[2]}/new" class="ddl">${ic(n[0], 15)}${n[1]}</a>`).join(''), 'right')}
        ${B.dd(`<button class="icon-btn" data-act="dd" aria-label="Notifications">${ic('bell', 19)}<i class="ping"></i></button>`, `<div class="dd-title">Notifications <button class="link-btn" data-act="toast" data-msg="All caught up">Mark all read</button></div>` + NOTIFS.map((n) => `<div class="notif ${n[3] ? 'new' : ''}"><span>${ic(n[1], 16)}</span><div><b>${n[0]}</b><em>${n[2]}</em></div></div>`).join(''), 'right wide')}
        ${B.themeBtn()}
        ${B.dd(`<button class="tb-user" data-act="dd">${B.avatar(U.name, 34)}</button>`, `<div class="dd-user">${B.avatar(U.name, 40)}<div><b>${U.name}</b><span>${emp ? B.ME.email : 'rahim.uddin@bijoy.com.bd'}</span></div></div><a href="#/employee/HR-EMP-00001" class="ddl">${ic('user', 15)}My Profile</a><a href="#/page/self-service" class="ddl">${ic('phoneui', 15)}Self Service App</a>${emp ? '' : `<a href="#/page/hr-settings" class="ddl">${ic('settings', 15)}HR Settings</a>`}<a href="#/login" class="ddl">${ic('logout', 15)}Log out</a>`, 'right')}</header>
        <main id="view" class="content" tabindex="-1"></main></div>
      <nav class="bottom-nav">${[['home', 'Home', '#/'], ['clock', 'Attendance', emp ? '#/list/attendance' : '#/page/attendance-dash'], ['calendar', 'Leaves', '#/list/leave-application'], emp ? ['file', 'Payslips', '#/page/payslip'] : ['dollar', 'Payroll', '#/page/payroll-dash']].map((b) => `<a href="${b[2]}" data-href="${b[2]}">${ic(b[0], 21)}<span>${b[1]}</span></a>`).join('')}<button data-act="nav-open">${ic('grid', 21)}<span>More</span></button></nav></div>`;
  }

  B.act['nav-open'] = () => B.$('#shell').classList.add('nav-open');
  B.act['nav-close'] = () => B.$('#shell') && B.$('#shell').classList.remove('nav-open');
  B.act['nav-collapse'] = () => B.$('#shell').classList.toggle('no-side');
  B.act['nm-tg'] = (t) => { const m = t.closest('.nm'), o = !m.classList.contains('open'); B.$$('.nm[data-m]').forEach((x) => x.classList.remove('open')); m.classList.toggle('open', o); };

  B.act['nm-lbl'] = (t) => { const m = t.closest('.nm'); if (m.classList.contains('open') && location.hash === t.getAttribute('href')) { m.classList.remove('open'); return false; } };

  function setActive(h) {
    B.$$('#shell [data-href]').forEach((a) => a.classList.toggle('active', a.dataset.href === h));
    B.$$('.nm').forEach((m) => { const has = B.$('a.active', m) || `#/module/${m.dataset.m}` === h; m.classList.toggle('has-active', !!has); if (m.dataset.m) m.classList.toggle('open', !!has); });
    const act = B.$('.sb-nav a.active'); if (act && act.scrollIntoView) { const nav = B.$('#sb-nav'); const r = act.getBoundingClientRect(), n = nav.getBoundingClientRect(); if (r.top < n.top || r.bottom > n.bottom) nav.scrollTop += r.top - n.top - 120; }
  }

  /* ---------- Router ---------- */
  B.route = () => {
    const h = location.hash || '#/';
    const parts = h.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    const [k, a, b] = parts;
    if (k === 'login') { mode = 'login'; document.title = 'Sign in · Bijoy HRMS'; B.$('#app').innerHTML = B.renderLogin(); return; }
    if (mode !== 'shell') { shell(); mode = 'shell'; }
    let html, title = 'HR Home';
    try {
      if (!k) { if (B.role === 'employee') { html = B.page.me(); B.onMount(B.onMe); title = 'My Dashboard'; } else { html = B.page.home(); B.onMount(B.onHome); } }
      else if (k === 'list' && B.docs[a]) { html = B.renderList(a, b); title = B.docs[a].label; }
      else if (k === 'form' && B.docs[a]) { html = B.renderForm(a, b || 'new'); title = B.docs[a].label; }
      else if (k === 'employee') { html = B.renderEmployee(a); title = 'Employee'; }
      else if (k === 'module') { html = B.renderModule(a); title = (B.NAV.find((n) => n.id === a) || {}).label || 'Module'; }
      else if (k === 'page' && B.page[a]) { html = B.page[a](); title = B.PAGES[a].label; if (a === 'my-dashboard') B.onMount(B.onMe); if (a === 'my-wfh' && B.onMy) B.onMount(B.onMy); }
      else { html = `<div class="empty big">${ic('search', 44)}<b>Page not found</b><span>The page you're looking for doesn't exist.</span><a class="btn primary" href="#/">Back to Home</a></div>`; title = 'Not found'; }
    } catch (err) { console.error(err); html = `<div class="empty big">${ic('alert', 44)}<b>Something went wrong</b><span>${esc(err.message)}</span></div>`; }
    const v = B.$('#view'); v.innerHTML = `<div class="fade">${html}</div>`;
    document.title = title + ' · Bijoy HRMS';
    window.scrollTo(0, 0);
    B.act['nav-close']();
    let active = h; if (k === 'list' && b) active = '#/list/' + a; if (k === 'form') active = '#/list/' + a; if (k === 'employee') active = '#/list/employee';
    setActive(active);
    B.runMounts();
  };

  /* ---------- Command palette ---------- */
  let cmdIdx = 0, cmdList = [];
  const allItems = () => {
    const out = [{ l: 'HR Home', s: 'Dashboard', i: 'home', h: '#/' }];
    B.NAV.forEach((m) => {
      out.push({ l: m.label, s: 'Workspace', i: m.icon, h: '#/module/' + m.id });
      m.items.forEach((t) => { const n = B.navItem(t); out.push({ l: n.label, s: n.kind === 'l' ? m.label + ' · List' : m.label, i: n.icon, h: n.href }); if (n.kind === 'l') out.push({ l: 'New ' + n.label, s: 'Create', i: 'plus', h: '#/form/' + n.id + '/new' }); });
    });
    B.REPORTS.forEach((r) => out.push({ l: r.label, s: 'Report', i: 'bars', h: '#/list/rpt-' + r.id + '/report' }));
    B.EMPLOYEES.forEach((e) => out.push({ l: e.name, s: e.desig + ' · ' + e.id, i: 'user', h: '#/employee/' + e.id, av: e.name }));
    return out;
  };
  let ALL = null;
  function cmdRender(q) {
    ALL = ALL || allItems(); q = q.toLowerCase().trim();
    cmdList = (q ? ALL.filter((x) => (x.l + ' ' + x.s).toLowerCase().includes(q)) : ALL.filter((x) => x.s === 'Workspace' || x.l === 'HR Home' || x.s === 'Create').slice(0, 12)).slice(0, 14);
    cmdIdx = 0;
    B.$('#cmd-list').innerHTML = cmdList.map((x, i) => `<a class="cmd-i ${i === 0 ? 'on' : ''}" href="${x.h}" data-i="${i}">${x.av ? B.avatar(x.av, 28) : `<span class="ci">${ic(x.i, 16)}</span>`}<div><b>${esc(x.l)}</b><span>${esc(x.s)}</span></div>${ic('right', 14)}</a>`).join('') || `<div class="empty sm">${ic('search', 24)}<span>No results for “${esc(q)}”</span></div>`;
  }
  B.act.cmd = () => {
    const m = B.modal({ title: '', body: `<label class="cmd-in">${ic('search', 18)}<input id="cmd-q" placeholder="Search employees, doctypes, reports…" autocomplete="off"><kbd>Esc</kbd></label><div id="cmd-list" class="cmd-list"></div>`, wide: false });
    m.classList.add('cmd'); cmdRender('');
    const q = B.$('#cmd-q'); q.focus();
    q.addEventListener('input', () => cmdRender(q.value));
    q.addEventListener('keydown', (e) => {
      const items = B.$$('.cmd-i');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); cmdIdx = (cmdIdx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach((x, i) => x.classList.toggle('on', i === cmdIdx)); items[cmdIdx].scrollIntoView({ block: 'nearest' }); }
      if (e.key === 'Enter' && items[cmdIdx]) { location.hash = items[cmdIdx].getAttribute('href'); B.closeModal(); }
    });
    m.addEventListener('click', (e) => { if (e.target.closest('.cmd-i')) B.closeModal(); });
  };
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (B.$('#shell')) B.act.cmd(); } });

  window.addEventListener('hashchange', B.route);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', B.route); else B.route();
})();
