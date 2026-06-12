import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultOptions = {
  zipPath: "dist/term-ptt-custom-theme.zip",
  manifestPath: "extension/manifest.json",
  extensionDir: "extension",
};

export async function verifyExtensionPackage(options = defaultOptions) {
  const manifest = JSON.parse(await readFile(options.manifestPath, "utf8"));
  const popupHtml = await readFile(
    path.join(options.extensionDir, manifest.action.default_popup),
    "utf8",
  );
  const entries = new Set(await listZipEntries(options.zipPath));
  const requiredEntries = collectRequiredEntries(manifest, popupHtml);

  const missingEntries = [...requiredEntries].filter((entry) => !entries.has(entry));
  if (missingEntries.length > 0) {
    throw new Error(`Extension package is missing entries: ${missingEntries.join(", ")}`);
  }

  const disallowedEntries = [...entries].filter(
    (entry) =>
      entry.startsWith("/") ||
      entry.includes("..") ||
      entry.startsWith("node_modules/") ||
      entry.startsWith("__MACOSX/") ||
      entry.endsWith(".DS_Store"),
  );

  if (disallowedEntries.length > 0) {
    throw new Error(`Extension package includes disallowed entries: ${disallowedEntries.join(", ")}`);
  }

  return entries.size;
}

export function collectRequiredEntries(manifest, popupHtml) {
  const requiredEntries = new Set([
    "manifest.json",
    manifest.action.default_popup,
    "assets/colors.json",
    "assets/fonts.json",
  ]);

  if (manifest.background?.service_worker) {
    requiredEntries.add(manifest.background.service_worker);
  }

  for (const iconPath of Object.values(manifest.icons ?? {})) {
    requiredEntries.add(iconPath);
  }

  for (const iconPath of Object.values(manifest.action.default_icon ?? {})) {
    requiredEntries.add(iconPath);
  }

  for (const contentScript of manifest.content_scripts ?? []) {
    for (const cssPath of contentScript.css ?? []) {
      requiredEntries.add(cssPath);
    }

    for (const jsPath of contentScript.js ?? []) {
      requiredEntries.add(jsPath);
    }
  }

  for (const popupEntry of extractPopupLocalReferences(popupHtml)) {
    requiredEntries.add(popupEntry);
  }

  return requiredEntries;
}

export function extractPopupLocalReferences(html) {
  const references = [];
  const assetPattern = /<(?:script|link)\b[^>]+(?:src|href)=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = assetPattern.exec(html))) {
    const value = match[1].trim();
    if (!value || value.startsWith("#")) {
      continue;
    }

    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) {
      throw new Error(`Popup references a remote or absolute asset: ${value}`);
    }

    if (value.startsWith("/") || value.includes("..")) {
      throw new Error(`Popup references an invalid package asset: ${value}`);
    }

    references.push(value);
  }

  return references;
}

export async function listZipEntries(filePath) {
  const data = await readFile(filePath);
  const endOfCentralDirectoryOffset = findEndOfCentralDirectory(data);
  const centralDirectorySize = data.readUInt32LE(endOfCentralDirectoryOffset + 12);
  const centralDirectoryOffset = data.readUInt32LE(endOfCentralDirectoryOffset + 16);
  const entries = [];
  let offset = centralDirectoryOffset;
  const endOffset = centralDirectoryOffset + centralDirectorySize;

  while (offset < endOffset) {
    if (data.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central directory header at offset ${offset}`);
    }

    const fileNameLength = data.readUInt16LE(offset + 28);
    const extraFieldLength = data.readUInt16LE(offset + 30);
    const fileCommentLength = data.readUInt16LE(offset + 32);
    const fileNameStart = offset + 46;
    const fileNameEnd = fileNameStart + fileNameLength;
    entries.push(data.toString("utf8", fileNameStart, fileNameEnd));
    offset = fileNameEnd + extraFieldLength + fileCommentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(data) {
  const minOffset = Math.max(0, data.length - 0xffff - 22);

  for (let offset = data.length - 22; offset >= minOffset; offset -= 1) {
    if (data.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("Could not find ZIP end of central directory");
}

async function main() {
  const entriesSize = await verifyExtensionPackage();
  console.log(`Verified ${path.resolve(defaultOptions.zipPath)} with ${entriesSize} entries`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
