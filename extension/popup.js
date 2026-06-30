const statusNode = document.getElementById("status");
const repositoryButton = document.getElementById("repositoryButton");
const controlsNode = document.getElementById("controls");
const searchInput = document.getElementById("searchInput");
const webfontTagsPanel = document.getElementById("webfontTagsPanel");
const webfontTagsInput = document.getElementById("webfontTagsInput");
const webfontTagsSummary = document.getElementById("webfontTagsSummary");
const webfontTagsStatus = document.getElementById("webfontTagsStatus");
const insertWebfontTemplateButton = document.getElementById("insertWebfontTemplateButton");
const clearWebfontTagsButton = document.getElementById("clearWebfontTagsButton");
const currentPaletteNameNode = document.getElementById("currentPaletteName");
const modifiedBadgeNode = document.getElementById("modifiedBadge");
const resetButton = document.getElementById("resetButton");
const paletteStripNode = document.getElementById("paletteStrip");
const colorListNode = document.getElementById("colorList");
const applyButton = document.getElementById("applyButton");

const REPOSITORY_URL = "https://github.com/VdustR/term-ptt-custom-theme";
const TERM_PTT_URL = "https://term.ptt.cc/";
const TERM_PTT_PATTERN = "https://term.ptt.cc/*";
const DEFAULT_COLORS_ID = "term-ptt-default";
const APPLY_ACK_TIMEOUT_MS = 1000;
const WEBFONT_TEMPLATE = `<style>
@font-face {
  font-family: "My PTT Font";
  src: url("https://example.com/my-font.woff2") format("woff2");
  font-display: swap;
}
</style>`;
const defaultColorsPreset = TermPttAppearanceState.defaultColorsPreset ?? {
  id: DEFAULT_COLORS_ID,
  name: "Term PTT Default",
  sourcePath: "term.ptt.cc default colors",
  scheme: null,
  metadata: { isDefault: true },
};

const schemeKeys = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "purple",
  "cyan",
  "white",
  "brightBlack",
  "brightRed",
  "brightGreen",
  "brightYellow",
  "brightBlue",
  "brightPurple",
  "brightCyan",
  "brightWhite",
];

const schemeLabels = {
  black: "Black",
  red: "Red",
  green: "Green",
  yellow: "Yellow",
  blue: "Blue",
  purple: "Purple",
  cyan: "Cyan",
  white: "White",
  brightBlack: "Bright Black",
  brightRed: "Bright Red",
  brightGreen: "Bright Green",
  brightYellow: "Bright Yellow",
  brightBlue: "Bright Blue",
  brightPurple: "Bright Purple",
  brightCyan: "Bright Cyan",
  brightWhite: "Bright White",
};

const defaultPttScheme = {
  black: "#000000",
  red: "#800000",
  green: "#008000",
  yellow: "#808000",
  blue: "#000080",
  purple: "#800080",
  cyan: "#008080",
  white: "#c0c0c0",
  brightBlack: "#808080",
  brightRed: "#ff0000",
  brightGreen: "#00ff00",
  brightYellow: "#ffff00",
  brightBlue: "#0000ff",
  brightPurple: "#ff00ff",
  brightCyan: "#00ffff",
  brightWhite: "#ffffff",
};

const pttBrightForegroundKeys = [
  "brightBlack",
  "brightRed",
  "brightGreen",
  "brightYellow",
  "brightBlue",
  "brightPurple",
  "brightCyan",
  "brightWhite",
];

const pttDarkBackgroundKeys = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "purple",
  "cyan",
  "brightBlack",
];

const pttPreviewSampleGroups = [
  {
    label: "黑底",
    cells: pttBrightForegroundKeys.map((key) => ({
      text: "文",
      fgKey: key,
      bgKey: "black",
      pttClass: `q${schemeKeys.indexOf(key)} b0/body`,
    })),
  },
  {
    label: "白字",
    cells: pttDarkBackgroundKeys.map((key) => {
      const bgIndex = schemeKeys.indexOf(key);
      return {
        text: "白",
        fgKey: "brightWhite",
        bgKey: key,
        pttClass: `q15 ${bgIndex === 0 ? "b0/body" : `b${bgIndex}`}`,
      };
    }),
  },
];

