import { mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const outputPath = path.resolve("dist/term-ptt-custom-theme.zip");

await mkdir(path.dirname(outputPath), { recursive: true });
await rm(outputPath, { force: true });

await run("zip", ["-qr", outputPath, "."], { cwd: "extension" });

console.log(`Packaged extension to ${outputPath}`);

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}
