import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const copies = [
  ["color.css", "extension/assets/color.css"],
  ["data/colors.json", "extension/assets/colors.json"],
];

for (const [, destination] of copies) {
  await mkdir(path.dirname(destination), { recursive: true });
}

for (const [source, destination] of copies) {
  await copyFile(source, destination);
  console.log(`Copied ${source} -> ${destination}`);
}