let activeTab = null;
let port = null;
let registry = [];
let selectedPreset = null;
let savedPreset = null;
let selectedScheme = null;
let savedScheme = null;
let selectedMetadata = {};
let selectedWebfontTags = "";
let savedWebfontTags = "";
let webfontTagsValidation = TermPttWebfontTags.parseWebfontTags("");
let persistDraftTimeout = null;
let webfontPreviewTimeout = null;

repositoryButton.addEventListener("click", openRepository);
window.addEventListener("pagehide", flushPendingDraftWrite);
init();

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tab;

  if (!isTermPttTab(activeTab)) {
    await routeToTermPtt();
    return;
  }

  const [colorsResponse, savedStorage, draftStorage] = await Promise.all([
    fetch("assets/colors.json"),
    chrome.storage.sync.get(["selectedScheme", "selectedWebfontTags"]),
    getAppearanceDraft(),
  ]);
  const colorsRegistry = await colorsResponse.json();
  registry = colorsRegistry.colors;

  const initialState = TermPttAppearanceState.createInitialAppearanceState({
    registry,
    storage: { ...savedStorage, ...draftStorage },
  });

  const savedStoredScheme = savedStorage.selectedScheme ?? null;
  savedPreset = savedStoredScheme
    ? (findPreset(savedStoredScheme.basePresetId ?? savedStoredScheme.id) ?? savedStoredScheme)
    : defaultColorsPreset;
  savedScheme = savedStoredScheme?.scheme ? copyScheme(savedStoredScheme.scheme) : null;
  savedWebfontTags =
    typeof savedStorage.selectedWebfontTags === "string" ? savedStorage.selectedWebfontTags : "";

  connectPreviewPort();

  selectedPreset = initialState.selectedPreset ?? defaultColorsPreset;
  selectedScheme = initialState.selectedScheme ? copyScheme(initialState.selectedScheme) : null;
  selectedMetadata = initialState.selectedMetadata ?? selectedPreset?.metadata ?? {};
  selectedWebfontTags = initialState.selectedWebfontTags ?? "";
  searchInput.value = initialState.query;
  webfontTagsInput.value = selectedWebfontTags;
  webfontTagsPanel.open = selectedWebfontTags.trim() !== "";

  statusNode.textContent = `${registry.length} color presets available`;
  controlsNode.hidden = false;
  bindEvents();
  updateWebfontTagsStatus();
  renderCurrentPalette();
  renderColors({ scrollIntoView: true });
  updateApplyButton();
  previewSelectedAppearance();
}

function isTermPttTab(tab) {
  return Boolean(tab?.id && tab.url?.startsWith(TERM_PTT_URL));
}

async function routeToTermPtt() {
  statusNode.textContent = "Opening term.ptt.cc...";

  try {
    const [targetTab] = await chrome.tabs.query({ url: TERM_PTT_PATTERN });

    if (targetTab?.id) {
      await chrome.tabs.update(targetTab.id, { active: true });
      if (typeof targetTab.windowId === "number" && chrome.windows?.update) {
        try {
          await chrome.windows.update(targetTab.windowId, { focused: true });
        } catch {
          // Window focus is best-effort; the tab activation above is the primary route.
        }
      }
    } else {
      await chrome.tabs.create({ url: TERM_PTT_URL, active: true });
    }

    window.close();
  } catch {
    statusNode.textContent = "Could not open term.ptt.cc.";
  }
}

async function openRepository() {
  try {
    await chrome.tabs.create({ url: REPOSITORY_URL, active: true });
    window.close();
  } catch {
    statusNode.textContent = "Could not open repository.";
  }
}

function getAppearanceDraft() {
  return chrome.storage.session
    ? chrome.storage.session.get(["appearanceDraft"])
    : Promise.resolve({});
}

function bindEvents() {
  searchInput.addEventListener("input", handleSearchInput);
  webfontTagsInput.addEventListener("input", handleWebfontTagsInput);
  insertWebfontTemplateButton.addEventListener("click", insertWebfontTemplate);
  clearWebfontTagsButton.addEventListener("click", clearWebfontTagsInput);
  resetButton.addEventListener("click", resetPaletteToBase);
  applyButton.addEventListener("click", applySelectedPreset);
}

function handleSearchInput() {
  renderColors();
  queuePersistDraft();
}

function renderCurrentPalette() {
  currentPaletteNameNode.textContent = selectedPreset?.name ?? "No preset selected";
  renderPaletteStrip();

  const isModified =
    selectedScheme !== null &&
    TermPttAppearanceState.isModifiedScheme(selectedScheme, selectedPreset?.scheme);
  modifiedBadgeNode.hidden = !isModified;
  resetButton.hidden = !isModified;
}

