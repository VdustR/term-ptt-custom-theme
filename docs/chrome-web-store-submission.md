# Chrome Web Store Submission Guide

This document tracks the submission fields for the Chrome Web Store item.

References:

- [Chrome Web Store publish flow](https://developer.chrome.com/docs/webstore/publish)
- [Store listing fields and graphic assets](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Image requirements](https://developer.chrome.com/docs/webstore/images)
- [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Program policies](https://developer.chrome.com/docs/webstore/program-policies)

## Publisher Account

Chrome Web Store submission requires a registered CWS developer account and a one-time registration fee. Register from the Chrome Web Store Developer Dashboard before uploading the first package.

## Package

- Zip file: `dist/term-ptt-custom-theme.zip`
- Manifest name: `Term PTT Custom Theme`
- Manifest version: `0.1.0`

Build before upload:

```bash
pnpm verify
```

The command includes the package verifier and release artifact preflight. Run the manual release checklist in `docs/manual-qa.md` before submitting a package for review.

The `Verify` GitHub Actions workflow uploads the same publishable files as artifacts:

- `chrome-extension-package`: contains `dist/term-ptt-custom-theme.zip`.
- `chrome-web-store-assets`: contains `store-assets/small-promo-440x280.png` and `store-assets/screenshots/*.png`.

## Public Store Listing Copy

Use Traditional Chinese for the public Chrome Web Store listing. Keep reviewer-only explanations in English.

### Listing Language

Chinese (Traditional)

### Name

Term PTT Custom Theme

### Short Description

在 term.ptt.cc 預覽並套用終端機配色與字型偏好。

### Detailed Description

Term PTT Custom Theme 是給 `term.ptt.cc` 使用的外觀調整工具。

你可以在 extension popup 裡瀏覽終端機配色 presets 和字型偏好，直接在目前的 `term.ptt.cc` 分頁即時預覽。確認效果後按下 Apply，之後重新開啟 PTT 時會自動套用同一組設定。

目前支援：

- 從 `mbadolato/iTerm2-Color-Schemes` 轉換而來的多組終端機 colors。
- PTT 預設字型與 retro pixel font fallback stack。
- 套用前 live preview。
- `Term PTT Default` 可回到 `term.ptt.cc` 原始外觀。

Extension 只在 `https://term.ptt.cc/*` 執行，設定儲存在 Chrome extension storage，不會上傳你的瀏覽紀錄、帳號資料或 PTT 內容。

Third-party source notices are tracked in `THIRD_PARTY_NOTICES.md`.

## Reviewer Reference

## Single Purpose

Customize terminal colors and font preferences on term.ptt.cc.

## Permission Justifications

### `storage`

Stores the user's selected color scheme and selected font preference in Chrome extension storage. The extension uses this so the chosen appearance persists and can be restored on later visits.

### `https://term.ptt.cc/*`

Allows the content script and stylesheet to run only on `term.ptt.cc`, where the extension previews and applies the selected terminal appearance.

## Remote Code

No remote code is executed by the extension.

The extension package contains the JavaScript, CSS, icons, color registry, and font registry it runs.

## Data Use

This extension does not collect, sell, or share user data.

Privacy policy source path:

```text
PRIVACY.md
```

Use the public repository URL for `PRIVACY.md` as the Chrome Web Store privacy policy URL after the repository is public.

Stored data is limited to:

- Selected color scheme id, name, base preset id, and color values.
- Selected font id, name, and fallback stack.

The popup reads the active tab URL to decide whether preview is available on `term.ptt.cc`. The extension does not send browsing activity, terminal content, account data, or page contents to a server controlled by this project.

## Store Listing Assets

Official Chrome Web Store docs list these relevant asset requirements:

- Extension icon: 128x128 PNG in the extension package. Current package includes `extension/icons/icon128.png`.
- Screenshot: at least one 1280x800 or 640x400 screenshot. Current screenshots:
  - `store-assets/screenshots/01-custom-theme.png`
  - `store-assets/screenshots/02-retro-theme.png`
- Small promo tile: 440x280 PNG or JPEG. Current asset: `store-assets/small-promo-440x280.png`.
- Marquee promo tile: 1400x560 PNG or JPEG. Optional.
- YouTube feature video: optional.

The screenshots are adapted from the original public theme README images and should be reviewed before upload.

## Review Test Instructions

No credentials are required.

1. Install the uploaded extension package.
2. Open `https://term.ptt.cc/`.
3. Open the extension popup.
4. Select a color preset.
5. Select a font preference.
6. Confirm that preview changes the active `term.ptt.cc` tab before saving.
7. Click Apply.
8. Reload `term.ptt.cc` and confirm the selected appearance is restored.
9. Select `Term PTT Default` for colors and font.
10. Click Apply.
11. Reload `term.ptt.cc` and confirm the original site appearance is restored.
