import { test, expect } from "./fixtures";

const EXPECTED = {
  Layout: ["div", "section", "header", "footer", "nav", "main"],
  Typography: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a"],
  Form: ["form", "input", "textarea", "select", "button", "label"],
  Media: ["img", "video"],
} as const;

test.describe("Story 1.4: block palette", () => {
  test("exposes all four categories with every expected block id", async ({
    freshApp: page,
  }) => {
    const categoryMap = await page.evaluate(() => {
      type Block = {
        id?: string;
        getId?: () => string;
        getCategoryLabel?: () => string;
      };
      const ed = (window as unknown as { __opencanvas: { editor: unknown } }).__opencanvas
        .editor as {
        BlockManager: { getAll: () => Block[] };
      };
      const blocks = ed.BlockManager.getAll();
      const out: Record<string, string[]> = {};
      for (const b of blocks) {
        const category = b.getCategoryLabel?.() ?? "Uncategorized";
        const id = b.getId?.() ?? b.id ?? "";
        (out[category] ||= []).push(id);
      }
      return out;
    });

    for (const [cat, ids] of Object.entries(EXPECTED)) {
      expect(categoryMap[cat], `category ${cat} present`).toBeDefined();
      for (const id of ids) {
        expect(categoryMap[cat], `${cat}/${id} present`).toContain(id);
      }
    }
  });

  test("programmatically inserting a block adds it to the canvas", async ({
    freshApp: page,
  }) => {
    await page.evaluate(() => {
      const ed = (window as unknown as { __opencanvas: { editor: unknown } }).__opencanvas
        .editor as {
        BlockManager: { get: (id: string) => { get: (k: string) => unknown } };
        addComponents: (html: string) => void;
      };
      const block = ed.BlockManager.get("button");
      const content = block.get("content") as string;
      ed.addComponents(content);
    });

    const html = await page.evaluate(() =>
      (window as unknown as { __opencanvas: { getHtml: () => string } }).__opencanvas.getHtml(),
    );
    expect(html).toContain("<button");
    expect(html).toContain("bg-blue-600");
  });

  test("button block renders with Tailwind defaults in the iframe", async ({
    freshApp: page,
  }) => {
    await page.evaluate(() => {
      const api = (window as unknown as { __opencanvas: { addHtml: (h: string) => unknown } })
        .__opencanvas;
      api.addHtml(
        `<button class="px-4 py-2 bg-blue-600 text-white rounded-md" data-testid="oc-btn">Ping</button>`,
      );
    });

    // Wait for Tailwind (CDN) to inject computed styles inside the GrapesJS iframe.
    const frame = page.frameLocator('iframe[class*="gjs-frame"]');
    const button = frame.locator('[data-testid="oc-btn"]');
    await expect(button).toBeVisible();

    const bg = await button.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    // Tailwind v4 emits OKLCH by default for `bg-blue-600`; older engines emit RGB.
    // Either way the point is the class resolved to *some* color, not transparent.
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
    expect(bg).not.toBe("transparent");
    expect(bg).toMatch(/^(rgb|oklch|oklab|hsl|color)\(/);
  });

  test("dragging a block tile to the canvas inserts the component", async ({
    freshApp: page,
  }) => {
    // Sanity: canvas starts empty (no <section> from a prior test).
    const beforeCount = await page.evaluate(() => {
      const html = (window as unknown as { __opencanvas: { getHtml: () => string } })
        .__opencanvas.getHtml();
      return (html.match(/<section/g) ?? []).length;
    });

    // The left panel defaults to the Layers tab post-Phase B; switch to Blocks
    // before exercising the block palette.
    await page.getByRole("tab", { name: "Blocks" }).click();
    const blockBtn = page.locator('[data-block-id="section"]').first();
    // BlocksProvider populates mapCategoryBlocks asynchronously after the
    // editor's `block:custom` event — give it a moment.
    await expect(blockBtn).toBeVisible({ timeout: 10_000 });
    const iframeEl = page.locator('iframe[class*="gjs-frame"]').first();
    await expect(iframeEl).toBeVisible();

    const blockBox = await blockBtn.boundingBox();
    const iframeBox = await iframeEl.boundingBox();
    if (!blockBox || !iframeBox) throw new Error("layout not measured");

    // Real pointer drag: GrapesJS's BlockManager listens for pointermove on the
    // canvas iframe once dragStart fires (wired in BlocksPanel.onPointerDown),
    // then commits the component on pointerup over the canvas.
    await page.mouse.move(blockBox.x + blockBox.width / 2, blockBox.y + blockBox.height / 2);
    await page.mouse.down();
    // Multi-step move so GrapesJS picks up enough pointermove events to count
    // this as a drag rather than a stationary click.
    await page.mouse.move(
      iframeBox.x + iframeBox.width / 2,
      iframeBox.y + iframeBox.height / 2,
      { steps: 25 },
    );
    await page.mouse.up();

    // Poll: the drop is async — GrapesJS commits on the next tick.
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const html = (window as unknown as { __opencanvas: { getHtml: () => string } })
              .__opencanvas.getHtml();
            return (html.match(/<section/g) ?? []).length;
          }),
        { timeout: 5_000 },
      )
      .toBe(beforeCount + 1);
  });

  test("click-to-insert still works after the pointer-event wiring", async ({
    freshApp: page,
  }) => {
    // The drag handlers attach onPointerDown / onPointerUp; verify these don't
    // suppress the synthetic click that follows a press-and-release in place.
    const beforeHtml = await page.evaluate(() =>
      (window as unknown as { __opencanvas: { getHtml: () => string } }).__opencanvas.getHtml(),
    );

    await page.getByRole("tab", { name: "Blocks" }).click();
    const blockBtn = page.locator('[data-block-id="header"]').first();
    await expect(blockBtn).toBeVisible({ timeout: 10_000 });
    await blockBtn.click();

    const afterHtml = await page.evaluate(() =>
      (window as unknown as { __opencanvas: { getHtml: () => string } }).__opencanvas.getHtml(),
    );
    const before = (beforeHtml.match(/<header/g) ?? []).length;
    const after = (afterHtml.match(/<header/g) ?? []).length;
    expect(after).toBe(before + 1);
  });
});
