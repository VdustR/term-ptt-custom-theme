import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function loadAppearanceState() {
  const code = await readFile("extension/appearance-state.js", "utf8");
  const context = { globalThis: {} };
  context.globalThis = context;
  vm.runInNewContext(code, context, { filename: "extension/appearance-state.js" });
  return context.TermPttAppearanceState;
}

const gruvbox = {
  id: "gruvbox-dark",
  name: "Gruvbox Dark",
  scheme: {
    black: "#282828",
    red: "#cc241d",
    green: "#98971a",
    yellow: "#d79921",
    blue: "#458588",
    purple: "#b16286",
    cyan: "#689d6a",
    white: "#a89984",
    brightBlack: "#928374",
    brightRed: "#fb4934",
    brightGreen: "#b8bb26",
    brightYellow: "#fabd2f",
    brightBlue: "#83a598",
    brightPurple: "#d3869b",
    brightCyan: "#8ec07c",
    brightWhite: "#ebdbb2",
  },
  metadata: { isDark: true },
};

const solarized = {
  ...gruvbox,
  id: "solarized-dark",
  name: "Solarized Dark",
  scheme: {
    ...gruvbox.scheme,
    black: "#002b36",
    brightWhite: "#fdf6e3",
  },
};

const systemFont = {
  id: "system-default",
  name: "PTT System Default",
  fallbackStack: ["MingLiU", "monospace"],
};

const retroFont = {
  id: "retro-pixel",
  name: "Retro Pixel",
  fallbackStack: ["lithue-1.1", "MingLiU", "monospace"],
};

test("appearance state prefers session draft over saved appearance", async () => {
  const TermPttAppearanceState = await loadAppearanceState();
  const draft = {
    basePresetId: "gruvbox-dark",
    basePresetName: "Gruvbox Dark",
    scheme: { ...gruvbox.scheme, brightRed: "#ff0000" },
    metadata: gruvbox.metadata,
    font: retroFont,
    query: "gruv",
  };

  const state = TermPttAppearanceState.createInitialAppearanceState({
    registry: [gruvbox, solarized],
    fontRegistry: [systemFont, retroFont],
    storage: {
      selectedScheme: {
        id: "solarized-dark",
        name: "Solarized Dark",
        basePresetId: "solarized-dark",
        scheme: solarized.scheme,
        metadata: solarized.metadata,
      },
      selectedFont: systemFont,
      appearanceDraft: draft,
    },
  });

  assert.equal(state.selectedPreset.id, "gruvbox-dark");
  assert.equal(state.selectedScheme.brightRed, "#ff0000");
  assert.equal(state.selectedFont.id, "retro-pixel");
  assert.equal(state.query, "gruv");
  assert.equal(state.isModified, true);
});

test("appearance state restores saved selectedScheme when no draft exists", async () => {
  const TermPttAppearanceState = await loadAppearanceState();
  const state = TermPttAppearanceState.createInitialAppearanceState({
    registry: [gruvbox, solarized],
    fontRegistry: [systemFont, retroFont],
    storage: {
      selectedScheme: {
        id: "solarized-dark",
        name: "Solarized Dark",
        basePresetId: "solarized-dark",
        scheme: solarized.scheme,
        metadata: solarized.metadata,
      },
      selectedFont: retroFont,
      appearanceDraft: null,
    },
  });

  assert.equal(state.selectedPreset.id, "solarized-dark");
  assert.equal(state.selectedScheme.black, "#002b36");
  assert.equal(state.selectedFont.id, "retro-pixel");
  assert.equal(state.isModified, false);
});

test("appearance state falls back to Term PTT Default without selectedScheme", async () => {
  const TermPttAppearanceState = await loadAppearanceState();
  const state = TermPttAppearanceState.createInitialAppearanceState({
    registry: [gruvbox, solarized],
    fontRegistry: [systemFont, retroFont],
    storage: {
      selectedScheme: null,
      selectedFont: null,
      appearanceDraft: null,
    },
  });

  assert.equal(state.selectedPreset.id, "term-ptt-default");
  assert.equal(state.selectedPreset.name, "Term PTT Default");
  assert.equal(state.selectedScheme, null);
  assert.equal(state.selectedFont, null);
  assert.equal(state.isModified, false);
});

test("appearance state restores a Term PTT Default draft", async () => {
  const TermPttAppearanceState = await loadAppearanceState();
  const draft = {
    basePresetId: "term-ptt-default",
    basePresetName: "Term PTT Default",
    scheme: null,
    metadata: {},
    font: null,
    query: "",
  };

  const state = TermPttAppearanceState.createInitialAppearanceState({
    registry: [gruvbox, solarized],
    fontRegistry: [systemFont, retroFont],
    storage: {
      selectedScheme: {
        id: "solarized-dark",
        name: "Solarized Dark",
        basePresetId: "solarized-dark",
        scheme: solarized.scheme,
        metadata: solarized.metadata,
      },
      selectedFont: retroFont,
      appearanceDraft: draft,
    },
  });

  assert.equal(state.selectedPreset.id, "term-ptt-default");
  assert.equal(state.selectedScheme, null);
  assert.equal(state.selectedFont, null);
  assert.equal(state.query, "");
  assert.equal(state.isModified, false);
});

test("appearance state serializes draft and stored scheme shapes", async () => {
  const TermPttAppearanceState = await loadAppearanceState();
  const draft = TermPttAppearanceState.toDraft({
    preset: gruvbox,
    scheme: { ...gruvbox.scheme, red: "#ff0000" },
    metadata: gruvbox.metadata,
    font: retroFont,
    query: "box",
  });
  const storedScheme = TermPttAppearanceState.toStoredScheme({
    preset: gruvbox,
    scheme: gruvbox.scheme,
    metadata: gruvbox.metadata,
  });

  assert.equal(draft.basePresetId, "gruvbox-dark");
  assert.equal(draft.basePresetName, "Gruvbox Dark");
  assert.equal(draft.scheme.red, "#ff0000");
  assert.equal(draft.font.id, "retro-pixel");
  assert.equal(draft.query, "box");
  assert.equal(Object.hasOwn(draft, "isEditorExpanded"), false);
  assert.equal(Object.hasOwn(draft, "activeColorKey"), false);
  assert.equal(storedScheme.id, "gruvbox-dark");
  assert.equal(storedScheme.basePresetId, "gruvbox-dark");
  assert.equal(storedScheme.scheme.black, "#282828");
});

test("appearance state serializes a Term PTT Default draft shape", async () => {
  const TermPttAppearanceState = await loadAppearanceState();
  const draft = TermPttAppearanceState.toDraft({
    preset: {
      id: "term-ptt-default",
      name: "Term PTT Default",
      metadata: {},
    },
    scheme: null,
    metadata: {},
    font: null,
    query: "",
  });

  assert.equal(draft.basePresetId, "term-ptt-default");
  assert.equal(draft.basePresetName, "Term PTT Default");
  assert.equal(draft.scheme, null);
  assert.equal(draft.font, null);
});
