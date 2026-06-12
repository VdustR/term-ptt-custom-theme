import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const screenshotFiles = [
  "store-assets/screenshots/01-custom-theme.png",
  "store-assets/screenshots/02-retro-theme.png",
];

test("Chrome Web Store image assets use required dimensions", async () => {
  assert.deepEqual(await readPngDimensions("store-assets/small-promo-440x280.png"), {
    width: 440,
    height: 280,
  });
  assert.deepEqual(await readPngDimensions("store-assets/small-promo-source-440x280.png"), {
    width: 440,
    height: 280,
  });

  for (const screenshotFile of screenshotFiles) {
    assert.deepEqual(await readPngDimensions(screenshotFile), {
      width: 1280,
      height: 800,
    });
  }
});

test("Chrome Web Store submission guide references generated store assets", async () => {
  const doc = await readFile("docs/chrome-web-store-submission.md", "utf8");

  assert.match(doc, /store-assets\/small-promo-440x280\.png/);
  assert.match(doc, /store-assets\/screenshots\/01-custom-theme\.png/);
  assert.match(doc, /store-assets\/screenshots\/02-retro-theme\.png/);
  assert.doesNotMatch(doc, /screenshot-marketplace/);
  assert.doesNotMatch(doc, /TODO: capture/);
  assert.doesNotMatch(doc, /TODO: create/);
});

async function readPngDimensions(filePath) {
  const data = await readFile(filePath);

  assert.equal(data.toString("ascii", 1, 4), "PNG", `${filePath} should be a PNG`);

  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
  };
}
