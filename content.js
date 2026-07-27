// YT Focus — content script (DEFAULTS comes from defaults.js, loaded first)

// Maps setting keys → data attributes on <html>
const ATTR_MAP = {
  blockShorts:      'data-ytf-shorts',
  blockSidebar:     'data-ytf-sidebar',
  blockComments:    'data-ytf-comments',
  blockActions:     'data-ytf-actions',
  blockDescription: 'data-ytf-description',
  blockShelves:     'data-ytf-shelves',
  blockChips:       'data-ytf-chips',
  blockLeftNav:     'data-ytf-leftnav',
  blockAds:         'data-ytf-ads',
  blockEndscreen:   'data-ytf-endscreen',
  blockMerch:       'data-ytf-merch',
  blockLiveChat:    'data-ytf-livechat',
  blockHomeFeed:    'data-ytf-homefeed',
  hideMixes:        'data-ytf-mixes',
  hideOwner:        'data-ytf-owner',
  minimalChannel:   'data-ytf-channel',
  hideTopbar:       'data-ytf-topbar',
};

// ── Toggle-controlled JS rules ──
// Selectors pre-joined at module level (not inside scrub).
const JS_RULES = {
  blockShorts: {
    selector: [
      'ytd-rich-shelf-renderer[is-shorts]',
      'ytd-reel-shelf-renderer',
      'ytd-reel-item-renderer',
      'ytd-video-renderer[is-shorts]',
    ].join(','),
    chipText: ['shorts'],
  },
  blockSidebar: {
    selector: '#secondary,#related',
  },
  blockComments: {
    selector: '#comments,ytd-comments',
  },
  blockActions: {
    selector: [
      'ytd-video-primary-info-renderer #actions',
      'ytd-watch-metadata #actions',
      'ytd-watch-metadata ytd-menu-renderer',
      'ytd-video-primary-info-renderer ytd-menu-renderer',
    ].join(','),
  },
  blockDescription: {
    selector: [
      'ytd-watch-flexy #description',
      'ytd-watch-flexy #structured-description',
      'ytd-watch-flexy ytd-text-inline-expander',
      'ytd-structured-description-content-renderer',
      'ytd-video-description-infocards-section-renderer',
      'ytd-video-description-transcript-section-renderer',
    ].join(','),
  },
  blockShelves: {
    selector: [
      'ytd-rich-shelf-renderer:not([is-shorts])',
      'ytd-rich-section-renderer',
      // Search results: "People also watched", "For you", card carousels
      'ytd-search ytd-shelf-renderer',
      'ytd-search ytd-horizontal-card-list-renderer',
      'ytd-secondary-search-container-renderer',
    ].join(','),
  },
  blockChips: {
    selector: '#chips-wrapper,ytd-feed-filter-chip-bar-renderer',
  },
  blockLeftNav: {
    selector: [
      'ytd-guide-collapsible-section-entry-renderer',
      '#guide-links-primary',
      '#guide-links-secondary',
      '#guide-button',
    ].join(','),
    hideGuideSections: true,
  },
  blockAds: {
    selector: [
      '#masthead-ad',
      '#player-ads',
      'ytd-ad-slot-renderer',
      'ytd-in-feed-ad-layout-renderer',
      'ytd-display-ad-renderer',
      'ytd-promoted-sparkles-web-renderer',
      'ytd-banner-promo-renderer',
      // Watch-page companion/side ads (banner beside the player). Without
      // these, Ads only appeared to work because blockSidebar removed
      // #secondary entirely — Ads must stand alone.
      'ytd-companion-slot-renderer',
      'ytd-action-companion-ad-renderer',
      'ytd-player-legacy-desktop-watch-ads-renderer',
      // Promoted results in search
      'ytd-search-pyv-renderer',
      'ytd-promoted-video-renderer',
    ].join(','),
  },
  blockEndscreen: {
    selector: [
      '.ytp-endscreen-content',
      '.ytp-ce-element',
      '.ytp-cards-teaser',
      '.ytp-cards-button',
      '.ytp-suggested-action',
      // Recommendations overlay when the video is paused
      '.ytp-pause-overlay',
      // Channel watermark in the player corner
      '.ytp-watermark',
    ].join(','),
  },
  blockMerch: {
    selector: [
      'ytd-merch-shelf-renderer',
      'ytd-ticket-shelf-renderer',
      'ytd-donation-shelf-renderer',
      'ytd-post-renderer',
    ].join(','),
  },
  blockLiveChat: {
    selector: 'ytd-watch-flexy #chat,ytd-live-chat-frame',
  },
  blockHomeFeed: {
    selector: 'ytd-browse[page-subtype="home"] ytd-rich-grid-renderer',
  },
  hideMixes: {
    selector: [
      'ytd-compact-radio-renderer',
      'ytd-radio-renderer',
      'ytd-rich-item-renderer:has(a[href*="start_radio=1"])',
      'yt-lockup-view-model:has(a[href*="start_radio=1"])',
      'ytd-compact-video-renderer:has(a[href*="start_radio=1"])',
    ].join(','),
  },
  hideOwner: {
    selector: [
      'ytd-watch-flexy ytd-video-owner-renderer',
      'ytd-watch-metadata #owner',
      'ytd-watch-flexy #upload-info',
    ].join(','),
  },
  minimalChannel: {
    selector: [
      'ytd-recognition-shelf-renderer',
      'ytd-channel-video-player-renderer',
      'ytd-branded-page-v2-secondary-column-renderer',
      'ytd-about-channel-renderer',
      'ytd-engagement-panel-section-list-renderer[target-id="channel-about-panel"]',
      'yt-image-banner-view-model',
      '#page-header-banner',
      '#banner-container',
      'yt-page-header-view-model',
      'yt-channel-tagline-view-model',
      '#channel-tagline',
    ].join(','),
  },
  hideTopbar: {
    selector: [
      '#voice-search-button',
      'ytd-topbar-menu-button-renderer',
      '#masthead-container #buttons ytd-button-renderer',
      '#masthead-container #buttons yt-icon-button',
    ].join(','),
  },
};

