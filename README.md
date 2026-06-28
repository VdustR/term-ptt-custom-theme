# Term PTT Custom Theme

A Chrome extension and [Tampermonkey](https://www.tampermonkey.net/) / [Greasemonkey](https://www.greasespot.net/) stylesheet guide to customize [term.ptt.cc](https://term.ptt.cc/).

Sample with Goph Graph Theme + [jf open 粉圓](https://github.com/justfont/open-huninn-font):

![term-ptt-custom-theme](https://vdustr.dev/asset-2022/04-08-term-ptt-custom-theme/graph.png)

## Userscript Usage

Create a script and insert the script:

```js
// ==UserScript==
// @name         Term PTT Custom Theme
// @description  https://github.com/VdustR/term-ptt-custom-theme
// @version      0.0.0
// @match        https://term.ptt.cc/
// ==/UserScript==

(function () {
  "use strict";
  function addCss(href) {
    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", href);
    document.body.appendChild(link);
  }
  function setColor(color) {
    const style = document.createElement("style");
    style.innerText = `:root {${Object.entries(color)
      .map(([key, value]) => `--term-color-${key}: ${value};`)
      .join("")}}`.replace(/[\s\n]/g, "");
    document.body.appendChild(style);
  }
  addCss("https://cdn.jsdelivr.net/gh/vdustr/term-ptt-custom-theme/color.css");
  // SolarizedDark for example.
  setColor({
    black: "#073642",
    maroon: "#dc322f",
    green: "#859900",
    olive: "#cf9a6b",
    navy: "#268bd2",
    purple: "#d33682",
    teal: "#2aa198",
    silver: "#eee8d5",
    grey: "#657b83",
    red: "#d87979",
    "0f0": "#88cf76",
    ff0: "#657b83",
    "00f": "#2699ff",
    f0f: "#d33682",
    "0ff": "#43b8c3",
    fff: "#fdf6e3",
  });
})();
```

## Useful Links

### Gogh

> Color Scheme for Gnome Terminal, Pantheon Terminal, Tilix, and XFCE4 Terminal
>
> Color Schemes For Ubuntu, Linux Mint, Elementary OS and all distributions that use Gnome Terminal, Pantheon Terminal, Tilix, or XFCE4 Terminal; initially inspired by Elementary OS Luna. Also works on iTerm for macOS.

- [Gogh](https://mayccoll.github.io/Gogh/)

```js
// ==UserScript==
// @name         PTT Gogh Themes
// @description  https://github.com/VdustR/term-ptt-custom-theme
// @version      0.0.0
// @match        https://term.ptt.cc/
// ==/UserScript==

(async function () {
  "use strict";
  function addCss(href) {
    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", href);
    document.body.appendChild(link);
  }
  function setColor(color) {
    const style = document.createElement("style");
    style.innerText = `:root {${Object.entries(color)
      .map(([key, value]) => `--term-color-${key}: ${value};`)
      .join("")}}`.replace(/[\s\n]/g, "");
    document.body.appendChild(style);
  }
  async function setGoghTheme(themeName) {
    const { themes } = await (
      await fetch("https://cdn.jsdelivr.net/gh/Mayccoll/Gogh/data/themes.json")
    ).json();
    const theme = themes.find(({ name }) => name === themeName);
    if (!theme) throw new Error(`Theme ${themeName} not found`);
    setColor({
      // black: theme.background,
      black: theme.black,
      maroon: theme.red,
      green: theme.green,
      olive: theme.yellow,
      navy: theme.blue,
      purple: theme.purple,
      teal: theme.cyan,
      silver: theme.white,
      grey: theme.brightBlack,
      red: theme.brightRed,
      "0f0": theme.brightGreen,
      ff0: theme.brightYellow,
      "00f": theme.brightBlue,
      f0f: theme.brightPurple,
      "0ff": theme.brightCyan,
      fff: theme.brightWhite,
    });
  }
  addCss("https://cdn.jsdelivr.net/gh/vdustr/term-ptt-custom-theme/color.css");
  // Replace with the theme name you want
  await setGoghTheme("Grape");
})();
```

### Themes Based on term-ptt-custom-theme

- [Retro](https://github.com/VdustR/term-ptt-retro-theme)

## Chrome Extension

This repository includes a Manifest V3 extension for terminal colors and optional webfont tags on `term.ptt.cc`.

### Colors Registry

The generated colors registry is based on [`mbadolato/iTerm2-Color-Schemes`](https://github.com/mbadolato/iTerm2-Color-Schemes).
Third-party source notices are tracked in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

Clone that repository next to this repository:

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

The generated registry is written to `data/colors.json` and copied into extension assets by:

```bash
pnpm build
```

Run the full local verification gate:

```bash
pnpm verify
```

Run only the release artifact preflight after packaging:

```bash
pnpm preflight:release
```

The packaging step requires the system `zip` command. On macOS and Linux this is
usually available by default; on Windows, run the package step from WSL, Git Bash
with `zip` installed, or the GitHub Actions artifact.

Package the extension zip for manual testing or Chrome Web Store upload:

```bash
pnpm package:extension
```

The package is written to `dist/term-ptt-custom-theme.zip`.

Chrome Web Store listing, privacy, permission, asset, and reviewer test notes are in [`docs/chrome-web-store-submission.md`](docs/chrome-web-store-submission.md).
Manual release validation steps are tracked in [`docs/manual-qa.md`](docs/manual-qa.md).
The Chrome Web Store privacy policy text is tracked in [`PRIVACY.md`](PRIVACY.md).

### Extension Development

Load the unpacked extension from the `extension/` directory in `chrome://extensions`.

The extension:

- Injects `assets/color.css` on `https://term.ptt.cc/*`.
- Loads `assets/colors.json`.
- Previews selected color schemes and allowed webfont tags on the current `term.ptt.cc` tab.
- Persists the selected color scheme and webfont tags with `chrome.storage.sync` after Apply.
- Generates PNG extension icons during `pnpm build`.

Webfont tags load user-supplied webfont resources through trusted font stylesheet links, inline `@font-face` rules, preconnect hints, or font preloads. The extension does not apply `font-family`; choose the loaded family in `term.ptt.cc` settings. Script, iframe, image, arbitrary HTML tags, non-HTTPS links, event handler attributes, and inline style rules outside `@font-face` are rejected.

### Current Limits

- Colors are implemented from the generated iTerm2 registry.
- Packs are intentionally out of scope.
- Chrome Web Store screenshots currently use the original public custom-theme and retro-theme samples; review them before submission.

## License

[MIT](https://github.com/VdustR/term-ptt-custom-theme/blob/main/LICENSE) © [ViPro](https://vdustr.dev).
