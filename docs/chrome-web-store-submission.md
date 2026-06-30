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
- Manifest version: `0.2.0`

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

自訂 term.ptt.cc 的終端機配色風格，並可載入自己的 style/webfont。

### Detailed Description

Term PTT Custom Theme 是專為 `term.ptt.cc` 設計的外觀自訂工具，讓 PTT 網頁版可以使用更接近終端機的配色風格。

你可以在 extension popup 裡瀏覽多組 terminal color presets，直接套用到目前的 `term.ptt.cc` 分頁。選到喜歡的配色後，也可以進一步微調背景、前景、cursor、selection 與 ANSI 色票，讓畫面更符合自己的閱讀習慣。

如果想搭配自己的 webfont 或 CSS，也可以使用 WebFont Tags 載入 HTTPS stylesheet、inline CSS、preconnect、style preload 或 font preload。字型 family 的選擇仍使用 `term.ptt.cc` 內建設定完成；如果需要把自己喜歡的字型調整成更適合 PTT cell 寬度的版本，可以搭配 `VdustR/ptt-font-tool` 使用。

主要功能：

- 瀏覽並套用多組終端機配色 presets。
- 自訂背景、前景、cursor、selection 與 ANSI 色票。
- 套用前可直接在目前的 `term.ptt.cc` 分頁即時預覽並確認效果。
- 支援 WebFont Tags 載入自訂 style/webfont 資源。
- 在非 `term.ptt.cc` 頁面點擊 extension 時，可切換到既有的 `term.ptt.cc` 分頁；沒有分頁時會開啟新的 `term.ptt.cc`。
- 使用 `Term PTT Default` 回到 `term.ptt.cc` 原始外觀。

開源資訊：

Term PTT Custom Theme 是開源專案，採用 MIT License。

Source code:

```text
https://github.com/VdustR/term-ptt-custom-theme
```

PTT font tool:

```text
https://github.com/VdustR/ptt-font-tool
```

Color presets 主要來自 `mbadolato/iTerm2-Color-Schemes`：

```text
https://github.com/mbadolato/iTerm2-Color-Schemes
```

隱私與資料：

Term PTT Custom Theme 只在 `https://term.ptt.cc/*` 執行。設定儲存在 Chrome extension storage，不會上傳瀏覽紀錄、PTT 內容、帳號資料或使用者輸入內容。所有自訂 style/webfont tags 都由使用者自行提供，請只貼上你信任的資源。

## Reviewer Reference

## Single Purpose

Customize terminal colors and optional custom style loading on term.ptt.cc.

## Permission Justifications

### `storage`

Stores the user's selected color scheme and optional custom style tags in Chrome extension storage. The extension uses this so the chosen appearance persists and can be restored on later visits.

### `scripting`

Injects the extension's packaged content scripts into an already-open `term.ptt.cc` tab when Chrome has not attached them yet, such as immediately after installing or updating the extension. This keeps live preview and Apply working without requiring a manual page reload.

### `https://term.ptt.cc/*`

Allows the content script and stylesheet to run only on `term.ptt.cc`, where the extension previews and applies the selected terminal appearance.

## Remote Code

No remote JavaScript or WebAssembly is executed by the extension.

The extension package contains the JavaScript, CSS, icons, and color registry it runs. User-provided WebFont Tags are restricted to `<style>` tags and HTTPS style/font-related `<link>` tags. This advanced field can change the `term.ptt.cc` page, so users should paste only style tags and links they trust. Script, arbitrary HTML tags, event handler attributes, and non-HTTPS links are rejected.

## Data Use

This extension does not collect, sell, or share user data.

Privacy policy source path:

```text
PRIVACY.md
```

Use the public repository URL for `PRIVACY.md` as the Chrome Web Store privacy policy URL after the repository is public.

Stored data is limited to:

- Selected color scheme id, name, base preset id, and color values.
- Optional custom style/webfont tags entered by the user.

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
5. Add an inline style, stylesheet `link`, or style/font preload `link` tag in WebFont Tags.
6. Confirm that preview changes the active `term.ptt.cc` tab before saving.
7. Click Apply.
8. Reload `term.ptt.cc` and confirm the selected appearance is restored.
9. Select `Term PTT Default` for colors and clear Webfont Tags.
10. Click Apply.
11. Reload `term.ptt.cc` and confirm the original site appearance is restored.
