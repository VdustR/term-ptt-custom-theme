# PTT Retro Theme

- Palette: [gruvbox.css](https://github.com/VdustR/gruvbox.css)
- Font: [Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font) (Set width to 1200)

```js
// ==UserScript==
// @name         PTT Retro Theme
// @description  https://github.com/VdustR/term-ptt-custom-theme/tree/main/theme/retro
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
  addCss(
    "https://cdn.jsdelivr.net/gh/vdustr/term-ptt-custom-theme/theme/retro/style.css"
  );
})();
```