function renderPaletteStrip() {
  if (!selectedScheme) {
    const note = document.createElement("div");
    note.className = "palette-default-note";
    note.textContent = "Use term.ptt.cc default colors";
    paletteStripNode.replaceChildren(note);
    return;
  }

  paletteStripNode.replaceChildren(...schemeKeys.map(renderPaletteSwatchButton));
}

function renderPaletteSwatchButton(key) {
  const picker = document.createElement("span");
  picker.className = "palette-picker";

  const button = document.createElement("button");
  const value = selectedScheme?.[key] ?? "#000000";
  button.className = "palette-swatch";
  button.type = "button";
  button.dataset.schemeKey = key;
  button.style.backgroundColor = value;
  button.title = `${schemeLabels[key]} ${value}`;
  button.setAttribute("aria-label", `Edit ${schemeLabels[key]} color ${value}`);
  button.addEventListener("click", () => openColorPicker(input));

  const input = document.createElement("input");
  input.id = `palette-${key}`;
  input.className = "palette-color-input";
  input.type = "color";
  input.tabIndex = -1;
  input.value = value;
  input.dataset.schemeKey = key;
  input.setAttribute("aria-hidden", "true");
  input.addEventListener("input", handleColorPickerInput);
  input.addEventListener("change", handleColorPickerInput);

  picker.append(button, input);
  return picker;
}

function renderColors({ scrollIntoView = false } = {}) {
  const query = searchInput.value.trim().toLowerCase();
  const matches = [defaultColorsPreset, ...registry].filter((preset) => {
    const haystack = `${preset.name} ${preset.sourcePath ?? ""}`.toLowerCase();
    return haystack.includes(query);
  });

  colorListNode.replaceChildren(...matches.map(renderColorButton));
  if (scrollIntoView) {
    scrollSelectedPresetIntoView();
  }
}

function renderColorButton(preset) {
  const button = document.createElement("button");
  button.className = "color-button";
  button.type = "button";
  button.dataset.presetId = preset.id;
  button.setAttribute("aria-pressed", String(preset.id === selectedPreset?.id));
  button.addEventListener("click", () => selectPreset(preset));

  button.append(renderPresetPreview(preset));
  return button;
}

function renderPresetPreview(preset) {
  const preview = document.createElement("div");
  preview.className = "preset-preview";

  if (!preset.scheme) {
    preview.classList.add("preset-preview-default");
    preview.style.backgroundColor = defaultPttScheme.black;
    preview.style.color = defaultPttScheme.brightWhite;
    preview.append(
      renderPresetArticleLine({
        markerColor: defaultPttScheme.brightGreen,
        title: `[配色] ${preset.name}`,
      }),
      renderPresetSampleLine(preset, defaultPttScheme),
    );
    return preview;
  }

  const background = schemeColor(preset.scheme, "black", "#000000");
  const foreground = schemeColor(preset.scheme, "brightWhite", "#ffffff");
  preview.style.backgroundColor = background;
  preview.style.color = foreground;

  preview.append(
    renderPresetArticleLine({
      markerColor: schemeColor(preset.scheme, "brightGreen", foreground),
      title: `[配色] ${preset.name}`,
    }),
    renderPresetSampleLine(preset, preset.scheme),
  );

  return preview;
}

function renderPresetArticleLine({ markerColor, title }) {
  const article = document.createElement("div");
  article.className = "preset-preview-article";

  const marker = document.createElement("span");
  marker.className = "preset-preview-marker";
  marker.style.color = markerColor;
  marker.setAttribute("aria-hidden", "true");
  marker.textContent = "●";

  const date = document.createElement("span");
  date.className = "preset-preview-date";
  date.textContent = "6/15";

  const titleNode = document.createElement("strong");
  titleNode.className = "preset-preview-title";
  titleNode.textContent = title;

  article.append(marker, date, titleNode);
  return article;
}

function renderPresetSampleLine(preset, scheme) {
  const sample = document.createElement("div");
  sample.className = "preset-preview-samples";
  sample.append(...pttPreviewSampleGroups.map((group) => renderColorSampleGroup(group, scheme)));
  return sample;
}

