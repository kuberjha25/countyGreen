const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const drive = ["X:", "Y:", "Z:", "W:", "V:"].find((candidate) => !fs.existsSync(`${candidate}\\`));

if (!drive) {
  console.error("No free drive letter is available for the local Android build.");
  process.exit(1);
}

// Map the parent dir, not the project itself: expo-modules-autolinking never checks
// a drive root for package.json, so the project must not sit at `X:\`.
const mapped = spawnSync("subst.exe", [drive, path.dirname(projectRoot)], { stdio: "inherit" });
if (mapped.status !== 0) process.exit(mapped.status ?? 1);

let build;
try {
  const androidDir = `${drive}\\${path.basename(projectRoot)}\\android`;
  build = spawnSync("cmd.exe", ["/d", "/c", `${androidDir}\\gradlew.bat`, "assembleRelease", ...process.argv.slice(2)], {
    cwd: androidDir,
    stdio: "inherit",
  });
} finally {
  spawnSync("subst.exe", [drive, "/d"], { stdio: "inherit" });
}

process.exit(build?.status ?? 1);
