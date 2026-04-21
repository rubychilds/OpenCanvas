import { test, expect } from "./fixtures";

test.describe("Story 1.3: editor shell", () => {
  test("renders left + center columns; right panel hidden on empty selection", async ({
    freshApp: page,
  }) => {
    await expect(page.locator('[data-testid="oc-topbar-title"]')).toHaveText("DesignJS");
    await expect(page.locator('[data-testid="oc-bridge-dot"]')).toBeVisible();

    await expect(page.locator("#oc-left")).toBeVisible();
    await expect(page.locator("#oc-center")).toBeVisible();

    // Right panel is hidden when nothing is selected (D.4c).
    await expect(page.locator("#oc-right")).toHaveCount(0);

    // No drag gutters — D.4c retired react-resizable-panels.
    await expect(page.locator("[data-separator]")).toHaveCount(0);

    // Floating zoom control (bottom-right of canvas) shows the current % and −/+ buttons.
    await expect(page.locator('[data-testid="oc-zoom-control"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-zoom-readout"]')).toContainText(/\d+%/);
    await expect(page.locator('[data-testid="oc-zoom-in"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-zoom-out"]')).toBeVisible();
  });

  test("right panel mounts when a component is selected, unmounts when cleared", async ({
    freshApp: page,
  }) => {
    await page.waitForFunction(
      () => typeof (window as unknown as { __designjs?: unknown }).__designjs !== "undefined",
      undefined,
      { timeout: 10_000 },
    );

    await expect(page.locator("#oc-right")).toHaveCount(0);

    await page.evaluate(() => {
      const api = (window as unknown as {
        __designjs: {
          addHtml: (h: string) => unknown;
          editor: { select: (c: unknown) => void };
        };
      }).__designjs;
      const added = api.addHtml(`<div data-testid="sel-host">pick me</div>`) as Array<unknown>;
      api.editor.select(Array.isArray(added) ? (added[0] as unknown) : (added as unknown));
    });
    await expect(page.locator("#oc-right")).toBeVisible();

    await page.evaluate(() => {
      const ed = (window as unknown as {
        __designjs: { editor: { select: (c: unknown) => void } };
      }).__designjs.editor;
      ed.select(undefined as unknown);
    });
    await expect(page.locator("#oc-right")).toHaveCount(0);
  });

  test("left panel has a fixed width around 240px", async ({ freshApp: page }) => {
    const box = await page.locator("#oc-left").boundingBox();
    if (!box) throw new Error("left panel not visible");
    expect(box.width).toBeGreaterThanOrEqual(220);
    expect(box.width).toBeLessThanOrEqual(260);
  });

  test("Cmd+D duplicates the selected component", async ({ freshApp: page }) => {
    await page.evaluate(() => {
      const api = (window as unknown as { __designjs: { editor: unknown; addHtml: (h: string) => unknown } })
        .__designjs;
      const added = api.addHtml(`<div id="target" class="p-4">only child</div>`) as unknown as
        | { at?: (i: number) => unknown }
        | Array<unknown>;
      const first = Array.isArray(added) ? added[0] : added;
      const ed = api.editor as { select: (c: unknown) => void };
      ed.select(first);
    });

    await page.keyboard.press("Meta+d");

    const count = await page.evaluate(() => {
      const ed = (window as unknown as { __designjs: { editor: unknown } }).__designjs
        .editor as { getWrapper: () => { components: () => { length: number } } };
      return ed.getWrapper().components().length;
    });
    expect(count).toBe(2);
  });

  test("Cmd+Z undoes an add_components call", async ({ freshApp: page }) => {
    await page.evaluate(() => {
      const api = (window as unknown as { __designjs: { addHtml: (h: string) => unknown } })
        .__designjs;
      api.addHtml(`<div class="p-4">undo-me</div>`);
    });

    await page.keyboard.press("Meta+z");

    const count = await page.evaluate(() => {
      const ed = (window as unknown as { __designjs: { editor: unknown } }).__designjs
        .editor as { getWrapper: () => { components: () => { length: number } } };
      return ed.getWrapper().components().length;
    });
    expect(count).toBe(0);
  });
});
