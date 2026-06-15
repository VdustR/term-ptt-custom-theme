const statusNode = document.getElementById("status");
const controlsNode = document.getElementById("controls");
const searchInput = document.getElementById("searchInput");
const fontSelect = document.getElementById("fontSelect");
const fontStatus = document.getElementById("fontStatus");
const currentPaletteNameNode = document.getElementById("currentPaletteName");
const modifiedBadgeNode = document.getElementById("modifiedBadge");
const resetButton = document.getElementById("resetButton");
const paletteStripNode = document.getElementById("paletteStrip");
const colorListNode = document.getElementById("colorList");
const applyButton = document.getElementById("applyButton");

const DEFAULT_COLORS_ID = "term-ptt-default";
const DEFAULT_FONT_ID = "term-ptt-default";
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

let activeTab = null;
let port = null;
let registry = [];
let fontRegistry = [];
let selectedPreset = null;
let savedPreset = null;
let selectedScheme = null;
let savedScheme = null;
let selectedMetadata = {};
let selectedFont = null;
let savedFont = null;
let persistDraftTimeout = null;

window.addEventListener("pagehide", flushPendingDraftWrite);
init();

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tab;

  if (!activeTab?.id || !activeTab.url?.startsWith("https://term.ptt.cc/")) {
    statusNode.textContent = "Open term.ptt.cc to preview colors.";
    return;
  }

  const [colorsResponse, fontsResponse, savedStorage, draftStorage] = await Promise.all([
    fetch("assets/colors.json"),
    fetch("assets/fonts.json"),
    chrome.storage.sync.get(["selectedScheme", "selectedFont"]),
    getAppearanceDraft(),
  ]);
  const colorsRegistry = await colorsResponse.json();
  const fontsRegistry = await fontsResponse.json();
  registry = colorsRegistry.colors;
  fontRegistry = fontsRegistry.fonts;

  const initialState = TermPttAppearanceState.createInitialAppearanceState({
    registry,
    fontRegistry,
    storage: { ...savedStorage, ...draftStorage },
  });

  const savedStoredScheme = savedStorage.selectedScheme ?? null;
  savedPreset = savedStoredScheme
    ? (findPreset(savedStoredScheme.basePresetId ?? savedStoredScheme.id) ?? savedStoredScheme)
    : defaultColorsPreset;
  savedScheme = savedStoredScheme?.scheme ? copyScheme(savedStoredScheme.scheme) : null;
  savedFont = reconcileFont(savedStorage.selectedFont ?? null);

  connectPreviewPort();

  selectedPreset = initialState.selectedPreset ?? defaultColorsPreset;
  selectedScheme = initialState.selectedScheme ? copyScheme(initialState.selectedScheme) : null;
  selectedMetadata = initialState.selectedMetadata ?? selectedPreset?.metadata ?? {};
  selectedFont = initialState.selectedFont ?? null;
  searchInput.value = initialState.query;

  statusNode.textContent = `${registry.length} colors and ${fontRegistry.length} fonts available`;
  controlsNode.hidden = false;
  bindEvents();
  renderFonts();
  renderCurrentPalette();
  renderColors({ scrollIntoView: true });
  updateApplyButton();
  previewSelectedAppearance();
}

function getAppearanceDraft() {
  return chrome.storage.session
    ? chrome.storage.session.get(["appearanceDraft"])
    : Promise.resolve({});
}

function bindEvents() {
  searchInput.addEventListener("input", handleSearchInput);
  fontSelect.addEventListener("change", selectFont);
  resetButton.addEventListener("click", resetPaletteToBase);
  applyButton.addEventListener("click", applySelectedPreset);
}

function handleSearchInput() {
  renderColors();
  queuePersistDraft();
}

function renderFonts() {
  fontSelect.replaceChildren(renderDefaultFontOption(), ...fontRegistry.map(renderFontOption));
  fontSelect.value = selectedFont?.id ?? DEFAULT_FONT_ID;
  updateFontStatus();
}

function renderDefaultFontOption() {
  const option = document.createElement("option");
  option.value = DEFAULT_FONT_ID;
  option.textContent = "Term PTT Default";
  return option;
}

function renderFontOption(font) {
  const option = document.createElement("option");
  option.value = font.id;
  option.textContent = font.status === "planned" ? `${font.name} (planned)` : font.name;
  return option;
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

  const fontFamily = fontStackToCss(selectedFont?.fallbackStack ?? []);
  if (fontFamily) {
    button.style.fontFamily = fontFamily;
  }

  const label = document.createElement("div");
  label.className = "color-label";
  const name = document.createElement("strong");
  name.textContent = preset.name;
  const source = document.createElement("span");
  source.textContent = preset.sourcePath;
  label.append(name, source);

  button.append(label);

  if (preset.scheme) {
    const swatches = document.createElement("div");
    swatches.className = "swatches";
    for (const key of schemeKeys.slice(0, 8)) {
      const swatch = document.createElement("i");
      swatch.style.backgroundColor = preset.scheme[key];
      swatches.append(swatch);
    }
    button.append(swatches);
  }

  return button;
}

