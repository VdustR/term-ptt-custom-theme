const statusNode = document.getElementById("status");
const repositoryButton = document.getElementById("repositoryButton");
const controlsNode = document.getElementById("controls");
const homePage = document.getElementById("homePage");
const presetsPage = document.getElementById("presetsPage");
const injectHtmlPage = document.getElementById("injectHtmlPage");
const openPresetsButton = document.getElementById("openPresetsButton");
const openHtmlButton = document.getElementById("openHtmlButton");
const backFromPresetsButton = document.getElementById("backFromPresetsButton");
const backFromHtmlButton = document.getElementById("backFromHtmlButton");
const selectedPresetSummaryNode = document.getElementById("selectedPresetSummary");
const presetResultStatusNode = document.getElementById("presetResultStatus");
const searchInput = document.getElementById("searchInput");
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
const PREVIEW_READY_TIMEOUT_MS = 300;
const PREVIEW_PORT_NAME = "term-ptt-custom-theme-preview";
const CONTENT_SCRIPT_FILES = ["ptt-colors.js", "ptt-webfont-tags.js", "content.js"];
const LIVE_PAGE_UNAVAILABLE_STATUS = "Reload term.ptt.cc after installing or updating the extension.";
const PAGE_HOME = "home";
const PAGE_PRESETS = "presets";
const PAGE_INJECT_HTML = "inject-html";
const PRESET_SEARCH_THROTTLE_MS = 80;
const PRESET_ROW_HEIGHT = 78;
const PRESET_OVERSCAN_ROWS = 4;
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

const defaultPttMetadata = {
  background: defaultPttScheme.black,
  foreground: defaultPttScheme.brightWhite,
  cursor: defaultPttScheme.brightWhite,
  selection: defaultPttScheme.brightBlack,
};

const terminalColorLabels = {
  background: "Background",
  foreground: "Foreground",
  cursor: "Cursor",
  selection: "Selection",
};

const terminalColorKeys = ["background", "foreground", "cursor", "selection"];

const pttNormalColorKeys = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "purple",
  "cyan",
  "white",
];

const pttBrightColorKeys = [
  "brightBlack",
  "brightRed",
  "brightGreen",
  "brightYellow",
  "brightBlue",
  "brightPurple",
  "brightCyan",
  "brightWhite",
];

