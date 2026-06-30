import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

const expected = {
  manifestName: "Term PTT Custom Theme",
  manifestVersion: "0.1.0",
  extensionZipPath: "dist/term-ptt-custom-theme.zip",
  privacyPath: "PRIVACY.md",
};

const screenshotFiles = [
  "store-assets/screenshots/01-custom-theme.png",
  "store-assets/screenshots/02-retro-theme.png",
];

export async function runReleasePreflight(rootDir = process.cwd()) {
  const checks = [];

  await check(checks, "extension package exists", async () => {
    await assertNonEmptyFile(rootDir, expected.extensionZipPath);
  });

  await check(checks, "manifest is scoped to the extension-only package", async () => {
    const manifest = await readJson(rootDir, "extension/manifest.json");
    assertEqual(manifest.manifest_version, 3, "manifest must use MV3");
    assertEqual(manifest.name, expected.manifestName, "manifest name mismatch");
    assertEqual(manifest.version, expected.manifestVersion, "manifest version mismatch");
    assertIncludes(manifest.description, "term.ptt.cc", "manifest description should name term.ptt.cc");
    assertDeepEqual(manifest.permissions, ["storage", "scripting"], "manifest permissions mismatch");
    assertDeepEqual(manifest.host_permissions, ["https://term.ptt.cc/*"], "manifest host permissions mismatch");
    assertEqual(manifest.action.default_popup, "popup.html", "manifest popup mismatch");
    assertAbsent(manifest, "externally_connectable", "manifest should not accept external page messages");
    assertAbsent(manifest, "background", "extension-only package should not ship a background worker");
  });

  await check(checks, "generated color registry is synced to extension assets", async () => {
    const colors = await readJson(rootDir, "data/colors.json");
    const extensionColors = await readJson(rootDir, "extension/assets/colors.json");

    assertDeepEqual(extensionColors, colors, "extension colors asset is stale");
  });

  await check(checks, "Chrome Web Store image assets use required dimensions", async () => {
    assertDeepEqual(
      await readPngDimensions(path.join(rootDir, "store-assets/small-promo-440x280.png")),
      { width: 440, height: 280 },
      "small promo tile must be 440x280",
    );

    for (const screenshotFile of screenshotFiles) {
      assertDeepEqual(
        await readPngDimensions(path.join(rootDir, screenshotFile)),
        { width: 1280, height: 800 },
        `${screenshotFile} must be 1280x800`,
      );
    }
  });

  await check(checks, "extension-only scope does not include marketplace handoff", async () => {
    if (existsSync(path.join(rootDir, "marketplace"))) {
      throw new Error("marketplace directory should not be generated for the extension-only package");
    }

    const packageJson = await readText(rootDir, "package.json");
    const popupHtml = await readText(rootDir, "extension/popup.html");
    const popupJs = await readText(rootDir, "extension/popup.js");

    assertNotIncludes(packageJson, "configure:marketplace", "package scripts should not configure marketplace");
    assertNotIncludes(popupHtml, "marketplaceLink", "popup should not link to a marketplace");
    assertNotIncludes(popupHtml, "Store", "popup should not expose Store navigation");
    assertNotIncludes(popupJs, "pendingMarketplace", "popup should not read marketplace pending state");
  });

  await check(checks, "privacy policy and submission docs are ready for CWS review", async () => {
    const privacy = await readText(rootDir, expected.privacyPath);
    const submission = await readText(rootDir, "docs/chrome-web-store-submission.md");
    const manualQa = await readText(rootDir, "docs/manual-qa.md");

    assertIncludes(privacy, "does not collect, sell, or share user data", "privacy policy should state data collection");
    assertIncludes(submission, expected.manifestName, "submission guide should use manifest name");
    assertIncludes(submission, expected.manifestVersion, "submission guide should use manifest version");
    assertIncludes(submission, expected.privacyPath, "submission guide should include privacy policy path");
    assertIncludes(submission, expected.extensionZipPath, "submission guide should include package path");
    assertIncludes(submission, screenshotFiles[0], "submission guide should include screenshot asset paths");
    assertIncludes(
      submission,
      "No remote JavaScript or WebAssembly is executed",
      "submission guide should cover remote code",
    );
    assertIncludes(manualQa, "Unpacked Extension Live Preview", "manual QA should include live preview gate");
    assertNoTodo(privacy, "privacy policy");
    assertNoTodo(submission, "submission guide");
    assertNoTodo(manualQa, "manual QA checklist");
    assertNoMarketplaceText(submission, "submission guide");
    assertNoMarketplaceText(manualQa, "manual QA checklist");
  });

  return checks;
}

async function check(checks, name, action) {
  try {
    await action();
    checks.push(name);
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}

async function assertNonEmptyFile(rootDir, filePath) {
  const fileStat = await stat(path.join(rootDir, filePath));
  if (!fileStat.isFile() || fileStat.size === 0) {
    throw new Error(`${filePath} should be a non-empty file`);
  }
}

async function readJson(rootDir, filePath) {
  return JSON.parse(await readText(rootDir, filePath));
}

async function readText(rootDir, filePath) {
  return readFile(path.join(rootDir, filePath), "utf8");
}

function assertEqual(actual, expectedValue, message) {
  if (actual !== expectedValue) {
    throw new Error(`${message}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actual)}`);
  }
}

function assertDeepEqual(actual, expectedValue, message) {
  if (!isDeepStrictEqual(actual, expectedValue)) {
    throw new Error(`${message}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(value, expectedText, message) {
  if (!value.includes(expectedText)) {
    throw new Error(`${message}: missing ${JSON.stringify(expectedText)}`);
  }
}

function assertNotIncludes(value, unexpectedText, message) {
  if (value.includes(unexpectedText)) {
    throw new Error(`${message}: found ${JSON.stringify(unexpectedText)}`);
  }
}

function assertAbsent(object, key, message) {
  if (Object.hasOwn(object, key)) {
    throw new Error(message);
  }
}

function assertNoTodo(value, label) {
  if (/\bTODO\b/i.test(value)) {
    throw new Error(`${label} should not contain TODO markers`);
  }
}

function assertNoMarketplaceText(value, label) {
  if (/marketplace|GitHub Pages|vdustr\.github\.io|externally_connectable/i.test(value)) {
    throw new Error(`${label} should not reference marketplace or GitHub Pages handoff`);
  }
}

export async function readPngDimensions(filePath) {
  const data = await readFile(filePath);

  if (data.toString("ascii", 1, 4) !== "PNG") {
    throw new Error(`${filePath} should be a PNG`);
  }

  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
  };
}

async function main() {
  const checks = await runReleasePreflight();
  console.log(`Release preflight passed with ${checks.length} checks`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
