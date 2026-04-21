import { test, expect } from "./fixtures";
import { waitForBridge } from "./helpers";

interface OpencanvasGlobal {
  __designjs: {
    addHtml: (html: string) => unknown;
  };
}

/**
 * Story 6.1: get_jsx — convert canvas HTML to a JSX component string.
 * Exercised through the real bridge so the Zod schemas + handler shape are
 * validated end-to-end.
 */
test.describe("Story 6.1: get_jsx", () => {
  test("class → className, htmlFor mapping, void elements self-close", async ({
    freshApp: page,
    mcp,
  }) => {
    await waitForBridge(page, mcp);
    await page.evaluate(() =>
      (window as unknown as OpencanvasGlobal).__designjs.addHtml(
        `<form class="space-y-2"><label for="email">Email</label><input id="email" type="email" required /><br /></form>`,
      ),
    );

    const { jsx } = await mcp.call<{ jsx: string }>("get_jsx", {});

    expect(jsx).toMatch(/^export default function Component\(\)/);
    expect(jsx).toContain('className="space-y-2"');
    expect(jsx).toContain('htmlFor="email"');
    expect(jsx).not.toMatch(/\sfor=/);
    expect(jsx).not.toMatch(/\sclass=/);
    expect(jsx).toMatch(/<input[^>]*\/>/);
    expect(jsx).toMatch(/<br\s*\/>/);
    expect(jsx).toMatch(/<input[^>]*\srequired(?:\s|\/)/);
  });

  test("tailwind mode preserves classes and drops mappable inline style props", async ({
    freshApp: page,
    mcp,
  }) => {
    await waitForBridge(page, mcp);
    await page.evaluate(() =>
      (window as unknown as OpencanvasGlobal).__designjs.addHtml(
        `<div class="p-4 bg-blue-500" style="padding: 16px; box-shadow: 0 0 5px red;">hi</div>`,
      ),
    );

    const { jsx } = await mcp.call<{ jsx: string }>("get_jsx", {});

    expect(jsx).toContain('className="p-4 bg-blue-500"');
    expect(jsx).toContain("boxShadow");
    expect(jsx).toContain('"0 0 5px red"');
    // padding is in the Tailwind-mappable set → must not appear in style={{}}
    expect(jsx).not.toMatch(/style=\{\{[^}]*padding/);
  });

  test("inline mode emits a JSX style object for every CSS property", async ({
    freshApp: page,
    mcp,
  }) => {
    await waitForBridge(page, mcp);
    await page.evaluate(() =>
      (window as unknown as OpencanvasGlobal).__designjs.addHtml(
        `<div style="color: red; padding: 8px; background-color: yellow;">x</div>`,
      ),
    );

    const { jsx } = await mcp.call<{ jsx: string }>("get_jsx", { mode: "inline" });

    expect(jsx).toMatch(/style=\{\{/);
    expect(jsx).toContain('color: "red"');
    expect(jsx).toContain('padding: "8px"');
    expect(jsx).toContain('backgroundColor: "yellow"');
  });

  test("componentId scopes JSX output to that subtree only", async ({ freshApp: page, mcp }) => {
    await waitForBridge(page, mcp);
    const targetId = await page.evaluate(() => {
      const api = (window as unknown as OpencanvasGlobal).__designjs;
      const added = api.addHtml(
        `<div><h1 data-keep="yes">keep</h1><p data-drop="yes">drop</p></div>`,
      ) as Array<{
        getId: () => string;
        components: () => { toArray: () => Array<{ getId: () => string }> };
      }>;
      const wrapper = Array.isArray(added) ? added[0]! : added;
      const keep = wrapper.components().toArray()[0]!;
      return keep.getId();
    });

    const { jsx } = await mcp.call<{ jsx: string }>("get_jsx", { componentId: targetId });

    expect(jsx).toContain("keep");
    expect(jsx).not.toContain("drop");
    expect(jsx).toContain('data-keep="yes"');
  });

  test("empty canvas returns a valid component with an empty fragment", async ({
    freshApp: page,
    mcp,
  }) => {
    await waitForBridge(page, mcp);
    const { jsx } = await mcp.call<{ jsx: string }>("get_jsx", {});
    expect(jsx).toMatch(/export default function Component/);
    expect(jsx).toContain("<></>");
  });
});
