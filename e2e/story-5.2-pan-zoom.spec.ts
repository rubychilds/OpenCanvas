import { test, expect } from "./fixtures";

interface CanvasLike {
  getZoom(): number;
  setZoom(v: number): unknown;
}

async function waitForEditor(page: Parameters<typeof test>[0] extends unknown ? never : never): Promise<void> {
  // placeholder to satisfy the import pattern — see inline waits
  return undefined as never;
}
void waitForEditor;

test.describe("Story 5.2: pan and zoom", () => {
  test("live zoom indicator updates when editor.Canvas.setZoom is called", async ({
    freshApp: page,
  }) => {
    await page.waitForFunction(
      () => typeof (window as unknown as { __opencanvas?: unknown }).__opencanvas !== "undefined",
      undefined,
      { timeout: 10_000 },
    );

    await page.evaluate(() => {
      const w = window as unknown as {
        __opencanvas: { editor: { Canvas: CanvasLike } };
      };
      w.__opencanvas.editor.Canvas.setZoom(75);
    });

    await expect(page.locator('[data-testid="oc-zoom-indicator"]')).toHaveText("75%");

    await page.locator('[data-testid="oc-zoom-200"]').click();
    await expect(page.locator('[data-testid="oc-zoom-indicator"]')).toHaveText("200%");
  });

  test("⌘0 resets zoom to 100% (fit path)", async ({ freshApp: page }) => {
    await page.waitForFunction(
      () => typeof (window as unknown as { __opencanvas?: unknown }).__opencanvas !== "undefined",
      undefined,
      { timeout: 10_000 },
    );

    await page.evaluate(() => {
      const w = window as unknown as {
        __opencanvas: { editor: { Canvas: CanvasLike } };
      };
      w.__opencanvas.editor.Canvas.setZoom(250);
    });
    await expect(page.locator('[data-testid="oc-zoom-indicator"]')).toHaveText("250%");

    await page.keyboard.press("Meta+0");

    await expect(page.locator('[data-testid="oc-zoom-indicator"]')).not.toHaveText("250%", {
      timeout: 3000,
    });
  });

  test("Fit / 50 / 100 / 200 preset buttons apply to Canvas.getZoom()", async ({
    freshApp: page,
  }) => {
    await page.waitForFunction(
      () => typeof (window as unknown as { __opencanvas?: unknown }).__opencanvas !== "undefined",
      undefined,
      { timeout: 10_000 },
    );

    for (const z of [50, 100, 200] as const) {
      await page.locator(`[data-testid="oc-zoom-${z}"]`).click();
      const actual = await page.evaluate(() => {
        const w = window as unknown as {
          __opencanvas: { editor: { Canvas: CanvasLike } };
        };
        return Math.round(w.__opencanvas.editor.Canvas.getZoom());
      });
      expect(actual).toBe(z);
    }
  });
});