function selectPreset(preset) {
  selectedPreset = preset;
  selectedScheme = preset.scheme ? copyScheme(preset.scheme) : null;
  selectedMetadata = preset.metadata ?? {};
  renderCurrentPalette();
  updateApplyButton();
  renderColors();
  queuePersistDraft({ immediate: true });
  sendSelectedSchemePreview();
}

function selectFont() {
  selectedFont = fontSelect.value === DEFAULT_FONT_ID ? null : findFont(fontSelect.value);
  updateFontStatus();
  updateApplyButton();
  renderColors();
  queuePersistDraft({ immediate: true });
  sendSelectedFontPreview();
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

  applyButton.disabled = true;

  const setValues = {};
  const removeKeys = [];

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

  if (selectedFont) {
    setValues.selectedFont = toStoredFont(selectedFont);
  } else {
    removeKeys.push("selectedFont");
  }

  clearPendingDraftWrite();

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
  savedFont = selectedFont;
  updateFontStatus();
  renderCurrentPalette();
  updateApplyButton();
  statusNode.textContent = `Applied ${selectedPreset.name} with ${selectedFont?.name ?? "Term PTT Default"}`;
  sendSelectedSchemeApply();
  sendSelectedFontApply();
}

function previewSelectedAppearance() {
  sendSelectedSchemePreview();
  sendSelectedFontPreview();
}

function sendSelectedSchemePreview() {
  if (selectedScheme) {
    sendPreviewMessage({ type: "preview-scheme", preset: selectedSchemePayload() });
    return;
  }

  sendPreviewMessage({ type: "preview-clear-scheme" });
}

function sendSelectedFontPreview() {
  if (selectedFont) {
    sendPreviewMessage({ type: "preview-font", font: selectedFont });
    return;
  }

  sendPreviewMessage({ type: "preview-clear-font" });
}

function sendSelectedSchemeApply() {
  if (selectedScheme) {
    sendPreviewMessage({ type: "apply-scheme", preset: selectedSchemePayload() });
    return;
  }

  sendPreviewMessage({ type: "apply-clear-scheme" });
}

function sendSelectedFontApply() {
  if (selectedFont) {
    sendPreviewMessage({ type: "apply-font", font: selectedFont });
    return;
  }

  sendPreviewMessage({ type: "apply-clear-font" });
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
    font: selectedFont,
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
  selectedButton?.scrollIntoView({ block: "nearest" });
}

function findPreset(id) {
  if (id === DEFAULT_COLORS_ID) {
    return defaultColorsPreset;
  }

  return registry.find((preset) => preset.id === id) ?? null;
}

function findFont(id) {
  return fontRegistry.find((font) => font.id === id) ?? null;
}

function reconcileFont(font) {
  if (!font) {
    return null;
  }

  return findFont(font.id) ?? font;
}

function toStoredFont(font) {
  return {
    id: font.id,
    name: font.name,
    fallbackStack: font.fallbackStack,
  };
}

function updateFontStatus() {
  if (!selectedFont) {
    fontStatus.textContent = "Use term.ptt.cc default font.";
    return;
  }

  fontStatus.textContent =
    selectedFont.status === "planned"
      ? "Uses fallback unless the processed font is installed."
      : selectedFont.fallbackStack.join(", ");
}

function updateApplyButton() {
  const savedFontForComparison = savedFont ? (findFont(savedFont.id) ?? savedFont) : null;
  const isSameSavedScheme =
    selectedScheme === null
      ? savedScheme === null
      : savedScheme !== null && !TermPttAppearanceState.isModifiedScheme(selectedScheme, savedScheme);
  const isSameSavedFont =
    selectedFont === null ? savedFont === null : savedFontForComparison?.id === selectedFont.id;

  applyButton.disabled =
    !selectedPreset ||
    (isSameSavedScheme && isSameSavedFont);
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

function fontStackToCss(fontStack) {
  return fontStack.map(serializeFontFamily).join(", ");
}

function serializeFontFamily(fontFamily) {
  return /^[a-zA-Z0-9_-]+$/.test(fontFamily)
    ? fontFamily
    : `"${fontFamily.replaceAll('"', '\\"')}"`;
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
    return;
  }

  try {
    port.postMessage(message);
  } catch {
    port = null;
    statusNode.textContent = "Reload term.ptt.cc after installing the extension.";
  }
}
