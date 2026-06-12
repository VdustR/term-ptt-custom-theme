import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const sizes = [16, 32, 48, 128];
const sourceDir = "store-assets/extension-icons";
const outputDir = "extension/icons";

await mkdir(outputDir, { recursive: true });

for (const size of sizes) {
  const source = path.join(sourceDir, `icon${size}.png`);
  const destination = path.join(outputDir, `icon${size}.png`);
  await copyFile(source, destination);
  console.log(`Copied ${source} -> ${destination}`);
}
