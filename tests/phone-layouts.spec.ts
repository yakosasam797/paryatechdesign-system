import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("phone documentation navigation traps focus, closes, and restores its trigger", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/#/releases");
  const trigger = page.getByRole("button", { name: "Toggle navigation" });
  await trigger.click();
  const nav = page.getByRole("dialog", { name: "Navigation", exact: true });
  await expect(nav).toBeVisible();
  for (let i = 0; i < 8; i++) await page.keyboard.press("Shift+Tab");
  expect(await nav.evaluate((el) => el.contains(document.activeElement))).toBe(
    true,
  );
  await page.keyboard.press("Escape");
  await expect(nav).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await nav.getByRole("link", { name: "Installation", exact: true }).click();
  await expect(nav).toHaveCount(0);
  await expect(page).toHaveURL(/#\/installation$/);
  await expect(
    page.getByRole("heading", { name: "Start building.", exact: true }),
  ).toBeVisible();
});

test("phone playground uses a real viewport and does not change the site theme", async ({
  page,
}) => {
  await page.goto("/#/components/DataTable");
  await page.getByLabel("Preview width").selectOption("compact");
  const phone = page.frameLocator('iframe[title="DataTable phone preview"]');
  await expect(phone.getByRole("table")).toBeVisible();
  expect(await phone.locator("html").evaluate(() => innerWidth)).toBe(390);
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(phone.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("phone record cards retain table labels, sorting and selection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/preview/DataTable?theme=light");
  const table = page.getByRole("table");
  await expect(table).toHaveCSS("display", "block");
  await table
    .getByRole("checkbox", { name: "Select all rows", exact: true })
    .check();
  await expect(table.getByRole("checkbox", { name: /Select row/ })).toHaveCount(
    3,
  );
  for (const control of await table
    .getByRole("checkbox", { name: /Select row/ })
    .all())
    await expect(control).toBeChecked();
  await table.getByRole("button", { name: /Total/ }).click();
  await expect(
    table.getByRole("columnheader", { name: /Total/ }),
  ).toHaveAttribute("aria-sort", "ascending");
  const results = await new AxeBuilder({ page })
    .include(".pt-table-scroll")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

test("package histories show their own versions and generated source", async ({
  page,
}) => {
  await page.goto("/#/releases");
  await expect(
    page.getByRole("heading", { name: "0.3.1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Unreleased", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator(".ds-release-entry").first().locator("time"),
  ).toHaveAttribute("datetime", "2026-10-29");
  await expect(
    page.getByRole("heading", { name: "0.1.0", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Package", { exact: true }).selectOption("storybook");
  await expect(
    page.getByRole("link", { name: "Source history", exact: true }),
  ).toHaveAttribute(
    "href",
    "https://github.com/yakosasam797/paryatechdesign-system/blob/main/apps/storybook/CHANGELOG.md",
  );
  await expect(
    page.getByRole("heading", {
      name: "parya-designsystem-storybook",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Phone APIs and workspace stories",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "0.1.0", exact: true }),
  ).toHaveCount(0);
  const packages = (await (await page.request.get("/api/releases.json")).json())
    .packages;
  expect(packages).toHaveLength(2);
  for (const pkg of packages) {
    expect(pkg.version).toBe("0.3.1");
    expect(pkg.releases[0].version).toBe("0.3.1");
    expect(pkg.releases[0].date).toBe("2026-10-29");
  }
  expect(await (await page.request.get("/docs/releases.md")).text()).toContain(
    "0.3.1 · 2026-10-29",
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

test("phone board stage controls follow both selection and horizontal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/preview/KanbanBoard?theme=light");
  const picker = page.getByRole("group", { name: "Workflow stage" });
  await expect(picker).toBeVisible();
  const buttons = picker.getByRole("button");
  await buttons.nth(1).click();
  await expect(buttons.nth(1)).toHaveAttribute("aria-pressed", "true");
  await page.locator(".pt-board-lanes").evaluate((el) => {
    el.scrollLeft = 0;
    el.dispatchEvent(new Event("scroll"));
  });
  await expect(buttons.first()).toHaveAttribute("aria-pressed", "true");
});

test("phone schedule has a working compact week navigator", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/preview/Agenda?theme=light");
  const week = page.getByRole("navigation", {
    name: "Schedule week",
    exact: true,
  });
  await expect(week).toBeVisible();
  const dates = week.locator(".pt-agenda-week-days button");
  const first = await dates.first().getAttribute("aria-label");
  await week.getByRole("button", { name: "Next week", exact: true }).click();
  await expect(dates.first()).not.toHaveAttribute("aria-label", first!);
  await week
    .getByRole("button", { name: "Previous week", exact: true })
    .click();
  await expect(dates.first()).toHaveAttribute("aria-label", first!);
  await dates.nth(1).click();
  await expect(dates.nth(1)).toHaveAttribute("aria-pressed", "true");
});

for (const width of [320, 390])
  test(
    "shared phone layouts fit " + width + "px in both themes",
    async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      for (const theme of ["light", "dark"])
        for (const name of [
          "AppShell",
          "DataTable",
          "ListPageTemplate",
          "RecordPageTemplate",
          "RecordOverviewLayout",
          "DashboardPageTemplate",
          "FormPageTemplate",
          "SettingsPageTemplate",
          "OpenRecordsSwitcher",
          "NotificationsDrawer",
          "KanbanBoard",
          "Agenda",
        ]) {
          await page.goto("/#/preview/" + name + "?theme=" + theme);
          await expect(page.locator(".ds-standalone-preview")).toBeVisible();
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
            name + " " + theme,
          ).toBeLessThanOrEqual(width);
          if (name === "AppShell") {
            await expect(
              page.locator(".pt-shell-desktop-sidebar"),
            ).toBeHidden();
            expect(
              await page
                .locator(".pt-kpi-grid")
                .first()
                .evaluate(
                  (el) =>
                    getComputedStyle(el).gridTemplateColumns.split(" ").length,
                ),
            ).toBe(1);
          }
          if (name === "SettingsPageTemplate")
            await expect(page.locator(".pt-settings-columns > nav")).toHaveCSS(
              "flex-direction",
              "row",
            );
        }
    },
  );
