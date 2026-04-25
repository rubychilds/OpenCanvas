import { describe, it, expect } from "vitest";
import {
  compositeTiles,
  type CaptureTile,
  type CompositeCanvas,
} from "../screenshot-stitcher";

/**
 * Compositor maths — ADR-0012 §1 hybrid backplate. Verifies tiles are
 * drawn at the correct DPR-scaled offsets and that the canvas is sized
 * `totalWidth × totalHeight` in CSS px (DPR scaling preserved).
 *
 * Uses the injected `loadImage` / `createCanvas` / `toDataUrl` deps so
 * we don't need a real DOM canvas2d implementation (jsdom doesn't ship
 * one). Production callers pass no deps and get the real DOM ones.
 */
describe("compositeTiles", () => {
  function makeStubs(imageDimensions = { width: 1280, height: 720 }) {
    const drawCalls: unknown[][] = [];
    const recordedSize = { width: 0, height: 0 };

    const ctx = {
      drawImage: (...args: unknown[]) => {
        drawCalls.push(args);
      },
    } as unknown as CanvasRenderingContext2D;

    const fakeCanvas = {
      get width() {
        return recordedSize.width;
      },
      set width(v: number) {
        recordedSize.width = v;
      },
      get height() {
        return recordedSize.height;
      },
      set height(v: number) {
        recordedSize.height = v;
      },
      getContext: () => ctx,
      toDataURL: () => "data:image/png;base64,STUB",
    } as unknown as HTMLCanvasElement;

    return {
      drawCalls,
      size: recordedSize,
      deps: {
        createCanvas: (w: number, h: number): CompositeCanvas => {
          (fakeCanvas as { width: number }).width = w;
          (fakeCanvas as { height: number }).height = h;
          return fakeCanvas;
        },
        loadImage: async (_src: string) => imageDimensions,
        toDataUrl: async (_c: CompositeCanvas) => "data:image/png;base64,STUB",
      },
    };
  }

  it("sizes the canvas to totalWidth × totalHeight scaled by DPR", async () => {
    const stubs = makeStubs();
    const tiles: CaptureTile[] = [
      { y: 0, height: 720, image: "data:image/png;base64,A" },
    ];
    await compositeTiles(
      tiles,
      { totalWidth: 1280, totalHeight: 720, dpr: 2 },
      stubs.deps,
    );
    expect(stubs.size.width).toBe(2560);
    expect(stubs.size.height).toBe(1440);
  });

  it("draws each tile at its DPR-scaled y offset", async () => {
    const stubs = makeStubs();
    const tiles: CaptureTile[] = [
      { y: 0, height: 720, image: "data:image/png;base64,A" },
      { y: 720, height: 720, image: "data:image/png;base64,B" },
      { y: 1440, height: 360, image: "data:image/png;base64,C" }, // trailing partial
    ];
    await compositeTiles(
      tiles,
      { totalWidth: 1280, totalHeight: 1800, dpr: 1 },
      stubs.deps,
    );
    expect(stubs.drawCalls).toHaveLength(3);
    // ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) — index 6 is dy
    expect(stubs.drawCalls[0]![6]).toBe(0);
    expect(stubs.drawCalls[1]![6]).toBe(720);
    expect(stubs.drawCalls[2]![6]).toBe(1440);
  });

  it("applies DPR to both source and destination heights so trailing partial tiles render correctly", async () => {
    const stubs = makeStubs();
    const tiles: CaptureTile[] = [
      { y: 0, height: 480, image: "data:image/png;base64,trailing" },
    ];
    await compositeTiles(
      tiles,
      { totalWidth: 1280, totalHeight: 480, dpr: 2 },
      stubs.deps,
    );
    // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
    expect(stubs.drawCalls[0]![4]).toBe(960); // sh — 480 css-px × 2 dpr
    expect(stubs.drawCalls[0]![8]).toBe(960); // dh
  });

  it("throws on zero or negative dimensions", async () => {
    const stubs = makeStubs();
    await expect(
      compositeTiles([], { totalWidth: 0, totalHeight: 100, dpr: 1 }, stubs.deps),
    ).rejects.toThrow(/positive/);
  });

  it("returns the data URL produced by the toDataUrl dep", async () => {
    const stubs = makeStubs();
    const out = await compositeTiles(
      [{ y: 0, height: 100, image: "data:image/png;base64,A" }],
      { totalWidth: 100, totalHeight: 100, dpr: 1 },
      stubs.deps,
    );
    expect(out).toBe("data:image/png;base64,STUB");
  });
});
