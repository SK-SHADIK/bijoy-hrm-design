/* Sentradesk HRMS — Appointment Letters: dashboard list + letter preview, status workflow and joining checklist */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const KEY = 'bijoy-al-v1';
  const TPL = ['Standard Appointment', 'Contract Appointment', 'Intern Appointment'];
  const ST = { Draft: 'mute', Issued: 'warn', Signed: 'ok', Joined: 'info' };
  const DOCS = ['Passport-size photograph', 'National ID / Passport copy', 'Educational certificates', 'Previous experience letters', 'Bank account details', 'Signed appointment letter'];

  let store = null;
  const S = () => { if (store) return store; try { store = JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) {} return (store = store || { st: {}, tpl: {}, at: {}, docs: {} }); };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S())); } catch (e) {} };
  const money = (n) => '৳ ' + Math.round(n).toLocaleString('en-IN');
  const dayDiff = (iso) => { const t = new Date(B.today.getFullYear(), B.today.getMonth(), B.today.getDate()); return Math.round((B.parse(iso) - t) / 864e5); };
  const inLbl = (d) => (d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : d > 0 ? 'in ' + d + ' days' : Math.abs(d) + ' days ago');

  /* a letter exists for every accepted offer */
  const lettersAll = () => B.iv.build().flatMap(B.jo.offersOf).filter((o) => o.status === 'Accepted').map((o) => {
    const h = B.hash(o.c.id), id = o.c.id, r = B.rng('al-' + id);
    const status = S().st[id] || (r() < 0.25 ? 'Draft' : r() < 0.5 ? 'Issued' : r() < 0.85 ? 'Signed' : 'Joined');
    const tpl = S().tpl[id] || TPL[h % 3];
    const date = S().at[id] || B.iv.dayISO(-(1 + Math.floor(r() * 6)));
    const docsDone = S().docs[id] || DOCS.map((_, i) => status === 'Joined' || (status === 'Signed' && r() > 0.4) || (status === 'Issued' && i < 2 && r() > 0.5));
    return { id: 'HR-AL-2026-' + B.pad(900 + (h % 99), 5), cid: id, o, c: o.c, p: o.p, status, tpl, date, docs: docsDone };
  });
  const find = (cid) => lettersAll().find((l) => l.cid === cid);

  const switcher = (on) => `<div class="seg views">${[['', 'file', 'Letters'], ['list', 'list', 'List'], ['report', 'bars', 'Report']].map((v) => `<a class="${v[0] === on ? 'on' : ''}" href="#/list/appointment-letter${v[0] ? '/' + v[0] : ''}">${ic(v[1], 16)}<span>${v[2]}</span></a>`).join('')}</div>`;
  const kp = (i, l, v, c) => `<div class="card ivk"><span class="ivk-i ${c}">${ic(i, 18)}</span><div><b>${v}</b><span>${l}</span></div></div>`;

  /* ---------- list ---------- */
  let q = '', sf = 'all';
  const rows = () => lettersAll().filter((l) => (sf === 'all' || l.status === sf) && (!q || (l.c.name + l.p.title + l.id + l.tpl).toLowerCase().includes(q.toLowerCase())));
  const tableHtml = () => {
    const L = rows();
    if (!L.length) return `<div class="card pad jo-empty">${ic('file', 36)}<b>No appointment letters</b><span>Letters are created automatically when a candidate accepts a job offer.</span><a class="btn primary" href="#/list/job-offer">Go to job offers</a></div>`;
    return `<div class="card table-card"><div class="tscroll"><table class="dt iv-t"><thead><tr><th>Candidate</th><th>Letter</th><th>Position</th><th>Template</th><th>Appointment date</th><th>Joining</th><th>Pre-joining docs</th><th>Status</th><th></th></tr></thead><tbody>
      ${L.map((l) => { const n = l.docs.filter(Boolean).length, jd = dayDiff(l.o.join); return `<tr data-act="row" data-href="#/list/appointment-letter/letter/${encodeURIComponent(l.cid)}"><td><span class="who">${B.avatar(l.c.name, 34)}<span><b>${esc(l.c.name)}</b><em class="sub">${esc(l.p.dept)} · ${esc(l.p.loc)}</em></span></span></td><td><span class="fl-id">${l.id}</span></td><td>${esc(l.p.title)}</td><td><span class="al-tpl ${l.tpl.split(' ')[0].toLowerCase()}">${l.tpl.replace(' Appointment', '')}</span></td><td>${B.fdate(l.date)}</td><td>${B.fdate(l.o.join)}<em class="sub">${inLbl(jd)}</em></td><td><div class="al-dp"><i><u style="width:${(n / DOCS.length) * 100}%"></u></i><span>${n}/${DOCS.length}</span></div></td><td>${B.pill(l.status, ST[l.status])}</td><td class="r">${ic('right', 16)}</td></tr>`; }).join('')}</tbody></table></div></div>`;
  };
  const listView = () => {
    const all = lettersAll(), c = (s) => all.filter((l) => l.status === s).length;
    const soon = all.filter((l) => l.status !== 'Joined' && dayDiff(l.o.join) >= 0 && dayDiff(l.o.join) <= 14).length;
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Recruitment', href: '#/module/recruit' }, { label: 'Appointment Letter' }])}<h1>Appointment Letters <span class="count">${all.length}</span></h1><p class="sub">Letters issued to candidates who accepted an offer. Open one to preview, issue, track signature and joining documents.</p></div>
        <div class="head-actions">${switcher('')}<a class="btn primary" href="#/form/appointment-letter/new">${ic('plus', 16)}Add Appointment Letter</a></div></div>
      <section class="iv-kpis">${kp('file', 'Total letters', all.length, 'a')}${kp('edit', 'Drafts to issue', c('Draft'), 'c')}${kp('send', 'Awaiting signature', c('Issued'), 'c')}${kp('check-circle', 'Signed', c('Signed'), 'd')}${kp('user-check', 'Joined', c('Joined'), 'b')}${kp('calendar', 'Joining in 14 days', soon, 'a')}</section>
      <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="alq" value="${esc(q)}" placeholder="Search candidate, position, letter no. or template…"></label>
        <div class="seg">${['all', 'Draft', 'Issued', 'Signed', 'Joined'].map((x) => `<button class="${sf === x ? 'on' : ''}" data-act="al-sf" data-v="${x}">${x === 'all' ? 'All' : x}</button>`).join('')}</div></div>
      <div id="al-tbl" style="margin-top:14px">${tableHtml()}</div>`;
  };
  B.inp.alq = (t) => { q = t.value; const g = B.$('#al-tbl'); if (g) g.innerHTML = tableHtml(); };
  B.act['al-sf'] = (t) => { sf = t.dataset.v; B.route(); };

  /* ---------- letter detail ---------- */
  const body = (l) => {
    const o = l.o, g = o.ctc, probation = l.tpl.startsWith('Intern') ? '3 months' : l.tpl.startsWith('Contract') ? 'Not applicable' : '6 months';
    const term = l.tpl.startsWith('Contract') ? 'a fixed-term contract of 12 months, renewable by mutual agreement' : l.tpl.startsWith('Intern') ? 'an internship of 3 months, extendable based on performance' : 'a full-time, permanent position';
    const comp = [['Basic Salary', 0.5], ['House Rent Allowance', 0.25], ['Medical Allowance', 0.08], ['Conveyance Allowance', 0.05]].map((x) => [x[0], Math.round(g * x[1])]);
    comp.push(['Festival / Performance Bonus', g - comp.reduce((a, x) => a + x[1], 0)]);
    const notice = l.tpl.startsWith('Intern') ? '7 days' : l.tpl.startsWith('Contract') ? '30 days' : '60 days';
    return `<div class="al-paper" id="al-paper">
      <div class="alp-h"><div class="alp-logo"><b>SENTRADESK</b><span>Technologies Ltd.</span></div><div class="alp-ref"><span>Ref: <b>${l.id}</b></span><span>Date: <b>${B.fdate(l.date)}</b></span></div></div>
      <h2 class="alp-t">${esc(l.tpl.toUpperCase())} LETTER</h2>
      <p>Dear <b>${esc(l.c.name)}</b>,</p>
      <p>Further to your acceptance of our offer (Ref: ${o.id}), we are pleased to appoint you as <b>${esc(l.p.desig)}</b> in the <b>${esc(l.p.dept)}</b> department at our <b>${esc(l.p.loc)}</b>, on ${term}. Your appointment is subject to the following terms and conditions.</p>
      <ol class="alp-terms"><li><b>Date of joining.</b> You are expected to join on <b>${B.fdate(o.join)}</b>. Please report to ${esc(o.boss.name)} (${esc(o.boss.desig)}) on your first day.</li>
        <li><b>Probation.</b> ${probation === 'Not applicable' ? 'No probation period applies to this contract; performance is reviewed quarterly.' : `You will be on probation for ${probation} from the date of joining, after which your confirmation will be based on performance.`}</li>
        <li><b>Compensation.</b> Your monthly gross compensation will be <b>${money(g)}</b>, structured as shown below. Statutory deductions such as income tax and provident fund apply as per law.</li>
        <li><b>Working hours.</b> Sunday to Thursday, 09:30 AM to 06:30 PM, with a one-hour break. Weekly off: Friday and Saturday.</li>
        <li><b>Leave.</b> You are entitled to annual, casual and sick leave as per the company leave policy, along with government-declared holidays.</li>
        <li><b>Notice period.</b> Either party may end this engagement with <b>${notice}</b> written notice or salary in lieu.</li>
        <li><b>Confidentiality.</b> You shall keep all company information confidential during and after your employment.</li></ol>
      <table class="alp-comp"><thead><tr><th>Component</th><th>Monthly</th><th>Annual</th></tr></thead><tbody>${comp.map((x) => `<tr><td>${x[0]}</td><td>${money(x[1])}</td><td>${money(x[1] * 12)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total CTC</td><td>${money(g)}</td><td>${money(g * 12)}</td></tr></tfoot></table>
      <p>Please sign and return a copy of this letter as your acceptance. We welcome you to Sentradesk and look forward to a rewarding association.</p>
      <div class="alp-sig"><div><i></i><b>Rahim Uddin</b><span>HR Manager</span><span>For Sentradesk Technologies Ltd.</span></div><div>${l.status === 'Signed' || l.status === 'Joined' ? `<em class="alp-signed">${esc(l.c.name)}</em>` : '<i></i>'}<b>${esc(l.c.name)}</b><span>${l.status === 'Signed' || l.status === 'Joined' ? 'Signed electronically' : 'Candidate signature'}</span></div></div></div>`;
  };
  const letterView = (cid) => {
    const l = find(cid); if (!l) return `<div class="empty big">${ic('search', 44)}<b>Letter not found</b><a class="btn primary" href="#/list/appointment-letter">Back</a></div>`;
    const jd = dayDiff(l.o.join), n = l.docs.filter(Boolean).length;
    const order = ['Draft', 'Issued', 'Signed', 'Joined'], ix = order.indexOf(l.status);
    const tl = [['Letter drafted', B.fdate(l.date)], ['Issued to candidate', ix >= 1 ? 'Sent by email' : 'Pending'], ['Signed & returned', ix >= 2 ? 'Signature received' : 'Pending'], ['Joined', ix >= 3 ? B.fdate(l.o.join) : 'Expected ' + B.fdate(l.o.join)]];
    let acts = '';
    if (l.status === 'Draft') acts = `<button class="btn primary" data-act="al-set" data-v="Issued">${ic('send', 15)}Issue letter</button>`;
    else if (l.status === 'Issued') acts = `<button class="btn ok" data-act="al-set" data-v="Signed">${ic('check', 15)}Mark as signed</button><button class="btn" data-act="toast" data-msg="Reminder sent to ${esc(l.c.name.split(' ')[0])}">${ic('bell', 15)}Send reminder</button>`;
    else if (l.status === 'Signed') acts = `<button class="btn primary" data-act="al-set" data-v="Joined">${ic('user-check', 15)}Mark as joined</button><a class="btn" href="#/form/employee/new">${ic('user-plus', 15)}Create employee</a>`;
    else acts = `<a class="btn primary" href="#/list/employee">${ic('users', 15)}View employee records</a>`;
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Appointment Letter', href: '#/list/appointment-letter' }, { label: l.c.name }])}<h1>${esc(l.c.name)} ${B.pill(l.status, ST[l.status])}</h1><p class="sub">${l.id} · ${esc(l.p.title)} · ${esc(l.p.dept)}</p></div>
        <div class="head-actions"><a class="btn" href="#/list/appointment-letter">${ic('left', 16)}All letters</a><button class="btn" data-act="toast" data-msg="Letter emailed to ${esc(l.c.email)}">${ic('mail', 16)}Email</button><button class="btn" data-act="al-print">${ic('print', 16)}Print / PDF</button></div></div>
      <div class="iv-cwrap"><div class="iv-main">${body(l)}</div>
      <aside class="iv-side">
        <div class="card pad"><div class="ct-row"><h3 class="ct">Letter progress</h3></div><ul class="jo-tl">${tl.map((s, i) => `<li class="${i < ix + 1 ? 'done' : i === ix + 1 ? 'now' : ''}"><i></i><div><b>${s[0]}</b><span>${s[1]}</span></div></li>`).join('')}</ul></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Actions</h3></div><div class="jo-acts">${acts}</div>
          <label class="al-sel"><span>Template</span><select class="inp" data-chg="altpl" data-id="${esc(l.cid)}" ${l.status !== 'Draft' ? 'disabled' : ''}>${TPL.map((t) => `<option ${t === l.tpl ? 'selected' : ''}>${t}</option>`).join('')}</select></label>${l.status !== 'Draft' ? '<p class="muted" style="margin:6px 0 0;font-size:11.5px">Template is locked once the letter is issued.</p>' : ''}</div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Key details</h3></div><div class="al-kv"><div><span>Joining date</span><b>${B.fdate(l.o.join)}</b><em>${inLbl(jd)}</em></div><div><span>Monthly CTC</span><b>${money(l.o.ctc)}</b></div><div><span>Reporting to</span><b>${esc(l.o.boss.name)}</b></div><div><span>Source offer</span><a href="#/list/job-offer/cand/${encodeURIComponent(l.cid)}">${l.o.id}</a></div><div><span>Interview</span><a href="#/list/interview/cand/${encodeURIComponent(l.cid)}">${B.iv.scoreOf(l.c).toFixed(1)} / 5 · view marking</a></div></div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Pre-joining documents</h3><span class="pill ${n === DOCS.length ? 'ok' : 'warn'}">${n}/${DOCS.length}</span></div><ul class="dx-td al-docs">${DOCS.map((d, i) => `<li class="${l.docs[i] ? 'done' : ''}"><button class="dx-ck" data-act="al-doc" data-id="${esc(l.cid)}" data-i="${i}" aria-label="Toggle">${l.docs[i] ? ic('check', 12) : ''}</button><div><b>${d}</b></div></li>`).join('')}</ul></div>
      </aside></div>`;
  };
  B.act['al-set'] = (t) => { const id = decodeURIComponent((location.hash.split('/letter/')[1] || '')); const v = t.dataset.v; S().st[id] = v; if (v === 'Issued') S().at[id] = B.iso(B.today); save(); B.toast(v === 'Issued' ? 'Letter issued to candidate' : v === 'Signed' ? 'Signed letter recorded' : 'Marked as joined 🎉'); B.route(); };
  B.chg.altpl = (t) => { S().tpl[t.dataset.id] = t.value; save(); B.toast('Template changed'); B.route(); };
  B.act['al-doc'] = (t) => { const l = find(t.dataset.id); if (!l) return; const d = l.docs.slice(); d[+t.dataset.i] = !d[+t.dataset.i]; S().docs[l.cid] = d; save(); B.route(); };
  B.act['al-print'] = () => window.print();

  B.renderLetters = (kind, id) => (kind === 'letter' ? letterView(id) : listView());
})();
