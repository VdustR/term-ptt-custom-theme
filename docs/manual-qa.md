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
6. Confirm a fresh install selects `Term PTT Default` for colors, keeps Webfont Tags empty, and has Apply disabled.
7. Select a colors preset.
8. Open Webfont Tags and insert the webfont template.
9. Confirm the active `term.ptt.cc` tab updates while the popup is open.
10. Click Apply and confirm the popup closes after the page acknowledges the applied appearance.
11. Reload `https://term.ptt.cc/`.
12. Confirm the applied colors and webfont tags are restored.
13. Select `Term PTT Default` for colors, clear Webfont Tags, then click Apply.
14. Reload `https://term.ptt.cc/` and confirm the extension color and webfont tags are not present.
15. Open the popup again, change the colors preset, then close the popup without applying.
16. Confirm the page restores the saved appearance after the popup disconnects.
17. Reopen the popup and confirm the unsaved draft selection is restored and previewed again.
18. Apply a preset that is far down the preset list.
19. Reopen the popup and confirm the applied preset row is selected and scrolled into view.
20. Click one of the current palette swatches and confirm the native color picker opens directly.
21. Change that single color value.
22. Confirm the page updates immediately, the popup shows Modified, and Apply becomes enabled.
23. Click Reset next to Modified and confirm the 16 colors return to the selected base preset without saving.
24. Change a color again, close the popup without applying, and confirm the page restores the saved appearance.
25. Reopen the popup and confirm the unsaved color edit draft is restored and previewed again.
26. Click Apply, reload `https://term.ptt.cc/`, and confirm the customized 16-color palette is restored.

Expected result:

- Colors change on the real `term.ptt.cc` terminal.
- ANSI foreground and background colors remain readable.
- Webfont Tags accept trusted-by-user style tags and HTTPS style/font-related link tags.
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
