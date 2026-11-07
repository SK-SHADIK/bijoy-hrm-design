/* Sentradesk HRMS — Interviews by position: Position -> candidates -> interviewer scorecards + evaluation */
(function () {
  const B = window.B;
  const { ic, esc } = B;
  const E = B.EMPLOYEES;
  const KEY = 'bijoy-iv-v1';
  const CRIT = ['Technical Skills', 'Communication', 'Problem Solving', 'Culture Fit'];
  const ROUNDS = ['Screening', 'Technical Round 1', 'Technical Round 2', 'HR Round'];
  const SRC = ['LinkedIn', 'Bdjobs', 'Employee Referral', 'Website', 'Facebook', 'Walk-in'];
  const REC = { 'Strong Hire': 'ok', Hire: 'ok', Hold: 'warn', 'No Hire': 'bad' };
  const COMMENTS = {
    hi: ['Excellent depth in fundamentals and explained trade-offs clearly. Would be a strong addition to the team.', 'Confident, structured answers. Solved the practical task quickly with clean reasoning.', 'Very good communicator and clearly motivated. Matches the role requirements well.'],
    mid: ['Solid basics but needs more hands-on exposure on larger projects. Can grow into the role.', 'Good attitude and communication; technical answers were average on edge cases.', 'Meets most requirements. Would benefit from a follow-up round on system design.'],
    lo: ['Struggled with core concepts and could not complete the practical exercise.', 'Communication was unclear and answers lacked depth. Not a fit for this level.', 'Limited relevant experience for the position; expectations are not aligned.']
  };

  let store = null;
  const S = () => { if (store) return store; try { store = JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) {} return (store = store || { evals: {}, decisions: {} }); };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S())); } catch (e) {} };
  const me = () => (B.role === 'employee' ? B.ME : { name: 'Rahim Uddin', desig: 'HR Manager' });
  const dayISO = (n) => B.iso(B.addDays(B.today, n));
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const r1 = (n) => Math.round(n * 10) / 10;

  /* ---------- data model (deterministic mock + saved evaluations) ---------- */
  let model = null;
  function build() {
    if (model) return model;
    const jobs = B.getRows('job-opening').slice(0, 8);
    const pool = E.filter((e) => e.status !== 'Left' && e.id !== 'HR-EMP-00001');
    const positions = jobs.map((j, pi) => {
      const r = B.rng('iv-pos-' + j.name);
      const n = 3 + Math.floor(r() * 4);
      const cands = Array.from({ length: n }, (_, k) => {
        const rr = B.rng('iv-c-' + j.name + k);
        const name = B.APPLICANTS[(pi * 4 + k * 3 + 1) % B.APPLICANTS.length];
        const round = ROUNDS[Math.floor(rr() * ROUNDS.length)];
        const pn = 2 + Math.floor(rr() * 2);
        const panel = []; for (let q = 0; q < pn; q++) { const e = pool[Math.floor(rr() * pool.length)]; if (!panel.some((x) => x.id === e.id)) panel.push(e); }
        const quality = rr();
        const base = quality > 0.66 ? 4.3 : quality > 0.33 ? 3.3 : 2.1;
        const evals = [];
        panel.forEach((e, q) => {
          if (rr() < 0.72) {
            const sc = {}; CRIT.forEach((c) => { sc[c] = Math.max(1, Math.min(5, Math.round(base + (rr() - 0.5) * 1.6))); });
            const a = avg(Object.values(sc));
            const rec = a >= 4.4 ? 'Strong Hire' : a >= 3.5 ? 'Hire' : a >= 2.6 ? 'Hold' : 'No Hire';
            const pl = a >= 3.5 ? COMMENTS.hi : a >= 2.6 ? COMMENTS.mid : COMMENTS.lo;
            evals.push({ by: e.name, desig: e.desig, id: e.id, scores: sc, rec, comment: pl[Math.floor(rr() * pl.length)], date: dayISO(-Math.floor(rr() * 6) - q) });
          }
        });
        return { id: j.name + '~' + k, pos: j.name, name, round, source: SRC[Math.floor(rr() * SRC.length)], email: name.toLowerCase().replace(/[^a-z ]/g, '').replace(/ /g, '.') + '@mail.com', exp: 1 + Math.floor(rr() * 9), when: dayISO(Math.floor(rr() * 12) - 4), panel, seed: evals };
      });
      return { id: j.name, title: j.vals[0], desig: j.vals[1], dept: j.vals[2], loc: j.vals[3], vac: j.vals[4], status: j.vals[6], cands };
    });
    return (model = positions);
  }
  const evalsOf = (c) => c.seed.filter((x) => !(S().evals[c.id] || []).some((y) => y.by === x.by)).concat(S().evals[c.id] || []);
  const stateOf = (c) => {
    const d = S().decisions[c.id]; if (d) return d;
    const ev = evalsOf(c), total = Math.max(c.panel.length, ev.length);
    if (!ev.length) return 'Pending';
    if (ev.length < total) return 'Under Review';
    const a = avg(ev.map((x) => avg(Object.values(x.scores))));
    return a >= 3.5 ? 'Cleared' : a < 2.5 ? 'Rejected' : 'Under Review';
  };
  const scoreOf = (c) => { const ev = evalsOf(c); return ev.length ? r1(avg(ev.map((x) => avg(Object.values(x.scores))))) : 0; };
  const find = (pid) => build().find((p) => p.id === pid);
  const findC = (cid) => { for (const p of build()) { const c = p.cands.find((x) => x.id === cid); if (c) return [p, c]; } return []; };
  const tally = (cs) => { const t = { Cleared: 0, 'Under Review': 0, Pending: 0, Rejected: 0 }; cs.forEach((c) => t[stateOf(c)]++); return t; };
  const TONE = { Cleared: 'var(--ok)', 'Under Review': 'var(--warn)', Pending: 'var(--c1)', Rejected: 'var(--bad)' };

  const switcher = (on) => `<div class="seg views">${[['', 'briefcase', 'Positions'], ['list', 'list', 'List'], ['kanban', 'kanban', 'Kanban'], ['calendar', 'calendar', 'Calendar'], ['report', 'bars', 'Report']].map((v) => `<a class="${v[0] === on ? 'on' : ''}" href="#/list/interview${v[0] ? '/' + v[0] : ''}">${ic(v[1], 16)}<span>${v[2]}</span></a>`).join('')}</div>`;

  /* ---------- 1. positions ---------- */
  let q = '', stf = 'all';
  const posCard = (p) => {
    const t = tally(p.cands), n = p.cands.length, open = p.status === 'Open';
    const waiting = p.cands.filter((c) => evalsOf(c).length < c.panel.length).length;
    const posted = B.fdate(dayISO(-(4 + (B.hash(p.id) % 38)))).slice(0, 6);
    const extra = n > 4 ? '<span class="ivp-more">+' + (n - 4) + '</span>' : '';
    return `<a class="card iv-pos ${open ? '' : 'closed'}" href="#/list/interview/pos/${encodeURIComponent(p.id)}">
      <div class="ivp-h"><span class="ivp-ic">${ic('briefcase', 19)}</span><div class="ivp-t"><b title="${esc(p.title)}">${esc(p.title)}</b><span>${esc(p.dept)} · ${esc(p.loc)}</span></div>${B.pill(open ? 'Open' : 'Closed', open ? 'ok' : 'mute')}</div>
      <div class="ivp-meta"><span>${ic('file', 12)}${esc(p.id)}</span><span>${ic('calendar', 12)}Posted ${posted}</span></div>
      <div class="ivp-stats"><div><b>${n}</b><span>Candidates</span></div><div><b>${p.vac}</b><span>Vacancies</span></div><div class="${waiting ? 'warn' : ''}"><b>${waiting}</b><span>Pending feedback</span></div></div>
      <div class="ivp-prog"><div class="iv-bar">${Object.keys(t).map((k) => (t[k] ? `<u style="flex:${t[k]};background:${TONE[k]}" data-tip="${k}: ${t[k]}"></u>` : '')).join('')}</div>
        <div class="ivp-leg">${Object.keys(t).map((k) => `<span data-tip="${k}"><i style="background:${TONE[k]}"></i>${t[k]}<em>${k === 'Under Review' ? 'Review' : k}</em></span>`).join('')}</div></div>
      <div class="ivp-f"><span class="ivp-av">${B.avstack(p.cands.map((c) => c.name).slice(0, 4), 28)}${extra}</span><span class="ivp-go">View candidates ${ic('right', 14)}</span></div></a>`;
  };
  const posView = () => {
    const P = build(), all = P.flatMap((p) => p.cands), t = tally(all);
    const list = P.filter((p) => (stf === 'all' || p.status === stf) && (!q || (p.title + p.dept + p.loc).toLowerCase().includes(q.toLowerCase())));
    const kp = (i, l, v, c) => `<div class="card ivk"><span class="ivk-i ${c}">${ic(i, 18)}</span><div><b>${v}</b><span>${l}</span></div></div>`;
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Recruitment', href: '#/module/recruit' }, { label: 'Interview' }])}<h1>Interviews <span class="count">${all.length}</span></h1><p class="sub">Pick a posted position to see its candidates, their interview status and every interviewer's marking.</p></div>
        <div class="head-actions">${switcher('')}<a class="btn primary" href="#/form/interview/new">${ic('plus', 16)}Add Interview</a></div></div>
      <section class="iv-kpis">${kp('briefcase', 'Positions hiring', P.filter((p) => p.status === 'Open').length, 'a')}${kp('users', 'Candidates', all.length, 'b')}${kp('clock', 'Awaiting evaluation', all.filter((c) => evalsOf(c).length < c.panel.length).length, 'c')}${kp('check-circle', 'Cleared', t.Cleared, 'd')}${kp('x', 'Rejected', t.Rejected, 'e')}</section>
      <div class="filterbar"><label class="search">${ic('search', 16)}<input data-inp="ivq" value="${esc(q)}" placeholder="Search position, department or location…"></label>
        <div class="seg">${[['all', 'All'], ['Open', 'Open'], ['Closed', 'Closed']].map((x) => `<button class="${stf === x[0] ? 'on' : ''}" data-act="iv-sf" data-v="${x[0]}">${x[1]}</button>`).join('')}</div></div>
      <div class="iv-grid" id="iv-grid">${list.map(posCard).join('') || `<div class="empty">${ic('search', 34)}<b>No positions match</b></div>`}</div>`;
  };
  B.inp.ivq = (t) => { q = t.value; const g = B.$('#iv-grid'); if (g) { const P = build().filter((p) => (stf === 'all' || p.status === stf) && (!q || (p.title + p.dept + p.loc).toLowerCase().includes(q.toLowerCase()))); g.innerHTML = P.map(posCard).join('') || `<div class="empty">${ic('search', 34)}<b>No positions match</b></div>`; } };
  B.act['iv-sf'] = (t) => { stf = t.dataset.v; B.route(); };

  /* ---------- 2. position -> candidates ---------- */
  const posDetail = (pid) => {
    const p = find(pid); if (!p) return `<div class="empty big">${ic('search', 44)}<b>Position not found</b><a class="btn primary" href="#/list/interview">Back to positions</a></div>`;
    const t = tally(p.cands);
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Interview', href: '#/list/interview' }, { label: p.title }])}<h1>${esc(p.title)} ${B.pill(p.status === 'Open' ? 'Open' : 'Closed', p.status === 'Open' ? 'ok' : 'mute')}</h1><p class="sub">${esc(p.desig)} · ${esc(p.dept)} · ${esc(p.loc)} · ${p.vac} vacanc${p.vac > 1 ? 'ies' : 'y'}</p></div>
        <div class="head-actions"><a class="btn" href="#/list/interview">${ic('left', 16)}All positions</a><a class="btn primary" href="#/form/interview/new">${ic('plus', 16)}Schedule interview</a></div></div>
      <section class="iv-kpis">${Object.keys(t).map((k) => `<div class="card ivk"><span class="ivk-dot" style="background:${TONE[k]}"></span><div><b>${t[k]}</b><span>${k}</span></div></div>`).join('')}<div class="card ivk"><span class="ivk-dot" style="background:var(--text-3)"></span><div><b>${p.cands.length}</b><span>Total candidates</span></div></div></section>
      <div class="card table-card"><div class="card-h"><h3 class="ct">Candidates in interview</h3><span class="muted">Click a candidate to view the markings and evaluate</span></div><div class="tscroll"><table class="dt iv-t"><thead><tr><th>Candidate</th><th>Round</th><th>Scheduled</th><th>Interviewers</th><th>Evaluated</th><th>Avg. score</th><th>Status</th><th></th></tr></thead><tbody>
        ${p.cands.map((c) => { const ev = evalsOf(c), st = stateOf(c), sc = scoreOf(c); return `<tr data-act="row" data-href="#/list/interview/cand/${encodeURIComponent(c.id)}"><td><span class="who">${B.avatar(c.name, 34)}<span><b>${esc(c.name)}</b><em class="sub">${c.exp} yrs exp · ${esc(c.source)}</em></span></span></td><td>${esc(c.round)}</td><td>${B.fdate(c.when)}</td><td>${B.avstack(c.panel.map((e) => e.name), 26)}</td><td><span class="ivp-ev ${ev.length < c.panel.length ? 'part' : ''}">${ev.length}/${c.panel.length}</span></td><td>${sc ? `<b>${sc.toFixed(1)}</b> ${B.stars(sc)}` : '<span class="muted">—</span>'}</td><td>${B.pill(st)}</td><td class="r">${ic('right', 16)}</td></tr>`; }).join('')}</tbody></table></div></div>`;
  };

  /* ---------- 3. candidate -> scorecards + evaluate ---------- */
  let draft = { r: {}, rec: '' };
  const ratingRow = (c, v) => `<div class="iv-rr" data-c="${c}"><span>${c}</span><div>${[1, 2, 3, 4, 5].map((i) => `<button type="button" class="${v >= i ? 'on' : ''}" data-act="iv-rate" data-c="${c}" data-v="${i}" aria-label="${i}">★</button>`).join('')}</div></div>`;
  const candView = (cid) => {
    const [p, c] = findC(cid); if (!c) return `<div class="empty big">${ic('search', 44)}<b>Candidate not found</b><a class="btn primary" href="#/list/interview">Back to positions</a></div>`;
    const ev = evalsOf(c), st = stateOf(c), sc = scoreOf(c), mine = ev.find((x) => x.by === me().name), dec = S().decisions[c.id];
    const critAvg = CRIT.map((k) => [k, ev.length ? avg(ev.map((x) => x.scores[k])) : 0]);
    const done = new Set(ev.map((x) => x.by)), pending = c.panel.filter((e) => !done.has(e.name));
    if (!draft.cid || draft.cid !== c.id) draft = { cid: c.id, r: mine ? Object.assign({}, mine.scores) : {}, rec: mine ? mine.rec : '' };
    const recs = ev.reduce((a, x) => { a[x.rec] = (a[x.rec] || 0) + 1; return a; }, {});
    return `<div class="page-head"><div>${B.crumbs([{ label: 'HR', href: '#/' }, { label: 'Interview', href: '#/list/interview' }, { label: p.title, href: '#/list/interview/pos/' + encodeURIComponent(p.id) }, { label: c.name }])}<h1>${esc(c.name)} ${B.pill(st)}</h1><p class="sub">Applied for ${esc(p.title)} · ${esc(c.round)} · ${B.fdate(c.when)}</p></div>
        <div class="head-actions"><a class="btn" href="#/list/interview/pos/${encodeURIComponent(p.id)}">${ic('left', 16)}Back to candidates</a></div></div>
      <div class="iv-cwrap"><div class="iv-main">
        <div class="card pad iv-prof">${B.avatar(c.name, 72)}<div class="ivpf-i"><b>${esc(c.name)}</b><span>${esc(c.email)}</span><div class="ivpf-m"><span>${ic('briefcase', 13)}${c.exp} yrs experience</span><span>${ic('globe', 13)}${esc(c.source)}</span><span>${ic('target', 13)}${esc(c.round)}</span></div>
            <div class="ivpf-p"><span class="muted">Panel</span>${B.avstack(c.panel.map((e) => e.name), 28)}<span class="muted">${c.panel.map((e) => esc(e.first)).join(', ')}</span></div></div>
          <div class="ivpf-s">${B.ring(Math.round((sc / 5) * 100), 96, sc ? sc.toFixed(1) : '—', 'of 5', st === 'Rejected' ? 'var(--bad)' : st === 'Cleared' ? 'var(--ok)' : 'var(--accent)')}<span class="muted">${ev.length}/${Math.max(c.panel.length, ev.length)} evaluated</span></div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Marking summary</h3><div class="ivr-chips">${Object.keys(recs).map((k) => `<span class="pill ${REC[k]}">${recs[k]} ${k}</span>`).join('') || '<span class="muted">No marks yet</span>'}</div></div>
          <div class="iv-crit">${critAvg.map((x) => `<div><span>${x[0]}</span><i><u style="width:${(x[1] / 5) * 100}%;background:${x[1] >= 3.5 ? 'var(--ok)' : x[1] >= 2.5 ? 'var(--warn)' : 'var(--bad)'}"></u></i><b>${x[1] ? x[1].toFixed(1) : '—'}</b></div>`).join('')}</div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Interviewer evaluations <span class="count">${ev.length}</span></h3></div>
          <div class="iv-evs">${ev.map((x) => { const a = avg(Object.values(x.scores)); return `<div class="iv-ev"><div class="ive-h">${B.avatar(x.by, 38)}<div><b>${esc(x.by)}${x.by === me().name ? ' <em>(you)</em>' : ''}</b><span>${esc(x.desig)} · ${B.fdate(x.date)}</span></div><div class="ive-r">${B.pill(x.rec, REC[x.rec])}<b>${a.toFixed(1)}</b></div></div>
              <div class="ive-s">${CRIT.map((k) => `<div><span>${k}</span>${B.stars(x.scores[k])}</div>`).join('')}</div><p class="ive-c">${ic('message', 14)}${esc(x.comment || 'No comment')}</p></div>`; }).join('')}
            ${pending.map((e) => `<div class="iv-ev pend"><div class="ive-h">${B.avatar(e.name, 38)}<div><b>${esc(e.name)}</b><span>${esc(e.desig)}</span></div><div class="ive-r">${B.pill('Awaiting feedback', 'warn')}<button class="btn sm" data-act="toast" data-msg="Reminder sent to ${esc(e.first)}">${ic('bell', 14)}Remind</button></div></div></div>`).join('')}</div></div>
      </div>
      <aside class="iv-side">
        <div class="card pad"><div class="ct-row"><h3 class="ct">${mine ? 'Update your evaluation' : 'Evaluate candidate'}</h3></div><p class="muted" style="margin:0 0 10px">Evaluating as <b>${esc(me().name)}</b></p>
          <div class="iv-form" data-id="${esc(c.id)}">${CRIT.map((k) => ratingRow(k, draft.r[k] || 0)).join('')}
            <div class="iv-recs">${Object.keys(REC).map((k) => `<button type="button" class="${draft.rec === k ? 'on ' + REC[k] : ''}" data-act="iv-rec" data-v="${k}">${k}</button>`).join('')}</div>
            <textarea class="inp" id="iv-cm" rows="4" placeholder="Comments about the candidate…">${mine ? esc(mine.comment) : ''}</textarea>
            <button class="btn primary" style="width:100%" data-act="iv-submit">${ic('check', 16)}${mine ? 'Update evaluation' : 'Submit evaluation'}</button></div></div>
        <div class="card pad"><div class="ct-row"><h3 class="ct">Final decision</h3>${dec ? B.pill(dec) : '<span class="muted">Auto</span>'}</div>
          <p class="muted" style="margin:0 0 10px">${dec ? 'Decision set manually by HR.' : 'Status follows the average score once every interviewer has marked.'}</p>
          <div class="iv-dec"><button class="btn ok" data-act="iv-dec" data-v="Cleared">${ic('check', 15)}Clear</button><button class="btn" data-act="iv-dec" data-v="Under Review">Hold</button><button class="btn danger-o" data-act="iv-dec" data-v="Rejected">${ic('x', 15)}Reject</button></div>
          ${dec ? `<button class="link-btn" style="margin-top:10px" data-act="iv-dec" data-v="">Reset to automatic</button>` : ''}</div>
      </aside></div>`;
  };
  B.act['iv-rate'] = (t) => { draft.r[t.dataset.c] = +t.dataset.v; const row = t.closest('.iv-rr'); row.querySelectorAll('button').forEach((b) => b.classList.toggle('on', +b.dataset.v <= +t.dataset.v)); };
  B.act['iv-rec'] = (t) => { draft.rec = t.dataset.v; t.parentNode.querySelectorAll('button').forEach((b) => { b.className = b === t ? 'on ' + REC[b.dataset.v] : ''; }); };
  B.act['iv-submit'] = (t) => {
    const f = t.closest('.iv-form'), id = f.dataset.id;
    if (CRIT.some((k) => !draft.r[k])) { B.toast('Rate all four criteria first', 'bad'); return; }
    if (!draft.rec) { B.toast('Choose a recommendation', 'bad'); return; }
    const u = me(), a = avg(Object.values(draft.r));
    const rec = { by: u.name, desig: u.desig, scores: Object.assign({}, draft.r), rec: draft.rec, comment: (B.$('#iv-cm').value || '').trim(), date: B.iso(B.today) };
    const list = (S().evals[id] || []).filter((x) => x.by !== u.name); list.push(rec); S().evals[id] = list; save();
    B.toast('Evaluation saved · ' + a.toFixed(1) + ' / 5'); B.route();
  };
  B.act['iv-dec'] = (t) => { const id = t.closest('aside').querySelector('.iv-form').dataset.id; if (t.dataset.v) S().decisions[id] = t.dataset.v; else delete S().decisions[id]; save(); B.toast(t.dataset.v ? 'Marked as ' + t.dataset.v : 'Decision reset'); B.route(); };

  B.iv = { build, find, findC, stateOf, scoreOf, evalsOf, tally, dayISO, me };
  B.renderInterviews = (kind, id) => (kind === 'pos' ? posDetail(id) : kind === 'cand' ? candView(id) : posView());
})();
