import { test, expect } from "./fixtures";
import { waitForBridge } from "./helpers";

interface VarsApi {
  __designjs: {
    getVariables: () => Record<string, string>;
    setVariables: (vars: Record<string, string>) => Record<string, string>;
    editor: {
      Canvas: { getDocument: () => Document | undefined };
    };
  };
}

/**
 * Story 6.2 (MCP portion): get_variables / set_variables.
 * UI panel is the parallel stream's responsibility — these tests exercise
 * only the bridge tools and the .designjs.json round-trip behaviour.
 */
test.describe("Story 6.2 (MCP): CSS variables", () => {
  test("set_variables writes to iframe :root and get_variables reads it back", async ({
    freshApp: page,
    mcp,
  }) => {
    await waitForBridge(page, mcp);

    const set = await mcp.call<{ variables: Record<string, string> }>("set_variables", {
      variables: {
        "--brand-primary": "rebeccapurple",
        "--space-gutter": "24px",
      },
    });
    expect(set.variables["--brand-primary"]).toBe("rebeccapurple");
    expect(set.variables["--space-gutter"]).toBe("24px");

    const got = await mcp.call<{ variables: Record<string, string> }>("get_variables", {});
    expect(got.variables).toEqual(set.variables);

    // Variables actually applied to the iframe :root, not just stored in memory.
    const live = await page.evaluate(() => {
      const doc = (window as unknown as VarsApi).__designjs.editor.Canvas.getDocument();
      const root = doc?.documentElement;
      return {
        brand: root ? root.style.getPropertyValue("--brand-primary").trim() : "",
        gutter: root ? root.style.getPropertyValue("--space-gutter").trim() : "",
      };
    });
    expect(live.brand).toBe("rebeccapurple");
    expect(live.gutter).toBe("24px");
  });

  test("set_variables merges into the existing set (does not replace)", async ({
    freshApp: page,
    mcp,
  }) => {
    await waitForBridge(page, mcp);

    await mcp.call("set_variables", { variables: { "--a": "1", "--b": "2" } });
    const merged = await mcp.call<{ variables: Record<string, string> }>("set_variables", {
      variables: { "--b": "twenty", "--c": "3" },
    });
    expect(merged.variables).toEqual({ "--a": "1", "--b": "twenty", "--c": "3" });
  });

  test("variables survive a page reload via .designjs.json", async ({ freshApp: page, mcp }) => {
    await waitForBridge(page, mcp);

    await mcp.call("set_variables", {
      variables: { "--brand-primary": "oklch(0.55 0.2 260)" },
    });
    // Force a save so .designjs.json is written before we reload.
    await page.keyboard.press("Meta+s");
    await expect(page.locator('[data-testid="oc-save-status"]')).toHaveText("Saved", {
      timeout: 5_000,
    });

    await page.reload();
    await page.waitForFunction(
      () => typeof (window as unknown as { __designjs?: unknown }).__designjs !== "undefined",
      undefined,
      { timeout: 20_000 },
    );
    await waitForBridge(page, mcp);

    const after = await mcp.call<{ variables: Record<string, string> }>("get_variables", {});
    expect(after.variables["--brand-primary"]).toBe("oklch(0.55 0.2 260)");

    // Also verify it's actually live on the iframe :root post-reload.
    const live = await page.evaluate(() => {
      const doc = (window as unknown as VarsApi).__designjs.editor.Canvas.getDocument();
      return doc?.documentElement.style.getPropertyValue("--brand-primary").trim() ?? "";
    });
    expect(live).toBe("oklch(0.55 0.2 260)");
  });
});
