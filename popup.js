// DEFAULTS / STORE / loadSettings come from defaults.js (loaded first
// in popup.html). Checkbox rows cover the boolean settings; muteList
// and backup have their own handlers below.
const boolKeys = Object.keys(DEFAULTS).filter(k => typeof DEFAULTS[k] === 'boolean');
let muteList = [];

// Dim the feature rows while the master switch is off
function updatePausedState() {
  const master = document.getElementById('enabled');
  document.body.classList.toggle('paused', !(master && master.checked));
}

function save() {
  const settings = {};
  boolKeys.forEach(key => {
    const el = document.getElementById(key);
    settings[key] = el ? el.checked : DEFAULTS[key];
  });

  // Content scripts pick this up via storage.onChanged — no messaging needed
  STORE.set(settings);
  updatePausedState();
}

function loadIntoUI(settings) {
  boolKeys.forEach(key => {
    const el = document.getElementById(key);
    if (el) el.checked = !!settings[key];
  });
  muteList = Array.isArray(settings.muteList) ? settings.muteList.map(String) : [];
  renderMuteList();
  updatePausedState();
}

loadSettings().then(loadIntoUI);

// Click anywhere on a row to toggle — except on the switch itself,
// where the checkbox toggles natively and fires the change listener.
// (Inline stopPropagation handlers are blocked by extension-page CSP.)
document.querySelectorAll('.toggle-row').forEach(row => {
  row.addEventListener('click', (e) => {
    if (e.target.closest('.switch')) return;
    const key = row.dataset.key;
    const checkbox = document.getElementById(key);
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      save();
    }
  });
});

// Direct checkbox change
boolKeys.forEach(key => {
  const el = document.getElementById(key);
  if (el) el.addEventListener('change', save);
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
    if (!(key in parsed)) continue;
    if (typeof DEFAULTS[key] === 'boolean' && typeof parsed[key] === 'boolean') {
      clean[key] = parsed[key];
    } else if (key === 'muteList' && Array.isArray(parsed[key])) {
      clean[key] = parsed[key].map(String);
    }
  }
  await STORE.set(clean);
  loadIntoUI(await loadSettings());
  backupBox.value = '✓ Imported';
});
