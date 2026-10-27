/* Bijoy HRMS — Notice board. Admin publishes notices; employees read them (stored in the browser, shared by both roles). */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const KEY = 'bijoy-notices', RKEY = () => 'bijoy-notices-read-' + (B.role || 'admin');
  const TYPES = { Notice: 'info', Urgent: 'bad', Policy: 'warn', Event: 'ok', Holiday: 'ok', Benefits: 'info', People: 'mute' };
  const iso = (d) => d.getFullYear() + '-' + B.pad(d.getMonth() + 1) + '-' + B.pad(d.getDate());
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  let items = null, read = null, type = 'All', q = '';
  const isAdmin = () => B.role !== 'employee';

  function seed() {
    return [
      ['Eid-ul-Adha holiday schedule published', 'The office will remain closed from 26 May to 31 May. Please plan hand-overs and update your out-of-office status.', 'Holiday', 'All', true, -2, '', 'Fatema Khatun'],
      ['Q3 town-hall this Thursday, 4 PM', 'Join us in the auditorium or online for company results, roadmap and an open Q&A with leadership.', 'Event', 'All', false, -3, day(3), 'Rahim Uddin'],
      ['Health insurance enrolment is open', 'Choose your plan before 15 October. Dependents can be added from the Benefits section of your profile.', 'Benefits', 'All', false, -5, '', 'Farhana Akter'],
      ['Updated remote work policy', 'Effective next month, up to two remote days per week are allowed with manager approval. Read the full policy on the HR portal.', 'Policy', 'All', false, -8, '', 'Rahim Uddin'],
      ['Server maintenance window, Friday night', 'Engineering systems will be unavailable from 11 PM to 2 AM. Please save your work before leaving.', 'Urgent', 'Engineering', false, -1, day(4), 'Mitu Rahman'],
      ['Welcome our new joiners', 'Please welcome five new colleagues joining Engineering, Design and Support this month.', 'People', 'All', false, -9, '', 'Mitu Rahman']
    ].map((a, i) => ({ id: 's' + i, t: a[0], body: a[1], type: a[2], aud: a[3], pin: a[4], pub: day(a[5]), exp: a[6], by: a[7], created: Date.now() - i * 1000 }));
  }
  function all() {
    if (!items) { try { items = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} if (!items) items = seed(); }
    return items;
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(all())); } catch (e) {} };
  function reads() {
    if (!read || read.role !== B.role) { let a = []; try { a = JSON.parse(localStorage.getItem(RKEY())) || []; } catch (e) {} read = { role: B.role, set: new Set(a) }; }
    return read.set;
  }
  const saveRead = () => { try { localStorage.setItem(RKEY(), JSON.stringify([...reads()])); } catch (e) {} };
  const myDept = () => (isAdmin() ? B.ADMIN_EMP : B.ME).dept;
  const status = (n) => (n.pub > today() ? 'Scheduled' : n.exp && n.exp < today() ? 'Expired' : 'Live');
  const visible = () => all().filter((n) => isAdmin() || (status(n) === 'Live' && (n.aud === 'All' || n.aud === myDept())))
    .sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.pub.localeCompare(a.pub) || b.created - a.created);
  const ago = (d) => { const n = Math.round((new Date(today()) - new Date(d)) / 864e5); return n < 0 ? 'on ' + d.split('-').reverse().join('/') : n === 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago'; };

  B.noticeWidget = (n) => {
    const l = visible().filter((x) => status(x) === 'Live').slice(0, n || 3);
    return l.length ? `<ul class="ann">${l.map((a) => `<li><a href="#/page/announcements" class="ann-a"><span class="pill ${TYPES[a.type] || 'info'}"><i></i>${esc(a.type)}</span><div><b>${esc(a.t)}</b><span>${esc(a.by)} · ${ago(a.pub)}</span></div>${ic('right', 16)}</a></li>`).join('')}</ul>` : `<div class="empty"><span>No notices right now.</span></div>`;
  };

  function card(n) {
    const st = status(n), unread = !isAdmin() && !reads().has(n.id);
    return `<article class="card pad ann-c ${n.pin ? 'pin' : ''} ${unread ? 'unread' : ''}" data-id="${n.id}">
      <div class="ann-h">${B.avatar(n.by, 40)}<div><b>${esc(n.by)}</b><span>HR · ${ago(n.pub)} · ${n.aud === 'All' ? 'All employees' : esc(n.aud)}</span></div>
        ${n.pin ? `<span class="pill info"><i></i>Pinned</span>` : ''}${isAdmin() && st !== 'Live' ? `<span class="pill ${st === 'Expired' ? 'mute' : 'warn'}"><i></i>${st}</span>` : ''}<span class="pill ${TYPES[n.type] || 'info'}"><i></i>${esc(n.type)}</span></div>
      <h3>${unread ? '<i class="ndot"></i>' : ''}${esc(n.t)}</h3><p>${esc(n.body).replace(/\n/g, '<br>')}</p>
      <div class="ann-f">${n.exp ? `<span>${ic('clock', 14)} Until ${esc(n.exp)}</span>` : ''}
        ${isAdmin() ? `<span class="grow"></span><button class="btn sm" data-act="nt-pin">${ic('pin', 14)}${n.pin ? 'Unpin' : 'Pin'}</button><button class="btn sm" data-act="nt-edit">${ic('edit', 14)}Edit</button><button class="btn sm" data-act="nt-del">${ic('trash', 14)}Delete</button>` : (unread ? `<span class="grow"></span><button class="btn sm" data-act="nt-read">${ic('check', 14)}Mark as read</button>` : '')}</div></article>`;
  }
  function body() {
    const l = visible().filter((n) => (type === 'All' || n.type === type) && (!q || (n.t + ' ' + n.body).toLowerCase().includes(q.toLowerCase())));
    return l.length ? l.map(card).join('') : `<div class="card pad empty">${ic('bell', 34)}<b>No notices found</b><span>${isAdmin() ? 'Use “New Notice” to publish one.' : 'You’re all caught up.'}</span></div>`;
  }
  function refresh() { const b = B.$('#nt-body'); if (!b) return; b.innerHTML = body(); B.$$('.nt-types button').forEach((x) => x.classList.toggle('on', x.dataset.t === type)); const m = B.$('#nt-markall'); if (m) m.hidden = !visible().some((n) => !reads().has(n.id)); }

  B.page.announcements = () => {
    type = 'All'; q = '';
    const actions = isAdmin() ? `<button class="btn primary" data-act="nt-new">${ic('plus', 16)}New Notice</button>` : `<button class="btn" id="nt-markall" data-act="nt-readall" ${visible().some((n) => !reads().has(n.id)) ? '' : 'hidden'}>${ic('check', 15)}Mark all as read</button>`;
    return `${B.head('Notice Board', isAdmin() ? 'Publish and manage notices. Employees see them on their notice board and dashboard.' : 'Company notices and updates from HR', actions, [{ label: 'HR', href: '#/' }, { label: 'Notice Board' }])}
      <div class="filterbar nt-bar"><label class="search">${ic('search', 16)}<input data-inp="ntq" placeholder="Search notices…"></label>
        <div class="seg sm nt-types">${['All', ...Object.keys(TYPES)].map((t) => `<button data-act="nt-type" data-t="${t}" class="${t === 'All' ? 'on' : ''}">${t}</button>`).join('')}</div></div>
      <div class="ann-feed" id="nt-body">${body()}</div>`;
  };

  const depts = () => ['All', ...B.DEPTS];
  const form = (n) => `<div class="fgrid" style="grid-template-columns:1fr 1fr">
    <div class="fld" style="grid-column:1/-1"><label>Title</label><input class="inp" id="ntm-t" value="${esc(n.t || '')}" placeholder="Notice headline"></div>
    <div class="fld" style="grid-column:1/-1"><label>Message</label><textarea class="inp" id="ntm-b" rows="5" placeholder="Write the notice…">${esc(n.body || '')}</textarea></div>
    <div class="fld"><label>Type</label><select class="inp" id="ntm-ty">${Object.keys(TYPES).map((t) => `<option ${(n.type || 'Notice') === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="fld"><label>Audience</label><select class="inp" id="ntm-a">${depts().map((t) => `<option value="${esc(t)}" ${(n.aud || 'All') === t ? 'selected' : ''}>${t === 'All' ? 'All employees' : esc(t)}</option>`).join('')}</select></div>
    <div class="fld"><label>Publish on</label><input type="date" class="inp" id="ntm-p" value="${n.pub || today()}"></div>
    <div class="fld"><label>Expires on <em style="font-weight:400">(optional)</em></label><input type="date" class="inp" id="ntm-e" value="${n.exp || ''}"></div>
    <label class="chk-row" style="grid-column:1/-1"><input type="checkbox" id="ntm-pin" ${n.pin ? 'checked' : ''}>Pin to the top</label></div>`;
  const dialog = (n, id) => B.modal({ title: id ? 'Edit Notice' : 'New Notice', wide: true, body: form(n), foot: `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="nt-save" data-id="${id || ''}">${id ? 'Save' : 'Publish'}</button>` });
  const get = (t) => all().find((x) => x.id === t.closest('.ann-c').dataset.id);

  B.act['nt-new'] = () => dialog({});
  B.act['nt-edit'] = (t) => { const n = get(t); if (n) dialog(n, n.id); };
  B.act['nt-save'] = (t) => {
    const title = B.$('#ntm-t').value.trim(), msg = B.$('#ntm-b').value.trim();
    if (!title || !msg) { B.toast('Title and message are required', 'bad'); return; }
    const pub = B.$('#ntm-p').value || today(), exp = B.$('#ntm-e').value;
    if (exp && exp < pub) { B.toast('Expiry cannot be before the publish date', 'bad'); return; }
    const d = { t: title, body: msg, type: B.$('#ntm-ty').value, aud: B.$('#ntm-a').value, pub, exp, pin: B.$('#ntm-pin').checked };
    const x = t.dataset.id && all().find((y) => y.id === t.dataset.id);
    if (x) Object.assign(x, d); else all().push(Object.assign({ id: 'n' + Date.now(), by: 'Rahim Uddin', created: Date.now() }, d));
    save(); B.closeModal(); refresh(); B.toast(x ? 'Notice updated' : pub > today() ? 'Notice scheduled' : 'Notice published');
  };
  B.act['nt-pin'] = (t) => { const n = get(t); n.pin = !n.pin; save(); refresh(); };
  B.act['nt-del'] = (t) => { const n = get(t); items = all().filter((x) => x !== n); save(); refresh(); B.toast('Notice deleted'); };
  B.act['nt-read'] = (t) => { reads().add(get(t).id); saveRead(); refresh(); };
  B.act['nt-readall'] = () => { visible().forEach((n) => reads().add(n.id)); saveRead(); refresh(); };
  B.act['nt-type'] = (t) => { type = t.dataset.t; refresh(); };
  B.inp.ntq = (t) => { q = t.value; refresh(); };
})();
