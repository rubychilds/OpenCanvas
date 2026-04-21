import { test, expect } from "./fixtures";

/**
 * ADR-0005: HTML primitives ↔ design-tool shape concepts.
 *
 * - Each InsertRail tool produces a component carrying the right
 *   `data-oc-shape` attribute and the documented Tailwind starter classes.
 * - Per-`data-oc-shape` per-frame counter names fresh inserts
 *   "{Concept} {N}".
 * - Layers tree hides GrapesJS textnode children.
 * - Layers tree label for a Text primitive shows its content (truncated).
 */

async function waitForEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { __designjs?: unknown }).__designjs !== "undefined",
    undefined,
    { timeout: 10_000 },
  );
}

interface ComponentLike {
  getAttributes?: () => Record<string, unknown>;
  get: (key: string) => unknown;
  getId?: () => string;
}

async function readWrapperChildren(
  page: import("@playwright/test").Page,
): Promise<Array<{ id: string; shape: string; classes: string; tag: string; customName: string; type: string }>> {
  return page.evaluate(() => {
    const ed = (window as unknown as {
      __designjs: {
        editor: {
          Canvas: { getFrames: () => Array<{ get: (k: string) => unknown }> };
        };
      };
    }).__designjs.editor;
    const wrapper = ed.Canvas.getFrames()[0]!.get("component") as {
      components: () => { toArray: () => unknown[] };
    };
    return wrapper.components().toArray().map((cRaw) => {
      const c = cRaw as {
        getId?: () => string;
        get: (k: string) => unknown;
        getAttributes?: () => Record<string, unknown>;
        getClasses?: () => Array<unknown>;
      };
      const attrs = c.getAttributes?.() ?? {};
      const classes = (c.getClasses?.() ?? [])
        .map((cls) => (typeof cls === "string" ? cls : (cls as { get?: (k: string) => unknown }).get?.("name")))
        .filter((s): s is string => typeof s === "string")
        .join(" ");
      return {
        id: String(c.getId?.() ?? ""),
        shape: String(attrs["data-oc-shape"] ?? ""),
        classes,
        tag: String(c.get("tagName") ?? ""),
        customName: String(c.get("custom-name") ?? ""),
        type: String(c.get("type") ?? ""),
      };
    });
  });
}

