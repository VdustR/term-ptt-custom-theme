const statusNode = document.getElementById("status");
const controlsNode = document.getElementById("controls");
const searchInput = document.getElementById("searchInput");
const fontSelect = document.getElementById("fontSelect");
const fontStatus = document.getElementById("fontStatus");
const colorListNode = document.getElementById("colorList");
const applyButton = document.getElementById("applyButton");
const resetButton = document.getElementById("resetButton");

let activeTab = null;
let port = null;
let registry = [];
let fontRegistry = [];
let selectedPreset = null;
let savedPreset = null;
let selectedFont = null;
let savedFont = null;

init();

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tab;

  if (!activeTab?.id || !activeTab.url?.startsWith("https://term.ptt.cc/")) {
    statusNode.textContent = "Open term.ptt.cc to preview colors.";
    return;
  }

  const [colorsResponse, fontsResponse, storage] = await Promise.all([
    fetch("assets/colors.json"),
    fetch("assets/fonts.json"),
    chrome.storage.sync.get(["selectedColors", "selectedFont"]),
  ]);
  const colorsRegistry = await colorsResponse.json();
  const fontsRegistry = await fontsResponse.json();
  registry = colorsRegistry.colors;
  fontRegistry = fontsRegistry.fonts;
  savedPreset = reconcilePreset(storage.selectedColors ?? null);
  savedFont = reconcileFont(storage.selectedFont ?? null);

  connectPreviewPort();

  selectedPreset = savedPreset ?? registry[0];
  selectedFont = savedFont ?? fontRegistry[0];
  statusNode.textContent = `${registry.length} colors and ${fontRegistry.length} fonts available`;
  controlsNode.hidden = false;
  bindEvents();
  renderFonts();
  renderColors();
  updateApplyButton();
}

function bindEvents() {
  searchInput.addEventListener("input", renderColors);
  fontSelect.addEventListener("change", selectFont);
  resetButton.addEventListener("click", resetPreview);
  applyButton.addEventListener("click", applySelectedPreset);
}

function renderFonts() {
  fontSelect.replaceChildren(...fontRegistry.map(renderFontOption));
  fontSelect.value = selectedFont?.id ?? "";
  updateFontStatus();
}

function renderFontOption(font) {
  const option = document.createElement("option");
  option.value = font.id;
  option.textContent = font.status === "planned" ? `${font.name} (planned)` : font.name;
  return option;
}

function renderColors() {
  const query = searchInput.value.trim().toLowerCase();
  const matches = registry.filter((preset) => preset.name.toLowerCase().includes(query));

  colorListNode.replaceChildren(...matches.map(renderColorButton));
}

function renderColorButton(preset) {
  const button = document.createElement("button");
  button.className = "color-button";
  button.type = "button";
  button.setAttribute("aria-pressed", String(preset.id === selectedPreset?.id));
  button.addEventListener("click", () => selectPreset(preset));

  const label = document.createElement("div");
  label.className = "color-label";
  const name = document.createElement("strong");
  name.textContent = preset.name;
  const source = document.createElement("span");
  source.textContent = preset.sourcePath;
  label.append(name, source);

  const swatches = document.createElement("div");
  swatches.className = "swatches";
  for (const value of Object.values(preset.colors).slice(0, 8)) {
    const swatch = document.createElement("i");
    swatch.style.backgroundColor = value;
    swatches.append(swatch);
  }

  button.append(label, swatches);
  return button;
}

function selectPreset(preset) {
  selectedPreset = preset;
  updateApplyButton();
  renderColors();
  sendPreviewMessage({ type: "preview-colors", preset });
}

function selectFont() {
  selectedFont = findFont(fontSelect.value) ?? fontRegistry[0];
  updateFontStatus();
  updateApplyButton();
  sendPreviewMessage({ type: "preview-font", font: selectedFont });
}

async function applySelectedPreset() {
  if (!selectedPreset || !selectedFont) {
    return;
  }

  applyButton.disabled = true;

  const storedPreset = {
    id: selectedPreset.id,
    name: selectedPreset.name,
    colors: selectedPreset.colors,
  };
  const storedFont = toStoredFont(selectedFont);

  try {
    await chrome.storage.sync.set({ selectedColors: storedPreset, selectedFont: storedFont });
  } catch {
    statusNode.textContent = "Could not save appearance.";
    updateApplyButton();
    return;
  }

  savedPreset = selectedPreset;
  savedFont = selectedFont;
  updateFontStatus();
  updateApplyButton();
  statusNode.textContent = `Applied ${selectedPreset.name} with ${selectedFont.name}`;
  sendPreviewMessage({ type: "apply-colors", preset: selectedPreset });
  sendPreviewMessage({ type: "apply-font", font: selectedFont });
}

async function resetPreview() {
  selectedPreset = savedPreset ? (findPreset(savedPreset.id) ?? savedPreset) : registry[0];
  selectedFont = (savedFont ? (findFont(savedFont.id) ?? savedFont) : null) ?? fontRegistry[0];
  updateApplyButton();
  renderFonts();
  renderColors();
  sendPreviewMessage({ type: "reset-preview" });
  statusNode.textContent = savedPreset && selectedFont
    ? `Restored ${savedPreset.name} with ${selectedFont.name}`
    : "Preview reset";
}

function findPreset(id) {
  return registry.find((preset) => preset.id === id) ?? null;
}

function findFont(id) {
  return fontRegistry.find((font) => font.id === id) ?? null;
}

function reconcilePreset(preset) {
  if (!preset) {
    return null;
  }

  return findPreset(preset.id) ?? preset;
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
    fontStatus.textContent = "No font selected";
    return;
  }

  fontStatus.textContent =
    selectedFont.status === "planned"
      ? "Uses fallback unless the processed font is installed."
      : selectedFont.fallbackStack.join(", ");
}

function updateApplyButton() {
  applyButton.disabled =
    !selectedPreset ||
    !selectedFont ||
    (savedPreset?.id === selectedPreset.id && savedFont?.id === selectedFont.id);
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
