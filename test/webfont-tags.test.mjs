import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function loadWebfontTagUtils() {
  const code = await readFile("extension/ptt-webfont-tags.js", "utf8");
  const context = { globalThis: {} };
  context.globalThis = context;
  vm.runInNewContext(code, context, { filename: "extension/ptt-webfont-tags.js" });
  return context.TermPttWebfontTags;
}

test("webfont tag utility accepts font-face style and link tags", async () => {
  const { parseWebfontTags } = await loadWebfontTagUtils();
  const result = parseWebfontTags(`
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preload" as="font" href="https://example.com/font.woff2" crossorigin="anonymous">
    <style>
      @font-face {
        font-family: "PTT Font";
        src: url("https://example.com/font.woff2") format("woff2");
      }
    </style>
  `);

  assert.equal(result.errors.length, 0);
  assert.equal(result.entries.length, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(result.entries[0])), {
    tag: "link",
    attrs: {
      crossorigin: "",
      href: "https://fonts.gstatic.com",
      rel: "preconnect",
    },
  });
  assert.equal(result.entries[2].tag, "style");
  assert.match(result.entries[2].css, /@font-face/);
});

test("webfont tag utility rejects script and arbitrary HTML", async () => {
  const { parseWebfontTags } = await loadWebfontTagUtils();

  assert.match(
    parseWebfontTags('<script src="https://example.com/a.js"></script>').errors.join(" "),
    /Only @font-face <style> and font-related <link> tags are supported/,
  );
  assert.match(
    parseWebfontTags('<img src="https://example.com/a.png">').errors.join(" "),
    /Only @font-face <style> and font-related <link> tags are supported/,
  );
  assert.match(
    parseWebfontTags('<style>body{font-family:"PTT"}</style>').errors.join(" "),
    /can only contain @font-face rules/,
  );
});

test("webfont tag utility rejects unsafe or unsupported link shapes", async () => {
  const { parseWebfontTags } = await loadWebfontTagUtils();

  assert.match(
    parseWebfontTags('<link rel="stylesheet" href="https://example.com/fonts.css">').errors.join(" "),
    /rel stylesheet is not supported/,
  );
  assert.match(
    parseWebfontTags('<link rel="preload" as="font" href="https://example.com/font.woff2" onload="alert(1)">').errors.join(
      " ",
    ),
    /attribute onload is not supported/,
  );
  assert.match(
    parseWebfontTags('<link rel="preload" href="https://example.com/font.woff2">').errors.join(" "),
    /must use as="font"/,
  );
  assert.match(
    parseWebfontTags('<link rel="preload" as="style" href="https://example.com/fonts.css">').errors.join(" "),
    /must use as="font"/,
  );
});
