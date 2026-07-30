# YT Focus

Firefox extension that strips the noise out of YouTube: Shorts, comments,
recommendations, action bars, channel-page clutter — each behind a toggle
in the toolbar popup, applied instantly to every open YouTube tab. Also
mutes ads on the Spotify web player.

**Repo:** [github.com/MidwestMysteryMeat/yt-focus](https://github.com/MidwestMysteryMeat/yt-focus)
· by [@MidwestMysteryMeat](https://github.com/MidwestMysteryMeat)
· ☕ [Support on Ko-fi](https://ko-fi.com/midwestmysterymeat)

## Features

**Master switch** in the popup header pauses/resumes every rule at once.
**Pause for 10 min** gives a timed break that auto-resumes — no more
"turned it off once, never turned it back on."

**Toggle-controlled** (popup, grouped into collapsible sections with
live on-counts; everything is a toggle — nothing is forced on you):

| Toggle | Hides / does |
|---|---|
| Recommended sidebar | "Up next" feed on watch pages |
| Comments | Entire comments section |
| Action bar | Like / dislike / share / ask / save row |
| Description & Ask | Description box, Ask panel, chapters, transcript |
| Channel info under video | Avatar, name, Subscribe button below the player (opt-in) |
| End screens & cards | Video-end recommendation wall, in-video card teasers, pause-screen recommendations, channel watermark |
| Ads | Display/in-feed/masthead ads, watch-page companion (side) ads, promoted search results; video ads are auto-skipped (seek to end + click Skip) |
| Live chat | Chat panel on streams & premieres |
| Stop autoplay | Forces "autoplay next" off and auto-dismisses the "Video paused. Continue watching?" interrupt |
| Theater mode | Enters the wide player on every new video (opt-in) |
| Default speed | Applies a chosen playback speed once per video (off / 1×–2×) |
| Shorts | Shelves, nav links, search results — and redirects `/shorts/<id>` to the normal `/watch` player |
| Topic shelves | "Explore more topics", AI Ask panel, search-result shelves ("People also watched", "For you") |
| Mixes & radio | Endless algorithmic "Mix" playlist cards in feeds and the sidebar |
| Already watched | Videos whose resume bar shows ≥90% watched (opt-in) |
| Filter bar | Podcasts / Gaming / News… chips |
| Merch & posts | Merch/ticket/donation shelves, community posts |
| Clickbait remover | Swaps thumbnails for real mid-video frames, rewrites SHOUTING titles to sentence case while preserving acronyms and digit tokens (GTA 6, FBI, PS5) |
| Entire home feed | Blanks the home page grid completely (opt-in) |
| Home → Subscriptions | Redirects the home page to your subscriptions feed (opt-in) |
| Left sidebar clutter | You, History, Subscriptions list, footer links, hamburger button |
| Top bar buttons | Notification bell, Create, voice search (opt-in) |
| Minimal channel pages | Banner, avatar/metadata, promo shelves, Shorts/Posts/Store tabs (opt-in) |

**Right-click any channel link** → "YT Focus: mute this channel" adds it
straight to the mute list — no typing.

**Per-page profiles** — choose where filters run (Home / Watch / Search /
Subscriptions / Channels). Strict on the home page, untouched on watch
pages, or any mix; unknown pages always filter.

**Focus discipline (all opt-in):**

- **Focus hours** — a scheduled window (times + weekdays, may cross
  midnight) during which filters lock on: the master switch, timed
  pause and keyboard shortcut are all refused until the window ends.
- **Slow off-switch** — turning the extension off takes a 10-second
  countdown (click again to cancel). The 10-minute timed pause stays
  instant, because it turns itself back on.

**Selector self-test** — every watch page load checks that YouTube's
structural elements still exist. Three consecutive misses ⇒ a `!` badge
on the toolbar icon and a banner in the popup saying YouTube changed
its layout, instead of filters dying silently.

**Spotify (web player, `open.spotify.com` only)** — two toggles:

| Toggle | Does |
|---|---|
| Mute Ads | Detects audio ads and mutes the player for their duration, restoring your previous mute state after |
| Hide Ad Banners | Hides visual ad units cosmetically |

> Spotify audio ads **cannot be skipped** — they're stitched into the
> audio stream server-side and the player disables seeking while one
> plays. Muting is the honest ceiling of what an extension can do. The
> desktop app is out of reach entirely; this only works in the browser.
> Detection uses the tab title ("Advertisement"), the now-playing
> widget's text, and a linkless-widget fallback for non-English UIs.

**Muted words & channels** — add words or channel names in the popup;
any video whose title or channel matches is hidden everywhere (home,
search, sidebar, playlists).

**QoL** — settings live in `storage.sync` (carried across devices by
Firefox Sync; pre-3.3 local settings migrate automatically), JSON
export/import in the popup, and **Alt+Shift+Y** pauses/resumes the
whole extension.

> Video-ad skipping is best-effort DOM manipulation — YouTube changes
> its player markup regularly. If ads stop skipping, the selectors in
> `skipVideoAd()` (content.js) are the place to look.

## How it works

Two layers, same selectors:

- `content.css` — rules gated by `data-ytf-*` attributes on `<html>`.
  Instant, flash-free (applied at `document_start`), and self-reverting
  when a toggle is switched off.
- `content.js` — a debounced `MutationObserver` scrub for elements CSS
  can't reliably catch (text-matched shelves/tabs/chips/nav entries),
  plus the Shorts redirect and `yt-navigate-finish` SPA hook.

Settings live in `browser.storage.sync`; content scripts react to
`storage.onChanged`, so popup changes hit every open tab with no
message passing.

## Install

**Temporary (development):** `about:debugging` → This Firefox →
Load Temporary Add-on → pick `manifest.json`.

**Permanent:** Firefox requires signed xpis. Run `./build.ps1`, upload
`dist/yt-focus-v<version>.zip` to
[AMO](https://addons.mozilla.org/developers/) as **unlisted**
(self-distribution), download the signed `.xpi`, and open it in Firefox.

## Build

```powershell
./build.ps1   # → dist/yt-focus-v<version>.zip (AMO-ready)
```

## Tests

```powershell
npm install   # once (jsdom)
npm test      # 60 assertions over the real content scripts and jsdom fixtures
npm run lint  # pinned eslint correctness gate; must report 0 errors
```

The harness loads the unmodified extension scripts into DOM fixtures of
YouTube/Spotify ad states and asserts what gets hidden, muted and
restored — including the master switch, per-toggle independence, the
user's own mute state surviving a Spotify ad, and the false-positive
guards (a track literally named "Advertisement", a mid-load linkless
widget). It proves the logic; it cannot prove YouTube/Spotify still use
these DOM shapes — that only shows up in a live session.

## Mobile (Firefox Android) — beta

`m.youtube.com` uses its own `ytm-*` DOM, and 4.2 adds a mobile selector
set for the core filters: Shorts (shelves, feed cards, bottom-nav tab),
comments, related videos, ads, filter chips, shelves, mixes, merch/posts,
channel info, mute list, and autoplay-off. Redirects (Shorts → watch,
Home → Subscriptions) work since mobile uses the same paths. Not yet on
mobile: clickbait title rewriting, hide-watched, blank home feed, and the
channel-page/topbar/left-nav toggles (different mobile chrome). The
selector canary is desktop-only, so mobile can't cause false "YouTube
broke" warnings.

## Known gaps

- Mobile selectors are fixture-tested but need live-device verification
  after YouTube mobile updates (marked beta above).
- Text-matched rules cover ~13 locales via the `L10N` tables in
  `defaults.js`; other languages fall back to the structural (href/
  icon/element) signals, which cover most but not all rules.

## License

Licensed under the **[Apache License 2.0](LICENSE)** — free to use, modify, fork and build on, commercially or not.

**Credit is required.** Apache-2.0 §4(c)–(d) obliges you to keep the copyright notice and to reproduce [`NOTICE`](NOTICE) in anything you distribute, including binaries and hosted builds. Credit it as `yt-focus by MysteryMeat` (https://github.com/MidwestMysteryMeat/yt-focus) in your credits screen, About box, or docs. The project name and the MysteryMeat name are not licensed for endorsement or promotion (§6).

## Changelog

- **4.4** — Spotify ad-break visual coverage. The sidebar ad panel
  ("Your music will continue after the break" / "Learn more" card) and
  the ad branding in the now-playing bar carry no ad-specific markup, so
  they escaped the ad-unit selectors. They are now hidden positionally
  while an ad is detected — a root class + injected CSS blanks the
  right-sidebar panel and now-playing widget for the break, then
  restores them (visibility, not display, so layout doesn't jump).
  Ad-unit selectors extended (`AdSlot` testids, googlesyndication
  iframes). Suite now 60 assertions.
- **4.3** — Localization + mobile polish. New shared `L10N` word tables
  (~13 locales) behind the few rules that must text-match: channel
  tabs/shelf titles (Publicaciones, Beiträge, ストア…), left-nav
  fallbacks, and Spotify ad detection (Anuncio, Werbung, Publicité,
  Реклама, 広告… — regex avoids `\b` so CJK matches). Structural
  signals (hrefs, icons, element names) remain primary and were always
  locale-proof. Clickbait remover now also rewrites mobile titles and
  swaps mobile thumbnails. 57-assertion suite incl. German Spotify ad
  + Spanish channel-tab fixtures.
- **4.2** — Firefox Android / m.youtube.com support (beta): `ytm-*`
  selector set for Shorts, comments, related, ads, chips, shelves,
  mixes, merch/posts, channel info, mute list and autoplay-off; mobile
  mute-list matching via `.media-item-headline`; canary restricted to
  desktop so mobile can't log false strikes. 53-assertion suite with a
  dedicated m.youtube.com fixture.
- **4.1** — Discipline + resilience release. Per-page profiles (filters
  can be limited to Home/Watch/Search/Subs/Channels); Focus hours
  schedule that locks filters on (master switch, pause and shortcut all
  refused inside the window, background re-enables every 30 s); opt-in
  slow off-switch (10 s countdown, cancellable — timed pause stays
  instant); selector self-test canary (3 consecutive watch-page misses
  ⇒ toolbar `!` badge + popup banner instead of silent breakage);
  settings migration now copies only known keys. 43-assertion suite.
- **4.0** — Retention/parity release. Every formerly always-on hide is
  now a toggle (Channel info under video, Minimal channel pages, Top bar
  buttons — all opt-in, so a fresh install no longer hides the Subscribe
  button or notification bell without asking). New filters: Mixes &
  radio, Already watched (≥90%), pause-screen recommendations, channel
  watermark. New behaviors: timed **Pause for 10 min** with auto-resume,
  auto-dismiss of "Video paused. Continue watching?", playback defaults
  (theater mode, default speed), right-click **mute this channel**
  context menu. Clickbait de-CAPS now preserves acronyms/digit tokens.
  Popup redesigned: collapsible sections with live on-counts, status
  line, remembered section state. 36-assertion test suite.
- **3.5** — Ads toggle now also covers watch-page companion/side ads and
  promoted search results (previously they only vanished as a side effect
  of the sidebar toggle); Spotify ad detection hardened (title-format
  variants, and a track literally named "Advertisement" is no longer
  muted — a content link in the now-playing widget exonerates all text
  signals); jsdom test harness (29 assertions over the real scripts).
- **3.4** — Spotify web-player support: audio ads auto-muted (with the
  user's own mute state restored afterwards), visual ad units hidden;
  new `spotify.js` content script + popup section.
- **3.3** — Unhook-parity pack (Stop Autoplay, Live Chat hiding,
  Home→Subscriptions redirect); muted words & channels list; Clickbait
  Remover (frame thumbnails + de-CAPS titles); settings moved to
  `storage.sync` with automatic migration; JSON export/import;
  Alt+Shift+Y pause shortcut (new background script); relicensed under the Ephemeral / Proprietary License.
- **3.2** — Master on/off switch; Ads toggle (cosmetic hiding +
  video-ad auto-skip); End Screens & Cards toggle; Merch & Posts
  toggle; opt-in blank home page; search-result shelf cleanup under
  Topic Shelves; fixed channel-shelf title matcher wiping entire
  search results (now scoped to channel pages); DEFAULTS deduplicated
  into shared `defaults.js`.
- **3.1** — Fixed switch double-toggle in popup (inline handlers are
  CSP-blocked in extension pages); replaced tab messaging with
  `storage.onChanged`; `/shorts/<id>` now redirects to `/watch?v=<id>`
  when Shorts blocking is on (the hidden player used to leave a blank
  page); added build script + docs.
- **3.0** — Per-feature toggles, popup UI, channel-page cleanup.

---
<sub>Support development — <a href="https://ko-fi.com/midwestmysterymeat">Ko-fi</a></sub>
