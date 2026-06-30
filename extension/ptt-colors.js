(function () {
  const schemeToPttKey = {
    black: "black",
    red: "maroon",
    green: "green",
    yellow: "olive",
    blue: "navy",
    purple: "purple",
    cyan: "teal",
    white: "silver",
    brightBlack: "grey",
    brightRed: "red",
    brightGreen: "0f0",
    brightYellow: "ff0",
    brightBlue: "00f",
    brightPurple: "f0f",
    brightCyan: "0ff",
    brightWhite: "fff",
  };
  const supportedSchemeKeys = new Set(Object.keys(schemeToPttKey));
  const supportedPttKeys = new Set(Object.values(schemeToPttKey));

  function schemeToPttColors(scheme, metadata = {}) {
    assertExactSchemeKeys(scheme);
    const terminalColors = schemeToTerminalColors(scheme, metadata);
    const colors = {};

    for (const [schemeKey, pttKey] of Object.entries(schemeToPttKey)) {
      assertHexColor(scheme[schemeKey], schemeKey);
      colors[pttKey] = schemeKey === "black" ? terminalColors.background : scheme[schemeKey];
    }

    return colors;
  }

  function schemeToTerminalColors(scheme, metadata = {}) {
    assertExactSchemeKeys(scheme);

    const foreground = optionalHexColor(metadata.foreground, "foreground") ?? scheme.brightWhite;
    return {
      background: optionalHexColor(metadata.background, "background") ?? scheme.black,
      foreground,
      cursor: optionalHexColor(metadata.cursor, "cursor") ?? foreground,
      selection: optionalHexColor(metadata.selection, "selection") ?? scheme.brightBlack,
    };
  }

  function schemeToCssVariables(scheme, metadata = {}) {
    return colorsToCssVariables({
      ...schemeToTerminalColors(scheme, metadata),
      ...schemeToPttColors(scheme, metadata),
    });
  }

  function colorsToCssVariables(colors) {
    return `:root{${Object.entries(colors)
      .map(([key, value]) => {
        assertPttColor(key, value);
        return `--term-color-${key}:${value};`;
      })
      .join("")}}`;
  }

  function assertPttColor(key, value) {
    if (!supportedPttKeys.has(key) && !isSemanticColorKey(key)) {
      throw new Error(`Unsupported term.ptt CSS color key: ${key}`);
    }

    assertHexColor(value, key);
  }

  function assertExactSchemeKeys(scheme) {
    if (!scheme || typeof scheme !== "object") {
      throw new Error("Scheme is required");
    }

    for (const key of Object.keys(scheme)) {
      if (!supportedSchemeKeys.has(key)) {
        throw new Error(`Unsupported ANSI scheme color key: ${key}`);
      }
    }
  }

  function isSemanticColorKey(key) {
    return key === "background" || key === "foreground" || key === "cursor" || key === "selection";
  }

  function assertHexColor(value, key) {
    if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
      throw new Error(`Invalid color value for ${key}: ${value}`);
    }
  }

  function optionalHexColor(value, key) {
    if (value == null) {
      return null;
    }

    assertHexColor(value, key);
    return value;
  }

  globalThis.TermPttColors = {
    schemeToCssVariables,
    schemeToPttColors,
    schemeToTerminalColors,
  };
})();
