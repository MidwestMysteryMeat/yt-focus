# YT Focus

Firefox extension that strips the noise out of YouTube: Shorts, comments,
recommendations, action bars, channel-page clutter — each behind a toggle
in the toolbar popup, applied instantly to every open YouTube tab.

**Repo:** [github.com/MidwestMysteryMeat/yt-focus](https://github.com/MidwestMysteryMeat/yt-focus)
· by [@MidwestMysteryMeat](https://github.com/MidwestMysteryMeat)

## Features

**Master switch** in the popup header pauses/resumes everything at once
(all CSS and JS rules, including the always-on set).

**Toggle-controlled** (popup, all on by default except Entire Home Feed):

| Toggle | Hides |
|---|---|
| Recommended Sidebar | "Up next" feed on watch pages |
| Comments | Entire comments section |
| Action Bar | Like / dislike / share / ask / save row |
| Description & Ask | Description box, Ask panel, chapters, transcript |
| End Screens & Cards | Video-end recommendation wall, in-video card teasers |
| Ads | Display/in-feed/masthead ads; video ads are auto-skipped (seek to end + click Skip) |
| Shorts | Shelves, nav links, search results — and redirects `/shorts/<id>` to the normal `/watch` player |
| Topic Shelves | "Explore more topics", AI Ask panel, search-result shelves ("People also watched", "For you") |
| Filter Bar | Podcasts / Gaming / News… chips |
| Merch & Posts | Merch/ticket/donation shelves, community posts |
| Entire Home Feed | Blanks the home page grid completely (opt-in) |
| Left Sidebar Clutter | You, History, Subscriptions list, footer links |

**Always on** (no toggle, but gated by the master switch): voice search /
create / notification buttons, hamburger menu, channel info below videos,
channel banners + metadata + about panels, Shorts/Posts/Store channel
tabs, recognition shelves.

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

Settings live in `browser.storage.local`; content scripts react to
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

## Known gaps

- `m.youtube.com` (Firefox Android) uses a completely different DOM
  (`ytm-*` elements) — the manifest declares Android support but no
  mobile selectors exist yet.
- Text-matched rules (channel tabs, nav entries, shelf titles) assume
  an English UI.

## Changelog

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
