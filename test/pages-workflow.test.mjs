import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

function extractFunctionBody(source, functionName) {
  const signatureIndex = source.indexOf(`function ${functionName}(`);
  assert.notEqual(signatureIndex, -1, `${functionName}() should exist`);

  const bodyStart = source.indexOf("{", signatureIndex);
  assert.notEqual(bodyStart, -1, `${functionName}() should have a body`);

  let depth = 0;
  let stringQuote = null;
  let commentType = null;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (commentType === "line") {
      if (char === "\n") {
        commentType = null;
      }
      continue;
    }

    if (commentType === "block") {
      if (char === "*" && nextChar === "/") {
        commentType = null;
        index += 1;
      }
      continue;
    }

    if (stringQuote) {
      if (char === "\\") {
        index += 1;
        continue;
      }

      if (char === stringQuote) {
        stringQuote = null;
      }
      continue;
    }

    if (char === "/" && nextChar === "/") {
      commentType = "line";
      index += 1;
      continue;
    }

    if (char === "/" && nextChar === "*") {
      commentType = "block";
      index += 1;
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      stringQuote = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;
    }

    if (depth === 0) {
      return source.slice(bodyStart + 1, index);
    }
  }

  assert.fail(`${functionName}() body should close`);
}

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
  assert.equal(manifest.permissions.includes("tabs"), false);
  assert.doesNotMatch(popupHtml, /marketplaceLink|Store|vdustr\.github\.io/);
  assert.doesNotMatch(popupJs, /pendingMarketplace|from Store/);
});

