(function () {
  if (window.__termPttNativeColorsLoaded) {
    document.dispatchEvent(new CustomEvent("term-ptt-custom-theme-native-ready"));
    return;
  }
  window.__termPttNativeColorsLoaded = true;

  const colorKeys = [
    "colorScheme", "customColors", "customDefaultBg", "customDefaultFg",
    "customDefaultLink", "customForcePlainText", "minimumContrast",
  ];
  let desired = null;
  let original = null;
  let app = null;
  let applying = false;
  let appliedColors = null;
  let scheduled = false;
  let retry = null;
  let attempts = 0;

  function sync() {
    clearTimeout(retry);
    retry = null;
    const current = window.app;
    if (!current?.prefValues || typeof current.onValuesPrefChange !== "function") {
      // The content script can run before the site's module initializes.
      if (desired && attempts++ < 100) retry = setTimeout(sync, 100);
      return;
    }
    if (current !== app) {
      app = current;
      original = null;
      app.on?.("term:pref-change", ({ key, value }) => {
        if (app !== current || applying || !original || !colorKeys.includes(key)) return;
        if (JSON.stringify(value) === JSON.stringify(appliedColors?.[key])) return;
        original[key] = Array.isArray(value) ? [...value] : value;
        if (!scheduled) {
          scheduled = true;
          queueMicrotask(() => { scheduled = false; if (desired) sync(); });
        }
      });
    }
    if (!desired && !original) return;
    if (!original) {
      original = Object.fromEntries(colorKeys.map((key) => [key,
        Array.isArray(app.prefValues[key]) ? [...app.prefValues[key]] : app.prefValues[key],
      ]));
    }
    const colors = desired ? {
      colorScheme: "custom", customColors: desired.colors,
      customDefaultBg: desired.background, customDefaultFg: desired.foreground,
      customDefaultLink: desired.link, customForcePlainText: false, minimumContrast: 0,
    } : original;
    appliedColors = colors;
    applying = true;
    try {
      // This applies an in-memory preference update. Never call the site's
      // persistence helper: preview and extension defaults must be reversible.
      app.onValuesPrefChange({ ...app.prefValues, ...colors });
      if (desired) document.documentElement.setAttribute("data-term-ptt-native-colors", "");
      else document.documentElement.removeAttribute("data-term-ptt-native-colors");
    } finally {
      applying = false;
    }
    if (!desired) original = null;
  }

  document.addEventListener("term-ptt-custom-theme-palette", (event) => {
    let value;
    try { value = JSON.parse(event.detail); } catch { return; }
    const hex = (color) => typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color);
    if (value !== null && (!value || !Array.isArray(value.colors) ||
      value.colors.length !== 16 || !value.colors.every(hex) ||
      ![value.background, value.foreground, value.link].every(hex))) return;
    desired = value;
    attempts = 0;
    sync();
  });
  document.dispatchEvent(new CustomEvent("term-ptt-custom-theme-native-ready"));
})();
