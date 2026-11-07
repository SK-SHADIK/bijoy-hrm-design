/* Sentradesk HRMS — Job Offers by position: Position -> offered candidates -> offer details & actions */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const E = B.EMPLOYEES;
  const KEY = 'bijoy-jo-v1';
  const ST = { Draft: 'mute', 'Awaiting Response': 'warn', Accepted: 'ok', Declined: 'bad', Withdrawn: 'mute' };
  const COL = { Draft: 'var(--text-3)', 'Awaiting Response': 'var(--warn)', Accepted: 'var(--ok)', Declined: 'var(--bad)', Withdrawn: 'var(--border-strong, #cfd3e0)' };

  let store = null;
  const S = () => { if (store) return store; try { store = JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) {} return (store = store || { st: {}, ctc: {}, sent: {} }); };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S())); } catch (e) {} };
  const money = (n) => '৳ ' + Math.round(n).toLocaleString('en-IN');

  /* offers exist for candidates the interview panel has cleared */
  const offerOf = (p, c) => {
    const r = B.rng('jo-' + c.id), x = r();
    const base = Math.round((38000 + B.rng('jo-p-' + p.id)() * 70000) / 500) * 500;
    const def = x < 0.12 ? 'Draft' : x < 0.35 ? 'Awaiting Response' : x < 0.88 ? 'Accepted' : 'Declined';
    const status = S().st[c.id] || def;
    const ctc = S().ctc[c.id] || base + Math.round(r() * 8) * 1000;
    const offerDate = S().sent[c.id] || B.iv.dayISO(-(2 + Math.floor(r() * 9)));
    const join = B.iso(B.addDays(B.parse(offerDate), 28 + Math.floor(r() * 14)));
    const valid = B.iso(B.addDays(B.parse(offerDate), 7));
    const boss = E.find((e) => e.dept === p.dept && e.id !== 'HR-EMP-00001') || E[1];
    return { id: 'OFR-2026-' + B.pad(2000 + (B.hash(c.id) % 900), 4), c, p, status, ctc, offerDate, join, valid, boss };
  };
  const offersOf = (p) => p.cands.filter((c) => B.iv.stateOf(c) === 'Cleared').map((c) => offerOf(p, c));
  const findOffer = (cid) => { const [p, c] = B.iv.findC(cid); return c ? offerOf(p, c) : null; };
  const tally = (os) => { const t = { Draft: 0, 'Awaiting Response': 0, Accepted: 0, Declined: 0 }; os.forEach((o) => { if (t[o.status] !== undefined) t[o.status]++; }); return t; };

  const switcher = (on) => `<div class="seg views">${[['', 'briefcase', 'Positions'], ['list', 'list', 'List'], ['kanban', 'kanban', 'Kanban'], ['report', 'bars', 'Report']].map((v) => `<a class="${v[0] === on ? 'on' : ''}" href="#/list/job-offer${v[0] ? '/' + v[0] : ''}">${ic(v[1], 16)}<span>${v[2]}</span></a>`).join('')}</div>`;
  const kp = (i, l, v, c) => `<div class="card ivk"><span class="ivk-i ${c}">${ic(i, 18)}</span><div><b>${v}</b><span>${l}</span></div></div>`;

  /* ---------- 1. positions ---------- */
  let q = '', sf = 'all';
  const match = (p) => (sf === 'all' || (sf === 'offers' ? offersOf(p).length > 0 : p.status === sf)) && (!q || (p.title + p.dept + p.loc).toLowerCase().includes(q.toLowerCase()));
  const posCard = (p) => {
    const os = offersOf(p), t = tally(os), open = p.status === 'Open';
    const posted = B.fdate(B.iv.dayISO(-(4 + (B.hash(p.id) % 38)))).slice(0, 6);
    const extra = os.length > 4 ? '<span class="ivp-more">+' + (os.length - 4) + '</span>' : '';
    return `<a class="card iv-pos ${open ? '' : 'closed'}" href="#/list/job-offer/pos/${encodeURIComponent(p.id)}">
      <div class="ivp-h"><span class="ivp-ic">${ic('send', 19)}</span><div class="ivp-t"><b title="${esc(p.title)}">${esc(p.title)}</b><span>${esc(p.dept)} · ${esc(p.loc)}</span></div>${B.pill(open ? 'Open' : 'Closed', open ? 'ok' : 'mute')}</div>
      <div class="ivp-meta"><span>${ic('file', 12)}${esc(p.id)}</span><span>${ic('calendar', 12)}Posted ${posted}</span></div>
      <div class="ivp-stats"><div><b>${os.length}</b><span>Offers</span></div><div><b>${p.vac}</b><span>Vacancies</span></div><div class="${t.Accepted >= p.vac ? '' : ''}"><b>${t.Accepted}</b><span>Accepted</span></div></div>
      <div class="ivp-prog">${os.length ? `<div class="iv-bar">${Object.keys(t).map((k) => (t[k] ? `<u style="flex:${t[k]};background:${COL[k]}" data-tip="${k}: ${t[k]}"></u>` : '')).join('')}</div>
        <div class="ivp-leg">${Object.keys(t).map((k) => `<span data-tip="${k}"><i style="background:${COL[k]}"></i>${t[k]}<em>${k === 'Awaiting Response' ? 'Awaiting' : k}</em></span>`).join('')}</div>` : `<div class="jo-none">No offers yet · clear a candidate in Interview to create one</div>`}</div>
      <div class="ivp-f"><span class="ivp-av">${os.length ? B.avstack(os.map((o) => o.c.name).slice(0, 4), 28) : ''}${extra}</span><span class="ivp-go">View offers ${ic('right', 14)}</span></div></a>`;
  };
  const posView = () => {
    const P = B.iv.build(), all = P.flatMap(offersOf), t = tally(all);
    const pipeline = all.filter((o) => o.status === 'Accepted' || o.status === 'Awaiting Response').reduce((a, o) => a + o.ctc, 0);
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Recruitment', href: '#/module/recruit' }, { label: 'Job Offer' }])}<h1>Job Offers <span class="count">${all.length}</span></h1><p class="sub">Offers grouped by the position they were made for. Open a position to see each candidate's offer, compensation and response.</p></div>
        <div class="head-actions">${switcher('')}<a class="btn primary" href="#/form/job-offer/new">${ic('plus', 16)}Add Job Offer</a></div></div>
      <section class="iv-kpis">${kp('briefcase', 'Positions with offers', P.filter((p) => offersOf(p).length).length, 'a')}${kp('send', 'Total offers', all.length, 'a')}${kp('clock', 'Awaiting response', t['Awaiting Response'], 'c')}${kp('check-circle', 'Accepted', t.Accepted, 'd')}${kp('x', 'Declined', t.Declined, 'e')}${kp('dollar', 'Monthly CTC committed', money(pipeline), 'b')}</section>
      <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="joq" value="${esc(q)}" placeholder="Search position, department or location…"></label>
        <div class="seg">${[['all', 'All'], ['offers', 'With offers'], ['Open', 'Open'], ['Closed', 'Closed']].map((x) => `<button class="${sf === x[0] ? 'on' : ''}" data-act="jo-sf" data-v="${x[0]}">${x[1]}</button>`).join('')}</div></div>
      <div class="iv-grid" id="jo-grid">${P.filter(match).map(posCard).join('') || `<div class="empty">${ic('search', 34)}<b>No positions match</b></div>`}</div>`;
  };
  B.inp.joq = (t) => { q = t.value; const g = B.$('#jo-grid'); if (g) g.innerHTML = B.iv.build().filter(match).map(posCard).join('') || `<div class="empty">${ic('search', 34)}<b>No positions match</b></div>`; };
  B.act['jo-sf'] = (t) => { sf = t.dataset.v; B.route(); };

  /* ---------- 2. position -> offers ---------- */
  const posDetail = (pid) => {
    const p = B.iv.find(pid); if (!p) return `<div class="empty big">${ic('search', 44)}<b>Position not found</b><a class="btn primary" href="#/list/job-offer">Back</a></div>`;
    const os = offersOf(p), t = tally(os), total = os.reduce((a, o) => a + o.ctc, 0);
    const waiting = p.cands.filter((c) => B.iv.stateOf(c) !== 'Cleared' && B.iv.stateOf(c) !== 'Rejected').length;
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Job Offer', href: '#/list/job-offer' }, { label: p.title }])}<h1>${esc(p.title)} ${B.pill(p.status === 'Open' ? 'Open' : 'Closed', p.status === 'Open' ? 'ok' : 'mute')}</h1><p class="sub">${esc(p.desig)} · ${esc(p.dept)} · ${esc(p.loc)} · ${p.vac} vacanc${p.vac > 1 ? 'ies' : 'y'}</p></div>
        <div class="head-actions"><a class="btn" href="#/list/job-offer">${ic('left', 16)}All positions</a><a class="btn primary" href="#/list/interview/pos/${encodeURIComponent(p.id)}">${ic('users', 16)}View interviews</a></div></div>
      <section class="iv-kpis">${Object.keys(t).map((k) => `<div class="card ivk"><span class="ivk-dot" style="background:${COL[k]}"></span><div><b>${t[k]}</b><span>${k}</span></div></div>`).join('')}<div class="card ivk"><span class="ivk-dot" style="background:var(--accent)"></span><div><b>${money(total)}</b><span>Total monthly CTC</span></div></div></section>
      ${os.length ? `<div class="card table-card"><div class="card-h"><h3 class="ct">Offers for this position</h3><span class="muted">Click a candidate to view the offer</span></div><div class="tscroll"><table class="dt iv-t"><thead><tr><th>Candidate</th><th>Offer ID</th><th>Offer date</th><th>Monthly CTC</th><th>Joining date</th><th>Valid until</th><th>Status</th><th></th></tr></thead><tbody>
        ${os.map((o) => `<tr data-act="row" data-href="#/list/job-offer/cand/${encodeURIComponent(o.c.id)}"><td><span class="who">${B.avatar(o.c.name, 34)}<span><b>${esc(o.c.name)}</b><em class="sub">Interview score ${B.iv.scoreOf(o.c).toFixed(1)} / 5</em></span></span></td><td><span class="fl-id">${o.id}</span></td><td>${B.fdate(o.offerDate)}</td><td><b>${money(o.ctc)}</b></td><td>${B.fdate(o.join)}</td><td>${B.fdate(o.valid)}</td><td>${B.pill(o.status, ST[o.status])}</td><td class="r">${ic('right', 16)}</td></tr>`).join('')}</tbody></table></div></div>`
      : `<div class="card pad jo-empty">${ic('send', 36)}<b>No offers for this position yet</b><span>Candidates appear here once the interview panel clears them. ${waiting} candidate${waiting === 1 ? ' is' : 's are'} still in the interview process.</span><a class="btn primary" href="#/list/interview/pos/${encodeURIComponent(p.id)}">Go to interviews</a></div>`}`;
  };

  /* ---------- 3. offer detail ---------- */
  const steps = (o) => {
    const sent = o.status !== 'Draft', resp = o.status === 'Accepted' || o.status === 'Declined' || o.status === 'Withdrawn';
    return [['Interview cleared', 'Panel average ' + B.iv.scoreOf(o.c).toFixed(1) + ' / 5', 'done'], ['Offer drafted', B.fdate(o.offerDate), 'done'], ['Offer sent', sent ? 'Valid until ' + B.fdate(o.valid) : 'Not sent yet', sent ? 'done' : 'now'],
      ['Candidate response', resp ? o.status : sent ? 'Awaiting reply' : '—', resp ? (o.status === 'Accepted' ? 'done' : 'bad') : sent ? 'now' : ''], ['Joining', o.status === 'Accepted' ? B.fdate(o.join) : '—', o.status === 'Accepted' ? 'now' : '']];
  };
  const offerView = (cid) => {
    const o = findOffer(cid); if (!o) return `<div class="empty big">${ic('search', 44)}<b>Offer not found</b><a class="btn primary" href="#/list/job-offer">Back</a></div>`;
    if (B.iv.stateOf(o.c) !== 'Cleared') return `<div class="empty big">${ic('alert', 44)}<b>No offer for this candidate</b><span>They are no longer cleared in Interview.</span><a class="btn primary" href="#/list/job-offer/pos/${encodeURIComponent(o.p.id)}">Back to position</a></div>`;
    const g = o.ctc, basic = Math.round(g * 0.5), hra = Math.round(g * 0.25), med = Math.round(g * 0.08), conv = Math.round(g * 0.05), oth = g - basic - hra - med - conv;
    const comp = [['Basic Salary', basic], ['House Rent Allowance', hra], ['Medical Allowance', med], ['Conveyance Allowance', conv], ['Festival / Performance Bonus', oth]];
    const d = (l, v) => `<div><span>${l}</span><b>${v}</b></div>`;
    let acts = '';
    if (o.status === 'Draft') acts = `<button class="btn primary" data-act="jo-set" data-v="Awaiting Response">${ic('send', 15)}Send offer</button>`;
    else if (o.status === 'Awaiting Response') acts = `<button class="btn ok" data-act="jo-set" data-v="Accepted">${ic('check', 15)}Mark accepted</button><button class="btn danger-o" data-act="jo-set" data-v="Declined">${ic('x', 15)}Mark declined</button><button class="btn" data-act="toast" data-msg="Reminder sent to ${esc(o.c.name.split(' ')[0])}">${ic('bell', 15)}Send reminder</button><button class="btn" data-act="jo-set" data-v="Withdrawn">Withdraw offer</button>`;
    else if (o.status === 'Accepted') acts = `<a class="btn primary" href="#/form/employee/new">${ic('user-plus', 15)}Convert to employee</a><button class="btn" data-act="toast" data-msg="Offer letter downloaded">${ic('download', 15)}Download letter</button>`;
    else acts = `<button class="btn" data-act="jo-set" data-v="Draft">Reopen as draft</button>`;
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Job Offer', href: '#/list/job-offer' }, { label: o.p.title, href: '#/list/job-offer/pos/' + encodeURIComponent(o.p.id) }, { label: o.c.name }])}<h1>${esc(o.c.name)} ${B.pill(o.status, ST[o.status])}</h1><p class="sub">Offer ${o.id} for ${esc(o.p.title)} · ${esc(o.p.dept)}</p></div>
        <div class="head-actions"><a class="btn" href="#/list/job-offer/pos/${encodeURIComponent(o.p.id)}">${ic('left', 16)}Back to offers</a></div></div>
      <div class="iv-cwrap"><div class="iv-main">
        <div class="card pad iv-prof">${B.avatar(o.c.name, 72)}<div class="ivpf-i"><b>${esc(o.c.name)}</b><span>${esc(o.c.email)}</span><div class="ivpf-m"><span>${ic('briefcase', 13)}${o.c.exp} yrs experience</span><span>${ic('globe', 13)}${esc(o.c.source)}</span><span>${ic('target', 13)}Final round: ${esc(o.c.round)}</span></div>
            <a class="link-btn" href="#/list/interview/cand/${encodeURIComponent(o.c.id)}">View interview marking ${ic('right', 12)}</a></div>
          <div class="ivpf-s">${B.ring(Math.round((B.iv.scoreOf(o.c) / 5) * 100), 96, B.iv.scoreOf(o.c).toFixed(1), 'interview', 'var(--ok)')}</div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Offer terms</h3></div><div class="jo-kv">${d('Position', esc(o.p.title))}${d('Designation', esc(o.p.desig))}${d('Department', esc(o.p.dept))}${d('Work location', esc(o.p.loc))}${d('Reporting to', esc(o.boss.name))}${d('Employment type', 'Full-time')}${d('Probation', '6 months')}${d('Offer date', B.fdate(o.offerDate))}${d('Offer valid until', B.fdate(o.valid))}${d('Expected joining', B.fdate(o.join))}</div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Compensation</h3><span class="pill info">${money(g * 12)} / year</span></div>
          <table class="dt jo-comp"><tbody>${comp.map((x) => `<tr><td>${x[0]}</td><td class="r">${money(x[1])}</td><td class="r muted">${Math.round((x[1] / g) * 100)}%</td></tr>`).join('')}</tbody><tfoot><tr><td>Monthly CTC</td><td class="r">${money(g)}</td><td></td></tr></tfoot></table></div>
      </div>
      <aside class="iv-side">
        <div class="card pad"><div class="ct-row"><h3 class="ct">Offer progress</h3></div><ul class="jo-tl">${steps(o).map((s) => `<li class="${s[2]}"><i></i><div><b>${s[0]}</b><span>${s[1]}</span></div></li>`).join('')}</ul></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Actions</h3></div><div class="jo-acts">${acts}</div></div>
        ${o.status === 'Draft' || o.status === 'Awaiting Response' ? `<div class="card pad"><div class="ct-row"><h3 class="ct">Negotiate CTC</h3></div><p class="muted" style="margin:0 0 8px">Update the monthly CTC if the candidate negotiates.</p><div class="dx-tadd"><input class="inp" id="jo-ctc" type="number" min="0" step="500" value="${o.ctc}"><button class="btn primary" data-act="jo-ctc" data-id="${esc(o.c.id)}">Save</button></div></div>` : ''}
      </aside></div>`;
  };
  B.act['jo-set'] = (t) => {
    const cid = decodeURIComponent((location.hash.split('/cand/')[1] || '')); if (!cid) return;
    const v = t.dataset.v; S().st[cid] = v; if (v === 'Awaiting Response') S().sent[cid] = B.iso(B.today); save();
    B.toast(v === 'Awaiting Response' ? 'Offer sent to candidate' : v === 'Accepted' ? 'Offer accepted 🎉' : v === 'Declined' ? 'Offer declined' : v === 'Withdrawn' ? 'Offer withdrawn' : 'Offer reopened', v === 'Declined' || v === 'Withdrawn' ? 'bad' : 'ok'); B.route();
  };
  B.act['jo-ctc'] = (t) => { const n = +B.$('#jo-ctc').value; if (!(n > 0)) { B.toast('Enter a valid amount', 'bad'); return; } S().ctc[t.dataset.id] = n; save(); B.toast('CTC updated'); B.route(); };

  B.jo = { offersOf, offerOf, findOffer, money };
  B.renderOffers = (kind, id) => (kind === 'pos' ? posDetail(id) : kind === 'cand' ? offerView(id) : posView());
})();
