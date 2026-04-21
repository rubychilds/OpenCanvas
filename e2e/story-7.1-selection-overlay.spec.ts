import { test, expect } from "./fixtures";

async function waitForEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { __designjs?: unknown }).__designjs !== "undefined",
    undefined,
    { timeout: 10_000 },
  );
}

async function addAndSelect(page: import("@playwright/test").Page, html: string): Promise<void> {
  await page.evaluate((h) => {
    const api = (window as unknown as {
      __designjs: { addHtml: (s: string) => unknown; editor: { select: (c: unknown) => void } };
    }).__designjs;
    const added = api.addHtml(h) as Array<unknown>;
    api.editor.select(Array.isArray(added) ? (added[0] as unknown) : (added as unknown));
  }, html);
}

test.describe("Story 7.1: Selection overlay — hover label + dimension badge", () => {
  test("dimension badge appears when a component is selected", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await addAndSelect(
      page,
      `<div data-testid="size-host" style="width: 240px; height: 120px;">hi</div>`,
    );

    const badge = page.locator('[data-testid="oc-selection-dim-badge"]');
    await expect(badge).toBeVisible();
    // W × H separator is a unicode "×" (U+00D7). Badge reads rounded integer W × H.
    await expect(badge).toContainText("240");
    await expect(badge).toContainText("120");
  });

  test("badge disappears when selection is cleared", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div style="width: 80px; height: 40px;">x</div>`);
    await expect(page.locator('[data-testid="oc-selection-dim-badge"]')).toBeVisible();

    await page.evaluate(() => {
      const ed = (window as unknown as {
        __designjs: { editor: { select: (c: unknown) => void } };
      }).__designjs.editor;
      ed.select(null);
    });
    await expect(page.locator('[data-testid="oc-selection-dim-badge"]')).toHaveCount(0);
  });

  test("hover label shows the component's name + dimensions when a different component is hovered", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);

    // Add two siblings, select the first, then fire a GrapesJS component:hovered
    // event for the second so the overlay exercises the hover path distinct
    // from selection.
    await page.evaluate(() => {
      const api = (window as unknown as {
        __designjs: {
          addHtml: (s: string) => unknown;
          editor: {
            select: (c: unknown) => void;
            trigger: (ev: string, ...args: unknown[]) => void;
          };
        };
      }).__designjs;
      const first = api.addHtml(
        `<div id="hov-a" style="width: 100px; height: 50px;">a</div>`,
      ) as Array<unknown>;
      const second = api.addHtml(
        `<div id="hov-b" style="width: 200px; height: 80px;">b</div>`,
      ) as Array<unknown>;
      api.editor.select(Array.isArray(first) ? (first[0] as unknown) : first);
      api.editor.trigger(
        "component:hovered",
        Array.isArray(second) ? (second[0] as unknown) : second,
      );
    });

    const label = page.locator('[data-testid="oc-selection-hover-label"]');
    await expect(label).toBeVisible();
    await expect(label).toContainText("200");
    await expect(label).toContainText("80");
  });

  test("hover label is hidden when hovered component === selected component (no duplicate badge)", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await page.evaluate(() => {
      const api = (window as unknown as {
        __designjs: {
          addHtml: (s: string) => unknown;
          editor: {
            select: (c: unknown) => void;
            trigger: (ev: string, ...args: unknown[]) => void;
          };
        };
      }).__designjs;
      const added = api.addHtml(
        `<div style="width: 60px; height: 60px;">self</div>`,
      ) as Array<unknown>;
      const node = Array.isArray(added) ? added[0]! : added;
      api.editor.select(node);
      api.editor.trigger("component:hovered", node);
    });

    await expect(page.locator('[data-testid="oc-selection-dim-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-selection-hover-label"]')).toHaveCount(0);
  });
});
