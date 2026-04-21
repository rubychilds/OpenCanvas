import { test, expect } from "./fixtures";

/**
 * MCP-driven mutations must flip the dirty bit so `attachPersistence`'s
 * autosave catches them. Regression coverage for a bug users hit during
 * dogfooding: Claude designs a pricing section, Topbar reads "Saved",
 * user reloads, design is gone. Root cause was that GrapesJS doesn't
 * fire `update` for programmatic calls (e.g. editor.addComponents,
 * component.append) — each write-side MCP handler now explicitly fires
 * `editor.trigger("update")` so the persistence layer sees the change.
 */
test.describe("MCP writes trigger autosave (persist across reload)", () => {
  test("add_components via MCP persists to disk after the 5s autosave tick", async ({
    freshApp: page,
    mcp,
  }) => {
    await mcp.call("ping", {});

    // Ensure default frame + add identifying content into it.
    const { artboards } = (await mcp.call("list_artboards", {})) as {
      artboards: Array<{ id: string; name: string }>;
    };
    const frameId = artboards[0]!.id;
    await mcp.call("add_components", {
      html: `<div data-testid="persist-marker">persist-me</div>`,
      artboardId: frameId,
    });

    // Wait for the autosave tick (5s + buffer). The Topbar status flips
    // from "idle" → "saving" → "saved"; poll the dom for "Saved".
    await expect(page.locator('[data-testid="oc-save-status"]')).toHaveText("Saved", {
      timeout: 10_000,
    });

    // GET the persisted project from the dev-server middleware.
    const persisted = await page.evaluate(async () => {
      const res = await fetch("/__designjs/project");
      return (await res.json()) as { exists: boolean; project?: unknown };
    });
    expect(persisted.exists).toBe(true);
    // The serialised project should contain our marker somewhere.
    expect(JSON.stringify(persisted.project)).toContain("persist-marker");
  });

  test("update_styles via MCP flips dirty and saves", async ({
    freshApp: page,
    mcp,
  }) => {
    await mcp.call("ping", {});

    const { artboards } = (await mcp.call("list_artboards", {})) as {
      artboards: Array<{ id: string }>;
    };
    const { componentIds } = (await mcp.call("add_components", {
      html: `<div data-testid="style-host">x</div>`,
      artboardId: artboards[0]!.id,
    })) as { componentIds: string[] };

    // Let the add-components save happen so we're starting from Saved,
    // then issue a style update and confirm it also triggers a re-save.
    await expect(page.locator('[data-testid="oc-save-status"]')).toHaveText("Saved", {
      timeout: 10_000,
    });

    await mcp.call("update_styles", {
      componentId: componentIds[0]!,
      styles: { color: "rgb(255, 0, 85)" },
    });

    // Poll the persisted file until the style change lands. The in-between
    // "Saving…" status is intentionally not asserted — it can flash past
    // faster than Playwright samples, causing flakes.
    await expect
      .poll(
        async () => {
          const res = await page.evaluate(async () => {
            const r = await fetch("/__designjs/project");
            return (await r.json()) as { project?: unknown };
          });
          return JSON.stringify(res.project ?? {});
        },
        { timeout: 10_000, intervals: [250, 500, 1000] },
      )
      .toContain("rgb(255, 0, 85)");
  });
});
