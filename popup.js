// DEFAULTS / STORE / loadSettings / inFocusWindow come from defaults.js
// (loaded first in popup.html). Checkbox rows cover the boolean
// settings; the speed select, timed pause, focus hours, mute list and
// backup have their own handlers.
const boolKeys = Object.keys(DEFAULTS).filter(k => typeof DEFAULTS[k] === 'boolean');
let current = { ...DEFAULTS };
let muteList = [];

// ── Status line + per-section counts ──
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function locked() {
  return current.enabled && inFocusWindow(current);
}

function updateStatus(flash) {
  document.body.classList.toggle('paused', !current.enabled);

  let on = 0, total = 0;
  document.querySelectorAll('details').forEach(sec => {
    const count = sec.querySelector('.sec-count');
    if (sec.hasAttribute('data-nocount')) { count.textContent = ''; return; }
    const boxes = sec.querySelectorAll('input[type="checkbox"]');
    const secOn = [...boxes].filter(b => b.checked).length;
    on += secOn; total += boxes.length;
    count.textContent = secOn + '/' + boxes.length;
    count.classList.toggle('live', current.enabled && secOn > 0);
  });

  const status = document.getElementById('statusLine');
  if (flash) {
    status.textContent = flash;
  } else if (locked()) {
    status.textContent = on + ' of ' + total + ' filters on · focus hours until '
      + (current.scheduleEnd || '');
  } else if (current.enabled) {
    status.textContent = on + ' of ' + total + ' filters on';
  } else if (current.pausedUntil > Date.now()) {
    status.textContent = 'Paused — resumes ' + fmtTime(current.pausedUntil);
  } else {
    status.textContent = 'Paused';
  }

  const pauseBtn = document.getElementById('pauseBtn');
  pauseBtn.textContent = current.enabled
    ? (locked() ? 'Focus hours — pause locked' : 'Pause for 10 min')
    : (current.pausedUntil > Date.now()
        ? 'Resume now (auto ' + fmtTime(current.pausedUntil) + ')'
        : 'Resume');
}

// ── Save/load ──
function save() {
  const settings = {};
  boolKeys.forEach(key => {
    const el = document.getElementById(key);
    if (el) settings[key] = el.checked;
  });
  settings.playbackSpeed = parseFloat(document.getElementById('playbackSpeed').value) || 0;

  Object.assign(current, settings);
  // Content scripts pick this up via storage.onChanged — no messaging needed
  STORE.set(settings);
  updateStatus();
}

function renderDays() {
  const days = Array.isArray(current.scheduleDays) ? current.scheduleDays : [];
  document.querySelectorAll('#dayRow .day').forEach(btn => {
    btn.classList.toggle('on', days.includes(Number(btn.dataset.day)));
  });
}

function loadIntoUI(settings) {
  current = { ...DEFAULTS, ...settings };
  boolKeys.forEach(key => {
    const el = document.getElementById(key);
    if (el) el.checked = !!current[key];
  });
  document.getElementById('playbackSpeed').value = String(current.playbackSpeed || 0);
  document.getElementById('scheduleStart').value = current.scheduleStart || '09:00';
  document.getElementById('scheduleEnd').value = current.scheduleEnd || '17:00';
  muteList = Array.isArray(current.muteList) ? current.muteList.map(String) : [];
  renderDays();
  renderMuteList();
  updateStatus();
}

loadSettings().then(loadIntoUI);

// Selector canary: show the "YouTube changed" banner after 3 strikes
browser.storage.local.get('ytfCanary').then(res => {
  const fails = (res.ytfCanary && res.ytfCanary.fails) || {};
  const broken = Object.values(fails).some(n => n >= 3);
  document.getElementById('canaryWarn').classList.toggle('show', broken);
});

// Refresh live if the background auto-resumes (or another window changes
// settings) while this popup is open.
browser.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'sync') return;
  loadIntoUI(await loadSettings());
});

// ── Master switch ──
// A manual flip cancels a pending timed pause. During focus hours,
// turning off is refused. With the slow off-switch on, turning off
// starts a 10 s countdown; a second click cancels it.
let offTimer = null;
let offLeft = 0;

function cancelOffCountdown() {
  clearInterval(offTimer);
  offTimer = null;
  updateStatus();
}

document.getElementById('enabled').addEventListener('change', (e) => {
  const box = e.target;

  if (offTimer) {           // countdown running — this click cancels it
    box.checked = true;
    cancelOffCountdown();
    updateStatus('Kept on.');
    return;
  }

  if (!box.checked && locked()) {
    box.checked = true;
    updateStatus('Focus hours — locked until ' + (current.scheduleEnd || ''));
    return;
  }

  if (!box.checked && current.strictOff) {
    box.checked = true;     // stays on until the countdown finishes
    offLeft = 10;
    updateStatus('Turning off in ' + offLeft + ' s — click again to cancel');
    offTimer = setInterval(() => {
      offLeft--;
      if (offLeft > 0) {
        updateStatus('Turning off in ' + offLeft + ' s — click again to cancel');
        return;
      }
      cancelOffCountdown();
      box.checked = false;
      current.enabled = false;
      current.pausedUntil = 0;
      STORE.set({ enabled: false, pausedUntil: 0 });
      updateStatus();
    }, 1000);
    return;
  }

  current.enabled = box.checked;
  current.pausedUntil = 0;
  STORE.set({ enabled: current.enabled, pausedUntil: 0 });
  updateStatus();
});

