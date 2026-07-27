# YT Focus

Firefox extension that strips the noise out of YouTube: Shorts, comments,
recommendations, action bars, channel-page clutter — each behind a toggle
in the toolbar popup, applied instantly to every open YouTube tab. Also
mutes ads on the Spotify web player.

**Repo:** [github.com/MidwestMysteryMeat/yt-focus](https://github.com/MidwestMysteryMeat/yt-focus)
· by [@MidwestMysteryMeat](https://github.com/MidwestMysteryMeat)

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
npm test      # runs the real content scripts in jsdom ad fixtures
```

The harness loads the unmodified extension scripts into DOM fixtures of
YouTube/Spotify ad states and asserts what gets hidden, muted and
restored — including the master switch, per-toggle independence, the
user's own mute state surviving a Spotify ad, and the false-positive
guards (a track literally named "Advertisement", a mid-load linkless
widget). It proves the logic; it cannot prove YouTube/Spotify still use
these DOM shapes — that only shows up in a live session.

## Known gaps

- `m.youtube.com` (Firefox Android) uses a completely different DOM
  (`ytm-*` elements) — the manifest declares Android support but no
  mobile selectors exist yet.
- Text-matched rules (channel tabs, nav entries, shelf titles) assume
  an English UI.

## License

Proprietary — [Ephemeral / Proprietary License](LICENSE) (All Rights Reserved with a Sharing Exception).

## Changelog

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