const pttPreviewSampleRows = [
  {
    label: "前景",
    cells: pttBrightColorKeys.map((key, index) => ({
      text: String(30 + index),
      fgKey: key,
      bgKey: "white",
      pttClass: `q${8 + index} b7`,
    })),
  },
  {
    label: "背景",
    cells: pttNormalColorKeys.map((key, index) => {
      const bgIndex = schemeKeys.indexOf(key);
      return {
        text: String(40 + index),
        fgKey: "brightYellow",
        bgKey: key === "black" ? null : key,
        bgRole: key === "black" ? "background" : null,
        pttClass: `q11 ${bgIndex === 0 ? "b0/body" : `b${bgIndex}`}`,
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
let savedMetadata = null;
let selectedWebfontTags = "";
let savedWebfontTags = "";
let webfontTagsValidation = TermPttWebfontTags.parseWebfontTags("");
let presetMatches = [];
let lastPresetQuery = null;
let presetSearchTimeout = null;
let presetScrollFrame = null;
let persistDraftTimeout = null;
let webfontPreviewTimeout = null;
let previewPortPromise = null;

repositoryButton.addEventListener("click", openRepository);
openPresetsButton.addEventListener("click", () => showPage(PAGE_PRESETS));
openHtmlButton.addEventListener("click", () => showPage(PAGE_INJECT_HTML));
backFromPresetsButton.addEventListener("click", () => showPage(PAGE_HOME));
backFromHtmlButton.addEventListener("click", () => showPage(PAGE_HOME));
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
  savedMetadata = savedStoredScheme?.metadata ?? null;
  savedWebfontTags =
    typeof savedStorage.selectedWebfontTags === "string" ? savedStorage.selectedWebfontTags : "";

  connectPreviewPort({ updateStatus: false });

  selectedPreset = initialState.selectedPreset ?? defaultColorsPreset;
  selectedScheme = initialState.selectedScheme ? copyScheme(initialState.selectedScheme) : null;
  selectedMetadata = copyMetadata(initialState.selectedMetadata ?? selectedPreset?.metadata);
  selectedWebfontTags = initialState.selectedWebfontTags ?? "";
  searchInput.value = initialState.query;
  webfontTagsInput.value = selectedWebfontTags;

  statusNode.textContent = `${registry.length} color presets available`;
  controlsNode.hidden = false;
  bindEvents();
  showPage(PAGE_HOME);
  updateWebfontTagsStatus();
  renderCurrentPalette();
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
  colorListNode.addEventListener("scroll", schedulePresetViewportRender);
  webfontTagsInput.addEventListener("input", handleWebfontTagsInput);
  insertWebfontTemplateButton.addEventListener("click", insertWebfontTemplate);
  clearWebfontTagsButton.addEventListener("click", clearWebfontTagsInput);
  resetButton.addEventListener("click", resetPaletteToBase);
  applyButton.addEventListener("click", applySelectedPreset);
}

function handleSearchInput() {
  presetResultStatusNode.textContent = "Searching...";
  schedulePresetSearch();
  queuePersistDraft();
}

function showPage(page) {
  document.documentElement.dataset.page = page;
  document.body.dataset.page = page;

  homePage.hidden = page !== PAGE_HOME;
  presetsPage.hidden = page !== PAGE_PRESETS;
  injectHtmlPage.hidden = page !== PAGE_INJECT_HTML;

  if (page === PAGE_PRESETS) {
    renderPresetResults({
      scrollSelected: searchInput.value.trim() === "",
    });
    searchInput.focus();
    return;
  }

  if (page === PAGE_INJECT_HTML) {
    webfontTagsInput.focus();
  }
}

function schedulePresetSearch() {
  clearPendingPresetSearch();
  presetSearchTimeout = setTimeout(() => {
    presetSearchTimeout = null;
    renderPresetResults({ resetScroll: true });
  }, PRESET_SEARCH_THROTTLE_MS);
}

function clearPendingPresetSearch() {
  if (!presetSearchTimeout) {
    return;
  }

  clearTimeout(presetSearchTimeout);
  presetSearchTimeout = null;
}

function renderCurrentPalette() {
  currentPaletteNameNode.textContent = selectedPreset?.name ?? "No preset selected";
  renderPaletteStrip();

  const isModified = isModifiedAppearance(selectedScheme, selectedMetadata, selectedPreset);
  modifiedBadgeNode.hidden = !isModified;
  resetButton.hidden = !isModified;
  updatePresetSummary(isModified);
}

function renderPaletteStrip() {
  if (!selectedScheme) {
    const note = document.createElement("div");
    note.className = "palette-default-note";
    note.textContent = "Use term.ptt.cc default colors";
    paletteStripNode.replaceChildren(note);
    return;
  }

  paletteStripNode.replaceChildren(
    renderPaletteSwatchGroup({
      label: "Meta",
      keys: terminalColorKeys,
      type: "metadata",
    }),
    renderPaletteSwatchGroup({
      label: "ANSI",
      keys: schemeKeys.slice(0, 8),
      type: "scheme",
    }),
    renderPaletteSwatchGroup({
      label: "Bright",
      keys: schemeKeys.slice(8),
      type: "scheme",
    }),
  );
}

function renderPaletteSwatchGroup({ label, keys, type }) {
  const group = document.createElement("div");
  group.className = "palette-group";

  const labelNode = document.createElement("span");
  labelNode.className = "palette-group-label";
  labelNode.textContent = label;

  const swatches = document.createElement("div");
  swatches.className = "palette-group-swatches";
  swatches.append(...keys.map((key) => renderPaletteSwatchButton(key, type)));

  group.append(labelNode, swatches);
  return group;
}

function renderPaletteSwatchButton(key, type) {
  const picker = document.createElement("span");
  picker.className = "palette-picker";

  const button = document.createElement("button");
  const value = currentPaletteColor(type, key);
  const label = paletteColorLabel(type, key);
  button.className = "palette-swatch";
  button.type = "button";
  button.dataset.paletteType = type;
  button.dataset.paletteKey = key;
  button.style.backgroundColor = value;
  button.title = `${label} ${value}`;
  button.setAttribute("aria-label", `Edit ${label} color ${value}`);
  button.addEventListener("click", () => openColorPicker(input));

  const input = document.createElement("input");
  input.id = `palette-${type}-${key}`;
  input.className = "palette-color-input";
  input.type = "color";
  input.tabIndex = -1;
  input.value = value;
  input.dataset.paletteType = type;
  input.dataset.paletteKey = key;
  input.setAttribute("aria-hidden", "true");
  input.addEventListener("input", handleColorPickerInput);
  input.addEventListener("change", handleColorPickerInput);

  picker.append(button, input);
  return picker;
}

function currentPaletteColor(type, key) {
  if (type === "metadata") {
    return terminalColor({ scheme: selectedScheme, metadata: selectedMetadata }, key);
  }

  return normalizeHex(selectedScheme?.[key]) ?? "#000000";
}

function paletteColorLabel(type, key) {
  return type === "metadata" ? terminalColorLabels[key] : schemeLabels[key];
}

function renderPresetResults({ resetScroll = false, scrollSelected = false } = {}) {
  clearPendingPresetSearch();

  const query = normalizeSearchQuery(searchInput.value);
  const queryChanged = query !== lastPresetQuery;
  lastPresetQuery = query;
  presetMatches = findPresetMatches(query);

  if (resetScroll || queryChanged) {
    colorListNode.scrollTop = 0;
  }

  updatePresetResultStatus(query);
  renderPresetViewport();

  if (scrollSelected) {
    scrollSelectedPresetIntoView();
  }
}

function findPresetMatches(query) {
  const presets = [defaultColorsPreset, ...registry];
  if (!query) {
    return presets;
  }

  return presets
    .map((preset, index) => ({
      preset,
      index,
      score: scorePresetMatch(preset, query),
    }))
    .filter((match) => match.score > Number.NEGATIVE_INFINITY)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((match) => match.preset);
}

function scorePresetMatch(preset, query) {
  const fields = [preset.name, preset.sourcePath ?? ""].map(normalizeSearchQuery).filter(Boolean);
  const terms = query.split(" ").filter(Boolean);
  let totalScore = 0;

  for (const term of terms) {
    const termScore = Math.max(...fields.map((field) => scoreSearchTerm(field, term)));
    if (termScore <= Number.NEGATIVE_INFINITY) {
      return Number.NEGATIVE_INFINITY;
    }
    totalScore += termScore;
  }

  return totalScore;
}

function scoreSearchTerm(field, term) {
  const directIndex = field.indexOf(term);
  if (directIndex >= 0) {
    return 200 - directIndex * 0.05;
  }

  const compactField = field.replace(/[\s/_.-]+/g, "");
  const compactIndex = compactField.indexOf(term);
  if (compactIndex >= 0) {
    return 170 - compactIndex * 0.05;
  }

  return Math.max(
    ...field
      .split(/[\s/_.-]+/)
      .filter(Boolean)
      .map((word) => fuzzyScoreWord(word, term)),
  );
}

function fuzzyScoreWord(word, term) {
  if (!word || word[0] !== term[0]) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = 0;
  let lastIndex = -1;
  let runLength = 0;

  for (const char of term) {
    const index = word.indexOf(char, lastIndex + 1);
    if (index < 0) {
      return Number.NEGATIVE_INFINITY;
    }

    const isContiguous = index === lastIndex + 1;
    runLength = isContiguous ? runLength + 1 : 0;
    score += 10 + (isContiguous ? 8 + runLength : 0) + (index === 0 ? 12 : 0);
    score -= index * 0.01;
    lastIndex = index;
  }

  return score;
}

function normalizeSearchQuery(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function updatePresetResultStatus(query) {
  const count = presetMatches.length;
  if (!query) {
    presetResultStatusNode.textContent = `${count} color presets`;
    return;
  }

  presetResultStatusNode.textContent = `${count} result${count === 1 ? "" : "s"} for "${query}"`;
}

function schedulePresetViewportRender() {
  if (presetScrollFrame !== null) {
    return;
  }

  presetScrollFrame = requestAnimationFrame(() => {
    presetScrollFrame = null;
    renderPresetViewport();
  });
}

function renderPresetViewport() {
  if (presetMatches.length === 0) {
    const empty = document.createElement("div");
    empty.className = "color-list-empty";
    empty.textContent = "No presets found";
    colorListNode.replaceChildren(empty);
    return;
  }

  const viewportHeight = presetMatches.length * PRESET_ROW_HEIGHT;
  const visibleStart = Math.max(
    0,
    Math.floor(colorListNode.scrollTop / PRESET_ROW_HEIGHT) - PRESET_OVERSCAN_ROWS,
  );
  const visibleEnd = Math.min(
    presetMatches.length,
    Math.ceil((colorListNode.scrollTop + colorListNode.clientHeight) / PRESET_ROW_HEIGHT) +
      PRESET_OVERSCAN_ROWS,
  );
  const viewport = document.createElement("div");
  viewport.className = "color-list-viewport";
  viewport.style.height = `${viewportHeight}px`;

  for (let index = visibleStart; index < visibleEnd; index += 1) {
    viewport.append(renderColorButton(presetMatches[index], index));
  }

  colorListNode.replaceChildren(viewport);
}

function renderColorButton(preset, index) {
  const button = document.createElement("button");
  button.className = "color-button";
  button.type = "button";
  button.dataset.presetId = preset.id;
  button.style.transform = `translateY(${index * PRESET_ROW_HEIGHT}px)`;
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
    preview.style.backgroundColor = terminalColor(preset, "background");
    preview.style.color = terminalColor(preset, "foreground");
    preview.append(
      renderPresetArticleLine({
        markerColor: defaultPttScheme.brightGreen,
        title: `[配色] ${preset.name}`,
      }),
      renderPresetSampleLine(preset, defaultPttScheme),
    );
    return preview;
  }

  const background = terminalColor(preset, "background");
  const foreground = terminalColor(preset, "foreground");
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
  sample.append(...pttPreviewSampleRows.map((row) => renderColorSampleRow(row, preset, scheme)));
  return sample;
}

function renderColorSampleRow(rowDefinition, preset, scheme) {
  const row = document.createElement("div");
  row.className = "ptt-color-sample-row";

  const labelNode = document.createElement("span");
  labelNode.className = "ptt-color-sample-label";
  labelNode.textContent = rowDefinition.label;

  row.append(
    labelNode,
    ...rowDefinition.cells.map((cell) => renderPttColorSample(cell, preset, scheme)),
  );
  return row;
}

function renderPttColorSample(cell, preset, scheme) {
  const foreground = sampleColor(cell.fgRole, cell.fgKey, preset, scheme);
  const background = sampleColor(cell.bgRole, cell.bgKey, preset, scheme);
  const sample = document.createElement("span");
  sample.className = "ptt-color-sample";
  sample.title = `${cell.pttClass}: ${sampleColorLabel(cell.fgRole, cell.fgKey)} on ${
    sampleColorLabel(cell.bgRole, cell.bgKey)
  }`;
  sample.setAttribute("aria-label", sample.title);
  sample.style.color = foreground;
  sample.style.backgroundColor = background;
  sample.textContent = cell.text;

  return sample;
}

function sampleColor(role, schemeKey, preset, scheme) {
  if (role) {
    return terminalColor({ scheme, metadata: preset?.metadata }, role);
  }

  return schemeColor(scheme, schemeKey, defaultPttScheme[schemeKey] ?? "#000000");
}

function sampleColorLabel(role, schemeKey) {
  if (role) {
    return terminalColorLabels[role] ?? role;
  }

  return schemeLabels[schemeKey] ?? schemeKey;
}

function terminalColor(preset, key) {
  const scheme = preset?.scheme ?? defaultPttScheme;
  const metadata = preset?.metadata ?? defaultPttMetadata;
  const fallback = {
    background: schemeColor(scheme, "black", defaultPttMetadata.background),
    foreground: schemeColor(scheme, "brightWhite", defaultPttMetadata.foreground),
    cursor:
      normalizeHex(metadata.foreground) ??
      schemeColor(scheme, "brightWhite", defaultPttMetadata.cursor),
    selection: schemeColor(scheme, "brightBlack", defaultPttMetadata.selection),
  };

  return normalizeHex(metadata[key]) ?? fallback[key] ?? defaultPttMetadata.background;
}

function schemeColor(scheme, schemeKey, fallback) {
  return normalizeHex(scheme?.[schemeKey]) ?? fallback;
}

function selectPreset(preset) {
  selectedPreset = preset;
  selectedScheme = preset.scheme ? copyScheme(preset.scheme) : null;
  selectedMetadata = copyMetadata(preset.metadata);
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
  showPage(PAGE_INJECT_HTML);
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
  const type = event.currentTarget.dataset.paletteType;
  const key = event.currentTarget.dataset.paletteKey;
  const value = normalizeHex(event.currentTarget.value);
  if (!key || !value) {
    return;
  }

  const didUpdate =
    type === "metadata" ? updateMetadataColor(key, value) : updateSchemeColor(key, value);
  if (didUpdate) {
    queuePersistDraft({ immediate: event.type === "change" });
  }
}

function updateMetadataColor(key, value) {
  if (!selectedScheme || !terminalColorKeys.includes(key)) {
    return false;
  }

  if (terminalColor({ scheme: selectedScheme, metadata: selectedMetadata }, key) === value) {
    return false;
  }

  selectedMetadata = { ...selectedMetadata, [key]: value };
  syncPaletteColor("metadata", key, value);
  updatePaletteModifiedState();
  updateApplyButton();
  sendPreviewMessage({ type: "preview-scheme", preset: selectedSchemePayload() });
  return true;
}

function updateSchemeColor(key, value) {
  if (!selectedScheme) {
    return false;
  }

  if (selectedScheme?.[key] === value) {
    return false;
  }

  selectedScheme = { ...selectedScheme, [key]: value };
  syncPaletteColor("scheme", key, value);
  updatePaletteModifiedState();
  updateApplyButton();
  sendPreviewMessage({ type: "preview-scheme", preset: selectedSchemePayload() });
  return true;
}

function syncPaletteColor(type, key, value) {
  const label = paletteColorLabel(type, key);
  const swatch = paletteStripNode.querySelector(
    `button.palette-swatch[data-palette-type="${type}"][data-palette-key="${key}"]`,
  );
  if (swatch) {
    swatch.style.backgroundColor = value;
    swatch.title = `${label} ${value}`;
    swatch.setAttribute("aria-label", `Edit ${label} color ${value}`);
  }

  const colorInput = paletteStripNode.querySelector(
    `input[type="color"][data-palette-type="${type}"][data-palette-key="${key}"]`,
  );
  if (colorInput && colorInput.value !== value) {
    colorInput.value = value;
  }
}

function updatePaletteModifiedState() {
  const isModified = isModifiedAppearance(selectedScheme, selectedMetadata, selectedPreset);
  modifiedBadgeNode.hidden = !isModified;
  resetButton.hidden = !isModified;
  updatePresetSummary(isModified);
}

function updatePresetSummary(isModified = isModifiedAppearance(selectedScheme, selectedMetadata, selectedPreset)) {
  const presetName = selectedPreset?.name ?? "No preset selected";
  selectedPresetSummaryNode.textContent = isModified ? `${presetName} · Modified` : presetName;
}

function resetPaletteToBase() {
  if (!selectedPreset?.scheme) {
    return;
  }

  selectedScheme = copyScheme(selectedPreset.scheme);
  selectedMetadata = copyMetadata(selectedPreset.metadata);
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
  savedMetadata = selectedMetadata;
  savedWebfontTags = webfontTags;
  selectedWebfontTags = webfontTags;
  webfontTagsInput.value = webfontTags;
  updateWebfontTagsStatus();
  renderCurrentPalette();
  updateApplyButton();
  statusNode.textContent = webfontTags
    ? `Applying ${selectedPreset.name} with webfont tags...`
    : `Applying ${selectedPreset.name}...`;
  if (await sendSelectedAppearanceApply()) {
    window.close();
  } else {
    statusNode.textContent = "Saved. Reload term.ptt.cc to apply changes.";
    applyButton.disabled = false;
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
  const [schemeApplied, webfontTagsApplied] = await Promise.all([
    sendSelectedSchemeApply(),
    sendSelectedWebfontTagsApply(),
  ]);
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

  const selectedIndex = presetMatches.findIndex((preset) => preset.id === selectedPreset.id);
  if (selectedIndex < 0) {
    return;
  }

  const padding = 4;
  const targetTop = Math.max(0, selectedIndex * PRESET_ROW_HEIGHT - padding);
  const targetBottom = targetTop + PRESET_ROW_HEIGHT + padding * 2;
  const visibleTop = colorListNode.scrollTop;
  const visibleBottom = visibleTop + colorListNode.clientHeight;

  if (targetTop < visibleTop) {
    colorListNode.scrollTop = targetTop;
    renderPresetViewport();
    return;
  }

  if (targetBottom > visibleBottom) {
    colorListNode.scrollTop = Math.max(0, targetBottom - colorListNode.clientHeight);
    renderPresetViewport();
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
  injectHtmlPage.dataset.state = hasErrors ? "invalid" : hasTags ? "ready" : "empty";
  openHtmlButton.dataset.state = injectHtmlPage.dataset.state;

  if (hasErrors) {
    webfontTagsSummary.textContent = "Invalid";
    webfontTagsStatus.textContent = webfontTagsValidation.errors[0];
    return;
  }

  if (hasTags) {
    webfontTagsSummary.textContent = `${tagCount} tag${tagCount === 1 ? "" : "s"}`;
    webfontTagsStatus.textContent =
      "Previewing webfont tags. Apply saves them for future term.ptt.cc visits.";
    return;
  }

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
      : savedScheme !== null &&
        !TermPttAppearanceState.isModifiedScheme(selectedScheme, savedScheme) &&
        isSameTerminalMetadata(selectedScheme, selectedMetadata, savedScheme, savedMetadata);
  applyButton.disabled =
    !selectedPreset ||
    webfontTagsValidation.errors.length > 0 ||
    (isSameSavedScheme && isSameSavedWebfontTags);
}

function isSameTerminalMetadata(leftScheme, leftMetadata, rightScheme, rightMetadata) {
  return ["background", "foreground", "cursor", "selection"].every(
    (key) =>
      terminalColor({ scheme: leftScheme, metadata: leftMetadata }, key) ===
      terminalColor({ scheme: rightScheme, metadata: rightMetadata }, key),
  );
}

function isModifiedAppearance(scheme, metadata, preset) {
  if (!scheme || !preset?.scheme) {
    return false;
  }

  return (
    TermPttAppearanceState.isModifiedScheme(scheme, preset.scheme) ||
    !isSameTerminalMetadata(scheme, metadata, preset.scheme, preset.metadata)
  );
}

function copyScheme(scheme) {
  const nextScheme = {};
  for (const key of schemeKeys) {
    nextScheme[key] = normalizeHex(scheme?.[key]) ?? "#000000";
  }
  return nextScheme;
}

function copyMetadata(metadata) {
  const nextMetadata = {};
  for (const key of terminalColorKeys) {
    const value = normalizeHex(metadata?.[key]);
    if (value) {
      nextMetadata[key] = value;
    }
  }
  return nextMetadata;
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

function connectPreviewPort({ updateStatus = true } = {}) {
  try {
    port = chrome.tabs.connect(activeTab.id, { name: PREVIEW_PORT_NAME });
  } catch {
    port = null;
    if (updateStatus) {
      setLivePageUnavailableStatus();
    }
    return;
  }

  const connectedPort = port;
  connectedPort.onDisconnect.addListener(() => {
    const isCurrentPort = port === connectedPort;
    if (isCurrentPort) {
      port = null;
    }
    if (isCurrentPort && chrome.runtime.lastError && updateStatus) {
      setLivePageUnavailableStatus();
    }
  });
}

function sendPreviewMessage(message) {
  void sendPreviewMessageAsync(message);
}

async function sendPreviewMessageAsync(message) {
  if (!(await ensurePreviewPort())) {
    return false;
  }

  noteLivePageAvailable();
  return postPreviewMessage(message);
}

function postPreviewMessage(message) {
  if (!port) {
    setLivePageUnavailableStatus();
    return false;
  }

  try {
    port.postMessage(message);
    return true;
  } catch {
    port = null;
    setLivePageUnavailableStatus();
    return false;
  }
}

async function sendPreviewMessageAndWait(message, expectedTypes) {
  if (!(await ensurePreviewPort())) {
    return false;
  }

  return postPreviewMessageAndWait(message, expectedTypes);
}

function postPreviewMessageAndWait(message, expectedTypes, { timeoutMs = APPLY_ACK_TIMEOUT_MS, updateStatusOnTimeout = true } = {}) {
  if (!port) {
    setLivePageUnavailableStatus();
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
      if (port === targetPort) {
        port = null;
      }
      finish(false);
    };

    timeoutId = setTimeout(() => {
      if (updateStatusOnTimeout) {
        statusNode.textContent = "Saved, but could not confirm the live page update.";
      }
      finish(false);
    }, timeoutMs);

    targetPort.onMessage.addListener(handleMessage);
    targetPort.onDisconnect.addListener(handleDisconnect);

    try {
      targetPort.postMessage(message);
    } catch {
      if (port === targetPort) {
        port = null;
      }
      if (updateStatusOnTimeout) {
        setLivePageUnavailableStatus();
      }
      finish(false);
    }
  });
}

async function ensurePreviewPort() {
  if (!previewPortPromise) {
    previewPortPromise = ensurePreviewPortInternal();
  }

  try {
    return await previewPortPromise;
  } finally {
    previewPortPromise = null;
  }
}

async function ensurePreviewPortInternal() {
  if (!port) {
    connectPreviewPort({ updateStatus: false });
  }

  if (port && (await postPreviewMessageAndWait(
    { type: "ping" },
    ["preview-ready"],
    { timeoutMs: PREVIEW_READY_TIMEOUT_MS, updateStatusOnTimeout: false },
  ))) {
    noteLivePageAvailable();
    return true;
  }

  port = null;

  if (!(await injectContentScripts())) {
    return false;
  }

  connectPreviewPort({ updateStatus: false });
  if (port && (await postPreviewMessageAndWait(
    { type: "ping" },
    ["preview-ready"],
    { timeoutMs: PREVIEW_READY_TIMEOUT_MS, updateStatusOnTimeout: false },
  ))) {
    noteLivePageAvailable();
    return true;
  }

  setLivePageUnavailableStatus();
  return false;
}

async function injectContentScripts() {
  if (!chrome.scripting?.executeScript || !activeTab?.id) {
    setLivePageUnavailableStatus();
    return false;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: CONTENT_SCRIPT_FILES,
    });
    return true;
  } catch {
    setLivePageUnavailableStatus();
    return false;
  }
}

function setLivePageUnavailableStatus() {
  statusNode.textContent = LIVE_PAGE_UNAVAILABLE_STATUS;
}

function noteLivePageAvailable() {
  if (statusNode.textContent === LIVE_PAGE_UNAVAILABLE_STATUS) {
    statusNode.textContent = `${registry.length} color presets available`;
  }
}
