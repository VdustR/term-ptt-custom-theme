(function () {
if (globalThis.__termPttCustomThemeContentLoaded) {
  return;
}

globalThis.__termPttCustomThemeContentLoaded = true;

const STYLE_ID = "term-ptt-custom-theme-colors-active";

let savedAppearance = null;
let savedWebfontTags = "";
let previewingScheme = false;
let previewingWebfontTags = false;
let webfontTagNodes = [];

function applyAppearance(appearance) {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.documentElement.appendChild(style);
  }
  style.textContent = TermPttColors.schemeToCssVariables(appearance.scheme, appearance.metadata);
}

function clearScheme() {
  document.getElementById(STYLE_ID)?.remove();
}

function applyWebfontTags(markup) {
  clearWebfontTags();

  if (!markup.trim()) {
    return;
  }

  const target = document.head ?? document.documentElement;
  try {
    webfontTagNodes = TermPttWebfontTags.createElements(document, markup);
  } catch {
    webfontTagNodes = [];
    return;
  }

  for (const node of webfontTagNodes) {
    target.appendChild(node);
  }
}

function clearWebfontTags() {
  for (const node of webfontTagNodes) {
    node.remove();
  }
  webfontTagNodes = [];
}

function restoreSavedAppearance() {
  previewingScheme = false;
  previewingWebfontTags = false;

  if (savedAppearance) {
    applyAppearance(savedAppearance);
  } else {
    clearScheme();
  }

  applyWebfontTags(savedWebfontTags);
}

async function loadSavedAppearance() {
  const { selectedScheme, selectedWebfontTags } = await chrome.storage.sync.get([
    "selectedScheme",
    "selectedWebfontTags",
  ]);
  savedAppearance = selectedScheme?.scheme ? selectedScheme : null;
  savedWebfontTags = selectedWebfontTags ?? "";

  if (savedAppearance) {
    applyAppearance(savedAppearance);
  }

  applyWebfontTags(savedWebfontTags);
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "term-ptt-custom-theme-preview") {
    return;
  }

  port.onMessage.addListener((message) => {
    if (message.type === "ping") {
      port.postMessage({ type: "preview-ready" });
      return;
    }

    if (message.type === "preview-scheme") {
      previewingScheme = true;
      applyAppearance(message.preset);
      port.postMessage({ type: "preview-applied", id: message.preset.id });
      return;
    }

    if (message.type === "preview-clear-scheme") {
      previewingScheme = true;
      clearScheme();
      port.postMessage({ type: "scheme-preview-cleared" });
      return;
    }

    if (message.type === "preview-webfont-tags") {
      previewingWebfontTags = true;
      applyWebfontTags(message.tags ?? "");
      port.postMessage({ type: "webfont-tags-preview-applied" });
      return;
    }

    if (message.type === "preview-clear-webfont-tags") {
      previewingWebfontTags = true;
      clearWebfontTags();
      port.postMessage({ type: "webfont-tags-preview-cleared" });
      return;
    }

    if (message.type === "apply-scheme") {
      previewingScheme = false;
      savedAppearance = message.preset;
      applyAppearance(savedAppearance);
      port.postMessage({ type: "colors-applied", id: message.preset.id });
      return;
    }

    if (message.type === "apply-clear-scheme") {
      previewingScheme = false;
      savedAppearance = null;
      clearScheme();
      port.postMessage({ type: "colors-cleared" });
      return;
    }

    if (message.type === "apply-webfont-tags") {
      previewingWebfontTags = false;
      savedWebfontTags = message.tags ?? "";
      applyWebfontTags(savedWebfontTags);
      port.postMessage({ type: "webfont-tags-applied" });
      return;
    }

    if (message.type === "apply-clear-webfont-tags") {
      previewingWebfontTags = false;
      savedWebfontTags = "";
      clearWebfontTags();
      port.postMessage({ type: "webfont-tags-cleared" });
      return;
    }

    if (message.type === "reset-preview") {
      restoreSavedAppearance();
      port.postMessage({ type: "preview-reset" });
    }
  });

  port.onDisconnect.addListener(() => {
    if (previewingScheme || previewingWebfontTags) {
      restoreSavedAppearance();
    }
  });
});

loadSavedAppearance();
})();
