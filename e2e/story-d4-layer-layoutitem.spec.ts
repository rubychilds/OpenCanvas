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

test.describe("D.4: Layer section + contextual Layout Item (per ADR-0003)", () => {
  test("Layer section: visibility toggle writes display:none and back", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="vis-host">v</div>`);

    const btn = page.locator('[data-testid="oc-ins-layer-visibility"]');
    await expect(btn).toBeVisible();
    await btn.click();
    expect(await readSelectedStyle(page, "display")).toBe("none");

    await btn.click();
    expect(await readSelectedStyle(page, "display")).toBe("");
  });

  test("Layer section: opacity input writes the fractional CSS opacity", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="op-host">o</div>`);

    // NumberInput's testid lands on the <input> element directly.
    const input = page.locator('[data-testid="oc-ins-layer-opacity"]');
    await input.click();
    await input.fill("50");
    await input.blur();

    expect(await readSelectedStyle(page, "opacity")).toBe("0.5");
  });

  test("Layer section: blend-mode select writes mix-blend-mode", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="bm-host">b</div>`);

    await page.locator('[data-testid="oc-ins-layer-blend-mode"]').selectOption("multiply");
    expect(await readSelectedStyle(page, "mix-blend-mode")).toBe("multiply");
  });

  test("Layer section: lock toggle sets data-oc-locked attribute", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="lock-host">l</div>`);

    await page.locator('[data-testid="oc-ins-layer-lock"]').click();
    const locked = await page.evaluate(() => {
      const ed = (window as unknown as {
        __opencanvas: { editor: { getSelected: () => { getAttributes: () => Record<string, string> } } };
      }).__opencanvas.editor;
      return ed.getSelected().getAttributes()["data-oc-locked"];
    });
    expect(locked).toBe("true");
  });

  test("Layout Item section: hidden when parent is not a flex/grid container", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="not-layout-child">x</div>`);
    await expect(page.locator('[data-testid="oc-ins-align-self"]')).toHaveCount(0);
  });

  test("Layout Item section: appears when parent has display:flex, writes align-self + flex-grow", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    // Add a flex container + child; select the child; verify parent context
    // triggers Layout Item visibility.
    await page.evaluate(() => {
      const api = (window as unknown as {
        __opencanvas: {
          addHtml: (h: string) => unknown;
          editor: { select: (c: unknown) => void };
        };
      }).__opencanvas;
      const wrapper = api.addHtml(
        `<div data-testid="li-parent"><span data-testid="li-child">c</span></div>`,
      ) as Array<{
        addStyle: (s: Record<string, string>) => void;
        components: () => { toArray: () => Array<unknown> };
      }>;
      const parent = Array.isArray(wrapper) ? wrapper[0]! : wrapper;
      parent.addStyle({ display: "flex" });
      const child = parent.components().toArray()[0]!;
      api.editor.select(child);
    });

    // Layout Item section is visible
    await expect(page.locator('[data-testid="oc-ins-align-self"]')).toBeVisible();

    // Align-self writes through — aria-label on the ToggleGroupItem is the
    // stable selector (Radix doesn't preserve the `value` prop as a DOM attr).
    await page.locator('[data-testid="oc-ins-align-self"] [aria-label="Center"]').click();
    expect(await readSelectedStyle(page, "align-self")).toBe("center");

    // Flex-grow — scrub to 1 via the input
    const grow = page.locator('[data-testid="oc-ins-flex-grow"]');
    await grow.click();
    await grow.fill("1");
    await grow.blur();
    expect(await readSelectedStyle(page, "flex-grow")).toBe("1");
  });
});
