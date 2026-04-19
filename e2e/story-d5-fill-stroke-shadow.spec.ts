import { test, expect, type Page } from "@playwright/test";
import { test as base } from "./fixtures";

async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { __opencanvas?: unknown }).__opencanvas !== "undefined",
    undefined,
    { timeout: 10_000 },
  );
}

async function addAndSelect(page: Page, html: string): Promise<void> {
  await page.evaluate((h) => {
    const api = (window as unknown as {
      __opencanvas: { addHtml: (s: string) => unknown; editor: { select: (c: unknown) => void } };
    }).__opencanvas;
    const added = api.addHtml(h) as Array<unknown>;
    api.editor.select(Array.isArray(added) ? (added[0] as unknown) : (added as unknown));
  }, html);
}

async function readSelectedStyle(page: Page, key: string): Promise<string> {
  return page.evaluate((k) => {
    const ed = (window as unknown as {
      __opencanvas: { editor: { getSelected: () => { getStyle: () => Record<string, string> } } };
    }).__opencanvas.editor;
    return ed.getSelected().getStyle()[k] ?? "";
  }, key);
}

async function setSelectedStyle(
  page: Page,
  styles: Record<string, string>,
): Promise<void> {
  await page.evaluate((s) => {
    const ed = (window as unknown as {
      __opencanvas: { editor: { getSelected: () => { addStyle: (s: Record<string, string>) => void } } };
    }).__opencanvas.editor;
    ed.getSelected().addStyle(s);
  }, styles);
}

