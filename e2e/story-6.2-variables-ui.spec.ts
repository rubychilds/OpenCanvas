import { test, expect } from "./fixtures";

async function waitForEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { __designjs?: unknown }).__designjs !== "undefined",
    undefined,
    { timeout: 10_000 },
  );
}

async function readRootVar(
  page: import("@playwright/test").Page,
  key: string,
): Promise<string> {
  return page.evaluate((k) => {
    const ed = (window as unknown as {
      __designjs: { editor: { Canvas: { getDocument: () => Document } } };
    }).__designjs.editor;
    const root = ed.Canvas.getDocument()?.documentElement;
    return (root?.style.getPropertyValue(k) ?? "").trim();
  }, key);
}

test.describe("Story 6.2 UI: Variables popover (design tokens editor)", () => {
  test("popover opens from the Topbar trigger and shows the empty state", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await page.locator('[data-testid="oc-variables-trigger"]').click();
    await expect(page.locator('[data-testid="oc-variables-popover"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-variables-list"]')).toContainText(
      "No design tokens defined",
    );
  });

  test("adding a variable writes it to the iframe :root and shows in the list", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await page.locator('[data-testid="oc-variables-trigger"]').click();

    await page.locator('[data-testid="oc-variables-new-key"]').fill("--brand-primary");
    await page.locator('[data-testid="oc-variables-new-value"]').fill("#ff3366");
    await page.locator('[data-testid="oc-variables-add"]').click();

    await expect(page.locator('[data-testid="oc-variables-row"][data-var-key="--brand-primary"]'))
      .toBeVisible();
    expect(await readRootVar(page, "--brand-primary")).toBe("#ff3366");
  });

  test("adding a variable without the `--` prefix auto-prefixes", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await page.locator('[data-testid="oc-variables-trigger"]').click();
    await page.locator('[data-testid="oc-variables-new-key"]').fill("space-4");
    await page.locator('[data-testid="oc-variables-new-value"]').fill("1rem");
    await page.locator('[data-testid="oc-variables-add"]').click();
    await expect(page.locator('[data-testid="oc-variables-row"][data-var-key="--space-4"]'))
      .toBeVisible();
    expect(await readRootVar(page, "--space-4")).toBe("1rem");
  });

  test("editing a value commits on blur and re-applies to :root", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await page.locator('[data-testid="oc-variables-trigger"]').click();

    await page.locator('[data-testid="oc-variables-new-key"]').fill("--accent");
    await page.locator('[data-testid="oc-variables-new-value"]').fill("#00ff00");
    await page.locator('[data-testid="oc-variables-add"]').click();

    const row = page.locator(
      '[data-testid="oc-variables-row"][data-var-key="--accent"] [data-testid="oc-variables-value"]',
    );
    await row.click();
    await row.fill("#123456");
    await row.blur();

    expect(await readRootVar(page, "--accent")).toBe("#123456");
  });

  test("delete button removes the variable from :root and the list", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await page.locator('[data-testid="oc-variables-trigger"]').click();

    await page.locator('[data-testid="oc-variables-new-key"]').fill("--ephemeral");
    await page.locator('[data-testid="oc-variables-new-value"]').fill("blue");
    await page.locator('[data-testid="oc-variables-add"]').click();
    expect(await readRootVar(page, "--ephemeral")).toBe("blue");

    await page
      .locator(
        '[data-testid="oc-variables-row"][data-var-key="--ephemeral"] [data-testid="oc-variables-delete"]',
      )
      .click();

    await expect(
      page.locator('[data-testid="oc-variables-row"][data-var-key="--ephemeral"]'),
    ).toHaveCount(0);
    expect(await readRootVar(page, "--ephemeral")).toBe("");
  });

  test("count badge shows total variables and updates live", async ({ freshApp: page }) => {
    await waitForEditor(page);

    // Empty state: no badge rendered.
    await expect(page.locator('[data-testid="oc-variables-count"]')).toHaveCount(0);

    await page.locator('[data-testid="oc-variables-trigger"]').click();
    for (const [k, v] of [
      ["--one", "1px"],
      ["--two", "2px"],
      ["--three", "3px"],
    ] as const) {
      await page.locator('[data-testid="oc-variables-new-key"]').fill(k);
      await page.locator('[data-testid="oc-variables-new-value"]').fill(v);
      await page.locator('[data-testid="oc-variables-add"]').click();
    }
    // Close popover so the trigger badge is checkable.
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-testid="oc-variables-count"]')).toHaveText("3");
  });

  test("add button is disabled when key or value is empty", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await page.locator('[data-testid="oc-variables-trigger"]').click();
    const add = page.locator('[data-testid="oc-variables-add"]');
    await expect(add).toBeDisabled();

    await page.locator('[data-testid="oc-variables-new-key"]').fill("--foo");
    await expect(add).toBeDisabled();

    await page.locator('[data-testid="oc-variables-new-value"]').fill("bar");
    await expect(add).toBeEnabled();
  });
});
