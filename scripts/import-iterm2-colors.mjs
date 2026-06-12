import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const requiredWindowsTerminalKeys = [
  "name",
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

export const requiredPttColorKeys = [
  "black",
  "maroon",
  "green",
  "olive",
  "navy",
  "purple",
  "teal",
  "silver",
  "grey",
  "red",
  "0f0",
  "ff0",
  "00f",
  "f0f",
  "0ff",
  "fff",
];

export function slugifyColorName(name) {
  return name
    .normalize("NFKD")
    .replace(/\+/g, " plus ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeWindowsTerminalScheme(scheme, sourcePath) {
  for (const key of requiredWindowsTerminalKeys) {
    if (!(key in scheme)) {
      throw new Error(`${sourcePath}: missing required key ${key}`);
    }
  }

  for (const key of requiredWindowsTerminalKeys) {
    if (key !== "name") {
      assertHexColor(scheme[key], key, sourcePath);
    }
  }

  const colors = {
    black: scheme.black,
    maroon: scheme.red,
    green: scheme.green,
    olive: scheme.yellow,
    navy: scheme.blue,
    purple: scheme.purple,
    teal: scheme.cyan,
    silver: scheme.white,
    grey: scheme.brightBlack,
    red: scheme.brightRed,
    "0f0": scheme.brightGreen,
    ff0: scheme.brightYellow,
    "00f": scheme.brightBlue,
    f0f: scheme.brightPurple,
    "0ff": scheme.brightCyan,
    fff: scheme.brightWhite,
  };

  return {
    id: slugifyColorName(scheme.name),
    name: scheme.name,
    source: "mbadolato/iTerm2-Color-Schemes",
    sourcePath,
    license: "MIT collection; individual scheme rights belong to original authors",
    colors,
    metadata: {
      background: optionalHexColor(scheme.background, "background", sourcePath) ?? scheme.black,
      foreground:
        optionalHexColor(scheme.foreground, "foreground", sourcePath) ?? scheme.brightWhite,
      cursor:
        optionalHexColor(scheme.cursorColor, "cursorColor", sourcePath) ??
        scheme.foreground ??
        scheme.brightWhite,
      selection: optionalHexColor(
        scheme.selectionBackground,
        "selectionBackground",
        sourcePath,
      ),
      isDark: inferIsDark(scheme.background ?? scheme.black),
    },
  };
}

export async function importWindowsTerminalColors(sourceDir) {
  const fileNames = (await readdir(sourceDir))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));
  const colors = [];
  const seenIds = new Set();

  for (const fileName of fileNames) {
    const sourcePath = `windowsterminal/${fileName}`;
    const fullPath = path.join(sourceDir, fileName);
    const scheme = JSON.parse(await readFile(fullPath, "utf8"));
    const normalized = normalizeWindowsTerminalScheme(scheme, sourcePath);

    if (!normalized.id) {
      throw new Error(`${sourcePath}: generated empty id`);
    }

    if (seenIds.has(normalized.id)) {
      throw new Error(`${sourcePath}: duplicate color id ${normalized.id}`);
    }

    seenIds.add(normalized.id);
    colors.push(normalized);
  }

  return {
    schemaVersion: 1,
    source: "mbadolato/iTerm2-Color-Schemes/windowsterminal",
    colors,
  };
}

function assertHexColor(value, key, sourcePath) {
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`${sourcePath}: ${key} must be a #RRGGBB color`);
  }
}

function optionalHexColor(value, key, sourcePath) {
  if (value == null) {
    return null;
  }
  assertHexColor(value, key, sourcePath);
  return value;
}

function inferIsDark(hexColor) {
  assertHexColor(hexColor, "background", "metadata");
  const raw = hexColor.slice(1);
  const red = Number.parseInt(raw.slice(0, 2), 16) / 255;
  const green = Number.parseInt(raw.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(raw.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return luminance < 0.5;
}

async function main() {
  const [, , sourceDirArg, outputPath = "data/colors.json"] = process.argv;
  const sourceDir =
    sourceDirArg ??
    process.env.ITERM2_COLOR_SCHEMES_DIR ??
    "../iTerm2-Color-Schemes/windowsterminal";

  if (!sourceDir) {
    throw new Error(
      "Usage: node scripts/import-iterm2-colors.mjs [source-dir] [output-path]",
    );
  }

  const registry = await importWindowsTerminalColors(sourceDir);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(registry, null, 2)}\n`);
  console.log(`Imported ${registry.colors.length} color presets to ${outputPath}`);
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFilePath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
