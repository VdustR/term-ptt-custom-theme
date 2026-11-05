import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const nativePrefs = {
  colorScheme: "nord", customColors: Array(16).fill("#112233"),
  customDefaultBg: "#001122", customDefaultFg: "#ddeeff",
  customDefaultLink: "#ff6600", customForcePlainText: false, minimumContrast: 20,
  fontFace: "monospace", useCanvasEngine: true,
};
const palette = {
  colors: Array.from({ length: 16 }, (_, i) => `#${i.toString(16).repeat(6)}`),
  background: "#123456", foreground: "#abcdef", link: "#fedcba",
};

async function harness({ delayed = false } = {}) {
  const document = new EventTarget();
  const attributes = new Map();
  document.documentElement = {
    setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: (key) => attributes.delete(key),
  };
  class CustomEvent extends Event {
    constructor(type, options = {}) { super(type); this.detail = options.detail; }
  }
  let listener;
  const calls = [];
  const app = {
    prefValues: structuredClone(nativePrefs),
    on: (_, callback) => { listener = callback; },
    onValuesPrefChange(prefs) {
      this.prefValues = { ...prefs };
      calls.push(structuredClone(prefs));
      for (const [key, value] of Object.entries(prefs)) listener?.({ key, value });
    },
  };
  const context = vm.createContext({ document, CustomEvent, queueMicrotask, setTimeout, clearTimeout, window: { app: delayed ? undefined : app } });
  const code = await readFile("extension/native-colors.js", "utf8");
  vm.runInContext(code, context);
  return {
    app, calls, context, attributes,
    send(value) { document.dispatchEvent(new CustomEvent("term-ptt-custom-theme-palette", { detail: JSON.stringify(value) })); },
    reinject() { vm.runInContext(code, context); },
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test("native palette applies color preferences without changing unrelated preferences", async () => {
  const h = await harness();
  h.send(palette);
  assert.equal(h.app.prefValues.colorScheme, "custom");
  assert.deepEqual(Array.from(h.app.prefValues.customColors), palette.colors);
  assert.equal(h.app.prefValues.customDefaultBg, palette.background);
  assert.equal(h.app.prefValues.customDefaultFg, palette.foreground);
  assert.equal(h.app.prefValues.minimumContrast, 0);
  assert.equal(h.app.prefValues.fontFace, nativePrefs.fontFace);
  assert.equal(h.app.prefValues.useCanvasEngine, true);
  h.send(null);
  assert.deepEqual(JSON.parse(JSON.stringify(h.app.prefValues)), nativePrefs);
  assert.equal(h.attributes.has("data-term-ptt-native-colors"), false);
});

test("multiple previews restore the original site palette and reinjection is idempotent", async () => {
  const h = await harness();
  h.send(palette);
  h.reinject();
  h.send({ ...palette, background: "#654321" });
  h.send(null);
  assert.deepEqual(JSON.parse(JSON.stringify(h.app.prefValues)), nativePrefs);
});

test("site preference changes remain reversible while the extension owns colors", async () => {
  const h = await harness();
  h.send(palette);
  h.app.onValuesPrefChange({ ...h.app.prefValues, colorScheme: "dracula", fontFace: "custom-font" });
  await flush();
  assert.equal(h.app.prefValues.colorScheme, "custom");
  h.send(null);
  assert.equal(h.app.prefValues.colorScheme, "dracula");
  assert.equal(h.app.prefValues.fontFace, "custom-font");
});

test("malformed palette messages cannot call the site API or clear a valid preview", async () => {
  const h = await harness();
  h.send(palette);
  const count = h.calls.length;
  for (const bad of [{}, { ...palette, colors: ["red"] }, { ...palette, background: "url(https://example.com)" }]) h.send(bad);
  assert.equal(h.calls.length, count);
  assert.equal(h.app.prefValues.customDefaultBg, palette.background);
});

test("a palette arriving before app startup is applied when the app is ready", async () => {
  const h = await harness({ delayed: true });
  h.send(palette);
  h.context.window.app = h.app;
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal(h.app.prefValues.customDefaultBg, palette.background);
  h.send(null);
  assert.deepEqual(JSON.parse(JSON.stringify(h.app.prefValues)), nativePrefs);
});

test("clearing before startup cancels the pending palette", async () => {
  const h = await harness({ delayed: true });
  h.send(palette);
  h.send(null);
  h.context.window.app = h.app;
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal(h.calls.length, 0);
});
