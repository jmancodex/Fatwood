import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent, SyntheticEvent } from "react";
import { Pictogram } from "@/survival/pictograms/Pictogram";
import type { Glossary, GlossaryEntry, Skill } from "@/survival/skills/types";
import { skillById, skillIsDangerous } from "@/survival/skills/graph";
import type { Node, Option, ResolvedSubstitution, Step } from "@/survival/types";

export function nodeIsGated(node: Node): boolean {
  return Boolean(node.danger || node.steps.some((step) => step.danger));
}

const EMPTY_GLOSSARY: Glossary = { entries: [], watch: [] };

export function NodeView({
  node,
  kid,
  unlocked,
  resolved,
  skills = [],
  glossary = EMPTY_GLOSSARY,
  expanded = [],
  onToggleSkill = () => undefined,
  onUnlock,
  onChoose,
  onFallback,
}: {
  node: Node;
  kid: boolean;
  unlocked: boolean;
  resolved: ResolvedSubstitution[];
  skills?: Skill[];
  glossary?: Glossary;
  expanded?: string[];
  onToggleSkill?: (key: string) => void;
  onUnlock: () => void;
  onChoose: (option: Option) => void;
  onFallback: (nodeId: string) => void;
}) {
  const byId = skillById(skills);
  const gated = kid && !unlocked && nodeIsGated(node);
  const skillGate =
    kid && !unlocked && node.steps.some((step) => step.skill && skillIsDangerous(step.skill, byId));
  const arm = useRef<string | null>(null);
  const [solo, setSolo] = useState<string | null>(null);

  function toggle(key: string) {
    const opening = !expanded.includes(key);
    if (opening) {
      arm.current = key;
      pulse(15);
    }
    onToggleSkill(key);
  }

  if (solo) {
    const skill = byId.get(solo);
    return (
      <article className="flex flex-col gap-4" data-skill-screen={solo}>
        <button type="button" className="tap-target rounded-xl border border-line px-4" onClick={() => setSolo(null)}>
          Back to the step
        </button>
        {skill ? (
          <SkillBody
            skill={skill}
            path={solo}
            kid={kid}
            glossary={glossary}
            locked={kid && !unlocked && skill.danger !== "none"}
            arm={arm}
          />
        ) : (
          <p>That skill is not in this guide.</p>
        )}
      </article>
    );
  }

  return (
    <article className="flex flex-col gap-4" data-node={node.id}>
      {node.header ? <p className="rounded-xl border border-line bg-surface px-4 py-3 text-fg">{node.header}</p> : null}
      <div className="flex items-start gap-3">
        <Pictogram id={node.pictogram} className="pic size-12 shrink-0 text-accent" />
        <h1 className="font-display text-3xl leading-none tracking-wide text-fg">{kid ? node.kid_text : node.text}</h1>
      </div>
      {node.safety && node.safety.length > 0 ? (
        <ul className="flex flex-col gap-2" data-safety="true">
          {node.safety.map((line) => (
            <li key={line} className="flex gap-3 rounded-xl border border-line bg-surface px-3 py-3 text-fg">
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
                <StepRow
                  key={item.id}
                  item={item}
                  index={index}
                  nodeId={node.id}
                  kid={kid}
                  unlocked={unlocked}
                  glossary={glossary}
                  byId={byId}
                  expanded={expanded}
                  arm={arm}
                  onToggle={toggle}
                  onOpenSolo={setSolo}
                />
              ))}
            </ol>
          ) : null}
          {skillGate ? <GrownupGate onUnlock={onUnlock} /> : null}
          {resolved.length > 0 ? (
            <ul className="flex flex-col gap-3" data-substitutions="true">
              {resolved.map((item) => (
                <li key={item.substitutionId} className="rounded-xl border border-line px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Pictogram id={item.pictogram} className="pic size-10 shrink-0 text-accent" />
                    <p className="font-display text-2xl tracking-wide">{item.status === "alternative" ? item.item : "No-gear method"}</p>
                  </div>
                  {item.how_to ? <p className="mt-2 text-fg">{item.how_to}</p> : null}
                  {item.caveats ? <p className="mt-2 text-muted">{item.caveats}</p> : null}
                  {item.status === "fallback" && item.fallback_node ? (
                    <button type="button" className="tap-target mt-3 rounded-xl bg-accent px-4 text-accent-fg" onClick={() => onFallback(item.fallback_node!)}>
                      Open the no-gear method
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {node.sources && node.sources.length > 0 ? <p className="text-sm text-muted">{node.sources.join(" ")}</p> : null}
        </>
      )}
      {!gated && node.options.length > 0 ? (
        <ActionBar>
          {node.options.map((option) => (
            <button
              key={option.id}
              type="button"
              className="tap-target flex items-center gap-3 rounded-xl bg-accent px-4 text-left text-accent-fg"
              onClick={() => onChoose(option)}
            >
              <Pictogram id={option.pictogram} className="pic size-10 shrink-0" />
              <span className="font-display text-2xl tracking-wide">{kid ? option.kid_label : option.label}</span>
            </button>
          ))}
        </ActionBar>
      ) : null}
      {!gated && node.type === "terminal" ? (
        <p className="text-muted" data-terminal="true">
          End of this path.
        </p>
      ) : null}
    </article>
  );
}

function StepRow({
  item,
  index,
  nodeId,
  kid,
  unlocked,
  glossary,
  byId,
  expanded,
  arm,
  onToggle,
  onOpenSolo,
}: {
  item: Step;
  index: number;
  nodeId: string;
  kid: boolean;
  unlocked: boolean;
  glossary: Glossary;
  byId: Map<string, Skill>;
  expanded: string[];
  arm: { current: string | null };
  onToggle: (key: string) => void;
  onOpenSolo: (id: string) => void;
}) {
  const skill = item.skill ? byId.get(item.skill) : undefined;
  const key = `${nodeId}--${item.id}--${item.skill ?? "step"}`;
  const locked = Boolean(skill && kid && !unlocked && skill.danger !== "none");
  const hold = useHold(500, Boolean(skill) && !locked, () => onToggle(key));
  return (
    <li className="hold-host flex gap-3 rounded-xl bg-surface px-3 py-3" data-step={`${nodeId}.${item.id}`} {...hold}>
      <span className="hold-spot font-display text-2xl text-accent" data-hold-handle="true" aria-hidden="true">
        <span className="hold-ring" />
        {index + 1}
      </span>
      <Pictogram id={item.pictogram} className="pic size-10 shrink-0" />
      <div className="min-w-0 flex-1">
        <p>
          <GlossaryText text={kid ? item.kid_text : item.text} glossary={glossary} kid={kid} />
        </p>
        {skill ? (
          <SkillBranch
            skill={skill}
            path={key}
            depth={1}
            ancestorDanger={false}
            kid={kid}
            unlocked={unlocked}
            glossary={glossary}
            byId={byId}
            expanded={expanded}
            arm={arm}
            onToggle={onToggle}
            onOpenSolo={onOpenSolo}
          />
        ) : null}
      </div>
    </li>
  );
}

function SkillBranch({
  skill,
  path,
  depth,
  ancestorDanger,
  kid,
  unlocked,
  glossary,
  byId,
  expanded,
  arm,
  onToggle,
  onOpenSolo,
}: {
  skill: Skill;
  path: string;
  depth: number;
  ancestorDanger: boolean;
  kid: boolean;
  unlocked: boolean;
  glossary: Glossary;
  byId: Map<string, Skill>;
  expanded: string[];
  arm: { current: string | null };
  onToggle: (key: string) => void;
  onOpenSolo: (id: string) => void;
}) {
  const locked = kid && !unlocked && (ancestorDanger || skill.danger !== "none");
  const open = expanded.includes(path) && !locked;
  const panelId = `skill-panel-${path}`;
  if (depth > 3) {
    return (
      <button type="button" className="tap-target mt-3 w-full rounded-xl border border-line px-4 text-left" onClick={() => onOpenSolo(skill.id)} onPointerDown={(event) => event.stopPropagation()}>
        Open {skill.title}
      </button>
    );
  }
  return (
    <div className="mt-3">
      <button
        type="button"
        className="show-me tap-target flex w-full items-center gap-3 rounded-xl border border-line px-3 text-left"
        aria-expanded={open}
        aria-controls={panelId}
        disabled={locked}
        onClick={() => onToggle(path)}
        onFocus={(event) => liftAboveBar(event.currentTarget)}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span aria-hidden="true">
          <Pictogram id="teach" className="pic size-10 shrink-0 text-accent" />
        </span>
        <span className="font-display text-2xl tracking-wide">Show me how: {skill.title}</span>
      </button>
      {open ? (
        <div id={panelId} className="mt-3 flex flex-col gap-3 border-l border-line pl-3">
          <SkillBody skill={skill} path={path} kid={kid} glossary={glossary} locked={false} arm={arm} />
          {skill.steps.map((step, index) =>
            step.skill ? (
              <NestedSkill
                key={`${path}--${step.skill}--${index}`}
                parent={path}
                skillId={step.skill}
                at={index}
                depth={depth + 1}
                ancestorDanger={skill.danger !== "none" || ancestorDanger}
                kid={kid}
                unlocked={unlocked}
                glossary={glossary}
                byId={byId}
                expanded={expanded}
                arm={arm}
                onToggle={onToggle}
                onOpenSolo={onOpenSolo}
              />
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}

function NestedSkill(props: {
  parent: string;
  skillId: string;
  at: number;
  depth: number;
  ancestorDanger: boolean;
  kid: boolean;
  unlocked: boolean;
  glossary: Glossary;
  byId: Map<string, Skill>;
  expanded: string[];
  arm: { current: string | null };
  onToggle: (key: string) => void;
  onOpenSolo: (id: string) => void;
}) {
  const skill = props.byId.get(props.skillId);
  if (!skill) return null;
  return (
    <SkillBranch
      skill={skill}
      path={`${props.parent}--${props.at}--${skill.id}`}
      depth={props.depth}
      ancestorDanger={props.ancestorDanger}
      kid={props.kid}
      unlocked={props.unlocked}
      glossary={props.glossary}
      byId={props.byId}
      expanded={props.expanded}
      arm={props.arm}
      onToggle={props.onToggle}
      onOpenSolo={props.onOpenSolo}
    />
  );
}

function SkillBody({
  skill,
  path,
  kid,
  glossary,
  locked,
  arm,
}: {
  skill: Skill;
  path: string;
  kid: boolean;
  glossary: Glossary;
  locked: boolean;
  arm: { current: string | null };
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (arm.current === path && heading.current) {
      heading.current.focus();
      liftAboveBar(heading.current);
      arm.current = null;
    }
  }, [arm, path]);
  if (locked) return null;
  return (
    <div data-skill={skill.id}>
      <h2 ref={heading} tabIndex={-1} id={`skill-title-${path}`} className="font-display text-2xl tracking-wide outline-none">
        {skill.title}
      </h2>
      {kid ? <p className="text-muted">{skill.kid_text}</p> : null}
      {skill.safety.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-2" data-skill-safety="true">
          {skill.safety.map((line) => (
            <li key={line} className="flex gap-3 rounded-xl border border-line px-3 py-3">
              <Pictogram id="warning" className="pic size-8 shrink-0 text-accent" />
              <p>{line}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <ol className="mt-2 flex flex-col gap-2">
        {skill.steps.map((step, index) => (
          <li key={`${step.text}-${index}`} className="flex gap-3">
            <span className="font-display text-xl text-accent">{index + 1}</span>
            <Pictogram id={step.pictogram} className="pic size-8 shrink-0" />
            <p>
              <GlossaryText text={step.text} glossary={glossary} kid={kid} />
            </p>
          </li>
        ))}
      </ol>
      {skill.mistakes.length > 0 ? (
        <div className="mt-3">
          <h3 className="font-display text-xl tracking-wide">Mistakes</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {skill.mistakes.map((mistake) => (
              <li key={mistake.text} className="rounded-xl bg-bg px-3 py-2">
                <div className="flex gap-2">
                  <Pictogram id={mistake.pictogram} className="pic size-8 shrink-0" />
                  <p>{mistake.text}</p>
                </div>
                <p className="mt-1 text-muted">{mistake.fix}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function GlossaryText({ text, glossary, kid }: { text: string; glossary: Glossary; kid: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const parts = splitGlossary(text, glossary);
  return (
    <>
      {parts.map((part, index) =>
        part.entry ? (
          <span key={`${part.entry.id}-${index}`} className="relative inline">
            <button
              type="button"
              className="underline decoration-dotted underline-offset-4"
              aria-expanded={open === part.entry.id}
              onClick={() => setOpen((current) => (current === part.entry?.id ? null : part.entry!.id))}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {part.text}
            </button>
            {open === part.entry.id ? (
              <span role="region" aria-label={part.entry.term} className="absolute left-0 z-20 mt-1 w-56 rounded-xl border border-line bg-surface p-3 text-left shadow-lg">
                <span className="flex items-center gap-2">
                  <Pictogram id={part.entry.pictogram} className="pic size-8 shrink-0 text-accent" />
                  <strong>{part.entry.term}</strong>
                </span>
                <span className="mt-1 block">{kid ? part.entry.kid_text : part.entry.text}</span>
              </span>
            ) : null}
          </span>
        ) : (
          <span key={`t-${index}`}>{part.text}</span>
        ),
      )}
    </>
  );
}

function splitGlossary(text: string, glossary: Glossary): { text: string; entry?: GlossaryEntry }[] {
  const terms = [...glossary.entries].sort((a, b) => b.term.length - a.term.length);
  const parts: { text: string; entry?: GlossaryEntry }[] = [];
  let index = 0;
  let plain = "";
  const lower = text.toLowerCase();
  while (index < text.length) {
    let hit: { entry: GlossaryEntry; len: number } | null = null;
    for (const entry of terms) {
      const term = entry.term.toLowerCase();
      if (!lower.startsWith(term, index)) continue;
      const before = index === 0 || !/[a-z0-9]/i.test(text[index - 1] ?? "");
      const afterAt = index + term.length;
      const after = afterAt >= text.length || !/[a-z0-9]/i.test(text[afterAt] ?? "");
      if (before && after) {
        hit = { entry, len: term.length };
        break;
      }
    }
    if (hit) {
      if (plain) parts.push({ text: plain });
      plain = "";
      parts.push({ text: text.slice(index, index + hit.len), entry: hit.entry });
      index += hit.len;
    } else {
      plain += text[index];
      index += 1;
    }
  }
  if (plain) parts.push({ text: plain });
  return parts;
}

function GrownupGate({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-4" data-testid="grownup-gate">
      <div className="flex items-center gap-3">
        <Pictogram id="adult" className="pic size-12 text-accent" />
        <p className="font-display text-3xl tracking-wide">Get a grown-up</p>
      </div>
      <p className="mt-2 text-fg">This step can burn or cut. A grown-up holds the lock to show it.</p>
      <HoldButton
        label="Get a grown-up: hold 3 seconds"
        ms={3000}
        onConfirm={() => {
          pulse([20, 50, 20]);
          onUnlock();
        }}
      />
    </div>
  );
}

function HoldButton({ label, ms, onConfirm }: { label: string; ms: number; onConfirm: () => void }) {
  const frame = useRef(0);
  const start = (event: ReactPointerEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) => {
    if ("button" in event && event.button !== 0) return;
    if ("key" in event && event.key !== " " && event.key !== "Enter") return;
    if ("repeat" in event && event.repeat) return;
    event.preventDefault();
    const button = event.currentTarget;
    liftAboveBar(button);
    button.dataset.holding = "true";
    const t0 = performance.now();
    cancelAnimationFrame(frame.current);
    const tick = (now: number) => {
      const amount = Math.min(1, (now - t0) / ms);
      button.style.setProperty("--hold", String(amount));
      if (amount >= 1) {
        button.dataset.holding = "false";
        button.style.setProperty("--hold", "0");
        onConfirm();
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };
  const stop = (event: SyntheticEvent<HTMLButtonElement>) => {
    cancelAnimationFrame(frame.current);
    event.currentTarget.dataset.holding = "false";
    event.currentTarget.style.setProperty("--hold", "0");
  };
  return (
    <button
      type="button"
      className="gate-button hold-host tap-target relative mt-4 flex w-full items-center justify-center gap-3 rounded-xl px-4"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={start}
      onKeyUp={stop}
    >
      <span className="hold-ring" aria-hidden="true" />
      <span aria-hidden="true">
        <Pictogram id="lock" className="pic size-10 shrink-0" />
      </span>
      {label}
    </button>
  );
}

function useHold(ms: number, enabled: boolean, onDone: () => void) {
  const frame = useRef(0);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const clear = (el: HTMLElement | null) => {
    cancelAnimationFrame(frame.current);
    origin.current = null;
    if (!el) return;
    el.style.setProperty("--hold", "0");
    el.dataset.holding = "false";
  };
  return {
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (!enabled || event.button !== 0) return;
      const target = event.target;
      if (target instanceof Element && target.closest("button, a")) return;
      const el = event.currentTarget;
      liftAboveBar(el);
      origin.current = { x: event.clientX, y: event.clientY };
      el.dataset.holding = "true";
      const t0 = performance.now();
      const tick = (now: number) => {
        if (!origin.current) return;
        const amount = Math.min(1, (now - t0) / ms);
        el.style.setProperty("--hold", String(amount));
        if (amount >= 1) {
          clear(el);
          onDone();
          return;
        }
        frame.current = requestAnimationFrame(tick);
      };
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(tick);
    },
    onPointerMove(event: ReactPointerEvent<HTMLElement>) {
      if (!origin.current) return;
      const dx = event.clientX - origin.current.x;
      const dy = event.clientY - origin.current.y;
      if (dx * dx + dy * dy > 100) clear(event.currentTarget);
    },
    onPointerUp(event: ReactPointerEvent<HTMLElement>) {
      clear(event.currentTarget);
    },
    onPointerCancel(event: ReactPointerEvent<HTMLElement>) {
      clear(event.currentTarget);
    },
  };
}

function ActionBar({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      document.documentElement.style.setProperty("--action-bar", `${el.offsetHeight}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty("--action-bar", "0px");
    };
  }, []);
  return (
    <div ref={ref} data-action-bar className="action-bar">
      {children}
    </div>
  );
}

function liftAboveBar(el: HTMLElement) {
  const bar = document.querySelector("[data-action-bar]");
  const barTop = bar ? bar.getBoundingClientRect().top : window.innerHeight;
  const rect = el.getBoundingClientRect();
  const limit = barTop - 12;
  if (rect.bottom > limit) window.scrollBy(0, rect.bottom - limit);
  const next = el.getBoundingClientRect();
  if (next.top < 8) window.scrollBy(0, next.top - 8);
}

function pulse(pattern: number | number[]) {
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  const vibrate = nav && "vibrate" in nav ? nav.vibrate.bind(nav) : undefined;
  try {
    vibrate?.(pattern);
  } catch {
    /* this browser has no haptic */
  }
}
