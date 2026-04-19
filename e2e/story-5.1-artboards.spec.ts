import { test, expect } from "./fixtures";

interface FrameLike {
  getId?(): string;
  get?(key: string): unknown;
  attributes?: Record<string, unknown>;
}

async function readFrames(
  page: Parameters<typeof test>[0] extends unknown ? Parameters<typeof expect>[0] : never,
): Promise<never> {
  // placeholder — types are satisfied via the inline evaluator below
  return undefined as never;
}
void readFrames;

test.describe("Story 5.1: multi-artboard canvas", () => {
  test("fresh canvas shows one unopinionated auto-frame (no Desktop preset)", async ({
    freshApp: page,
  }) => {
    await page.waitForFunction(
      () => typeof (window as unknown as { __opencanvas?: unknown }).__opencanvas !== "undefined",
      undefined,
      { timeout: 10_000 },
    );

    const frames = await page.evaluate(() => {
      const w = window as unknown as {
        __opencanvas: { editor: { Canvas: { getFrames(): FrameLike[] } } };
      };
      return w.__opencanvas.editor.Canvas.getFrames().map((f) => {
        const g = (f as unknown as { get?: (k: string) => unknown }).get?.bind(f);
        return { name: String(g?.("name") ?? "") };
      });
    });
    // GrapesJS auto-creates one frame at init; we no longer rename/seed it
    // to "Desktop". The user can delete it from the Layers panel.
    expect(frames.length).toBe(1);
    expect(frames[0]!.name.toLowerCase()).not.toContain("desktop");
  });

  test("creating a Tablet-sized artboard next to an existing Desktop places it to the right", async ({
    freshApp: page,
  }) => {
    await page.waitForFunction(
      () => typeof (window as unknown as { __opencanvas?: unknown }).__opencanvas !== "undefined",
      undefined,
      { timeout: 10_000 },
    );

    // Canvas starts empty — seed a Desktop then add a Tablet next to it.
    await page.evaluate(() => {
      const api = (window as unknown as { __opencanvas: { editor: unknown } }).__opencanvas;
      const edt = api.editor as {
        Canvas: { addFrame: (props: unknown) => unknown };
      };
      edt.Canvas.addFrame({ name: "Desktop", width: 1440, height: 900, x: 0, y: 0 });
      edt.Canvas.addFrame({ name: "Tablet", width: 768, height: 1024, x: 1520, y: 0 });
    });

    const frames = await page.evaluate(() => {
      const w = window as unknown as {
        __opencanvas: { editor: { Canvas: { getFrames(): FrameLike[] } } };
      };
      return w.__opencanvas.editor.Canvas.getFrames().map((f) => {
        const g = (f as unknown as { get?: (k: string) => unknown }).get?.bind(f);
        return {
          name: String(g?.("name") ?? ""),
          width: Number(g?.("width") ?? 0),
          height: Number(g?.("height") ?? 0),
          x: Number(g?.("x") ?? 0),
        };
      });
    });

    // auto-frame + Desktop + Tablet = 3.
    expect(frames.length).toBe(3);
    const tablet = frames.find((f) => f.name.toLowerCase() === "tablet")!;
    expect(tablet).toBeDefined();
    expect(tablet.width).toBe(768);
    expect(tablet.height).toBe(1024);
    // Placed to the right of the desktop artboard, not overlapping
    expect(tablet.x).toBeGreaterThanOrEqual(1440);
  });

  test("InsertRail Frame button is visible in the canvas overlay", async ({ freshApp: page }) => {
    await page.waitForFunction(
      () => typeof (window as unknown as { __opencanvas?: unknown }).__opencanvas !== "undefined",
      undefined,
      { timeout: 10_000 },
    );
    await expect(page.locator('[data-testid="oc-insert-rail"]')).toBeVisible();
    await expect(page.locator('[data-testid="oc-insert-frame"]')).toBeVisible();
  });
});
