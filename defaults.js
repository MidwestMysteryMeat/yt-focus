// YT Focus — shared settings schema + storage helpers.
// Loaded before content.js (manifest content_scripts), popup.js
// (popup.html) and background.js (manifest background), so all three
// reference this single DEFAULTS/STORE/loadSettings.
const DEFAULTS = {
  enabled:          true,   // master switch — gates every rule, CSS and JS
  blockShorts:      true,
  blockSidebar:     true,
  blockComments:    true,
  blockActions:     true,
  blockDescription: true,
  blockShelves:     true,
  blockChips:       true,
  blockLeftNav:     true,
  blockAds:         true,   // display ads + auto-skip video ads
  blockEndscreen:   true,   // end-of-video wall, in-video card teasers
  blockMerch:       true,   // merch/ticket/donation shelves, community posts
  blockLiveChat:    true,   // live chat panel on streams
  disableAutoplay:  true,   // force the player's autoplay-next toggle off
  deClickbait:      true,   // real video frames as thumbnails, de-CAPS titles
  blockHomeFeed:    false,  // blank the home page entirely (opt-in)
  redirectHome:     false,  // home page → subscriptions feed (opt-in)
  muteList:         [],     // hide videos matching these words/channels
};

// Settings live in storage.sync so Firefox Sync carries them across
// devices (works locally too when sync is off).
const STORE = browser.storage.sync;

// Returns merged settings; first run migrates from the pre-3.3
// storage.local area so existing users keep their configuration.
async function loadSettings() {
  let stored = await STORE.get(null);
  if (Object.keys(stored).length === 0) {
    const legacy = await browser.storage.local.get(null);
    if (Object.keys(legacy).length > 0) {
      await STORE.set(legacy);
      stored = legacy;
    }
  }
  return { ...DEFAULTS, ...stored };
}
