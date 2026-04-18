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

test.describe("Story 5.1: artboards panel (rename + delete)", () => {
  test("Artboards tab lists the default Desktop artboard", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await page.getByRole("tab", { name: "Artboards" }).click();
    const rows = page.locator('[data-testid^="oc-artboard-row-"]');
    await expect(rows).toHaveCount(1);
    await expect(rows.first().getByText(/Desktop/i)).toBeVisible();
  });

  test("double-click artboard name, type a new name, press Enter to rename", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await page.getByRole("tab", { name: "Artboards" }).click();

    const nameButton = page.locator('[data-testid^="oc-artboard-name-"]').first();
    await nameButton.dblclick();

    const input = page.locator('[data-testid="oc-artboard-rename-input"]');
    await expect(input).toBeVisible();
    await input.fill("Home Page");
    await input.press("Enter");

    await expect(page.locator('[data-testid^="oc-artboard-name-"]').first()).toContainText("Home Page");

    // Persisted on the frame model
    const model = await page.evaluate(() => {
      const w = window as unknown as {
        __opencanvas: { editor: { Canvas: { getFrames(): FrameLike[] } } };
      };
      const frame = w.__opencanvas.editor.Canvas.getFrames()[0]!;
      return String((frame as unknown as { get: (k: string) => unknown }).get("name"));
    });
    expect(model).toBe("Home Page");
  });

  test("adding a tablet artboard shows two rows; delete removes one (one always remains)", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    // Preset buttons moved from the top nav; use the editor API directly.
    await page.evaluate(() => {
      const edt = (window as unknown as { __opencanvas: { editor: unknown } }).__opencanvas.editor as {
        Canvas: { addFrame: (props: unknown) => unknown };
      };
      edt.Canvas.addFrame({ name: "Tablet", width: 768, height: 1024, x: 1520, y: 0 });
    });
    await page.getByRole("tab", { name: "Artboards" }).click();

    await expect(page.locator('[data-testid^="oc-artboard-row-"]')).toHaveCount(2);

    // Delete the first — both delete buttons should enable since count > 1
    await page
      .locator('[data-testid^="oc-artboard-row-"]')
      .first()
      .hover();
    await page.locator('[data-testid^="oc-artboard-delete-"]').first().click();
    await expect(page.locator('[data-testid^="oc-artboard-row-"]')).toHaveCount(1);

    // Last one's delete button is disabled
    await page.locator('[data-testid^="oc-artboard-row-"]').first().hover();
    await expect(page.locator('[data-testid^="oc-artboard-delete-"]').first()).toBeDisabled();
  });
});
