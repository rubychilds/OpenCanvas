import { test, expect } from "./fixtures";

/**
 * Regression: fresh canvas boot must show a usable frame.
 *
 * In `infiniteCanvas: true` mode GrapesJS auto-creates one frame at init but
 * gives it degenerate geometry (0×0 / unpositioned), which renders as nothing
 * on the canvas and makes ⌘0 "Fit all" no-op. The user reported a blank
 * canvas at every zoom level on fresh boot even though the Layers panel
 * showed a frame. `ensureDefaultArtboard` now runs in `handleReady` after
 * `loadProject()` and normalizes the first frame to 1280×800 "Frame 1" when
 * the user's frame looks like the unopinionated auto-frame.
 */
test.describe("Default artboard: fresh boot has a visible frame", () => {
  test("fresh canvas has exactly one frame with 1280×800 geometry", async ({
    freshApp: page,
  }) => {
    await page.waitForFunction(
      () => typeof (window as unknown as { __designjs?: unknown }).__designjs !== "undefined",
      undefined,
      { timeout: 10_000 },
    );

    const frames = await page.evaluate(() => {
      const ed = (window as unknown as {
        __designjs: { editor: { Canvas: { getFrames: () => Array<{ get: (k: string) => unknown }> } } };
      }).__designjs.editor;
      return ed.Canvas.getFrames().map((f) => ({
        name: f.get("name"),
        x: Number(f.get("x") ?? -1),
        y: Number(f.get("y") ?? -1),
        width: Number(f.get("width") ?? 0),
        height: Number(f.get("height") ?? 0),
      }));
    });

    expect(frames).toHaveLength(1);
    expect(frames[0]!.name).toBe("Frame 1");
    expect(frames[0]!.width).toBe(1280);
    expect(frames[0]!.height).toBe(800);
    expect(frames[0]!.x).toBe(0);
    expect(frames[0]!.y).toBe(0);
  });

  test("calling ensureDefaultArtboard again with a degenerate auto-frame replaces it", async ({
    freshApp: page,
  }) => {
    // Simulate the live-browser timing where GrapesJS's auto-frame exists
    // with width>0 but height=0 (the exact state the user reported: '1280×0'
    // badge + empty canvas). ensure() should delete + recreate, not
    // frame.set() which drops the height.
    await page.waitForFunction(
      () => typeof (window as unknown as { __designjs?: unknown }).__designjs !== "undefined",
      undefined,
      { timeout: 10_000 },
    );

    const after = await page.evaluate(async () => {
      const mod = (await import(
        "/src/canvas/artboards.ts"
      )) as typeof import("../packages/app/src/canvas/artboards.js");
      const ed = (window as unknown as { __designjs: { editor: import("grapesjs").Editor } })
        .__designjs.editor;

      // Degenerate-auto-frame simulation: unset name, keep width, zero height.
      const first = ed.Canvas.getFrames()[0]! as unknown as {
        set: (a: Record<string, unknown>) => void;
        unset?: (k: string) => void;
      };
      first.set({ name: "", width: 1280, height: 0 });

      mod.ensureDefaultArtboard(ed);

      return ed.Canvas.getFrames().map((f) => ({
        name: f.get("name"),
        width: Number(f.get("width") ?? 0),
        height: Number(f.get("height") ?? 0),
      }));
    });

    expect(after).toHaveLength(1);
    expect(after[0]!.name).toBe("Frame 1");
    expect(after[0]!.width).toBe(1280);
    expect(after[0]!.height).toBe(800);
  });

  test("default frame's wrapper has a white background (paints against canvas void)", async ({
    freshApp: page,
  }) => {
    await page.waitForFunction(
      () => typeof (window as unknown as { __designjs?: unknown }).__designjs !== "undefined",
      undefined,
      { timeout: 10_000 },
    );

    const bg = await page.evaluate(() => {
      const ed = (window as unknown as {
        __designjs: { editor: { Canvas: { getFrames: () => Array<{ get: (k: string) => unknown }> } } };
      }).__designjs.editor;
      const wrapper = ed.Canvas.getFrames()[0]!.get("component") as {
        getStyle: () => Record<string, string>;
      };
      return wrapper.getStyle().background ?? "";
    });
    expect(bg).toBe("#ffffff");
  });

  test("saved project with a named frame is not overwritten", async ({ freshApp: page }) => {
    // Simulate a saved project by calling ensureDefaultArtboard AFTER a frame
    // with a distinct name has already been set up. The helper should be a
    // no-op in this case (the named frame wins — "Frame 1" only applies to
    // the unopinionated auto-frame).
    await page.waitForFunction(
      () => typeof (window as unknown as { __designjs?: unknown }).__designjs !== "undefined",
      undefined,
      { timeout: 10_000 },
    );

    const result = await page.evaluate(async () => {
      const mod = (await import(
        "/src/canvas/artboards.ts"
      )) as typeof import("../packages/app/src/canvas/artboards.js");
      const ed = (window as unknown as { __designjs: { editor: import("grapesjs").Editor } })
        .__designjs.editor;

      // Rename the first frame to simulate a saved-project restore.
      const first = ed.Canvas.getFrames()[0]! as unknown as {
        set: (a: Record<string, unknown>) => void;
        get: (k: string) => unknown;
      };
      first.set({ name: "Mobile", width: 375, height: 812 });

      // Running ensure again should NOT touch a named frame.
      mod.ensureDefaultArtboard(ed);

      return {
        name: first.get("name"),
        width: Number(first.get("width") ?? 0),
        height: Number(first.get("height") ?? 0),
      };
    });

    expect(result.name).toBe("Mobile");
    expect(result.width).toBe(375);
    expect(result.height).toBe(812);
  });
});
