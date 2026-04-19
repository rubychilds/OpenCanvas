import { test, expect } from "./fixtures";

async function waitForEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { __opencanvas?: unknown }).__opencanvas !== "undefined",
    undefined,
    { timeout: 10_000 },
  );
}

/**
 * The breakpoint toolbar operates on the active artboard. Fresh canvas now
 * starts with zero frames, so seed one Desktop per test.
 */
async function seedDesktop(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => {
    const ed = (window as unknown as {
      __opencanvas: {
        editor: {
          Canvas: {
            addFrame: (p: Record<string, unknown>) => {
              get: (k: string) => unknown;
            };
          };
          select: (c: unknown) => void;
          trigger?: (ev: string) => void;
        };
      };
    }).__opencanvas.editor;
    const frame = ed.Canvas.addFrame({
      name: "Desktop",
      x: 0,
      y: 0,
      width: 1440,
      height: 900,
    });
    // Make the seeded frame active so the breakpoint toolbar's
    // `getActiveArtboardId` targets it rather than the unopinionated
    // auto-frame that GrapesJS creates at init.
    const wrapper = frame.get("component");
    if (wrapper) ed.select(wrapper);
    ed.trigger?.("opencanvas:artboards-changed");
  });
}

async function firstFrameWidth(page: import("@playwright/test").Page): Promise<number> {
  // Returns the width of the "Desktop" we seed (or the first frame if no
  // Desktop exists). The fresh canvas auto-frame comes before Desktop in
  // getFrames order, which is why we filter by name.
  return page.evaluate(() => {
    const ed = (window as unknown as {
      __opencanvas: { editor: { Canvas: { getFrames: () => Array<{ get: (k: string) => unknown }> } } };
    }).__opencanvas.editor;
    const frames = ed.Canvas.getFrames();
    const desktop = frames.find((f) => f.get("name") === "Desktop") ?? frames[0]!;
    return Number(desktop.get("width") ?? 0);
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
    await seedDesktop(page);
    await expect(page.locator('[data-testid="oc-breakpoint-desktop"]')).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("tablet click resizes active artboard to 768", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await seedDesktop(page);
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
    await seedDesktop(page);
    await page.locator('[data-testid="oc-breakpoint-mobile"]').click();
    expect(await firstFrameWidth(page)).toBe(375);

    await page.locator('[data-testid="oc-breakpoint-desktop"]').click();
    expect(await firstFrameWidth(page)).toBe(1440);
  });

  test("picking a breakpoint preserves the artboard's existing height", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await seedDesktop(page);
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
