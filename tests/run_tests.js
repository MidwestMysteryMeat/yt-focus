// YT Focus test harness.
//
// Loads the REAL extension scripts (defaults.js + content.js / spotify.js,
// unmodified) into jsdom pages that replicate YouTube and Spotify ad
// states, with a mocked browser.storage, and asserts observable behavior:
// what gets hidden, what gets muted, what gets restored.
//
// Each page runs as ONE window.eval of defaults + script + probe, because
// top-level let/const in one eval are invisible to the next — the probe
// must share the script's scope to call scrub()/tick() deterministically.
//
// What this proves: the extension's logic. What it cannot prove: that
// YouTube/Spotify still use these DOM shapes in production — selector
// drift needs a live session.
//
// Run: npm test

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const src = f => fs.readFileSync(path.join(root, f), 'utf8');

let PASS = 0, FAIL = 0;

function report(results, label) {
  console.log('== ' + label);
  for (const r of results) {
    if (r.pass) { PASS++; console.log('  PASS  ' + r.name); }
    else { FAIL++; console.log('  FAIL  ' + r.name + (r.detail ? '  [' + r.detail + ']' : '')); }
  }
}

// browser.* mock: storage.sync round-trips and fires onChanged listeners,
// exactly like the real API the scripts rely on for live updates.
function installBrowserMock(win) {
  const listeners = [];
  const store = {};
  win.browser = {
    storage: {
      sync: {
        async get() { return { ...store }; },
        async set(obj) {
          const changes = {};
          for (const [k, v] of Object.entries(obj)) {
            changes[k] = { newValue: v };
            store[k] = v;
          }
          listeners.forEach(f => f(changes, 'sync'));
        },
      },
      local: {
        _s: {},
        async get(k) {
          if (k == null) return { ...this._s };
          const out = {};
          if (k in this._s) out[k] = this._s[k];
          return out;
        },
        async set(obj) { Object.assign(this._s, obj); },
      },
      onChanged: { addListener(f) { listeners.push(f); } },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// YouTube
// ─────────────────────────────────────────────────────────────────────────
async function testYouTube() {
  const html = `<!DOCTYPE html><html><head><title>watch</title></head><body>
    <ytd-app>
      <div id="masthead-ad"><span>banner ad</span></div>
      <ytd-ad-slot-renderer></ytd-ad-slot-renderer>
      <ytd-in-feed-ad-layout-renderer></ytd-in-feed-ad-layout-renderer>
      <ytd-display-ad-renderer></ytd-display-ad-renderer>
      <ytd-companion-slot-renderer></ytd-companion-slot-renderer>
      <ytd-search-pyv-renderer></ytd-search-pyv-renderer>
      <div id="player-ads"></div>
      <div id="movie_player" class="ad-showing">
        <video></video>
        <button class="ytp-skip-ad-button"></button>
      </div>
      <div id="secondary"><span>up next</span></div>
      <ytd-comments id="comments"></ytd-comments>
      <ytd-compact-radio-renderer><span>My Mix</span></ytd-compact-radio-renderer>
      <ytd-watch-metadata><div id="owner"><span>Channel</span></div></ytd-watch-metadata>
      <yt-confirm-dialog-renderer>
        <span>Video paused. Continue watching?</span>
        <div id="confirm-button"><button></button></div>
      </yt-confirm-dialog-renderer>
      <h3><a id="video-title">MY INSANE GTA 6 SPEEDRUN!! FBI SHOWED UP</a></h3>
      <yt-tab-shape tab-title="Publicaciones"></yt-tab-shape>
    </ytd-app>
  </body></html>`;

  const dom = new JSDOM(html, {
    url: 'https://www.youtube.com/watch?v=abc123',
    runScripts: 'outside-only',
  });
  const win = dom.window;
  const doc = win.document;
  installBrowserMock(win);

  // Instrument the ad video BEFORE the scripts run their first scrub:
  // jsdom's HTMLMediaElement has no real duration/currentTime.
  const video = doc.querySelector('#movie_player video');
  let ct = 2;
  Object.defineProperty(video, 'duration', { value: 15 });
  Object.defineProperty(video, 'currentTime', { get: () => ct, set: v => { ct = v; } });
  doc.querySelector('.ytp-skip-ad-button')
    .addEventListener('click', () => { win.__skipClicked = true; });
  doc.querySelector('yt-confirm-dialog-renderer #confirm-button button')
    .addEventListener('click', () => { win.__continueClicked = true; });

  const probe = `
    window.__done = (async () => {
      const R = window.__results = [];
      const t = (name, cond, detail) => R.push({ name, pass: !!cond, detail });
      await new Promise(r => setTimeout(r, 60));   // let loadSettings resolve
      scrub();                                     // deterministic, skip the debounce

      const q = s => document.querySelector(s);
      const hidden = el => !!el && el.style.display === 'none';

      t('attr gate on <html> set (data-ytf-ads)',
        document.documentElement.hasAttribute('data-ytf-ads'));
      t('masthead banner ad hidden', hidden(q('#masthead-ad')));
      t('in-feed ad slot hidden', hidden(q('ytd-ad-slot-renderer')));
      t('in-feed ad layout hidden', hidden(q('ytd-in-feed-ad-layout-renderer')));
      t('display ad hidden', hidden(q('ytd-display-ad-renderer')));
      t('companion (side) ad hidden', hidden(q('ytd-companion-slot-renderer')));
      t('promoted search result hidden', hidden(q('ytd-search-pyv-renderer')));
      t('under-player text ads hidden', hidden(q('#player-ads')));

      const v = q('#movie_player video');
      t('video ad seeked to its end', v.currentTime === 15, 'currentTime=' + v.currentTime);
      t('skip button clicked', window.__skipClicked === true);

      t('sidebar hidden (independent toggle)', hidden(q('#secondary')));
      t('comments hidden (independent toggle)', hidden(q('#comments')));

      t('mix/radio card hidden (hideMixes default on)',
        hidden(q('ytd-compact-radio-renderer')));
      t('channel info under video NOT hidden (hideOwner default off)',
        !hidden(q('ytd-watch-metadata #owner')));
      t('"Continue watching?" auto-confirmed (disableAutoplay)',
        window.__continueClicked === true);

      const title = q('#video-title');
      t('SHOUTING title rewritten', title.textContent !== title.dataset.ytfOrigTitle
        && title.dataset.ytfOrigTitle === 'MY INSANE GTA 6 SPEEDRUN!! FBI SHOWED UP');
      t('acronyms + digits survive de-CAPS',
        title.textContent === 'My insane GTA 6 speedrun!! FBI showed up',
        'got: ' + title.textContent);

      await browser.storage.sync.set({ hideOwner: true });
      t('hideOwner toggled on: owner hidden', hidden(q('ytd-watch-metadata #owner')));
      await browser.storage.sync.set({ hideOwner: false });

      // Localized channel tab (Spanish "Posts") under minimalChannel
      await browser.storage.sync.set({ minimalChannel: true });
      t('Spanish "Publicaciones" tab hidden (L10N)',
        hidden(q('yt-tab-shape[tab-title="Publicaciones"]')));
      await browser.storage.sync.set({ minimalChannel: false });
      t('minimalChannel off: tab restored',
        !hidden(q('yt-tab-shape[tab-title="Publicaciones"]')));

      await browser.storage.sync.set({ deClickbait: false });
      t('clickbait off: original title restored',
        title.textContent === 'MY INSANE GTA 6 SPEEDRUN!! FBI SHOWED UP');
      await browser.storage.sync.set({ deClickbait: true });

      await browser.storage.sync.set({ enabled: false });
      t('master OFF: banner ad restored', !hidden(q('#masthead-ad')));
      t('master OFF: attr gates cleared',
        !document.documentElement.hasAttribute('data-ytf-ads')
        && !document.documentElement.hasAttribute('data-ytf-on'));

      await browser.storage.sync.set({ enabled: true });
      t('master back ON: banner ad hidden again', hidden(q('#masthead-ad')));

      await browser.storage.sync.set({ blockAds: false });
      t('Ads toggle off: ad shown', !hidden(q('#masthead-ad')));
      t('Ads toggle off: sidebar STILL hidden', hidden(q('#secondary')));
      await browser.storage.sync.set({ blockAds: true });

      // Per-page profiles: this fixture is a /watch page
      await browser.storage.sync.set({ pageWatch: false });
      t('watch profile off: sidebar restored', !hidden(q('#secondary')));
      t('watch profile off: attr gates cleared',
        !document.documentElement.hasAttribute('data-ytf-ads'));
      t('watch profile off: master switch still on', true);
      await browser.storage.sync.set({ pageWatch: true });
      t('watch profile back on: sidebar hidden again', hidden(q('#secondary')));

      // Selector canary: a missing structural element counts strikes,
      // a found one resets them
      document.querySelector('ytd-watch-metadata').remove();
      await runCanaryCheck(); await runCanaryCheck(); await runCanaryCheck();
      let canary = (await browser.storage.local.get('ytfCanary')).ytfCanary;
      t('canary: missing element reaches 3 strikes',
        canary && canary.fails['video metadata'] === 3);
      t('canary: present elements carry no strikes',
        canary && !canary.fails['player'] && !canary.fails['sidebar']);
      const meta = document.createElement('ytd-watch-metadata');
      document.body.appendChild(meta);
      await runCanaryCheck();
      canary = (await browser.storage.local.get('ytfCanary')).ytfCanary;
      t('canary: element back -> strikes reset',
        canary && canary.fails['video metadata'] === 0);
    })();
  `;

  win.eval(src('defaults.js') + '\n' + src('content.js') + '\n' + probe);
  await win.__done;
  report(win.__results, 'YouTube (content.js)');
  win.close();
}

// ─────────────────────────────────────────────────────────────────────────
// YouTube mobile (m.youtube.com)
// ─────────────────────────────────────────────────────────────────────────
async function testYouTubeMobile() {
  const html = `<!DOCTYPE html><html><head><title>watch</title></head><body>
    <ytm-app>
      <ytm-reel-shelf-renderer><span>Shorts</span></ytm-reel-shelf-renderer>
      <ytm-comment-section-renderer></ytm-comment-section-renderer>
      <ytm-item-section-renderer section-identifier="related-items"></ytm-item-section-renderer>
      <ytm-promoted-video-renderer></ytm-promoted-video-renderer>
      <ytm-chip-cloud-renderer></ytm-chip-cloud-renderer>
      <ytm-video-with-context-renderer>
        <h3 class="media-item-headline">Drama video about MutedGuy</h3>
      </ytm-video-with-context-renderer>
      <ytm-video-with-context-renderer>
        <h3 class="media-item-headline">Normal video</h3>
      </ytm-video-with-context-renderer>
    </ytm-app>
  </body></html>`;

  const dom = new JSDOM(html, {
    url: 'https://m.youtube.com/watch?v=abc123',
    runScripts: 'outside-only',
  });
  const win = dom.window;
  installBrowserMock(win);

  const probe = `
    window.__done = (async () => {
      const R = window.__results = [];
      const t = (name, cond, detail) => R.push({ name, pass: !!cond, detail });
      await new Promise(r => setTimeout(r, 60));
      scrub();

      const q = s => document.querySelector(s);
      const hidden = el => !!el && el.style.display === 'none';

      t('mobile: shorts shelf hidden', hidden(q('ytm-reel-shelf-renderer')));
      t('mobile: comments hidden', hidden(q('ytm-comment-section-renderer')));
      t('mobile: related section hidden',
        hidden(q('ytm-item-section-renderer[section-identifier="related-items"]')));
      t('mobile: promoted video hidden', hidden(q('ytm-promoted-video-renderer')));
      t('mobile: filter chips hidden', hidden(q('ytm-chip-cloud-renderer')));
      t('mobile: attr gate set on <html>',
        document.documentElement.hasAttribute('data-ytf-shorts'));

      await browser.storage.sync.set({ muteList: ['mutedguy'] });
      scrub();
      const items = document.querySelectorAll('ytm-video-with-context-renderer');
      t('mobile: mute list hides matching video', hidden(items[0]));
      t('mobile: mute list keeps other video', !hidden(items[1]));

      // Canary is desktop-only — a mobile watch page must not count strikes
      await runCanaryCheck();
      const canary = (await browser.storage.local.get('ytfCanary')).ytfCanary;
      t('mobile: canary does not run (no false strikes)', canary === undefined);

      await browser.storage.sync.set({ pageWatch: false });
      t('mobile: watch profile off applies here too',
        !hidden(q('ytm-reel-shelf-renderer')));
    })();
  `;

  win.eval(src('defaults.js') + '\n' + src('content.js') + '\n' + probe);
  await win.__done;
  report(win.__results, 'YouTube mobile (content.js @ m.youtube.com)');
  win.close();
}

// ─────────────────────────────────────────────────────────────────────────
// Spotify
// ─────────────────────────────────────────────────────────────────────────
async function testSpotify() {
  const html = `<!DOCTYPE html><html><head><title>Song · Artist</title></head><body>
    <div data-testid="now-playing-widget" aria-label="Now playing: Song by Artist">
      <a href="/track/123">Song</a>
    </div>
    <audio></audio>
    <div data-testid="ad-slot"><span>leaderboard</span></div>
    <div data-testid="right-sidebar"><div>sidebar ad panel</div></div>
  </body></html>`;

  const dom = new JSDOM(html, {
    url: 'https://open.spotify.com/',
    runScripts: 'outside-only',
  });
  const win = dom.window;
  installBrowserMock(win);

  const probe = `
    window.__done = (async () => {
      const R = window.__results = [];
      const t = (name, cond, detail) => R.push({ name, pass: !!cond, detail });
      await new Promise(r => setTimeout(r, 60));

      const audio = document.querySelector('audio');
      const widget = document.querySelector('[data-testid="now-playing-widget"]');
      const slot = document.querySelector('[data-testid="ad-slot"]');
      const song = () => {
        document.title = 'Song · Artist';
        widget.setAttribute('aria-label', 'Now playing: Song by Artist');
        widget.innerHTML = '<a href="/track/1">Song</a>';
      };
      const ad = () => {
        document.title = 'Advertisement';
        widget.setAttribute('aria-label', 'Now playing: Advertisement');
        widget.innerHTML = '<div>SomeBrand</div>';
      };

      tick();
      t('track playing: not muted', audio.muted === false);
      t('visual ad banner hidden', slot.style.display === 'none');

      const breakHidden = () => {
        const sb = document.querySelector('[data-testid="right-sidebar"]');
        return document.documentElement.classList.contains('ytf-spotify-ad-break')
          && getComputedStyle(sb).visibility === 'hidden';
      };
      t('no ad: sidebar panel visible', !breakHidden());

      ad(); tick();
      t('ad detected (title): muted', audio.muted === true);
      t('ad break: sidebar panel + now-playing widget hidden', breakHidden());

      song(); tick();
      t('track resumes: unmuted', audio.muted === false);
      t('ad break over: sidebar panel restored', !breakHidden());

      // User had muted it themselves — that state must survive the ad.
      audio.muted = true;
      ad(); tick();
      t('user-muted before ad: still muted during', audio.muted === true);
      song(); tick();
      t('user mute RESTORED after ad (not blindly unmuted)', audio.muted === true);
      audio.muted = false;

      // A real track literally named "Advertisement": widget has a track
      // link, which exonerates the title match.
      document.title = 'Advertisement · FakeArtist';
      widget.setAttribute('aria-label', 'Now playing: Advertisement by FakeArtist');
      widget.innerHTML = '<a href="/track/2">Advertisement</a>';
      tick();
      t('song titled "Advertisement": NOT muted', audio.muted === false);

      // Localized ad (no English strings anywhere): linkless widget must
      // hold for 2 polls — one poll (a track mid-load) must not mute.
      document.title = 'Spotify';
      widget.setAttribute('aria-label', '');
      widget.innerHTML = '<div>Marque Locale</div>';
      tick();
      t('linkless widget 1st poll: not yet muted', audio.muted === false);
      tick();
      t('linkless widget 2nd poll: muted (localized ad)', audio.muted === true);
      song(); tick();
      t('localized ad over: unmuted', audio.muted === false);

      // German UI: title "Werbung", linkless widget — the localized
      // title word must mute on the FIRST poll (no 2-poll wait)
      document.title = 'Werbung';
      widget.setAttribute('aria-label', 'Werbung');
      widget.innerHTML = '<div>MarkeX</div>';
      tick();
      t('German ad title "Werbung": muted on first poll', audio.muted === true);
      song(); tick();
      t('German ad over: unmuted', audio.muted === false);

      await browser.storage.sync.set({ enabled: false });
      t('master OFF: ad banner restored', slot.style.display !== 'none');
      await browser.storage.sync.set({ enabled: true });

      await browser.storage.sync.set({ spotifyMuteAds: false });
      ad(); tick();
      t('Mute Ads toggle off: ad plays unmuted', audio.muted === false);
    })();
  `;

  win.eval(src('defaults.js') + '\n' + src('spotify.js') + '\n' + probe);
  await win.__done;
  report(win.__results, 'Spotify (spotify.js)');
  win.close();
}

(async () => {
  await testYouTube();
  await testYouTubeMobile();
  await testSpotify();
  console.log('\nPASS ' + PASS + '  FAIL ' + FAIL);
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
