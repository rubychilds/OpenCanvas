import { test, expect } from "./fixtures";

const STORAGE_KEY = "opencanvas:theme";

test.describe("Story 7.0 + ADR-0001: light/dark theme toggle", () => {
  test("defaults to light theme", async ({ freshApp: page }) => {
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe("light");
  });

  test("toggle flips the html data-theme attribute", async ({ freshApp: page }) => {
    const toggle = page.locator('[data-testid="oc-theme-toggle"]');
    await expect(toggle).toBeVisible();

    await toggle.click();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");

    await toggle.click();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("light");
  });

  test("dark theme flips the resolved --background token to a dark value", async ({
    freshApp: page,
  }) => {
    const toggle = page.locator('[data-testid="oc-theme-toggle"]');

    // Light mode: --background is oklch(1 0 0) → ~white. Read the token via
    // getComputedStyle on :root so we exercise the CSS cascade rather than
    // the raw variable.
    const lightBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
    );
    expect(lightBg).toContain("oklch(1");

    await toggle.click();
    const darkBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
    );
    expect(darkBg).toContain("oklch(0.145");
  });

  test("preference persists to localStorage and survives reload", async ({
    freshApp: page,
  }) => {
    await page.locator('[data-testid="oc-theme-toggle"]').click();
    const stored = await page.evaluate((k) => window.localStorage.getItem(k), STORAGE_KEY);
    expect(stored).toBe("dark");

    await page.reload();
    await page.waitForFunction(
      () => typeof (window as unknown as { __opencanvas?: unknown }).__opencanvas !== "undefined",
      undefined,
      { timeout: 10_000 },
    );
    const themeAfterReload = await page.evaluate(
      () => document.documentElement.dataset.theme,
    );
    expect(themeAfterReload).toBe("dark");

    // Clean up so the fixture teardown doesn't leak dark preference to other specs.
    await page.evaluate((k) => window.localStorage.removeItem(k), STORAGE_KEY);
  });

  test("toggle icon updates to reflect the active theme", async ({ freshApp: page }) => {
    const toggle = page.locator('[data-testid="oc-theme-toggle"]');

    // In light mode the button shows a Moon icon (action: switch to dark).
    await expect(toggle).toHaveAttribute("aria-label", "Switch to dark theme");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-label", "Switch to light theme");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-label", "Switch to dark theme");
  });
});
