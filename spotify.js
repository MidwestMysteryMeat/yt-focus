// YT Focus — Spotify content script (open.spotify.com).
//
// What this can and cannot do: Spotify audio ads are server-stitched into
// the stream — there is nothing to skip TO, and the player disables
// seeking while one plays (unlike YouTube, where the ad is a separate
// video that skipVideoAd() jumps to the end of). So ads are handled by
// MUTING: detect the ad, mute the media element for its duration, then
// restore the exact mute state the user had. Visual ad units are hidden
// cosmetically on top.
//
// DEFAULTS/STORE/loadSettings come from defaults.js (loaded first).

let currentSettings = { ...DEFAULTS };

// ── Ad detection ──
// Three signals, cheapest first:
//   A. tab title becomes "Advertisement" (English UI)
//   B. now-playing widget text/aria mentions an advertisement
//   C. now-playing widget is populated but links to no /track|episode|
//      album|show/ — catches localized UIs where A/B never match.
// C alone can false-positive for one poll while a track is still
// loading (widget rendered, links not yet), so it must hold for two
// consecutive polls before it counts.
const CONTENT_LINK = 'a[href*="/track/"],a[href*="/episode/"],a[href*="/album/"],a[href*="/show/"]';
let linklessPolls = 0;

function adPlaying() {
  const widget = document.querySelector('[data-testid="now-playing-widget"]');
  const hasContentLink = !!(widget && widget.querySelector(CONTENT_LINK));

  // Title formats seen for ads: "Advertisement", "Advertisement · Spotify",
  // "Spotify – Advertisement". A real track NAMED "Advertisement" produces
  // the same title shape — but a real track always has a content link in
  // the widget and an ad never does, so the link exonerates it.
  if (/^(spotify\s*[–—-]\s*)?advertisement\b/i.test(document.title) && !hasContentLink) {
    return true;
  }

  if (!widget) { linklessPolls = 0; return false; }

  // aria-label only — widget textContent is the ad's brand name for real
  // ads, and song/artist names containing "advertisement" would false-mute.
  // Same exoneration as the title: a track named "Advertisement" has aria
  // "Now playing: Advertisement by X" AND a content link; a real ad never
  // has the link.
  if (!hasContentLink
      && /advertisement|advertiser/i.test(widget.getAttribute('aria-label') || '')) {
    return true;
  }

  if (widget.textContent.trim() && !hasContentLink) {
    linklessPolls++;
    return linklessPolls >= 2;
  }
  linklessPolls = 0;
  return false;
}

// ── Mute state machine ──
// adMuted: we are currently muting. userMutedBefore: what to restore.
let adMuted = false;
let userMutedBefore = false;

function mediaEls() {
  return document.querySelectorAll('audio, video');
}

function setMuted(m) {
  mediaEls().forEach(el => { el.muted = m; });
}

function tick() {
  const active = currentSettings.enabled && currentSettings.spotifyMuteAds;

  if (active && adPlaying()) {
    if (!adMuted) {
      adMuted = true;
      userMutedBefore = [...mediaEls()].some(el => el.muted);
    }
    // Re-assert every poll: Spotify can recreate the element mid-ad.
    setMuted(true);
  } else if (adMuted) {
    adMuted = false;
    if (!userMutedBefore) setMuted(false);
  }

  hideAdUI();
}

// ── Visual ad units ──
const AD_UI_SELECTOR = [
  '[data-testid="ad-slot"]',
  '[data-testid*="advert"]',
  'iframe[src*="doubleclick.net"]',
  'iframe[src*="adform"]',
].join(',');

function hideAdUI() {
  const active = currentSettings.enabled && currentSettings.spotifyHideAdUI;
  document.querySelectorAll(AD_UI_SELECTOR).forEach(el => {
    if (active) {
      if (el.style.display !== 'none') el.style.setProperty('display', 'none', 'important');
    } else {
      el.style.removeProperty('display');
    }
  });
}

// ── Drive: observer for title/widget changes + interval fallback ──
// The interval also catches media elements swapped without a DOM
// mutation in the observed subtree.
let tickTimer = null;
function scheduleTick() {
  clearTimeout(tickTimer);
  tickTimer = setTimeout(tick, 80);
}

const observer = new MutationObserver(scheduleTick);

function start() {
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  setInterval(tick, 1000);
  tick();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

// ── Settings load + live updates (same pattern as content.js) ──
loadSettings().then(settings => {
  currentSettings = settings;
  tick();
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  for (const [key, { newValue }] of Object.entries(changes)) {
    if (key in DEFAULTS) currentSettings[key] = newValue;
  }
  tick();
});