// ── Timed pause (always instant — it self-heals) ──
document.getElementById('pauseBtn').addEventListener('click', () => {
  if (current.enabled && locked()) {
    updateStatus('Focus hours — locked until ' + (current.scheduleEnd || ''));
    return;
  }
  if (current.enabled) {
    current.enabled = false;
    current.pausedUntil = Date.now() + 10 * 60 * 1000;
    STORE.set({ enabled: false, pausedUntil: current.pausedUntil });
  } else {
    current.enabled = true;
    current.pausedUntil = 0;
    STORE.set({ enabled: true, pausedUntil: 0 });
  }
  document.getElementById('enabled').checked = current.enabled;
  updateStatus();
});

// Click anywhere on a row to toggle — except on the switch itself,
// where the checkbox toggles natively and fires the change listener.
// (Inline stopPropagation handlers are blocked by extension-page CSP.)
document.querySelectorAll('.toggle-row').forEach(row => {
  row.addEventListener('click', (e) => {
    if (e.target.closest('.switch') || e.target.closest('select')) return;
    const key = row.dataset.key;
    const checkbox = key && document.getElementById(key);
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      save();
    }
  });
});

// Direct checkbox change (master handled above)
boolKeys.filter(k => k !== 'enabled').forEach(key => {
  const el = document.getElementById(key);
  if (el) el.addEventListener('change', save);
});

document.getElementById('playbackSpeed').addEventListener('change', save);

// ── Focus hours: time range + day picker ──
['scheduleStart', 'scheduleEnd'].forEach(key => {
  document.getElementById(key).addEventListener('change', (e) => {
    const value = e.target.value || DEFAULTS[key];
    current[key] = value;
    STORE.set({ [key]: value });
    updateStatus();
  });
});

document.querySelectorAll('#dayRow .day').forEach(btn => {
  btn.addEventListener('click', () => {
    const day = Number(btn.dataset.day);
    const days = new Set(Array.isArray(current.scheduleDays) ? current.scheduleDays : []);
    days.has(day) ? days.delete(day) : days.add(day);
    current.scheduleDays = [...days].sort();
    STORE.set({ scheduleDays: current.scheduleDays });
    renderDays();
    updateStatus();
  });
});

// Remember which sections the user keeps open
document.querySelectorAll('details').forEach(sec => {
  const memoKey = 'ytf-open-' + sec.dataset.section;
  const memo = localStorage.getItem(memoKey);
  if (memo !== null) sec.open = memo === '1';
  sec.addEventListener('toggle', () => {
    localStorage.setItem(memoKey, sec.open ? '1' : '0');
  });
});

// ── Mute list ──
function renderMuteList() {
  const wrap = document.getElementById('muteChips');
  wrap.textContent = '';
  muteList.forEach((term, i) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = term;
    const x = document.createElement('button');
    x.className = 'chip-x';
    x.textContent = '×';
    x.title = 'Remove';
    x.addEventListener('click', () => {
      muteList.splice(i, 1);
      STORE.set({ muteList });
      renderMuteList();
    });
    chip.appendChild(x);
    wrap.appendChild(chip);
  });
}

function addMuteTerm() {
  const input = document.getElementById('muteInput');
  const term = input.value.trim().toLowerCase();
  if (term && !muteList.includes(term)) {
    muteList.push(term);
    STORE.set({ muteList });
    renderMuteList();
  }
  input.value = '';
  input.focus();
}

document.getElementById('muteAdd').addEventListener('click', addMuteTerm);
document.getElementById('muteInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addMuteTerm();
});

// ── Ko-fi link: open in a tab (popup pages can't navigate themselves) ──
document.getElementById('kofi').addEventListener('click', (e) => {
  e.preventDefault();
  browser.tabs.create({ url: 'https://ko-fi.com/midwestmysterymeat' });
  window.close();
});

// ── Backup: export/import all settings as JSON ──
const backupBox = document.getElementById('backupBox');

document.getElementById('exportBtn').addEventListener('click', async () => {
  const settings = await loadSettings();
  delete settings.pausedUntil;   // transient state, not a preference
  backupBox.value = JSON.stringify(settings, null, 2);
  backupBox.select();
  try { await navigator.clipboard.writeText(backupBox.value); } catch {}
});

document.getElementById('importBtn').addEventListener('click', async () => {
  let parsed;
  try {
    parsed = JSON.parse(backupBox.value);
  } catch {
    backupBox.value = '⚠ Paste valid JSON (use Export for the format)';
    return;
  }
  // Only accept known keys with the right types
  const clean = {};
  for (const key of Object.keys(DEFAULTS)) {
    if (!(key in parsed) || key === 'pausedUntil') continue;
    const kind = typeof DEFAULTS[key];
    if ((kind === 'boolean' || kind === 'number' || kind === 'string')
        && typeof parsed[key] === kind) {
      clean[key] = parsed[key];
    } else if (key === 'muteList' && Array.isArray(parsed[key])) {
      clean[key] = parsed[key].map(String);
    } else if (key === 'scheduleDays' && Array.isArray(parsed[key])) {
      clean[key] = parsed[key].map(Number).filter(n => n >= 0 && n <= 6);
    }
  }
  await STORE.set(clean);
  loadIntoUI(await loadSettings());
  backupBox.value = '✓ Imported';
});
