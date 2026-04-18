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
});
