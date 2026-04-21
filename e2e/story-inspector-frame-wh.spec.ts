import { test, expect } from "./fixtures";

/**
 * User report 2026-04-19: "The width and height are not shown in the right
 * hand panel when the frame is selected." This spec verifies the current
 * behaviour. When a frame wrapper is selected, the LayoutSection's W/H
 * inputs should render with the frame's real dimensions (1280 × 800 for a
 * fresh default frame).
 */
test.describe("Inspector: W/H for frame wrapper selection", () => {
  test("selecting a default frame wrapper shows 1280 × 800 in the W/H fields", async ({
    freshApp: page,
  }) => {
    await page.waitForFunction(
      () => typeof (window as unknown as { __opencanvas?: unknown }).__opencanvas !== "undefined",
      undefined,
      { timeout: 10_000 },
    );

    // Select the frame's wrapper component.
    await page.evaluate(() => {
      const ed = (window as unknown as {
        __opencanvas: {
          editor: {
            Canvas: { getFrames: () => Array<{ get: (k: string) => unknown }> };
            select: (c: unknown) => void;
          };
        };
      }).__opencanvas.editor;
      const wrapper = ed.Canvas.getFrames()[0]!.get("component");
      if (wrapper) ed.select(wrapper);
    });

    // LayoutSection's W/H SizeFields have data-testid="oc-ins-width" /
    // "oc-ins-height" on the underlying input. Fixed-mode → input carries the
    // pixel value; hug/fill → a placeholder span is rendered instead.
    const wInput = page.locator('[data-testid="oc-ins-width"]');
    const hInput = page.locator('[data-testid="oc-ins-height"]');

    await expect(wInput).toBeVisible();
    await expect(hInput).toBeVisible();
    await expect(wInput).toHaveValue("1280");
    await expect(hInput).toHaveValue("800");
  });
});
