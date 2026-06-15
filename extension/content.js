const STYLE_ID = "term-ptt-custom-theme-colors-active";
const FONT_STYLE_ID = "term-ptt-custom-theme-font-active";

let savedScheme = null;
let savedFont = null;
let previewingScheme = false;
let previewingFont = false;

function applyScheme(scheme) {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.documentElement.appendChild(style);
  }
  style.textContent = TermPttColors.schemeToCssVariables(scheme);
}

function clearScheme() {
  document.getElementById(STYLE_ID)?.remove();
}

function applyFont(font) {
  let style = document.getElementById(FONT_STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = FONT_STYLE_ID;
    document.documentElement.appendChild(style);
  }
  style.textContent = TermPttFonts.fontToCss(font);
}

function clearFont() {
  document.getElementById(FONT_STYLE_ID)?.remove();
}

function restoreSavedAppearance() {
  previewingScheme = false;
  previewingFont = false;

  if (savedScheme) {
    applyScheme(savedScheme);
  } else {
    clearScheme();
  }

  if (savedFont) {
    applyFont(savedFont);
  } else {
    clearFont();
  }
}

async function loadSavedAppearance() {
  const { selectedScheme, selectedFont } = await chrome.storage.sync.get([
    "selectedScheme",
    "selectedFont",
  ]);
  savedScheme = selectedScheme?.scheme ?? null;
  savedFont = selectedFont ?? null;

  if (savedScheme) {
    applyScheme(savedScheme);
  }

  if (savedFont) {
    applyFont(savedFont);
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "term-ptt-custom-theme-preview") {
    return;
  }

  port.onMessage.addListener((message) => {
    if (message.type === "preview-scheme") {
      previewingScheme = true;
      applyScheme(message.preset.scheme);
      port.postMessage({ type: "preview-applied", id: message.preset.id });
      return;
    }

    if (message.type === "preview-clear-scheme") {
      previewingScheme = true;
      clearScheme();
      port.postMessage({ type: "scheme-preview-cleared" });
      return;
    }

    if (message.type === "preview-font") {
      previewingFont = true;
      applyFont(message.font);
      port.postMessage({ type: "font-preview-applied", id: message.font.id });
      return;
    }

    if (message.type === "preview-clear-font") {
      previewingFont = true;
      clearFont();
      port.postMessage({ type: "font-preview-cleared" });
      return;
    }

    if (message.type === "apply-scheme") {
      previewingScheme = false;
      savedScheme = message.preset.scheme;
      applyScheme(savedScheme);
      port.postMessage({ type: "colors-applied", id: message.preset.id });
      return;
    }

    if (message.type === "apply-clear-scheme") {
      previewingScheme = false;
      savedScheme = null;
      clearScheme();
      port.postMessage({ type: "colors-cleared" });
      return;
    }

    if (message.type === "apply-font") {
      previewingFont = false;
      savedFont = message.font;
      applyFont(message.font);
      port.postMessage({ type: "font-applied", id: message.font.id });
      return;
    }

    if (message.type === "apply-clear-font") {
      previewingFont = false;
      savedFont = null;
      clearFont();
      port.postMessage({ type: "font-cleared" });
      return;
    }

    if (message.type === "reset-preview") {
      restoreSavedAppearance();
      port.postMessage({ type: "preview-reset" });
    }
  });

  port.onDisconnect.addListener(() => {
    if (previewingScheme || previewingFont) {
      restoreSavedAppearance();
    }
  });
});

loadSavedAppearance();