test("extension popup browses colors and fonts inside the extension", async () => {
  const popupHtml = await readFile("extension/popup.html", "utf8");
  const popupCss = await readFile("extension/popup.css", "utf8");
  const popupJs = await readFile("extension/popup.js", "utf8");

  assert.match(popupHtml, /fontSelect/);
  assert.match(popupHtml, /repositoryButton/);
  assert.match(popupHtml, /Open project repository on GitHub/);
  assert.match(popupHtml, /currentPaletteName/);
  assert.match(popupHtml, /modifiedBadge/);
  assert.match(popupHtml, /paletteStrip/);
  assert.match(popupHtml, /colorList/);
  assert.match(popupJs, /fetch\("assets\/colors\.json"\)/);
  assert.match(popupJs, /fetch\("assets\/fonts\.json"\)/);
  assert.match(popupJs, /const REPOSITORY_URL = "https:\/\/github\.com\/VdustR\/term-ptt-custom-theme";/);
  assert.match(popupJs, /repositoryButton\.addEventListener\("click", openRepository\)/);
  assert.match(popupJs, /chrome\.tabs\.create\(\{ url: REPOSITORY_URL, active: true \}\)/);
  assert.match(popupCss, /\.header\s*{[^}]*align-items:\s*center;/s);
  assert.match(popupCss, /\.repository-button\s*{[^}]*padding:\s*0;/s);
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
  assert.match(popupJs, /getAppearanceDraft\(\)/);
  assert.match(popupJs, /chrome\.storage\.session\s*\?\s*chrome\.storage\.session\.get\(\["appearanceDraft"\]\)\s*:\s*Promise\.resolve\(\{\}\)/);
  assert.match(popupJs, /chrome\.storage\.session\.set\(\{ appearanceDraft/);
  assert.match(popupJs, /if \(chrome\.storage\.session\) \{\s*await chrome\.storage\.session\.remove\(\["appearanceDraft"\]\);\s*\}/s);
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
  assert.match(popupJs, /queuePersistDraft\(\{ immediate: event\.type === "change" \}\)/);
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

test("extension popup renders presets as PTT-style color previews", async () => {
  const popupCss = await readFile("extension/popup.css", "utf8");
  const popupJs = await readFile("extension/popup.js", "utf8");
  const renderColorButtonBody = extractFunctionBody(popupJs, "renderColorButton");

  assert.match(renderColorButtonBody, /button\.append\(renderPresetPreview\(preset\)\)/);
  assert.match(popupJs, /function renderPresetPreview\(preset\)/);
  assert.match(popupJs, /\[配色\]/);
  assert.match(popupJs, /pttPreviewSampleGroups/);
  assert.match(popupJs, /pttBrightForegroundKeys/);
  assert.match(popupJs, /pttDarkBackgroundKeys/);
  assert.match(popupJs, /label: "黑底"/);
  assert.match(popupJs, /label: "白字"/);
  assert.match(popupJs, /pttClass: `q\$\{schemeKeys\.indexOf\(key\)\} b0\/body`/);
  assert.match(popupJs, /pttClass: `q15 \$\{bgIndex === 0 \? "b0\/body" : `b\$\{bgIndex\}`\}`/);
  assert.match(popupJs, /function renderPttColorSample/);
  assert.match(popupJs, /schemeColor\(preset\.scheme, "black"/);
  assert.match(popupJs, /schemeColor\(preset\.scheme, "brightWhite"/);
  assert.match(popupJs, /preset-preview-default/);
  assert.match(popupJs, /marker\.setAttribute\("aria-hidden", "true"\)/);
  assert.doesNotMatch(popupJs, /textShadow/);
  assert.doesNotMatch(popupJs, /標題|底紅|底白|爆|推/);
  assert.doesNotMatch(popupJs, /renderAnsiForeground\("紅"/);
  assert.doesNotMatch(popupJs, /function renderAnsiPair/);
  assert.doesNotMatch(popupJs, /function renderPresetSource/);
  assert.doesNotMatch(popupJs, /function formatPresetSource/);
  assert.doesNotMatch(popupJs, /WinTerm/);
  assert.doesNotMatch(popupJs, /className = "swatches"/);
  assert.match(popupCss, /\.preset-preview\s*{/);
  assert.match(popupCss, /\.preset-preview-article\s*{/);
  assert.match(popupCss, /\.preset-preview-title\s*{/);
  assert.match(popupCss, /\.preset-preview-samples\s*{/);
  assert.match(popupCss, /\.ptt-color-sample-group\s*{/);
  assert.match(popupCss, /\.ptt-color-sample-label\s*{/);
  assert.match(popupCss, /\.ptt-color-sample\s*{/);
  assert.match(popupCss, /color-mix\(in srgb, var\(--accent\) 36%, transparent\)/);
  assert.doesNotMatch(popupCss, /rgba\(17,\s*184,\s*159/);
  assert.doesNotMatch(popupCss, /\.preset-preview-source\s*{/);
  assert.doesNotMatch(popupCss, /\.ptt-cell-sample\s*{/);
  assert.doesNotMatch(popupCss, /\.ansi-pair\s*{/);
  assert.doesNotMatch(popupCss, /\.swatches\s*{/);
});

test("extension popup routes non-term pages to term.ptt.cc", async () => {
  const popupJs = await readFile("extension/popup.js", "utf8");
  const initBody = extractFunctionBody(popupJs, "init");
  const routeBody = extractFunctionBody(popupJs, "routeToTermPtt");

  assert.match(popupJs, /const TERM_PTT_URL = "https:\/\/term\.ptt\.cc\/";/);
  assert.match(popupJs, /const TERM_PTT_PATTERN = "https:\/\/term\.ptt\.cc\/\*";/);
  assert.match(popupJs, /function isTermPttTab\(tab\)/);
  assert.match(initBody, /if \(!isTermPttTab\(activeTab\)\) \{\s*await routeToTermPtt\(\);\s*return;\s*\}/s);
  assert.match(routeBody, /chrome\.tabs\.query\(\{ url: TERM_PTT_PATTERN \}\)/);
  assert.match(routeBody, /chrome\.tabs\.update\(targetTab\.id, \{ active: true \}\)/);
  assert.match(
    routeBody,
    /if \(typeof targetTab\.windowId === "number" && chrome\.windows\?\.update\) \{\s*try \{\s*await chrome\.windows\.update\(targetTab\.windowId, \{ focused: true \}\);\s*\} catch \{/s,
  );
  assert.match(routeBody, /chrome\.tabs\.create\(\{ url: TERM_PTT_URL, active: true \}\)/);
  assert.match(routeBody, /window\.close\(\)/);
  assert.match(routeBody, /statusNode\.textContent = "Could not open term\.ptt\.cc\."/);
});

test("extension popup keeps scrolling inside the color list", async () => {
  const popupCss = await readFile("extension/popup.css", "utf8");
  const popupJs = await readFile("extension/popup.js", "utf8");
  const selectPresetBody = extractFunctionBody(popupJs, "selectPreset");

  assert.doesNotMatch(popupJs, /classList\.add\("has-controls"\)/);
  assert.doesNotMatch(popupCss, /body\.has-controls/);
  assert.match(popupCss, /html,\s*body\s*{[^}]*height:\s*600px;[^}]*overflow:\s*hidden;/s);
  assert.match(popupCss, /\.popup\s*{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*height:\s*100%;[^}]*min-height:\s*0;/s);
  assert.match(popupCss, /\.controls\s*{[^}]*display:\s*flex;[^}]*flex:\s*1 1 auto;[^}]*min-height:\s*0;[^}]*flex-direction:\s*column;/s);
  assert.match(popupCss, /\.controls\[hidden\]\s*{[^}]*display:\s*none;/s);
  assert.match(popupCss, /\.color-list\s*{[^}]*flex:\s*1 1 auto;[^}]*min-height:\s*0;[^}]*align-content:\s*start;[^}]*overflow-x:\s*hidden;[^}]*overflow-y:\s*auto;[^}]*scrollbar-gutter:\s*stable;/s);
  assert.doesNotMatch(popupCss, /\.color-list\s*{[^}]*max-height:/s);
  assert.match(popupCss, /\.color-button\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s);
  assert.match(popupCss, /\.preset-preview\s*{[^}]*overflow:\s*hidden;/s);
  assert.match(popupCss, /\.preset-preview-samples\s*{[^}]*overflow:\s*hidden;/s);
  assert.match(popupJs, /renderColors\(\{ scrollIntoView: true \}\)/);
  assert.match(popupJs, /function renderColors\(\{ scrollIntoView = false \} = \{\}\)/);
  assert.match(popupJs, /if \(scrollIntoView\) \{\s*scrollSelectedPresetIntoView\(\);\s*\}/s);
  assert.match(popupJs, /function syncSelectedPresetButtonState\(\)/);
  assert.match(selectPresetBody, /syncSelectedPresetButtonState\(\)/);
  assert.doesNotMatch(selectPresetBody, /renderColors\(/);
  assert.doesNotMatch(popupJs, /colorListNode\.replaceChildren\(\.\.\.matches\.map\(renderColorButton\)\);\s*scrollSelectedPresetIntoView\(\);/s);
  assert.match(popupJs, /let persistDraftTimeout = null;/);
  assert.match(popupJs, /clearPendingDraftWrite\(\)/);
  assert.match(popupJs, /window\.addEventListener\("pagehide", flushPendingDraftWrite\)/);
});
