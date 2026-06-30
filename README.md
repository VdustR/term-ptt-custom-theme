# Term PTT Custom Theme

自訂 [term.ptt.cc](https://term.ptt.cc/) 的終端機配色風格，並可載入自己的 style/webfont。

[Chrome Web Store](https://chromewebstore.google.com/detail/term-ptt-custom-theme/lmanknmemlpnjolgjoffdkmkkeibpfej)

範例：Goph Graph Theme 搭配 [jf open 粉圓](https://github.com/justfont/open-huninn-font)。

![term-ptt-custom-theme](https://vdustr.dev/asset-2022/04-08-term-ptt-custom-theme/graph.png)

## 功能

- 在 `term.ptt.cc` 套用終端機配色風格。
- 瀏覽從 [`mbadolato/iTerm2-Color-Schemes`](https://github.com/mbadolato/iTerm2-Color-Schemes) 轉換而來的 colors presets。
- 調整背景、前景、cursor、selection 與 ANSI 色票。
- 開啟 extension popup 時即時在目前的 `term.ptt.cc` 分頁查看效果，確認後再按 Apply 儲存。
- 使用 WebFont Tags 載入自己的 HTTPS stylesheet、inline CSS、preconnect、style preload 或 font preload。
- 在非 `term.ptt.cc` 頁面點擊 extension 時，切換到既有的 `term.ptt.cc` 分頁；沒有分頁時會開啟新的 `term.ptt.cc`。
- 使用 `Term PTT Default` 回到 `term.ptt.cc` 原始外觀。

設定會儲存在 Chrome extension storage。這個 extension 不會上傳瀏覽紀錄、PTT 內容、帳號資料或使用者輸入內容。

## 字型

`term.ptt.cc` 本身已經有字型 family 設定，所以這個 extension 不直接套用 `font-family`。

如果想在 `term.ptt.cc` 使用自己喜歡的字型，可以搭配 [`VdustR/ptt-font-tool`](https://github.com/VdustR/ptt-font-tool) 製作適合 PTT cell 寬度的字型。完成後可以用本 extension 的 WebFont Tags 載入 webfont，再到 `term.ptt.cc` 內建設定中選擇該字型 family。

## 開發

安裝依賴：

```bash
pnpm install
```

產生 colors、extension icons、extension assets 與 store assets：

```bash
pnpm build
```

跑完整驗證：

```bash
pnpm verify
```

`pnpm verify` 會執行 build、test、extension package、package verifier 與 release preflight。

## Colors Registry

colors registry 來源是 [`mbadolato/iTerm2-Color-Schemes`](https://github.com/mbadolato/iTerm2-Color-Schemes)。
Third-party source notices are tracked in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

Clone upstream repository next to this repository:

```bash
git clone https://github.com/mbadolato/iTerm2-Color-Schemes.git ../iTerm2-Color-Schemes
```

Generate the normalized ANSI color scheme registry:

```bash
pnpm import:colors
```

By default, the importer reads `../iTerm2-Color-Schemes/windowsterminal`. Override the source directory with:

```bash
ITERM2_COLOR_SCHEMES_DIR=vendor/iTerm2-Color-Schemes/windowsterminal pnpm import:colors
```

The generated registry is written to `data/colors.json` and copied into extension assets by `pnpm build`.

## Extension Development

Load the unpacked extension from the `extension/` directory in `chrome://extensions`.

The extension package:

- Injects `assets/color.css` on `https://term.ptt.cc/*`.
- Loads `assets/colors.json`.
- Previews selected color schemes and allowed webfont tags on the current `term.ptt.cc` tab.
- Persists the selected color scheme and webfont tags with `chrome.storage.sync` after Apply.
- Generates PNG extension icons during `pnpm build`.

WebFont Tags is an advanced feature. Paste only style tags and links you trust. Script, iframe, image, arbitrary HTML tags, non-HTTPS links, and event handler attributes are rejected.

## Packaging

Run only the release artifact preflight after packaging:

```bash
pnpm preflight:release
```

The packaging step requires the system `zip` command. On macOS and Linux this is usually available by default; on Windows, run the package step from WSL, Git Bash with `zip` installed, or the GitHub Actions artifact.

Package the extension zip for manual testing or Chrome Web Store upload:

```bash
pnpm package:extension
```

The package is written to `dist/term-ptt-custom-theme.zip`.

Chrome Web Store listing, privacy, permission, asset, and reviewer test notes are in [`docs/chrome-web-store-submission.md`](docs/chrome-web-store-submission.md).
Manual release validation steps are tracked in [`docs/manual-qa.md`](docs/manual-qa.md).
The Chrome Web Store privacy policy text is tracked in [`PRIVACY.md`](PRIVACY.md).

## License

[MIT](https://github.com/VdustR/term-ptt-custom-theme/blob/main/LICENSE) © [ViPro](https://vdustr.dev).
