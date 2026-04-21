import { test, expect } from "./fixtures";

interface FrameLike {
  getId?(): string;
  get?(key: string): unknown;
}

async function waitForEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const w = window as unknown as { __designjs?: { editor: { Canvas: { getFrames(): FrameLike[] } } } };
      return (w.__designjs?.editor.Canvas.getFrames().length ?? 0) > 0;
    },
    undefined,
    { timeout: 10_000 },
  );
}

test.describe("Story 5.2: minimap", () => {
  test("minimap renders with one frame rectangle", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await expect(page.locator('[data-testid="oc-minimap"]')).toBeVisible();
    await expect(page.locator('[data-testid^="oc-minimap-frame-"]')).toHaveCount(1);
    // The minimap's zoom readout was retired — ZoomControl (bottom-right)
    // is the canonical display, and the minimap now sits at bottom-left
    // so the two don't overlap.
    await expect(page.locator('[data-testid="oc-minimap-zoom"]')).toHaveCount(0);
  });

  test("adding an artboard shows up as a new rect in the minimap", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    // InsertRail Frame button goes through createArtboard → emits
    // ARTBOARDS_CHANGED, which the Minimap subscribes to for refresh.
    await page.locator('[data-testid="oc-insert-frame"]').click();
    await expect(page.locator('[data-testid^="oc-minimap-frame-"]')).toHaveCount(2);
  });
});