function renderColorSampleGroup(groupDefinition, scheme) {
  const group = document.createElement("span");
  group.className = "ptt-color-sample-group";

  const labelNode = document.createElement("span");
  labelNode.className = "ptt-color-sample-label";
  labelNode.textContent = groupDefinition.label;

  group.append(
    labelNode,
    ...groupDefinition.cells.map((cell) => renderPttColorSample(cell, scheme)),
  );
  return group;
}

function renderPttColorSample(cell, scheme) {
  const foreground = schemeColor(scheme, cell.fgKey, defaultPttScheme[cell.fgKey] ?? "#ffffff");
  const background = schemeColor(scheme, cell.bgKey, defaultPttScheme[cell.bgKey] ?? "#000000");
  const sample = document.createElement("span");
  sample.className = "ptt-color-sample";
  sample.title = `${cell.pttClass}: ${schemeLabels[cell.fgKey]} on ${schemeLabels[cell.bgKey]}`;
  sample.setAttribute("aria-label", sample.title);
  sample.style.color = foreground;
  sample.style.backgroundColor = background;
  sample.textContent = cell.text;

  return sample;
}

function schemeColor(scheme, schemeKey, fallback) {
  return normalizeHex(scheme?.[schemeKey]) ?? fallback;
}

function selectPreset(preset) {
  selectedPreset = preset;
  selectedScheme = preset.scheme ? copyScheme(preset.scheme) : null;
  selectedMetadata = preset.metadata ?? {};
  renderCurrentPalette();
  updateApplyButton();
  syncSelectedPresetButtonState();
  queuePersistDraft({ immediate: true });
  sendSelectedSchemePreview();
}

function syncSelectedPresetButtonState() {
  const selectedPresetId = selectedPreset?.id ?? "";

  for (const button of colorListNode.querySelectorAll("[data-preset-id]")) {
    button.setAttribute("aria-pressed", String(button.dataset.presetId === selectedPresetId));
  }
}

function handleWebfontTagsInput() {
  selectedWebfontTags = webfontTagsInput.value;
  updateWebfontTagsStatus();
  updateApplyButton();
  queuePersistDraft();
  queueWebfontTagsPreview();
}

function insertWebfontTemplate() {
  insertIntoWebfontTags(WEBFONT_TEMPLATE);
}

function clearWebfontTagsInput() {
  webfontTagsInput.value = "";
  selectedWebfontTags = "";
  updateWebfontTagsStatus();
  updateApplyButton();
  queuePersistDraft({ immediate: true });
  queueWebfontTagsPreview({ immediate: true });
}

function insertIntoWebfontTags(value) {
  webfontTagsPanel.open = true;
  const isFocused = document.activeElement === webfontTagsInput;
  const start = isFocused
    ? (webfontTagsInput.selectionStart ?? webfontTagsInput.value.length)
    : webfontTagsInput.value.length;
  const end = isFocused
    ? (webfontTagsInput.selectionEnd ?? webfontTagsInput.value.length)
    : webfontTagsInput.value.length;
  const prefix = webfontTagsInput.value.slice(0, start);
  const suffix = webfontTagsInput.value.slice(end);
  const spacerBefore = prefix.trim() && !prefix.endsWith("\n") ? "\n\n" : "";
  const spacerAfter = suffix.trim() && !value.endsWith("\n") ? "\n\n" : "";

  webfontTagsInput.value = `${prefix}${spacerBefore}${value}${spacerAfter}${suffix}`;
  selectedWebfontTags = webfontTagsInput.value;
  webfontTagsInput.focus();
  webfontTagsInput.setSelectionRange(
    prefix.length + spacerBefore.length,
    prefix.length + spacerBefore.length + value.length,
  );
  updateWebfontTagsStatus();
  updateApplyButton();
  queuePersistDraft({ immediate: true });
  queueWebfontTagsPreview({ immediate: true });
}

function openColorPicker(input) {
  if (typeof input.showPicker === "function") {
    try {
      input.showPicker();
      return;
    } catch {
      // Fall back to click() when showPicker is unavailable for this event.
    }
  }

  input.click();
}

function handleColorPickerInput(event) {
  const key = event.currentTarget.dataset.schemeKey;
  const value = normalizeHex(event.currentTarget.value);
  if (!key || !value) {
    return;
  }

  if (updateSchemeColor(key, value)) {
    queuePersistDraft({ immediate: event.type === "change" });
  }
}

