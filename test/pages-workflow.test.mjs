import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

test("extension-only scope does not include marketplace handoff surfaces", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const manifest = JSON.parse(await readFile("extension/manifest.json", "utf8"));
  const popupHtml = await readFile("extension/popup.html", "utf8");
  const popupJs = await readFile("extension/popup.js", "utf8");

  assert.equal(existsSync(".github/workflows/pages.yml"), false);
  assert.equal(existsSync("marketplace"), false);
  assert.equal(packageJson.scripts["configure:marketplace"], undefined);
  assert.equal(Object.hasOwn(manifest, "externally_connectable"), false);
  assert.equal(Object.hasOwn(manifest, "background"), false);
  assert.doesNotMatch(popupHtml, /marketplaceLink|Store|vdustr\.github\.io/);
  assert.doesNotMatch(popupJs, /pendingMarketplace|from Store/);
});

test("extension popup browses colors and fonts inside the extension", async () => {
  const popupHtml = await readFile("extension/popup.html", "utf8");
  const popupJs = await readFile("extension/popup.js", "utf8");

  assert.match(popupHtml, /fontSelect/);
  assert.match(popupHtml, /colorList/);
  assert.match(popupJs, /fetch\("assets\/colors\.json"\)/);
  assert.match(popupJs, /fetch\("assets\/fonts\.json"\)/);
  assert.match(popupJs, /selectedFont/);
  assert.match(popupJs, /preview-colors/);
  assert.match(popupJs, /preview-font/);
  assert.match(popupJs, /applyButton\.disabled = true;/);
  assert.match(popupJs, /chrome\.storage\.sync\.set\(\{ selectedColors: storedPreset, selectedFont: storedFont \}\)/);
  assert.match(popupJs, /savedPreset = selectedPreset;/);
  assert.match(popupJs, /savedFont = selectedFont;/);
  assert.match(popupJs, /findPreset\(savedPreset\.id\) \?\? savedPreset/);
  assert.match(popupJs, /findFont\(savedFont\.id\) \?\? savedFont/);
  assert.doesNotMatch(popupJs, /\.slice\(0,\s*100\)/);
});

test("extension popup keeps scrolling inside the color list", async () => {
  const popupCss = await readFile("extension/popup.css", "utf8");
  const popupJs = await readFile("extension/popup.js", "utf8");

  assert.doesNotMatch(popupJs, /classList\.add\("has-controls"\)/);
  assert.doesNotMatch(popupCss, /body\.has-controls/);
  assert.doesNotMatch(popupCss, /body\s*{[^}]*overflow:\s*hidden;/s);
  assert.match(popupCss, /\.controls\s*{[^}]*display:\s*block;/s);
  assert.match(popupCss, /\.controls\[hidden\]\s*{[^}]*display:\s*none;/s);
  assert.match(popupCss, /\.color-list\s*{[^}]*max-height:\s*280px;[^}]*overflow-x:\s*hidden;[^}]*overflow-y:\s*auto;[^}]*scrollbar-gutter:\s*stable;/s);
  assert.match(popupCss, /\.color-button\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s);
  assert.match(popupCss, /\.swatches\s*{[^}]*justify-content:\s*start;/s);
});
