import { test, expect } from "./fixtures";
import { waitForBridge } from "./helpers";

interface Artboard {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OpencanvasGlobal {
  __opencanvas: {
    addHtml: (html: string) => unknown;
  };
}

interface TreeNode {
  tagName?: string;
  attributes: Record<string, string>;
  children: TreeNode[];
}

/**
 * Story 5.3: artboard MCP tools.
 * Phase B (5.1 + 5.2) shipped multi-artboard UI; this story exposes that
 * surface to agents via the bridge: list_artboards, create_artboard,
 * find_placement, plus artboardId scoping on get_tree / get_screenshot.
 */
test.describe("Story 5.3: artboard MCP tools", () => {
  test("list_artboards returns the seeded Desktop artboard on a fresh canvas", async ({
    freshApp: page,
    mcp,
  }) => {
    await waitForBridge(page, mcp);

    const { artboards } = await mcp.call<{ artboards: Artboard[] }>("list_artboards", {});
    // Phase B's ensureDefaultArtboard seeds one Desktop frame on an empty canvas.
    expect(artboards.length).toBe(1);
    const seed = artboards[0]!;
    expect(seed.name).toBe("Desktop");
    expect(seed.width).toBe(1440);
    expect(seed.height).toBe(900);
    expect(typeof seed.id).toBe("string");
    expect(seed.id.length).toBeGreaterThan(0);
  });

  test("create_artboard adds a frame and list_artboards reflects it", async ({
    freshApp: page,
    mcp,
  }) => {
    await waitForBridge(page, mcp);

    const before = await mcp.call<{ artboards: Artboard[] }>("list_artboards", {});

    const created = await mcp.call<{ artboard: Artboard }>("create_artboard", {
      name: "Mobile",
      width: 375,
      height: 812,
    });
    expect(created.artboard.name).toBe("Mobile");
    expect(created.artboard.width).toBe(375);
    expect(created.artboard.height).toBe(812);
    expect(typeof created.artboard.id).toBe("string");

    const after = await mcp.call<{ artboards: Artboard[] }>("list_artboards", {});
    expect(after.artboards.length).toBe(before.artboards.length + 1);
    expect(after.artboards.find((a) => a.id === created.artboard.id)).toBeDefined();
  });

  test("find_placement suggests non-overlapping coordinates to the right of existing artboards", async ({
    freshApp: page,
    mcp,
  }) => {
    await waitForBridge(page, mcp);

    const { artboards } = await mcp.call<{ artboards: Artboard[] }>("list_artboards", {});
    const seed = artboards[0]!;
    const expectedRight = seed.x + seed.width;

    const placement = await mcp.call<{ x: number; y: number }>("find_placement", {
      width: 768,
      height: 1024,
    });
    // 80px gap (DEFAULT_ARTBOARD_GAP) past the rightmost edge.
    expect(placement.x).toBe(expectedRight + 80);
    expect(placement.y).toBe(seed.y);
  });

  test("create_artboard without explicit x/y uses find_placement under the hood", async ({
    freshApp: page,
    mcp,
  }) => {
    await waitForBridge(page, mcp);

    const placement = await mcp.call<{ x: number; y: number }>("find_placement", {
      width: 800,
      height: 600,
    });
    const created = await mcp.call<{ artboard: Artboard }>("create_artboard", {
      name: "Auto-placed",
      width: 800,
      height: 600,
    });
    expect(created.artboard.x).toBe(placement.x);
    expect(created.artboard.y).toBe(placement.y);
  });

  test("get_tree scoped to artboardId returns only that frame's component tree", async ({
    freshApp: page,
    mcp,
  }) => {
    await waitForBridge(page, mcp);

    // Seed frame is artboard A. Add a marker component to it via addHtml,
    // which targets editor.getWrapper() — i.e. the seed frame's wrapper.
    await page.evaluate(() =>
      (window as unknown as OpencanvasGlobal).__opencanvas.addHtml(
        `<div data-frame="A" class="p-4">in seed</div>`,
      ),
    );

    // Create a second frame (artboard B). It starts with no components.
    const created = await mcp.call<{ artboard: Artboard }>("create_artboard", {
      name: "Empty B",
      width: 600,
      height: 400,
    });
    const bId = created.artboard.id;

    const seedId = (await mcp.call<{ artboards: Artboard[] }>("list_artboards", {}))
      .artboards.find((a) => a.name !== "Empty B")!.id;

    const treeA = await mcp.call<{ root: TreeNode | null }>("get_tree", {
      artboardId: seedId,
    });
    expect(treeA.root).not.toBeNull();
    const aMarker = JSON.stringify(treeA.root);
    expect(aMarker).toContain('"data-frame":"A"');

    const treeB = await mcp.call<{ root: TreeNode | null }>("get_tree", {
      artboardId: bId,
    });
    expect(treeB.root).not.toBeNull();
    const bMarker = JSON.stringify(treeB.root);
    expect(bMarker).not.toContain('"data-frame":"A"');
  });

  test("get_tree with an unknown artboardId throws a clear error", async ({
    freshApp: page,
    mcp,
  }) => {
    await waitForBridge(page, mcp);

    let error: string | null = null;
    try {
      await mcp.call("get_tree", { artboardId: "not-a-real-id" });
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
    expect(error).not.toBeNull();
    expect(error).toMatch(/artboard not found/);
  });

  test("get_screenshot scoped to artboardId returns a base64 PNG of that frame", async ({
    freshApp: page,
    mcp,
  }) => {
    await waitForBridge(page, mcp);

    // Give the seed frame some content so html-to-image has a non-trivial body.
    await page.evaluate(() =>
      (window as unknown as OpencanvasGlobal).__opencanvas.addHtml(
        `<div data-shot-marker="ok" class="p-8 bg-blue-500 text-white">screenshot me</div>`,
      ),
    );
    // Wait for the marker to be visible inside the iframe so html-to-image
    // captures a settled DOM.
    const frame = page.frameLocator('iframe[class*="gjs-frame"]').first();
    await expect(frame.locator('[data-shot-marker="ok"]')).toBeVisible({ timeout: 5_000 });
    // Give Tailwind v4 CDN one extra paint to apply utility classes — html-to-image
    // captures inline computed styles, and an unstyled body produces a near-empty PNG.
    await page.waitForTimeout(250);

    const { artboards } = await mcp.call<{ artboards: Artboard[] }>("list_artboards", {});
    const seedId = artboards[0]!.id;

    const shot = await mcp.call<{ dataUrl: string; width: number; height: number }>(
      "get_screenshot",
      { artboardId: seedId },
      15_000,
    );
    expect(shot.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(shot.dataUrl.length).toBeGreaterThan(200);
    expect(shot.width).toBeGreaterThan(0);
    expect(shot.height).toBeGreaterThan(0);
  });
});
