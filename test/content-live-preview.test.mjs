import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function loadContentHarness(storageState = {}) {
  const colorUtils = await readFile("extension/ptt-colors.js", "utf8");
  const fontUtils = await readFile("extension/ptt-fonts.js", "utf8");
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
  vm.runInContext(fontUtils, context, { filename: "extension/ptt-fonts.js" });
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
  };
}

const savedPreset = {
  id: "saved",
  name: "Saved",
  colors: {
    black: "#000000",
    fff: "#ffffff",
  },
};

const previewPreset = {
  id: "preview",
  name: "Preview",
  colors: {
    black: "#111111",
    fff: "#eeeeee",
  },
};

const savedFont = {
  id: "system-default",
  name: "PTT System Default",
  fallbackStack: ["MingLiu", "monospace"],
};

const previewFont = {
  id: "fusion-pixel-ptt",
  name: "Fusion Pixel PTT",
  fallbackStack: ["Fusion Pixel PTT", "MingLiu", "monospace"],
};

test("content script loads saved colors and font from storage", async () => {
  const harness = await loadContentHarness({
    selectedColors: savedPreset,
    selectedFont: savedFont,
  });

  assert.match(harness.styleText("term-ptt-custom-theme-colors-active"), /--term-color-black:#000000/);
  assert.match(harness.styleText("term-ptt-custom-theme-font-active"), /--term-ptt-font-family:MingLiu,monospace/);
});

test("content script previews colors and font, then restores saved appearance on disconnect", async () => {
  const harness = await loadContentHarness({
    selectedColors: savedPreset,
    selectedFont: savedFont,
  });
  const port = harness.connect();

  port.send({ type: "preview-colors", preset: previewPreset });
  port.send({ type: "preview-font", font: previewFont });

  assert.match(harness.styleText("term-ptt-custom-theme-colors-active"), /--term-color-black:#111111/);
  assert.match(harness.styleText("term-ptt-custom-theme-font-active"), /"Fusion Pixel PTT",MingLiu,monospace/);
  assert.deepEqual(toPlainObject(port.messages), [
    { type: "preview-applied", id: "preview" },
    { type: "font-preview-applied", id: "fusion-pixel-ptt" },
  ]);

  port.disconnect();

  assert.match(harness.styleText("term-ptt-custom-theme-colors-active"), /--term-color-black:#000000/);
  assert.match(harness.styleText("term-ptt-custom-theme-font-active"), /--term-ptt-font-family:MingLiu,monospace/);
});

test("content script keeps applied appearance after popup disconnects", async () => {
  const harness = await loadContentHarness();
  const port = harness.connect();

  port.send({ type: "preview-colors", preset: previewPreset });
  port.send({ type: "apply-colors", preset: previewPreset });
  port.send({ type: "preview-font", font: previewFont });
  port.send({ type: "apply-font", font: previewFont });
  port.disconnect();

  assert.match(harness.styleText("term-ptt-custom-theme-colors-active"), /--term-color-black:#111111/);
  assert.match(harness.styleText("term-ptt-custom-theme-font-active"), /"Fusion Pixel PTT",MingLiu,monospace/);
});

function createFakeDocument() {
  const nodes = new Map();
  const documentElement = createFakeElement(nodes);

  return {
    documentElement,
    createElement() {
      return createFakeElement(nodes);
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

function createFakeElement(nodes) {
  let currentId = "";
  const element = {
    textContent: "",
    appendChild(child) {
      if (child.id) {
        nodes.set(child.id, child);
      }
      return child;
    },
    remove() {
      if (currentId) {
        nodes.delete(currentId);
      }
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
      assert.equal(typeof disconnectListener, "function");
      disconnectListener();
    },
  };
}
