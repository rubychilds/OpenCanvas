import { test, expect } from "./fixtures";

/**
 * Fresh boot: ensureDefaultArtboard seeds a "Frame 1" scratch frame so
 * the user has a canvas to look at. When they (or an agent) then create
 * a real named artboard (e.g. "Desktop"), the scratch frame should be
 * replaced rather than left behind as clutter.
 *
 * Guard: a frame with ANY content or a non-default name is user-owned
 * and must not be deleted.
 */
test.describe("createArtboard: scratch-frame cleanup", () => {
  test("creating a Desktop frame on a fresh canvas replaces the empty Frame 1", async ({
    freshApp: page,
  }) => {
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
      mod.createArtboard(ed, { name: "Desktop", width: 1440, height: 900 });
      return mod.listArtboards(ed).map((a) => a.name);
    });

    expect(after).toEqual(["Desktop"]);
  });

  test("scratch frame with content is preserved (not deleted)", async ({
    freshApp: page,
  }) => {
    await page.waitForFunction(
      () => typeof (window as unknown as { __designjs?: unknown }).__designjs !== "undefined",
      undefined,
      { timeout: 10_000 },
    );

    const names = await page.evaluate(async () => {
      const mod = (await import(
        "/src/canvas/artboards.ts"
      )) as typeof import("../packages/app/src/canvas/artboards.js");
      const ed = (window as unknown as { __designjs: { editor: import("grapesjs").Editor } })
        .__designjs.editor;
      // Drop a child into the default Frame 1 wrapper.
      const frame1 = ed.Canvas.getFrames()[0]! as unknown as {
        get: (k: string) => unknown;
      };
      const wrapper = frame1.get("component") as {
        append: (html: string) => unknown;
      };
      wrapper.append("<div>content</div>");

      mod.createArtboard(ed, { name: "Desktop", width: 1440, height: 900 });
      return mod.listArtboards(ed).map((a) => a.name);
    });

    // Both frames survive — Frame 1 has content now.
    expect(names.sort()).toEqual(["Desktop", "Frame 1"].sort());
  });

  test("frame with a non-default name is preserved even if empty", async ({
    freshApp: page,
  }) => {
    await page.waitForFunction(
      () => typeof (window as unknown as { __designjs?: unknown }).__designjs !== "undefined",
      undefined,
      { timeout: 10_000 },
    );

    const names = await page.evaluate(async () => {
      const mod = (await import(
        "/src/canvas/artboards.ts"
      )) as typeof import("../packages/app/src/canvas/artboards.js");
      const ed = (window as unknown as { __designjs: { editor: import("grapesjs").Editor } })
        .__designjs.editor;
      const frame1 = ed.Canvas.getFrames()[0]! as unknown as {
        set: (a: Record<string, unknown>) => void;
      };
      frame1.set({ name: "Hero" });

      mod.createArtboard(ed, { name: "Desktop", width: 1440, height: 900 });
      return mod.listArtboards(ed).map((a) => a.name);
    });

    expect(names.sort()).toEqual(["Desktop", "Hero"].sort());
  });
});
