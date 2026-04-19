import { test, expect } from "./fixtures";

async function waitForEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { __opencanvas?: unknown }).__opencanvas !== "undefined",
    undefined,
    { timeout: 10_000 },
  );
}

async function firstFrameWidth(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const ed = (window as unknown as {
      __opencanvas: { editor: { Canvas: { getFrames: () => Array<{ get: (k: string) => unknown }> } } };
    }).__opencanvas.editor;
    const first = ed.Canvas.getFrames()[0]!;
    return Number(first.get("width") ?? 0);
  });
}

test.describe("Story 7.2: breakpoint toolbar — responsive preview", () => {
  test("renders three breakpoint toggles in the Topbar", async ({ freshApp: page }) => {
    await waitForEditor(page);
    const tb = page.locator('[data-testid="oc-breakpoint-toolbar"]');
    await expect(tb).toBeVisible();
    await expect(page.locator('[data-testid="oc-breakpoint-desktop"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-breakpoint-tablet"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-breakpoint-mobile"]')).toBeVisible();
  });

  test("default Desktop artboard highlights the Desktop toggle", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await expect(page.locator('[data-testid="oc-breakpoint-desktop"]')).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("tablet click resizes active artboard to 768", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await page.locator('[data-testid="oc-breakpoint-tablet"]').click();
    expect(await firstFrameWidth(page)).toBe(768);
    await expect(page.locator('[data-testid="oc-breakpoint-tablet"]')).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("mobile click resizes active artboard to 375, then desktop returns to 1440", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await page.locator('[data-testid="oc-breakpoint-mobile"]').click();
    expect(await firstFrameWidth(page)).toBe(375);

    await page.locator('[data-testid="oc-breakpoint-desktop"]').click();
    expect(await firstFrameWidth(page)).toBe(1440);
  });

  test("picking a breakpoint preserves the artboard's existing height", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    // Start: default 1440×900 desktop. Manually bump the height so we can
    // confirm the toolbar only touches width.
    await page.evaluate(() => {
      const ed = (window as unknown as {
        __opencanvas: { editor: { Canvas: { getFrames: () => Array<{ set: (a: Record<string, unknown>) => void }> } } };
      }).__opencanvas.editor;
      ed.Canvas.getFrames()[0]!.set({ height: 1234 });
    });

    await page.locator('[data-testid="oc-breakpoint-tablet"]').click();

    const height = await page.evaluate(() => {
      const ed = (window as unknown as {
        __opencanvas: { editor: { Canvas: { getFrames: () => Array<{ get: (k: string) => unknown }> } } };
      }).__opencanvas.editor;
      return Number(ed.Canvas.getFrames()[0]!.get("height") ?? 0);
    });
    expect(height).toBe(1234);
  });
});
