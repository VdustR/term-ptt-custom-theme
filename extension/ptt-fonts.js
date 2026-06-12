(function () {
  const fontTargets = "body,.main,#easyReadingLastRow,#easyReadingReplyRow";
  const genericFamilies = new Set([
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-serif",
    "ui-sans-serif",
    "ui-monospace",
  ]);

  function fontToCss(font) {
    assertPttFont(font);

    return `:root{--term-ptt-font-family:${serializeFontStack(font.fallbackStack)};}${fontTargets}{font-family:var(--term-ptt-font-family)!important;letter-spacing:0;}`;
  }

  function serializeFontStack(fallbackStack) {
    return fallbackStack.map(serializeFontFamily).join(",");
  }

  function serializeFontFamily(fontFamily) {
    if (genericFamilies.has(fontFamily) || /^[A-Za-z0-9_-]+$/.test(fontFamily)) {
      return fontFamily;
    }

    return `"${fontFamily}"`;
  }

  function assertPttFont(font) {
    if (!font || typeof font !== "object") {
      throw new Error("Missing PTT font");
    }

    if (typeof font.id !== "string" || typeof font.name !== "string") {
      throw new Error("PTT font requires id and name");
    }

    if (!Array.isArray(font.fallbackStack) || font.fallbackStack.length === 0) {
      throw new Error("PTT font requires a fallback stack");
    }

    for (const fontFamily of font.fallbackStack) {
      if (
        typeof fontFamily !== "string" ||
        fontFamily.trim() === "" ||
        /["\\\n\r\f]/.test(fontFamily)
      ) {
        throw new Error(`Invalid PTT font family: ${fontFamily}`);
      }
    }
  }

  globalThis.TermPttFonts = {
    fontToCss,
  };
})();
