import { test, expect } from "./fixtures";

interface FrameLike {
  getId?(): string;
  get?(key: string): unknown;
}

async function waitForEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const w = window as unknown as { __opencanvas?: { editor: { Canvas: { getFrames(): FrameLike[] } } } };
      return (w.__opencanvas?.editor.Canvas.getFrames().length ?? 0) > 0;
    },
    undefined,
    { timeout: 10_000 },
  );
}

test.describe("Story 5.2: minimap", () => {
  test("minimap renders with one frame rectangle and a zoom readout", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await expect(page.locator('[data-testid="oc-minimap"]')).toBeVisible();
    await expect(page.locator('[data-testid^="oc-minimap-frame-"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="oc-minimap-zoom"]')).toHaveText(/\d+%/);
  });

  test("adding an artboard shows up as a new rect in the minimap", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await page.locator('[data-testid="oc-add-artboard-mobile"]').click();
    await expect(page.locator('[data-testid^="oc-minimap-frame-"]')).toHaveCount(2);
  });

  test("minimap zoom readout follows Canvas.setZoom", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await page.evaluate(() => {
      (window as unknown as { __opencanvas: { editor: { Canvas: { setZoom(n: number): unknown } } } }).__opencanvas.editor.Canvas.setZoom(
        175,
      );
    });
    await expect(page.locator('[data-testid="oc-minimap-zoom"]')).toHaveText("175%");
  });
});
