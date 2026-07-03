const DEFAULTS = {
  blockShorts:      true,
  blockSidebar:     true,
  blockComments:    true,
  blockActions:     true,
  blockDescription: true,
  blockShelves:     true,
  blockChips:       true,
  blockLeftNav:     true,
};

const keys = Object.keys(DEFAULTS);

// Load saved settings into checkboxes
browser.storage.local.get(DEFAULTS).then(settings => {
  keys.forEach(key => {
    const el = document.getElementById(key);
    if (el) el.checked = !!settings[key];
  });
});

function save() {
  const settings = {};
  keys.forEach(key => {
    const el = document.getElementById(key);
    settings[key] = el ? el.checked : DEFAULTS[key];
  });

  browser.storage.local.set(settings);

  // Notify all open YouTube tabs so changes apply instantly
  browser.tabs.query({ url: '*://www.youtube.com/*' }).then(tabs => {
    tabs.forEach(tab => {
      browser.tabs.sendMessage(tab.id, { type: 'settingsUpdate', settings }).catch(() => {});
    });
  });
}

// Click anywhere on a row to toggle
document.querySelectorAll('.toggle-row').forEach(row => {
  row.addEventListener('click', () => {
    const key = row.dataset.key;
    const checkbox = document.getElementById(key);
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      save();
    }
  });
});

// Direct checkbox change (stopPropagation in HTML prevents double-fire)
keys.forEach(key => {
  const el = document.getElementById(key);
  if (el) el.addEventListener('change', save);
});
