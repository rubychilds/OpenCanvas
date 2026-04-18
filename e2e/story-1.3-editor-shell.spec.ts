import { test, expect } from "./fixtures";

test.describe("Story 1.3: editor shell", () => {
  test("renders three-column shell with panels + topbar + zoom toolbar", async ({ freshApp: page }) => {
    await expect(page.locator('[data-testid="oc-topbar-title"]')).toHaveText("OpenCanvas");
    await expect(page.locator('[data-testid="oc-bridge-dot"]')).toBeVisible();

    await expect(page.locator('#oc-left')).toBeVisible();
    await expect(page.locator('#oc-center')).toBeVisible();
    await expect(page.locator('#oc-right')).toBeVisible();

    // two resize handles between three panels (react-resizable-panels separators)
    await expect(page.locator("[data-separator]")).toHaveCount(2);

    // floating zoom control (bottom-right of canvas) shows the current % and −/+ buttons
    await expect(page.locator('[data-testid="oc-zoom-control"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-zoom-readout"]')).toContainText(/\d+%/);
    await expect(page.locator('[data-testid="oc-zoom-in"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-zoom-out"]')).toBeVisible();
  });

  test("panels respect percentage sizing (left ~18%, center ~62%, right ~20%)", async ({
    freshApp: page,
  }) => {
    const sizes = await page.evaluate(() => {
      const group = document.querySelector("[data-group]") as HTMLElement | null;
      const left = document.getElementById("oc-left");
      const center = document.getElementById("oc-center");
      const right = document.getElementById("oc-right");
      if (!group || !left || !center || !right) return null;
      const gw = group.getBoundingClientRect().width;
      return {
        left: (left.getBoundingClientRect().width / gw) * 100,
        center: (center.getBoundingClientRect().width / gw) * 100,
        right: (right.getBoundingClientRect().width / gw) * 100,
      };
    });

    if (!sizes) throw new Error("group or panels not found");

    expect(sizes.left).toBeGreaterThan(14);
    expect(sizes.left).toBeLessThan(22);
    expect(sizes.center).toBeGreaterThan(55);
    expect(sizes.center).toBeLessThan(70);
    expect(sizes.right).toBeGreaterThan(16);
    expect(sizes.right).toBeLessThan(24);
  });

  test("dragging the resize handle grows the left panel", async ({ freshApp: page }) => {
    const leftPanel = page.locator('#oc-left');
    const beforeBox = await leftPanel.boundingBox();
    if (!beforeBox) throw new Error("left panel not visible");

    const handle = page.locator("[data-separator]").first();
    const handleBox = await handle.boundingBox();
    if (!handleBox) throw new Error("resize handle not visible");

    // drag the first handle 120px to the right
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2 + 120, handleBox.y + handleBox.height / 2, {
      steps: 10,
    });
    await page.mouse.up();

    const afterBox = await leftPanel.boundingBox();
    if (!afterBox) throw new Error("left panel not visible after drag");
    expect(afterBox.width).toBeGreaterThan(beforeBox.width + 50);
  });

  test("Cmd+D duplicates the selected component", async ({ freshApp: page }) => {
    await page.evaluate(() => {
      const api = (window as unknown as { __opencanvas: { editor: unknown; addHtml: (h: string) => unknown } })
        .__opencanvas;
      const added = api.addHtml(`<div id="target" class="p-4">only child</div>`) as unknown as
        | { at?: (i: number) => unknown }
        | Array<unknown>;
      const first = Array.isArray(added) ? added[0] : added;
      const ed = api.editor as { select: (c: unknown) => void };
      ed.select(first);
    });

    await page.keyboard.press("Meta+d");

    const count = await page.evaluate(() => {
      const ed = (window as unknown as { __opencanvas: { editor: unknown } }).__opencanvas
        .editor as { getWrapper: () => { components: () => { length: number } } };
      return ed.getWrapper().components().length;
    });
    expect(count).toBe(2);
  });

  test("Cmd+Z undoes an add_components call", async ({ freshApp: page }) => {
    await page.evaluate(() => {
      const api = (window as unknown as { __opencanvas: { addHtml: (h: string) => unknown } })
        .__opencanvas;
      api.addHtml(`<div class="p-4">undo-me</div>`);
    });

    await page.keyboard.press("Meta+z");

    const count = await page.evaluate(() => {
      const ed = (window as unknown as { __opencanvas: { editor: unknown } }).__opencanvas
        .editor as { getWrapper: () => { components: () => { length: number } } };
      return ed.getWrapper().components().length;
    });
    expect(count).toBe(0);
  });
});
