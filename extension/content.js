const STYLE_ID = "term-ptt-custom-theme-colors-active";

let savedScheme = null;
let savedWebfontTags = "";
let previewingScheme = false;
let previewingWebfontTags = false;
let webfontTagNodes = [];

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

  if (savedScheme) {
    applyScheme(savedScheme);
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
  savedScheme = selectedScheme?.scheme ?? null;
  savedWebfontTags = selectedWebfontTags ?? "";

  if (savedScheme) {
    applyScheme(savedScheme);
  }

  applyWebfontTags(savedWebfontTags);
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
