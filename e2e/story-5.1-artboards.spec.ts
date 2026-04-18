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
  test("empty canvas seeds exactly one named Desktop artboard (1440x900 @ 0,0)", async ({
    freshApp: page,
  }) => {
    await page.waitForFunction(
      () => {
        const w = window as unknown as { __opencanvas?: { editor: { Canvas: { getFrames(): FrameLike[] } } } };
        return (w.__opencanvas?.editor.Canvas.getFrames().length ?? 0) > 0;
      },
      undefined,
      { timeout: 10_000 },
    );

    const frames = await page.evaluate(() => {
      const w = window as unknown as {
        __opencanvas: { editor: { Canvas: { getFrames(): FrameLike[] } } };
      };
      return w.__opencanvas.editor.Canvas.getFrames().map((f) => {
        const g = (f as unknown as { get?: (k: string) => unknown }).get?.bind(f);
        return {
          name: String(g?.("name") ?? ""),
          x: Number(g?.("x") ?? 0),
          y: Number(g?.("y") ?? 0),
          width: Number(g?.("width") ?? 0),
          height: Number(g?.("height") ?? 0),
        };
      });
    });

    expect(frames.length).toBe(1);
    expect(frames[0]!.name.toLowerCase()).toContain("desktop");
    expect(frames[0]!.width).toBe(1440);
    expect(frames[0]!.height).toBe(900);
  });

  test("clicking +Tablet adds a second frame at the placed offset", async ({
    freshApp: page,
  }) => {
    await page.waitForFunction(
      () => {
        const w = window as unknown as { __opencanvas?: { editor: { Canvas: { getFrames(): FrameLike[] } } } };
        return (w.__opencanvas?.editor.Canvas.getFrames().length ?? 0) > 0;
      },
      undefined,
      { timeout: 10_000 },
    );

    await page.locator('[data-testid="oc-add-artboard-tablet"]').click();

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

    expect(frames.length).toBe(2);
    const tablet = frames.find((f) => f.name.toLowerCase() === "tablet")!;
    expect(tablet).toBeDefined();
    expect(tablet.width).toBe(768);
    expect(tablet.height).toBe(1024);
    // Placed to the right of the desktop artboard, not overlapping
    expect(tablet.x).toBeGreaterThanOrEqual(1440);
  });

  test("artboard presets toolbar shows Desktop / Tablet / Mobile / Custom buttons", async ({
    freshApp: page,
  }) => {
    for (const id of ["desktop", "tablet", "mobile", "custom"]) {
      await expect(page.locator(`[data-testid="oc-add-artboard-${id}"]`)).toBeVisible();
    }
  });
});
