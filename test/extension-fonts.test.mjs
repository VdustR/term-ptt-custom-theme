import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function loadExtensionFontUtils() {
  const code = await readFile("extension/ptt-fonts.js", "utf8");
  const context = { globalThis: {} };
  context.globalThis = context;
  vm.runInNewContext(code, context, { filename: "extension/ptt-fonts.js" });
  return context.TermPttFonts;
}

test("extension font utility serializes a PTT font stylesheet", async () => {
  const { fontToCss } = await loadExtensionFontUtils();

  assert.equal(
    fontToCss({
      id: "fusion-pixel-ptt",
      name: "Fusion Pixel PTT",
      fallbackStack: ["Fusion Pixel PTT", "MingLiu", "SymMingLiu", "monospace"],
    }),
    ':root{--term-ptt-font-family:"Fusion Pixel PTT",MingLiu,SymMingLiu,monospace;}body,.main,#easyReadingLastRow,#easyReadingReplyRow{font-family:var(--term-ptt-font-family)!important;letter-spacing:0;}',
  );
});

test("extension font utility rejects missing font identity", async () => {
  const { fontToCss } = await loadExtensionFontUtils();

  assert.throws(
    () => fontToCss({ fallbackStack: ["monospace"] }),
    /PTT font requires id and name/,
  );
});

test("extension font utility rejects invalid fallback stacks", async () => {
  const { fontToCss } = await loadExtensionFontUtils();

  assert.throws(
    () =>
      fontToCss({
        id: "bad",
        name: "Bad",
        fallbackStack: [],
      }),
    /PTT font requires a fallback stack/,
  );
});
