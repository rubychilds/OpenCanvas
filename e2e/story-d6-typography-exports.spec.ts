import { test, expect } from "./fixtures";

async function waitForEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { __opencanvas?: unknown }).__opencanvas !== "undefined",
    undefined,
    { timeout: 10_000 },
  );
}

async function addAndSelect(page: import("@playwright/test").Page, html: string): Promise<void> {
  await page.evaluate((h) => {
    const api = (window as unknown as {
      __opencanvas: { addHtml: (s: string) => unknown; editor: { select: (c: unknown) => void } };
    }).__opencanvas;
    const added = api.addHtml(h) as Array<unknown>;
    api.editor.select(Array.isArray(added) ? (added[0] as unknown) : (added as unknown));
  }, html);
}

async function readSelectedStyle(
  page: import("@playwright/test").Page,
  key: string,
): Promise<string> {
  return page.evaluate((k) => {
    const ed = (window as unknown as {
      __opencanvas: { editor: { getSelected: () => { getStyle: () => Record<string, string> } } };
    }).__opencanvas.editor;
    return ed.getSelected().getStyle()[k] ?? "";
  }, key);
}

test.describe("D.6: Typography section + Exports section", () => {
  test("Typography: hidden for non-text tags (div)", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="not-text">x</div>`);
    await expect(page.locator('[data-testid="oc-ins-font-family"]')).toHaveCount(0);
  });

  test("Typography: visible for p and writes font-size + weight + align", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<p data-testid="text-host">hello</p>`);

    await expect(page.locator('[data-testid="oc-ins-font-family"]')).toBeVisible();

    const size = page.locator('[data-testid="oc-ins-font-size"]');
    await size.click();
    await size.fill("20");
    await size.blur();
    expect(await readSelectedStyle(page, "font-size")).toBe("20px");

    await page.locator('[data-testid="oc-ins-font-weight"]').selectOption("700");
    expect(await readSelectedStyle(page, "font-weight")).toBe("700");

    await page.locator('[data-testid="oc-ins-text-align"] [aria-label="Center"]').click();
    expect(await readSelectedStyle(page, "text-align")).toBe("center");
  });

  test("Typography: visible for h2 and writes line-height + text-transform", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<h2 data-testid="heading-host">Title</h2>`);

    const lh = page.locator('[data-testid="oc-ins-line-height"]');
    await lh.click();
    await lh.fill("1.4");
    await lh.blur();
    expect(await readSelectedStyle(page, "line-height")).toBe("1.4");

    await page.locator('[data-testid="oc-ins-text-transform"]').selectOption("uppercase");
    expect(await readSelectedStyle(page, "text-transform")).toBe("uppercase");
  });

  test("Exports: preview renders JSX and mode toggle switches to inline", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="exp-host" style="color: red">hi</div>`);

    const preview = page.locator('[data-testid="oc-ins-exports-preview"]');
    await expect(preview).toContainText("export default function Component");
    await expect(preview).toContainText("<div");

    await page.locator('[data-testid="oc-ins-exports-mode"] [aria-label="Inline"]').click();
    // In inline mode the style object is present because every CSS prop flows through.
    await expect(preview).toContainText("style={{");
    await expect(preview).toContainText("color");
  });

  test("Exports: Copy HTML writes to clipboard", async ({ freshApp: page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await waitForEditor(page);
    await addAndSelect(page, `<span data-testid="copy-host">copyme</span>`);

    await page.locator('[data-testid="oc-ins-exports-copy-html"]').click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain("copyme");
    expect(clip).toContain("<span");
  });
});
