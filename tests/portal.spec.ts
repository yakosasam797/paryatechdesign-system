import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
const components: { name: string }[] = JSON.parse(
  readFileSync("apps/docs/src/generated/components.json", "utf8"),
);
test("homepage, navigation, mobile layout and theme", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "One system. Every journey." }),
  ).toBeVisible();
  const header = page.locator(".ds-topbar");
  for (const name of [
    "Components",
    "Foundations",
    "Brand Assets",
    "AI resources",
  ])
    await expect(header.getByRole("link", { name, exact: true })).toHaveCount(
      0,
    );
  await expect(header.getByText("Design system", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.locator(".ds-sidebar-intro,.ds-version")).toHaveCount(0);
  await expect(
    page
      .locator(".ds-sidebar")
      .getByText("React + TypeScript", { exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: "test-results/home-dark.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Toggle navigation" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page
    .locator(".ds-sidebar")
    .getByRole("link", { name: "Installation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Start building." }),
  ).toBeVisible();
});
test("component API, clipboard, Markdown and Storybook link", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/#/components/Button");
  await expect(
    page.getByRole("heading", { name: "Button", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Source", exact: true }),
  ).toHaveAttribute(
    "href",
    /^https:\/\/github\.com\/yakosasam797\/paryatechdesign-system\/blob\/main\/packages\/web\/src\/components\/primitives\.tsx#L\d+$/,
  );
  await page.getByRole("button", { name: "Copy for LLM", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("# Button");
  await page.getByRole("tab", { name: "API reference" }).click();
  await expect(page.locator(".ds-api-table")).toContainText("leadingIcon");
  const markdown = await page.request.get("/docs/Button.md");
  expect(markdown.status()).toBe(200);
  expect(await markdown.text()).toContain("variant");
  await expect(
    page.getByRole("link", { name: "Storybook", exact: true }),
  ).toHaveAttribute("href", /primitives-button--docs/);
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await page.screenshot({
    path: "test-results/button-desktop.png",
    fullPage: true,
  });
});
test("search works by keyboard and opens a real component", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  const search = page.getByRole("searchbox");
  await search.fill("MoneyField");
  await page
    .getByRole("dialog")
    .getByRole("link", { name: /MoneyField/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "MoneyField", exact: true }),
  ).toBeVisible();
});
test("all implemented component previews load without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const component of components) {
    await page.goto(`/#/components/${component.name}`);
    await expect(
      page.getByRole("heading", { name: component.name, exact: true }).first(),
    ).toBeVisible();
    await expect(page.locator(".ds-preview-inner")).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test("core documentation pages have no automated accessibility violations", async ({
  page,
}) => {
  for (const route of [
    "",
    "#/components/Button",
    "#/components/TextField",
    "#/foundations",
    "#/agents",
  ]) {
    await page.goto("/" + route);
    await expect(page.locator("main h1").first()).toBeVisible();
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      scan.violations.map((v) => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});
