/* Bijoy HRMS — UI helpers: icons, formatting, charts, toast, modal, event delegation */
(function () {
  const B = (window.B = window.B || {});

  /* ---------- Icons (24px stroke set). "oX,Y,R" = circle, "rX,Y,W,H,RX" = rect, else path ---------- */
  const ICONS = {
    home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22V12h6v10',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|o9,7,4|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|o12,7,4',
    'user-plus': 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|o8.5,7,4|M20 8v6|M23 11h-6',
    'user-minus': 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|o8.5,7,4|M23 11h-6',
    'user-check': 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|o8.5,7,4|M17 11l2 2 4-4',
    calendar: 'r3,4,18,18,2|M16 2v4|M8 2v4|M3 10h18',
    clock: 'o12,12,10|M12 6v6l4 2',
    briefcase: 'r2,7,20,14,2|M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
    dollar: 'M12 1v22|M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    card: 'r1,4,22,16,2|M1 10h22',
    file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6|M16 13H8|M16 17H8|M10 9H8',
    award: 'o12,8,7|M8.21 13.89L7 23l5-3 5 3-1.21-9.12',
    target: 'o12,12,10|o12,12,6|o12,12,2',
    trend: 'M23 6l-9.5 9.5-5-5L1 18|M17 6h6v6',
    book: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z|M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
    pin: 'M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z|o12,10,3',
    truck: 'r1,3,15,13,0|M16 8h4l3 3v5h-7z|o5.5,18.5,2.5|o18.5,18.5,2.5',
    send: 'M22 2L11 13|M22 2l-7 20-4-9-9-4z',
    settings: 'M4 21v-7|M4 10V3|M12 21v-9|M12 8V3|M20 21v-5|M20 12V3|M1 14h6|M9 8h6|M17 16h6',
    bars: 'M12 20V10|M18 20V4|M6 20v-4',
    pie: 'M21.21 15.89A10 10 0 1 1 8 2.83|M22 12A10 10 0 0 0 12 2v10z',
    search: 'o11,11,8|M21 21l-4.35-4.35',
    bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9|M13.73 21a2 2 0 0 1-3.46 0',
    plus: 'M12 5v14|M5 12h14',
    check: 'M20 6L9 17l-5-5',
    'check-circle': 'M22 11.08V12a10 10 0 1 1-5.93-9.14|M22 4L12 14.01l-3-3',
    x: 'M18 6L6 18|M6 6l12 12',
    right: 'M9 18l6-6-6-6',
    left: 'M15 18l-6-6 6-6',
    down: 'M6 9l6 6 6-6',
    up: 'M18 15l-6-6-6 6',
    menu: 'M3 12h18|M3 6h18|M3 18h18',
    sun: 'o12,12,5|M12 1v2|M12 21v2|M4.22 4.22l1.42 1.42|M18.36 18.36l1.42 1.42|M1 12h2|M21 12h2|M4.22 19.78l1.42-1.42|M18.36 5.64l1.42-1.42',
    moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
    filter: 'M22 3H2l8 9.46V19l4 2v-8.54z',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M7 10l5 5 5-5|M12 15V3',
    upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M17 8l-5-5-5 5|M12 3v12',
    edit: 'M12 20h9|M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z',
    trash: 'M3 6h18|M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6|M10 11v6|M14 11v6|M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    more: 'o12,12,1|o19,12,1|o5,12,1',
    mail: 'r2,4,20,16,2|M22 6l-10 7L2 6',
    phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    gift: 'M20 12v10H4V12|r2,7,20,5,0|M12 22V7|M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z|M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
    heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
    layers: 'M12 2L2 7l10 5 10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5',
    grid: 'r3,3,7,7,1|r14,3,7,7,1|r14,14,7,7,1|r3,14,7,7,1',
    list: 'M8 6h13|M8 12h13|M8 18h13|M3 6h.01|M3 12h.01|M3 18h.01',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4|M16 17l5-5-5-5|M21 12H9',
    alert: 'o12,12,10|M12 8v4|M12 16h.01',
    message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z',
    org: 'r9,2,6,5,1|r2,17,6,5,1|r16,17,6,5,1|M12 7v5|M5 17v-5h14v5',
    phoneui: 'r5,2,14,20,3|M12 18h.01',
    refresh: 'M23 4v6h-6|M1 20v-6h6|M3.51 9a9 9 0 0 1 14.85-3.36L23 10|M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
    percent: 'M19 5L5 19|o6.5,6.5,2.5|o17.5,17.5,2.5',
    activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
    link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71|M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    print: 'M6 9V2h12v7|M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2|r6,14,12,8,0',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z|o12,12,3',
    copy: 'r9,9,13,13,2|M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
    paperclip: 'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48',
    tag: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z|M7 7h.01',
    building: 'r4,2,16,20,2|M9 22v-4h6v4|M8 6h.01|M16 6h.01|M12 6h.01|M12 10h.01|M12 14h.01|M16 10h.01|M16 14h.01|M8 10h.01|M8 14h.01',
    zap: 'M13 2L3 14h9l-1 8 10-12h-9z',
    coffee: 'M18 8h1a4 4 0 0 1 0 8h-1|M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z|M6 1v3|M10 1v3|M14 1v3',
    location: 'M3 11l19-9-9 19-2-8z',
    wifi: 'M5 12.55a11 11 0 0 1 14.08 0|M1.42 9a16 16 0 0 1 21.16 0|M8.53 16.11a6 6 0 0 1 6.95 0|M12 20h.01',
    fingerprint: 'M12 11a2 2 0 0 0-2 2c0 3-1 5-2 7|M12 7a6 6 0 0 0-6 6c0 2 0 4-1 6|M12 3a10 10 0 0 0-10 10c0 2 0 3-.5 4|M12 15c0 3-1 5-2 7|M17 20c1-3 1-5 1-8a6 6 0 0 0-4-5.6',
    plane: 'M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
    moneyloan: 'r2,6,20,12,2|o12,12,2|M6 12h.01|M18 12h.01',
    grad: 'M22 10L12 5 2 10l10 5z|M6 12v5c3 3 9 3 12 0v-5',
    inbox: 'M22 12h-6l-2 3h-4l-2-3H2|M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
    kanban: 'r3,3,5,18,1|r10,3,5,12,1|r17,3,4,8,1',
    hash: 'M4 9h16|M4 15h16|M10 3L8 21|M16 3l-2 18',
    lock: 'r3,11,18,11,2|M7 11V7a5 5 0 0 1 10 0v4',
    key: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
    globe: 'o12,12,10|M2 12h20|M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
    smile: 'o12,12,10|M8 14s1.5 2 4 2 4-2 4-2|M9 9h.01|M15 9h.01',
    sparkle: 'M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z|M19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7z',
    command: 'M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z',
    sidebar: 'r3,3,18,18,2|M9 3v18',
    flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22v-7'
  };
  B.ic = function (name, size, cls) {
    const d = ICONS[name] || ICONS.grid;
    const inner = d
      .split('|')
      .map((t) => {
        if (t[0] === 'o') { const [cx, cy, r] = t.slice(1).split(','); return `<circle cx="${cx}" cy="${cy}" r="${r}"/>`; }
        if (t[0] === 'r') { const [x, y, w, h, rx] = t.slice(1).split(','); return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx || 0}"/>`; }
        return `<path d="${t}"/>`;
      })
      .join('');
    const s = size || 18;
    return `<svg class="ic ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  };

  /* ---------- Basics ---------- */
  B.$ = (s, r) => (r || document).querySelector(s);
  B.$$ = (s, r) => [...(r || document).querySelectorAll(s)];
  B.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  B.hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  B.rng = (seed) => {
    let a = typeof seed === 'string' ? B.hash(seed) : seed;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  B.today = new Date(); B.today.setHours(0, 0, 0, 0);
  B.MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  B.MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  B.DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  B.addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  B.iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  B.parse = (s) => (s instanceof Date ? s : new Date(String(s).length <= 10 ? s + 'T00:00' : s));
  B.fdate = (s) => { const d = B.parse(s); return `${String(d.getDate()).padStart(2, '0')} ${B.MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  B.fdt = (s) => { const d = B.parse(s); return `${String(d.getDate()).padStart(2, '0')} ${B.MONTHS[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  B.money = (n) => '৳ ' + Math.round(n).toLocaleString('en-IN');
  B.short = (n) => (n >= 1e7 ? (n / 1e7).toFixed(2) + ' Cr' : n >= 1e5 ? (n / 1e5).toFixed(1) + ' L' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'K' : String(n));
  B.ago = (days) => (days < 1 ? 'today' : days === 1 ? '1 d' : days < 30 ? days + ' d' : Math.round(days / 30) + ' mo');
  B.pad = (n, l) => String(n).padStart(l || 2, '0');
  B.cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- Avatar / pills / bits ---------- */
  B.avatar = (name, size) => {
    const h = B.hash(name || 'x') % 360;
    const ini = (name || '?').replace(/[^A-Za-z\s]/g, '').split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    return `<span class="av" style="--h:${h};--s:${size || 32}px">${ini}</span>`;
  };
  B.avstack = (names, size) => `<span class="avstack">${names.map((n) => B.avatar(n, size || 26)).join('')}</span>`;
  const PILL = [
    ['bad', /^(extreme late|rejected|cancelled|absent|left|closed|failed|expired|overdue|terminated|declined|invalid|no|inactive|archived|deduction|out|returned|not accepted)$/i],
    ['ok', /^(approved|active|present|paid|completed|submitted|hired|accepted|verified|resolved|finalized|done|selected|cleared|passed|sent|yes|enabled|open & approved|filled|sanctioned|disbursed|replied|earning|in|on time|running)$/i],
    ['warn', /^(pending|draft|scheduled|in process|in progress|under review|on leave|half day|late|partially|awaiting|processing|on hold|hold|unpaid|planned|ongoing|queued|not started|withheld|investigated)/i],
    ['info', /^(open|work from home|upcoming|claimed|not saved)$/i]
  ];
  B.pillClass = (t) => { for (const [c, re] of PILL) if (re.test(String(t).trim())) return c; return 'mute'; };
  B.pill = (t, cls) => `<span class="pill ${cls || B.pillClass(t)}"><i></i>${B.esc(t)}</span>`;
  B.prog = (p, label) => `<span class="prog-wrap"><span class="prog"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></span><em>${label != null ? label : Math.round(p) + '%'}</em></span>`;
  B.stars = (v, editable, key) => {
    let s = `<span class="stars${editable ? ' edit' : ''}" ${key ? `data-key="${key}"` : ''}>`;
    for (let i = 1; i <= 5; i++) s += `<b class="${v >= i - 0.25 ? 'on' : v >= i - 0.75 ? 'half' : ''}" ${editable ? `data-act="star" data-v="${i}"` : ''}>★</b>`;
    return s + '</span>';
  };
  B.kbd = (t) => `<kbd>${t}</kbd>`;

  /* ---------- Charts (HTML/CSS/SVG, all responsive, colours via CSS vars) ---------- */
  B.COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)'];
  B.hbars = (data, o) => {
    o = o || {};
    const max = Math.max(...data.map((d) => d.value), 1);
    return `<div class="hbars">${data.map((d, i) => `<div class="hb"><span class="hb-l">${B.esc(d.label)}</span><span class="hb-t"><i style="width:${(d.value / max) * 100}%;background:${d.color || o.color || B.COLORS[o.multi ? i % 6 : 0]}"></i></span><b>${o.fmt ? o.fmt(d.value) : d.value}</b></div>`).join('')}</div>`;
  };
  B.vbars = (data, o) => {
    o = o || {};
    const max = Math.max(...data.map((d) => (d.stack ? d.stack.reduce((a, b) => a + b, 0) : d.value)), 1);
    return `<div class="vbars" style="height:${o.h || 200}px">${data
      .map((d, i) => {
        const tip = `${d.label}: ${o.fmt ? o.fmt(d.value != null ? d.value : d.stack.reduce((a, b) => a + b, 0)) : d.value}`;
        const inner = d.stack
          ? d.stack.map((s, j) => `<i style="height:${(s / max) * 100}%;background:${B.COLORS[j % 6]}"></i>`).join('')
          : `<i style="height:${(d.value / max) * 100}%;background:${d.color || (o.multi ? B.COLORS[i % 6] : 'var(--grad)')}"></i>`;
        return `<div class="vb" data-tip="${B.esc(tip)}"><div class="vb-col">${inner}</div><span>${B.esc(d.label)}</span></div>`;
      })
      .join('')}</div>`;
  };
  B.donut = (data, o) => {
    o = o || {};
    const R = 54, C = 2 * Math.PI * R, total = data.reduce((a, d) => a + d.value, 0) || 1;
    let off = 0;
    const segs = data.map((d, i) => {
      const len = (d.value / total) * C, gap = data.length > 1 ? 3 : 0;
      const s = `<circle cx="70" cy="70" r="${R}" fill="none" stroke="${d.color || B.COLORS[i % 6]}" stroke-width="15" stroke-dasharray="${Math.max(len - gap, 0.5)} ${C}" stroke-dashoffset="${-off}" stroke-linecap="butt"/>`;
      off += len; return s;
    }).join('');
    return `<div class="donut"><div class="donut-svg"><svg viewBox="0 0 140 140"><circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="15"/><g transform="rotate(-90 70 70)">${segs}</g></svg><div class="donut-c"><b>${o.center != null ? o.center : total}</b><span>${o.label || 'Total'}</span></div></div>
      <ul class="legend">${data.map((d, i) => `<li><i style="background:${d.color || B.COLORS[i % 6]}"></i><span>${B.esc(d.label)}</span><b>${o.fmt ? o.fmt(d.value) : d.value}</b></li>`).join('')}</ul></div>`;
  };
  let areaId = 0;
  B.area = (series, labels, o) => {
    o = o || {};
    const n = labels.length, W = 100, H = 50;
    const all = series.flatMap((s) => s.data);
    const max = Math.max(...all) * 1.12, min = Math.min(0, ...all);
    const X = (i) => (i / (n - 1)) * W, Y = (v) => H - 4 - ((v - min) / (max - min || 1)) * (H - 10);
    const id = 'ag' + ++areaId;
    let paths = '';
    series.forEach((s, k) => {
      const col = s.color || B.COLORS[k % 6];
      let d = `M${X(0)},${Y(s.data[0])}`;
      for (let i = 1; i < n; i++) { const cx = (X(i - 1) + X(i)) / 2; d += ` C${cx},${Y(s.data[i - 1])} ${cx},${Y(s.data[i])} ${X(i)},${Y(s.data[i])}`; }
      paths += `<defs><linearGradient id="${id}-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".28"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>`;
      if (s.fill !== false) paths += `<path d="${d} L${W},${H} L0,${H} Z" fill="url(#${id}-${k})"/>`;
      paths += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round"/>`;
    });
    const grid = [0, 1, 2, 3].map((k) => `<line x1="0" x2="${W}" y1="${4 + (k * (H - 10)) / 3}" y2="${4 + (k * (H - 10)) / 3}" class="gl" vector-effect="non-scaling-stroke"/>`).join('');
    const step = Math.ceil(n / (o.ticks || 8));
    return `<div class="area-wrap"><div class="area" style="height:${o.h || 210}px"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${paths}</svg>
      <div class="hcols">${labels.map((l, i) => `<div data-tip="${B.esc(l + '\n' + series.map((s) => (series.length > 1 ? s.name + ': ' : '') + (o.fmt ? o.fmt(s.data[i]) : s.data[i])).join('\n'))}"></div>`).join('')}</div></div>
      <div class="xlab">${labels.map((l, i) => `<span>${i % step === 0 ? B.esc(l) : ''}</span>`).join('')}</div></div>`;
  };
  B.spark = (data, color) => {
    const max = Math.max(...data), min = Math.min(...data), n = data.length;
    const pts = data.map((v, i) => `${(i / (n - 1)) * 100},${26 - ((v - min) / (max - min || 1)) * 22}`).join(' ');
    return `<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${color || 'var(--accent)'}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  };
  B.ring = (pct, size, label, sub, color) => {
    const R = 42, C = 2 * Math.PI * R;
    return `<div class="ring" style="--rs:${size || 96}px"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="9"/><circle cx="50" cy="50" r="${R}" fill="none" stroke="${color || 'var(--accent)'}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(pct / 100) * C} ${C}" transform="rotate(-90 50 50)"/></svg><div><b>${label}</b>${sub ? `<span>${sub}</span>` : ''}</div></div>`;
  };
  B.heat = (levels) => `<div class="heat">${levels.map((l) => `<i class="h${l}"></i>`).join('')}</div>`;

  /* ---------- Toast / modal / dropdown ---------- */
  B.toast = (msg, type) => {
    const t = document.createElement('div');
    t.className = 'toast ' + (type || 'ok');
    t.innerHTML = `${B.ic(type === 'bad' ? 'alert' : 'check-circle', 18)}<span>${msg}</span>`;
    B.$('#toasts').appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, 2800);
  };
  B.modal = (o) => {
    B.closeModal();
    const el = document.createElement('div');
    el.className = 'modal-back';
    el.innerHTML = `<div class="modal ${o.wide ? 'wide' : ''}" role="dialog" aria-modal="true"><div class="modal-h"><h3>${o.title}</h3><button class="icon-btn" data-act="close-modal" aria-label="Close">${B.ic('x')}</button></div><div class="modal-b">${o.body}</div>${o.foot ? `<div class="modal-f">${o.foot}</div>` : ''}</div>`;
    el.addEventListener('mousedown', (e) => { if (e.target === el) B.closeModal(); });
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    return el;
  };
  B.closeModal = () => B.$$('.modal-back').forEach((m) => m.remove());

  /* ---------- Event delegation ---------- */
  B.act = {}; B.inp = {}; B.chg = {};
  const closeDD = (except) => B.$$('.dd.open').forEach((d) => { if (d !== except) d.classList.remove('open'); });
  document.addEventListener('click', (e) => {
    const dd = e.target.closest('.dd');
    closeDD(dd);
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const fn = B.act[t.dataset.act];
    if (fn) fn(t, e);
  });
  document.addEventListener('input', (e) => { const t = e.target.closest('[data-inp]'); if (t && B.inp[t.dataset.inp]) B.inp[t.dataset.inp](t, e); });
  document.addEventListener('change', (e) => { const t = e.target.closest('[data-chg]'); if (t && B.chg[t.dataset.chg]) B.chg[t.dataset.chg](t, e); });
  B.act['close-modal'] = () => B.closeModal();
  B.act.dd = (t) => { const d = t.closest('.dd'); const was = d.classList.contains('open'); closeDD(); if (!was) d.classList.add('open'); };
  B.act.toast = (t) => B.toast(t.dataset.msg || 'Done');
  B.act.star = (t) => { const wrap = t.closest('.stars'); const v = +t.dataset.v; B.$$('b', wrap).forEach((b, i) => b.classList.toggle('on', i < v)); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { B.closeModal(); closeDD(); } });

  B.mounts = [];
  B.onMount = (fn) => B.mounts.push(fn);
  B.runMounts = () => { const m = B.mounts.splice(0); m.forEach((f) => f()); };
  B.dd = (btn, menu, cls) => `<div class="dd ${cls || ''}">${btn}<div class="dd-menu">${menu}</div></div>`;
})();
