import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const requiredAnsiSchemeKeys = [
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

const requiredWindowsTerminalKeys = ["name", ...requiredAnsiSchemeKeys];

export function slugifyColorName(name) {
  return name
    .normalize("NFKD")
    .replace(/\+/g, " plus ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeWindowsTerminalScheme(schemeInput, sourcePath) {
  for (const key of requiredWindowsTerminalKeys) {
    if (!(key in schemeInput)) {
      throw new Error(`${sourcePath}: missing required key ${key}`);
    }
  }

  for (const key of requiredWindowsTerminalKeys) {
    if (key !== "name") {
      assertHexColor(schemeInput[key], key, sourcePath);
    }
  }

  const scheme = Object.fromEntries(
    requiredAnsiSchemeKeys.map((key) => [key, schemeInput[key]]),
  );

  return {
    id: slugifyColorName(schemeInput.name),
    name: schemeInput.name,
    source: "mbadolato/iTerm2-Color-Schemes",
    sourcePath,
    license: "MIT collection; individual scheme rights belong to original authors",
    scheme,
    metadata: {
      background:
        optionalHexColor(schemeInput.background, "background", sourcePath) ?? schemeInput.black,
      foreground:
        optionalHexColor(schemeInput.foreground, "foreground", sourcePath) ??
        schemeInput.brightWhite,
      cursor:
        optionalHexColor(schemeInput.cursorColor, "cursorColor", sourcePath) ??
        schemeInput.foreground ??
        schemeInput.brightWhite,
      selection: optionalHexColor(
        schemeInput.selectionBackground,
        "selectionBackground",
        sourcePath,
      ),
      isDark: inferIsDark(schemeInput.background ?? schemeInput.black),
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

export async function assertReadableSourceDir(sourceDir) {
  let sourceStat;

  try {
    sourceStat = await stat(sourceDir);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(
        `Upstream iTerm2 color schemes directory not found at "${sourceDir}". Clone mbadolato/iTerm2-Color-Schemes next to this repository or set ITERM2_COLOR_SCHEMES_DIR.`,
      );
    }

    throw error;
  }

  if (!sourceStat.isDirectory()) {
    throw new Error(`Upstream iTerm2 color schemes path is not a directory: "${sourceDir}".`);
  }
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

  await assertReadableSourceDir(sourceDir);
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
