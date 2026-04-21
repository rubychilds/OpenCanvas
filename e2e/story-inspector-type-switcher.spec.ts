import { test, expect } from "./fixtures";

async function waitForEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { __designjs?: unknown }).__designjs !== "undefined",
    undefined,
    { timeout: 10_000 },
  );
}

async function selectFirstFrameWrapper(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => {
    const ed = (window as unknown as {
      __designjs: {
        editor: {
          Canvas: { getFrames: () => Array<{ get: (k: string) => unknown }> };
          select: (c: unknown) => void;
        };
      };
    }).__designjs.editor;
    const wrapper = ed.Canvas.getFrames()[0]!.get("component");
    if (wrapper) ed.select(wrapper);
  });
}

test.describe("Inspector type switcher: Frame dropdown with device presets", () => {
  test("selecting a frame wrapper shows the 'Frame' dropdown at the top", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await selectFirstFrameWrapper(page);

    const trigger = page.locator('[data-testid="oc-ins-type-frame"]');
    await expect(trigger).toBeVisible();
    await expect(trigger).toContainText("Frame");
  });

  test("selecting a non-frame component shows a plain type label (no dropdown)", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await page.evaluate(() => {
      const api = (window as unknown as {
        __designjs: {
          addHtml: (s: string) => unknown;
          editor: { select: (c: unknown) => void };
        };
      }).__designjs;
      const added = api.addHtml(`<p data-testid="text-host">hi</p>`) as Array<unknown>;
      api.editor.select(Array.isArray(added) ? (added[0] as unknown) : (added as unknown));
    });

    await expect(page.locator('[data-testid="oc-ins-type-label"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-ins-type-frame"]')).toHaveCount(0);
  });

  test("dropdown opens and renders categorised device presets", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await selectFirstFrameWrapper(page);

    await page.locator('[data-testid="oc-ins-type-frame"]').click();

    const menu = page.locator('[data-testid="oc-ins-type-frame-menu"]');
    await expect(menu).toBeVisible();
    // Category headers
    await expect(menu).toContainText("Mobile");
    await expect(menu).toContainText("Tablet");
    await expect(menu).toContainText("Desktop");
    // Spot-check a few named presets so we know the device names are rendering
    await expect(menu).toContainText("iPhone 17");
    await expect(menu).toContainText("iPad Pro 11");
    await expect(menu).toContainText("MacBook Air");
  });

  test("clicking a preset resizes the selected frame", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await selectFirstFrameWrapper(page);

    await page.locator('[data-testid="oc-ins-type-frame"]').click();
    await page.locator('[data-testid="oc-ins-preset-iphone-17"]').click();

    const dims = await page.evaluate(() => {
      const ed = (window as unknown as {
        __designjs: {
          editor: {
            Canvas: { getFrames: () => Array<{ get: (k: string) => unknown }> };
          };
        };
      }).__designjs.editor;
      const f = ed.Canvas.getFrames()[0]!;
      return { width: Number(f.get("width") ?? 0), height: Number(f.get("height") ?? 0) };
    });
    expect(dims.width).toBe(402);
    expect(dims.height).toBe(874);
  });

  test("active preset is marked data-active when the frame matches its dimensions", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    // Default frame from ensureDefaultArtboard is 1280×800 — that matches
    // the Android Expanded preset, which should render as active.
    await selectFirstFrameWrapper(page);
    await page.locator('[data-testid="oc-ins-type-frame"]').click();

    await expect(
      page.locator('[data-testid="oc-ins-preset-android-expanded"]'),
    ).toHaveAttribute("data-active", "true");
  });
});
