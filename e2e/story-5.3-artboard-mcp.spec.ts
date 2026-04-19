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
/**
 * Fresh canvas now starts with zero frames. Tests that exercise artboard-scoped
 * operations seed a Desktop explicitly via create_artboard.
 */
async function seedDesktop(mcp: import("./mcp-client").McpTestClient): Promise<Artboard> {
  const { artboard } = await mcp.call<{ artboard: Artboard }>("create_artboard", {
    name: "Desktop",
    width: 1440,
    height: 900,
    x: 0,
    y: 0,
  });
  return artboard;
}

test.describe("Story 5.3: artboard MCP tools", () => {
  test("list_artboards returns the unopinionated auto-frame on a fresh canvas", async ({
    freshApp: page,
    mcp,
  }) => {
    await waitForBridge(page, mcp);

    const { artboards } = await mcp.call<{ artboards: Artboard[] }>("list_artboards", {});
    // We no longer seed a 1440×900 "Desktop" on fresh canvas. GrapesJS still
    // auto-creates one blank frame at init (it needs a wrapper to render),
    // which the user can delete from the Layers panel.
    expect(artboards.length).toBe(1);
    expect(artboards[0]!.name.toLowerCase()).not.toContain("desktop");
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
    const seed = await seedDesktop(mcp);
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
    await seedDesktop(mcp);

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
    const desktop = await seedDesktop(mcp);

    // Append the marker directly to the Desktop seed's wrapper so the test
    // isn't dependent on which frame happens to be active (GrapesJS's
    // unopinionated auto-frame may still be active at this point).
    await page.evaluate((id) => {
      const ed = (window as unknown as {
        __opencanvas: {
          editor: {
            Canvas: {
              getFrames: () => Array<{
                cid?: string;
                id?: string;
                get: (k: string) => unknown;
              }>;
            };
          };
        };
      }).__opencanvas.editor;
      const frame = ed.Canvas.getFrames().find(
        (f) => String(f.cid ?? f.id ?? "") === id,
      )!;
      const wrapper = frame.get("component") as { append: (h: string) => unknown };
      wrapper.append(`<div data-frame="A" class="p-4">in seed</div>`);
    }, desktop.id);

    // Create a second frame (artboard B). It starts with no components.
    const created = await mcp.call<{ artboard: Artboard }>("create_artboard", {
      name: "Empty B",
      width: 600,
      height: 400,
    });
    const bId = created.artboard.id;

    const seedId = desktop.id;

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
    const desktop = await seedDesktop(mcp);

    // Append directly to the Desktop seed's wrapper (see the get_tree test
    // above for why — active-frame ambiguity with the unopinionated auto-frame).
    await page.evaluate((id) => {
      const ed = (window as unknown as {
        __opencanvas: {
          editor: {
            Canvas: {
              getFrames: () => Array<{
                cid?: string;
                id?: string;
                get: (k: string) => unknown;
              }>;
            };
          };
        };
      }).__opencanvas.editor;
      const frame = ed.Canvas.getFrames().find(
        (f) => String(f.cid ?? f.id ?? "") === id,
      )!;
      const wrapper = frame.get("component") as { append: (h: string) => unknown };
      wrapper.append(
        `<div data-shot-marker="ok" class="p-8 bg-blue-500 text-white">screenshot me</div>`,
      );
    }, desktop.id);
    // Wait for the marker to be visible inside *any* of the canvas iframes
    // (auto-frame + seeded Desktop — the marker is in Desktop's body). Scan
    // all iframes because the Desktop iframe may not be .first().
    await expect
      .poll(
        async () => {
          const iframes = await page.locator('iframe[class*="gjs-frame"]').all();
          for (const iframe of iframes) {
            const inner = await iframe.contentFrame();
            if (!inner) continue;
            const count = await inner.locator('[data-shot-marker="ok"]').count();
            if (count > 0) return true;
          }
          return false;
        },
        { timeout: 5_000, intervals: [100, 250, 500] },
      )
      .toBe(true);
    // Give Tailwind v4 CDN one extra paint to apply utility classes — html-to-image
    // captures inline computed styles, and an unstyled body produces a near-empty PNG.
    await page.waitForTimeout(250);

    const seedId = desktop.id;

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
