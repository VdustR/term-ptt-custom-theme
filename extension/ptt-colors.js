(function () {
  const supportedKeys = new Set([
    "black",
    "maroon",
    "green",
    "olive",
    "navy",
    "purple",
    "teal",
    "silver",
    "grey",
    "red",
    "0f0",
    "ff0",
    "00f",
    "f0f",
    "0ff",
    "fff",
  ]);

  function colorsToCssVariables(colors) {
    return `:root{${Object.entries(colors)
      .map(([key, value]) => {
        assertPttColor(key, value);
        return `--term-color-${key}:${value};`;
      })
      .join("")}}`;
  }

  function assertPttColor(key, value) {
    if (!supportedKeys.has(key)) {
      throw new Error(`Unsupported PTT color key: ${key}`);
    }

    if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
      throw new Error(`Invalid PTT color value for ${key}: ${value}`);
    }
  }

  globalThis.TermPttColors = {
    colorsToCssVariables,
  };
})();