test.describe("ADR-0005: HTML primitives ↔ shape concepts", () => {
  test("InsertRail Rectangle tool inserts <div data-oc-shape=\"rectangle\">", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await page.locator('[data-testid="oc-insert-rectangle"]').click();
    const rows = await readWrapperChildren(page);
    const rect = rows.find((r) => r.shape === "rectangle");
    expect(rect).toBeDefined();
    expect(rect!.tag).toBe("div");
    expect(rect!.classes).toContain("w-32");
    expect(rect!.classes).toContain("h-32");
    expect(rect!.customName).toBe("Rectangle 1");
  });

  test("InsertRail Ellipse tool inserts <div rounded-full data-oc-shape=\"ellipse\">", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await page.locator('[data-testid="oc-insert-ellipse"]').click();
    const rows = await readWrapperChildren(page);
    const ellipse = rows.find((r) => r.shape === "ellipse");
    expect(ellipse).toBeDefined();
    expect(ellipse!.tag).toBe("div");
    expect(ellipse!.classes).toContain("rounded-full");
    expect(ellipse!.customName).toBe("Ellipse 1");
  });

  test("InsertRail Text tool inserts <p data-oc-shape=\"text\">Text</p>", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await page.locator('[data-testid="oc-insert-text"]').click();
    const rows = await readWrapperChildren(page);
    const text = rows.find((r) => r.shape === "text");
    expect(text).toBeDefined();
    expect(text!.tag).toBe("p");
    expect(text!.customName).toBe("Text 1");
  });

  test("InsertRail Image tool inserts <img data-oc-shape=\"image\">", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await page.locator('[data-testid="oc-insert-image"]').click();
    const rows = await readWrapperChildren(page);
    const image = rows.find((r) => r.shape === "image");
    expect(image).toBeDefined();
    expect(image!.tag).toBe("img");
    expect(image!.customName).toBe("Image 1");
  });

  test("Button tool no longer exists in the InsertRail", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await expect(page.locator('[data-testid="oc-insert-button"]')).toHaveCount(0);
  });

  test("Per-shape per-frame counter — two rectangles get '1' and '2'", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await page.locator('[data-testid="oc-insert-rectangle"]').click();
    await page.locator('[data-testid="oc-insert-rectangle"]').click();
    await page.locator('[data-testid="oc-insert-text"]').click(); // text gets its own counter
    await page.locator('[data-testid="oc-insert-rectangle"]').click();

    const rows = await readWrapperChildren(page);
    const rectNames = rows
      .filter((r) => r.shape === "rectangle")
      .map((r) => r.customName)
      .sort();
    const textNames = rows.filter((r) => r.shape === "text").map((r) => r.customName);

    expect(rectNames).toEqual(["Rectangle 1", "Rectangle 2", "Rectangle 3"]);
    expect(textNames).toEqual(["Text 1"]);
  });

  test("Layers tree: textnode children are hidden", async ({ freshApp: page }) => {
    await waitForEditor(page);
    await page.locator('[data-testid="oc-insert-text"]').click();

    // Text primitive's <p> contains a textnode child in the GrapesJS model;
    // the Layers tree must not render a row for it.
    const rows = await readWrapperChildren(page);
    const textComp = rows.find((r) => r.shape === "text")!;

    // Confirm the model HAS a textnode child (so we're testing real filtering,
    // not coincidence).
    const childTypes = await page.evaluate((id) => {
      const ed = (window as unknown as {
        __designjs: {
          editor: { getWrapper: () => unknown };
        };
      }).__designjs.editor;
      const findById = (root: { getId?: () => string; components?: () => { toArray: () => unknown[] } }, target: string): unknown => {
        if (root.getId?.() === target) return root;
        const stack = root.components?.().toArray() ?? [];
        for (const c of stack) {
          const found = findById(c as Parameters<typeof findById>[0], target);
          if (found) return found;
        }
        return null;
      };
      const wrapper = ed.getWrapper() as { getId?: () => string; components?: () => { toArray: () => unknown[] } };
      const target = findById(wrapper, id) as { components: () => { toArray: () => Array<{ get: (k: string) => unknown }> } } | null;
      return target?.components().toArray().map((c) => String(c.get("type"))) ?? [];
    }, textComp.id);
    expect(childTypes).toContain("textnode");

    // …but the Layers tree row for the <p> should have NO descendant
    // oc-layer-row entries (which it would if the textnode were rendered).
    const textRow = page.locator(`[data-testid="oc-layer-row-${textComp.id}"]`);
    await expect(textRow).toBeVisible();
    await expect(textRow.locator('[data-testid^="oc-layer-row-"]:not([data-testid$="' + textComp.id + '"])')).toHaveCount(0);
  });

  test("Layers tree: Text primitive label shows the content (truncated)", async ({
    freshApp: page,
  }) => {
    await waitForEditor(page);
    await page.locator('[data-testid="oc-insert-text"]').click();
    // Replace the default "Text" content with something distinct.
    await page.evaluate(() => {
      const ed = (window as unknown as {
        __designjs: { editor: { Canvas: { getFrames: () => Array<{ get: (k: string) => unknown }> } } };
      }).__designjs.editor;
      const wrapper = ed.Canvas.getFrames()[0]!.get("component") as {
        components: () => { toArray: () => Array<{ getAttributes: () => Record<string, unknown>; empty?: () => void; append: (x: unknown) => void }> };
      };
      const text = wrapper.components().toArray().find((c) => c.getAttributes()["data-oc-shape"] === "text")!;
      text.empty?.();
      text.append({ type: "textnode", content: "Hello, primitive world" });
    });

    const rows = await readWrapperChildren(page);
    const textComp = rows.find((r) => r.shape === "text")!;
    const row = page.locator(`[data-testid="oc-layer-row-${textComp.id}"]`);
    // The custom-name "Text 1" still wins per derivePrimitiveLabel's
    // precedence chain (custom-name > content > concept). Clear it so the
    // content path is exercised.
    await page.evaluate((id) => {
      const ed = (window as unknown as {
        __designjs: { editor: { Canvas: { getFrames: () => Array<{ get: (k: string) => unknown }> } } };
      }).__designjs.editor;
      const wrapper = ed.Canvas.getFrames()[0]!.get("component") as {
        components: () => { toArray: () => Array<{ getId: () => string; set: (k: string, v: unknown) => void }> };
      };
      const target = wrapper.components().toArray().find((c) => c.getId() === id)!;
      target.set("custom-name", "");
    }, textComp.id);

    await expect(row).toContainText("Hello, primitive world");
  });
});
