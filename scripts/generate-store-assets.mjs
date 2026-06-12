import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const outputDir = "store-assets";
const smallPromoSource = path.join(outputDir, "small-promo-source-440x280.png");
const smallPromoOutput = path.join(outputDir, "small-promo-440x280.png");

await mkdir(outputDir, { recursive: true });
await copyFile(smallPromoSource, smallPromoOutput);
console.log(`Copied ${smallPromoSource} -> ${smallPromoOutput}`);
