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
  blockHomeFeed:    'data-ytf-homefeed',
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
    ].join(','),
  },
  blockEndscreen: {
    selector: [
      '.ytp-endscreen-content',
      '.ytp-ce-element',
      '.ytp-cards-teaser',
      '.ytp-cards-button',
      '.ytp-suggested-action',
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
  blockHomeFeed: {
    selector: 'ytd-browse[page-subtype="home"] ytd-rich-grid-renderer',
  },
};

// Nav entry rules — single pass for both Shorts + LeftNav
const NAV_RULES = [
  { key: 'blockShorts',  hrefs: ['/shorts'],                          texts: ['shorts'] },
  { key: 'blockLeftNav', hrefs: ['/feed/subscriptions', '/feed/you'], texts: ['subscriptions', 'you'] },
];
const NAV_ENTRY_SELECTOR = 'ytd-guide-entry-renderer,ytd-mini-guide-entry-renderer,ytd-compact-link-renderer';

// ── Always-on hides (no toggle, no user control) ──
const ALWAYS_HIDE_SELECTOR = [
  // Watch page: channel info below video (scoped to avoid matching elsewhere)
  'ytd-watch-flexy ytd-video-owner-renderer',
  'ytd-watch-metadata #owner',
  'ytd-watch-flexy #upload-info',
  // Hamburger menu button
  '#guide-button',
  // Channel page: recognition/featured shelves
  'ytd-recognition-shelf-renderer',
  'ytd-channel-video-player-renderer',
  'ytd-branded-page-v2-secondary-column-renderer',
  // Channel about dialog
  'ytd-about-channel-renderer',
  'ytd-engagement-panel-section-list-renderer[target-id="channel-about-panel"]',
  // Channel banner
  'yt-image-banner-view-model',
  '#page-header-banner',
  '#banner-container',
  // Channel metadata (avatar, handle, subscribers, description, subscribe)
  'yt-page-header-view-model',
  'yt-channel-tagline-view-model',
  '#channel-tagline',
].join(',');

// Channel page: shelf titles to always hide (hoisted from scrub)
const BLOCKED_SHELF_TITLES = ['for you', 'official channels', 'channels', 'collaborations', 'posts'];

// Channel page: tabs to always hide
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

// ── Main scrub ──
function scrub() {
  const on = currentSettings.enabled;

  // ─ Always-on: selector-based ─
  document.querySelectorAll(ALWAYS_HIDE_SELECTOR).forEach(on ? hideEl : showEl);

  // ─ Always-on: channel shelf titles (text-matched) ─
  // Scoped to channel pages: in search results the wrapping
  // ytd-item-section-renderer holds ALL results, and a "For you" shelf
  // title inside it would otherwise hide the entire results list.
  document.querySelectorAll(
    'ytd-browse[page-subtype="channels"] ytd-shelf-renderer, ytd-browse[page-subtype="channels"] ytd-item-section-renderer'
  ).forEach(shelf => {
    const title = (shelf.querySelector('#title, #title-text, h2')?.textContent || '').trim().toLowerCase();
    if (BLOCKED_SHELF_TITLES.some(b => title.includes(b))) (on ? hideEl : showEl)(shelf);
  });

  // ─ Always-on: channel tabs (text-matched) ─
  document.querySelectorAll('yt-tab-shape, tp-yt-paper-tab').forEach(tab => {
    const label = (tab.getAttribute('tab-title') || tab.textContent || '').trim().toLowerCase();
    if (BLOCKED_TAB_LABELS.includes(label)) (on ? hideEl : showEl)(tab);
  });

  skipVideoAd();

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

// ── YouTube SPA navigation hook ──
// Uses scheduleScrub for the early pass (deduplicates with observer),
// direct scrub at 800ms to catch late-rendering elements.
window.addEventListener('yt-navigate-finish', () => {
  redirectShorts();
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

// ── Load settings from storage ──
browser.storage.local.get(DEFAULTS).then(settings => {
  currentSettings = { ...DEFAULTS, ...settings };
  settingsLoaded = true;
  applyAttrs();
  scrub();
  redirectShorts();
});

// ── Live updates: fires in every YouTube tab when the popup saves ──
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  for (const [key, { newValue }] of Object.entries(changes)) {
    if (key in DEFAULTS) currentSettings[key] = newValue;
  }
  applyAttrs();
  scrub();
  redirectShorts();
});

// Apply attrs immediately with defaults (before storage resolves) to prevent flash
applyAttrs();
