import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const service = process.argv[2];
const portArg = process.argv.indexOf("--port");
const port =
  process.env.PORT || (portArg >= 0 ? process.argv[portArg + 1] : "");
if (!["app", "storybook"].includes(service) || !/^\d+$/.test(port)) {
  throw new Error(
    "Run this service through vercel dev, which assigns its port.",
  );
}
const serviceRoot = resolve(
  root,
  service === "app" ? "apps/docs" : "apps/storybook",
);
const require = createRequire(resolve(serviceRoot, "package.json"));

function packageBin(name) {
  const packagePath = require.resolve(`${name}/package.json`);
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  return resolve(
    dirname(packagePath),
    typeof pkg.bin === "string" ? pkg.bin : pkg.bin[name],
  );
}

function generate(script, cwd = root) {
  const result = spawnSync(process.execPath, [resolve(root, script)], {
    cwd,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

generate("scripts/build-fonts.mjs");
generate("scripts/generate-docs.mjs");
if (service === "storybook")
  generate(
    "apps/storybook/scripts/generate-stories.mjs",
    resolve(root, "apps/storybook"),
  );

// Storybook's development server assumes it owns /. Preview its real build
// under the public prefix when testing the shared Vercel router instead.
if (service === "storybook") {
  const result = spawnSync(
    process.execPath,
    [packageBin("storybook"), "build", "--disable-telemetry"],
    { cwd: serviceRoot, stdio: "inherit", windowsHide: true },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const args =
  service === "app"
    ? [
        "--config",
        resolve(root, "apps/docs/vite.config.ts"),
        "--host",
        "127.0.0.1",
        "--port",
        port,
        "--strictPort",
      ]
    : [
        "preview",
        "--outDir",
        "storybook-static",
        "--base",
        "/storybook/",
        "--host",
        "127.0.0.1",
        "--port",
        port,
        "--strictPort",
      ];
const child = spawn(process.execPath, [packageBin("vite"), ...args], {
  cwd: serviceRoot,
  env: { ...process.env, VITE_STORYBOOK_URL: "/storybook" },
  stdio: "inherit",
  windowsHide: true,
});
child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
