import { test, expect } from "./fixtures";
import { waitForBridge } from "./helpers";

interface OpencanvasGlobal {
  __opencanvas: {
    addHtml: (html: string) => unknown;
    getHtml: () => string;
    editor: unknown;
  };
}

/**
 * MCP polish round 1 — small tools that close real agent-workflow gaps:
 *   add_classes / remove_classes  → first-class Tailwind class manipulation
 *                                   (Story 2.7 deferral)
 *   set_text                      → change text without delete + re-add
 *   select / deselect             → drive the user's selection so they see
 *                                   what the agent is about to change
 */
test.describe("MCP polish round 1", () => {
  test("add_classes appends to a component's class list and is idempotent", async ({
    freshApp: page,
    mcp,
  }) => {
    await waitForBridge(page, mcp);
    const { componentIds } = await mcp.call<{ componentIds: string[] }>("add_components", {
      html: `<div data-test="cls" class="p-4">x</div>`,
    });
    const id = componentIds[0]!;

    const first = await mcp.call<{ classes: string[] }>("add_classes", {
      componentId: id,
      classes: ["bg-blue-500", "rounded-md"],
    });
    expect(first.classes).toEqual(expect.arrayContaining(["p-4", "bg-blue-500", "rounded-md"]));

    // Idempotent — re-adding bg-blue-500 doesn't duplicate it.
    const again = await mcp.call<{ classes: string[] }>("add_classes", {
      componentId: id,
      classes: ["bg-blue-500", "shadow-lg"],
    });
    expect(again.classes.filter((c) => c === "bg-blue-500").length).toBe(1);
    expect(again.classes).toContain("shadow-lg");
  });

  test("remove_classes deletes selected names and leaves the rest", async ({
    freshApp: page,
    mcp,
  }) => {
    await waitForBridge(page, mcp);
    const { componentIds } = await mcp.call<{ componentIds: string[] }>("add_components", {
      html: `<div data-test="rm" class="p-4 bg-red-500 rounded-md text-white">x</div>`,
    });
    const id = componentIds[0]!;

    const after = await mcp.call<{ classes: string[] }>("remove_classes", {
      componentId: id,
      classes: ["bg-red-500", "missing-class"],
    });
    expect(after.classes).not.toContain("bg-red-500");
    expect(after.classes).toContain("p-4");
    expect(after.classes).toContain("rounded-md");
    expect(after.classes).toContain("text-white");
  });

  test("set_text replaces the text content of a leaf component", async ({
    freshApp: page,
    mcp,
  }) => {
    await waitForBridge(page, mcp);
    const { componentIds } = await mcp.call<{ componentIds: string[] }>("add_components", {
      html: `<button data-test="btn" class="px-4 py-2">old label</button>`,
    });
    const id = componentIds[0]!;

    const res = await mcp.call<{ text: string }>("set_text", {
      componentId: id,
      text: "new label",
    });
    expect(res.text).toBe("new label");

    const html = await page.evaluate(() =>
      (window as unknown as OpencanvasGlobal).__opencanvas.getHtml(),
    );
    expect(html).toContain("new label");
    expect(html).not.toContain("old label");
  });

  test("select sets the editor selection and get_selection sees it", async ({
    freshApp: page,
    mcp,
  }) => {
    await waitForBridge(page, mcp);
    const { componentIds: a } = await mcp.call<{ componentIds: string[] }>("add_components", {
      html: `<div data-test="A">A</div>`,
    });
    const { componentIds: b } = await mcp.call<{ componentIds: string[] }>("add_components", {
      html: `<div data-test="B">B</div>`,
    });
    const idA = a[0]!;
    const idB = b[0]!;

    const sel = await mcp.call<{ componentIds: string[] }>("select", {
      componentIds: [idA, idB],
    });
    expect(sel.componentIds).toEqual(expect.arrayContaining([idA, idB]));

    const sel2 = await mcp.call<{ componentIds: string[] }>("get_selection", {});
    expect(sel2.componentIds).toEqual(expect.arrayContaining([idA, idB]));
  });

  test("deselect clears the editor selection", async ({ freshApp: page, mcp }) => {
    await waitForBridge(page, mcp);
    const { componentIds } = await mcp.call<{ componentIds: string[] }>("add_components", {
      html: `<div data-test="solo">solo</div>`,
    });
    const id = componentIds[0]!;

    await mcp.call("select", { componentIds: [id] });
    const before = await mcp.call<{ componentIds: string[] }>("get_selection", {});
    expect(before.componentIds).toContain(id);

    const res = await mcp.call<{ componentIds: string[] }>("deselect", {});
    expect(res.componentIds).toEqual([]);

    const after = await mcp.call<{ componentIds: string[] }>("get_selection", {});
    expect(after.componentIds).toEqual([]);
  });

  test("select with an unknown id throws a clear error", async ({ freshApp: page, mcp }) => {
    await waitForBridge(page, mcp);
    let error: string | null = null;
    try {
      await mcp.call("select", { componentIds: ["not-a-real-id"] });
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
    expect(error).not.toBeNull();
    expect(error).toMatch(/component not found/);
  });
});
