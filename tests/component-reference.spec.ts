import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, existsSync } from "node:fs";
const docs = JSON.parse(
  readFileSync("apps/docs/src/generated/components.json", "utf8"),
) as any[];
const configured = docs.filter(
  (doc) => doc.playground && doc.name !== "Button",
);

test("every code reference has connected guidance and matching copied documentation", async ({
  request,
}) => {
  for (const doc of docs) {
    expect(doc.documentation.accessibility.length, doc.name).toBeGreaterThan(0);
    expect(
      doc.sourcePath.startsWith("packages/web/src/"),
      doc.name,
    ).toBeTruthy();
    expect(existsSync(doc.sourcePath), doc.name).toBeTruthy();
    for (const name of doc.documentation.composition)
      expect(
        docs.some((item) => item.name === name),
        `${doc.name} composes ${name}`,
      ).toBeTruthy();
    for (const file of doc.documentation.styleSources)
      expect(existsSync(file), file).toBeTruthy();
    const response = await request.get(`/docs/${doc.name}.md`);
    const markdown = await response.text();
    expect(markdown).toContain("## Connected foundations");
    for (const line of doc.documentation.accessibility)
      expect(markdown, doc.name).toContain(line);
    expect(markdown).toContain(
      "/paryatechdesign-system/tree/main/apps/storybook",
    );
    expect(markdown, doc.name).toContain(
      `[Source](https://github.com/yakosasam797/paryatechdesign-system/blob/main/${doc.sourcePath}#L${doc.sourceLine})`,
    );
  }
  const button = docs.find((doc) => doc.name === "Button").documentation;
  expect(button.composition).toContain("Icon");
  expect(button.styleSources).toEqual(["packages/web/src/styles.css"]);
  expect(button.typography.map((token: any) => token.name)).toContain(
    "--pt-type-button-weight",
  );
  expect(button.colors.map((token: any) => token.name)).toContain(
    "--pt-color-action-primary",
  );
  expect(button.layout.map((token: any) => token.name)).toContain(
    "--pt-space-1-5",
  );
});

for (const width of [1440, 320])
  test(`all shared component control previews render and reset at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const doc of configured) {
      await page.goto(`/#/components/${doc.name}`);
      const preview = page.getByRole("region", {
        name: `Configured ${doc.name} preview`,
        exact: true,
      });
      await expect(preview, doc.name).toBeVisible();
      await expect(
        preview.locator(":scope > *").first(),
        doc.name,
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Reset controls", exact: true })
        .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        doc.name,
      ).toBeTruthy();
      await expect(
        page.getByRole("heading", {
          name: "Connected foundations",
          exact: true,
        }),
      ).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

test("TextField controls, icon slots and live typing stay synchronized with copied code", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/#/components/TextField");
  const controls = page.locator("#component-controls");
  const preview = controls.getByRole("region", {
    name: "Configured TextField preview",
  });
  await controls
    .getByRole("textbox", { name: "Label", exact: true })
    .fill("Booking owner");
  await preview
    .getByRole("textbox", { name: "Booking owner", exact: true })
    .fill("Riya Mehta");
  await expect(
    controls.getByRole("textbox", { name: "Value", exact: true }),
  ).toHaveValue("Riya Mehta");
  await controls
    .getByRole("combobox", { name: "Leading Icon", exact: true })
    .click();
  await page.getByRole("option", { name: "check", exact: true }).click();
  await expect(preview.locator("svg")).toHaveCount(1);
  await expect(
    controls.getByRole("combobox", { name: "Trailing Icon", exact: true }),
  ).toHaveCount(0);
  await controls
    .getByRole("button", { name: "Copy code", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('"leadingIcon": "check"');
  await expect(controls.locator("pre")).toContainText('"value": "Riya Mehta"');
  await controls.getByRole("switch", { name: "Disabled", exact: true }).click();
  await expect(
    preview.getByRole("textbox", { name: "Booking owner", exact: true }),
  ).toBeDisabled();
});

test("Checkbox and IconButton controls operate on real accessible components", async ({
  page,
}) => {
  await page.goto("/#/components/Checkbox");
  let controls = page.locator("#component-controls");
  const checkbox = controls.getByRole("region").getByRole("checkbox");
  await checkbox.press("Space");
  await expect(
    controls.getByRole("combobox", { name: "Checked", exact: true }),
  ).toHaveText("Checked");
  await controls
    .getByRole("combobox", { name: "Checked", exact: true })
    .click();
  await page
    .getByRole("option", { name: "indeterminate", exact: true })
    .click();
  await expect(checkbox).toHaveAttribute("aria-checked", "mixed");
  await controls.getByRole("switch", { name: "Disabled", exact: true }).click();
  await expect(checkbox).toBeDisabled();
  await page.goto("/#/components/IconButton");
  controls = page.locator("#component-controls");
  await controls
    .getByRole("textbox", { name: "Accessible name", exact: true })
    .fill("Edit traveler");
  const button = controls
    .getByRole("region")
    .getByRole("button", { name: "Edit traveler", exact: true });
  await expect(button).toBeVisible();
  await controls
    .getByRole("combobox", { name: "Variant", exact: true })
    .click();
  await page.getByRole("option", { name: "danger", exact: true }).click();
  await expect(button).toHaveClass(/pt-button--danger/);
});

for (const theme of ["light", "dark"])
  test(`shared guidance and controls remain accessible in ${theme}`, async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(
      (theme) => localStorage.setItem("parya-theme", theme),
      theme,
    );
    for (const name of ["TextField", "Checkbox", "IconButton", "StatusChip"]) {
      await page.goto(`/#/components/${name}`);
      await page.reload();
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        scan.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
        name,
      ).toEqual([]);
    }
    await page.goto("/#/components/Button");
    await page.locator("#component-foundations summary").click();
    await expect(page.locator("#component-foundations")).toContainText(
      "--pt-color-action-primary",
    );
    await page
      .locator("#component-foundations")
      .getByRole("link", { name: "Colors", exact: true })
      .click();
    await expect(page).toHaveURL(/#\/foundations\/color$/);
  });

test("the repository uses local workspaces and one services deployment configuration", () => {
  const root = JSON.parse(readFileSync("package.json", "utf8"));
  expect(root.private).toBe(true);
  expect(root.workspaces).toEqual(["packages/*", "apps/*"]);
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  expect(lock.packages["node_modules/@parya/design-system"]).toMatchObject({
    resolved: "packages/web",
    link: true,
  });
  const deployment = JSON.parse(readFileSync("vercel.json", "utf8"));
  expect(Object.keys(deployment.services)).toEqual(["app", "storybook"]);
  expect(deployment.rewrites).toEqual([
    {
      source: "/storybook/(.*)",
      destination: { service: "storybook" },
    },
    { source: "/(.*)", destination: { service: "app" } },
  ]);
  for (const [service, name] of [
    ["app", "docs"],
    ["storybook", "storybook"],
  ]) {
    expect(deployment.services[service].root).toBe(`apps/${name}`);
    expect(existsSync(`apps/${name}/vercel.json`)).toBe(false);
    expect(existsSync(`apps/${name}/package-lock.json`)).toBe(false);
    expect(readFileSync(`apps/${name}/package.json`, "utf8")).not.toContain(
      "file:../",
    );
  }
});