function updateSchemeColor(key, value) {
  if (!selectedScheme) {
    return false;
  }

  if (selectedScheme?.[key] === value) {
    return false;
  }

  selectedScheme = { ...selectedScheme, [key]: value };
  syncPaletteColor(key, value);
  updatePaletteModifiedState();
  updateApplyButton();
  sendPreviewMessage({ type: "preview-scheme", preset: selectedSchemePayload() });
  return true;
}

function syncPaletteColor(key, value) {
  const swatch = paletteStripNode.querySelector(`button.palette-swatch[data-scheme-key="${key}"]`);
  if (swatch) {
    swatch.style.backgroundColor = value;
    swatch.title = `${schemeLabels[key]} ${value}`;
    swatch.setAttribute("aria-label", `Edit ${schemeLabels[key]} color ${value}`);
  }

  const colorInput = paletteStripNode.querySelector(`input[type="color"][data-scheme-key="${key}"]`);
  if (colorInput && colorInput.value !== value) {
    colorInput.value = value;
  }
}

function updatePaletteModifiedState() {
  const isModified = TermPttAppearanceState.isModifiedScheme(selectedScheme, selectedPreset?.scheme);
  modifiedBadgeNode.hidden = !isModified;
  resetButton.hidden = !isModified;
}

function resetPaletteToBase() {
  if (!selectedPreset?.scheme) {
    return;
  }

  selectedScheme = copyScheme(selectedPreset.scheme);
  selectedMetadata = selectedPreset.metadata ?? {};
  renderCurrentPalette();
  updateApplyButton();
  queuePersistDraft({ immediate: true });
  sendPreviewMessage({ type: "preview-scheme", preset: selectedSchemePayload() });
  statusNode.textContent = `Reset ${selectedPreset.name} colors`;
}

async function applySelectedPreset() {
  if (!selectedPreset) {
    return;
  }

  updateWebfontTagsStatus();
  if (webfontTagsValidation.errors.length > 0) {
    statusNode.textContent = "Fix Webfont Tags before applying.";
    return;
  }

  applyButton.disabled = true;

  const setValues = {};
  const removeKeys = ["selectedFont", "selectedEmbeddedTags"];

  if (selectedScheme) {
    const storedScheme = TermPttAppearanceState.toStoredScheme({
      preset: selectedPreset,
      scheme: selectedScheme,
      metadata: selectedMetadata,
    });
    Object.assign(setValues, { selectedScheme: storedScheme });
  } else {
    removeKeys.push("selectedScheme");
  }

  const webfontTags = normalizeWebfontTags(selectedWebfontTags);
  if (webfontTags) {
    setValues.selectedWebfontTags = webfontTags;
  } else {
    removeKeys.push("selectedWebfontTags");
  }

  clearPendingDraftWrite();
  clearPendingWebfontPreview();

  try {
    if (Object.keys(setValues).length > 0) {
      await chrome.storage.sync.set(setValues);
    }
    if (removeKeys.length > 0) {
      await chrome.storage.sync.remove(removeKeys);
    }
    if (chrome.storage.session) {
      await chrome.storage.session.remove(["appearanceDraft"]);
    }
  } catch {
    statusNode.textContent = "Could not save appearance.";
    updateApplyButton();
    return;
  }

  savedPreset = selectedPreset;
  savedScheme = selectedScheme;
  savedWebfontTags = webfontTags;
  selectedWebfontTags = webfontTags;
  webfontTagsInput.value = webfontTags;
  updateWebfontTagsStatus();
  renderCurrentPalette();
  updateApplyButton();
  statusNode.textContent = webfontTags
    ? `Applied ${selectedPreset.name} with webfont tags`
    : `Applied ${selectedPreset.name}`;
  if (await sendSelectedAppearanceApply()) {
    window.close();
  }
}

function previewSelectedAppearance() {
  sendSelectedSchemePreview();
  sendSelectedWebfontTagsPreview();
}

function sendSelectedSchemePreview() {
  if (selectedScheme) {
    sendPreviewMessage({ type: "preview-scheme", preset: selectedSchemePayload() });
    return;
  }

  sendPreviewMessage({ type: "preview-clear-scheme" });
}

