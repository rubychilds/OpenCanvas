import { test, expect } from "./fixtures";
import { waitForBridge } from "./helpers";

interface PasteApi {
  __opencanvas: {
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
 * the canvas iframe contentWindow. The window.__opencanvas.paste(html) test
 * hook routes through the same importPastedHtml function the listener calls,
 * so exercising the hook validates the end-to-end import behaviour without
 * the cross-browser ClipboardEvent constructor footgun.
 */
test.describe("Story 3.1: clipboard HTML paste", () => {
  test("paste flat HTML adds the component to the canvas", async ({ freshApp: page }) => {
    await page.evaluate(() =>
      (window as unknown as PasteApi).__opencanvas.paste(
        `<div data-marker="paste-flat" class="p-4">hello from paste</div>`,
      ),
    );

    const html = await page.evaluate(() =>
      (window as unknown as PasteApi).__opencanvas.getHtml(),
    );
    expect(html).toContain('data-marker="paste-flat"');
    expect(html).toContain("hello from paste");
    expect(html).toContain('class="p-4"');
  });

  test("paste preserves nested flex layout hierarchy", async ({ freshApp: page, mcp }) => {
    await waitForBridge(page, mcp);

    await page.evaluate(() =>
      (window as unknown as PasteApi).__opencanvas.paste(
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
      const api = (window as unknown as PasteApi).__opencanvas;
      const added = api.addHtml(
        `<div data-paste-host="parent" class="grid"></div>`,
      ) as AddedComponent[];
      const parent = Array.isArray(added) ? added[0]! : (added as AddedComponent);
      api.editor.select(parent);
    });

    await page.evaluate(() =>
      (window as unknown as PasteApi).__opencanvas.paste(
        `<span data-pasted-child="x">child via paste</span>`,
      ),
    );

    const html = await page.evaluate(() =>
      (window as unknown as PasteApi).__opencanvas.getHtml(),
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
      (window as unknown as PasteApi).__opencanvas.paste(
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
      (window as unknown as PasteApi).__opencanvas.getHtml(),
    );

    await page.evaluate(() =>
      (window as unknown as PasteApi).__opencanvas.paste(""),
    );
    await page.evaluate(() =>
      (window as unknown as PasteApi).__opencanvas.paste("   \n  "),
    );

    const afterHtml = await page.evaluate(() =>
      (window as unknown as PasteApi).__opencanvas.getHtml(),
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
      (window as unknown as PasteApi).__opencanvas.getHtml(),
    );
    expect(html).toContain('data-event-paste="ok"');
  });
});
