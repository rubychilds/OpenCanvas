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

test.describe("D.7: Effects section (per ADR-0003 #9)", () => {
  test("blur input writes filter: blur(Npx) and clears on zero", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="blur-host">x</div>`);

    const input = page.locator('[data-testid="oc-ins-blur"]');
    await input.click();
    await input.fill("8");
    await input.blur();
    expect(await readSelectedStyle(page, "filter")).toBe("blur(8px)");

    await input.click();
    await input.fill("0");
    await input.blur();
    expect(await readSelectedStyle(page, "filter")).toBe("");
  });

  test("backdrop-blur writes backdrop-filter: blur(Npx) independently", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await addAndSelect(page, `<div data-testid="bg-blur-host">x</div>`);

    const bgBlur = page.locator('[data-testid="oc-ins-backdrop-blur"]');
    await bgBlur.click();
    await bgBlur.fill("12");
    await bgBlur.blur();
    expect(await readSelectedStyle(page, "backdrop-filter")).toBe("blur(12px)");
    expect(await readSelectedStyle(page, "filter")).toBe("");
  });

  test("blur preserves other filter functions (compound filter round-trip)", async ({
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
      const added = api.addHtml(`<div data-testid="compound-host">x</div>`) as Array<{
        addStyle: (s: Record<string, string>) => void;
      }>;
      const node = Array.isArray(added) ? added[0]! : added;
      node.addStyle({ filter: "brightness(1.2) contrast(1.1)" });
      api.editor.select(node);
    });

    const input = page.locator('[data-testid="oc-ins-blur"]');
    await input.click();
    await input.fill("4");
    await input.blur();

    const filter = await readSelectedStyle(page, "filter");
    expect(filter).toContain("brightness(1.2)");
    expect(filter).toContain("contrast(1.1)");
    expect(filter).toContain("blur(4px)");
  });
});
