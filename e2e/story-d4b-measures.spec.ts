import { test, expect } from "./fixtures";

async function waitForEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { __designjs?: unknown }).__designjs !== "undefined",
    undefined,
    { timeout: 10_000 },
  );
}

async function addAndSelect(
  page: import("@playwright/test").Page,
  html: string,
): Promise<void> {
  await page.evaluate((h) => {
    const api = (window as unknown as {
      __designjs: { addHtml: (s: string) => unknown; editor: { select: (c: unknown) => void } };
    }).__designjs;
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
      __designjs: { editor: { getSelected: () => { getStyle: () => Record<string, string> } } };
    }).__designjs.editor;
    return ed.getSelected().getStyle()[k] ?? "";
  }, key);
}

async function fill(
  page: import("@playwright/test").Page,
  testId: string,
  value: string,
): Promise<void> {
  const input = page.locator(`[data-testid="${testId}"]`);
  await input.click();
  await input.fill(value);
  await input.blur();
}

test.describe("D.4b: Measures section", () => {
  test("W/H writes width and height", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="m-wh">w</div>`);

    await fill(page, "oc-ins-width", "200");
    await fill(page, "oc-ins-height", "120");

    expect(await readSelectedStyle(page, "width")).toBe("200px");
    expect(await readSelectedStyle(page, "height")).toBe("120px");
  });

  test("aspect lock captures the ratio and proportionally scales H when W changes", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="m-lock">l</div>`);

    // Establish a known starting ratio of 2:1 (W=200, H=100).
    await fill(page, "oc-ins-width", "200");
    await fill(page, "oc-ins-height", "100");
    expect(await readSelectedStyle(page, "width")).toBe("200px");
    expect(await readSelectedStyle(page, "height")).toBe("100px");

    // Engage the aspect lock at 2:1.
    const lock = page.locator('[data-testid="oc-ins-aspect-lock"]');
    await lock.click();
    await expect(lock).toHaveAttribute("aria-pressed", "true");

    // Doubling W should double H via the captured 2:1 ratio.
    await fill(page, "oc-ins-width", "400");
    expect(await readSelectedStyle(page, "width")).toBe("400px");
    expect(await readSelectedStyle(page, "height")).toBe("200px");

    // And vice versa — halving H should halve W.
    await fill(page, "oc-ins-height", "100");
    expect(await readSelectedStyle(page, "height")).toBe("100px");
    expect(await readSelectedStyle(page, "width")).toBe("200px");
  });

  test("aspect lock leaves H alone after toggling off", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="m-unlock">u</div>`);

    await fill(page, "oc-ins-width", "100");
    await fill(page, "oc-ins-height", "100");

    const lock = page.locator('[data-testid="oc-ins-aspect-lock"]');
    await lock.click(); // engage
    await lock.click(); // disengage

    await fill(page, "oc-ins-width", "300");
    expect(await readSelectedStyle(page, "width")).toBe("300px");
    expect(await readSelectedStyle(page, "height")).toBe("100px"); // untouched
  });

  test("X/Y still write left/top", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="m-xy">xy</div>`);

    await fill(page, "oc-ins-x", "42");
    await fill(page, "oc-ins-y", "84");

    expect(await readSelectedStyle(page, "left")).toBe("42px");
    expect(await readSelectedStyle(page, "top")).toBe("84px");
  });

  test("Rotation dial numeric input writes transform: rotate(Ndeg)", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="m-rot">r</div>`);

    await fill(page, "oc-ins-rotate", "45");
    expect(await readSelectedStyle(page, "transform")).toBe("rotate(45deg)");

    // Resetting to 0 clears the transform property entirely.
    await fill(page, "oc-ins-rotate", "0");
    expect(await readSelectedStyle(page, "transform")).toBe("");
  });

  test("Radius unified writes border-radius shorthand", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="m-r-all">r</div>`);

    await fill(page, "oc-ins-radius-all", "12");
    expect(await readSelectedStyle(page, "border-radius")).toBe("12px");
  });

  test("Radius mode toggle reveals the four per-corner inputs", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="m-r-toggle">r</div>`);

    // Per-corner inputs are not present in unified mode.
    await expect(page.locator('[data-testid="oc-ins-radius-tl"]')).toHaveCount(0);

    const mode = page.locator('[data-testid="oc-ins-radius-mode"]');
    await mode.click();
    await expect(mode).toHaveAttribute("aria-pressed", "true");

    // All four per-corner inputs visible after the toggle.
    for (const id of [
      "oc-ins-radius-tl",
      "oc-ins-radius-tr",
      "oc-ins-radius-bl",
      "oc-ins-radius-br",
    ]) {
      await expect(page.locator(`[data-testid="${id}"]`)).toBeVisible();
    }
    // Unified input is gone.
    await expect(page.locator('[data-testid="oc-ins-radius-all"]')).toHaveCount(0);
  });

  test("Radius per-corner edits write the four properties and clear the shorthand", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="m-r-corners">r</div>`);

    // Start with a unified radius; per-corner edits should clear it.
    await fill(page, "oc-ins-radius-all", "8");
    expect(await readSelectedStyle(page, "border-radius")).toBe("8px");

    await page.locator('[data-testid="oc-ins-radius-mode"]').click();

    await fill(page, "oc-ins-radius-tl", "1");
    await fill(page, "oc-ins-radius-tr", "2");
    await fill(page, "oc-ins-radius-bl", "3");
    await fill(page, "oc-ins-radius-br", "4");

    expect(await readSelectedStyle(page, "border-top-left-radius")).toBe("1px");
    expect(await readSelectedStyle(page, "border-top-right-radius")).toBe("2px");
    expect(await readSelectedStyle(page, "border-bottom-left-radius")).toBe("3px");
    expect(await readSelectedStyle(page, "border-bottom-right-radius")).toBe("4px");
    expect(await readSelectedStyle(page, "border-radius")).toBe("");
  });
});
