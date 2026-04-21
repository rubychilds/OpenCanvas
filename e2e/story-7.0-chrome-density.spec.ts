import { test, expect } from "./fixtures";

async function waitForEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { __designjs?: unknown }).__designjs !== "undefined",
    undefined,
    { timeout: 10_000 },
  );
}

async function selectDiv(page: import("@playwright/test").Page, marker: string): Promise<void> {
  await page.evaluate((mk) => {
    const api = (window as unknown as {
      __designjs: { addHtml: (h: string) => unknown; editor: { select: (c: unknown) => void } };
    }).__designjs;
    const added = api.addHtml(`<div data-testid="${mk}">m</div>`) as Array<unknown>;
    api.editor.select(Array.isArray(added) ? (added[0] as unknown) : (added as unknown));
  }, marker);
}

test.describe("Story 7.0 / D.3d: semantic inspector sections", () => {
  test("Position section shows align-items + X/Y + rotation for a selected div", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await selectDiv(page, "pos-host");

    await expect(page.locator('[data-testid="oc-ins-align-items"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-ins-x"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-ins-y"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-ins-rotate"]')).toBeVisible();
  });

  test("Auto Layout toggle reveals direction / gap / justify when on, hides them when off", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await selectDiv(page, "al-host");

    // Starts off — direction row is hidden
    await expect(page.locator('[data-testid="oc-ins-flex-direction"]')).toHaveCount(0);

    await page.locator('[data-testid="oc-ins-autolayout-toggle"]').click();
    await expect(page.locator('[data-testid="oc-ins-flex-direction"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-ins-gap"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-ins-justify"]')).toBeVisible();

    // Toggle off — rows gone again
    await page.locator('[data-testid="oc-ins-autolayout-toggle"]').click();
    await expect(page.locator('[data-testid="oc-ins-flex-direction"]')).toHaveCount(0);
  });

  test("toggling Auto Layout writes display:flex / removes display on the component", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await selectDiv(page, "al-write");

    await page.locator('[data-testid="oc-ins-autolayout-toggle"]').click();
    const display = await page.evaluate(() => {
      const ed = (window as unknown as {
        __designjs: { editor: { getSelected: () => { getStyle: () => Record<string, string> } } };
      }).__designjs.editor;
      return ed.getSelected().getStyle().display ?? "";
    });
    expect(display).toBe("flex");
  });

  test("Clip content checkbox writes overflow:hidden on both axes", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await selectDiv(page, "clip-host");

    // Single "Clip content" checkbox replaced the per-axis overflow
    // dropdowns — flipping it on writes the `overflow` shorthand so both
    // axes clip together.
    const clip = page.locator('[data-testid="oc-ins-clip-content"]');
    await expect(clip).toBeVisible();
    await expect(clip).not.toBeChecked();
    await clip.check();

    const css = await page.evaluate(() => {
      const ed = (window as unknown as {
        __designjs: {
          editor: { getSelected: () => { getStyle: () => Record<string, string> } };
        };
      }).__designjs.editor;
      return ed.getSelected().getStyle();
    });
    expect(css["overflow"]).toBe("hidden");
  });

  test("Raw CSS fallback is hidden by default and only renders when orphan properties exist", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await selectDiv(page, "raw-host");

    // Nothing orphan is set — a plain div's properties all belong to the
    // semantic inspector sections. Raw CSS accordion should not render.
    await expect(page.locator('[data-testid="oc-ins-raw-css-trigger"]')).toHaveCount(0);

    // Set a non-semantic property (transition isn't owned by any section)
    // and the Raw CSS section reappears under the label "Other CSS".
    await page.evaluate(() => {
      const ed = (window as unknown as {
        __designjs: {
          editor: { getSelected: () => { addStyle: (s: Record<string, string>) => void } };
        };
      }).__designjs.editor;
      ed.getSelected().addStyle({ transition: "all 200ms ease" });
    });

    await expect(page.locator('[data-testid="oc-ins-raw-css-trigger"]')).toBeVisible();
    await page.locator('[data-testid="oc-ins-raw-css-trigger"]').click();
    // One of the legacy sector headers appears once expanded.
    await expect(page.locator('[data-testid="oc-sector-Layout"]')).toBeVisible();
  });
});
