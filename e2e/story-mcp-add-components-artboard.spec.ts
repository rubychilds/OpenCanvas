import { test, expect } from "./fixtures";

/**
 * Regression: add_components(html, artboardId) must route content into the
 * specified artboard's root wrapper, not dump it in the first/default frame.
 *
 * This was the thrash source during MCP dogfooding on 2026-04-19 — Claude
 * created a Desktop artboard, then called add_components with no artboardId
 * (or with target=<frameId>, which didn't resolve as a component), so the
 * pricing HTML landed in the pre-existing default frame instead of Desktop.
 *
 * Driven through the bridge via the MCP test client so we exercise the real
 * wire-protocol path (not just the canvas-side handler).
 */

test.describe("MCP: add_components routes into a specified artboardId", () => {
  test("without artboardId: content lands in the default frame", async ({
    freshApp: page,
    mcp,
  }) => {
    await mcp.call("ping", {});
    // Pre-seed the default frame so it's not "scratch" (empty "Frame 1"), or
    // the next createArtboard will replace it (51ce020). With content inside,
    // the default frame sticks around and we can prove routing doesn't leak
    // into Desktop.
    await mcp.call("add_components", {
      html: `<div data-testid="default-frame-seed">seed</div>`,
    });

    const { artboard } = (await mcp.call("create_artboard", {
      name: "Desktop",
      width: 1440,
      height: 900,
    })) as { artboard: { id: string } };
    const desktopId = artboard.id;
    expect(desktopId).toBeTruthy();

    await mcp.call("add_components", {
      html: `<div data-testid="no-target-payload">content without artboardId</div>`,
    });

    // Payload should NOT be inside the Desktop frame's tree.
    const desktopTree = (await mcp.call("get_tree", { artboardId: desktopId })) as {
      root: { children: Array<{ attributes?: Record<string, string>; children?: unknown[] }> };
    };
    const json = JSON.stringify(desktopTree);
    expect(json).not.toContain("no-target-payload");
  });

  test("with artboardId: content lands inside the specified frame", async ({
    freshApp: page,
    mcp,
  }) => {
    await mcp.call("ping", {});
    const { artboard } = (await mcp.call("create_artboard", {
      name: "Desktop",
      width: 1440,
      height: 900,
    })) as { artboard: { id: string } };
    const desktopId = artboard.id;

    await mcp.call("add_components", {
      html: `<div data-testid="routed-payload">content routed by artboardId</div>`,
      artboardId: desktopId,
    });

    const desktopTree = (await mcp.call("get_tree", { artboardId: desktopId })) as unknown;
    expect(JSON.stringify(desktopTree)).toContain("routed-payload");
  });

  test("unknown artboardId: tool call errors cleanly (does not silently fall back)", async ({
    freshApp: page,
    mcp,
  }) => {
    await mcp.call("ping", {});
    await expect(
      mcp.call("add_components", {
        html: `<div>won't land</div>`,
        artboardId: "frame-does-not-exist",
      }),
    ).rejects.toThrow(/artboard not found/);
  });

  test("target takes precedence over artboardId when both are passed", async ({
    freshApp: page,
    mcp,
  }) => {
    await mcp.call("ping", {});
    // Seed a host in the default frame (cross-frame findById isn't a thing
     // today — that's a separate limitation). Then add a child pointing
     // target at that host AND artboardId at a bogus frame: if artboardId
     // were consulted, the call would throw "artboard not found"; instead
     // target takes precedence and the call succeeds.
    const { componentIds: hostIds } = (await mcp.call("add_components", {
      html: `<div id="host-for-target"></div>`,
    })) as { componentIds: string[] };
    const hostId = hostIds[0]!;

    const { componentIds: childIds } = (await mcp.call("add_components", {
      html: `<span data-testid="child-of-host">child</span>`,
      target: hostId,
      // An obviously-wrong artboardId that would error out if target didn't win.
      artboardId: "frame-does-not-exist",
    })) as { componentIds: string[] };
    expect(childIds.length).toBe(1);
  });
});
