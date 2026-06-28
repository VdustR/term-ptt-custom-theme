import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function loadContentHarness(storageState = {}) {
  const colorUtils = await readFile("extension/ptt-colors.js", "utf8");
  const webfontTagUtils = await readFile("extension/ptt-webfont-tags.js", "utf8");
  const contentScript = await readFile("extension/content.js", "utf8");
  const document = createFakeDocument();
  let connectListener = null;

  const context = {
    document,
    globalThis: null,
    chrome: {
      runtime: {
        onConnect: {
          addListener(listener) {
            connectListener = listener;
          },
        },
      },
      storage: {
        sync: {
          async get(keys) {
            if (Array.isArray(keys)) {
              return Object.fromEntries(keys.map((key) => [key, storageState[key]]));
            }

            return { [keys]: storageState[keys] };
          },
        },
      },
    },
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(colorUtils, context, { filename: "extension/ptt-colors.js" });
  vm.runInContext(webfontTagUtils, context, { filename: "extension/ptt-webfont-tags.js" });
  vm.runInContext(contentScript, context, { filename: "extension/content.js" });
  await flushPromises();

  return {
    document,
    connect(port = createFakePort()) {
      assert.equal(typeof connectListener, "function");
      connectListener(port);
      return port;
    },
    styleText(id) {
      return document.getElementById(id)?.textContent ?? null;
    },
    webfontTexts() {
      return document.head.children.map((node) => node.textContent);
    },
    webfontLinks() {
      return document.head.children
        .filter((node) => node.tagName === "link")
        .map((node) => node.attributes);
    },
  };
}

const savedScheme = {
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

const previewScheme = {
  id: "preview",
  name: "Preview",
  scheme: {
    ...savedScheme,
    black: "#111111",
    brightWhite: "#eeeeee",
  },
};

const savedWebfontStyleText =
  '@font-face{font-family:"Saved PTT Font";src:url("https://example.com/saved.woff2") format("woff2")}';
const previewWebfontStyleText =
  '@font-face{font-family:"Preview PTT Font";src:url("https://example.com/preview.woff2") format("woff2")}';
const savedWebfontTags = `<style>${savedWebfontStyleText}</style>`;
const previewWebfontTags =
  `<style>${previewWebfontStyleText}</style><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`;

test("content script loads saved scheme and webfont tags from storage", async () => {
  const harness = await loadContentHarness({
    selectedScheme: {
      id: "saved",
      name: "Saved",
      basePresetId: "saved",
      scheme: savedScheme,
    },
    selectedWebfontTags: savedWebfontTags,
  });

  assert.match(harness.styleText("term-ptt-custom-theme-colors-active"), /--term-color-black:#000000/);
  assert.deepEqual(harness.webfontTexts(), [savedWebfontStyleText]);
});

test("content script ignores invalid saved webfont tags", async () => {
  const harness = await loadContentHarness({
    selectedWebfontTags: '<script src="https://example.com/a.js"></script>',
  });

  assert.deepEqual(harness.webfontTexts(), []);
});

test("content script previews scheme and webfont tags, then restores saved appearance on disconnect", async () => {
  const harness = await loadContentHarness({
    selectedScheme: {
      id: "saved",
      name: "Saved",
      basePresetId: "saved",
      scheme: savedScheme,
    },
    selectedWebfontTags: savedWebfontTags,
  });
  const port = harness.connect();

  port.send({ type: "preview-scheme", preset: previewScheme });
  port.send({ type: "preview-webfont-tags", tags: previewWebfontTags });

  assert.match(harness.styleText("term-ptt-custom-theme-colors-active"), /--term-color-black:#111111/);
  assert.deepEqual(harness.webfontTexts(), [previewWebfontStyleText, ""]);
  assert.deepEqual(harness.webfontLinks(), [
    {
      crossorigin: "",
      href: "https://fonts.gstatic.com",
      rel: "preconnect",
    },
  ]);
  assert.deepEqual(toPlainObject(port.messages), [
    { type: "preview-applied", id: "preview" },
    { type: "webfont-tags-preview-applied" },
  ]);

  port.disconnect();

  assert.match(harness.styleText("term-ptt-custom-theme-colors-active"), /--term-color-black:#000000/);
  assert.deepEqual(harness.webfontTexts(), [savedWebfontStyleText]);
});

test("content script previews and applies Term PTT Default by clearing styles", async () => {
  const harness = await loadContentHarness({
    selectedScheme: {
      id: "saved",
      name: "Saved",
      basePresetId: "saved",
      scheme: savedScheme,
    },
    selectedWebfontTags: savedWebfontTags,
  });
  const previewPort = harness.connect();

  previewPort.send({ type: "preview-clear-scheme" });
  previewPort.send({ type: "preview-clear-webfont-tags" });

  assert.equal(harness.styleText("term-ptt-custom-theme-colors-active"), null);
  assert.deepEqual(harness.webfontTexts(), []);
  assert.deepEqual(toPlainObject(previewPort.messages), [
    { type: "scheme-preview-cleared" },
    { type: "webfont-tags-preview-cleared" },
  ]);

  previewPort.disconnect();

  assert.match(harness.styleText("term-ptt-custom-theme-colors-active"), /--term-color-black:#000000/);
  assert.deepEqual(harness.webfontTexts(), [savedWebfontStyleText]);

  const applyPort = harness.connect();
  applyPort.send({ type: "preview-clear-scheme" });
  applyPort.send({ type: "apply-clear-scheme" });
  applyPort.send({ type: "preview-clear-webfont-tags" });
  applyPort.send({ type: "apply-clear-webfont-tags" });
  applyPort.disconnect();

  assert.equal(harness.styleText("term-ptt-custom-theme-colors-active"), null);
  assert.deepEqual(harness.webfontTexts(), []);
});

test("content script keeps applied appearance after popup disconnects", async () => {
  const harness = await loadContentHarness();
  const port = harness.connect();

  port.send({ type: "preview-scheme", preset: previewScheme });
  port.send({ type: "apply-scheme", preset: previewScheme });
  port.send({ type: "preview-webfont-tags", tags: previewWebfontTags });
  port.send({ type: "apply-webfont-tags", tags: previewWebfontTags });
  port.disconnect();

  assert.match(harness.styleText("term-ptt-custom-theme-colors-active"), /--term-color-black:#111111/);
  assert.deepEqual(harness.webfontTexts(), [previewWebfontStyleText, ""]);
});

function createFakeDocument() {
  const nodes = new Map();
  const documentElement = createFakeElement(nodes, "html");
  const head = createFakeElement(nodes, "head");

  return {
    documentElement,
    head,
    createElement(tagName) {
      return createFakeElement(nodes, tagName);
    },
    getElementById(id) {
      return nodes.get(id) ?? null;
    },
  };
}

async function flushPromises() {
  for (let index = 0; index < 20; index += 1) {
    await Promise.resolve();
  }
}

function toPlainObject(value) {
  return JSON.parse(JSON.stringify(value));
}

function createFakeElement(nodes, tagName = "") {
  let currentId = "";
  const element = {
    attributes: {},
    children: [],
    parentNode: null,
    tagName,
    textContent: "",
    appendChild(child) {
      child.parentNode = element;
      element.children.push(child);
      if (child.id) {
        nodes.set(child.id, child);
      }
      return child;
    },
    remove() {
      if (currentId) {
        nodes.delete(currentId);
      }
      if (element.parentNode) {
        element.parentNode.children = element.parentNode.children.filter((child) => child !== element);
        element.parentNode = null;
      }
    },
    setAttribute(name, value) {
      element.attributes[name] = value;
    },
  };

  Object.defineProperty(element, "id", {
    get() {
      return currentId;
    },
    set(value) {
      if (currentId) {
        nodes.delete(currentId);
      }
      currentId = value;
      if (currentId) {
        nodes.set(currentId, element);
      }
    },
  });

  return element;
}

function createFakePort() {
  let messageListener = null;
  let disconnectListener = null;

  return {
    name: "term-ptt-custom-theme-preview",
    messages: [],
    onMessage: {
      addListener(listener) {
        messageListener = listener;
      },
    },
    onDisconnect: {
      addListener(listener) {
        disconnectListener = listener;
      },
    },
    postMessage(message) {
      this.messages.push(message);
    },
    send(message) {
      assert.equal(typeof messageListener, "function");
      messageListener(message);
    },
    disconnect() {
      if (disconnectListener) {
        disconnectListener();
      }
    },
  };
}
