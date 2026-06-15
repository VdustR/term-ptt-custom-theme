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

  function schemeToPttColors(scheme) {
    assertExactSchemeKeys(scheme);
    const colors = {};

    for (const [schemeKey, pttKey] of Object.entries(schemeToPttKey)) {
      assertHexColor(scheme[schemeKey], schemeKey);
      colors[pttKey] = scheme[schemeKey];
    }

    return colors;
  }

  function schemeToCssVariables(scheme) {
    return colorsToCssVariables(schemeToPttColors(scheme));
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
    if (!supportedPttKeys.has(key)) {
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

  function assertHexColor(value, key) {
    if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
      throw new Error(`Invalid color value for ${key}: ${value}`);
    }
  }

  globalThis.TermPttColors = {
    schemeToCssVariables,
    schemeToPttColors,
  };
})();
