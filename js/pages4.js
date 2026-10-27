/* Bijoy HRMS — My Todos (personal todo list for admin and employee, stored per role in the browser) */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const KEY = () => 'bijoy-todos-' + (B.role || 'admin');
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const todayISO = () => iso(new Date());
  const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const PR = { High: 'bad', Medium: 'warn', Low: 'info' };
  const CATS = ['Work', 'Personal', 'HR', 'Meeting', 'Follow-up'];
  let filter = 'all', q = '', mem = null;

  function seed() {
    return B.role === 'employee'
      ? [{ t: 'Submit September timesheet', pr: 'High', due: addDays(1), cat: 'Work' }, { t: 'Upload tax investment proof', pr: 'Medium', due: addDays(5), cat: 'HR' }, { t: 'Book dentist appointment', pr: 'Low', due: addDays(9), cat: 'Personal' }, { t: 'Complete safety training module', pr: 'Medium', due: addDays(-2), cat: 'Work' }]
      : [{ t: 'Approve pending leave applications', pr: 'High', due: addDays(0), cat: 'HR' }, { t: 'Review Q3 payroll before processing', pr: 'High', due: addDays(2), cat: 'HR' }, { t: 'Interview shortlisted designers', pr: 'Medium', due: addDays(3), cat: 'Meeting' }, { t: 'Publish Eid holiday announcement', pr: 'Low', due: addDays(-1), cat: 'Work' }]
      ;
  }
  function load() {
    try { const r = localStorage.getItem(KEY()); if (r) return JSON.parse(r); } catch (e) {}
    return seed().map((x, i) => Object.assign({ id: 's' + i, note: '', done: false, created: Date.now() - i * 1000 }, x));
  }
  const list = () => (mem && mem.role === B.role ? mem.items : (mem = { role: B.role, items: load() }).items);
  const save = () => { try { localStorage.setItem(KEY(), JSON.stringify(list())); } catch (e) {} };
  const overdue = (t) => !t.done && t.due && t.due < todayISO();
  const dueLabel = (t) => {
    if (!t.due) return '';
    const d = t.due, td = todayISO();
    const txt = d === td ? 'Today' : d === addDays(1) ? 'Tomorrow' : d === addDays(-1) ? 'Yesterday' : new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    return `<span class="td-due ${overdue(t) ? 'late' : ''}">${ic('calendar', 13)}${txt}</span>`;
  };

  function shown() {
    const td = todayISO(), ql = q.trim().toLowerCase();
    return list().filter((t) => {
      if (filter === 'active' && t.done) return false;
      if (filter === 'done' && !t.done) return false;
      if (filter === 'today' && !(t.due === td && !t.done)) return false;
      if (filter === 'overdue' && !overdue(t)) return false;
      return !ql || (t.t + ' ' + t.note + ' ' + t.cat).toLowerCase().includes(ql);
    }).sort((a, b) => a.done - b.done || (a.due || '9') .localeCompare(b.due || '9') || b.created - a.created);
  }
  function stats() {
    const l = list(), done = l.filter((t) => t.done).length;
    const c = (i, lb, v, tn) => B.kpi(i, lb, v, null, null, tn);
    return `<section class="kpis sm lv-stats" style="grid-template-columns:repeat(4,minmax(0,1fr))">${c('list', 'Total', l.length)}${c('clock', 'Pending', l.length - done, 'warn')}${c('check-circle', 'Completed', done, 'ok')}${c('alert', 'Overdue', l.filter(overdue).length, 'bad')}</section>`;
  }
  function row(t) {
    return `<li class="td-row ${t.done ? 'done' : ''}" data-id="${t.id}">
      <button class="td-ck" data-act="td-tg" aria-label="Toggle done">${t.done ? ic('check', 14) : ''}</button>
      <div class="td-main"><b>${esc(t.t)}</b>${t.note ? `<em>${esc(t.note)}</em>` : ''}<div class="td-meta"><span class="pill ${PR[t.pr] || 'mute'}"><i></i>${esc(t.pr)}</span><span class="chip">${esc(t.cat)}</span>${dueLabel(t)}</div></div>
      <div class="td-act"><button class="icon-btn sm" data-act="td-edit" title="Edit">${ic('edit', 15)}</button><button class="icon-btn sm" data-act="td-del" title="Delete">${ic('trash', 15)}</button></div></li>`;
  }
  function body() {
    const r = shown();
    return r.length ? `<ul class="td-list">${r.map(row).join('')}</ul>` : `<div class="empty">${ic('check-circle', 34)}<b>${list().length ? 'Nothing matches this view' : 'No todos yet'}</b><span>${list().length ? 'Try another filter.' : 'Add your first todo above.'}</span></div>`;
  }
  function dashInner() {
    const l = list().filter((t) => !t.done).sort((a, b) => b.created - a.created), n = list().filter((t) => !t.done).length;
    return `<div class="ct-row"><h3 class="ct">To-do${n ? ` <span class="count">${n}</span>` : ''}</h3><div class="td-dh"><button class="icon-btn sm" data-act="td-new" title="New todo" aria-label="New todo">${ic('plus', 16)}</button><a class="link-btn" href="#/page/todo">See all</a></div></div>
      <div class="td-quick td-qd"><input class="inp sm" id="td-dq" placeholder="Add a todo, press Enter…"><button class="btn sm primary" data-act="td-dquick">${ic('plus', 14)}Add</button></div>
      ${l.length ? `<ul class="td-mini">${l.slice(0, 4).map((t) => `<li data-id="${t.id}" class="${overdue(t) ? 'late' : ''}"><button class="td-ck" data-act="td-tg" aria-label="Mark done"></button><div><b>${esc(t.t)}</b><span>${esc(t.cat)}${t.due ? ' · ' + dueLabel(t).replace(/<[^>]+>/g, '') : ''}</span></div><span class="pill ${PR[t.pr] || 'mute'}"><i></i>${esc(t.pr)}</span></li>`).join('')}</ul>${l.length > 4 ? `<a class="link-btn" href="#/page/todo" style="display:block;margin-top:8px">+ ${l.length - 4} more</a>` : ''}` : `<div class="empty"><span>All caught up. Add a todo above.</span></div>`}`;
  }
  B.todoCard = () => `<div class="card pad" id="td-dash">${dashInner()}</div>`;
  B.act['td-dquick'] = () => {
    const i = B.$('#td-dq'), v = i.value.trim(); if (!v) { i.focus(); return; }
    list().push({ id: 't' + Date.now(), t: v, note: '', pr: 'Medium', due: '', cat: 'Work', done: false, created: Date.now() });
    save(); refresh(); const n = B.$('#td-dq'); if (n) n.focus();
  };
  function refresh() {
    const dd = B.$('#td-dash'); if (dd) dd.innerHTML = dashInner();
    const b = B.$('#td-body'), s = B.$('#td-stats'); if (!b) return;
    b.innerHTML = body(); s.innerHTML = stats();
    B.$$('.td-tabs button').forEach((x) => x.classList.toggle('on', x.dataset.f === filter));
    const done = list().filter((t) => t.done).length, cl = B.$('#td-clear'); if (cl) cl.hidden = !done;
  }

  B.page.todo = () => {
    const mine = B.role === 'employee' ? 'My Todos' : 'My Todos';
    filter = 'all'; q = '';
    return `${B.head(mine, 'Your personal task list. Only you can see and manage these.', `<button class="btn" id="td-clear" data-act="td-clear" ${list().some((t) => t.done) ? '' : 'hidden'}>${ic('trash', 15)}Clear completed</button><button class="btn primary" data-act="td-new">${ic('plus', 16)}New Todo</button>`, [{ label: 'HR', href: '#/' }, { label: 'Tasks & Support' }, { label: 'My Todos' }])}
      <div id="td-stats">${stats()}</div>
      <div class="card pad td-card">
        <div class="td-quick"><input class="inp" id="td-q" placeholder="Add a todo and press Enter…" data-quick="1"><button class="btn primary" data-act="td-quick">${ic('plus', 16)}Add</button></div>
        <div class="filterbar td-bar"><label class="search">${ic('search', 16)}<input data-inp="tdq" placeholder="Search todos…"></label>
          <div class="seg sm td-tabs">${[['all', 'All'], ['active', 'Active'], ['today', 'Today'], ['overdue', 'Overdue'], ['done', 'Done']].map((f) => `<button data-act="td-f" data-f="${f[0]}" class="${f[0] === 'all' ? 'on' : ''}">${f[1]}</button>`).join('')}</div></div>
        <div id="td-body">${body()}</div></div>`;
  };

  const form = (t) => `<div class="fgrid" style="grid-template-columns:1fr 1fr">
    <div class="fld" style="grid-column:1/-1"><label>Title</label><input class="inp" id="tdm-t" value="${esc(t.t || '')}" placeholder="What needs to be done?"></div>
    <div class="fld" style="grid-column:1/-1"><label>Notes</label><textarea class="inp" id="tdm-n" rows="3" style="height:auto;padding:10px 12px" placeholder="Optional details">${esc(t.note || '')}</textarea></div>
    <div class="fld"><label>Priority</label><select class="inp" id="tdm-p">${Object.keys(PR).map((p) => `<option ${(t.pr || 'Medium') === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
    <div class="fld"><label>Due date</label><input type="date" class="inp" id="tdm-d" value="${t.due || ''}"></div>
    <div class="fld"><label>Category</label><select class="inp" id="tdm-c">${CATS.map((p) => `<option ${(t.cat || 'Work') === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div></div>`;
  const dialog = (t, id) => B.modal({ title: id ? 'Edit Todo' : 'New Todo', body: form(t), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="td-save" data-id="${id || ''}">${id ? 'Save' : 'Add Todo'}</button>` });
  const find = (t) => list().find((x) => x.id === t.closest('[data-id]').dataset.id);

  B.act['td-new'] = () => { dialog({}); setTimeout(() => { const i = B.$('#tdm-t'); i && i.focus(); }, 50); };
  B.act['td-edit'] = (t) => { const x = find(t); if (x) dialog(x, x.id); };
  B.act['td-save'] = (t) => {
    const title = B.$('#tdm-t').value.trim(); if (!title) { B.toast('Please enter a title', 'bad'); return; }
    const d = { t: title, note: B.$('#tdm-n').value.trim(), pr: B.$('#tdm-p').value, due: B.$('#tdm-d').value, cat: B.$('#tdm-c').value };
    const x = t.dataset.id && list().find((y) => y.id === t.dataset.id);
    if (x) Object.assign(x, d); else list().push(Object.assign({ id: 't' + Date.now(), done: false, created: Date.now() }, d));
    save(); B.closeModal(); refresh(); B.toast(x ? 'Todo updated' : 'Todo added');
  };
  B.act['td-quick'] = () => {
    const i = B.$('#td-q'), v = i.value.trim(); if (!v) { i.focus(); return; }
    list().push({ id: 't' + Date.now(), t: v, note: '', pr: 'Medium', due: '', cat: 'Work', done: false, created: Date.now() });
    save(); i.value = ''; refresh(); i.focus();
  };
  B.act['td-tg'] = (t) => { const x = find(t); if (!x) return; x.done = !x.done; save(); refresh(); };
  B.act['td-del'] = (t) => { const x = find(t); if (!x) return; mem.items = list().filter((y) => y !== x); save(); refresh(); B.toast('Todo deleted'); };
  B.act['td-clear'] = () => { mem.items = list().filter((y) => !y.done); save(); refresh(); B.toast('Completed todos cleared'); };
  B.act['td-f'] = (t) => { filter = t.dataset.f; refresh(); };
  B.inp.tdq = (t) => { q = t.value; refresh(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'td-q') { e.preventDefault(); B.act['td-quick'](); } if (e.key === 'Enter' && e.target.id === 'td-dq') { e.preventDefault(); B.act['td-dquick'](); } if (e.key === 'Enter' && e.target.id === 'tdm-t') { const b = B.$('[data-act="td-save"]'); b && b.click(); } });
})();
