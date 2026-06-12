import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("CI workflow verifies the extension package on PRs", async () => {
  const workflow = await readFile(".github/workflows/verify.yml", "utf8");

  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /repository:\s+mbadolato\/iTerm2-Color-Schemes/);
  assert.match(workflow, /path:\s+vendor\/iTerm2-Color-Schemes/);
  assert.match(workflow, /run:\s+pnpm verify/);
  assert.match(workflow, /uses:\s+actions\/upload-artifact@v4/);
  assert.match(workflow, /name:\s+chrome-extension-package/);
  assert.match(workflow, /path:\s+dist\/term-ptt-custom-theme\.zip/);
  assert.match(workflow, /name:\s+chrome-web-store-assets/);
  assert.match(workflow, /store-assets\/small-promo-440x280\.png/);
  assert.match(workflow, /store-assets\/screenshots\/01-custom-theme\.png/);
  assert.match(workflow, /store-assets\/screenshots\/02-retro-theme\.png/);
  assert.doesNotMatch(workflow, /screenshot-marketplace/);
  assert.doesNotMatch(workflow, /marketplace/i);
  assert.match(workflow, /if-no-files-found:\s+error/);
  assert.match(
    workflow,
    /ITERM2_COLOR_SCHEMES_DIR:\s+vendor\/iTerm2-Color-Schemes\/windowsterminal/,
  );
});
