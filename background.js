// YT Focus — background script.
// Three jobs: the pause/resume keyboard shortcut, the timed-pause
// auto-resume, and the right-click "mute this channel" menu item.
// All state flows through storage.sync → storage.onChanged, so every
// tab and the popup stay in step with no messaging.

// ── Keyboard shortcut (manifest "commands") ──
// A manual toggle always cancels a pending timed pause. During focus
// hours turning off is refused; with the slow off-switch on, the
// shortcut downgrades "off" to a 10-minute timed pause (it self-heals).
browser.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-focus') return;
  const settings = await loadSettings();
  if (!settings.enabled) {
    await STORE.set({ enabled: true, pausedUntil: 0 });
    return;
  }
  if (inFocusWindow(settings)) return;
  if (settings.strictOff) {
    await STORE.set({ enabled: false, pausedUntil: Date.now() + 10 * 60 * 1000 });
  } else {
    await STORE.set({ enabled: false, pausedUntil: 0 });
  }
});

// ── Focus hours: force filters on inside the scheduled window ──
// Checked every 30s (and at startup). Re-enabling also clears any
// timed pause that would otherwise re-fire.
async function enforceSchedule() {
  const settings = await loadSettings();
  if (inFocusWindow(settings) && !settings.enabled) {
    await STORE.set({ enabled: true, pausedUntil: 0 });
  }
}
setInterval(enforceSchedule, 30000);
enforceSchedule();

// ── Selector-canary badge ──
// content.js counts consecutive watch-page loads where a structural
// element is missing (storage.local.ytfCanary). Three strikes ⇒ badge,
// so "YouTube changed, some rules are dead" is announced, not silent.
function updateCanaryBadge(canary) {
  const broken = Object.values((canary && canary.fails) || {}).some(n => n >= 3);
  browser.browserAction.setBadgeText({ text: broken ? '!' : '' });
  if (broken) browser.browserAction.setBadgeBackgroundColor({ color: '#ff3b30' });
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.ytfCanary) {
    updateCanaryBadge(changes.ytfCanary.newValue);
  }
});

browser.storage.local.get('ytfCanary').then(res => updateCanaryBadge(res.ytfCanary));

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

// ── Slow off-switch: complete the countdown even if the popup closes ──
// The popup only writes strictOffAt (epoch ms) and displays the countdown;
// the turn-off itself happens HERE, so closing the popup mid-countdown
// can't silently cancel an announced turn-off. Clearing strictOffAt (a
// second click in the popup) cancels the pending turn-off.
let strictOffTimer = null;

async function fireStrictOff() {
  const settings = await loadSettings();
  if (!settings.strictOffAt) return;             // already cancelled
  if (settings.enabled) {
    await STORE.set({ enabled: false, pausedUntil: 0, strictOffAt: 0 });
  } else {
    // Something else (timed pause, another window) already turned it off —
    // don't stomp its pausedUntil, just clear the stale deadline.
    await STORE.set({ strictOffAt: 0 });
  }
}

function scheduleStrictOff(at) {
  clearTimeout(strictOffTimer);
  strictOffTimer = null;
  if (!at) return;
  const delay = at - Date.now();
  if (delay <= 0) { fireStrictOff(); return; }
  strictOffTimer = setTimeout(fireStrictOff, delay);
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' || !('strictOffAt' in changes)) return;
  scheduleStrictOff(changes.strictOffAt.newValue || 0);
});

// Startup: a deadline that passed while the browser was closed fires now.
loadSettings().then(settings => {
  if (settings.strictOffAt) scheduleStrictOff(settings.strictOffAt);
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
