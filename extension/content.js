const STYLE_ID = "term-ptt-custom-theme-colors-active";
const FONT_STYLE_ID = "term-ptt-custom-theme-font-active";

let savedColors = null;
let savedFont = null;
let previewingColors = false;
let previewingFont = false;

function applyColors(colors) {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.documentElement.appendChild(style);
  }
  style.textContent = TermPttColors.colorsToCssVariables(colors);
}

function clearColors() {
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
  previewingColors = false;
  previewingFont = false;

  if (savedColors) {
    applyColors(savedColors);
  } else {
    clearColors();
  }

  if (savedFont) {
    applyFont(savedFont);
  } else {
    clearFont();
  }
}

async function loadSavedAppearance() {
  const { selectedColors, selectedFont } = await chrome.storage.sync.get([
    "selectedColors",
    "selectedFont",
  ]);
  savedColors = selectedColors?.colors ?? null;
  savedFont = selectedFont ?? null;

  if (savedColors) {
    applyColors(savedColors);
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
    if (message.type === "preview-colors") {
      previewingColors = true;
      applyColors(message.preset.colors);
      port.postMessage({ type: "preview-applied", id: message.preset.id });
      return;
    }

    if (message.type === "preview-font") {
      previewingFont = true;
      applyFont(message.font);
      port.postMessage({ type: "font-preview-applied", id: message.font.id });
      return;
    }

    if (message.type === "apply-colors") {
      previewingColors = false;
      savedColors = message.preset.colors;
      applyColors(message.preset.colors);
      port.postMessage({ type: "colors-applied", id: message.preset.id });
      return;
    }

    if (message.type === "apply-font") {
      previewingFont = false;
      savedFont = message.font;
      applyFont(message.font);
      port.postMessage({ type: "font-applied", id: message.font.id });
      return;
    }

    if (message.type === "reset-preview") {
      restoreSavedAppearance();
      port.postMessage({ type: "preview-reset" });
    }
  });

  port.onDisconnect.addListener(() => {
    if (previewingColors || previewingFont) {
      restoreSavedAppearance();
    }
  });
});

loadSavedAppearance();