function sendSelectedWebfontTagsPreview() {
  if (webfontTagsValidation.errors.length > 0) {
    sendPreviewMessage({ type: "preview-webfont-tags", tags: savedWebfontTags });
    return;
  }

  const webfontTags = normalizeWebfontTags(selectedWebfontTags);
  if (webfontTags) {
    sendPreviewMessage({ type: "preview-webfont-tags", tags: webfontTags });
    return;
  }

  sendPreviewMessage({ type: "preview-clear-webfont-tags" });
}

async function sendSelectedAppearanceApply() {
  const schemeApplied = await sendSelectedSchemeApply();
  const webfontTagsApplied = await sendSelectedWebfontTagsApply();
  return schemeApplied && webfontTagsApplied;
}

function sendSelectedSchemeApply() {
  if (selectedScheme) {
    return sendPreviewMessageAndWait(
      { type: "apply-scheme", preset: selectedSchemePayload() },
      ["colors-applied"],
    );
  }

  return sendPreviewMessageAndWait({ type: "apply-clear-scheme" }, ["colors-cleared"]);
}

function sendSelectedWebfontTagsApply() {
  const webfontTags = normalizeWebfontTags(selectedWebfontTags);
  if (webfontTags) {
    return sendPreviewMessageAndWait({ type: "apply-webfont-tags", tags: webfontTags }, ["webfont-tags-applied"]);
  }

  return sendPreviewMessageAndWait({ type: "apply-clear-webfont-tags" }, ["webfont-tags-cleared"]);
}

function queuePersistDraft({ immediate = false } = {}) {
  if (!chrome.storage.session) {
    return;
  }

  clearPendingDraftWrite();

  if (immediate) {
    void persistDraftSafely();
    return;
  }

  persistDraftTimeout = setTimeout(() => {
    persistDraftTimeout = null;
    void persistDraftSafely();
  }, 150);
}

function clearPendingDraftWrite() {
  if (!persistDraftTimeout) {
    return;
  }

  clearTimeout(persistDraftTimeout);
  persistDraftTimeout = null;
}

function queueWebfontTagsPreview({ immediate = false } = {}) {
  clearPendingWebfontPreview();

  if (immediate) {
    sendSelectedWebfontTagsPreview();
    return;
  }

  webfontPreviewTimeout = setTimeout(() => {
    webfontPreviewTimeout = null;
    sendSelectedWebfontTagsPreview();
  }, 200);
}

function clearPendingWebfontPreview() {
  if (!webfontPreviewTimeout) {
    return;
  }

  clearTimeout(webfontPreviewTimeout);
  webfontPreviewTimeout = null;
}

function flushPendingDraftWrite() {
  if (!persistDraftTimeout) {
    return;
  }

  clearPendingDraftWrite();
  void persistDraftSafely();
}

function persistDraftSafely() {
  persistDraft().catch(() => {
    statusNode.textContent = "Could not save draft.";
  });
}

async function persistDraft() {
  if (!selectedPreset || !chrome.storage.session) {
    return;
  }

  const appearanceDraft = TermPttAppearanceState.toDraft({
    preset: selectedPreset,
    scheme: selectedScheme,
    metadata: selectedMetadata,
    webfontTags: selectedWebfontTags,
    query: searchInput.value,
  });

  await chrome.storage.session.set({ appearanceDraft });
}

function selectedSchemePayload() {
  return {
    id: selectedPreset.id,
    name: selectedPreset.name,
    scheme: selectedScheme,
    metadata: selectedMetadata,
  };
}

function scrollSelectedPresetIntoView() {
  if (!selectedPreset?.id) {
    return;
  }

  const selectedButton =
    [...colorListNode.querySelectorAll("[data-preset-id]")]
      .find((button) => button.dataset.presetId === selectedPreset.id) ?? null;
  if (!selectedButton) {
    return;
  }

  const padding = 4;
  const targetTop = Math.max(0, selectedButton.offsetTop - colorListNode.offsetTop - padding);
  const targetBottom = targetTop + selectedButton.offsetHeight + padding * 2;
  const visibleTop = colorListNode.scrollTop;
  const visibleBottom = visibleTop + colorListNode.clientHeight;

  if (targetTop < visibleTop) {
    colorListNode.scrollTop = targetTop;
    return;
  }

  if (targetBottom > visibleBottom) {
    colorListNode.scrollTop = Math.max(0, targetBottom - colorListNode.clientHeight);
  }
}

function findPreset(id) {
  if (id === DEFAULT_COLORS_ID) {
    return defaultColorsPreset;
  }

  return registry.find((preset) => preset.id === id) ?? null;
}

