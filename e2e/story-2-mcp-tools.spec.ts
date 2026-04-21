import { test, expect } from "./fixtures";

interface ComponentNode {
  id: string;
  type: string;
  tagName?: string;
  classes: string[];
  children: ComponentNode[];
}

/**
 * Every tool is exercised through the real bridge (127.0.0.1:29170):
 *   mcp peer → WS → bridge → WS → browser tool handler → response path back.
 */
test.describe("Story 2.x: MCP tools (end-to-end via bridge)", () => {
  test("ping responds with { pong: true, at: <timestamp> }", async ({ mcp }) => {
    const result = await mcp.call<{ pong: boolean; at: number }>("ping", {});
    expect(result.pong).toBe(true);
    expect(typeof result.at).toBe("number");
    expect(result.at).toBeGreaterThan(0);
  });

  // ── Story 2.3 ────────────────────────────────────────────────────────────
  test("get_tree returns recursive JSON with stable component IDs", async ({
    freshApp: page,
    mcp,
  }) => {
    await page.evaluate(() =>
      (window as unknown as { __designjs: { addHtml: (h: string) => unknown } }).__designjs.addHtml(
        `<section class="p-4"><h1 class="text-2xl">hello</h1><p>world</p></section>`,
      ),
    );

    const tree = await mcp.call<{ root: ComponentNode | null }>("get_tree", {});
    expect(tree.root).not.toBeNull();
    const wrapper = tree.root!;
    expect(wrapper.children.length).toBeGreaterThan(0);

    const section = wrapper.children[0]!;
    expect(section.tagName).toBe("section");
    expect(section.classes).toContain("p-4");
    expect(section.children.length).toBe(2);

    const heading = section.children[0]!;
    expect(heading.tagName).toBe("h1");
    expect(heading.classes).toContain("text-2xl");

    // IDs stable across calls
    const tree2 = await mcp.call<{ root: ComponentNode | null }>("get_tree", {});
    expect(tree2.root!.children[0]!.id).toBe(section.id);
  });

  test("get_tree respects depth parameter", async ({ freshApp: page, mcp }) => {
    await page.evaluate(() =>
      (window as unknown as { __designjs: { addHtml: (h: string) => unknown } }).__designjs.addHtml(
        `<div class="p-4"><div class="p-2"><span>deep</span></div></div>`,
      ),
    );

    const shallow = await mcp.call<{ root: ComponentNode }>("get_tree", { depth: 1 });
    // depth 1 → wrapper + its direct children, but grandchildren are empty arrays
    const topLevel = shallow.root.children[0]!;
    expect(topLevel.children).toEqual([]);
  });

  test("get_tree on empty canvas returns a wrapper with no children", async ({ mcp }) => {
    const tree = await mcp.call<{ root: ComponentNode | null }>("get_tree", {});
    expect(tree.root).not.toBeNull();
    expect(tree.root!.children).toEqual([]);
  });

  // ── Story 2.4 ────────────────────────────────────────────────────────────
  test("get_html returns clean HTML without GrapesJS wrapper markup", async ({
    freshApp: page,
    mcp,
  }) => {
    await page.evaluate(() =>
      (window as unknown as { __designjs: { addHtml: (h: string) => unknown } }).__designjs.addHtml(
        `<div class="card"><h2>Title</h2><p>Body</p></div>`,
      ),
    );
    const { html } = await mcp.call<{ html: string }>("get_html", {});
    expect(html).toContain("<h2>Title</h2>");
    expect(html).toContain("<p>Body</p>");
    expect(html).toContain('class="card"');
    // no grapesjs-specific wrapper attributes leak through
    expect(html).not.toContain("data-gjs-type");
  });

  test("get_css returns CSS from component styles", async ({ freshApp: page, mcp }) => {
    await page.evaluate(() => {
      const api = (window as unknown as {
        __designjs: { addHtml: (h: string) => unknown };
      }).__designjs;
      const added = api.addHtml(`<div data-testid="styled">styled</div>`) as Array<{
        addStyle: (s: Record<string, string>) => void;
      }>;
      const c = Array.isArray(added) ? added[0]! : (added as unknown as {
        addStyle: (s: Record<string, string>) => void;
      });
      c.addStyle({ color: "red", padding: "1rem" });
    });

    const { css } = await mcp.call<{ css: string }>("get_css", {});
    expect(css).toContain("color:red");
    expect(css).toContain("padding:1rem");
  });

  test("get_html scoped to componentId returns only that subtree", async ({
    freshApp: page,
    mcp,
  }) => {
    const targetId = await page.evaluate(() => {
      const api = (window as unknown as {
        __designjs: { addHtml: (h: string) => unknown };
      }).__designjs;
      const added = api.addHtml(
        `<div><h1 data-testid="keep">keep</h1><p data-testid="drop">drop</p></div>`,
      ) as Array<{ getId: () => string; components: () => { toArray: () => Array<{ getId: () => string }> } }>;
      const wrapper = Array.isArray(added) ? added[0]! : added;
      const keep = wrapper.components().toArray()[0]!;
      return keep.getId();
    });

    const { html } = await mcp.call<{ html: string }>("get_html", { componentId: targetId });
    expect(html).toContain("keep");
    expect(html).not.toContain("drop");
  });

  // ── Story 2.5 ────────────────────────────────────────────────────────────
  test("get_screenshot returns a base64 PNG data URL", async ({ freshApp: page, mcp }) => {
    await page.evaluate(() =>
      (window as unknown as { __designjs: { addHtml: (h: string) => unknown } }).__designjs.addHtml(
        `<div class="p-8 bg-blue-500 text-white">screenshot me</div>`,
      ),
    );

    const shot = await mcp.call<{ dataUrl: string; width: number; height: number }>(
      "get_screenshot",
      {},
      15_000,
    );
    expect(shot.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(shot.dataUrl.length).toBeGreaterThan(200);
    expect(shot.width).toBeGreaterThan(0);
    expect(shot.height).toBeGreaterThan(0);
  });

  test("get_screenshot with scale=2 produces a larger image", async ({ freshApp: page, mcp }) => {
    await page.evaluate(() =>
      (window as unknown as { __designjs: { addHtml: (h: string) => unknown } }).__designjs.addHtml(
        `<div class="p-4">scale</div>`,
      ),
    );
    const shot1 = await mcp.call<{ dataUrl: string; width: number }>("get_screenshot", {
      scale: 1,
    }, 15_000);
    const shot2 = await mcp.call<{ dataUrl: string; width: number }>("get_screenshot", {
      scale: 2,
    }, 15_000);
    expect(shot2.width).toBe(shot1.width * 2);
  });

  // ── Story 2.6 ────────────────────────────────────────────────────────────
  test("add_components returns created component ids + places into canvas", async ({
    freshApp: page,
    mcp,
  }) => {
    const { componentIds } = await mcp.call<{ componentIds: string[] }>("add_components", {
      html: `<button data-testid="mcp-btn" class="px-4 py-2 bg-green-600 text-white rounded">hi</button>`,
    });
    expect(componentIds.length).toBe(1);
    expect(componentIds[0]).toMatch(/.+/);

    const html = await page.evaluate(() =>
      (window as unknown as { __designjs: { getHtml: () => string } }).__designjs.getHtml(),
    );
    expect(html).toContain("mcp-btn");
    expect(html).toContain("bg-green-600");
  });

  test("add_components with target parent inserts as child", async ({ freshApp: page, mcp }) => {
    const { componentIds } = await mcp.call<{ componentIds: string[] }>("add_components", {
      html: `<div data-testid="parent-host" class="flex gap-2"></div>`,
    });
    const parentId = componentIds[0]!;

    const child = await mcp.call<{ componentIds: string[] }>("add_components", {
      html: `<span data-testid="child">inner</span>`,
      target: parentId,
    });
    expect(child.componentIds.length).toBe(1);

    const tree = await mcp.call<{ root: ComponentNode }>("get_tree", {});
    const parentNode = tree.root.children.find((c) => c.id === parentId)!;
    expect(parentNode).toBeDefined();
    expect(parentNode.children.length).toBe(1);
    expect(parentNode.children[0]!.tagName).toBe("span");
  });

  // ── Story 2.7 ────────────────────────────────────────────────────────────
  test("update_styles applies CSS properties to an existing component", async ({
    freshApp: page,
    mcp,
  }) => {
    const { componentIds } = await mcp.call<{ componentIds: string[] }>("add_components", {
      html: `<div data-testid="style-target">style me</div>`,
    });
    const id = componentIds[0]!;

    const res = await mcp.call<{ styles: Record<string, string> }>("update_styles", {
      componentId: id,
      styles: { color: "tomato", padding: "12px" },
    });
    expect(res.styles.color).toBe("tomato");
    expect(res.styles.padding).toBe("12px");

    const { css } = await mcp.call<{ css: string }>("get_css", { componentId: id });
    expect(css).toContain("color:tomato");
    expect(css).toContain("padding:12px");

    // Actual computed styles visible in the iframe
    const frame = page.frameLocator('iframe[class*="gjs-frame"]');
    const el = frame.locator('[data-testid="style-target"]');
    await expect(el).toBeVisible();
    const color = await el.evaluate((node) => window.getComputedStyle(node).color);
    expect(color).toBe("rgb(255, 99, 71)"); // tomato
  });

  // ── Story 2.8 ────────────────────────────────────────────────────────────
  test("delete_nodes removes components and reports the total deleted", async ({
    mcp,
  }) => {
    const addA = await mcp.call<{ componentIds: string[] }>("add_components", {
      html: `<div><span>a</span><span>b</span></div>`,
    });
    const addB = await mcp.call<{ componentIds: string[] }>("add_components", {
      html: `<p>p</p>`,
    });
    const ids = [addA.componentIds[0]!, addB.componentIds[0]!];

    const { deleted } = await mcp.call<{ deleted: number }>("delete_nodes", {
      componentIds: ids,
    });
    // GrapesJS counts text nodes as components too, so the exact number
    // depends on internal tree shape. The contract is "at least one per id
    // plus their descendants" and an empty canvas afterwards.
    expect(deleted).toBeGreaterThanOrEqual(ids.length);

    const tree = await mcp.call<{ root: ComponentNode }>("get_tree", {});
    expect(tree.root.children.length).toBe(0);
  });

  test("get_selection reflects what is selected in the editor", async ({ freshApp: page, mcp }) => {
    // Nothing selected initially
    const empty = await mcp.call<{ componentIds: string[] }>("get_selection", {});
    expect(empty.componentIds).toEqual([]);

    const id = await page.evaluate(() => {
      const api = (window as unknown as {
        __designjs: { editor: unknown; addHtml: (h: string) => unknown };
      }).__designjs;
      const added = api.addHtml(`<div data-testid="sel">select me</div>`) as Array<{
        getId: () => string;
      }>;
      const c = Array.isArray(added) ? added[0]! : added;
      const editor = api.editor as { select: (component: unknown) => void };
      editor.select(c);
      return c.getId();
    });

    const sel = await mcp.call<{ componentIds: string[] }>("get_selection", {});
    expect(sel.componentIds).toContain(id);
  });
});
