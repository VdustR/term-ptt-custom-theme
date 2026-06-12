import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

import {
  assertReadableSourceDir,
  importWindowsTerminalColors,
  normalizeWindowsTerminalScheme,
  slugifyColorName,
} from "../scripts/import-iterm2-colors.mjs";

test("slugifyColorName creates stable lower-case ids", () => {
  assert.equal(slugifyColorName("Gruvbox Dark"), "gruvbox-dark");
  assert.equal(slugifyColorName("TokyoNight Moon"), "tokyonight-moon");
  assert.equal(slugifyColorName("Apple System Colors Light"), "apple-system-colors-light");
  assert.equal(slugifyColorName("Dracula+"), "dracula-plus");
});

test("normalizeWindowsTerminalScheme maps Windows Terminal ANSI colors to PTT colors", () => {
  const normalized = normalizeWindowsTerminalScheme(
    {
      name: "Gruvbox Dark",
      black: "#282828",
      red: "#cc241d",
      green: "#98971a",
      yellow: "#d79921",
      blue: "#458588",
      purple: "#b16286",
      cyan: "#689d6a",
      white: "#a89984",
      brightBlack: "#928374",
      brightRed: "#fb4934",
      brightGreen: "#b8bb26",
      brightYellow: "#fabd2f",
      brightBlue: "#83a598",
      brightPurple: "#d3869b",
      brightCyan: "#8ec07c",
      brightWhite: "#ebdbb2",
      background: "#282828",
      foreground: "#ebdbb2",
      cursorColor: "#ebdbb2",
      selectionBackground: "#665c54"
    },
    "windowsterminal/Gruvbox Dark.json",
  );

  assert.equal(normalized.id, "gruvbox-dark");
  assert.equal(normalized.colors.black, "#282828");
  assert.equal(normalized.colors.maroon, "#cc241d");
  assert.equal(normalized.colors.olive, "#d79921");
  assert.equal(normalized.colors.navy, "#458588");
  assert.equal(normalized.colors.teal, "#689d6a");
  assert.equal(normalized.colors["0f0"], "#b8bb26");
  assert.equal(normalized.colors.fff, "#ebdbb2");
  assert.equal(normalized.metadata.background, "#282828");
  assert.equal(normalized.metadata.foreground, "#ebdbb2");
  assert.equal(normalized.metadata.isDark, true);
});

test("normalizeWindowsTerminalScheme rejects missing required colors", () => {
  assert.throws(
    () => normalizeWindowsTerminalScheme({ name: "Broken" }, "windowsterminal/Broken.json"),
    /missing required key black/,
  );
});

test("importWindowsTerminalColors produces deterministic registry metadata", async () => {
  const sourceDir = await mkdtemp(path.join(tmpdir(), "term-ptt-custom-theme-"));
  await writeFile(
    path.join(sourceDir, "Gruvbox Dark.json"),
    JSON.stringify({
      name: "Gruvbox Dark",
      black: "#282828",
      red: "#cc241d",
      green: "#98971a",
      yellow: "#d79921",
      blue: "#458588",
      purple: "#b16286",
      cyan: "#689d6a",
      white: "#a89984",
      brightBlack: "#928374",
      brightRed: "#fb4934",
      brightGreen: "#b8bb26",
      brightYellow: "#fabd2f",
      brightBlue: "#83a598",
      brightPurple: "#d3869b",
      brightCyan: "#8ec07c",
      brightWhite: "#ebdbb2"
    }),
  );

  const registry = await importWindowsTerminalColors(sourceDir);

  assert.equal(registry.schemaVersion, 1);
  assert.equal(registry.generatedAt, undefined);
  assert.equal(registry.colors.length, 1);
});

test("import script documents the configurable upstream source directory", async () => {
  const script = await readFile("scripts/import-iterm2-colors.mjs", "utf8");

  assert.match(script, /process\.env\.ITERM2_COLOR_SCHEMES_DIR/);
  assert.match(script, /\.\.\/iTerm2-Color-Schemes\/windowsterminal/);
});

test("import script explains missing upstream source directory", async () => {
  const missingDir = path.join(
    tmpdir(),
    `term-ptt-custom-theme-missing-${process.pid}-${Date.now()}`,
  );

  await assert.rejects(
    () => assertReadableSourceDir(missingDir),
    /Upstream iTerm2 color schemes directory not found/,
  );
});
