# YT Focus

Firefox extension that strips the noise out of YouTube: Shorts, comments,
recommendations, action bars, channel-page clutter — each behind a toggle
in the toolbar popup, applied instantly to every open YouTube tab.

## Features

**Toggle-controlled** (popup, all on by default):

| Toggle | Hides |
|---|---|
| Recommended Sidebar | "Up next" feed on watch pages |
| Comments | Entire comments section |
| Action Bar | Like / dislike / share / ask / save row |
| Description & Ask | Description box, Ask panel, chapters, transcript |
| Shorts | Shelves, nav links, search results — and redirects `/shorts/<id>` to the normal `/watch` player |
| Topic Shelves | "Explore more topics", AI Ask panel, rich sections |
| Filter Bar | Podcasts / Gaming / News… chips |
| Left Sidebar Clutter | You, History, Subscriptions list, footer links |

**Always on** (no toggle): voice search / create / notification buttons,
hamburger menu, channel info below videos, channel banners + metadata +
about panels, Shorts/Posts/Store channel tabs, recognition shelves.

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

## Changelog

- **3.1** — Fixed switch double-toggle in popup (inline handlers are
  CSP-blocked in extension pages); replaced tab messaging with
  `storage.onChanged`; `/shorts/<id>` now redirects to `/watch?v=<id>`
  when Shorts blocking is on (the hidden player used to leave a blank
  page); added build script + docs.
- **3.0** — Per-feature toggles, popup UI, channel-page cleanup.
