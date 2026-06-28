import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("manual QA checklist covers local, extension, store asset, and release gates", async () => {
  const doc = await readFile("docs/manual-qa.md", "utf8");

  assert.match(doc, /# Manual QA Checklist/);
  assert.match(doc, /pnpm verify/);
  assert.match(doc, /dist\/term-ptt-custom-theme\.zip/);
  assert.match(doc, /store-assets\/small-promo-440x280\.png/);
  assert.match(doc, /chrome:\/\/extensions/);
  assert.match(doc, /Load unpacked/);
  assert.match(doc, /https:\/\/term\.ptt\.cc\//);
  assert.match(doc, /real `term\.ptt\.cc` terminal/);
  assert.match(doc, /Webfont tags are limited to trusted font stylesheet links, inline `@font-face` CSS, and font-related link tags/);
  assert.match(doc, /store-assets\/screenshots\//);
  assert.match(doc, /1280x800 PNG/);
  assert.match(doc, /public `PRIVACY\.md` URL/);
  assert.match(doc, /Release Criteria/);
  assert.doesNotMatch(doc, /marketplace/i);
  assert.doesNotMatch(doc, /GitHub Pages/);
});
