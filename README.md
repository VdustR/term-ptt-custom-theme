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

## 配色資料

配色資料來源是 [`mbadolato/iTerm2-Color-Schemes`](https://github.com/mbadolato/iTerm2-Color-Schemes)。
第三方來源說明記錄在 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。

把上游 repository clone 到這個 repository 旁邊：

```bash
git clone https://github.com/mbadolato/iTerm2-Color-Schemes.git ../iTerm2-Color-Schemes
```

產生正規化後的 ANSI 配色資料：

```bash
pnpm import:colors
```

預設會讀取 `../iTerm2-Color-Schemes/windowsterminal`。如果要改用其他來源目錄，可以指定：

```bash
ITERM2_COLOR_SCHEMES_DIR=vendor/iTerm2-Color-Schemes/windowsterminal pnpm import:colors
```

產生的資料會寫入 `data/colors.json`，並在執行 `pnpm build` 時複製到 extension assets。

## Extension 開發

在 `chrome://extensions` 從 `extension/` 目錄載入 unpacked extension。

此 extension 套件會：

- 在 `https://term.ptt.cc/*` 注入 `assets/color.css`。
- 載入 `assets/colors.json`。
- 在目前的 `term.ptt.cc` 分頁預覽選取的配色與允許的 WebFont Tags。
- 按下 Apply 後，用 `chrome.storage.sync` 儲存選取的配色與 WebFont Tags。
- 執行 `pnpm build` 時產生 PNG extension icons。

WebFont Tags 是進階功能。請只貼上你信任的 style tags 和 links。script、iframe、image、任意 HTML tags、非 HTTPS links 與 event handler attributes 會被拒絕。

## 打包

打包後只跑 release artifact preflight：

```bash
pnpm preflight:release
```

打包需要系統提供 `zip` command。macOS 和 Linux 通常預設可用；Windows 可以從 WSL、已安裝 `zip` 的 Git Bash，或 GitHub Actions artifact 取得可上傳檔案。

產生可手動測試或上傳 Chrome Web Store 的 extension zip：

```bash
pnpm package:extension
```

產物會寫入 `dist/term-ptt-custom-theme.zip`。

Chrome Web Store listing、privacy、permission、assets 與 reviewer test notes 記錄在 [`docs/chrome-web-store-submission.md`](docs/chrome-web-store-submission.md)。
手動 release 驗證步驟記錄在 [`docs/manual-qa.md`](docs/manual-qa.md)。
Chrome Web Store privacy policy 文字記錄在 [`PRIVACY.md`](PRIVACY.md)。

## 授權

[MIT](https://github.com/VdustR/term-ptt-custom-theme/blob/main/LICENSE) © [ViPro](https://vdustr.dev).
