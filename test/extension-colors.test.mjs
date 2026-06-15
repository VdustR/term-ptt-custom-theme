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

const ansiScheme = {
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

test("extension color utility maps ANSI schemes to term.ptt CSS color keys", async () => {
  const { schemeToPttColors } = await loadExtensionColorUtils();

  assert.deepEqual({ ...schemeToPttColors(ansiScheme) }, {
    black: "#000000",
    maroon: "#800000",
    green: "#008000",
    olive: "#808000",
    navy: "#000080",
    purple: "#800080",
    teal: "#008080",
    silver: "#c0c0c0",
    grey: "#808080",
    red: "#ff0000",
    "0f0": "#00ff00",
    ff0: "#ffff00",
    "00f": "#0000ff",
    f0f: "#ff00ff",
    "0ff": "#00ffff",
    fff: "#ffffff",
  });
});

test("extension color utility serializes ANSI schemes to term.ptt CSS variables", async () => {
  const { schemeToCssVariables } = await loadExtensionColorUtils();

  assert.equal(
    schemeToCssVariables(ansiScheme),
    ":root{--term-color-black:#000000;--term-color-maroon:#800000;--term-color-green:#008000;--term-color-olive:#808000;--term-color-navy:#000080;--term-color-purple:#800080;--term-color-teal:#008080;--term-color-silver:#c0c0c0;--term-color-grey:#808080;--term-color-red:#ff0000;--term-color-0f0:#00ff00;--term-color-ff0:#ffff00;--term-color-00f:#0000ff;--term-color-f0f:#ff00ff;--term-color-0ff:#00ffff;--term-color-fff:#ffffff;}",
  );
});

test("extension color utility rejects missing ANSI scheme keys", async () => {
  const { schemeToCssVariables } = await loadExtensionColorUtils();

  assert.throws(
    () => schemeToCssVariables({ black: "#000000" }),
    /Invalid color value for red/,
  );
});

test("extension color utility rejects missing scheme objects", async () => {
  const { schemeToCssVariables } = await loadExtensionColorUtils();

  assert.throws(
    () => schemeToCssVariables(null),
    /Scheme is required/,
  );
});

test("extension color utility rejects unsupported ANSI scheme keys", async () => {
  const { schemeToCssVariables } = await loadExtensionColorUtils();

  assert.throws(
    () => schemeToCssVariables({ ...ansiScheme, background: "#000000" }),
    /Unsupported ANSI scheme color key: background/,
  );
});

test("extension color utility rejects invalid color values", async () => {
  const { schemeToCssVariables } = await loadExtensionColorUtils();

  assert.throws(
    () => schemeToCssVariables({ ...ansiScheme, red: "red" }),
    /Invalid color value for red/,
  );
});

test("shared color stylesheet has priority over term.ptt.cc page styles", async () => {
  const css = await readFile("extension/assets/color.css", "utf8");

  assert.match(css, /body\s*\{[^}]*background-color: var\(--term-color-black\) !important/s);
  assert.match(css, /\.main\s*\{[^}]*background-color: var\(--term-color-black\) !important/s);
  assert.match(css, /\.q1\s*\{[^}]*color: var\(--term-color-maroon\) !important/s);
  assert.match(css, /\.b1\s*\{[^}]*background-color: var\(--term-color-maroon\) !important/s);
});