function updateWebfontTagsStatus() {
  webfontTagsValidation = TermPttWebfontTags.parseWebfontTags(selectedWebfontTags);
  const tagCount = webfontTagsValidation.entries.length;
  const hasTags = normalizeWebfontTags(selectedWebfontTags) !== "";
  const hasErrors = webfontTagsValidation.errors.length > 0;

  webfontTagsInput.setAttribute("aria-invalid", String(hasErrors));

  if (hasErrors) {
    webfontTagsPanel.dataset.state = "invalid";
    webfontTagsSummary.textContent = "Invalid";
    webfontTagsStatus.textContent = webfontTagsValidation.errors[0];
    return;
  }

  if (hasTags) {
    webfontTagsPanel.dataset.state = "ready";
    webfontTagsSummary.textContent = `${tagCount} tag${tagCount === 1 ? "" : "s"}`;
    webfontTagsStatus.textContent =
      "Previewing webfont tags. Apply saves them for future term.ptt.cc visits.";
    return;
  }

  webfontTagsPanel.dataset.state = "empty";
  webfontTagsSummary.textContent = "Optional";
  webfontTagsStatus.textContent =
    "Advanced: custom CSS can change term.ptt.cc. Paste only style tags and links you trust.";
}

function updateApplyButton() {
  const isSameSavedWebfontTags =
    normalizeWebfontTags(selectedWebfontTags) === normalizeWebfontTags(savedWebfontTags);
  const isSameSavedScheme =
    selectedScheme === null
      ? savedScheme === null
      : savedScheme !== null && !TermPttAppearanceState.isModifiedScheme(selectedScheme, savedScheme);
  applyButton.disabled =
    !selectedPreset ||
    webfontTagsValidation.errors.length > 0 ||
    (isSameSavedScheme && isSameSavedWebfontTags);
}

function copyScheme(scheme) {
  const nextScheme = {};
  for (const key of schemeKeys) {
    nextScheme[key] = normalizeHex(scheme?.[key]) ?? "#000000";
  }
  return nextScheme;
}

function normalizeHex(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toLowerCase() : null;
}

function normalizeWebfontTags(value) {
  return typeof value === "string" ? value.trim() : "";
}

function connectPreviewPort() {
  try {
    port = chrome.tabs.connect(activeTab.id, { name: "term-ptt-custom-theme-preview" });
  } catch {
    port = null;
    statusNode.textContent = "Reload term.ptt.cc after installing the extension.";
    return;
  }

  port.onDisconnect.addListener(() => {
    port = null;
    if (chrome.runtime.lastError) {
      statusNode.textContent = "Reload term.ptt.cc after installing the extension.";
    }
  });
}

function sendPreviewMessage(message) {
  if (!port) {
    statusNode.textContent = "Reload term.ptt.cc after installing the extension.";
    return false;
  }

  try {
    port.postMessage(message);
    return true;
  } catch {
    port = null;
    statusNode.textContent = "Reload term.ptt.cc after installing the extension.";
    return false;
  }
}

function sendPreviewMessageAndWait(message, expectedTypes) {
  if (!port) {
    statusNode.textContent = "Reload term.ptt.cc after installing the extension.";
    return Promise.resolve(false);
  }

  const targetPort = port;

  return new Promise((resolve) => {
    let timeoutId = null;

    const cleanup = () => {
      clearTimeout(timeoutId);
      targetPort.onMessage.removeListener(handleMessage);
      targetPort.onDisconnect.removeListener(handleDisconnect);
    };

    const finish = (applied) => {
      cleanup();
      resolve(applied);
    };

    const handleMessage = (response) => {
      if (expectedTypes.includes(response?.type)) {
        finish(true);
      }
    };

    const handleDisconnect = () => {
      port = null;
      finish(false);
    };

    timeoutId = setTimeout(() => {
      statusNode.textContent = "Applied, but could not confirm the live page update.";
      finish(false);
    }, APPLY_ACK_TIMEOUT_MS);

    targetPort.onMessage.addListener(handleMessage);
    targetPort.onDisconnect.addListener(handleDisconnect);

    try {
      targetPort.postMessage(message);
    } catch {
      port = null;
      statusNode.textContent = "Reload term.ptt.cc after installing the extension.";
      finish(false);
    }
  });
}
