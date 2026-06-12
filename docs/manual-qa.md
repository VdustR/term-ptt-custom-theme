# Manual QA Checklist

Use this checklist before uploading a Chrome Web Store package.

## Local Preflight

- Run `pnpm verify`.
- Confirm release preflight prints `Release preflight passed`.
- Confirm `dist/term-ptt-custom-theme.zip` exists after the command finishes.
- Confirm `store-assets/small-promo-440x280.png` exists.

## Unpacked Extension Live Preview

This is the source-of-truth visual check because the real PTT terminal DOM is the only supported preview surface.

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked and select the `extension/` directory.
4. Open `https://term.ptt.cc/`.
5. Open the `Term PTT Custom Theme` extension popup.
6. Select a colors preset.
7. Select each available font preference.
8. Confirm the active `term.ptt.cc` tab updates while the popup is open.
9. Click Apply.
10. Reload `https://term.ptt.cc/`.
11. Confirm the applied colors and font preference are restored.
12. Open the popup again, change the colors preset, then close the popup without applying.
13. Confirm the page restores the saved appearance after the popup disconnects.
14. Click Reset and confirm the preview returns to the saved appearance.

Expected result:

- Colors change on the real `term.ptt.cc` terminal.
- ANSI foreground and background colors remain readable.
- Font fallback changes do not break terminal column alignment.
- Popup controls stay usable and do not show a connection error on `term.ptt.cc`.
- The popup shows a clear unavailable state on non-PTT tabs.

## Chrome Web Store Assets

- Confirm the 128x128 icon is present at `extension/icons/icon128.png`.
- Confirm the small promo tile is present at `store-assets/small-promo-440x280.png`.
- Confirm all screenshots in `store-assets/screenshots/` are 1280x800 PNG files.
- Confirm screenshots do not expose personal account data or private terminal content.

## Release Criteria

- `pnpm verify` passes locally.
- Unpacked extension live preview passes on the real `term.ptt.cc` page.
- Store assets satisfy the Chrome Web Store image requirements.
- The Chrome Web Store submission guide is copied into the listing fields.
- The public `PRIVACY.md` URL is available before review submission.
