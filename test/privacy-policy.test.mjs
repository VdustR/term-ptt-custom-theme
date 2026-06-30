import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("privacy policy covers the extension-only data use", async () => {
  const privacy = await readFile("PRIVACY.md", "utf8");

  assert.match(privacy, /does not collect, sell, or share user data/);
  assert.match(privacy, /Selected color scheme id, name, base preset id, and color values/);
  assert.match(privacy, /Optional custom style tags entered by the user/);
  assert.match(privacy, /active tab URL/);
  assert.match(privacy, /does not send browsing history/);
  assert.doesNotMatch(privacy, /marketplace/i);
});
