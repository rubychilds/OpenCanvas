import { test, expect } from "./fixtures";

interface CanvasLike {
  getZoom(): number;
  setZoom(v: number): unknown;
}

async function waitForEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { __opencanvas?: unknown }).__opencanvas !== "undefined",
    undefined,
    { timeout: 10_000 },
  );
}

test.describe("Story 5.2: pan and zoom", () => {
  test("floating zoom readout updates when editor.Canvas.setZoom is called", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);

    await page.evaluate(() => {
      const w = window as unknown as { __opencanvas: { editor: { Canvas: CanvasLike } } };
      w.__opencanvas.editor.Canvas.setZoom(75);
    });
    await expect(page.locator('[data-testid="oc-zoom-readout"]')).toContainText("75%");

    // Open the dropdown and pick 200%
    await page.locator('[data-testid="oc-zoom-readout"]').click();
    await page.locator('[data-testid="oc-zoom-200"]').click();
    await expect(page.locator('[data-testid="oc-zoom-readout"]')).toContainText("200%");
  });

  test("⌘0 resets zoom to 100% (fit path)", async ({ freshApp: page }) => {
    await waitForEditor(page);

    await page.evaluate(() => {
      const w = window as unknown as { __opencanvas: { editor: { Canvas: CanvasLike } } };
      w.__opencanvas.editor.Canvas.setZoom(250);
    });
    await expect(page.locator('[data-testid="oc-zoom-readout"]')).toContainText("250%");

    await page.keyboard.press("Meta+0");
    await expect(page.locator('[data-testid="oc-zoom-readout"]')).not.toContainText("250%", {
      timeout: 3000,
    });
  });

  test("+ / − step buttons change zoom by 10% each click", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await page.evaluate(() => {
      (window as unknown as { __opencanvas: { editor: { Canvas: CanvasLike } } }).__opencanvas.editor.Canvas.setZoom(100);
    });

    await page.locator('[data-testid="oc-zoom-in"]').click();
    await page.locator('[data-testid="oc-zoom-in"]').click();
    await expect(page.locator('[data-testid="oc-zoom-readout"]')).toContainText("120%");

    await page.locator('[data-testid="oc-zoom-out"]').click();
    await expect(page.locator('[data-testid="oc-zoom-readout"]')).toContainText("110%");
  });

  test("preset menu items apply to Canvas.getZoom()", async ({ freshApp: page }) => {
    await waitForEditor(page);

    for (const z of [50, 100, 200] as const) {
      await page.locator('[data-testid="oc-zoom-readout"]').click();
      await page.locator(`[data-testid="oc-zoom-${z}"]`).click();
      const actual = await page.evaluate(() => {
        const w = window as unknown as { __opencanvas: { editor: { Canvas: CanvasLike } } };
        return Math.round(w.__opencanvas.editor.Canvas.getZoom());
      });
      expect(actual).toBe(z);
    }
  });
});
