import { useRef } from "react";
import type { KeyboardEvent, PointerEvent, SyntheticEvent } from "react";
import { Pictogram } from "@/survival/pictograms/Pictogram";
import type { Node, Option, ResolvedSubstitution } from "@/survival/types";

export function nodeIsGated(node: Node): boolean {
  return Boolean(node.danger || node.steps.some((step) => step.danger));
}

export function NodeView({
  node,
  kid,
  unlocked,
  resolved,
  onUnlock,
  onChoose,
  onFallback,
}: {
  node: Node;
  kid: boolean;
  unlocked: boolean;
  resolved: ResolvedSubstitution[];
  onUnlock: () => void;
  onChoose: (option: Option) => void;
  onFallback: (nodeId: string) => void;
}) {
  const gated = kid && !unlocked && nodeIsGated(node);
  return (
    <article className="flex flex-col gap-4" data-node={node.id}>
      {node.header ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-fg">{node.header}</p>
      ) : null}
      <div className="flex items-start gap-3">
        <Pictogram id={node.pictogram} className="pic size-12 shrink-0 text-accent" />
        <h1 className="font-display text-3xl leading-none tracking-wide text-fg">
          {kid ? node.kid_text : node.text}
        </h1>
      </div>
      {node.safety && node.safety.length > 0 ? (
        <ul className="flex flex-col gap-2" data-safety="true">
          {node.safety.map((line) => (
            <li
              key={line}
              className="flex gap-3 rounded-xl border border-line bg-surface px-3 py-3 text-fg"
            >
              <Pictogram id="warning" className="pic size-10 shrink-0 text-accent" />
              <p>{line}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {gated ? (
        <GrownupGate onUnlock={onUnlock} />
      ) : (
        <>
          {node.steps.length > 0 ? (
            <ol className="flex flex-col gap-3" data-steps="true">
              {node.steps.map((item, index) => (
                <li key={item.id} className="flex gap-3 rounded-xl bg-surface px-3 py-3">
                  <span className="font-display text-2xl text-accent">{index + 1}</span>
                  <Pictogram id={item.pictogram} className="pic size-10 shrink-0" />
                  <p>{kid ? item.kid_text : item.text}</p>
                </li>
              ))}
            </ol>
          ) : null}
          {resolved.length > 0 ? (
            <ul className="flex flex-col gap-3" data-substitutions="true">
              {resolved.map((item) => (
                <li key={item.substitutionId} className="rounded-xl border border-line px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Pictogram id={item.pictogram} className="pic size-10 shrink-0 text-accent" />
                    <p className="font-display text-2xl tracking-wide">
                      {item.status === "alternative" ? item.item : "No-gear method"}
                    </p>
                  </div>
                  {item.how_to ? <p className="mt-2 text-fg">{item.how_to}</p> : null}
                  {item.caveats ? <p className="mt-2 text-muted">{item.caveats}</p> : null}
                  {item.status === "fallback" && item.fallback_node ? (
                    <button
                      type="button"
                      className="tap-target mt-3 rounded-xl bg-accent px-4 text-accent-fg"
                      onClick={() => onFallback(item.fallback_node!)}
                    >
                      Open the no-gear method
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {node.sources && node.sources.length > 0 ? (
            <p className="text-sm text-muted">{node.sources.join(" ")}</p>
          ) : null}
        </>
      )}
      {!gated && node.options.length > 0 ? (
        <div className="sticky bottom-0 z-10 flex flex-col gap-2 bg-bg pt-2 pb-1">
          {node.options.map((option) => (
            <button
              key={option.id}
              type="button"
              className="tap-target flex items-center gap-3 rounded-xl bg-accent px-4 text-left text-accent-fg"
              onClick={() => onChoose(option)}
            >
              <Pictogram id={option.pictogram} className="pic size-10 shrink-0" />
              <span className="font-display text-2xl tracking-wide">
                {kid ? option.kid_label : option.label}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {!gated && node.type === "terminal" ? (
        <p className="text-muted" data-terminal="true">
          End of this path.
        </p>
      ) : null}
    </article>
  );
}

function GrownupGate({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-4" data-testid="grownup-gate">
      <div className="flex items-center gap-3">
        <Pictogram id="adult" className="pic size-12 text-accent" />
        <p className="font-display text-3xl tracking-wide">Get a grown-up</p>
      </div>
      <p className="mt-2 text-fg">This step can burn or cut. A grown-up holds to show it.</p>
      <HoldButton label="Press and hold to show the steps" onConfirm={onUnlock} />
    </div>
  );
}

function HoldButton({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const frame = useRef(0);
  const start = (event: PointerEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) => {
    if ("key" in event && event.key !== " " && event.key !== "Enter") return;
    if ("repeat" in event && event.repeat) return;
    event.preventDefault();
    const button = event.currentTarget;
    const t0 = performance.now();
    cancelAnimationFrame(frame.current);
    const tick = (now: number) => {
      const amount = Math.min(1, (now - t0) / 1000);
      button.style.setProperty("--hold", String(amount));
      if (amount >= 1) {
        onConfirm();
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };
  const stop = (event: SyntheticEvent<HTMLButtonElement>) => {
    cancelAnimationFrame(frame.current);
    event.currentTarget.style.setProperty("--hold", "0");
  };
  return (
    <button
      type="button"
      className="tap-target mt-4 w-full rounded-xl bg-accent px-4 text-accent-fg"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={start}
      onKeyUp={stop}
    >
      {label}
    </button>
  );
}