// ── Mute list: containers to text-match against muteList terms ──
const MUTE_ITEM_SELECTOR = [
  'ytd-rich-item-renderer',
  'ytd-video-renderer',
  'ytd-compact-video-renderer',
  'ytd-grid-video-renderer',
  'ytd-playlist-video-renderer',
  'yt-lockup-view-model',
].join(',');

// Nav entry rules — single pass for both Shorts + LeftNav
const NAV_RULES = [
  { key: 'blockShorts',  hrefs: ['/shorts'],                          texts: ['shorts'] },
  { key: 'blockLeftNav', hrefs: ['/feed/subscriptions', '/feed/you'], texts: ['subscriptions', 'you'] },
];
const NAV_ENTRY_SELECTOR = 'ytd-guide-entry-renderer,ytd-mini-guide-entry-renderer,ytd-compact-link-renderer';

// Channel page (minimalChannel): shelf titles to hide (text-matched)
const BLOCKED_SHELF_TITLES = ['for you', 'official channels', 'channels', 'collaborations', 'posts'];

// Channel page (minimalChannel): tabs to hide
const BLOCKED_TAB_LABELS = ['shorts', 'posts', 'store'];

let currentSettings = { ...DEFAULTS };

// ── Apply data attributes to <html> so CSS rules activate/deactivate ──
// data-ytf-on gates the always-on CSS; per-feature attrs gate their rules.
// Master switch off ⇒ no attrs at all ⇒ every CSS rule goes inert.
function applyAttrs() {
  const root = document.documentElement;
  root.toggleAttribute('data-ytf-on', !!currentSettings.enabled);
  for (const [key, attr] of Object.entries(ATTR_MAP)) {
    root.toggleAttribute(attr, !!(currentSettings.enabled && currentSettings[key]));
  }
}

// ── Helpers ──
function hideEl(el) {
  if (el && el.style.display !== 'none') {
    el.style.setProperty('display', 'none', 'important');
  }
}

function showEl(el) {
  if (el) el.style.removeProperty('display');
}

