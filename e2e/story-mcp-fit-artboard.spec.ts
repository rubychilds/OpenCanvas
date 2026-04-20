import { test, expect } from "./fixtures";

/**
 * MCP `fit_artboard` shrinks a frame's height to match its content's
 * scrollHeight (width preserved). Use case: agent creates a Desktop
 * 1440×900, drops a short pricing section in, calls fit_artboard, and
 * the artboard shrinks to the content without blank space below.
 */
test.describe("MCP: fit_artboard resizes height to content", () => {
  test("shrinks an over-tall Desktop frame down to the content it contains", async ({
    freshApp: page,
    mcp,
  }) => {
    await mcp.call("ping", {});

    // Create a Desktop frame then put a small fixed-height block in it.
    const { artboard } = (await mcp.call("create_artboard", {
      name: "Desktop",
      width: 1440,
      height: 900,
    })) as { artboard: { id: string; width: number; height: number } };
    expect(artboard.height).toBe(900);

    await mcp.call("add_components", {
      html: `<div style="height: 240px; background: #eee;">short content</div>`,
      artboardId: artboard.id,
    });

    const result = (await mcp.call("fit_artboard", {
      artboardId: artboard.id,
    })) as { artboard: { height: number; width: number }; height: number };

    // Content is 240px; allow ±20px for body padding/margins + rounding.
    expect(result.height).toBeGreaterThan(220);
    expect(result.height).toBeLessThan(280);
    expect(result.artboard.height).toBe(result.height);
    expect(result.artboard.width).toBe(1440); // width preserved
  });

  test("unknown artboardId: tool call errors cleanly", async ({
    freshApp: page,
    mcp,
  }) => {
    await mcp.call("ping", {});
    await expect(
      mcp.call("fit_artboard", { artboardId: "frame-does-not-exist" }),
    ).rejects.toThrow(/cannot fit artboard/);
  });
});
