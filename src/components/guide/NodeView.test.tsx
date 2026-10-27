import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Pictogram } from "@/survival/pictograms/Pictogram";
import { pictogramIds } from "@/survival/pictograms/catalog";
import { FIRE_SAFETY } from "@/survival/safety";
import { fireNode } from "@/survival/trees/fire";
import { NodeView } from "./NodeView";
import { loadGlossary, loadSkills } from "@/survival/skills/load";

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

  it("hides a danger skill and its nested steps until the node is unlocked", () => {
    const node = fireNode("fire.hypothermia");
    const html = renderToStaticMarkup(
      <NodeView
        node={node}
        kid
        unlocked={false}
        resolved={[]}
        skills={loadSkills()}
        glossary={loadGlossary()}
        expanded={["fire.hypothermia--h4--keep_fire_going", "fire.hypothermia--h4--keep_fire_going--4--fire_co_safety"]}
        onUnlock={() => undefined}
        onChoose={() => undefined}
        onFallback={() => undefined}
      />,
    );
    expect(html).toContain("Show me how: Keep a fire going");
    expect(html).toContain("disabled");
    expect(html).toContain("Get a grown-up: hold 3 seconds");
    expect(html).toContain("A small fire close by.");
    expect(html).not.toContain("Open a gap so air hits the base.");
    expect(html).not.toContain("Do not light a fire in a closed tent.");
  });

  it("expands a nested skill to depth 3 when those panels are open", () => {
    const node = fireNode("fire.materials");
    const html = renderToStaticMarkup(
      <NodeView
        node={node}
        kid={false}
        unlocked
        resolved={[]}
        skills={loadSkills()}
        glossary={loadGlossary()}
        expanded={[
          "fire.materials--m4--process_fatwood",
          "fire.materials--m4--process_fatwood--0--baton_knife",
          "fire.materials--m4--process_fatwood--0--baton_knife--0--hold_knife_safely",
        ]}
        onUnlock={() => undefined}
        onChoose={() => undefined}
        onFallback={() => undefined}
      />,
    );
    expect(html).toContain("Split the pine knot to the shiny core.");
    expect(html).toContain("Grip the knife the safe way.");
    expect(html).toContain("Cut away from your legs.");
    expect(html).toContain('aria-expanded="true"');
  });

  it("renders a labeled svg for every pictogram id", () => {
    for (const id of pictogramIds()) {
      const html = renderToStaticMarkup(<Pictogram id={id} />);
      expect(html).toContain("aria-label");
      expect(html).toContain("<path");
    }
  });
});