// ── Ad skipper ──
// Cosmetic hiding can't remove video ads (they're part of the stream),
// so when the player enters ad-showing state: jump to the ad's end and
// click Skip as soon as it exists. No mute/rate changes — nothing to
// restore when the real video resumes.
function skipVideoAd() {
  if (!currentSettings.enabled || !currentSettings.blockAds) return;
  const player = document.querySelector('#movie_player.ad-showing');
  if (!player) return;
  const video = player.querySelector('video');
  if (video && isFinite(video.duration) && video.duration > 0) {
    video.currentTime = video.duration;
  }
  player.querySelector(
    '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern'
  )?.click();
}

// ── Autoplay-next killer ──
// Clicking the toggle flips aria-checked to false, so this never loops;
// if YouTube (or the user) turns it back on, the next scrub re-disables it.
function forceAutoplayOff() {
  if (!currentSettings.enabled || !currentSettings.disableAutoplay) return;
  document.querySelector('.ytp-autonav-toggle-button[aria-checked="true"]')?.click();
}

// ── "Video paused. Continue watching?" auto-dismiss ──
// The idle interrupt that pauses long sessions. Grouped under
// disableAutoplay: both are "let the video just play" controls.
function dismissContinueWatching() {
  if (!currentSettings.enabled || !currentSettings.disableAutoplay) return;
  const dialog = document.querySelector('yt-confirm-dialog-renderer');
  if (dialog && /continue watching/i.test(dialog.textContent || '')) {
    const btn = dialog.querySelector('#confirm-button button')
             || dialog.querySelector('#confirm-button');
    btn?.click();
  }
}

// ── Playback defaults: speed + theater mode ──
// Applied once per video id so the user can still override afterwards;
// never touches an ad (ad-showing) so the skipper's seek math stays sane.
let speedAppliedFor = null;
let theaterAppliedFor = null;
function applyPlaybackDefaults() {
  if (!currentSettings.enabled) return;
  const id = new URLSearchParams(location.search).get('v');
  if (!id) return;

  if (currentSettings.playbackSpeed > 0 && speedAppliedFor !== id) {
    const player = document.querySelector('#movie_player:not(.ad-showing)');
    const video = player && player.querySelector('video');
    if (video) {
      video.playbackRate = currentSettings.playbackSpeed;
      speedAppliedFor = id;
    }
  }

  if (currentSettings.defaultTheater && theaterAppliedFor !== id) {
    const flexy = document.querySelector('ytd-watch-flexy');
    if (flexy) {
      if (!flexy.hasAttribute('theater') && !flexy.hasAttribute('fullscreen')) {
        document.querySelector('#movie_player .ytp-size-button')?.click();
      }
      theaterAppliedFor = id;
    }
  }
}

// ── Mute list: hide videos by title/channel keyword ──
function applyMuteList() {
  const terms = (currentSettings.muteList || [])
    .map(t => String(t).toLowerCase())
    .filter(Boolean);
  const active = currentSettings.enabled && terms.length > 0;

  document.querySelectorAll(MUTE_ITEM_SELECTOR).forEach(item => {
    if (!active) { showEl(item); return; }
    const title   = item.querySelector('#video-title, h3')?.textContent || '';
    const channel = item.querySelector('ytd-channel-name, .yt-lockup-metadata-view-model__metadata')?.textContent || '';
    const hay = (title + ' ' + channel).toLowerCase();
    terms.some(t => hay.includes(t)) ? hideEl(item) : showEl(item);
  });
}

// ── Clickbait remover ──
// Titles: rewrite SHOUTING titles (>60% caps) to sentence case, keeping
// known acronyms and digit-bearing tokens (PS5, GTA6) uppercase.
// Thumbnails: swap the curated thumbnail for a real mid-video frame.
// Originals are stashed in data attributes so toggling off restores them.
// Safe against observer loops: the MutationObserver watches childList
// only, and rewritten titles no longer trip the caps threshold.
const KEEP_CAPS = new Set([
  'ai', 'tv', 'usa', 'uk', 'us', 'eu', 'un', 'fbi', 'cia', 'nasa', 'nba',
  'nfl', 'mlb', 'nhl', 'ufc', 'wwe', 'f1', 'gta', 'pc', 'diy', 'ceo',
  'vs', 'rpg', 'fps', 'mmo', 'ufo', 'usb', 'gpu', 'cpu', 'ios', 'vr',
  'ar', 'hd', 'llm', 'gpt', 'nyc', 'la', 'dc', 'ww2', 'wwii', 'diy',
]);

