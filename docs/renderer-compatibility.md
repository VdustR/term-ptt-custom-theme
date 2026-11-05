# Terminal renderer compatibility

Version 0.2.1 supports the current Canvas and DOM terminal renderers. Colors
are applied through the site's in-memory custom-palette preferences. The
extension does not switch rendering engines or write website preferences to
local storage. Extension settings continue to use Chrome extension storage.

The extension temporarily owns the color preferences while a palette is active.
Closing an unapplied preview restores the saved extension palette. Selecting
`Term PTT Default` restores the website's color preferences. Native color changes
made while a palette is active are retained for that restoration; unrelated
preferences, including fonts and rendering engine, remain under website control.

The legacy class stylesheet is active only while an extension palette is active
and the native renderer interface is unavailable. On current versions, the
website owns ANSI foregrounds, backgrounds, split-character colors, links, and
Canvas repainting. Cursor styling remains a CSS override. Selection color
customization applies to DOM text selection; the current Canvas renderer draws
its selection with a fixed upstream color.

## Verification evidence

Observed on November 5, 2026 (Asia/Taipei):

- [Live application bundle](https://term.ptt.cc/assets/index-CFfr3IE9.js), with
  embedded source revision `c782dff8`, exposes `window.app.onValuesPrefChange`,
  `prefValues`, and the `term:pref-change` event. Its custom color preferences
  update the shared Canvas palette and CSS variables, then redraw the terminal.
- [Live stylesheet](https://term.ptt.cc/assets/index-CAhZmilb.css) uses numeric
  `--term-color-*` and `--term-fg-*` properties, including pseudo-elements for
  split characters. Legacy class overrides alone cannot update Canvas pixels.
- Before the fix, a CSS background of `#123456` left the Canvas background pixel
  black. With the packaged extension loaded in Chrome for Testing, selecting
  Catppuccin Mocha produced `[30, 30, 46, 255]` in the Canvas background pixel;
  closing the preview restored the original black pixel.
- The real extension popup passed preview, close-to-restore, draft reopening,
  Apply followed by reload, Canvas-to-DOM switching, custom style preview and
  persistence, and default restoration followed by reload. DOM mode rendered
  background `rgb(30, 30, 46)` and foreground `rgb(205, 214, 244)`.
- Node regression tests cover palette validation, delayed website startup,
  cancellation before startup, repeated preview and bridge injection, native
  preference updates, and content-script palette messages.

The site integration is not a documented public API. Recheck these premises
when the site's renderer or preference implementation changes. Browser checks
used a fresh test profile without a PTT login; logged-in article interaction and
physical mobile devices were not tested.

## Focused release check

1. Load `extension/` unpacked in a browser that supports unpacked extensions.
2. Open `https://term.ptt.cc/` with the default Canvas renderer.
3. Select a preset in the extension popup and confirm the terminal changes.
4. Close without Apply and confirm the saved appearance returns.
5. Reopen, Apply, and reload; confirm the saved palette returns.
6. Switch the site's renderer to DOM and verify the same palette.
7. Preview and apply trusted style tags, then reload to confirm restoration.
8. Select `Term PTT Default`, clear style tags, and Apply. Confirm the native
   palette and custom style removal both survive reload.
