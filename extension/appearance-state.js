(function () {
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

  const defaultColorsPreset = {
    id: "term-ptt-default",
    name: "Term PTT Default",
    sourcePath: "term.ptt.cc default colors",
    scheme: null,
    metadata: { isDefault: true },
  };

  function createInitialAppearanceState({ registry, storage }) {
    const defaultPreset = defaultColorsPreset;
    const draft = normalizeDraft(storage.appearanceDraft, registry);

    if (draft) {
      const selectedPreset = findPreset(registry, draft.basePresetId) ?? defaultPreset;
      return {
        selectedPreset,
        selectedScheme: draft.scheme,
        selectedMetadata: draft.metadata ?? selectedPreset?.metadata ?? {},
        selectedWebfontTags: draft.webfontTags,
        query: draft.query,
        isModified: isModifiedScheme(draft.scheme, selectedPreset?.scheme),
      };
    }

    const saved = normalizeSavedAppearance(storage);
    const selectedPreset = findPreset(registry, saved?.basePresetId ?? saved?.id) ?? defaultPreset;
    const selectedScheme = saved?.scheme ?? selectedPreset?.scheme ?? null;

    return {
      selectedPreset,
      selectedScheme,
      selectedMetadata: saved?.metadata ?? selectedPreset?.metadata ?? {},
      selectedWebfontTags: typeof storage.selectedWebfontTags === "string" ? storage.selectedWebfontTags : "",
      query: "",
      isModified: isModifiedScheme(selectedScheme, selectedPreset?.scheme),
    };
  }

  function normalizeSavedAppearance(storage) {
    if (storage.selectedScheme?.scheme) {
      return storage.selectedScheme;
    }

    return null;
  }

  function normalizeDraft(draft, registry) {
    if (!draft || !draft.basePresetId || !Object.hasOwn(draft, "scheme")) {
      return null;
    }

    return {
      basePresetId: draft.basePresetId,
      basePresetName:
        draft.basePresetName ?? findPreset(registry, draft.basePresetId)?.name ?? draft.basePresetId,
      scheme: draft.scheme,
      metadata: draft.metadata ?? findPreset(registry, draft.basePresetId)?.metadata ?? {},
      webfontTags: typeof draft.webfontTags === "string" ? draft.webfontTags : "",
      query: typeof draft.query === "string" ? draft.query : "",
    };
  }

  function toDraft({ preset, scheme, metadata, webfontTags, query }) {
    return {
      basePresetId: preset.id,
      basePresetName: preset.name,
      scheme: scheme ? copyScheme(scheme) : null,
      metadata: metadata ?? {},
      webfontTags: typeof webfontTags === "string" ? webfontTags : "",
      query: typeof query === "string" ? query : "",
    };
  }

  function toStoredScheme({ preset, scheme, metadata }) {
    return {
      id: preset.id,
      name: preset.name,
      basePresetId: preset.id,
      scheme: copyScheme(scheme),
      metadata: metadata ?? {},
    };
  }

  function isModifiedScheme(scheme, baseScheme) {
    if (!scheme || !baseScheme) {
      return false;
    }

    return schemeKeys.some((key) => scheme[key] !== baseScheme[key]);
  }

  function copyScheme(scheme) {
    const nextScheme = {};
    for (const key of schemeKeys) {
      nextScheme[key] = scheme[key];
    }
    return nextScheme;
  }

  function findPreset(registry, id) {
    if (!id) {
      return null;
    }

    if (id === defaultColorsPreset.id) {
      return defaultColorsPreset;
    }

    return registry.find((preset) => preset.id === id) ?? null;
  }

  globalThis.TermPttAppearanceState = {
    createInitialAppearanceState,
    defaultColorsPreset,
    isModifiedScheme,
    toDraft,
    toStoredScheme,
  };
})();
