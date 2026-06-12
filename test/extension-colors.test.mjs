import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function loadExtensionColorUtils() {
  const code = await readFile("extension/ptt-colors.js", "utf8");
  const context = { globalThis: {} };
  context.globalThis = context;
  vm.runInNewContext(code, context, { filename: "extension/ptt-colors.js" });
  return context.TermPttColors;
}

test("extension color utility serializes PTT CSS variables", async () => {
  const { colorsToCssVariables } = await loadExtensionColorUtils();

  assert.equal(
    colorsToCssVariables({
      black: "#000000",
      maroon: "#800000",
      "0f0": "#00ff00",
      fff: "#ffffff",
    }),
    ":root{--term-color-black:#000000;--term-color-maroon:#800000;--term-color-0f0:#00ff00;--term-color-fff:#ffffff;}",
  );
});

test("extension color utility rejects invalid color keys", async () => {
  const { colorsToCssVariables } = await loadExtensionColorUtils();

  assert.throws(
    () => colorsToCssVariables({ background: "#000000" }),
    /Unsupported PTT color key: background/,
  );
});

test("extension color utility rejects invalid color values", async () => {
  const { colorsToCssVariables } = await loadExtensionColorUtils();

  assert.throws(
    () => colorsToCssVariables({ black: "red" }),
    /Invalid PTT color value for black/,
  );
});

test("shared color stylesheet has priority over term.ptt.cc page styles", async () => {
  const css = await readFile("extension/assets/color.css", "utf8");

  assert.match(css, /body\s*\{[^}]*background-color: var\(--term-color-black\) !important/s);
  assert.match(css, /\.main\s*\{[^}]*background-color: var\(--term-color-black\) !important/s);
  assert.match(css, /\.q1\s*\{[^}]*color: var\(--term-color-maroon\) !important/s);
  assert.match(css, /\.b1\s*\{[^}]*background-color: var\(--term-color-maroon\) !important/s);
});
