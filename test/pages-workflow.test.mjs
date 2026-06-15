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
  assert.match(popupHtml, /currentPaletteName/);
  assert.match(popupHtml, /modifiedBadge/);
  assert.match(popupHtml, /paletteStrip/);
  assert.match(popupHtml, /colorList/);
  assert.match(popupJs, /fetch\("assets\/colors\.json"\)/);
  assert.match(popupJs, /fetch\("assets\/fonts\.json"\)/);
  assert.match(popupJs, /selectedFont/);
  assert.match(popupJs, /DEFAULT_COLORS_ID = "term-ptt-default"/);
  assert.match(popupJs, /DEFAULT_FONT_ID = "term-ptt-default"/);
  assert.match(popupJs, /Term PTT Default/);
  assert.match(popupJs, /schemeKeys/);
  assert.match(popupJs, /renderCurrentPalette/);
  assert.match(popupJs, /renderPaletteSwatchButton/);
  assert.match(popupJs, /openColorPicker/);
  assert.match(popupJs, /handleColorPickerInput/);
  assert.match(popupJs, /resetPaletteToBase/);
  assert.match(popupJs, /TermPttAppearanceState\.isModifiedScheme\(selectedScheme, selectedPreset\?\.scheme\)/);
  assert.match(popupJs, /chrome\.storage\.sync\.get\(\[/);
  assert.match(popupJs, /"selectedScheme"/);
  assert.match(popupJs, /chrome\.storage\.session\.get\(\["appearanceDraft"\]\)/);
  assert.match(popupJs, /chrome\.storage\.session\.set\(\{ appearanceDraft/);
  assert.match(popupJs, /TermPttAppearanceState\.createInitialAppearanceState/);
  assert.match(popupJs, /preview-scheme/);
  assert.match(popupJs, /preview-font/);
  assert.match(popupJs, /preview-clear-scheme/);
  assert.match(popupJs, /preview-clear-font/);
  assert.match(popupJs, /apply-scheme/);
  assert.match(popupJs, /apply-clear-scheme/);
  assert.match(popupJs, /apply-clear-font/);
  assert.match(popupJs, /applyButton\.disabled = true;/);
  assert.match(popupJs, /selectedScheme: storedScheme/);
  assert.match(popupJs, /chrome\.storage\.sync\.remove\(removeKeys\)/);
  assert.match(popupJs, /chrome\.storage\.session\.remove\(\["appearanceDraft"\]\)/);
  assert.match(popupJs, /savedPreset = selectedPreset;/);
  assert.match(popupJs, /savedScheme = selectedScheme;/);
  assert.match(popupJs, /savedFont = selectedFont;/);
  assert.match(popupJs, /findFont\(savedFont\.id\) \?\? savedFont/);
  assert.match(popupJs, /scrollIntoView\(\{ block: "nearest"/);
  assert.doesNotMatch(popupHtml, /activeColorEditor/);
  assert.doesNotMatch(popupJs, /activeColorKey/);
  assert.doesNotMatch(popupJs, /\.slice\(0,\s*100\)/);
});

test("extension popup opens the color picker directly from current palette swatches", async () => {
  const popupHtml = await readFile("extension/popup.html", "utf8");
  const popupCss = await readFile("extension/popup.css", "utf8");
  const popupJs = await readFile("extension/popup.js", "utf8");

  assert.match(popupHtml, /Current Palette/);
  assert.match(popupHtml, /id="modifiedBadge"[^>]*hidden/);
  assert.match(popupHtml, /id="resetButton"[^>]*hidden/);
  assert.match(popupJs, /"brightWhite"/);
  assert.match(popupJs, /button\.className = "palette-swatch"/);
  assert.match(popupJs, /input\.className = "palette-color-input"/);
  assert.match(popupJs, /input\.type = "color"/);
  assert.match(popupJs, /showPicker/);
  assert.match(popupJs, /input\.click\(\)/);
  assert.match(popupJs, /palette-default-note/);
  assert.doesNotMatch(popupHtml, /editPaletteButton/);
  assert.doesNotMatch(popupHtml, /paletteEditor/);
  assert.doesNotMatch(popupHtml, /activeColorEditor/);
  assert.doesNotMatch(popupJs, /renderColorControl/);
  assert.doesNotMatch(popupJs, /handleColorHexInput/);
  assert.doesNotMatch(popupJs, /aria-invalid/);
  assert.match(popupCss, /\.current-palette\s*{/);
  assert.match(popupCss, /\.palette-default-note\s*{[^}]*grid-column:\s*1 \/\s*-1;/s);
  assert.match(popupCss, /\.palette-color-input\s*{/);
  assert.doesNotMatch(popupCss, /\.active-color-editor\s*{/);
  assert.doesNotMatch(popupCss, /\.color-control\s*{/);
  assert.match(popupCss, /\.modified-badge\s*{/);
  assert.doesNotMatch(popupCss, /:has\(\.palette-editor/);
});

test("extension popup keeps scrolling inside the color list", async () => {
  const popupCss = await readFile("extension/popup.css", "utf8");
  const popupJs = await readFile("extension/popup.js", "utf8");

  assert.doesNotMatch(popupJs, /classList\.add\("has-controls"\)/);
  assert.doesNotMatch(popupCss, /body\.has-controls/);
  assert.match(popupCss, /html,\s*body\s*{[^}]*height:\s*600px;[^}]*overflow:\s*hidden;/s);
  assert.match(popupCss, /\.popup\s*{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*height:\s*100%;[^}]*min-height:\s*0;/s);
  assert.match(popupCss, /\.controls\s*{[^}]*display:\s*flex;[^}]*flex:\s*1 1 auto;[^}]*min-height:\s*0;[^}]*flex-direction:\s*column;/s);
  assert.match(popupCss, /\.controls\[hidden\]\s*{[^}]*display:\s*none;/s);
  assert.match(popupCss, /\.color-list\s*{[^}]*flex:\s*1 1 auto;[^}]*min-height:\s*0;[^}]*align-content:\s*start;[^}]*overflow-x:\s*hidden;[^}]*overflow-y:\s*auto;[^}]*scrollbar-gutter:\s*stable;/s);
  assert.doesNotMatch(popupCss, /\.color-list\s*{[^}]*max-height:/s);
  assert.match(popupCss, /\.color-button\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s);
  assert.match(popupCss, /\.swatches\s*{[^}]*justify-content:\s*start;/s);
});
