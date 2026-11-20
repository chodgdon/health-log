/* Vet Health Log — private, on-device symptom diary for VA claims.
   All data is stored in this phone's browser storage (localStorage). Nothing is sent anywhere. */
'use strict';

const APP_NAME = 'Vet Health Log';
const APP_VERSION = '1.2.0';
const STORE_KEY = 'vhl-data-v1';
const RELOCK_MS = 3 * 60 * 1000;

/* ---------- Condition catalog ---------- */
const CATALOG = [
  { id: 'back',   name: 'Back / Neck',            icon: '🦴' },
  { id: 'knees',  name: 'Knees',                  icon: '🦵' },
  { id: 'head',   name: 'Headaches / Migraines',  icon: '🤕' },
  { id: 'gi',     name: 'Stomach / GI',           icon: '🤢' },
  { id: 'mental', name: 'Mental Health',          icon: '🧠' },
  { id: 'sleep',  name: 'Sleep / Sleep Apnea',    icon: '😴' },
  { id: 'ears',   name: 'Tinnitus / Hearing',     icon: '👂' },
  { id: 'joints', name: 'Shoulders / Hips / Joints', icon: '💪' },
  { id: 'feet',   name: 'Feet / Ankles',          icon: '🦶' },
];

const SIDE = ['Left', 'Right', 'Both'];
/* Condition-specific questions. t: check | choice | multi | num */
const FIELDS = {
  back: [
    { k: 'where',   t: 'multi', l: 'Where does it hurt?', s: 'Where', opts: ['Neck', 'Upper back', 'Middle back', 'Lower back', 'Left side', 'Right side', 'Tailbone'] },
    { k: 'radiate', t: 'check', l: 'Pain shot down legs or arms' },
    { k: 'numb',    t: 'check', l: 'Numbness or tingling' },
    { k: 'bend',    t: 'check', l: 'Trouble bending, lifting, or twisting' },
    { k: 'stiff',   t: 'check', l: 'Stiffness or muscle spasms' },
    { k: 'sit',     t: 'check', l: 'Could not sit or stand very long' },
  ],
  knees: [
    { k: 'side',    t: 'choice', l: 'Which knee', opts: SIDE },
    { k: 'where',   t: 'multi', l: 'Where on the knee?', s: 'Where', opts: ['Front / kneecap', 'Inside', 'Outside', 'Back of knee'] },
    { k: 'giveway', t: 'check', l: 'Knee gave way / felt unstable' },
    { k: 'swell',   t: 'check', l: 'Swelling' },
    { k: 'lock',    t: 'check', l: 'Locking or catching' },
    { k: 'stairs',  t: 'check', l: 'Trouble with stairs, kneeling, or squatting' },
    { k: 'brace',   t: 'check', l: 'Used a brace, cane, or walker' },
  ],
  head: [
    { k: 'where',  t: 'multi', l: 'Where is the pain?', s: 'Where', opts: ['Front / forehead', 'Top', 'Back of head', 'Left side', 'Right side', 'Temples', 'Behind the eyes', 'Whole head'] },
    { k: 'count',  t: 'num', l: 'How many headaches today?', s: 'Headaches', max: 20 },
    { k: 'hours',  t: 'num', l: 'How many hours did it last?', s: 'Lasted (hrs)', max: 24, step: 0.5 },
    { k: 'light',  t: 'check', l: 'Sensitive to light or sound' },
    { k: 'nausea', t: 'check', l: 'Nausea or vomiting' },
    { k: 'aura',   t: 'check', l: 'Vision changes / aura' },
    { k: 'dark',   t: 'check', l: 'Had to be in a dark, quiet room' },
  ],
  gi: [
    { k: 'where', t: 'multi', l: 'Where is the pain?', s: 'Where', opts: ['Upper stomach', 'Lower stomach', 'Left side', 'Right side', 'All over'] },
    { k: 'episodes', t: 'num', l: 'Number of episodes / urgent bathroom trips', s: 'Episodes', max: 40 },
    { k: 'sx', t: 'multi', l: 'Symptoms', opts: ['Diarrhea', 'Constipation', 'Nausea', 'Vomiting', 'Heartburn / reflux', 'Cramping / pain', 'Bloating', 'Accident / could not make it'] },
  ],
  mental: [
    { k: 'sx', t: 'multi', l: 'What did you experience today?', opts: ['Depressed / hopeless', 'Anxious / on edge', 'Panic attack', 'Nightmares', 'Flashbacks', 'Anger / irritability', 'Trouble concentrating', 'Memory problems', 'Avoided people or places', 'Hypervigilant / felt unsafe', 'Trouble sleeping', 'No motivation / energy', 'Isolated from family or friends', 'Conflict at home or work'] },
    { k: 'panics', t: 'num', l: 'Number of panic attacks', s: 'Panic attacks', max: 30 },
    { k: 'selfharm', t: 'check', l: 'Thoughts of hurting myself' },
  ],
  sleep: [
    { k: 'hours', t: 'num', l: 'Hours of sleep', s: 'Hours slept', max: 24, step: 0.5 },
    { k: 'wakes', t: 'num', l: 'Times woke up during the night', s: 'Times woke up', max: 30 },
    { k: 'nightmare', t: 'check', l: 'Nightmares' },
    { k: 'cpap',  t: 'check', l: 'Used CPAP / breathing machine' },
    { k: 'tired', t: 'check', l: 'Very tired or dozed off during the day' },
    { k: 'gasp',  t: 'check', l: 'Woke up gasping or choking' },
  ],
  ears: [
    { k: 'side',  t: 'choice', l: 'Which ear', opts: SIDE },
    { k: 'hear',  t: 'check', l: 'Trouble following conversations' },
    { k: 'repeat', t: 'check', l: 'Asked people to repeat themselves' },
    { k: 'loud',  t: 'check', l: 'Needed TV or phone turned up loud' },
    { k: 'awake', t: 'check', l: 'Ringing kept me awake' },
  ],
  joints: [
    { k: 'where', t: 'multi', l: 'Where?', s: 'Where', opts: ['Left shoulder', 'Right shoulder', 'Left hip', 'Right hip', 'Left elbow', 'Right elbow', 'Left wrist / hand', 'Right wrist / hand', 'Other'] },
    { k: 'overhead', t: 'check', l: 'Could not raise arm overhead / reach' },
    { k: 'motion', t: 'check', l: 'Limited movement or stiffness' },
    { k: 'swell',  t: 'check', l: 'Swelling' },
    { k: 'pop',    t: 'check', l: 'Popping, grinding, or slipping out' },
    { k: 'grip',   t: 'check', l: 'Weak grip / dropped things' },
  ],
  feet: [
    { k: 'side', t: 'choice', l: 'Which side', opts: SIDE },
    { k: 'where', t: 'multi', l: 'Where on the foot?', s: 'Where', opts: ['Heel', 'Arch', 'Ball of foot', 'Toes', 'Top of foot', 'Ankle'] },
    { k: 'standmin', t: 'num', l: 'Minutes you could stand or walk before stopping', s: 'Could stand/walk (min)', max: 600, step: 5 },
    { k: 'morning', t: 'check', l: 'Bad pain with first steps in the morning' },
    { k: 'swell', t: 'check', l: 'Swelling' },
    { k: 'inserts', t: 'check', l: 'Used inserts, brace, or special shoes' },
    { k: 'limp', t: 'check', l: 'Limped or changed how I walked' },
  ],
};
/* Icons for conditions people add themselves: matched from the name, changeable in Settings */
const ICON_RULES = [
  [/\b(ed|erectile|sexual|impoten\w*|prostat\w*|testic\w*|penis|libido)\b/i, '♂️'],
  [/\b(gyn\w*|menstr\w*|uter\w*|ovar\w*|pelvic floor|endometri\w*|breast)\b/i, '♀️'],
  [/\b(bladder|urin\w*|incontinen\w*|kidney|renal)\b/i, '💧'],
  [/\b(hand|hands|wrist|wrists|finger|fingers|thumb|carpal|grip)\b/i, '✋'],
  [/\b(leg|legs|thigh|calf|calves|shin|shins|sciatica|hamstring|radiculopathy)\b/i, '🦵'],
  [/\b(foot|feet|toe|toes|ankle|ankles|heel|plantar|bunion)\b/i, '🦶'],
  [/\b(knee|knees|patella\w*|meniscus|acl)\b/i, '🦵'],
  [/\b(arm|arms|elbow|elbows|shoulder|shoulders|rotator|bicep\w*|tricep\w*)\b/i, '💪'],
  [/\b(back|spine|spinal|neck|cervical|lumbar|disc|disk|hip|hips|pelvis|arthritis|bone|bones|fibromyalgia)\b/i, '🦴'],
  [/\b(eye|eyes|vision|sight|glaucoma|cataract\w*|retina\w*)\b/i, '👁️'],
  [/\b(ear|ears|hearing|tinnitus|vertigo|dizz\w*|meniere\w*)\b/i, '👂'],
  [/\b(tooth|teeth|dental|jaw|tmj|gum|gums)\b/i, '🦷'],
  [/\b(lung|lungs|asthma|breath\w*|copd|respirat\w*|burn pits?|bronch\w*|emphysema|cough)\b/i, '🫁'],
  [/\b(heart|cardi\w*|hypertension|blood pressure|bp|chest|arrhythmia|afib)\b/i, '❤️'],
  [/\b(diabet\w*|blood sugar|glucose|insulin|anemia|blood)\b/i, '🩸'],
  [/\b(skin|rash|rashes|eczema|psoria\w*|acne|scar|scars|derma\w*|hives|chloracne|sores?|wounds?|burns?)\b/i, '🩹'],
  [/\b(nerve|nerves|neuropath\w*|numb\w*|tingl\w*|neuralgia)\b/i, '⚡'],
  [/\b(sinus\w*|allerg\w*|rhinitis|nasal|nose)\b/i, '🤧'],
  [/\b(tbi|brain|concussion|memory|ptsd|anxiety|depress\w*|mental|mood|bipolar|stress)\b/i, '🧠'],
  [/\b(sleep|apnea|insomnia|nightmares?)\b/i, '😴'],
  [/\b(stomach|gerd|ibs|reflux|bowel|gastr\w*|colon|digest\w*|crohn\w*|liver|gallbladder|hernia)\b/i, '🤢'],
  [/\b(head|headaches?|migraines?)\b/i, '🤕'],
  [/\b(fatigue|tired|energy|gulf war)\b/i, '🥱'],
  [/\b(cancer|tumou?r|lymphoma|leukemia|melanoma)\b/i, '🎗️'],
  [/\b(fever|infection|thyroid|hormones?)\b/i, '🌡️'],
];
const ICON_CHOICES = ['🦴', '🦵', '🦶', '💪', '✋', '🤕', '🧠', '👁️', '👂', '🦷', '🫁', '❤️', '🩸', '🤢', '🩹', '⚡', '🤧', '😴', '🥱', '♂️', '♀️', '💧', '🎗️', '🌡️', '🔥', '🩺', '💊', '🚶', '🧍', '📝'];
function guessIcon(name) { for (const [re, ic] of ICON_RULES) if (re.test(name || '')) return ic; return '📝'; }
const IMPACTS = ['Missed work', 'Left work early', 'Could not do chores', 'Could not drive', 'Cancelled plans', 'Needed help from someone', 'Doctor / ER / VA visit'];
const MED_HELP = ['Yes', 'A little', 'No'];
const CRISIS_TEL = 'tel:988';
const CRISIS_SMS = 'sms:838255';

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function pad(n) { return String(n).padStart(2, '0'); }
function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseYmd(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function todayStr() { return ymd(new Date()); }
function addDays(s, n) { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
function daysBetween(a, b) { return Math.round((parseYmd(b) - parseYmd(a)) / 86400000); }
function fmtLong(s) { return parseYmd(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); }
function fmtShort(s) { const d = parseYmd(s); return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`; }
function fmtMonth(ym) { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }); }
function sevWord(v) { if (v == null) return 'Not set'; if (v === 0) return 'None'; if (v <= 3) return 'Mild'; if (v <= 6) return 'Moderate'; if (v <= 8) return 'Severe'; return 'Worst'; }
function sevColor(v) { if (v == null) return '#8a92a3'; if (v === 0) return '#2e7d32'; if (v <= 3) return '#689f38'; if (v <= 6) return '#c78a00'; if (v <= 8) return '#e65100'; return '#c62828'; }
function uid() { return 'c' + Math.random().toString(36).slice(2, 9); }
function isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }

/* ---------- State ---------- */
function freshState() {
  return {
    v: 1,
    profile: { name: '' },
    conditions: CATALOG.map(c => ({ id: c.id, name: c.name, icon: c.icon, on: false, custom: false })),
    entries: {},
    meds: [],                    // "My medications"
    custom: { sx: {}, imp: [] }, // saved write-ins: symptoms per condition, daily-life effects
    settings: { onboarded: false, bigText: false, pinHash: null, pinSalt: null, lastBackup: null, backupSnooze: null, installDismissed: false, compact: true, reminderTime: '20:00' },
  };
}
let S = load();
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return freshState();
    const s = JSON.parse(raw);
    const base = freshState();
    s.settings = Object.assign(base.settings, s.settings || {});
    s.profile = Object.assign(base.profile, s.profile || {});
    s.entries = s.entries || {};
    // add any new catalog conditions that older data lacks
    s.conditions = s.conditions || [];
    for (const c of base.conditions) if (!s.conditions.find(x => x.id === c.id)) s.conditions.push(c);
    for (const c of s.conditions) if (c.custom && (!c.icon || c.icon === '📝')) c.icon = guessIcon(c.name);
    s.meds = Array.isArray(s.meds) ? s.meds : [];
    s.custom = Object.assign({ sx: {}, imp: [] }, s.custom || {});
    // v1.0 stored one medication as text; convert to the list format
    for (const d in s.entries) for (const cid in s.entries[d]) {
      const e = s.entries[d][cid];
      if (e.med != null) {
        if (!e.meds && e.med) e.meds = [Object.assign({ n: e.med }, e.medHelp ? { h: e.medHelp } : {})];
        if (e.med && !s.meds.includes(e.med)) s.meds.push(e.med);
        delete e.med; delete e.medHelp;
      }
    }
    return s;
  } catch (e) { console.error(e); return freshState(); }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
  catch (e) { toast('Could not save — phone storage may be full. Please make a backup.'); console.error(e); }
}
function cond(id) { return S.conditions.find(c => c.id === id); }
function activeConds() { return S.conditions.filter(c => c.on); }
function getEntry(date, cid) { return S.entries[date] && S.entries[date][cid]; }
function ensureEntry(date, cid) {
  S.entries[date] = S.entries[date] || {};
  if (!S.entries[date][cid]) S.entries[date][cid] = { c: todayStr() };
  return S.entries[date][cid];
}
function setPath(obj, path, val) {
  const parts = path.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) { o[parts[i]] = o[parts[i]] || {}; o = o[parts[i]]; }
  const last = parts[parts.length - 1];
  if (val === undefined || val === '' || val === false || (Array.isArray(val) && !val.length)) delete o[last];
  else o[last] = val;
}
function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
function entriesFor(cid, from, to) {
  const out = [];
  for (const d of Object.keys(S.entries).sort()) {
    if ((from && d < from) || (to && d > to)) continue;
    const e = S.entries[d][cid];
    if (e) out.push([d, e]);
  }
  return out;
}
function totalEntryCount() { let n = 0; for (const d in S.entries) n += Object.keys(S.entries[d]).length; return n; }
function firstEntryDate() { const k = Object.keys(S.entries).sort(); return k[0] || null; }

/* ---------- UI state ---------- */
let tab = 'today';
let curDate = todayStr();
const expanded = new Set();
let histCond = null, histRange = 30;
let iconPickFor = null;
let deferredInstall = null;
let unlocked = false;
let hiddenAt = 0;

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
}

/* ---------- Shell ---------- */
function applyPrefs() {
  const root = document.documentElement;
  root.classList.toggle('big', !!S.settings.bigText);
  root.classList.toggle('compact', S.settings.compact !== false);
  const theme = S.settings.theme || 'auto';
  if (theme === 'auto') delete root.dataset.theme; else root.dataset.theme = theme;
}

function render() {
  applyPrefs();
  const app = $('#app');
  if (!S.settings.onboarded) { app.innerHTML = renderWelcome(); return; }
  const titles = { today: 'Daily Log', history: 'History', report: 'Reports & Export', settings: 'Settings' };
  app.innerHTML = `
    <header class="topbar">
      <h1>${esc(titles[tab])}</h1>
      <div class="sub">${esc(APP_NAME)} · private, stays on this phone</div>
      ${tab === 'today' ? dateNav() : ''}
    </header>
    <main id="main">${tab === 'today' ? renderToday() : tab === 'history' ? renderHistory() : tab === 'report' ? renderReport() : renderSettings()}</main>
    <nav class="tabs" aria-label="Main">
      ${tabBtn('today', '📝', 'Log')}
      ${tabBtn('history', '📈', 'History')}
      ${tabBtn('report', '📄', 'Reports')}
      ${tabBtn('settings', '⚙️', 'Settings')}
    </nav>`;
  if (tab === 'settings') renderQR();
}
function tabBtn(id, icon, label) {
  return `<button data-tab="${id}" ${tab === id ? 'aria-current="page"' : ''}><span class="ti" aria-hidden="true">${icon}</span>${label}</button>`;
}
function dateNav() {
  const t = todayStr();
  const label = curDate === t ? `Today · ${fmtLong(curDate)}` : curDate === addDays(t, -1) ? `Yesterday · ${fmtLong(curDate)}` : fmtLong(curDate);
  return `<div class="datenav">
    <button class="arrow" data-act="prevday" aria-label="Previous day">‹</button>
    <label class="datebtn"><span>${esc(label)}</span><input type="date" id="datepick" value="${curDate}" max="${t}" aria-label="Pick a date"></label>
    <button class="arrow" data-act="nextday" aria-label="Next day" ${curDate >= t ? 'disabled' : ''}>›</button>
  </div>`;
}

/* ---------- Welcome / onboarding ---------- */
function renderWelcome() {
  return `<main style="padding-top:calc(16px + env(safe-area-inset-top))">
    <div class="welcome-hero">
      <img src="icon-192.png" alt="">
      <h1 style="margin-top:10px">${esc(APP_NAME)}</h1>
      <p>A simple daily diary of your symptoms to back up your VA disability claim.</p>
      <p class="small" style="opacity:.85">Everything you enter stays on this phone. No account, no internet needed.</p>
    </div>
    ${installTip(true)}
    <div class="card">
      <div class="field"><label for="w-name">Your name (shown on your reports — optional)</label>
      <input type="text" id="w-name" autocomplete="name" value="${esc(S.profile.name)}"></div>
      <div class="field"><div class="lbl">What do you want to track? Tap all that apply.</div>
      <div class="cond-pick">
        ${S.conditions.map(c => `<button class="chip check" data-act="wpick" data-cid="${c.id}" aria-pressed="${c.on}">${c.icon} ${esc(c.name)}</button>`).join('')}
      </div>
      <p class="small muted">You can add your own conditions later in Settings.</p></div>
      <button class="btn block" data-act="wstart" style="margin-top:14px">Get started</button>
    </div>
    <p class="small muted" style="text-align:center">Not affiliated with the VA. This is your personal log, not medical advice.</p>
  </main>`;
}
function installTip(force) {
  if (isStandalone() || (!force && S.settings.installDismissed)) return '';
  const how = isIOS()
    ? `In <b>Safari</b>, tap the <b>Share</b> button (square with ↑ arrow), then <b>Add to Home Screen</b>.<br><b>Do this first</b> — on iPhone, entries made in Safari do not carry over to the home-screen app.`
    : `In <b>Chrome</b>, tap the <b>⋮ menu</b>, then <b>Add to Home screen</b> or <b>Install app</b>.`;
  return `<div class="banner info"><b>📲 Put this app on your home screen</b><p class="small" style="margin-bottom:0">${how}</p>
    ${deferredInstall || !force ? `<div class="row">${deferredInstall ? '<button class="btn" data-act="install">Install app</button>' : ''}${force ? '' : '<button class="btn ghost small" data-act="dismissinstall">Hide</button>'}</div>` : ''}</div>`;
}

/* ---------- Today ---------- */
function renderToday() {
  const conds = activeConds();
  if (!conds.length) return `<div class="empty">No conditions turned on.<br><br><button class="btn" data-tab="settings">Choose conditions in Settings</button></div>`;
  const logged = conds.filter(c => { const e = getEntry(curDate, c.id); return e && e.sev != null; }).length;
  return `${backupBanner()}${installTip(false)}
    <div class="progress">${logged} of ${conds.length} rated for this day · slide the bar to rate 0 (none) to 10 (worst)</div>
    ${conds.map(renderCard).join('')}
    <p class="small muted" style="text-align:center">Changes save automatically.</p>`;
}
/* Severity readings. e.sev = worst of the day (used in charts & reports).
   e.log = [{t:'HH:MM', v}] readings in order, when the rating changed during the day. */
function nowHM() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fmtHM(hm) { if (!hm) return 'earlier'; const [h, m] = hm.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
function minutesSince(hm) { if (!hm) return Infinity; const [h, m] = hm.split(':').map(Number); const d = new Date(); return (d.getHours() * 60 + d.getMinutes()) - (h * 60 + m); }
function latestSev(e) { return e && e.log && e.log.length ? e.log[e.log.length - 1].v : (e && e.sev != null ? e.sev : null); }
function recalcSev(e) { if (e.log && e.log.length) e.sev = Math.max(...e.log.map(r => r.v)); if (e.log && e.log.length < 2 && !e.log[0]?.t) delete e.log; }
function timelineText(e, arrow = ' → ') { return (e.log || []).map(r => `${r.v}${r.t ? ` at ${fmtHM(r.t)}` : ''}`).join(arrow); }
const pendingChange = {}; // cid -> {from, to, t} shown under the bar until dismissed

function setSeverity(cid, v) {
  const e = ensureEntry(curDate, cid);
  const prev = latestSev(e);
  if (curDate !== todayStr()) {          // past day: just correct it
    if (e.log && e.log.length) { e.log[e.log.length - 1].v = v; recalcSev(e); } else e.sev = v;
    return;
  }
  if (prev == null) { e.sev = v; e.log = [{ t: nowHM(), v }]; return; }
  if (prev === v) return;
  if (!e.log || !e.log.length) e.log = [{ t: null, v: prev }];
  const last = e.log[e.log.length - 1];
  if (minutesSince(last.t) <= 2) {         // still adjusting the same rating
    last.v = v;
    if (pendingChange[cid]) pendingChange[cid].to = v;
    if (pendingChange[cid] && pendingChange[cid].from === v) { e.log.pop(); delete pendingChange[cid]; }
  } else {
    e.log.push({ t: nowHM(), v });
    pendingChange[cid] = { from: prev, to: v, t: nowHM() };
  }
  recalcSev(e);
}
function fixMistake(cid) {                 // the change was a correction, not a real change
  const e = getEntry(curDate, cid); const p = pendingChange[cid];
  if (!e || !p || !e.log || e.log.length < 2) { delete pendingChange[cid]; return; }
  e.log.pop(); e.log[e.log.length - 1].v = p.to; recalcSev(e); delete pendingChange[cid];
}

/* Medications: my list, with the ones used most for this condition first */
function medOptions(cid, e) {
  const count = {};
  for (const d in S.entries) { const x = S.entries[d][cid]; if (x && x.meds) for (const m of x.meds) count[m.n] = (count[m.n] || 0) + 1; }
  const list = S.meds.slice();
  for (const m of (e.meds || [])) if (!list.includes(m.n)) list.push(m.n);
  return list.sort((a, b) => (count[b] || 0) - (count[a] || 0));
}
function otherAdder(kind, label) {
  return `<button class="chip add" data-act="other" data-kind="${kind}">＋ ${label || 'Other (write in)'}</button>`;
}

function renderCard(c) {
  const e = getEntry(curDate, c.id);
  const sev = latestSev(e);
  const hasDetail = e && Object.keys(e).some(k => k !== 'c' && k !== 'sev' && k !== 'log');
  const status = sev != null ? `<span class="status ok">✓ Logged</span>` : hasDetail ? `<span class="status part">Rate severity</span>` : `<span class="status">Not logged</span>`;
  const open = expanded.has(c.id);
  const yest = !e && getEntry(addDays(curDate, -1), c.id);
  const p = pendingChange[c.id];
  return `<section class="card" data-cid="${c.id}">
    <div class="card-head"><span class="cicon" aria-hidden="true">${c.icon || '📝'}</span><h2>${esc(c.name)}</h2>${status}</div>
    <div class="sev-row">
      <input type="range" class="sev ${sev == null ? 'unset' : ''}" min="0" max="10" step="1" value="${sev ?? 0}" aria-label="${esc(c.name)} severity, 0 to 10">
      <div class="sev-val"><b style="color:${sevColor(sev)}">${sev ?? '–'}</b><span>${sevWord(sev)}</span></div>
    </div>
    <div class="scale-labels"><span>0 None</span><span>5</span><span>10 Worst</span></div>
    ${p ? `<div class="change-note" role="status"><b>${p.to > p.from ? '⬆ Got worse' : '⬇ Got better'}: ${p.from} → ${p.to} at ${fmtHM(p.t)}</b><br><span class="small">Saved as a change during the day. Only meant to correct the first rating?</span>
      <div class="row"><button class="btn small" data-act="keepchange">✓ Yes, it changed</button><button class="btn ghost small" data-act="fixmistake">Fix my mistake</button></div></div>`
      : e && e.log && e.log.length > 1 ? `<div class="timeline small">Today: ${esc(timelineText(e))} · <b>worst ${e.sev}</b></div>` : ''}
    <div class="card-actions">
      ${yest ? `<button class="btn ghost small" data-act="sameyest">↻ Same as yesterday</button>` : ''}
      ${sev == null ? `<button class="btn ghost small" data-act="nosx">No symptoms (0)</button>` : ''}
      <button class="btn secondary small" data-act="toggle" aria-expanded="${open}">${open ? 'Hide details ▴' : 'More details ▾'}</button>
    </div>
    ${c.id === 'mental' ? crisisLine(e) : ''}
    ${open ? `<div class="details">${renderDetails(c, e || {})}</div>` : ''}
  </section>`;
}
function crisisLine(e) {
  if (e && e.x && e.x.selfharm) {
    return `<div class="crisis-alert" role="alert"><b>You don't have to handle this alone.</b>
      <p class="small" style="margin-bottom:0">Veterans Crisis Line — free, confidential, 24/7. You don't need to be enrolled in VA.</p>
      <div class="row"><a class="btn danger" href="${CRISIS_TEL}">Call 988, press 1</a><a class="btn ghost" href="${CRISIS_SMS}">Text 838255</a></div></div>`;
  }
  return `<div class="crisis">Need to talk now? Veterans Crisis Line: <a href="${CRISIS_TEL}">call 988, press 1</a> or <a href="${CRISIS_SMS}">text 838255</a>.</div>`;
}
function renderDetails(c, e) {
  const x = e.x || {};
  const specific = (FIELDS[c.id] || []).map(f => renderField(f, x, 'x.')).join('');
  const mine = S.custom.sx[c.id] || [];
  const otherRow = `<div class="field"><div class="lbl">${mine.length ? 'Your own items' : 'Something not listed?'}</div><div class="chips">
      ${mine.map(o => `<button class="chip check" data-f="x.other" data-multi="${esc(o)}" aria-pressed="${(x.other || []).includes(o)}">${esc(o)}</button>`).join('')}
      ${otherAdder('sx')}</div></div>`;
  const isHead = c.id === 'head';
  const meds = medOptions(c.id, e);
  const taken = e.meds || [];
  return `
    <div class="subhead">About this condition</div>${specific}${otherRow}
    <div class="subhead">Flare-ups</div>
    ${yesNo('flare', 'Did you have a flare-up (worse than usual)?', e.flare)}
    ${yesNo('lay', isHead ? 'Did you have to stop everything and lie down? (prostrating attack)' : 'Did you have to stop and lie down or rest?', e.lay)}
    ${e.lay === true ? numField({ k: 'layHrs', l: 'About how many hours?', max: 24, step: 0.5 }, e.layHrs, '') : ''}
    <div class="subhead">Effect on work & daily life</div>
    <div class="field"><div class="chips">
      ${IMPACTS.concat(S.custom.imp).map(i => `<button class="chip check" data-f="imp" data-multi="${esc(i)}" aria-pressed="${(e.imp || []).includes(i)}">${esc(i)}</button>`).join('')}
      ${otherAdder('imp')}
    </div></div>
    <div class="subhead">Medication</div>
    <div class="field"><div class="lbl">What did you take? Tap all that apply.</div><div class="chips">
      ${meds.map(m => `<button class="chip check" data-act="med" data-v="${esc(m)}" aria-pressed="${taken.some(t => t.n === m)}">${esc(m)}</button>`).join('')}
      ${otherAdder('med', meds.length ? 'Other medication' : 'Add a medication')}
    </div>${meds.length ? '' : '<p class="small muted">Tip: list the medications you use in Settings → My medications, then just tap them here.</p>'}</div>
    ${taken.map((m, i) => `<div class="field"><div class="lbl">Did ${esc(m.n)} help?</div><div class="chips">
      ${MED_HELP.map(o => `<button class="chip" data-act="medhelp" data-i="${i}" data-v="${o}" aria-pressed="${m.h === o}">${o}</button>`).join('')}
    </div></div>`).join('')}
    <div class="subhead">Notes</div>
    <div class="field"><label for="notes-${c.id}">What happened? Triggers, what you couldn't do, appointments…</label>
      <textarea id="notes-${c.id}" data-f="notes">${esc(e.notes || '')}</textarea></div>
    ${e.c ? `<p class="small muted">Recorded ${fmtShort(e.c)}.</p>` : ''}
    <button class="btn ghost small" data-act="clearentry" style="margin-top:6px">Clear this day's entry</button>`;
}
function yesNo(k, label, val) {
  return `<div class="field"><div class="lbl">${esc(label)}</div><div class="chips">
    <button class="chip" data-f="${k}" data-bool="true" aria-pressed="${val === true}">Yes</button>
    <button class="chip" data-f="${k}" data-bool="false" aria-pressed="${val === false}">No</button></div></div>`;
}
function numField(f, val, prefix) {
  const step = f.step || 1;
  return `<div class="field"><div class="lbl">${esc(f.l)}</div><div class="stepper">
    <button data-act="step" data-f="${prefix}${f.k}" data-d="-${step}" data-max="${f.max}" aria-label="Less">−</button>
    <input type="number" inputmode="decimal" min="0" max="${f.max}" step="${step}" data-f="${prefix}${f.k}" data-num="1" value="${val ?? ''}" aria-label="${esc(f.l)}">
    <button data-act="step" data-f="${prefix}${f.k}" data-d="${step}" data-max="${f.max}" aria-label="More">+</button></div></div>`;
}
function renderField(f, x, prefix) {
  const v = x[f.k];
  if (f.t === 'check') return `<div class="field" style="margin-top:8px"><button class="chip check" data-f="${prefix}${f.k}" data-toggle="1" aria-pressed="${!!v}">${esc(f.l)}</button></div>`;
  if (f.t === 'num') return numField(f, v, prefix);
  if (f.t === 'choice') return `<div class="field"><div class="lbl">${esc(f.l)}</div><div class="chips">${f.opts.map(o => `<button class="chip" data-f="${prefix}${f.k}" data-choice="${esc(o)}" aria-pressed="${v === o}">${esc(o)}</button>`).join('')}</div></div>`;
  if (f.t === 'multi') return `<div class="field"><div class="lbl">${esc(f.l)}</div><div class="chips">${f.opts.map(o => `<button class="chip check" data-f="${prefix}${f.k}" data-multi="${esc(o)}" aria-pressed="${(v || []).includes(o)}">${esc(o)}</button>`).join('')}</div></div>`;
  return '';
}
function rerenderCard(cid) {
  const el = $(`.card[data-cid="${cid}"]`);
  if (!el) return;
  const c = cond(cid);
  const y = window.scrollY;
  el.outerHTML = renderCard(c);
  window.scrollTo(0, y);
  const prog = $('.progress');
  if (prog) {
    const conds = activeConds();
    const logged = conds.filter(c2 => { const e = getEntry(curDate, c2.id); return e && e.sev != null; }).length;
    prog.textContent = `${logged} of ${conds.length} rated for this day · slide the bar to rate 0 (none) to 10 (worst)`;
  }
}
function pruneEntry(date, cid) {
  const e = getEntry(date, cid);
  if (!e) return;
  if (e.x && !Object.keys(e.x).length) delete e.x;
  if (!Object.keys(e).some(k => k !== 'c')) { delete S.entries[date][cid]; if (!Object.keys(S.entries[date]).length) delete S.entries[date]; }
}

/* ---------- Backup banner ---------- */
function backupBanner() {
  if (!totalEntryCount()) return '';
  const now = todayStr();
  if (S.settings.backupSnooze && S.settings.backupSnooze > now) return '';
  const last = S.settings.lastBackup;
  const since = last ? daysBetween(last, now) : daysBetween(firstEntryDate(), now);
  if (since < (last ? 30 : 7)) return '';
  return `<div class="banner"><b>💾 Time for a backup</b>
    <p class="small" style="margin-bottom:0">${last ? `Your last backup was ${since} days ago.` : `You haven't made a backup yet.`} If this phone is lost or replaced, a backup file is the only way to get your log back.</p>
    <div class="row"><button class="btn" data-act="backup">Back up now</button><button class="btn ghost" data-act="snooze">Later</button></div></div>`;
}

/* ---------- History ---------- */
function renderHistory() {
  const conds = activeConds();
  if (!conds.length) return `<div class="empty">No conditions turned on.</div>`;
  if (!histCond || !conds.find(c => c.id === histCond)) histCond = conds[0].id;
  const c = cond(histCond);
  const to = todayStr();
  const from = histRange ? addDays(to, -(histRange - 1)) : (firstEntryDate() || to);
  const list = entriesFor(c.id, from, to);
  const st = computeStats(c.id, list);
  const days = Math.max(1, daysBetween(from, to) + 1);
  return `
    <div class="seg" role="group" aria-label="Condition">${conds.map(x => `<button class="chip" data-act="hcond" data-cid="${x.id}" aria-pressed="${x.id === c.id}">${x.icon || '📝'} ${esc(x.name)}</button>`).join('')}</div>
    <div class="seg" role="group" aria-label="Time range">${[[30, '30 days'], [90, '90 days'], [365, '1 year'], [0, 'All']].map(([v, l]) => `<button class="chip" data-act="hrange" data-v="${v}" aria-pressed="${histRange === v}">${l}</button>`).join('')}</div>
    <div class="card">
      <h2 style="font-size:1.05em">${esc(c.name)} — severity by day</h2>
      ${chartSVG(c.id, from, to)}
      <div class="stats">
        <div class="stat"><b>${st.days}</b><span>days logged of ${days}</span></div>
        <div class="stat"><b>${st.avg == null ? '–' : st.avg.toFixed(1)}</b><span>average severity</span></div>
        <div class="stat"><b>${st.severe}</b><span>severe days (7+)</span></div>
        <div class="stat"><b>${st.flare}</b><span>flare-ups</span></div>
        <div class="stat"><b>${st.lay}</b><span>${c.id === 'head' ? 'prostrating attacks' : 'times had to lie down'}</span></div>
        <div class="stat"><b>${st.imp['Missed work'] || 0}</b><span>missed work days</span></div>
      </div>
    </div>
    <div class="card"><h2 style="font-size:1.05em;margin-bottom:6px">Entries</h2>
      ${list.length ? list.slice().reverse().map(([d, e]) => `<button class="hist-item" data-act="gotoday" data-d="${d}" data-cid="${c.id}">
        <span class="badge" style="background:${sevColor(e.sev)}">${e.sev ?? '–'}</span>
        <span><b>${fmtLong(d)}</b><br><span class="meta">${esc(summaryLine(c.id, e, 140) || sevWord(e.sev))}</span></span></button>`).join('')
        : `<div class="empty">No entries in this time range yet.</div>`}
    </div>`;
}
function chartSVG(cid, from, to) {
  const n = daysBetween(from, to) + 1;
  const W = 600, H = 210, L = 34, B = 34, T = 10, R = 6;
  const pw = W - L - R, ph = H - T - B, bw = pw / n;
  let bars = '';
  for (let i = 0; i < n; i++) {
    const d = addDays(from, i);
    const e = getEntry(d, cid);
    if (!e || e.sev == null) continue;
    const h = Math.max(2, (e.sev / 10) * ph);
    bars += `<rect x="${(L + i * bw + bw * 0.12).toFixed(2)}" y="${(T + ph - h).toFixed(2)}" width="${Math.max(1, bw * 0.76).toFixed(2)}" height="${h.toFixed(2)}" fill="${sevColor(e.sev)}" rx="${Math.min(3, bw / 4).toFixed(1)}"/>`;
  }
  const grid = [0, 5, 10].map(v => { const y = T + ph - (v / 10) * ph; return `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="currentColor" stroke-opacity=".18"/><text x="${L - 8}" y="${y + 7}" text-anchor="end" font-size="20" fill="currentColor" fill-opacity=".6">${v}</text>`; }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Severity chart from ${fmtShort(from)} to ${fmtShort(to)}">${grid}${bars}
    <text x="${L}" y="${H - 4}" font-size="20" fill="currentColor" fill-opacity=".6">${fmtShort(from)}</text>
    <text x="${W - R}" y="${H - 4}" font-size="20" text-anchor="end" fill="currentColor" fill-opacity=".6">${fmtShort(to)}</text></svg>`;
}

/* ---------- Stats & summaries (shared with reports) ---------- */
function computeStats(cid, list) {
  const st = { days: list.length, rated: 0, sum: 0, max: null, severe: 0, flare: 0, lay: 0, layHrs: 0, imp: {}, sx: {}, medDays: 0, meds: {}, changeDays: 0, months: {}, headCount: 0 };
  const fields = FIELDS[cid] || [];
  for (const [d, e] of list) {
    const m = d.slice(0, 7);
    const mo = st.months[m] = st.months[m] || { days: 0, rated: 0, sum: 0, flare: 0, lay: 0, missed: 0, severe: 0 };
    mo.days++;
    if (e.sev != null) { st.rated++; st.sum += e.sev; st.max = Math.max(st.max ?? 0, e.sev); mo.rated++; mo.sum += e.sev; if (e.sev >= 7) { st.severe++; mo.severe++; } }
    if (e.flare) { st.flare++; mo.flare++; }
    if (e.lay) { st.lay++; mo.lay++; st.layHrs += Number(e.layHrs || 0); }
    for (const i of e.imp || []) st.imp[i] = (st.imp[i] || 0) + 1;
    if ((e.imp || []).includes('Missed work')) mo.missed++;
    if (e.meds && e.meds.length) st.medDays++;
    for (const md of e.meds || []) { const r = st.meds[md.n] = st.meds[md.n] || { days: 0, Yes: 0, 'A little': 0, No: 0 }; r.days++; if (md.h) r[md.h]++; }
    if (e.log && e.log.length > 1) st.changeDays++;
    const x = e.x || {};
    for (const f of fields) {
      if (f.t === 'check' && x[f.k]) st.sx[f.l] = (st.sx[f.l] || 0) + 1;
      if (f.t === 'multi') for (const o of x[f.k] || []) { const k = f.s === 'Where' ? `Location: ${o}` : o; st.sx[k] = (st.sx[k] || 0) + 1; }
    }
    for (const o of x.other || []) st.sx[o] = (st.sx[o] || 0) + 1;
    if (cid === 'head') st.headCount += Number(x.count || 0);
  }
  st.avg = st.rated ? st.sum / st.rated : null;
  return st;
}
function summaryLine(cid, e, maxLen) {
  const parts = [];
  const x = e.x || {};
  for (const f of FIELDS[cid] || []) {
    const v = x[f.k];
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue;
    if (f.t === 'check') parts.push(f.l);
    else if (f.t === 'choice') parts.push(`${f.l}: ${v}`);
    else if (f.t === 'multi') parts.push(f.s ? `${f.s}: ${v.join(', ')}` : v.join(', '));
    else if (f.t === 'num') parts.push(`${f.s || f.l}: ${v}`);
  }
  if (x.other && x.other.length) parts.push(x.other.join(', '));
  if (e.log && e.log.length > 1) parts.push(`Changed during day: ${timelineText(e)}`);
  if (e.flare) parts.push('Flare-up');
  if (e.lay) parts.push(`Had to lie down${e.layHrs ? ` ${e.layHrs} hrs` : ''}`);
  if (e.imp && e.imp.length) parts.push(e.imp.join(', '));
  if (e.meds && e.meds.length) parts.push(`Meds: ${e.meds.map(m => m.n + (m.h ? ` (helped: ${m.h})` : '')).join(', ')}`);
  if (e.notes) parts.push(`Notes: ${e.notes}`);
  let s = parts.join('. ');
  if (maxLen && s.length > maxLen) s = s.slice(0, maxLen - 1) + '…';
  return s;
}

/* ---------- Reports ---------- */
let rep = { conds: null, range: '90', from: '', to: '', notes: true };
function renderReport() {
  const conds = activeConds();
  if (!conds.length) return `<div class="empty">No conditions turned on.</div>`;
  if (!rep.conds) rep.conds = new Set();
  const t = todayStr();
  return `
    <div class="card">
      <h2 style="font-size:1.05em">1. Which conditions?</h2>
      <p class="small muted">Pick one for a claim about just that issue, or several. Each gets its own pages.</p>
      <div class="cond-pick">${conds.map(c => `<button class="chip check" data-act="rcond" data-cid="${c.id}" aria-pressed="${rep.conds.has(c.id)}">${c.icon || '📝'} ${esc(c.name)} <span class="muted small">(${entriesFor(c.id).length} entries)</span></button>`).join('')}</div>
      <button class="btn ghost small" data-act="rall" style="margin-top:8px">${rep.conds.size === conds.length ? 'Clear all' : 'Select all'}</button>
    </div>
    <div class="card">
      <h2 style="font-size:1.05em">2. What time period?</h2>
      <div class="chips" style="margin-top:10px">${[['30', 'Last 30 days'], ['90', 'Last 90 days'], ['180', 'Last 6 months'], ['365', 'Last year'], ['all', 'Everything'], ['custom', 'Pick dates']].map(([v, l]) => `<button class="chip" data-act="rrange" data-v="${v}" aria-pressed="${rep.range === v}">${l}</button>`).join('')}</div>
      ${rep.range === 'custom' ? `<div style="display:flex;gap:10px;margin-top:10px">
        <div class="field" style="flex:1"><label for="r-from">From</label><input type="date" id="r-from" value="${rep.from}" max="${t}"></div>
        <div class="field" style="flex:1"><label for="r-to">To</label><input type="date" id="r-to" value="${rep.to || t}" max="${t}"></div></div>` : ''}
      <div class="row-item" style="margin-top:10px"><div class="grow">Include my written notes</div>
        <label class="switch"><input type="checkbox" id="r-notes" ${rep.notes ? 'checked' : ''} aria-label="Include notes"><span></span></label></div>
    </div>
    <div class="card">
      <h2 style="font-size:1.05em">3. Create</h2>
      <button class="btn block" data-act="mkpdf" style="margin-top:10px">📄 PDF report</button>
      <button class="btn secondary block" data-act="mkcsv" style="margin-top:10px">📊 Spreadsheet (CSV)</button>
      <p class="small muted">You can then email it, save it to Files/Drive, or print it. Give the PDF to your VSO or upload it with your claim (for example with VA Form 21-4138, Statement in Support of Claim).</p>
    </div>`;
}
function reportRange() {
  const t = todayStr();
  if (rep.range === 'all') return [firstEntryDate() || t, t];
  if (rep.range === 'custom') {
    const f = rep.from || firstEntryDate() || t; const to = rep.to || t;
    return f <= to ? [f, to] : [to, f];
  }
  return [addDays(t, -(Number(rep.range) - 1)), t];
}
function selectedReportConds() {
  return activeConds().filter(c => rep.conds && rep.conds.has(c.id));
}
function fileSafe(s) { return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase(); }

async function deliverFile(blob, filename, title) {
  const file = new File([blob], filename, { type: blob.type });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return; // user closed the share sheet
    console.warn('share failed, falling back to download', e);
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  toast('Saved to your Downloads');
}

function makeCSV() {
  const conds = selectedReportConds();
  if (!conds.length) return toast('Pick at least one condition first');
  const [from, to] = reportRange();
  const head = ['Date', 'Condition', 'Severity (0-10, worst of day)', 'Severity word', 'Changes during day', 'Flare-up', 'Had to lie down', 'Lie-down hours', 'Effect on work/life', 'Medications (helped?)', 'Condition details', 'Notes', 'Date recorded'];
  const rows = [head];
  for (const c of conds) {
    for (const [d, e] of entriesFor(c.id, from, to)) {
      const detail = summaryLine(c.id, { x: e.x }, 0);
      rows.push([d, c.name, e.sev ?? '', sevWord(e.sev ?? null), e.log && e.log.length > 1 ? timelineText(e, ' -> ') : '', e.flare === true ? 'Yes' : e.flare === false ? 'No' : '', e.lay === true ? 'Yes' : e.lay === false ? 'No' : '', e.layHrs ?? '', (e.imp || []).join('; '), (e.meds || []).map(m => m.n + (m.h ? ` (${m.h})` : '')).join('; '), detail, rep.notes ? (e.notes || '') : '', e.c || '']);
    }
  }
  if (rows.length === 1) return toast('No entries for those conditions in that time period');
  const csv = '﻿' + rows.map(r => r.map(v => { const s = String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\r\n');
  const name = `symptom-log-${conds.length === 1 ? fileSafe(conds[0].name) : 'all'}-${from}-to-${to}.csv`;
  deliverFile(new Blob([csv], { type: 'text/csv' }), name, 'Symptom log spreadsheet');
}

function pdfText(s) { // keep to characters the built-in PDF font can draw
  return String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/→/g, '->').replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ]/g, '');
}
function makePDF() {
  const conds = selectedReportConds();
  if (!conds.length) return toast('Pick at least one condition first');
  if (!window.jspdf) return toast('PDF tool still loading — try again in a moment');
  const [from, to] = reportRange();
  if (!conds.some(c => entriesFor(c.id, from, to).length)) return toast('No entries for those conditions in that time period');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const PW = 612, PH = 792, M = 44, CW = PW - M * 2, BOTTOM = PH - 56;
  const navy = [20, 40, 80];
  let y = M;
  const name = S.profile.name ? pdfText(S.profile.name) : '';
  const newPage = () => { doc.addPage(); y = M; };
  const need = h => { if (y + h > BOTTOM) newPage(); };
  const text = (s, x, size = 10, style = 'normal', color = [20, 20, 20]) => { doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color); doc.text(pdfText(s), x, y); };

  conds.forEach((c, ci) => {
    if (ci > 0) newPage();
    const list = entriesFor(c.id, from, to);
    const st = computeStats(c.id, list);
    const totalDays = daysBetween(from, to) + 1;
    const months = Math.max(1, totalDays / 30.44);

    // Header band
    doc.setFillColor(...navy); doc.rect(0, 0, PW, 70, 'F');
    y = 32; text(`${c.name} - Daily Symptom Log`, M, 18, 'bold', [255, 255, 255]);
    y = 52; text(`${name ? name + '   |   ' : ''}${fmtShort(from)} to ${fmtShort(to)}   |   Created ${fmtShort(todayStr())}`, M, 10, 'normal', [230, 230, 240]);
    y = 96;

    // Summary
    text('Summary', M, 13, 'bold', navy); y += 8;
    const tiles = [
      ['Days logged', `${st.days} of ${totalDays}`],
      ['Average severity (0-10)', st.avg == null ? '-' : st.avg.toFixed(1)],
      ['Worst severity', st.max == null ? '-' : String(st.max)],
      ['Severe days (7 or higher)', String(st.severe)],
      ['Flare-ups', String(st.flare)],
      [c.id === 'head' ? 'Prostrating attacks (had to lie down)' : 'Times had to stop and lie down', `${st.lay}${st.layHrs ? ` (${+st.layHrs.toFixed(1)} hrs total)` : ''}`],
      [c.id === 'head' ? 'Prostrating attacks per month (avg)' : 'Lie-down episodes per month (avg)', (st.lay / months).toFixed(1)],
      ['Days missed work', String(st.imp['Missed work'] || 0)],
      ['Days left work early', String(st.imp['Left work early'] || 0)],
      ['Doctor / ER / VA visits', String(st.imp['Doctor / ER / VA visit'] || 0)],
    ];
    if (c.id === 'head') tiles.splice(4, 0, ['Total headaches recorded', String(st.headCount)]);
    const colW = CW / 2, rowH = 30;
    tiles.forEach((tl, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const tx = M + col * colW, ty = y + row * rowH;
      doc.setFillColor(240, 242, 247); doc.roundedRect(tx, ty, colW - 8, rowH - 6, 4, 4, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(90, 95, 110); doc.text(pdfText(tl[0]), tx + 8, ty + 10);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(20, 20, 20); doc.text(pdfText(tl[1]), tx + 8, ty + 21);
    });
    y += Math.ceil(tiles.length / 2) * rowH + 12;

    // Chart
    need(170);
    text('Severity by day', M, 13, 'bold', navy); y += 10;
    const ch = 110, cx = M + 18, cw = CW - 18, cy = y;
    doc.setDrawColor(210, 214, 222); doc.setLineWidth(0.5);
    [0, 5, 10].forEach(v => { const ly = cy + ch - (v / 10) * ch; doc.line(cx, ly, cx + cw, ly); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(110, 110, 120); doc.text(String(v), cx - 6, ly + 3, { align: 'right' }); });
    const bw = cw / totalDays;
    for (let i = 0; i < totalDays; i++) {
      const e = getEntry(addDays(from, i), c.id);
      if (!e || e.sev == null) continue;
      const h = Math.max(1.5, (e.sev / 10) * ch);
      const col = hexRgb(sevColor(e.sev));
      doc.setFillColor(...col);
      doc.rect(cx + i * bw + bw * 0.1, cy + ch - h, Math.max(0.6, bw * 0.8), h, 'F');
      if (e.lay) { doc.setFillColor(20, 40, 80); doc.circle(cx + i * bw + bw / 2, cy + ch - h - 4, Math.min(2.2, Math.max(1, bw / 2)), 'F'); }
    }
    y = cy + ch + 12;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(110, 110, 120);
    doc.text(fmtShort(from), cx, y); doc.text(fmtShort(to), cx + cw, y, { align: 'right' });
    doc.text('Dot above a bar = had to stop and lie down that day.  Blank = not logged.', cx + cw / 2, y, { align: 'center' });
    y += 20;

    // Monthly table
    const mKeys = Object.keys(st.months).sort();
    if (mKeys.length) {
      need(40 + mKeys.length * 16);
      text('Month by month', M, 13, 'bold', navy); y += 16;
      const cols = [['Month', 0], ['Days logged', 110], ['Avg severity', 190], ['Severe days', 270], ['Flare-ups', 345], [c.id === 'head' ? 'Prostrating' : 'Lay down', 410], ['Missed work', 470]];
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(90, 95, 110);
      cols.forEach(([h, x]) => doc.text(h, M + x, y));
      y += 4; doc.setDrawColor(200, 204, 212); doc.line(M, y, M + CW, y); y += 12;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(20, 20, 20);
      for (const k of mKeys) {
        need(16);
        const mo = st.months[k];
        const vals = [fmtMonth(k), String(mo.days), mo.rated ? (mo.sum / mo.rated).toFixed(1) : '-', String(mo.severe), String(mo.flare), String(mo.lay), String(mo.missed)];
        cols.forEach(([, x], i) => doc.text(pdfText(vals[i]), M + x, y));
        y += 15;
      }
      y += 8;
    }

    // Most frequent symptoms
    const sx = Object.entries(st.sx).sort((a, b) => b[1] - a[1]);
    const imp = Object.entries(st.imp).sort((a, b) => b[1] - a[1]);
    if (sx.length || imp.length) {
      need(40);
      text('How often each problem was recorded', M, 13, 'bold', navy); y += 16;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(20, 20, 20);
      for (const [label, n] of [...sx, ...imp]) {
        need(15);
        doc.text(pdfText(label), M, y); doc.text(`${n} day${n === 1 ? '' : 's'}`, M + CW, y, { align: 'right' });
        y += 14;
      }
      y += 8;
    }

    // Medications
    const medRows = Object.entries(st.meds).sort((a, b) => b[1].days - a[1].days);
    if (medRows.length) {
      need(40);
      text('Medications taken for this condition', M, 13, 'bold', navy); y += 16;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(20, 20, 20);
      for (const [name, r] of medRows) {
        need(15);
        const helped = ['Yes', 'A little', 'No'].filter(k => r[k]).map(k => `${k.toLowerCase()} ${r[k]}`).join(', ');
        doc.text(pdfText(name), M, y);
        doc.text(pdfText(`${r.days} day${r.days === 1 ? '' : 's'}${helped ? `  (helped: ${helped})` : ''}`), M + CW, y, { align: 'right' });
        y += 14;
      }
      y += 8;
    }

    // Daily entries
    need(50);
    text('Daily entries', M, 13, 'bold', navy); y += 13;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(110, 110, 120);
    doc.text('Severity is the worst rating of the day. If it changed during the day, each reading and time is listed.', M, y); y += 14;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(90, 95, 110);
    doc.text('Date', M, y); doc.text('Severity', M + 74, y); doc.text('Details', M + 130, y);
    y += 4; doc.line(M, y, M + CW, y); y += 12;
    for (const [d, e] of list) {
      const det = summaryLine(c.id, rep.notes ? e : Object.assign({}, e, { notes: '' }), 0) || '-';
      const late = e.c && daysBetween(d, e.c) > 1 ? ` [Entered ${fmtShort(e.c)}]` : '';
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
      const lines = doc.splitTextToSize(pdfText(det + late), CW - 130);
      const h = Math.max(1, lines.length) * 12 + 6;
      need(h);
      doc.setTextColor(20, 20, 20);
      doc.text(fmtShort(d), M, y);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...hexRgb(sevColor(e.sev ?? null)));
      doc.text(e.sev == null ? '-' : `${e.sev} ${sevWord(e.sev)}`, M + 74, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(20, 20, 20);
      doc.text(lines, M + 130, y);
      y += h;
      doc.setDrawColor(230, 232, 238); doc.line(M, y - 9, M + CW, y - 9);
    }
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(120, 120, 130);
    doc.text(pdfText(`Personal symptom diary kept by the veteran${name ? ` (${name})` : ''}. Entries are the veteran's own observations, not a medical record.`), M, PH - 30);
    doc.text(`Page ${i} of ${pages}`, PW - M, PH - 30, { align: 'right' });
  }
  const fname = `symptom-log-${conds.length === 1 ? fileSafe(conds[0].name) : 'multiple'}-${from}-to-${to}.pdf`;
  deliverFile(doc.output('blob'), fname, 'Symptom log report');
}
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

/* ---------- Settings ---------- */
function appUrl() { return location.origin + location.pathname.replace(/index\.html$/, ''); }
function renderSettings() {
  const last = S.settings.lastBackup;
  return `
    <div class="card">
      <h2 style="font-size:1.05em">Your info</h2>
      <div class="field"><label for="s-name">Name shown on reports</label><input type="text" id="s-name" value="${esc(S.profile.name)}" autocomplete="name"></div>
    </div>
    <div class="card">
      <h2 style="font-size:1.05em">My conditions</h2>
      <p class="small muted">Turn on what you track. Turning one off hides it but keeps its history.</p>
      <p class="small muted">Tap an icon to change it. Use ▲ ▼ to set the order on your Daily Log.</p>
      ${S.conditions.map((c, i) => `<div class="row-item cond-row">
        <button class="iconbtn" data-act="pickicon" data-cid="${c.id}" aria-label="Change icon for ${esc(c.name)}" aria-expanded="${iconPickFor === c.id}">${c.icon || '📝'}</button>
        <div class="grow">${esc(c.name)}${c.custom ? ' <span class="muted small">(yours)</span>' : ''}</div>
        <button class="mv" data-act="moveup" data-cid="${c.id}" aria-label="Move ${esc(c.name)} up" ${i === 0 ? 'disabled' : ''}>▲</button>
        <button class="mv" data-act="movedown" data-cid="${c.id}" aria-label="Move ${esc(c.name)} down" ${i === S.conditions.length - 1 ? 'disabled' : ''}>▼</button>
        <label class="switch"><input type="checkbox" data-act="togglecond" data-cid="${c.id}" ${c.on ? 'checked' : ''} aria-label="Track ${esc(c.name)}"><span></span></label></div>
        ${iconPickFor === c.id ? `<div class="iconpick"><div class="lbl small">Choose an icon for ${esc(c.name)}</div><div class="icongrid">${ICON_CHOICES.map(ic => `<button data-act="seticon" data-cid="${c.id}" data-v="${ic}" aria-pressed="${c.icon === ic}">${ic}</button>`).join('')}</div>
          ${c.custom ? `<button class="btn ghost small" data-act="delcond" data-cid="${c.id}" style="margin-top:8px;color:var(--danger)">Remove this condition</button>` : ''}</div>` : ''}`).join('')}
      <div class="field"><label for="s-newcond">Add your own (e.g. Asthma, Hypertension, ED, Hands)</label>
        <div style="display:flex;gap:8px;align-items:center"><span class="iconprev" id="newcond-icon" aria-hidden="true">📝</span><input type="text" id="s-newcond" placeholder="Condition name"><button class="btn" data-act="addcond">Add</button></div></div>
    </div>
    <div class="card">
      <h2 style="font-size:1.05em">💊 My medications</h2>
      <p class="small muted">Medications you take or use. They show as quick-tap buttons when you log any condition. Ones you write in while logging are added here automatically.</p>
      ${S.meds.map(m => `<div class="row-item"><div class="grow">${esc(m)}</div><button class="btn ghost small" data-act="delmed" data-v="${esc(m)}" aria-label="Remove ${esc(m)}">Remove</button></div>`).join('') || '<p class="small muted"><i>None yet.</i></p>'}
      <div class="field"><label for="s-newmed">Add a medication (name and dose)</label>
        <div style="display:flex;gap:8px"><input type="text" id="s-newmed" placeholder="e.g. Ibuprofen 800mg"><button class="btn" data-act="addmed">Add</button></div></div>
    </div>
    ${savedChoicesCard()}
    <div class="card">
      <h2 style="font-size:1.05em">Display</h2>
      <div class="field"><div class="lbl">Color scheme</div><div class="chips" role="group" aria-label="Color scheme">
        ${[['auto', '📱 Match phone'], ['light', '☀️ Light'], ['dark', '🌙 Dark']].map(([v, l]) => `<button class="chip" data-act="theme" data-v="${v}" aria-pressed="${(S.settings.theme || 'auto') === v}">${l}</button>`).join('')}
      </div></div>
      <div class="row-item" style="margin-top:10px"><div class="grow">Compact Daily Log<br><span class="small muted">Smaller cards, less scrolling</span></div><label class="switch"><input type="checkbox" data-act="compact" ${S.settings.compact !== false ? 'checked' : ''} aria-label="Compact Daily Log"><span></span></label></div>
      <div class="row-item"><div class="grow">Larger text</div><label class="switch"><input type="checkbox" data-act="bigtext" ${S.settings.bigText ? 'checked' : ''} aria-label="Larger text"><span></span></label></div>
    </div>
    <div class="card">
      <h2 style="font-size:1.05em">⏰ Daily reminder</h2>
      <p class="small muted">Adds a repeating event to your phone's calendar so it reminds you every day. Do this once. To stop it later, delete the event in your calendar.</p>
      <div class="field"><label for="s-remtime">Remind me at</label><input type="time" id="s-remtime" value="${esc(S.settings.reminderTime || '20:00')}"></div>
      <button class="btn block" data-act="remind-ics" style="margin-top:10px">${isIOS() ? '📅 Add to iPhone Calendar' : '📅 Add to my calendar'}</button>
      <button class="btn secondary block" data-act="remind-google" style="margin-top:10px">Add to Google Calendar</button>
      <p class="small muted">${isIOS() ? 'iPhone: tap <b>Add All</b> on the screen that opens.' : 'Android: open the downloaded file with your Calendar app, or use the Google Calendar button.'}</p>
    </div>
    <div class="card">
      <h2 style="font-size:1.05em">🔒 PIN lock</h2>
      <p class="small muted">${S.settings.pinHash ? 'On. The app asks for your PIN when opened.' : 'Off. Turn on to require a 4-digit PIN to open this app.'}</p>
      ${S.settings.pinHash
        ? `<div class="card-actions"><button class="btn secondary" data-act="changepin">Change PIN</button><button class="btn ghost" data-act="pinoff">Turn off</button></div>`
        : `<button class="btn secondary block" data-act="setpin">Set a PIN</button>`}
    </div>
    <div class="card">
      <h2 style="font-size:1.05em">💾 Backup & restore</h2>
      <p class="small muted">Your log lives only on this phone. Save a backup file and email it to yourself or put it in Google Drive / iCloud. Use it to move to a new phone.<br>Last backup: <b>${last ? fmtLong(last) : 'never'}</b></p>
      <button class="btn block" data-act="backup">Save backup file</button>
      <label class="btn secondary block" style="margin-top:10px;text-align:center;line-height:28px">Restore from backup file<input type="file" id="restore" accept=".json,application/json" class="hidden"></label>
    </div>
    <div class="card">
      <h2 style="font-size:1.05em">🇺🇸 Share this app with a fellow veteran</h2>
      <p class="small muted">Have them scan this code with their phone camera. They get their own private copy — your entries are never shared.</p>
      <div class="qr" id="qr"></div>
      <p class="small" style="text-align:center;word-break:break-all">${esc(appUrl())}</p>
      ${navigator.share ? `<button class="btn secondary block" data-act="shareapp">Send the link</button>` : ''}
    </div>
    <div class="card">
      <h2 style="font-size:1.05em">Tips for VA claims</h2>
      <ul class="small" style="padding-left:20px;margin:8px 0">
        <li>Log every day if you can — even "0" days. Consistent records carry more weight.</li>
        <li>Write down how symptoms affect work and daily life in your own words.</li>
        <li>For headaches, note when you had to stop and lie down (prostrating attacks) and how long.</li>
        <li>Note flare-ups: what you couldn't do and how long it lasted.</li>
        <li>Talk to a Veterans Service Officer (VSO) at your Post about how to submit your log.</li>
      </ul>
    </div>
    <div class="card">
      <h2 style="font-size:1.05em">Need to talk?</h2>
      <p class="small">Veterans Crisis Line — free, confidential, 24/7.</p>
      <div class="card-actions"><a class="btn danger" href="${CRISIS_TEL}" style="text-align:center;text-decoration:none">Call 988, press 1</a><a class="btn ghost" href="${CRISIS_SMS}" style="text-align:center;text-decoration:none">Text 838255</a></div>
    </div>
    <div class="card">
      <h2 style="font-size:1.05em">About</h2>
      <p class="small muted">${esc(APP_NAME)} v${APP_VERSION}. Your data is stored only on this device and is never sent to anyone unless you export or share it. Not affiliated with or endorsed by the Department of Veterans Affairs. Not medical advice.</p>
      <p class="small muted">${totalEntryCount()} entries saved.</p>
      <button class="btn ghost block" data-act="eraseall" style="color:var(--danger)">Erase all my data</button>
    </div>`;
}
/* ---------- Daily reminder (calendar event, no server needed) ---------- */
function reminderStart() {
  const [h, m] = (S.settings.reminderTime || '20:00').split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  const fmt = x => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
  const end = new Date(d.getTime() + 5 * 60000);
  return { start: fmt(d), end: fmt(end) };
}
const REMIND_TITLE = 'Log my symptoms (Vet Health Log)';
function reminderICS() {
  const { start } = reminderStart();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const url = appUrl();
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Vet Health Log//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:vhl-daily-reminder-${Date.now()}@vet-health-log`, `DTSTAMP:${stamp}`,
    `DTSTART:${start}`, 'DURATION:PT5M', 'RRULE:FREQ=DAILY', `SUMMARY:${REMIND_TITLE}`,
    `DESCRIPTION:Take a minute to rate today's symptoms.\\nOpen the app: ${url}`, `URL:${url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${REMIND_TITLE}`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
}
function addReminderICS() {
  const blob = new Blob([reminderICS()], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  if (isIOS()) { window.location.href = url; }          // iPhone opens its "Add to Calendar" screen
  else { const a = document.createElement('a'); a.href = url; a.download = 'daily-reminder.ics'; document.body.appendChild(a); a.click(); a.remove(); toast('Open the downloaded file to add it to your calendar'); }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function addReminderGoogle() {
  const { start, end } = reminderStart();
  const q = new URLSearchParams({ action: 'TEMPLATE', text: REMIND_TITLE, dates: `${start}/${end}`, recur: 'RRULE:FREQ=DAILY', details: `Take a minute to rate today's symptoms.\nOpen the app: ${appUrl()}` });
  window.open(`https://calendar.google.com/calendar/render?${q}`, '_blank', 'noopener');
}
function savedChoicesCard() {
  const groups = [];
  if (S.custom.imp.length) groups.push(['Effect on work & daily life', 'imp', '', S.custom.imp]);
  for (const cid in S.custom.sx) { const c = cond(cid); if (c && S.custom.sx[cid].length) groups.push([c.name, 'sx', cid, S.custom.sx[cid]]); }
  if (!groups.length) return '';
  return `<div class="card"><h2 style="font-size:1.05em">✏️ My saved write-ins</h2>
    <p class="small muted">Things you wrote in with "Other". Removing one only hides the button — past entries keep it.</p>
    ${groups.map(([title, kind, cid, list]) => `<div class="subhead">${esc(title)}</div>${list.map(v => `<div class="row-item"><div class="grow">${esc(v)}</div><button class="btn ghost small" data-act="delcustom" data-kind="${kind}" data-cid="${cid}" data-v="${esc(v)}">Remove</button></div>`).join('')}`).join('')}
  </div>`;
}
function renderQR() {
  const el = $('#qr');
  if (!el) return;
  if (!window.qrcode) { el.textContent = 'Loading…'; setTimeout(renderQR, 400); return; }
  const q = window.qrcode(0, 'M'); q.addData(appUrl()); q.make();
  el.innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true, alt: 'QR code to get this app' });
}

/* ---------- Backup ---------- */
function doBackup() {
  const data = JSON.stringify({ app: 'vet-health-log', exported: new Date().toISOString(), version: APP_VERSION, data: Object.assign({}, S, { settings: Object.assign({}, S.settings, { pinHash: null, pinSalt: null }) }) }, null, 1);
  S.settings.lastBackup = todayStr(); S.settings.backupSnooze = null; save();
  deliverFile(new Blob([data], { type: 'application/json' }), `health-log-backup-${todayStr()}.json`, 'Health log backup');
  setTimeout(render, 300);
}
function doRestore(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const j = JSON.parse(r.result);
      const d = j && j.app === 'vet-health-log' ? j.data : null;
      if (!d || typeof d.entries !== 'object' || !Array.isArray(d.conditions)) throw new Error('bad');
      let n = 0; for (const k in d.entries) n += Object.keys(d.entries[k]).length;
      if (!confirm(`Restore this backup from ${j.exported ? new Date(j.exported).toLocaleDateString() : 'unknown date'}?\nIt has ${n} entries.\n\nThis REPLACES everything currently in the app.`)) return;
      const keepPin = { pinHash: S.settings.pinHash, pinSalt: S.settings.pinSalt };
      localStorage.setItem(STORE_KEY, JSON.stringify(d));
      S = load();
      Object.assign(S.settings, keepPin, { onboarded: true, lastBackup: todayStr() });
      save(); tab = 'today'; render(); toast(`Restored ${n} entries`);
    } catch (e) { toast('That file is not a Vet Health Log backup'); }
  };
  r.readAsText(file);
}

/* ---------- PIN ---------- */
async function sha(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function pinPad({ title, sub, onDone, cancellable, forgot }) {
  const root = $('#overlay-root');
  let val = '';
  root.innerHTML = `<div class="overlay" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="inner pin-wrap">
    <img src="icon-192.png" alt="" style="width:64px;height:64px;border-radius:14px">
    <h2 style="margin-top:12px">${esc(title)}</h2><p class="muted small">${esc(sub || '')}</p>
    <div class="pin-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="pin-err" aria-live="assertive"></div>
    <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-k="${n}">${n}</button>`).join('')}
      <button class="txt" data-k="x">${cancellable ? 'Cancel' : forgot ? 'Forgot?' : ''}</button><button data-k="0">0</button><button class="txt" data-k="b" aria-label="Delete">⌫</button></div>
  </div></div>`;
  const dots = $$('.pin-dots i', root), err = $('.pin-err', root);
  const draw = () => dots.forEach((d, i) => d.classList.toggle('on', i < val.length));
  const api = { error(msg) { err.textContent = msg; val = ''; draw(); if (navigator.vibrate) navigator.vibrate(150); }, close() { root.innerHTML = ''; } };
  $('.keypad', root).addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    const k = b.dataset.k;
    if (k === 'b') { val = val.slice(0, -1); }
    else if (k === 'x') { if (cancellable) api.close(); else if (forgot) forgot(); return; }
    else if (val.length < 4) { val += k; err.textContent = ''; }
    draw();
    if (val.length === 4) { const v = val; setTimeout(() => onDone(v, api), 120); }
  });
  return api;
}
function setPinFlow() {
  pinPad({
    title: 'Choose a 4-digit PIN', sub: "Pick something you'll remember. There is no way to recover a forgotten PIN.", cancellable: true,
    onDone(first, api) {
      api.close();
      pinPad({
        title: 'Enter it again', cancellable: true,
        async onDone(second, api2) {
          if (second !== first) { api2.error("PINs didn't match. Try again."); return; }
          const salt = uid() + uid();
          S.settings.pinSalt = salt; S.settings.pinHash = await sha(salt + second); save();
          api2.close(); render(); toast('PIN is on');
        },
      });
    },
  });
}
function checkPin(onOk, opts = {}) {
  pinPad({
    title: opts.title || 'Enter your PIN', sub: opts.sub || '', cancellable: !!opts.cancellable,
    forgot: opts.cancellable ? null : forgotPin,
    async onDone(v, api) {
      if (await sha(S.settings.pinSalt + v) === S.settings.pinHash) { api.close(); onOk(); }
      else api.error('Wrong PIN');
    },
  });
}
function forgotPin() {
  if (!confirm('There is no way to recover a forgotten PIN.\n\nYou can ERASE all data in this app and start over, then restore from a backup file if you have one.\n\nErase everything?')) return;
  if (prompt('Type ERASE to confirm') !== 'ERASE') return;
  localStorage.removeItem(STORE_KEY); S = freshState(); unlocked = true; $('#overlay-root').innerHTML = ''; render();
}
function lockIfNeeded() {
  if (!S.settings.pinHash) { unlocked = true; return false; }
  unlocked = false;
  $('#app').innerHTML = '';
  checkPin(() => { unlocked = true; render(); });
  return true;
}

/* ---------- Events ---------- */
function onClick(ev) {
  const t = ev.target.closest('[data-tab],[data-act],[data-f]');
  if (!t) return;
  if (t.matches('input[type=checkbox],input[type=number],input[type=text],textarea,input[type=date],input[type=range]')) return;
  if (t.dataset.tab) { tab = t.dataset.tab; render(); window.scrollTo(0, 0); return; }
  const act = t.dataset.act;
  const card = t.closest('.card[data-cid]');
  const cid = card ? card.dataset.cid : t.dataset.cid;

  // Detail field buttons on Today cards
  if (!act && t.dataset.f && card) {
    const e = ensureEntry(curDate, cid);
    const f = t.dataset.f;
    let rerender = false;
    if (t.dataset.toggle) { setPath(e, f, !getPath(e, f)); rerender = f === 'x.selfharm'; }
    else if (t.dataset.bool) {
      // Yes/No answers are top-level; an explicit "No" is kept as false
      const b = t.dataset.bool === 'true';
      if (e[f] === b) delete e[f]; else e[f] = b;
      if (f === 'lay') { if (e.lay !== true) delete e.layHrs; rerender = true; }
    }
    else if (t.dataset.choice) { const v = t.dataset.choice; setPath(e, f, getPath(e, f) === v ? undefined : v); }
    else if (t.dataset.multi) { const v = t.dataset.multi; const arr = (getPath(e, f) || []).slice(); const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v); setPath(e, f, arr); }
    pruneEntry(curDate, cid); save();
    if (rerender) { rerenderCard(cid); return; }
    // fast local update of pressed states
    const group = t.closest('.chips') || t.parentElement;
    if (t.dataset.toggle || t.dataset.multi) t.setAttribute('aria-pressed', t.getAttribute('aria-pressed') !== 'true');
    else $$('[data-f]', group).forEach(b => b.setAttribute('aria-pressed', String(b === t && b.getAttribute('aria-pressed') !== 'true')));
    updateCardStatus(cid);
    return;
  }

  switch (act) {
    case 'wpick': { const c = cond(cid); c.on = !c.on; t.setAttribute('aria-pressed', c.on); break; }
    case 'wstart': {
      S.profile.name = ($('#w-name').value || '').trim();
      if (!activeConds().length) { toast('Tap at least one thing to track'); return; }
      S.settings.onboarded = true; save(); render(); break;
    }
    case 'install': if (deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.finally(() => { deferredInstall = null; render(); }); } break;
    case 'dismissinstall': S.settings.installDismissed = true; save(); render(); break;
    case 'prevday': curDate = addDays(curDate, -1); render(); break;
    case 'nextday': if (curDate < todayStr()) { curDate = addDays(curDate, 1); render(); } break;
    case 'toggle': expanded.has(cid) ? expanded.delete(cid) : expanded.add(cid); rerenderCard(cid); break;
    case 'nosx': setSeverity(cid, 0); save(); rerenderCard(cid); toast('Logged: no symptoms'); break;
    case 'keepchange': delete pendingChange[cid]; rerenderCard(cid); break;
    case 'fixmistake': fixMistake(cid); save(); rerenderCard(cid); toast('Fixed — kept as one rating'); break;
    case 'sameyest': {
      const y = getEntry(addDays(curDate, -1), cid); if (!y) break;
      const copy = JSON.parse(JSON.stringify(y));
      delete copy.notes; delete copy.log; copy.c = todayStr();
      S.entries[curDate] = S.entries[curDate] || {}; S.entries[curDate][cid] = copy;
      if (curDate === todayStr() && copy.sev != null) copy.log = [{ t: nowHM(), v: copy.sev }];
      save(); expanded.add(cid); rerenderCard(cid); toast("Copied yesterday — change anything that's different");
      break;
    }
    case 'med': {
      const e = ensureEntry(curDate, cid); const n = t.dataset.v;
      e.meds = e.meds || [];
      const i = e.meds.findIndex(m => m.n === n);
      i >= 0 ? e.meds.splice(i, 1) : e.meds.push({ n });
      if (!e.meds.length) delete e.meds;
      pruneEntry(curDate, cid); save(); rerenderCard(cid); break;
    }
    case 'medhelp': {
      const e = getEntry(curDate, cid); const m = e && e.meds && e.meds[Number(t.dataset.i)]; if (!m) break;
      m.h = m.h === t.dataset.v ? undefined : t.dataset.v; if (!m.h) delete m.h;
      save(); $$('[data-act="medhelp"]', t.parentElement).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === m.h))); break;
    }
    case 'other': { // swap the "+ Other" chip for a small text box
      const kind = t.dataset.kind;
      const ph = kind === 'med' ? 'Name and dose, e.g. Ibuprofen 800mg' : kind === 'imp' ? 'e.g. Could not play with kids' : 'Type what you noticed';
      t.outerHTML = `<span class="adder"><input type="text" data-kind="${kind}" placeholder="${ph}" enterkeyhint="done"><button class="btn small" data-act="otheradd" data-kind="${kind}">Add</button></span>`;
      $('.adder input', card).focus(); break;
    }
    case 'otheradd': addOther(card, t.dataset.kind, $('.adder input', card)); break;
    case 'clearentry': delete pendingChange[cid]; if (confirm(`Clear the ${cond(cid).name} entry for ${fmtLong(curDate)}?`)) { if (S.entries[curDate]) { delete S.entries[curDate][cid]; if (!Object.keys(S.entries[curDate]).length) delete S.entries[curDate]; } save(); rerenderCard(cid); } break;
    case 'step': {
      const e = ensureEntry(curDate, cid);
      const f = t.dataset.f, d = Number(t.dataset.d), max = Number(t.dataset.max);
      let v = Number(getPath(e, f) || 0) + d; v = Math.min(max, Math.max(0, Math.round(v * 2) / 2));
      setPath(e, f, v === 0 && d < 0 ? undefined : v);
      pruneEntry(curDate, cid); save();
      const inp = $(`input[data-f="${f}"]`, card); if (inp) inp.value = getPath(ensureEntryIfExists(curDate, cid), f) ?? '';
      updateCardStatus(cid); break;
    }
    case 'backup': doBackup(); break;
    case 'snooze': S.settings.backupSnooze = addDays(todayStr(), 7); save(); render(); break;
    case 'hcond': histCond = cid; render(); break;
    case 'hrange': histRange = Number(t.dataset.v); render(); break;
    case 'gotoday': curDate = t.dataset.d; expanded.add(cid); tab = 'today'; render(); setTimeout(() => { const el = $(`.card[data-cid="${cid}"]`); if (el) el.scrollIntoView({ block: 'start' }); }, 50); break;
    case 'rcond': rep.conds.has(cid) ? rep.conds.delete(cid) : rep.conds.add(cid); t.setAttribute('aria-pressed', rep.conds.has(cid)); { const b = $('[data-act="rall"]'); if (b) b.textContent = rep.conds.size === activeConds().length ? 'Clear all' : 'Select all'; } break;
    case 'rall': { const all = activeConds(); rep.conds = rep.conds.size === all.length ? new Set() : new Set(all.map(c => c.id)); render(); break; }
    case 'rrange': rep.range = t.dataset.v; render(); break;
    case 'mkpdf': makePDF(); break;
    case 'mkcsv': makeCSV(); break;
    case 'addcond': {
      const inp = $('#s-newcond'); const n = (inp.value || '').trim();
      if (!n) { toast('Type a condition name first'); return; }
      const ic = guessIcon(n);
      S.conditions.push({ id: uid(), name: n, icon: ic, on: true, custom: true }); save(); render(); toast(`Added ${ic} ${n} — tap the icon to change it`); break;
    }
    case 'delcond': {
      const c = cond(cid); const n = entriesFor(cid).length;
      if (!confirm(`Remove "${c.name}"${n ? ` and its ${n} entries` : ''}? This cannot be undone.`)) return;
      S.conditions = S.conditions.filter(x => x.id !== cid);
      for (const d in S.entries) { delete S.entries[d][cid]; if (!Object.keys(S.entries[d]).length) delete S.entries[d]; }
      save(); render(); break;
    }
    case 'remind-ics': { const v = $('#s-remtime')?.value; if (v) { S.settings.reminderTime = v; save(); } addReminderICS(); break; }
    case 'remind-google': { const v = $('#s-remtime')?.value; if (v) { S.settings.reminderTime = v; save(); } addReminderGoogle(); break; }
    case 'pickicon': iconPickFor = iconPickFor === cid ? null : cid; render(); scrollToCond(cid); break;
    case 'seticon': cond(cid).icon = t.dataset.v; iconPickFor = null; save(); render(); scrollToCond(cid); break;
    case 'moveup': case 'movedown': {
      const i = S.conditions.findIndex(c => c.id === cid); const j = act === 'moveup' ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= S.conditions.length) break;
      [S.conditions[i], S.conditions[j]] = [S.conditions[j], S.conditions[i]]; save(); render(); scrollToCond(cid);
      break;
    }
    case 'addmed': {
      const inp = $('#s-newmed'); const n = (inp.value || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      if (!n) { toast('Type a medication name first'); return; }
      if (!S.meds.some(m => m.toLowerCase() === n.toLowerCase())) S.meds.push(n);
      save(); render(); toast(`Added ${n}`); break;
    }
    case 'delmed': S.meds = S.meds.filter(m => m !== t.dataset.v); save(); render(); break;
    case 'delcustom': {
      const v = t.dataset.v;
      if (t.dataset.kind === 'imp') S.custom.imp = S.custom.imp.filter(x => x !== v);
      else { const c = t.dataset.cid; S.custom.sx[c] = (S.custom.sx[c] || []).filter(x => x !== v); if (!S.custom.sx[c].length) delete S.custom.sx[c]; }
      save(); render(); break;
    }
    case 'theme': S.settings.theme = t.dataset.v; save(); applyPrefs(); $$('[data-act="theme"]').forEach(b => b.setAttribute('aria-pressed', String(b === t))); break;
    case 'setpin': setPinFlow(); break;
    case 'changepin': checkPin(setPinFlow, { title: 'Enter your current PIN', cancellable: true }); break;
    case 'pinoff': checkPin(() => { S.settings.pinHash = null; S.settings.pinSalt = null; save(); render(); toast('PIN is off'); }, { title: 'Enter PIN to turn it off', cancellable: true }); break;
    case 'shareapp': navigator.share({ title: APP_NAME, text: 'Free, private symptom log for VA claims. Your data stays on your phone.', url: appUrl() }).catch(() => {}); break;
    case 'eraseall':
      if (!confirm('Erase ALL entries and settings from this phone? This cannot be undone.\n\nTip: save a backup file first.')) return;
      if (prompt('Type ERASE to confirm') !== 'ERASE') return;
      localStorage.removeItem(STORE_KEY); S = freshState(); tab = 'today'; render(); toast('All data erased'); break;
  }
}
/* Save a write-in for future use and tick it on today's entry */
function addOther(card, kind, inp) {
  if (!card || !inp) return;
  const v = (inp.value || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!v) { inp.focus(); return; }
  const cid = card.dataset.cid; const e = ensureEntry(curDate, cid);
  const has = (list, x) => list.some(y => y.toLowerCase() === x.toLowerCase());
  if (kind === 'med') {
    if (!has(S.meds, v)) S.meds.push(v);
    const name = S.meds.find(y => y.toLowerCase() === v.toLowerCase());
    e.meds = e.meds || []; if (!e.meds.some(m => m.n === name)) e.meds.push({ n: name });
  } else if (kind === 'imp') {
    const all = IMPACTS.concat(S.custom.imp);
    if (!has(all, v)) S.custom.imp.push(v);
    const name = IMPACTS.concat(S.custom.imp).find(y => y.toLowerCase() === v.toLowerCase());
    e.imp = e.imp || []; if (!e.imp.includes(name)) e.imp.push(name);
  } else {
    const list = S.custom.sx[cid] = S.custom.sx[cid] || [];
    if (!has(list, v)) list.push(v);
    const name = list.find(y => y.toLowerCase() === v.toLowerCase());
    e.x = e.x || {}; e.x.other = e.x.other || []; if (!e.x.other.includes(name)) e.x.other.push(name);
  }
  save(); rerenderCard(cid); toast(`Saved "${v}" for next time`);
}
function scrollToCond(cid) { const el = $(`[data-act="pickicon"][data-cid="${cid}"]`); if (el) el.scrollIntoView({ block: 'center' }); }
function ensureEntryIfExists(date, cid) { return getEntry(date, cid) || {}; }
function updateCardStatus(cid) {
  const el = $(`.card[data-cid="${cid}"] .status`); if (!el) return;
  const e = getEntry(curDate, cid);
  const sev = latestSev(e);
  const hasDetail = e && Object.keys(e).some(k => k !== 'c' && k !== 'sev' && k !== 'log');
  el.className = 'status' + (sev != null ? ' ok' : hasDetail ? ' part' : '');
  el.textContent = sev != null ? '✓ Logged' : hasDetail ? 'Rate severity' : 'Not logged';
}
function onInput(ev) {
  const t = ev.target;
  if (t.id === 's-newcond') { const p = $('#newcond-icon'); if (p) p.textContent = guessIcon(t.value); return; }
  if (t.matches('input.sev')) {
    const v = Number(t.value);
    t.classList.remove('unset');
    const box = t.parentElement.querySelector('.sev-val');
    box.innerHTML = `<b style="color:${sevColor(v)}">${v}</b><span>${sevWord(v)}</span>`;
  }
}
function onChange(ev) {
  const t = ev.target;
  const card = t.closest('.card[data-cid]');
  if (t.matches('input.sev') && card) {
    const cid = card.dataset.cid;
    setSeverity(cid, Number(t.value)); save(); rerenderCard(cid); return;
  }
  if (t.closest('.adder')) return; // write-in box: saved by its Add button / Enter key
  if (t.id === 'datepick') { if (t.value) { curDate = t.value > todayStr() ? todayStr() : t.value; render(); } return; }
  if (card && t.dataset.f) {
    const cid = card.dataset.cid; const e = ensureEntry(curDate, cid);
    let v = t.value;
    if (t.dataset.num) { v = v === '' ? undefined : Math.min(Number(t.max) || 9999, Math.max(0, Number(v))); if (Number.isNaN(v)) v = undefined; }
    else v = v.trim() || undefined;
    setPath(e, t.dataset.f, v); pruneEntry(curDate, cid); save(); updateCardStatus(cid); return;
  }
  if (t.id === 's-name') { S.profile.name = t.value.trim(); save(); toast('Saved'); return; }
  if (t.dataset.act === 'togglecond') { cond(t.dataset.cid).on = t.checked; save(); return; }
  if (t.id === 's-remtime') { if (t.value) { S.settings.reminderTime = t.value; save(); } return; }
  if (t.dataset.act === 'compact') { S.settings.compact = t.checked; save(); applyPrefs(); return; }
  if (t.dataset.act === 'bigtext') { S.settings.bigText = t.checked; save(); applyPrefs(); return; }
  if (t.id === 'restore' && t.files[0]) { doRestore(t.files[0]); t.value = ''; return; }
  if (t.id === 'r-notes') { rep.notes = t.checked; return; }
  if (t.id === 'r-from') { rep.from = t.value; return; }
  if (t.id === 'r-to') { rep.to = t.value; return; }
}

/* ---------- Boot ---------- */
document.addEventListener('click', onClick);
document.addEventListener('input', onInput);
document.addEventListener('change', onChange);
document.addEventListener('keydown', ev => {
  const inp = ev.target.closest && ev.target.closest('.adder input');
  if (inp && ev.key === 'Enter') { ev.preventDefault(); addOther(inp.closest('.card[data-cid]'), inp.dataset.kind, inp); }
});
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; if (unlocked) render(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (curDate > todayStr()) curDate = todayStr();
  if (S.settings.pinHash && unlocked && hiddenAt && Date.now() - hiddenAt > RELOCK_MS) lockIfNeeded();
  else if (unlocked && tab === 'today' && !document.activeElement.matches('input,textarea')) {
    // roll over to the new day if the app was left open overnight
    const t = todayStr(); if (lastSeenToday !== t) { if (curDate === lastSeenToday) curDate = t; lastSeenToday = t; render(); }
  }
});
let lastSeenToday = todayStr();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e));
applyPrefs(); // so the PIN screen uses the chosen colors too
if (!lockIfNeeded()) render();
