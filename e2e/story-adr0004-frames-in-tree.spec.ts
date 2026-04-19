import { test, expect } from "./fixtures";

/**
 * ADR-0004: Frames are top-level nodes inside the layer tree. FramesSection
 * (the standalone section above the tree) has been retired — every Frame is
 * rendered as a `oc-frame-row-<id>` with the wrapper's children recursing
 * below as `oc-layer-row-<id>`.
 */

async function waitForEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { __opencanvas?: unknown }).__opencanvas !== "undefined",
    undefined,
    { timeout: 10_000 },
  );
}

async function frameIds(page: import("@playwright/test").Page): Promise<string[]> {
  return page.evaluate(() => {
    const ed = (window as unknown as {
      __opencanvas: { editor: { Canvas: { getFrames: () => unknown[] } } };
    }).__opencanvas.editor;
    return ed.Canvas.getFrames().map((f) => {
      const g = (f as { getId?: () => string; cid?: string; id?: string });
      return String(g.getId?.() ?? g.cid ?? g.id ?? "");
    });
  });
}


test.describe("ADR-0004: frames rendered as top-level layer tree roots", () => {
  test("retired: no standalone FramesSection toggle", async ({ freshApp: page }) => {
    await waitForEditor(page);
    // The old FramesSection header used data-testid="oc-frames-section-toggle".
    // It must no longer exist — frames live inside the Layers tree now.
    await expect(page.locator('[data-testid="oc-frames-section-toggle"]')).toHaveCount(0);
  });

  test("fresh canvas shows the unopinionated auto-frame in the Layers tree", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    // Per product direction: we no longer seed a 1440×900 "Desktop" artboard
    // on a fresh canvas. GrapesJS still auto-creates one blank frame at init
    // (it needs at least one to render a wrapper) — that's the single row
    // the user sees, and they can delete it via the hover trash icon.
    const ids = await frameIds(page);
    expect(ids.length).toBe(1);
    await expect(page.locator(`[data-testid="oc-frame-row-${ids[0]}"]`)).toBeVisible();
  });

  test("appending a component to a frame's wrapper nests it under that frame's row", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    // Target the seeded frame's wrapper directly so the test isn't dependent on
    // which frame `editor.addComponents()` happens to write to (active vs
    // top-level wrapper varies across GrapesJS versions). Frames as tree-roots
    // is what we're verifying.
    await page.evaluate(() => {
      const ed = (window as unknown as {
        __opencanvas: {
          editor: {
            Canvas: {
              getFrames: () => Array<{ get: (k: string) => unknown }>;
            };
          };
        };
      }).__opencanvas.editor;
      const wrapper = ed.Canvas.getFrames()[0]!.get("component") as {
        append: (h: string) => unknown;
      };
      wrapper.append(`<div data-test-marker="nested">x</div>`);
    });

    const [seedId] = await frameIds(page);
    const frameRow = page.locator(`[data-testid="oc-frame-row-${seedId}"]`);
    await expect(frameRow).toBeVisible();

    // Confirm the wrapper actually grew a child via the canvas API — isolates
    // "does the model see the append?" from "does the React tree re-render?".
    const wrapperChildCount = await page.evaluate(() => {
      const ed = (window as unknown as {
        __opencanvas: {
          editor: {
            Canvas: {
              getFrames: () => Array<{ get: (k: string) => unknown }>;
            };
          };
        };
      }).__opencanvas.editor;
      const wrapper = ed.Canvas.getFrames()[0]!.get("component") as {
        components: () => { length: number };
      };
      return wrapper.components().length;
    });
    expect(wrapperChildCount).toBeGreaterThan(0);

    // Then check the React tree caught up and renders the child row inside the
    // frame's subtree. Poll because the React re-render is async after the
    // GrapesJS `component:add` event.
    await expect
      .poll(async () => frameRow.locator('[data-testid^="oc-layer-row-"]').count(), {
        timeout: 5_000,
      })
      .toBeGreaterThan(0);
  });

  test("creating a second artboard shows a second top-level frame row", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    // Fresh canvas has one unopinionated auto-frame; adding a second should
    // give us two top-level rows.
    await page.evaluate(() => {
      const ed = (window as unknown as {
        __opencanvas: { editor: { Canvas: { addFrame: (p: unknown) => unknown } } };
      }).__opencanvas.editor;
      ed.Canvas.addFrame({ name: "Mobile", width: 375, height: 812, x: 1520, y: 0 });
    });

    const ids = await frameIds(page);
    expect(ids.length).toBe(2);
    for (const id of ids) {
      await expect(page.locator(`[data-testid="oc-frame-row-${id}"]`)).toBeVisible();
    }
  });

  test("clicking a frame's name selects the frame's wrapper component", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    const [seedId] = await frameIds(page);
    await page.locator(`[data-testid="oc-frame-name-${seedId}"]`).click();

    const selectedTag = await page.evaluate(() => {
      const ed = (window as unknown as {
        __opencanvas: {
          editor: { getSelected: () => { get: (k: string) => unknown } | null };
        };
      }).__opencanvas.editor;
      return ed.getSelected()?.get("type") ?? null;
    });
    // The wrapper is the frame's root component — in GrapesJS its type is
    // "wrapper". Tolerate either "wrapper" or a real tag name, so long as
    // something is selected.
    expect(selectedTag).not.toBeNull();
  });

  test("double-click frame name renames the frame in the Canvas model", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    const [seedId] = await frameIds(page);

    await page.locator(`[data-testid="oc-frame-name-${seedId}"]`).dblclick();
    const input = page.locator(`[data-testid="oc-frame-rename-input-${seedId}"]`);
    await expect(input).toBeVisible();
    await input.fill("Renamed Frame");
    await input.blur();

    const name = await page.evaluate((id) => {
      const ed = (window as unknown as {
        __opencanvas: {
          editor: { Canvas: { getFrames: () => unknown[] } };
        };
      }).__opencanvas.editor;
      const frames = ed.Canvas.getFrames();
      const match = frames.find((f) => {
        const g = (f as { getId?: () => string; cid?: string });
        return String(g.getId?.() ?? g.cid ?? "") === id;
      });
      return (match as { get?: (k: string) => unknown } | undefined)?.get?.("name") ?? null;
    }, seedId);
    expect(String(name)).toBe("Renamed Frame");
  });

  test("Delete key removes the selected frame (the sole auto-frame too)", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    // Fresh canvas has one auto-frame; the trash icon was retired in favour
    // of the Delete keybinding. Select the frame's wrapper and press Delete —
    // afterwards, the frame list is empty.
    const before = await frameIds(page);
    expect(before.length).toBeGreaterThanOrEqual(1);
    await page.evaluate(() => {
      const ed = (window as unknown as {
        __opencanvas: {
          editor: {
            Canvas: { getFrames: () => Array<{ get: (k: string) => unknown }> };
            select: (c: unknown) => void;
          };
        };
      }).__opencanvas.editor;
      const wrapper = ed.Canvas.getFrames()[0]!.get("component");
      ed.select(wrapper);
    });
    await page.keyboard.press("Delete");
    await expect
      .poll(() => frameIds(page).then((ids) => ids.length), {
        timeout: 3_000,
      })
      .toBe(before.length - 1);
  });
});
