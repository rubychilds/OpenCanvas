import { test, expect } from "./fixtures";

async function waitForEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { __designjs?: unknown }).__designjs !== "undefined",
    undefined,
    { timeout: 10_000 },
  );
}

/**
 * Pull the artboards module off the page via a dynamic import — keeps the
 * test running against the shipped source (no bundled copy) and lets us
 * exercise the snap + move helpers without the interactive drag UI
 * (title-bar drag is a follow-up per the commit notes).
 */
async function useArtboardAPIs(page: import("@playwright/test").Page) {
  return page.evaluateHandle(async () => {
    const mod = (await import(
      "/src/canvas/artboards.ts"
    )) as typeof import("../packages/app/src/canvas/artboards.js");
    const ed = (window as unknown as { __designjs: { editor: import("grapesjs").Editor } })
      .__designjs.editor;
    return { mod, editor: ed };
  });
}

async function seedTwoArtboards(page: import("@playwright/test").Page): Promise<{ a: string; b: string }> {
  return page.evaluate(async () => {
    const mod = (await import(
      "/src/canvas/artboards.ts"
    )) as typeof import("../packages/app/src/canvas/artboards.js");
    const ed = (window as unknown as { __designjs: { editor: import("grapesjs").Editor } })
      .__designjs.editor;
    // Fresh canvas now starts empty — seed A (Desktop-sized at 0,0) and B.
    const a = mod.createArtboard(ed, {
      name: "A",
      width: 1440,
      height: 900,
      x: 0,
      y: 0,
    }).id;
    const b = mod.createArtboard(ed, {
      name: "B",
      width: 400,
      height: 300,
      x: 2000,
      y: 0,
    }).id;
    return { a, b };
  });
}

test.describe("Story 5.1 tail: artboard reposition + edge snap", () => {
  test("moveArtboard updates x/y attributes and emits ARTBOARDS_CHANGED", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    const result = await page.evaluate(async () => {
      const mod = (await import(
        "/src/canvas/artboards.ts"
      )) as typeof import("../packages/app/src/canvas/artboards.js");
      const ed = (window as unknown as { __designjs: { editor: import("grapesjs").Editor } })
        .__designjs.editor;
      // Seed a known frame alongside GrapesJS's unopinionated auto-frame and
      // target it directly by the returned id.
      const created = mod.createArtboard(ed, {
        name: "A",
        width: 1440,
        height: 900,
        x: 0,
        y: 0,
      });
      let fired = 0;
      const h = () => {
        fired += 1;
      };
      (ed as unknown as { on: (ev: string, f: () => void) => void }).on(
        mod.ARTBOARDS_CHANGED,
        h,
      );
      mod.moveArtboard(ed, created.id, 500, 200, false);
      const after = mod.listArtboards(ed).find((a) => a.id === created.id)!;
      (ed as unknown as { off: (ev: string, f: () => void) => void }).off(
        mod.ARTBOARDS_CHANGED,
        h,
      );
      return { x: after.x, y: after.y, fired };
    });
    expect(result.x).toBe(500);
    expect(result.y).toBe(200);
    expect(result.fired).toBeGreaterThanOrEqual(1);
  });

  test("findSnapOffset snaps left edge to neighbour right edge when within threshold", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    const { b } = await seedTwoArtboards(page);

    // The default Desktop is 1440×900 at x=0. Its right edge is at x=1440.
    // Ask for B to be placed at x=1435 — 5px inside the 8px threshold.
    const snap = await page.evaluate(async (bId: string) => {
      const mod = (await import(
        "/src/canvas/artboards.ts"
      )) as typeof import("../packages/app/src/canvas/artboards.js");
      const ed = (window as unknown as { __designjs: { editor: import("grapesjs").Editor } })
        .__designjs.editor;
      return mod.findSnapOffset(ed, bId, 1435, 0);
    }, b);
    expect(snap.x).toBe(1440);
    expect(snap.snappedX).toBe(true);
  });

  test("findSnapOffset leaves position unchanged when outside threshold", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    const { b } = await seedTwoArtboards(page);

    const snap = await page.evaluate(async (bId: string) => {
      const mod = (await import(
        "/src/canvas/artboards.ts"
      )) as typeof import("../packages/app/src/canvas/artboards.js");
      const ed = (window as unknown as { __designjs: { editor: import("grapesjs").Editor } })
        .__designjs.editor;
      return mod.findSnapOffset(ed, bId, 1500, 0);
    }, b);
    expect(snap.x).toBe(1500);
    expect(snap.snappedX).toBe(false);
  });

  test("moveArtboard with snap=true applies the snap offset to the frame's x/y", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    const { b } = await seedTwoArtboards(page);

    const after = await page.evaluate(async (bId: string) => {
      const mod = (await import(
        "/src/canvas/artboards.ts"
      )) as typeof import("../packages/app/src/canvas/artboards.js");
      const ed = (window as unknown as { __designjs: { editor: import("grapesjs").Editor } })
        .__designjs.editor;
      mod.moveArtboard(ed, bId, 1443, 5, true); // 3px off right edge, 5px off top
      return mod.listArtboards(ed).find((a) => a.id === bId)!;
    }, b);
    expect(after.x).toBe(1440);
    expect(after.y).toBe(0);
  });

  test("resizeArtboard updates width without changing other attributes", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    const after = await page.evaluate(async () => {
      const mod = (await import(
        "/src/canvas/artboards.ts"
      )) as typeof import("../packages/app/src/canvas/artboards.js");
      const ed = (window as unknown as { __designjs: { editor: import("grapesjs").Editor } })
        .__designjs.editor;
      // Fresh canvas already has GrapesJS's unopinionated auto-frame. Seed a
      // named one with known dimensions and target it by the returned id.
      const created = mod.createArtboard(ed, {
        name: "A",
        width: 1440,
        height: 900,
        x: 0,
        y: 0,
      });
      mod.resizeArtboard(ed, created.id, 1024);
      return mod.listArtboards(ed).find((a) => a.id === created.id)!;
    });
    expect(after.width).toBe(1024);
    expect(after.height).toBe(900);
  });
});
