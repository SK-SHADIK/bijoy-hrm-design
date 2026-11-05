/* Sentradesk HRMS — Employee details (full personnel file): personal info, family, experience, education, job history, HR actions (design: generated sample data) */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const pick = (arr, seed) => arr[B.hash(seed) % arr.length];
  const FATHERS = ['Abdul Karim', 'Mohammad Alamgir', 'Late Abul Hossain', 'Nurul Islam', 'Shahidul Haque', 'Mizanur Rahman'];
  const MOTHERS = ['Rokeya Begum', 'Shamima Ahmed', 'Nasrin Akter', 'Jahanara Khatun', 'Fatema Begum', 'Salma Khatun'];
  const SPOUSE_M = ['Mahin Afroz', 'Rumana Sultana', 'Sharmin Akter', 'Nusrat Jahan'], SPOUSE_F = ['Kamrul Hasan', 'Anisur Rahman', 'Tanvir Ahmed', 'Faisal Karim'];
  const CHILD_M = ['Aryan', 'Zayan', 'Arisha', 'Labiba', 'Ayaan', 'Meherin'];
  const DISTRICTS = ['Dhaka', 'Chattogram', 'Sylhet', 'Khulna', 'Rajshahi', 'Barishal', 'Cumilla', 'Bogura'];
  const ORGS = [['Orbit Telecom Ltd', 'Telecommunication'], ['Delta Networks', 'IT & Networking'], ['Metro Solutions Ltd', 'Consulting'], ['Padma Group', 'Manufacturing'], ['Karnaphuli Bank', 'Banking']];
  const UNIS = ['University of Dhaka', 'North South University', 'BRAC University', 'Jahangirnagar University', 'Southeast University'];
  const COLLEGES = ['Notre Dame College, Dhaka', 'Dhaka College', 'Government Science College', 'Cumilla Victoria College'];
  const SCHOOLS = ['Motijheel Govt. Boys School', 'Viqarunnisa Noon School', 'Ideal School, Dhaka', 'Zilla School, Cumilla'];
  const SUBJ = { Engineering: 'Computer Science & Engineering', Design: 'Fine Arts', Sales: 'Marketing', Marketing: 'Marketing', Finance: 'Accounting', 'Human Resources': 'Human Resource Management', Operations: 'Business Administration', 'Customer Support': 'English' };

  const fd = (d) => B.fdate(B.iso(d));
  const span = (a, b) => { let m = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth(); if (b.getDate() < a.getDate()) m--; m = Math.max(m, 0); const y = Math.floor(m / 12), mo = m % 12; return [y ? y + ' yr' : '', mo ? mo + ' mo' : ''].filter(Boolean).join(' ') || '< 1 mo'; };
  const ageOf = (dob) => { const n = B.today; let y = n.getFullYear() - dob.getFullYear(), m = n.getMonth() - dob.getMonth(), d = n.getDate() - dob.getDate(); if (d < 0) { m--; d += 30; } if (m < 0) { y--; m += 12; } return `${y} Years ${m} Months ${d} Days`; };
  const num = (seed, len) => { let s = ''; let h = B.hash(seed); while (s.length < len) { h = (h * 1103515245 + 12345) >>> 0; s += h; } return s.slice(0, len); };

  const OVK = 'bijoy-emp-edits-v1';
  const readOv = () => { try { return JSON.parse(localStorage.getItem(OVK) || '{}'); } catch (e) { return {}; } };
  const BASE = { name: 'name', desig: 'desig', dept: 'dept', branch: 'branch', type: 'type', status: 'status', mobileOff: 'phone', emailOff: 'email', dobOrig: 'dob', doj: 'doj', mgr: 'mgr' };
  B.empSpan = span;
  B.empFields = (e) => {
    const dob = B.parse(e.dob), doj = B.parse(e.doj);
    const married = B.hash(e.name) % 2 === 1, female = e.gender === 'Female';
    const d = pick(DISTRICTS, e.id + 'd');
    const f = {
      name: e.name, father: pick(FATHERS, e.id + 'f'), mother: pick(MOTHERS, e.id + 'm'), dobCert: B.iso(B.addDays(dob, 120 + (B.hash(e.id) % 400))), dobOrig: e.dob,
      nationality: 'Bangladeshi', birthplace: d, blood: ['A+', 'B+', 'O+', 'AB+', 'O−'][B.hash(e.id) % 5], religion: pick(['Islam', 'Islam', 'Hinduism', 'Buddhism'], e.id + 'r'),
      marital: married ? 'Married' : 'Single', spouse: married ? pick(female ? SPOUSE_F : SPOUSE_M, e.id + 's') : '',
      mobilePers: '+880 1' + num(e.id + 'a', 9), mobileOff: e.phone, emailPers: e.first.toLowerCase() + '@gmail.com', emailOff: e.email,
      nid: num(e.id + 'n', 13), bcert: num(e.id + 'b', 17), passport: 'E' + String.fromCharCode(65 + (B.hash(e.id) % 26)) + num(e.id + 'p', 7), license: B.hash(e.id) % 3 ? '' : 'DL-' + num(e.id + 'l', 10), tin: num(e.id + 't', 12),
      pStreet: `House ${1 + (B.hash(e.id) % 60)}, Road ${1 + (B.hash(e.name) % 20)}`, pApt: `Flat ${1 + (B.hash(e.id) % 8)}${'ABCD'[B.hash(e.name) % 4]}`, pCity: 'Dhaka', pThana: pick(['Dhanmondi', 'Mirpur', 'Uttara', 'Banani', 'Mohammadpur'], e.id), pDistrict: 'Dhaka',
      mStreet: 'Village Road ' + (1 + (B.hash(e.id) % 9)), mApt: '', mCity: d, mThana: 'Sadar', mDistrict: d,
      emName: pick(MOTHERS, e.id + 'm'), emRel: 'Mother', emMobile: '+880 1' + num(e.id + 'e', 9), emEmail: '', emAddr: d + ' (village home)',
      r1Name: 'Dr. Selim Reza', r1Desig: 'Associate Professor', r1Org: pick(UNIS, e.id + 'u1'), r1Rel: 'Academic', r1Addr: 'Dhaka', r1Mobile: '+880 1' + num(e.id + 'r1', 9), r1Email: 'selim.reza@example.com',
      r2Name: 'Rafiq Ahmed', r2Desig: 'Manager, HR', r2Org: ORGS[B.hash(e.id) % ORGS.length][0], r2Rel: 'Former Employer', r2Addr: 'Dhaka', r2Mobile: '+880 1' + num(e.id + 'r2', 9), r2Email: 'hr@example.com',
      desig: e.desig, dept: e.dept, type: e.type, branch: e.branch, status: e.status, mgr: e.mgr || '', doj: e.doj, appt: B.iso(B.addDays(doj, -7)), conf: B.iso(B.addDays(doj, 180)), resign: '',
      resp: `• Carry out day-to-day duties of the ${e.desig} role in ${e.dept}.\n• Coordinate with other departments for planning and reporting.\n• Support onboarding, documentation and compliance.\n• Maintain accurate records and report to the reporting authority.`
    };
    return Object.assign(f, readOv()[e.id] || {});
  };
  B.empSave = (id, vals) => {
    const all = readOv(); all[id] = Object.assign(all[id] || {}, vals);
    try { localStorage.setItem(OVK, JSON.stringify(all)); } catch (e) {}
    applyOv(id, vals);
  };
  const applyOv = (id, vals) => { const e = B.emp(id); if (!e) return; Object.keys(BASE).forEach((k) => { if (vals[k] != null) e[BASE[k]] = vals[k] || (k === 'mgr' ? null : e[BASE[k]]); }); };
  (() => { const all = readOv(); Object.keys(all).forEach((id) => applyOv(id, all[id])); })();
  const dateK = ['dobCert', 'dobOrig'];
  const addrOf = (F, p) => [F[p + 'Street'], F[p + 'Apt'], F[p + 'Thana'], F[p + 'City'], F[p + 'District']].filter(Boolean).join(', ');


  const mAbs = (a, b) => Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth());
  const fmtM = (m) => [Math.floor(m / 12) ? Math.floor(m / 12) + ' yr' : '', m % 12 ? (m % 12) + ' mo' : ''].filter(Boolean).join(' ') || '< 1 mo';
  const f = (label, v, wide) => `<div class="edf ${wide ? 'wide' : ''}"><span>${label}</span><b>${v === '' || v == null ? '<em>—</em>' : esc(v)}</b></div>`;
  const grp = (title, tone, fields) => `<div class="edg"><h4><i class="${tone}"></i>${title}</h4><div class="edg-g">${fields}</div></div>`;
  const card = (id, icon, tone, title, sub, body, right) => `<section class="card eds" id="${id}"><div class="eds-h ${tone}"><span class="eds-i">${ic(icon, 19)}</span><div><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div>${right ? `<div class="eds-r">${right}</div>` : ''}</div><div class="eds-b">${body}</div></section>`;
  const none = (t) => `<div class="eds-none">${ic('inbox', 18)}<span>${t}</span></div>`;
  const person = (name, role, lines, tone) => `<div class="edp">${B.avatar(name, 40)}<div><b>${esc(name)}</b><span class="edp-r ${tone || ''}">${esc(role)}</span>${lines.filter((l) => l[1]).map((l) => `<p>${ic(l[0], 13)}<span>${esc(l[1])}</span></p>`).join('')}</div></div>`;
  const tl = (items) => `<ul class="edt">${items.map((it) => `<li><i class="${it.tone || ''}">${ic(it.icon || 'briefcase', 13)}</i><div class="edt-c"><div class="edt-t"><b>${esc(it.title)}</b>${it.chips.map((c) => `<span class="edt-chip ${c[1] || ''}">${esc(c[0])}</span>`).join('')}</div><p>${esc(it.sub)}</p>${it.meta ? `<em>${esc(it.meta)}</em>` : ''}</div></li>`).join('')}</ul>`;

  B.act['ed-go'] = (t) => { B.$$('.ed-nav button').forEach((b) => b.classList.toggle('on', b === t)); const x = document.getElementById(t.dataset.t); if (x) x.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  B.empDetails = (e) => {
    const F = B.empFields(e), dob = B.parse(F.dobOrig), doj = B.parse(F.doj), by = dob.getFullYear(), dd = (v) => (v ? B.fdate(v) : '');
    const female = e.gender === 'Female', married = F.marital === 'Married';
    const kids = married ? B.hash(e.id) % 3 : 0;
    const promoDate = B.addDays(doj, 540 + (B.hash(e.id) % 300)), past = (d) => d <= B.today;
    const joinSal = Math.round((e.salary * 0.72) / 500) * 500;
    // completeness
    const keys = ['name', 'father', 'mother', 'dobCert', 'dobOrig', 'nationality', 'birthplace', 'blood', 'religion', 'marital', 'mobilePers', 'mobileOff', 'emailPers', 'emailOff', 'nid', 'bcert', 'passport', 'tin', 'pStreet', 'pThana', 'mStreet', 'emName', 'emMobile', 'r1Name', 'r2Name', 'desig', 'dept', 'doj'];
    const pct = Math.round((keys.filter((k) => F[k]).length / keys.length) * 100);
    // experience
    const nExp = 1 + (B.hash(e.id) % 3); let cursor = B.addDays(doj, -40), totalM = 0;
    const exp = Array.from({ length: nExp }, (_, i) => { const o = ORGS[(B.hash(e.id) + i) % ORGS.length], to = cursor, from = B.addDays(to, -(500 + (B.hash(e.id + i) % 900))); cursor = B.addDays(from, -30); const m = mAbs(from, to); totalM += m; return { title: ['Executive', 'Senior Executive', 'Officer'][i % 3] + ' · ' + o[0], chips: [[fmtM(m), 'ok']], sub: o[1], meta: `${fd(from)} — ${fd(to)}`, icon: 'briefcase' }; });
    const edu = [['Masters', by + 24, SUBJ[e.dept] || 'Business Administration', pick(UNIS, e.id + 'u1'), '', (3 + (B.hash(e.id) % 8) / 10).toFixed(2), 'CGPA'], ['Bachelor / Honors', by + 22, SUBJ[e.dept] || 'Business Administration', pick(UNIS, e.id + 'u2'), '', (3 + (B.hash(e.name) % 9) / 10).toFixed(2), 'CGPA'],
      ['Higher Secondary', by + 18, 'Business Studies', pick(COLLEGES, e.id), 'Dhaka Board', (4 + (B.hash(e.id) % 10) / 10).toFixed(2), 'GPA'], ['Secondary', by + 16, 'Business Studies', pick(SCHOOLS, e.id), 'Dhaka Board', (4.2 + (B.hash(e.name) % 8) / 10).toFixed(2), 'GPA']]
      .map((r) => ({ title: r[0] + ' · ' + r[2], chips: [[r[6] + ' ' + r[5], 'info'], [String(r[1]), '']], sub: r[3] + (r[4] ? ' · ' + r[4] : ''), icon: 'grad' }));
    const training = [['Advanced Excel for Professionals', 'BIM Training Centre', 'S. Chowdhury', '3 Days', 'Dhaka'], ['Workplace Communication', 'Sentradesk Academy', 'R. Ahmed', '2 Days', 'Dhaka HQ']].slice(0, 1 + (B.hash(e.id) % 2));
    const prof = B.hash(e.id) % 2 ? [{ title: 'Professional Certificate · ' + (SUBJ[e.dept] || 'Management'), chips: [['Passed', 'ok']], sub: 'Bangladesh Professional Institute · Dhaka', meta: 'Published ' + fd(B.addDays(doj, -200)), icon: 'award' }] : [];
    const incs = [['Performance Based', 0.06, 365], ['Yearly', 0.05, 730], ['Performance Based', 0.08, 1095]].map((r) => [r[0], Math.round(e.salary * r[1] / 500) * 500, B.addDays(doj, r[2])]).filter((r) => past(r[2]));
    const sinceDes = past(promoDate) ? promoDate : doj;
    // ---------- left rail ----------
    const rail = `<aside class="ed-rail"><div class="card ed-pc"><div class="ed-pc-top">${B.avatar(F.name, 92)}<h3>${esc(F.name)}</h3><p>${esc(F.desig)} · ${esc(F.dept)}</p>${B.pill(F.status)}</div>
      <div class="ed-comp">${B.ring(pct, 78, pct + '%', 'complete', pct > 89 ? 'var(--ok)' : 'var(--warn)')}<div><b>Profile completeness</b><span>${pct > 89 ? 'All key details are filled in.' : 'Some details are missing — edit to complete.'}</span></div></div>
      <ul class="ed-ql"><li>${ic('phone', 15)}<div><em>Office mobile</em><b>${esc(F.mobileOff)}</b></div></li><li>${ic('mail', 15)}<div><em>Office email</em><b>${esc(F.emailOff)}</b></div></li><li>${ic('pin', 15)}<div><em>Location</em><b>${esc(F.branch)}</b></div></li><li>${ic('calendar', 15)}<div><em>Joined</em><b>${fd(doj)} · ${span(doj, B.today)}</b></div></li><li>${ic('card', 15)}<div><em>National ID</em><b>•••• ${esc(String(F.nid).slice(-4))}</b></div></li></ul>
      <div class="ed-pc-act"><a class="btn primary" href="#/employee/${e.id}/edit">${ic('edit', 15)}Edit details</a><button class="btn" data-act="toast" data-msg="Employee profile PDF generated">${ic('print', 15)}Print</button></div></div></aside>`;
    const nav = `<nav class="ed-nav">${[['ed-personal', 'Personal'], ['ed-contact', 'Contact & Address'], ['ed-family', 'Family & References'], ['ed-exp', 'Experience'], ['ed-edu', 'Education & Training'], ['ed-job', 'Job History'], ['ed-records', 'HR Records']].map((n, i) => `<button class="${i ? '' : 'on'}" data-act="ed-go" data-t="${n[0]}">${n[1]}</button>`).join('')}</nav>`;
    // ---------- sections ----------
    const personal = card('ed-personal', 'user', 'blue', 'Personal Information', 'Identity, birth details and official documents.',
      grp('Identity', 'blue', f('Full name', F.name) + f('Gender', e.gender) + f('Father name', F.father) + f('Mother name', F.mother) + f('Marital status', F.marital) + f('Spouse name', married ? F.spouse : '')) +
      grp('Birth & nationality', 'green', f('Date of birth (original)', dd(F.dobOrig)) + f('Date of birth (certificate)', dd(F.dobCert)) + f('Present age', ageOf(dob)) + f('Place of birth', F.birthplace) + f('Country of birth', 'Bangladesh') + f('Nationality', F.nationality) + f('Religion', F.religion) + f('Blood group', F.blood)) +
      grp('Official documents', 'purple', f('National ID', F.nid) + f('Birth certificate no', F.bcert) + f('Passport no', F.passport) + f('Driving license', F.license) + f('TIN no', F.tin)),
      `<a class="btn sm" href="#/employee/${e.id}/edit">${ic('edit', 14)}Edit</a>`);
    const addrCard = (title, tone, p) => `<div class="eda ${tone}"><h4>${ic(p === 'p' ? 'pin' : 'home', 15)}${title}</h4><p>${esc(addrOf(F, p)) || '—'}</p></div>`;
    const contact = card('ed-contact', 'phone', 'green', 'Contact & Address', 'How to reach this employee.',
      grp('Contact', 'green', f('Office mobile', F.mobileOff) + f('Personal mobile', F.mobilePers) + f('Office email', F.emailOff) + f('Personal email', F.emailPers)) +
      `<div class="eda-g">${addrCard('Present address', 'g', 'p')}${addrCard('Permanent address', 'b', 'm')}</div>`);
    const kidList = Array.from({ length: kids }, (_, i) => person(pick(CHILD_M, e.id + 'c' + i) + ' ' + e.name.split(' ').slice(-1)[0], i % 2 ? 'Daughter' : 'Son', [['calendar', fd(B.addDays(B.today, -(900 + i * 1300)))], ['file', 'Birth cert. ' + num(e.id + 'bc' + i, 17)]], 'info')).join('');
    const family = card('ed-family', 'users', 'purple', 'Family, Emergency & References', 'People connected to this employee.',
      grp('Family', 'purple', `<div class="edp-g">${married ? person(F.spouse, 'Spouse', [['user', 'Visible because marital status is Married']], 'info') : ''}${kidList}${!married ? none('Unmarried — no spouse or children on record') : ''}${married && !kids ? none('No children on record') : ''}</div>`) +
      grp('Emergency contact', 'red', `<div class="edp-g">${person(F.emName, F.emRel, [['phone', F.emMobile], ['mail', F.emEmail], ['pin', F.emAddr]], 'bad')}</div>`) +
      grp('References', 'blue', `<div class="edp-g">${person(F.r1Name, F.r1Rel, [['briefcase', F.r1Desig + ' · ' + F.r1Org], ['phone', F.r1Mobile], ['mail', F.r1Email]])}${person(F.r2Name, F.r2Rel, [['briefcase', F.r2Desig + ' · ' + F.r2Org], ['phone', F.r2Mobile], ['mail', F.r2Email]])}</div>`));
    const experience = card('ed-exp', 'briefcase', 'orange', 'Experience', 'Previous employment before joining ' + B.COMPANY + '.', tl(exp), `<span class="eds-stat"><b>${fmtM(totalM)}</b> total</span>`);
    const education = card('ed-edu', 'grad', 'blue', 'Education, Training & Qualification', 'Academic record, trainings and professional certificates.',
      grp('Education', 'blue', tl(edu)) +
      grp('Training', 'green', training.length ? `<div class="edp-g">${training.map((t) => `<div class="edtr"><b>${esc(t[0])}</b><span>${esc(t[1])} · ${esc(t[2])}</span><em>${ic('clock', 12)}${esc(t[3])} · ${ic('pin', 12)}${esc(t[4])}</em></div>`).join('')}</div>` : none('No training added')) +
      grp('Professional qualification', 'purple', prof.length ? tl(prof) : none('No professional qualification added')));
    const job = card('ed-job', 'file', 'green', 'Job History', 'Employment timeline at ' + B.COMPANY + '.',
      `<div class="edj-g">${f('Appointment date', dd(F.appt))}${f('Joining date', dd(F.doj))}${f('Confirmation date', dd(F.conf))}${f('Joining designation', pick(['Executive', 'Officer', 'Associate'], e.id))}${f('Employment type', F.type)}${f('Joining salary', B.money(joinSal))}${f('Total service length', span(doj, B.today))}${f('Present designation since', fd(sinceDes))}${f('Service in present designation', span(sinceDes, B.today))}${f('Re-joining date', '')}${f('Reliving date', e.status === 'Left' ? fd(B.addDays(B.today, -20)) : '')}<div class="edf"><span>Job status</span><b>${B.pill(F.status)}</b></div></div>`);
    const mini = (title, icon, tone, rows) => `<div class="edm"><h4><i class="${tone}">${ic(icon, 14)}</i>${title}</h4>${rows.length ? `<ul>${rows.map((r) => `<li><b>${r[0]}</b><span>${r[1]}</span></li>`).join('')}</ul>` : none('No record')}</div>`;
    const ha = B.addDays(B.today, -140);
    const records = card('ed-records', 'award', 'orange', 'HR Records', 'Increments, promotions, actions and transfers.',
      `<div class="edm-g">${mini('Increment', 'trend', 'ok', incs.map((r) => [esc(r[0]) + ' · ' + B.money(r[1]), fd(r[2])]))}${mini('Promotion', 'award', 'info', past(promoDate) ? [['Executive → ' + esc(e.desig), fd(promoDate)]] : [])}${mini('Demotion', 'refresh', 'bad', [])}${mini('HR action', 'flag', 'warn', [['Appreciation · ' + B.money(5000) + ' <small>HRA-' + num(e.id + 'h', 5) + '</small>', B.MONTHS_FULL[ha.getMonth()] + ' ' + ha.getFullYear() + ' — Outstanding quarterly performance']])}${mini('Transfer history', 'refresh', 'info', e.branch !== 'Dhaka HQ' ? [[esc(e.dept) + ': Dhaka HQ → ' + esc(e.branch), fd(B.addDays(doj, 415)) + ' <small>TRF-' + num(e.id + 'tr', 5) + '</small>']] : [])}</div>`);
    return `<div class="ed2">${rail}<div class="ed-main">${nav}${personal}${contact}${family}${experience}${education}${job}${records}</div></div>`;
  };
})();
