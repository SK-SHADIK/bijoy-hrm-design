/* Sentradesk HRMS — Employee edit page (#/employee/<id>/edit): basic info, addresses, emergency, references, documents, job status, responsibility, live summary */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const TYPES = ['Full-time', 'Permanent', 'Contract', 'Intern', 'Part-time'];
  const STATUS = [['Active', 'In Service'], ['On Leave', 'On Leave'], ['Left', 'Not In Service']];
  const BLOOD = ['A+', 'A−', 'B+', 'B−', 'O+', 'O−', 'AB+', 'AB−'], RELIGION = ['Islam', 'Hinduism', 'Buddhism', 'Christianity', 'Other'], MARITAL = ['Single', 'Married', 'Divorced', 'Widowed'];
  const NATION = ['Bangladeshi', 'Indian', 'Other'], RELATION = ['Mother', 'Father', 'Spouse', 'Brother', 'Sister', 'Friend', 'Other'];
  const CITY = ['Dhaka', 'Chattogram', 'Sylhet', 'Khulna', 'Rajshahi', 'Barishal', 'Cumilla', 'Bogura', 'Rangpur', 'Mymensingh'];

  const ctl = (key, F, o) => {
    o = o || {};
    const v = F[key] == null ? '' : F[key], attrs = `name="${key}" data-inp="ef" data-chg="ef" ${o.req ? 'data-req="1"' : ''} ${o.ro ? 'readonly' : ''}`;
    let inner;
    if (o.opts) {
      const opts = o.opts.map((x) => (Array.isArray(x) ? x : [x, x]));
      const has = opts.some((x) => x[0] === v);
      inner = `<select ${attrs}><option value="">${esc(o.ph || 'Select')}</option>${has || !v ? '' : `<option selected>${esc(v)}</option>`}${opts.map((x) => `<option value="${esc(x[0])}" ${x[0] === v ? 'selected' : ''}>${esc(x[1])}</option>`).join('')}</select>`;
    } else if (o.area) inner = `<textarea ${attrs} rows="${o.rows || 5}" maxlength="1000">${esc(v)}</textarea>`;
    else inner = `<input type="${o.type || 'text'}" value="${esc(v)}" placeholder="${esc(o.ph || '')}" ${attrs}>`;
    return `<label class="ef-f ${o.span ? 'sp' + o.span : ''}"><span class="ef-l">${o.label}${o.req ? ' <i>*</i>' : ''}</span><span class="ef-in ${o.ro ? 'ro' : ''}">${o.icon ? `<em>${ic(o.icon, 16)}</em>` : ''}${inner}</span></label>`;
  };
  const sec = (id, icon, tone, title, sub, body) => `<section class="card ef-sec" id="${id}" data-sec="1"><div class="ef-h ${tone}"><span class="ef-hi">${ic(icon, 20)}</span><div><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div></div><div class="ef-b">${body}</div></section>`;
  const sumRow = (icon, label, id, val) => `<li><span>${ic(icon, 16)}</span><div><em>${label}</em><b id="${id}">${esc(val)}</b></div></li>`;
  const mgrLabel = (id) => { const m = id ? B.emp(id) : null; return m ? `${m.name} (${m.desig})` : '—'; };
  const lenOf = (doj, resign) => (doj ? B.empSpan(B.parse(doj), resign ? B.parse(resign) : B.today) : '—');

  B.renderEmployeeEdit = (id) => {
    const e = B.emp(id);
    if (!e) return `<div class="empty big">${ic('search', 44)}<b>Employee not found</b><a class="btn primary" href="#/list/employee">Back to list</a></div>`;
    const F = B.empFields(e);
    B.onMount(efInit);
    const addr = (p, label, icon) => `<div class="ef-grid g2">${ctl(p + 'Street', F, { label: 'Street Address', icon: 'building', req: 1, span: 2, ph: 'Enter street address' })}${ctl(p + 'Apt', F, { label: 'Apartment/Unit', icon: 'building', ph: 'Enter apartment/unit' })}${ctl(p + 'City', F, { label: 'City', req: 1, opts: CITY })}${ctl(p + 'Thana', F, { label: 'Thana', icon: 'pin', req: 1, ph: 'Enter thana' })}${ctl(p + 'District', F, { label: 'District', req: 1, opts: CITY })}</div>`;
    const ref = (n) => `<div class="ef-ref"><div class="ef-refh"><span>${n}</span><b>Reference ${n}</b></div><div class="ef-grid g4">${ctl('r' + n + 'Name', F, { label: 'Full Name', icon: 'user', req: 1 })}${ctl('r' + n + 'Desig', F, { label: 'Designation', req: 1 })}${ctl('r' + n + 'Org', F, { label: 'Organization', req: 1 })}${ctl('r' + n + 'Rel', F, { label: 'Relationship', req: 1, opts: ['Academic', 'Former Employer', 'Colleague', 'Friend', 'Other'] })}${ctl('r' + n + 'Addr', F, { label: 'Address', icon: 'pin', req: 1, span: 2 })}${ctl('r' + n + 'Mobile', F, { label: 'Mobile Number', icon: 'phone', req: 1 })}${ctl('r' + n + 'Email', F, { label: 'Email', icon: 'mail', req: 1, type: 'email' })}</div></div>`;
    const doc = (label, icon, req, types) => `<div class="ef-doc"><span class="ef-l">${label}${req ? ' <i>*</i>' : ''}</span><div class="ef-dic">${ic(icon, 34)}</div><label class="btn sm">Choose File<input type="file" hidden data-chg="ef-file"></label><em class="ef-fn">No file chosen</em><small>${types}</small></div>`;
    const mgrOpts = B.EMPLOYEES.filter((x) => x.id !== e.id).map((x) => [x.id, `${x.name} (${x.desig})`]);
    const SECS = [['es-basic', 'user', 'Basic Information'], ['es-present', 'pin', 'Present Address'], ['es-permanent', 'home', 'Permanent Address'], ['es-emergency', 'phone', 'Emergency Contact'], ['es-reference', 'users', 'References'], ['es-docs', 'file', 'Documentation'], ['es-job', 'briefcase', 'Job Status'], ['es-resp', 'file', 'Responsibility']];
    const rail = `<aside class="ef-rail"><div class="card"><div class="ef-rail-h"><b>Edit sections</b><span id="ef-pp">0%</span></div><div class="ef-pbar"><i id="ef-pb"></i></div><ul>${SECS.map((x, i) => `<li><button type="button" data-act="ef-go" data-t="${x[0]}" class="${i ? '' : 'on'}"><span class="ef-ri">${ic(x[1], 15)}</span><span class="ef-rt">${x[2]}</span><em id="rc-${x[0]}">–</em></button></li>`).join('')}</ul></div></aside>`;
    const sub = (t, tone) => `<div class="ef-sub"><i class="${tone || ''}"></i>${t}</div>`;
    return `<div class="ef" id="ef" data-id="${e.id}">${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Employee', href: '#/list/employee' }, { label: e.name, href: '#/employee/' + e.id }, { label: 'Edit' }])}
      <div class="card ef-strip"><div class="ef-band"></div><div class="ef-sbody"><div class="ef-ph" id="ef-ph">${B.avatar(F.name, 96)}<label class="ef-cam" title="Change photo">${ic('upload', 14)}<input type="file" accept="image/*" hidden data-chg="ef-photo"></label></div>
        <div class="ef-sn"><h2 id="s-name">${esc(F.name)}</h2><p><span id="s-desig">${esc(F.desig)}</span> · <span id="s-dept">${esc(F.dept)}</span></p>${B.pill(F.status, F.status === 'Left' ? 'bad' : F.status === 'On Leave' ? 'warn' : 'ok')}</div>
        <div class="ef-sf"><span>${ic('hash', 16)}<em>Employee ID</em><b>${e.id}</b></span><span>${ic('building', 16)}<em>Unit/Project</em><b id="s-branch">${esc(F.branch)}</b></span><span>${ic('calendar', 16)}<em>Joining Date</em><b id="s-doj">${F.doj ? B.fdate(F.doj) : '—'}</b></span><span>${ic('clock', 16)}<em>Service Length</em><b id="s-len">${lenOf(F.doj, F.resign)}</b></span></div></div></div>
      <div class="ef-layout">${rail}<form id="ef-form" class="ef-main" onsubmit="return false" novalidate>
      ${sec('es-basic', 'user', 'blue', 'Employee Basic Information', 'Personal details as per official documents.', `${sub('Identity')}<div class="ef-grid g4">
        ${ctl('empid', { empid: e.id }, { label: 'Employee ID', icon: 'hash', req: 1, ro: 1 })}${ctl('name', F, { label: 'Name', icon: 'user', req: 1 })}${ctl('father', F, { label: "Fathers' Name", icon: 'user', req: 1 })}${ctl('mother', F, { label: "Mothers' Name", icon: 'user', req: 1 })}
        ${ctl('marital', F, { label: 'Marital Status', req: 1, opts: MARITAL })}${ctl('spouse', F, { label: 'Spouse Name (if Married)', icon: 'user', ph: 'Enter spouse name' })}</div>
        ${sub('Birth & nationality', 'green')}<div class="ef-grid g4">
        ${ctl('dobCert', F, { label: 'Date of Birth (Certificate)', icon: 'calendar', req: 1, type: 'date' })}${ctl('dobOrig', F, { label: 'Date of Birth (Original)', icon: 'calendar', req: 1, type: 'date' })}${ctl('nationality', F, { label: 'Nationality', req: 1, opts: NATION })}${ctl('birthplace', F, { label: 'Birthplace', icon: 'pin', req: 1, opts: CITY })}
        ${ctl('blood', F, { label: 'Blood Group', req: 1, opts: BLOOD })}${ctl('religion', F, { label: 'Religion', req: 1, opts: RELIGION })}</div>
        ${sub('Contact', 'orange')}<div class="ef-grid g4">
        ${ctl('mobilePers', F, { label: 'Mobile (Personal)', icon: 'phone', req: 1, type: 'tel' })}${ctl('mobileOff', F, { label: 'Mobile (Official)', icon: 'phone', req: 1, type: 'tel' })}${ctl('emailPers', F, { label: 'Personal Email ID', icon: 'mail', req: 1, type: 'email' })}${ctl('emailOff', F, { label: 'Office Email ID', icon: 'mail', req: 1, type: 'email' })}</div>
        ${sub('Official documents', 'purple')}<div class="ef-grid g4">
        ${ctl('nid', F, { label: 'National ID', icon: 'card', req: 1 })}${ctl('bcert', F, { label: 'Birth Certificate No', icon: 'file', req: 1 })}${ctl('passport', F, { label: 'Passport No', icon: 'globe', req: 1 })}${ctl('license', F, { label: 'Driving License No', icon: 'card', ph: 'Optional' })}${ctl('tin', F, { label: 'TIN No', icon: 'file', req: 1 })}</div>`)}
      ${sec('es-present', 'pin', 'green', 'Present Address', 'Where the employee currently lives.', addr('p'))}
      ${sec('es-permanent', 'home', 'blue', 'Permanent Address', `<label class="ef-same"><input type="checkbox" data-chg="ef-same"> Same as present address</label>`, addr('m'))}
      ${sec('es-emergency', 'phone', 'red', 'Emergency Contact', 'Who to call in an emergency.', `<div class="ef-grid g5">${ctl('emName', F, { label: 'Full Name', icon: 'user', req: 1 })}${ctl('emRel', F, { label: 'Relationship', req: 1, opts: RELATION })}${ctl('emAddr', F, { label: 'Address', icon: 'pin', req: 1 })}${ctl('emMobile', F, { label: 'Mobile Number', icon: 'phone', req: 1, type: 'tel' })}${ctl('emEmail', F, { label: 'Email', icon: 'mail', type: 'email' })}</div>`)}
      ${sec('es-reference', 'users', 'blue', 'Reference', 'Two professional or academic references.', `<div class="ef-2">${ref(1)}${ref(2)}</div>`)}
      ${sec('es-docs', 'file', 'purple', 'Documentation', 'Attach scanned copies. Files are not uploaded in this prototype.', `<div class="ef-docs">${doc('Photograph', 'user', 1, 'JPG, PNG (Max 2MB)')}${doc('National ID', 'card', 1, 'JPG, PNG, PDF (Max 5MB)')}${doc('Passport No', 'globe', 1, 'JPG, PNG, PDF (Max 5MB)')}${doc('Birth Certificate', 'file', 1, 'JPG, PNG, PDF (Max 5MB)')}${doc('TIN Certificate', 'file', 1, 'JPG, PNG, PDF (Max 5MB)')}</div>`)}
      ${sec('es-job', 'briefcase', 'blue', 'Job Status', 'Fill in the current job information and employment details.', `<div class="ef-grid g3">
        ${ctl('type', F, { label: 'Employee Type', icon: 'briefcase', req: 1, opts: TYPES })}${ctl('desig', F, { label: 'Designation', icon: 'user', req: 1, ph: 'Enter designation' })}${ctl('mgr', F, { label: 'Reporting Authority', icon: 'org', req: 1, opts: mgrOpts })}
        ${ctl('dept', F, { label: 'Department', icon: 'users', req: 1, opts: B.DEPTS.concat(B.DEPTS.includes(F.dept) ? [] : [F.dept]) })}${ctl('branch', F, { label: 'Unit/Project Name', icon: 'building', req: 1, opts: B.BRANCHES })}${ctl('status', F, { label: 'Job Status', icon: 'users', req: 1, opts: STATUS.map((x) => [x[0], x[1]]) })}</div>
        <div class="ef-grid g5">${ctl('appt', F, { label: 'Appointment Date', icon: 'calendar', req: 1, type: 'date' })}${ctl('doj', F, { label: 'Joining Date', icon: 'calendar', req: 1, type: 'date' })}${ctl('conf', F, { label: 'Confirmation Date', icon: 'calendar', req: 1, type: 'date' })}${ctl('len', { len: lenOf(F.doj, F.resign) }, { label: 'Service Length', icon: 'clock', ro: 1 })}${ctl('resign', F, { label: 'Resigning Date', icon: 'calendar', type: 'date' })}</div>`)}
      <div class="ef-2b" id="es-resp">${sec('es-resp-c', 'file', 'blue', 'Job Responsibility', 'Mention the key responsibilities of the employee in this role.', `<div class="ef-rte"><div class="ef-tb"><button type="button" data-act="ef-bullet" title="Add bullet">${ic('list', 15)}</button><span>One responsibility per line</span></div>${ctl('resp', F, { area: 1, rows: 8, label: '' }).replace('<span class="ef-l"> </span>', '')}<div class="ef-cnt"><span id="ef-cnt">${(F.resp || '').length}</span>/1000</div></div>`)}
        <section class="card ef-sec ef-sum"><div class="ef-h blue"><span class="ef-hi">${ic('user', 20)}</span><div><h3>Employee Summary</h3><p>Updates as you edit</p></div></div><ul>
          ${sumRow('briefcase', 'Employee Type', 'u-type', F.type)}${sumRow('user', 'Designation', 'u-desig', F.desig)}${sumRow('users', 'Department', 'u-dept', F.dept)}${sumRow('org', 'Reporting Authority', 'u-mgr', mgrLabel(F.mgr))}${sumRow('calendar', 'Joining Date', 'u-doj', F.doj ? B.fdate(F.doj) : '—')}${sumRow('clock', 'Service Length', 'u-len', lenOf(F.doj, F.resign))}</ul></section></div>
      </form></div>
      <div class="ef-bar"><div class="ef-bs"><span class="ef-dot" id="ef-dot"></span><b id="ef-st">All changes saved</b><em id="ef-req">Required fields: –</em></div><div class="ef-ba"><a class="btn" href="#/employee/${e.id}">Cancel</a><button class="btn" data-act="ef-reset" id="ef-reset" disabled>${ic('refresh', 15)}Reset</button><button class="btn primary" data-act="ef-save" id="ef-savebtn" disabled>${ic('check', 16)}Save Changes</button></div></div></div>`;
  };

  const val = (n) => { const x = B.$('#ef-form [name="' + n + '"]'); return x ? x.value : ''; };
  let snap = {};
  const fields = () => B.$$('#ef-form [name]').filter((x) => !['empid', 'len'].includes(x.name));
  const live = () => {
    const set = (id, t) => { const x = B.$('#' + id); if (x) x.textContent = t; };
    const doj = val('doj'), res = val('resign'), len = lenOf(doj, res), mg = val('mgr');
    set('s-name', val('name')); set('s-desig', val('desig')); set('s-dept', val('dept')); set('s-branch', val('branch')); set('s-doj', doj ? B.fdate(doj) : '—'); set('s-len', len);
    set('u-type', val('type')); set('u-desig', val('desig')); set('u-dept', val('dept')); set('u-mgr', mgrLabel(mg)); set('u-doj', doj ? B.fdate(doj) : '—'); set('u-len', len);
    const l = B.$('#ef-form [name="len"]'); if (l) l.value = len;
    set('ef-cnt', val('resp').length);
    // changed fields
    let changed = 0;
    fields().forEach((x) => { const c = x.value !== (snap[x.name] == null ? '' : snap[x.name]); x.closest('.ef-in').classList.toggle('chg', c); if (c) changed++; });
    const dot = B.$('#ef-dot'); if (dot) dot.classList.toggle('on', changed > 0);
    set('ef-st', changed ? changed + ' unsaved change' + (changed > 1 ? 's' : '') : 'All changes saved');
    const sb = B.$('#ef-savebtn'), rb = B.$('#ef-reset'); if (sb) sb.disabled = !changed; if (rb) rb.disabled = !changed;
    // required progress (overall + per section)
    const reqs = B.$$('#ef-form [data-req="1"]'); const ok = (x) => x.value.trim() !== '';
    const done = reqs.filter(ok).length, pp = reqs.length ? Math.round((done / reqs.length) * 100) : 100;
    set('ef-pp', pp + '%'); set('ef-req', 'Required fields: ' + done + '/' + reqs.length); const pb = B.$('#ef-pb'); if (pb) pb.style.width = pp + '%';
    B.$$('#ef-form section[data-sec]').forEach((sx) => { const r = B.$$('[data-req="1"]', sx), n = r.filter(ok).length, t = B.$('#rc-' + sx.id); if (t) { t.textContent = r.length ? (n === r.length ? '✓' : n + '/' + r.length) : '–'; t.className = r.length && n === r.length ? 'done' : r.length ? 'todo' : ''; } });
    const sr = B.$('#rc-es-resp'); if (sr) { sr.textContent = '✓'; sr.className = 'done'; }
  };
  function efInit() {
    snap = {}; fields().forEach((x) => { snap[x.name] = x.value; });
    live();
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) B.$$('.ef-rail button').forEach((b) => b.classList.toggle('on', b.dataset.t === (x.target.id === 'es-resp-c' ? 'es-resp' : x.target.id))); }), { rootMargin: '-25% 0px -65% 0px' });
      B.$$('#ef-form section[data-sec]').forEach((x) => obs.observe(x));
    }
  }
  B.inp.ef = () => live(); B.chg.ef = () => live();
  B.act['ef-go'] = (t) => { const x = document.getElementById(t.dataset.t); if (x) x.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  B.act['ef-reset'] = () => { fields().forEach((x) => { x.value = snap[x.name] == null ? '' : snap[x.name]; x.closest('.ef-in').classList.remove('bad'); }); live(); B.toast('Changes reverted'); };
  B.chg['ef-photo'] = (t) => { const f = t.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const a = B.$('#ef-ph .av'); a.style.backgroundImage = 'url(' + r.result + ')'; a.style.backgroundSize = 'cover'; a.style.backgroundPosition = 'center'; a.style.color = 'transparent'; }; r.readAsDataURL(f); };
  B.chg['ef-file'] = (t) => { const n = t.closest('.ef-doc').querySelector('.ef-fn'); n.textContent = t.files[0] ? t.files[0].name : 'No file chosen'; };
  B.chg['ef-same'] = (t) => { if (!t.checked) return; ['Street', 'Apt', 'City', 'Thana', 'District'].forEach((k) => { const d = B.$('#ef-form [name="m' + k + '"]'); if (d) d.value = val('p' + k); }); };
  B.act['ef-bullet'] = () => { const t = B.$('#ef-form [name="resp"]'); const pos = t.selectionStart; const before = t.value.slice(0, pos), nl = before.lastIndexOf('\n') + 1; t.value = t.value.slice(0, nl) + '• ' + t.value.slice(nl); t.focus(); live(); };
  B.act['ef-save'] = () => {
    const id = B.$('#ef').dataset.id, vals = {}; let firstBad = null;
    B.$$('#ef-form [name]').forEach((x) => {
      if (['empid', 'len'].includes(x.name)) return;
      vals[x.name] = x.value.trim();
      const need = x.dataset.req === '1' && !(x.name === 'spouse') && !vals[x.name];
      x.closest('.ef-in').classList.toggle('bad', need);
      if (need && !firstBad) firstBad = x;
    });
    if (vals.marital === 'Married' && !vals.spouse) { const x = B.$('#ef-form [name="spouse"]'); x.closest('.ef-in').classList.add('bad'); firstBad = firstBad || x; }
    if (firstBad) { firstBad.focus(); firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' }); B.toast('Please fill the highlighted required fields', 'bad'); return; }
    if (vals.resign && vals.doj && vals.resign < vals.doj) { B.toast('Resigning date cannot be before joining date', 'bad'); return; }
    B.empSave(id, vals);
    B.toast('Employee details saved');
    location.hash = '#/employee/' + id;
  };
})();
