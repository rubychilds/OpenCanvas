import { test, expect } from "./fixtures";

interface OpencanvasGlobal {
  __designjs: {
    addHtml: (html: string) => unknown;
  };
}

/**
 * Story 1.2: Tailwind responsive prefixes (sm: / md: / lg: / xl:) apply at the
 * iframe's width breakpoints. The Tailwind v4 CDN is loaded inside the canvas
 * iframe (per editor-options.ts), so its media queries evaluate against the
 * iframe's window — resizing the iframe element forces re-evaluation.
 *
 * We use display because it's a discrete, easy-to-assert property:
 *   block (no prefix) → hidden md: → flex lg:
 * giving three distinct values across breakpoints with no oklch / colour
 * shifting noise.
 */
test.describe("Story 1.2: Tailwind responsive prefixes", () => {
  test("md: and lg: prefixes flip styles at the matching iframe widths", async ({
    freshApp: page,
  }) => {
    await page.evaluate(() =>
      (window as unknown as OpencanvasGlobal).__designjs.addHtml(
        `<div data-test="resp" class="block md:hidden lg:flex">resp</div>`,
      ),
    );

    const frame = page.frameLocator('iframe[class*="gjs-frame"]').first();
    await expect(frame.locator('[data-test="resp"]')).toBeVisible({ timeout: 5_000 });

    /**
     * Force the iframe to a specific outer width and read the iframe-window's
     * computed display for the marker. The wrapper element around the iframe
     * is also resized so GrapesJS layout doesn't override the inline width.
     */
    const displayAt = (widthPx: number): Promise<string> =>
      page.evaluate(async (w) => {
        const iframe = document.querySelector(
          'iframe[class*="gjs-frame"]',
        ) as HTMLIFrameElement | null;
        if (!iframe) throw new Error("iframe not found");
        const wrapper = iframe.closest(".gjs-frame-wrapper") as HTMLElement | null;
        if (wrapper) wrapper.style.width = `${w}px`;
        iframe.style.width = `${w}px`;
        // Two RAFs gives the iframe layout time to settle and Tailwind's
        // media-query-driven CSS to re-resolve.
        await new Promise((r) => requestAnimationFrame(() => r(undefined)));
        await new Promise((r) => requestAnimationFrame(() => r(undefined)));
        const doc = iframe.contentDocument!;
        const win = iframe.contentWindow!;
        const el = doc.querySelector('[data-test="resp"]')!;
        return win.getComputedStyle(el).display;
      }, widthPx);

    // Tailwind v4 default breakpoints: sm 640, md 768, lg 1024, xl 1280.
    const narrow = await displayAt(500); // < md → block
    const medium = await displayAt(800); // >= md, < lg → hidden
    const wide = await displayAt(1200); // >= lg → flex

    expect(narrow).toBe("block");
    expect(medium).toBe("none");
    expect(wide).toBe("flex");
  });

  test("arbitrary-value utilities resolve in the iframe", async ({ freshApp: page }) => {
    await page.evaluate(() =>
      (window as unknown as OpencanvasGlobal).__designjs.addHtml(
        `<div data-test="arb" class="w-[317px] text-[#1a5276]">arbitrary</div>`,
      ),
    );

    const frame = page.frameLocator('iframe[class*="gjs-frame"]').first();
    const el = frame.locator('[data-test="arb"]');
    await expect(el).toBeVisible({ timeout: 5_000 });

    const computed = await el.evaluate((node) => {
      const cs = window.getComputedStyle(node);
      return { width: cs.width, color: cs.color };
    });
    expect(computed.width).toBe("317px");
    expect(computed.color).toBe("rgb(26, 82, 118)"); // #1a5276 → sRGB
  });
});
