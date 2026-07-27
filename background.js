// YT Focus — background script.
// Three jobs: the pause/resume keyboard shortcut, the timed-pause
// auto-resume, and the right-click "mute this channel" menu item.
// All state flows through storage.sync → storage.onChanged, so every
// tab and the popup stay in step with no messaging.

// ── Keyboard shortcut (manifest "commands") ──
// A manual toggle always cancels a pending timed pause.
browser.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-focus') return;
  const settings = await loadSettings();
  await STORE.set({ enabled: !settings.enabled, pausedUntil: 0 });
});

// ── Timed pause: auto-resume when pausedUntil passes ──
// The popup's "Pause for 10 min" sets { enabled:false, pausedUntil:ts }.
// MV2 background pages are persistent, so a plain timeout is reliable;
// the startup check below covers browser restarts.
let pauseTimer = null;

function schedulePauseCheck(until) {
  clearTimeout(pauseTimer);
  pauseTimer = null;
  const delay = until - Date.now();
  if (until <= 0) return;
  if (delay <= 0) {
    STORE.set({ enabled: true, pausedUntil: 0 });
    return;
  }
  pauseTimer = setTimeout(() => {
    STORE.set({ enabled: true, pausedUntil: 0 });
  }, delay);
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' || !('pausedUntil' in changes)) return;
  schedulePauseCheck(changes.pausedUntil.newValue || 0);
});

loadSettings().then(settings => {
  if (settings.pausedUntil) schedulePauseCheck(settings.pausedUntil);
});

// ── Right-click a channel link → add it to the mute list ──
browser.contextMenus.create({
  id: 'ytf-mute-channel',
  title: 'YT Focus: mute this channel',
  contexts: ['link'],
  targetUrlPatterns: [
    '*://www.youtube.com/@*',
    '*://www.youtube.com/channel/*',
    '*://www.youtube.com/c/*',
    '*://www.youtube.com/user/*',
  ],
});

browser.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== 'ytf-mute-channel') return;
  const m = (info.linkUrl || '').match(
    /youtube\.com\/(?:@([^/?#]+)|channel\/([^/?#]+)|c\/([^/?#]+)|user\/([^/?#]+))/
  );
  if (!m) return;
  // Prefer the human-readable handle/name; raw channel id last (it never
  // appears in card text, but muting it still catches links elsewhere).
  const name = decodeURIComponent(m[1] || m[3] || m[4] || m[2] || '')
    .replace(/^@/, '')
    .trim()
    .toLowerCase();
  if (!name) return;
  const settings = await loadSettings();
  const muteList = Array.isArray(settings.muteList) ? settings.muteList.map(String) : [];
  if (!muteList.includes(name)) {
    muteList.push(name);
    await STORE.set({ muteList });
  }
});
