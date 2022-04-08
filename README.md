# term-ptt-custom-theme

A [Tampermonkey](https://www.tampermonkey.net/) / [Greasemonkey](https://www.greasespot.net/) stylesheet and guide to customize [term.ptt.cc](https://term.ptt.cc/) .

## Usage

Create a script and insert the script:

```js
// ==UserScript==
// @name         PTT Custom Theme
// @description  https://github.com/VdustR/term-ptt-custom-theme
// @version      0.0.0
// @match        https://term.ptt.cc
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

- <https://mayccoll.github.io/Gogh/>

```js
// ==UserScript==
// @name         PTT Gogh Themes
// @description  https://github.com/VdustR/term-ptt-custom-theme
// @version      0.0.0
// @match        https://term.ptt.cc
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

## License

[MIT](https://github.com/VdustR/term-ptt-custom-theme/blob/main/LICENSE) © [ViPro](https://vdustr.dev).
