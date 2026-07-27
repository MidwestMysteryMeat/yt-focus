// DEFAULTS / STORE / loadSettings come from defaults.js (loaded first
// in popup.html). Checkbox rows cover the boolean settings; the speed
// select, timed pause, mute list and backup have their own handlers.
const boolKeys = Object.keys(DEFAULTS).filter(k => typeof DEFAULTS[k] === 'boolean');
let muteList = [];
let currentEnabled = DEFAULTS.enabled;
let currentPausedUntil = 0;

// ── Status line + per-section counts ──
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function updateStatus() {
  document.body.classList.toggle('paused', !currentEnabled);

  let on = 0, total = 0;
  document.querySelectorAll('details').forEach(sec => {
    const boxes = sec.querySelectorAll('input[type="checkbox"]');
    const secOn = [...boxes].filter(b => b.checked).length;
    on += secOn; total += boxes.length;
    const count = sec.querySelector('.sec-count');
    count.textContent = secOn + '/' + boxes.length;
    count.classList.toggle('live', currentEnabled && secOn > 0);
  });

  const status = document.getElementById('statusLine');
  if (currentEnabled) {
    status.textContent = on + ' of ' + total + ' filters on';
  } else if (currentPausedUntil > Date.now()) {
    status.textContent = 'Paused — resumes ' + fmtTime(currentPausedUntil);
  } else {
    status.textContent = 'Paused';
  }

  const pauseBtn = document.getElementById('pauseBtn');
  pauseBtn.textContent = currentEnabled
    ? 'Pause for 10 min'
    : (currentPausedUntil > Date.now()
        ? 'Resume now (auto ' + fmtTime(currentPausedUntil) + ')'
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

  // Content scripts pick this up via storage.onChanged — no messaging needed
  currentEnabled = settings.enabled;
  STORE.set(settings);
  updateStatus();
}

function loadIntoUI(settings) {
  boolKeys.forEach(key => {
    const el = document.getElementById(key);
    if (el) el.checked = !!settings[key];
  });
  document.getElementById('playbackSpeed').value = String(settings.playbackSpeed || 0);
  muteList = Array.isArray(settings.muteList) ? settings.muteList.map(String) : [];
  currentEnabled = !!settings.enabled;
  currentPausedUntil = settings.pausedUntil || 0;
  renderMuteList();
  updateStatus();
}

loadSettings().then(loadIntoUI);

// Refresh live if the background auto-resumes (or another window changes
// settings) while this popup is open.
browser.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'sync') return;
  loadIntoUI(await loadSettings());
});

// ── Master switch: a manual flip always cancels a pending timed pause ──
document.getElementById('enabled').addEventListener('change', (e) => {
  currentEnabled = e.target.checked;
  currentPausedUntil = 0;
  STORE.set({ enabled: currentEnabled, pausedUntil: 0 });
  updateStatus();
});

// ── Timed pause ──
document.getElementById('pauseBtn').addEventListener('click', () => {
  if (currentEnabled) {
    currentEnabled = false;
    currentPausedUntil = Date.now() + 10 * 60 * 1000;
    STORE.set({ enabled: false, pausedUntil: currentPausedUntil });
  } else {
    currentEnabled = true;
    currentPausedUntil = 0;
    STORE.set({ enabled: true, pausedUntil: 0 });
  }
  document.getElementById('enabled').checked = currentEnabled;
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
    if (typeof DEFAULTS[key] === 'boolean' && typeof parsed[key] === 'boolean') {
      clean[key] = parsed[key];
    } else if (typeof DEFAULTS[key] === 'number' && typeof parsed[key] === 'number') {
      clean[key] = parsed[key];
    } else if (key === 'muteList' && Array.isArray(parsed[key])) {
      clean[key] = parsed[key].map(String);
    }
  }
  await STORE.set(clean);
  loadIntoUI(await loadSettings());
  backupBox.value = '✓ Imported';
});
