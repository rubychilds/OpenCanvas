import { test, expect } from "./fixtures";

async function waitForEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { __opencanvas?: unknown }).__opencanvas !== "undefined",
    undefined,
    { timeout: 10_000 },
  );
}

test.describe("Story 7.0 (Phase D.2): collapsible sectors + icon ToggleGroups + style filtering", () => {
  test("style manager sectors collapse/expand and persist to localStorage", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await page.evaluate(() =>
      (window as unknown as { __opencanvas: { addHtml: (h: string) => unknown; editor: { select: (c: unknown) => void } } }).__opencanvas.editor.select(
        (window as unknown as { __opencanvas: { addHtml: (h: string) => unknown } }).__opencanvas.addHtml(
          `<div data-testid="sector-host">hi</div>`,
        ) as unknown,
      ),
    );

    const layoutTrigger = page.locator('[data-testid="oc-sector-Layout"]');
    await expect(layoutTrigger).toBeVisible();
    await expect(layoutTrigger).toHaveAttribute("data-state", "open");

    // Collapse Layout, expand Typography.
    await layoutTrigger.click();
    await expect(layoutTrigger).toHaveAttribute("data-state", "closed");
    const typoTrigger = page.locator('[data-testid="oc-sector-Typography"]');
    await typoTrigger.click();
    await expect(typoTrigger).toHaveAttribute("data-state", "open");

    // Persistence: reload and assert the same state came back.
    await page.reload();
    await waitForEditor(page);
    await page.evaluate(() =>
      (window as unknown as { __opencanvas: { addHtml: (h: string) => unknown; editor: { select: (c: unknown) => void } } }).__opencanvas.editor.select(
        (window as unknown as { __opencanvas: { addHtml: (h: string) => unknown } }).__opencanvas.addHtml(
          `<div data-testid="sector-host-2">still</div>`,
        ) as unknown,
      ),
    );
    await expect(page.locator('[data-testid="oc-sector-Layout"]')).toHaveAttribute("data-state", "closed");
    await expect(page.locator('[data-testid="oc-sector-Typography"]')).toHaveAttribute("data-state", "open");
  });

  test("<p> selection filters out the Layout (flex) sector", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await page.evaluate(() => {
      const api = (window as unknown as {
        __opencanvas: { addHtml: (h: string) => unknown; editor: { select: (c: unknown) => void } };
      }).__opencanvas;
      const added = api.addHtml(`<p data-testid="p-el">paragraph</p>`) as Array<unknown>;
      api.editor.select(Array.isArray(added) ? (added[0] as unknown) : (added as unknown));
    });

    // Typography still shows
    await expect(page.locator('[data-testid="oc-sector-Typography"]')).toBeVisible();
    // Layout should be hidden for <p>
    await expect(page.locator('[data-testid="oc-sector-Layout"]')).toHaveCount(0);
  });

  test("flex-direction renders as icon ToggleGroup; click sets the CSS value", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await page.evaluate(() => {
      const api = (window as unknown as {
        __opencanvas: {
          addHtml: (h: string) => unknown;
          editor: { select: (c: unknown) => void };
        };
      }).__opencanvas;
      const added = api.addHtml(
        `<div data-testid="flex-host"><span>a</span><span>b</span></div>`,
      ) as Array<{ addStyle: (s: Record<string, string>) => void }>;
      const container = Array.isArray(added) ? added[0]! : (added as unknown as {
        addStyle: (s: Record<string, string>) => void;
      });
      container.addStyle({ display: "flex" });
      api.editor.select(container as unknown);
    });

    // The ToggleGroup for flex-direction renders four items
    const rowButton = page.locator('[data-testid="oc-style-flex-direction-row"]');
    await expect(rowButton).toBeVisible();
    const columnButton = page.locator('[data-testid="oc-style-flex-direction-column"]');
    await columnButton.click();

    const frame = page.frameLocator('iframe[class*="gjs-frame"]');
    const container = frame.locator('[data-testid="flex-host"]');
    const direction = await container.evaluate((el) => window.getComputedStyle(el).flexDirection);
    expect(direction).toBe("column");
  });
});
