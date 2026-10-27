import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Pictogram } from "@/survival/pictograms/Pictogram";
import { pictogramIds } from "@/survival/pictograms/catalog";
import { FIRE_SAFETY } from "@/survival/safety";
import { fireNode } from "@/survival/trees/fire";
import { NodeView } from "./NodeView";

describe("NodeView", () => {
  it("prints every safety line before the steps it governs", () => {
    const node = fireNode("fire.lay.platform");
    const html = renderToStaticMarkup(
      <NodeView
        node={node}
        kid={false}
        unlocked
        resolved={[]}
        onUnlock={() => undefined}
        onChoose={() => undefined}
        onFallback={() => undefined}
      />,
    );
    const safetyAt = html.indexOf(FIRE_SAFETY.co);
    const stepAt = html.indexOf(node.steps[0].text);
    expect(safetyAt).toBeGreaterThan(-1);
    expect(stepAt).toBeGreaterThan(safetyAt);
  });

  it("hides fire steps behind the grown-up gate in kid mode", () => {
    const node = fireNode("fire.site");
    const html = renderToStaticMarkup(
      <NodeView
        node={node}
        kid
        unlocked={false}
        resolved={[]}
        onUnlock={() => undefined}
        onChoose={() => undefined}
        onFallback={() => undefined}
      />,
    );
    expect(html).toContain("Get a grown-up");
    expect(html).not.toContain(node.steps[0].text);
    expect(html).toContain(FIRE_SAFETY.co);
  });

  it("renders a labeled svg for every pictogram id", () => {
    for (const id of pictogramIds()) {
      const html = renderToStaticMarkup(<Pictogram id={id} />);
      expect(html).toContain("aria-label");
      expect(html).toContain("<path");
    }
  });
});
