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
  hideMixes:        true,   // algorithmic Mix/radio cards in feeds & sidebar
  hideWatched:      false,  // hide videos you've already (mostly) watched
  hideOwner:        false,  // channel avatar/name/subscribe under the player
  minimalChannel:   false,  // strip channel pages: banner, avatar, tabs, shelves
  hideTopbar:       false,  // voice search, create, notification bell
  spotifyMuteAds:   true,   // Spotify web player: mute audio ads (can't skip — server-stitched)
  spotifyHideAdUI:  true,   // Spotify web player: hide visual ad units
  defaultTheater:   false,  // enter theater mode on each new video
  playbackSpeed:    0,      // default speed per new video; 0 = leave alone
  pausedUntil:      0,      // epoch ms; timed pause auto-resumes then (0 = none)
  pageHome:         true,   // per-page profiles: where filters apply
  pageWatch:        true,
  pageSearch:       true,
  pageSubs:         true,
  pageChannel:      true,
  scheduleEnabled:  false,  // focus hours: force filters on during the window
  scheduleStart:    '09:00',
  scheduleEnd:      '17:00',
  scheduleDays:     [1, 2, 3, 4, 5],  // getDay() values; Mon–Fri
  strictOff:        false,  // slow off-switch: 10s countdown to turn off
  muteList:         [],     // hide videos matching these words/channels
};

// ── Localized label tables ──
// Structural signals (hrefs, icons, element names) are locale-proof and
// always primary; these word lists only back the few rules that must
// text-match. Lowercase; covers the top YouTube/Spotify locales.
// "Shorts" is an unlocalized brand word nearly everywhere.
const L10N = {
  advertisement: [
    'advertisement', 'anuncio', 'anúncio', 'publicité', 'publicidad',
    'werbung', 'annuncio', 'advertentie', 'reklama', 'reklam',
    'реклама', '広告', '광고', '广告', '廣告',
  ],
  forYou: [
    'for you', 'para ti', 'para você', 'pour vous', 'pour toi',
    'für dich', 'per te', 'voor jou', 'dla ciebie', 'senin için',
    'для вас', 'あなたへ',
  ],
  posts: [
    'posts', 'publicaciones', 'postagens', 'publications', 'beiträge',
    'post', 'berichten', 'posty', 'gönderiler', 'посты', 'сообщения',
    '投稿', '게시물',
  ],
  store: [
    'store', 'tienda', 'loja', 'boutique', 'shop', 'negozio', 'winkel',
    'sklep', 'mağaza', 'магазин', 'ストア', '스토어', '商店',
  ],
  subscriptions: [
    'subscriptions', 'suscripciones', 'inscrições', 'abonnements',
    'abos', 'iscrizioni', 'abonnementen', 'subskrypcje', 'abonelikler',
    'подписки', '登録チャンネル', '구독',
  ],
  you: ['you', 'tú', 'você', 'vous', 'du', 'tu', 'jij', 'ty', 'sen', 'вы'],
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
    // Migrate only known settings keys — storage.local also holds
    // transient state like the selector-canary results.
    const known = {};
    for (const key of Object.keys(DEFAULTS)) {
      if (key in legacy) known[key] = legacy[key];
    }
    if (Object.keys(known).length > 0) {
      await STORE.set(known);
      stored = known;
    }
  }
  return { ...DEFAULTS, ...stored };
}

// ── Focus-hours helper (shared by background.js + popup.js) ──
// True while the schedule forces filters on. Windows may cross midnight
// (start > end). An empty day list means every day.
function inFocusWindow(settings, now = new Date()) {
  if (!settings.scheduleEnabled) return false;
  const days = Array.isArray(settings.scheduleDays) ? settings.scheduleDays : [];
  if (days.length > 0 && !days.includes(now.getDay())) return false;
  const hm = s => {
    const [h, m] = String(s || '').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const t = now.getHours() * 60 + now.getMinutes();
  const a = hm(settings.scheduleStart);
  const b = hm(settings.scheduleEnd);
  return a <= b ? (t >= a && t < b) : (t >= a || t < b);
}
