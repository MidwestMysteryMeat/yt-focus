// DEFAULTS comes from defaults.js (loaded first in popup.html)
const keys = Object.keys(DEFAULTS);

// Dim the feature rows while the master switch is off
function updatePausedState() {
  const master = document.getElementById('enabled');
  document.body.classList.toggle('paused', !(master && master.checked));
}

// Load saved settings into checkboxes
browser.storage.local.get(DEFAULTS).then(settings => {
  keys.forEach(key => {
    const el = document.getElementById(key);
    if (el) el.checked = !!settings[key];
  });
  updatePausedState();
});

function save() {
  const settings = {};
  keys.forEach(key => {
    const el = document.getElementById(key);
    settings[key] = el ? el.checked : DEFAULTS[key];
  });

  // Content scripts pick this up via storage.onChanged — no messaging needed
  browser.storage.local.set(settings);
  updatePausedState();
}

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
keys.forEach(key => {
  const el = document.getElementById(key);
  if (el) el.addEventListener('change', save);
});
