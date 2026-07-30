# Assets needed

**Short answer: none. Everything the extension needs is already in the repo.**

`yt-focus` ships its own icon set, and that is the entire media footprint. There are
**no fonts, no audio, no video, and no other images** anywhere in the tree — the popup
UI is styled with plain CSS, and the one piece of iconography inside it is an inline
`<svg>` (`popup.html:302-304`), not a file.

Nothing referenced by `manifest.json` is missing, so a fresh clone loads in Firefox
with no extra steps. (A missing `manifest.json` icon *would* be an unguarded
dependency — Firefox refuses to load the extension — but both referenced files are
present and git-tracked.)

## The icon set (16 PNGs + 2 SVGs, all git-tracked)

Two variants at eight sizes each: the plain mark, and a `-focus` variant used as the
"focus mode is on" state. All PNGs are RGBA.

| path/pattern | type | format | dimensions | used for | required/optional | fallback behavior |
|---|---|---|---|---|---|---|
| `icons/icon48.png` | icon | PNG RGBA (1 208 B) | 48×48 | `manifest.json:7` (`icons`), `manifest.json:13` (`browser_action.default_icon`), packaged by `build.ps1:17` | **required** | none — Firefox fails to load the extension if absent |
| `icons/icon96.png` | icon | PNG RGBA (2 592 B) | 96×96 | `manifest.json:8` (`icons`), `manifest.json:14` (`browser_action.default_icon`), packaged by `build.ps1:17` | **required** | none — same as above |
| `icons/icon16.png` | icon | PNG RGBA (458 B) | 16×16 | not referenced by manifest or build | optional | — |
| `icons/icon32.png` | icon | PNG RGBA (850 B) | 32×32 | not referenced | optional | — |
| `icons/icon128.png` | icon | PNG RGBA (3 505 B) | 128×128 | store-listing size, not referenced | optional | — |
| `icons/icon256.png` | icon | PNG RGBA (6 010 B) | 256×256 | store-listing size, not referenced | optional | — |
| `icons/icon512.png` | icon | PNG RGBA (14 372 B) | 512×512 | store-listing size, not referenced | optional | — |
| `icons/icon16-focus.png` | icon | PNG RGBA (594 B) | 16×16 | focus-state variant, not referenced | optional | — |
| `icons/icon32-focus.png` | icon | PNG RGBA (1 258 B) | 32×32 | focus-state variant, not referenced | optional | — |
| `icons/icon48-focus.png` | icon | PNG RGBA (1 814 B) | 48×48 | focus-state variant, not referenced | optional | — |
| `icons/icon96-focus.png` | icon | PNG RGBA (3 436 B) | 96×96 | focus-state variant, not referenced | optional | — |
| `icons/icon128-focus.png` | icon | PNG RGBA (5 043 B) | 128×128 | focus-state variant, not referenced | optional | — |
| `icons/icon256-focus.png` | icon | PNG RGBA (8 586 B) | 256×256 | focus-state variant, not referenced | optional | — |
| `icons/icon512-focus.png` | icon | PNG RGBA (18 965 B) | 512×512 | focus-state variant, not referenced | optional | — |
| `icon_compare.png` | dev contact sheet | PNG RGBA (6 431 B) | 280×184 | QA output of `icons/render_icons.py:79-80` | optional | regenerate by running the script |
| `icon_smallcheck.png` | dev contact sheet | PNG RGBA (15 317 B) | 904×616 | QA output of `icons/_smallcheck.py:25-26` | optional | regenerate by running the script |
| `icons/icon.svg` | reference art | SVG (382 B) | 96×96 (`viewBox 0 0 96 96`) | documentary master — see note below | optional | — |
| `icons/icon-focus.svg` | reference art | SVG (658 B) | 96×96 (`viewBox 0 0 96 96`) | documentary master — see note below | optional | — |

**Only `icon48.png` and `icon96.png` actually ship.** `manifest.json` declares no other
size keys (no 16/32/128, no `theme_icons`, no `action`, no `sidebar_action`, no
`web_accessible_resources`), and `build.ps1:14-18` packages exactly those two files.
The remaining 14 PNGs are kept for store listings and for the not-yet-wired
focus-state icon swap.

### Regenerating the icons

The PNGs are **not** rasterised from the SVGs. `icons/render_icons.py:1-6` notes that
no SVG rasteriser was available, so it redraws the same geometry in Pillow at 8×
supersample (`render_icons.py:30` hardcodes the triangle points). The SVGs are kept as
documentation and are **manually** held in sync — if you change the mark, change both.

- `icons/render_icons.py` — 16/32/48/96 in both variants, plus `icon_compare.png`
- `icons/_bigsizes.py` — 128/256/512 in both variants
- `icons/_smallcheck.py` — the magnified QA sheet

No `.psd`/`.xcf` masters exist; the scripts are the source of truth.

## Not assets

- **YouTube thumbnails** are read off the live page and rebuilt as remote
  `i.ytimg.com` URLs (`content.js:395-399`). Nothing is bundled.
- `content.css` contains no `url()` at all — every visual effect is CSS-only.
- `dist/` build zips are gitignored (`.gitignore`: `dist/`, `*.xpi`, `*.zip`,
  `web-ext-artifacts/`, `node_modules/`).
