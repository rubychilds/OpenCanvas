import { test, expect } from "./fixtures";
import { waitForBridge } from "./helpers";

interface PasteApi {
  __designjs: {
    paste: (html: string) => unknown;
    addHtml: (html: string) => unknown;
    getHtml: () => string;
    editor: { select: (component: unknown) => void };
  };
}

interface AddedComponent {
  getId: () => string;
}

/**
 * Story 3.1: clipboard HTML paste — `attachPasteImport` listens on window and
 * the canvas iframe contentWindow. The window.__designjs.paste(html) test
 * hook routes through the same importPastedHtml function the listener calls,
 * so exercising the hook validates the end-to-end import behaviour without
 * the cross-browser ClipboardEvent constructor footgun.
 */
test.describe("Story 3.1: clipboard HTML paste", () => {
  test("paste flat HTML adds the component to the canvas", async ({ freshApp: page }) => {
    await page.evaluate(() =>
      (window as unknown as PasteApi).__designjs.paste(
        `<div data-marker="paste-flat" class="p-4">hello from paste</div>`,
      ),
    );

    const html = await page.evaluate(() =>
      (window as unknown as PasteApi).__designjs.getHtml(),
    );
    expect(html).toContain('data-marker="paste-flat"');
    expect(html).toContain("hello from paste");
    expect(html).toContain('class="p-4"');
  });

  test("paste preserves nested flex layout hierarchy", async ({ freshApp: page, mcp }) => {
    await waitForBridge(page, mcp);

    await page.evaluate(() =>
      (window as unknown as PasteApi).__designjs.paste(
        `<div data-paste="root" class="flex gap-2"><span data-paste="a">a</span><span data-paste="b">b</span></div>`,
      ),
    );

    interface TreeNode {
      tagName?: string;
      attributes: Record<string, string>;
      children: TreeNode[];
    }
    const tree = await mcp.call<{ root: TreeNode }>("get_tree", {});
    const root = tree.root.children.find((c) => c.attributes["data-paste"] === "root");
    expect(root).toBeDefined();
    expect(root!.children.length).toBe(2);
    expect(root!.children[0]!.attributes["data-paste"]).toBe("a");
    expect(root!.children[1]!.attributes["data-paste"]).toBe("b");
    expect(root!.children[0]!.tagName).toBe("span");
  });

  test("paste with a selected component appends as child of that component", async ({
    freshApp: page,
  }) => {
    await page.evaluate(() => {
      const api = (window as unknown as PasteApi).__designjs;
      const added = api.addHtml(
        `<div data-paste-host="parent" class="grid"></div>`,
      ) as AddedComponent[];
      const parent = Array.isArray(added) ? added[0]! : (added as AddedComponent);
      api.editor.select(parent);
    });

    await page.evaluate(() =>
      (window as unknown as PasteApi).__designjs.paste(
        `<span data-pasted-child="x">child via paste</span>`,
      ),
    );

    const html = await page.evaluate(() =>
      (window as unknown as PasteApi).__designjs.getHtml(),
    );
    // Parent must wrap the pasted child — i.e. the child appears inside the parent's tag.
    expect(html).toMatch(
      /<div[^>]*data-paste-host="parent"[^>]*>[^<]*<span[^>]*data-pasted-child="x"/,
    );
  });

  test("paste with Tailwind classes resolves utility styling on the canvas", async ({
    freshApp: page,
  }) => {
    await page.evaluate(() =>
      (window as unknown as PasteApi).__designjs.paste(
        `<div data-paste-tw="ok" class="bg-blue-500 p-4 text-white">tailwind paste</div>`,
      ),
    );

    const frame = page.frameLocator('iframe[class*="gjs-frame"]');
    const el = frame.locator('[data-paste-tw="ok"]');
    await expect(el).toBeVisible();
    const bg = await el.evaluate((node) => window.getComputedStyle(node).backgroundColor);
    // Tailwind v4 oklch blue-500 resolves to roughly rgb(43, 127, 255) in sRGB.
    // Just assert it's a non-default colour rather than locking in oklch shifts.
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
    expect(bg).not.toBe("rgb(255, 255, 255)");
  });

  test("paste with empty/plain-text clipboard is a silent no-op", async ({ freshApp: page }) => {
    const beforeHtml = await page.evaluate(() =>
      (window as unknown as PasteApi).__designjs.getHtml(),
    );

    await page.evaluate(() =>
      (window as unknown as PasteApi).__designjs.paste(""),
    );
    await page.evaluate(() =>
      (window as unknown as PasteApi).__designjs.paste("   \n  "),
    );

    const afterHtml = await page.evaluate(() =>
      (window as unknown as PasteApi).__designjs.getHtml(),
    );
    expect(afterHtml).toBe(beforeHtml);
  });

  test("a real ClipboardEvent on window with text/html triggers an import", async ({
    freshApp: page,
  }) => {
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData("text/html", '<div data-event-paste="ok">via event</div>');
      const ev = new ClipboardEvent("paste", {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(ev);
    });

    const html = await page.evaluate(() =>
      (window as unknown as PasteApi).__designjs.getHtml(),
    );
    expect(html).toContain('data-event-paste="ok"');
  });

  test("Figma binary clipboard payload is refused with a CustomEvent + console.warn", async ({
    freshApp: page,
  }) => {
    // Real Figma payload shape: two empty spans carrying the fig-kiwi binary
    // in HTML comments inside data-* attributes. We don't decode it; we detect
    // the marker and refuse the import.
    const figmaHtml =
      '<span data-metadata="<!--(figmeta)eyJmaWxlS2V5IjoiYWJjIn0=(/figmeta)-->"></span>' +
      '<span data-buffer="<!--(figma)ZmlnL3RrL2t3aQ==(/figma)-->"></span>';

    const beforeHtml = await page.evaluate(() =>
      (window as unknown as PasteApi).__designjs.getHtml(),
    );

    // Capture the CustomEvent + console.warn that the handler emits.
    const result = await page.evaluate((html) => {
      const events: Array<{ reason: string; message: string }> = [];
      const warns: string[] = [];
      const onEvent = (ev: Event) => {
        const detail = (ev as CustomEvent).detail as { reason: string; message: string };
        events.push(detail);
      };
      window.addEventListener("designjs:paste-blocked", onEvent);
      const originalWarn = console.warn;
      console.warn = (...args: unknown[]) => {
        warns.push(args.map(String).join(" "));
        originalWarn.apply(console, args as []);
      };
      try {
        (window as unknown as { __designjs: { paste: (s: string) => unknown } }).__designjs.paste(html);
      } finally {
        window.removeEventListener("designjs:paste-blocked", onEvent);
        console.warn = originalWarn;
      }
      return { events, warns };
    }, figmaHtml);

    expect(result.events.length).toBe(1);
    expect(result.events[0]!.reason).toBe("figma-binary");
    expect(result.events[0]!.message).toMatch(/Figma/);
    expect(result.warns.some((w) => /Figma/.test(w))).toBe(true);

    // Canvas must be unchanged — the binary payload was NOT added.
    const afterHtml = await page.evaluate(() =>
      (window as unknown as PasteApi).__designjs.getHtml(),
    );
    expect(afterHtml).toBe(beforeHtml);
    expect(afterHtml).not.toContain("(figma)");
    expect(afterHtml).not.toContain("data-buffer");
  });
});
