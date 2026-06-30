import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const requiredAnsiSchemeKeys = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "purple",
  "cyan",
  "white",
  "brightBlack",
  "brightRed",
  "brightGreen",
  "brightYellow",
  "brightBlue",
  "brightPurple",
  "brightCyan",
  "brightWhite",
];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

test("generated colors registry contains complete ANSI scheme mappings", async () => {
  const registry = await readJson("data/colors.json");

  assert.equal(registry.schemaVersion, 1);
  assert.equal(registry.colors.length > 500, true);

  for (const preset of registry.colors) {
    assert.equal(typeof preset.id, "string");
    assert.equal(typeof preset.name, "string");
    assert.deepEqual(Object.keys(preset.scheme).sort(), [...requiredAnsiSchemeKeys].sort());
    assert.equal(preset.colors, undefined);
  }
});

test("extension assets use the generated colors registry", async () => {
  const dataRegistry = await readJson("data/colors.json");
  const extensionRegistry = await readJson("extension/assets/colors.json");

  assert.deepEqual(extensionRegistry, dataRegistry);
});

test("MV3 manifest references files that exist in the extension package", async () => {
  const manifest = await readJson("extension/manifest.json");
  const referencedFiles = [];

  for (const contentScript of manifest.content_scripts ?? []) {
    referencedFiles.push(...(contentScript.css ?? []), ...(contentScript.js ?? []));
  }
  if (manifest.background?.service_worker) {
    referencedFiles.push(manifest.background.service_worker);
  }
  referencedFiles.push(...Object.values(manifest.icons ?? {}));
  referencedFiles.push(...Object.values(manifest.action.default_icon ?? {}));
  referencedFiles.push(manifest.action.default_popup);

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "Term PTT Custom Theme");
  assert.match(manifest.description, /term\.ptt\.cc/);
  assert.match(manifest.description, /配色/);
  assert.match(manifest.description, /style\/webfont/);
  assert.equal(manifest.action.default_title, "Term PTT Custom Theme");
  assert.equal(manifest.permissions.includes("storage"), true);
  assert.equal(manifest.permissions.includes("scripting"), true);
  assert.deepEqual(manifest.host_permissions, ["https://term.ptt.cc/*"]);
  assert.deepEqual(Object.keys(manifest.icons).sort(), ["128", "16", "32", "48"]);
  assert.equal(manifest.content_scripts[0].js.includes("ptt-webfont-tags.js"), true);
  assert.equal(manifest.content_scripts[0].js.includes("ptt-fonts.js"), false);
  assert.equal(Object.hasOwn(manifest, "externally_connectable"), false);
  assert.equal(Object.hasOwn(manifest, "background"), false);

  for (const filePath of referencedFiles) {
    assert.equal(
      existsSync(path.join("extension", filePath)),
      true,
      `${filePath} should exist`,
    );
  }
});
