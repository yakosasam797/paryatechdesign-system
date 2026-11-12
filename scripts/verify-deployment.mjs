import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const base = process.argv[2]?.replace(/\/+$/, "");
if (!base || !/^https?:\/\//.test(base)) {
  throw new Error(
    "Usage: npm run test:deployment -- https://your-deployment.example",
  );
}

// Exercise the actual deployed files, rather than a dev server's route fallback.
await Promise.all(
  [
    ["/", "text/html"],
    ["/docs/Checkbox.md", "text/markdown|text/plain|application/octet-stream"],
    ["/api/components.json", "application/json"],
    ["/storybook/", "text/html"],
    ["/storybook/index.json", "application/json"],
    ["/storybook/iframe.html", "text/html"],
  ].map(async ([path, contentType]) => {
    const response = await fetch(`${base}${path}`, {
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(response.status, 200, path);
    assert.match(
      response.headers.get("content-type") || "",
      new RegExp(contentType),
      path,
    );
    if (path.endsWith("index.json")) {
      const index = await response.json();
      assert.ok(
        index.entries["primitives-checkbox--docs"],
        "Checkbox docs entry exists",
      );
    }
    console.log(`PASS ${path}`);
  }),
);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().startsWith(`${base}/`) && response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(`${base}/#/components/Checkbox`);
  const link = page.getByRole("link", { name: "Storybook", exact: true });
  await link.waitFor();
  const href = await link.getAttribute("href");
  assert.equal(href, "/storybook/?path=/docs/primitives-checkbox--docs");
  await page.goto(new URL(href, base).href);
  const preview = page.frameLocator("#storybook-preview-iframe");
  await preview
    .getByRole("heading", { name: "Checkbox", exact: true })
    .first()
    .waitFor({ timeout: 60000 });
  await preview
    .getByRole("checkbox", { name: "Select travelers", exact: true })
    .first()
    .waitFor();
  console.log(
    "PASS documentation link opens the mounted Storybook and Checkbox docs",
  );

  await page.goto(
    `${base}/storybook/iframe.html?id=primitives-checkbox--default&viewMode=story`,
  );
  const checkbox = page.getByRole("checkbox", {
    name: "Select travelers",
    exact: true,
  });
  await checkbox.waitFor({ timeout: 60000 });
  await checkbox.check();
  assert.equal(await checkbox.isChecked(), true);
  assert.deepEqual(
    errors,
    [],
    "No failed deployed assets or browser exceptions",
  );
  console.log("PASS direct preview, Checkbox interaction, and deployed assets");
} finally {
  await browser.close();
}
