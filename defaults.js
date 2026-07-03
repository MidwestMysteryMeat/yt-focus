// YT Focus — shared settings schema.
// Loaded before content.js (see manifest content_scripts) and before
// popup.js (see popup.html), so both reference this single DEFAULTS.
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
  blockHomeFeed:    false,  // blank the home page entirely (opt-in)
};