function smartSentenceCase(t) {
  const out = t.toLowerCase().replace(/[a-z0-9]+/gi, (w) => {
    if (KEEP_CAPS.has(w) || /\d/.test(w)) return w.toUpperCase();
    if (w === 'i') return 'I';
    return w;
  });
  return out.charAt(0).toUpperCase() + out.slice(1);
}

function applyClickbait() {
  const active = currentSettings.enabled && currentSettings.deClickbait;

  document.querySelectorAll('#video-title').forEach(el => {
    if (active) {
      const t = el.textContent;
      const letters = t.replace(/[^A-Za-z]/g, '');
      if (letters.length < 10) return;
      const upper = letters.replace(/[^A-Z]/g, '').length;
      if (upper / letters.length <= 0.6) return;
      if (el.dataset.ytfOrigTitle == null) el.dataset.ytfOrigTitle = t;
      el.textContent = smartSentenceCase(t);
    } else if (el.dataset.ytfOrigTitle != null) {
      el.textContent = el.dataset.ytfOrigTitle;
      delete el.dataset.ytfOrigTitle;
    }
  });

  document.querySelectorAll('ytd-thumbnail img, yt-thumbnail-view-model img').forEach(img => {
    if (active) {
      const m = (img.src || '').match(/i\.ytimg\.com\/vi(?:_webp)?\/([A-Za-z0-9_-]{6,})\//);
      if (!m) return;
      const frame = `https://i.ytimg.com/vi/${m[1]}/hq2.jpg`;
      if (img.src === frame) return;
      if (img.dataset.ytfOrigSrc == null) {
        img.dataset.ytfOrigSrc = img.src;
        img.dataset.ytfOrigSrcset = img.srcset || '';
      }
      img.removeAttribute('srcset');
      img.src = frame;
    } else if (img.dataset.ytfOrigSrc != null) {
      img.src = img.dataset.ytfOrigSrc;
      if (img.dataset.ytfOrigSrcset) img.srcset = img.dataset.ytfOrigSrcset;
      delete img.dataset.ytfOrigSrc;
      delete img.dataset.ytfOrigSrcset;
    }
  });
}

// ── Hide (mostly) watched videos ──
// CSS can't read the progress bar's width, so this is JS-only: hide the
// containing item when the resume-progress bar shows ≥90% watched.
// Runs AFTER applyMuteList in scrub — mute's showEl pass would otherwise
// undo these hides.
function applyWatched() {
  const active = currentSettings.enabled && currentSettings.hideWatched;
  document.querySelectorAll('ytd-thumbnail-overlay-resume-playback-renderer #progress')
    .forEach(bar => {
      const item = bar.closest(MUTE_ITEM_SELECTOR);
      if (!item) return;
      const pct = parseFloat(bar.style.width);
      if (active && pct >= 90) hideEl(item);
    });
}

// ── Main scrub ──
function scrub() {
  const on = currentSettings.enabled;
  const channelStrip = on && currentSettings.minimalChannel;

  // ─ minimalChannel: channel shelf titles (text-matched) ─
  // Scoped to channel pages: in search results the wrapping
  // ytd-item-section-renderer holds ALL results, and a "For you" shelf
  // title inside it would otherwise hide the entire results list.
  document.querySelectorAll(
    'ytd-browse[page-subtype="channels"] ytd-shelf-renderer, ytd-browse[page-subtype="channels"] ytd-item-section-renderer'
  ).forEach(shelf => {
    const title = (shelf.querySelector('#title, #title-text, h2')?.textContent || '').trim().toLowerCase();
    if (BLOCKED_SHELF_TITLES.some(b => title.includes(b))) (channelStrip ? hideEl : showEl)(shelf);
  });

  // ─ minimalChannel: channel tabs (text-matched) ─
  document.querySelectorAll('yt-tab-shape, tp-yt-paper-tab').forEach(tab => {
    const label = (tab.getAttribute('tab-title') || tab.textContent || '').trim().toLowerCase();
    if (BLOCKED_TAB_LABELS.includes(label)) (channelStrip ? hideEl : showEl)(tab);
  });

  skipVideoAd();
  forceAutoplayOff();
  dismissContinueWatching();
  applyPlaybackDefaults();
  applyMuteList();
  applyWatched();
  applyClickbait();

  // ─ Toggle-controlled: rule-based ─
  for (const [key, rule] of Object.entries(JS_RULES)) {
    const active = on && currentSettings[key];

    if (rule.selector) {
      document.querySelectorAll(rule.selector).forEach(el => {
        active ? hideEl(el) : showEl(el);
      });
    }

    if (rule.chipText) {
      document.querySelectorAll('yt-chip-cloud-chip-renderer').forEach(chip => {
        const label = (chip.querySelector('yt-formatted-string')?.textContent || '').trim().toLowerCase();
        if (rule.chipText.includes(label)) active ? hideEl(chip) : showEl(chip);
      });
    }

    if (rule.hideGuideSections) {
      document.querySelectorAll('ytd-guide-section-renderer').forEach((sec, i) => {
        if (i > 0) active ? hideEl(sec) : showEl(sec);
      });
    }
  }

  // ─ Toggle-controlled: nav entries (single pass) ─
  document.querySelectorAll(NAV_ENTRY_SELECTOR).forEach(entry => {
    const href = (entry.querySelector('a')?.getAttribute('href') || '').split('?')[0];
    const text = (entry.querySelector('yt-formatted-string, span')?.textContent || '').trim().toLowerCase();

    for (const rule of NAV_RULES) {
      const active = on && currentSettings[rule.key];
      const match =
        rule.hrefs.some(h => href === h || href.startsWith(h + '/')) ||
        rule.texts.includes(text);

      if (match) {
        active ? hideEl(entry) : showEl(entry);
        break;
      }
    }
  });
}

// ── Trailing-edge debounce ──
let scrubTimer = null;
function scheduleScrub() {
  clearTimeout(scrubTimer);
  scrubTimer = setTimeout(scrub, 80);
}

// ── Observer with init guard ──
let observerStarted = false;
const observer = new MutationObserver(scheduleScrub);

function startObserver() {
  if (observerStarted) return;
  observerStarted = true;
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

// ── Shorts player redirect ──
// The ytd-shorts player is hidden by CSS when blockShorts is on, which
// would leave /shorts/<id> pages blank — send them to the normal player.
// Only runs after settings load, so a disabled toggle is respected.
let settingsLoaded = false;
function redirectShorts() {
  if (!settingsLoaded || !currentSettings.enabled || !currentSettings.blockShorts) return;
  const m = location.pathname.match(/^\/shorts\/([A-Za-z0-9_-]+)/);
  if (m) location.replace('/watch?v=' + m[1]);
}

// ── Home → Subscriptions redirect (opt-in) ──
function redirectHome() {
  if (!settingsLoaded || !currentSettings.enabled || !currentSettings.redirectHome) return;
  if (location.pathname === '/' && !location.search) {
    location.replace('/feed/subscriptions');
  }
}

// ── YouTube SPA navigation hook ──
// Uses scheduleScrub for the early pass (deduplicates with observer),
// direct scrub at 800ms to catch late-rendering elements.
window.addEventListener('yt-navigate-finish', () => {
  redirectShorts();
  redirectHome();
  scheduleScrub();
  setTimeout(scrub, 800);
});

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  scrub();
  startObserver();
});

if (document.readyState !== 'loading') {
  scrub();
  startObserver();
}

// ── Load settings from storage (defaults.js handles sync + migration) ──
loadSettings().then(settings => {
  currentSettings = settings;
  settingsLoaded = true;
  applyAttrs();
  scrub();
  redirectShorts();
  redirectHome();
});

// ── Live updates: fires in every YouTube tab on popup save / shortcut ──
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  for (const [key, { newValue }] of Object.entries(changes)) {
    if (key in DEFAULTS) currentSettings[key] = newValue;
  }
  applyAttrs();
  scrub();
  redirectShorts();
  redirectHome();
});

// Apply attrs immediately with defaults (before storage resolves) to prevent flash
applyAttrs();