base.describe("D.5: Fill as a stack + Stroke + Shadow (per ADR-0003)", () => {
  base("Fill single-layer writes background-color", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="fill-single">s</div>`);

    // Seed a fill layer via the add button, then edit its hex input.
    await page.locator('[data-testid="oc-ins-fill-add"]').click();
    const hex = page.locator('[data-testid="oc-ins-fill-row-0-color-hex"]');
    await hex.click();
    await hex.fill("ff8800");
    await hex.press("Enter");

    expect(await readSelectedStyle(page, "background-color")).toBe("#ff8800");
    expect(await readSelectedStyle(page, "background-image")).toBe("");
  });

  base("Fill multi-layer writes layered linear-gradient() in background-image", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="fill-multi">m</div>`);

    await page.locator('[data-testid="oc-ins-fill-add"]').click();
    const first = page.locator('[data-testid="oc-ins-fill-row-0-color-hex"]');
    await first.click();
    await first.fill("ff0000");
    await first.press("Enter");

    // Second layer — newly added layer becomes row 0; the previous red drops to row 1.
    await page.locator('[data-testid="oc-ins-fill-add"]').click();
    const newTop = page.locator('[data-testid="oc-ins-fill-row-0-color-hex"]');
    await newTop.click();
    await newTop.fill("00aaff");
    await newTop.press("Enter");

    const bgImage = await readSelectedStyle(page, "background-image");
    expect(bgImage).toContain("linear-gradient");
    expect(bgImage.toLowerCase()).toContain("#00aaff");
    expect(bgImage.toLowerCase()).toContain("#ff0000");
    // Background-color is cleared once we have >1 layer.
    expect(await readSelectedStyle(page, "background-color")).toBe("");
  });

  base("Fill hide toggle excludes a layer from the compiled CSS", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="fill-hide">h</div>`);

    await page.locator('[data-testid="oc-ins-fill-add"]').click();
    const first = page.locator('[data-testid="oc-ins-fill-row-0-color-hex"]');
    await first.click();
    await first.fill("ff0000");
    await first.press("Enter");

    await page.locator('[data-testid="oc-ins-fill-add"]').click();
    const newTop = page.locator('[data-testid="oc-ins-fill-row-0-color-hex"]');
    await newTop.click();
    await newTop.fill("0000ff");
    await newTop.press("Enter");

    // Hide the top (blue) layer — expect red alone remains.
    await page.locator('[data-testid="oc-ins-fill-row-0-visibility"]').click();

    expect(await readSelectedStyle(page, "background-color")).toBe("#ff0000");
    expect(await readSelectedStyle(page, "background-image")).toBe("");
  });

  base("Stroke writes compound `border: <w> <style> <color>`", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="stroke-host">s</div>`);

    const hex = page.locator('[data-testid="oc-ins-stroke-color-hex"]');
    await hex.click();
    await hex.fill("ff0000");
    await hex.press("Enter");

    const width = page.locator('[data-testid="oc-ins-stroke-width"]');
    await width.click();
    await width.fill("2");
    await width.blur();

    await page.locator('[data-testid="oc-ins-stroke-style"]').selectOption("dashed");

    const border = await readSelectedStyle(page, "border");
    expect(border).toContain("2px");
    expect(border).toContain("dashed");
    expect(border.toLowerCase()).toContain("#ff0000");
  });

  base("Shadow single entry writes box-shadow; second entry joins with comma", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="shadow-host">h</div>`);

    await page.locator('[data-testid="oc-ins-shadow-add"]').click();

    // Tweak X / Y / Blur on the first row to known values.
    const x0 = page.locator('[data-testid="oc-ins-shadow-row-0-x"]');
    await x0.click();
    await x0.fill("4");
    await x0.blur();
    const y0 = page.locator('[data-testid="oc-ins-shadow-row-0-y"]');
    await y0.click();
    await y0.fill("6");
    await y0.blur();
    const b0 = page.locator('[data-testid="oc-ins-shadow-row-0-blur"]');
    await b0.click();
    await b0.fill("12");
    await b0.blur();

    let bs = await readSelectedStyle(page, "box-shadow");
    expect(bs).toContain("4px 6px 12px");

    // Add a second shadow — it lands on top (row 0), previous shadow drops to row 1.
    await page.locator('[data-testid="oc-ins-shadow-add"]').click();
    const x1 = page.locator('[data-testid="oc-ins-shadow-row-0-x"]');
    await x1.click();
    await x1.fill("10");
    await x1.blur();

    bs = await readSelectedStyle(page, "box-shadow");
    expect(bs.split(/,(?![^()]*\))/).length).toBe(2);
    expect(bs).toContain("10px");
    expect(bs).toContain("4px 6px 12px");
  });

  base("Shadow hide toggle removes entry from compiled box-shadow", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="shadow-hide">h</div>`);

    await page.locator('[data-testid="oc-ins-shadow-add"]').click();
    await page.locator('[data-testid="oc-ins-shadow-add"]').click();
    // Hide the top row
    await page.locator('[data-testid="oc-ins-shadow-row-0-visibility"]').click();

    const bs = await readSelectedStyle(page, "box-shadow");
    // One visible entry means no comma at top level.
    expect(bs.split(/,(?![^()]*\))/).length).toBe(1);
  });

  base("Fill 3-layer stack round-trips: parse(compile(stack)) is stable", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="rt-host">r</div>`);

    // Build a 3-layer stack via the UI add button.
    const colours = ["ff0000", "00ff00", "0000ff"];
    for (const c of colours) {
      await page.locator('[data-testid="oc-ins-fill-add"]').click();
      const hex = page.locator('[data-testid="oc-ins-fill-row-0-color-hex"]');
      await hex.click();
      await hex.fill(c);
      await hex.press("Enter");
    }

    // All three rows are present.
    await expect(page.locator('[data-testid="oc-ins-fill-row-0-color-hex"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-ins-fill-row-1-color-hex"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-ins-fill-row-2-color-hex"]')).toBeVisible();

    // All three colours made it into the compiled background-image.
    const bgImage = await readSelectedStyle(page, "background-image");
    expect(bgImage.toLowerCase()).toContain("#ff0000");
    expect(bgImage.toLowerCase()).toContain("#00ff00");
    expect(bgImage.toLowerCase()).toContain("#0000ff");
  });

  base("Fill reads back a pre-existing 3-layer background-image into 3 rows", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="rt-read">r</div>`);

    // Seed the component's CSS directly as if it had come from .opencanvas.json
    // reload — the FillSection must round-trip the written shape back into rows.
    await setSelectedStyle(page, {
      "background-image":
        "linear-gradient(#ff0000, #ff0000), linear-gradient(#00ff00, #00ff00), linear-gradient(#0000ff, #0000ff)",
    });

    await expect(page.locator('[data-testid="oc-ins-fill-row-0-color-hex"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-ins-fill-row-1-color-hex"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-ins-fill-row-2-color-hex"]')).toBeVisible();
  });
});

// Preserve the imported `test` / `expect` from @playwright/test so tsc doesn't
// emit "imported but unused" when the file is reviewed in isolation.
void test;
void expect;
