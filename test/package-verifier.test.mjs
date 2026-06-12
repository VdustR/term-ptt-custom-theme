import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  collectRequiredEntries,
  extractPopupLocalReferences,
} from "../scripts/verify-extension-package.mjs";

test("verify script validates the packaged extension zip after packaging", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const packageScript = await readFile("scripts/package-extension.mjs", "utf8");
  const verifierScript = await readFile("scripts/verify-extension-package.mjs", "utf8");
  const readme = await readFile("README.md", "utf8");

  assert.match(packageJson.scripts.verify, /^pnpm build && pnpm test && pnpm package:extension/);
  assert.match(packageJson.scripts.verify, /pnpm verify:package/);
  assert.match(packageJson.scripts.verify, /pnpm preflight:release/);
  assert.equal(packageJson.scripts["verify:package"], "node scripts/verify-extension-package.mjs");
  assert.equal(packageJson.scripts["preflight:release"], "node scripts/preflight-release.mjs");
  assert.match(verifierScript, /dist\/term-ptt-custom-theme\.zip/);
  assert.match(verifierScript, /extension\/manifest\.json/);
  assert.match(verifierScript, /content_scripts/);
  assert.match(verifierScript, /assets\/colors\.json/);
  assert.match(verifierScript, /assets\/fonts\.json/);
  assert.match(verifierScript, /extractPopupLocalReferences/);
  assert.match(packageScript, /Missing required command/);
  assert.match(readme, /requires the system `zip` command/);
});

test("package verifier includes popup HTML dependencies in required entries", async () => {
  const manifest = JSON.parse(await readFile("extension/manifest.json", "utf8"));
  const popupHtml = await readFile("extension/popup.html", "utf8");
  const requiredEntries = collectRequiredEntries(manifest, popupHtml);

  assert.equal(requiredEntries.has("popup.html"), true);
  assert.equal(requiredEntries.has("popup.css"), true);
  assert.equal(requiredEntries.has("popup.js"), true);
  assert.equal(requiredEntries.has("ptt-colors.js"), true);
});

test("package verifier rejects remote popup dependencies", () => {
  assert.throws(
    () => extractPopupLocalReferences('<script src="https://example.com/remote.js"></script>'),
    /Popup references a remote or absolute asset/,
  );

  assert.throws(
    () => extractPopupLocalReferences('<link rel="stylesheet" href="../outside.css">'),
    /Popup references an invalid package asset/,
  );
});
