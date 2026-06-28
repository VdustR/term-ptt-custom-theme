import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("third-party notices cover generated colors and inline icons", async () => {
  const notices = await readFile("THIRD_PARTY_NOTICES.md", "utf8");
  const colors = JSON.parse(await readFile("data/colors.json", "utf8"));

  assert.match(notices, /mbadolato\/iTerm2-Color-Schemes/);
  assert.match(notices, /MIT License/);
  assert.match(notices, /individual scheme rights belong to original authors/);
  assert.doesNotMatch(notices, /TakWolf\/fusion-pixel-font/);
  assert.match(notices, /Primer Octicons/);
  assert.match(notices, /primer\/octicons/);
  assert.match(notices, /inline GitHub mark icon/);
  assert.equal(colors.colors[0].license, "MIT collection; individual scheme rights belong to original authors");
});
