import { useEffect, useState } from "react";
import { NodeView } from "@/components/guide/NodeView";
import { ENVIRONMENT_ITEMS, INVENTORY_ITEMS } from "@/survival/items";
import { Pictogram } from "@/survival/pictograms/Pictogram";
import { resolveSubstitution } from "@/survival/resolver";
import { clearSession, loadSession, saveSession, type SavedSession } from "@/survival/session";
import { fireTree } from "@/survival/trees/fire";
import { waterTree } from "@/survival/trees/water";
import type { Biome, Context, Option, Season, Weather } from "@/survival/types";
import { BIOMES, SEASONS, WEATHERS } from "@/survival/types";

const STATE_KEY = "fatwood.state.v1";

type Screen = "biome" | "home" | "need" | "want" | "guide" | "settings" | "have" | "around";

interface Model {
  onboarded: boolean;
  theme: "field" | "night";
  kid: boolean;
  treeId: "fire" | "water";
  context: Context;
  screen: Screen;
  nodeId: string;
  history: string[];
  adultUnlocked: string[];
}

const BIOME_META: { id: Biome; label: string; kid: string; pictogram: string }[] = [
  { id: "temperate_forest", label: "Temperate forest", kid: "Forest", pictogram: "biome_temperate" },
  { id: "boreal/snow", label: "Boreal / snow", kid: "Snow forest", pictogram: "biome_boreal" },
  { id: "desert", label: "Desert", kid: "Desert", pictogram: "biome_desert" },
  { id: "tropical/jungle", label: "Tropical jungle", kid: "Jungle", pictogram: "biome_tropical" },
  { id: "grassland", label: "Grassland", kid: "Grass", pictogram: "biome_grass" },
  { id: "coastal", label: "Coast", kid: "Coast", pictogram: "biome_coast" },
  { id: "alpine", label: "Alpine", kid: "Mountains", pictogram: "biome_alpine" },
  { id: "urban_ruin", label: "Urban ruin", kid: "City", pictogram: "biome_urban" },
];

function freshContext(biome: Biome = "temperate_forest"): Context {
  return {
    biome,
    season: "autumn",
    weather: "dry",
    inventory: [],
    injuries: [],
    party_size: 1,
    daylight: true,
    flags: {},
  };
}

function initialModel(): Model {
  return {
    onboarded: false,
    theme: "field",
    kid: false,
    treeId: "fire",
    context: freshContext(),
    screen: "biome",
    nodeId: fireTree.entry_node,
    history: [],
    adultUnlocked: [],
  };
}

function matchWant(text: string): { treeId: "fire" | "water"; nodeId: string; purpose: string } | null {
  const value = text.toLowerCase();
  if (/cold|warm|hypo|freeze|heat me/.test(value)) return { treeId: "fire", nodeId: "fire.hypothermia", purpose: "warmth" };
  if (/water|thirst|drink|dehydr/.test(value)) return { treeId: "water", nodeId: "water.triage", purpose: "drink" };
  if (/boil/.test(value)) return { treeId: "water", nodeId: "water.boil", purpose: "purify" };
  if (/cook|food|eat|hungry/.test(value)) return { treeId: "fire", nodeId: "fire.conditions", purpose: "cook" };
  if (/signal|found|seen|rescue|help/.test(value)) return { treeId: "fire", nodeId: "fire.conditions", purpose: "signal" };
  if (/bug|insect|morale|mosquito/.test(value)) return { treeId: "fire", nodeId: "fire.conditions", purpose: "morale" };
  return null;
}

export function GuideApp() {
  const [model, setModel] = useState<Model>(initialModel);
  const [wantText, setWantText] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Model;
        if (saved?.context?.biome) {
          setModel({ ...saved, treeId: saved.treeId === "water" ? "water" : "fire" });
        }
      }
    } catch {
      /* keep the first-run model */
    }
    setReady(true);
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STATE_KEY, JSON.stringify(model));
    document.documentElement.dataset.theme = model.theme;
    document.documentElement.dataset.kid = model.kid ? "on" : "off";
    if (model.screen === "guide") {
      const tree = model.treeId === "water" ? waterTree : fireTree;
      const session: SavedSession = {
        treeId: tree.id,
        nodeId: model.nodeId,
        context: model.context,
        history: model.history,
        adultUnlocked: model.adultUnlocked,
        updatedAt: new Date().toISOString(),
      };
      saveSession(session, localStorage);
    }
  }, [model, ready]);

  const tree = model.treeId === "water" ? waterTree : fireTree;
  const node = tree.nodes.find((item) => item.id === model.nodeId) ?? tree.nodes[0];
  const resolved = (node.substitutions ?? []).map((sub) => resolveSubstitution(sub, model.context));
  const resumed = ready ? loadSession(localStorage) : null;

  function patch(partial: Partial<Model>) {
    setModel((current) => ({ ...current, ...partial }));
  }

  function patchContext(partial: Partial<Context>) {
    setModel((current) => ({ ...current, context: { ...current.context, ...partial } }));
  }

  function toggleItem(id: string) {
    setModel((current) => {
      const has = current.context.inventory.includes(id);
      const inventory = has
        ? current.context.inventory.filter((item) => item !== id)
        : [...current.context.inventory, id];
      return { ...current, context: { ...current.context, inventory } };
    });
  }

  function startAt(nodeId: string, flags: Record<string, string> = {}, treeId: "fire" | "water" = "fire") {
    setModel((current) => ({
      ...current,
      screen: "guide",
      treeId,
      nodeId,
      history: [],
      context: { ...current.context, flags: { ...current.context.flags, ...flags } },
    }));
  }

  function choose(option: Option) {
    setModel((current) => ({
      ...current,
      history: [...current.history, current.nodeId],
      nodeId: option.next,
      context: {
        ...current.context,
        flags: { ...current.context.flags, ...(option.sets ?? {}) },
      },
    }));
  }

  function back() {
    setModel((current) => {
      if (current.screen === "guide" && current.history.length > 0) {
        const history = [...current.history];
        const nodeId = history.pop() ?? (current.treeId === "water" ? waterTree.entry_node : fireTree.entry_node);
        return { ...current, history, nodeId };
      }
      if (current.screen === "home" || current.screen === "biome") return current;
      return { ...current, screen: "home" };
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pt-4 pb-8" data-ready={ready ? "yes" : "no"}>
      <header className="mb-4 flex items-center gap-2">
        {model.screen !== "home" && model.screen !== "biome" ? (
          <IconButton label="Back" pictogram="back" onClick={back} />
        ) : (
          <Pictogram id="fire" className="pic size-10 text-accent" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-display text-4xl leading-none tracking-wide">Fatwood</p>
          <p className="text-sm text-muted">Offline field guide</p>
        </div>
        <IconButton
          label={model.theme === "night" ? "Night vision on" : "Night vision"}
          pictogram="night"
          pressed={model.theme === "night"}
          onClick={() => patch({ theme: model.theme === "night" ? "field" : "night" })}
        />
        <IconButton label="Settings" pictogram="settings" onClick={() => patch({ screen: "settings" })} />
      </header>

      {model.screen === "biome" ? (
        <BiomePicker
          context={model.context}
          onBiome={(biome) => patchContext({ biome })}
          onSeason={(season) => patchContext({ season })}
          onWeather={(weather) => patchContext({ weather })}
          onStart={() => patch({ onboarded: true, screen: "home" })}
        />
      ) : null}

      {model.screen === "home" ? (
        <section className="flex flex-1 flex-col justify-end gap-3">
          <p className="text-muted">
            {biomeLabel(model.context.biome)} · {model.context.weather} · {model.context.season}
          </p>
          {resumed && resumed.nodeId ? (
            <button
              type="button"
              className="tap-target rounded-xl border border-line px-4 text-left"
              onClick={() =>
                patch({
                  screen: "guide",
                  treeId: resumed.treeId === "water" ? "water" : "fire",
                  nodeId: resumed.nodeId,
                  history: resumed.history ?? [],
                  adultUnlocked: resumed.adultUnlocked ?? [],
                  context: resumed.context,
                })
              }
            >
              Resume where you left off
            </button>
          ) : null}
          <BigTile label="I want" pictogram="want" onClick={() => patch({ screen: "want" })} />
          <BigTile label="I need" pictogram="need" onClick={() => patch({ screen: "need" })} />
          <BigTile label="First aid" pictogram="aid" disabled />
          <div className="grid grid-cols-2 gap-2">
            <IconButton label="What I have" pictogram="bag" wide onClick={() => patch({ screen: "have" })} />
            <IconButton label="What's around me" pictogram="pine" wide onClick={() => patch({ screen: "around" })} />
          </div>
        </section>
      ) : null}

      {model.screen === "need" ? (
        <section className="flex flex-col gap-3">
          <h1 className="font-display text-4xl tracking-wide">I need</h1>
          <BigTile label="Water" pictogram="water" onClick={() => startAt(waterTree.entry_node, {}, "water")} />
          <BigTile label="Food" pictogram="food" disabled />
          <BigTile label="Fire" pictogram="fire" onClick={() => startAt(fireTree.entry_node, {}, "fire")} />
          <BigTile label="Shelter" pictogram="shelter" disabled />
          <BigTile label="Signaling and navigation" pictogram="navigate" disabled />
          <p className="text-muted">Water and fire are in this build. Food, shelter, and signaling are later.</p>
        </section>
      ) : null}

      {model.screen === "want" ? (
        <section className="flex flex-col gap-3">
          <h1 className="font-display text-4xl tracking-wide">I want</h1>
          <WantChip label="Get warm" pictogram="warmth" onClick={() => startAt("fire.hypothermia", { purpose: "warmth" })} />
          <WantChip label="Boil water" pictogram="boil" onClick={() => startAt("water.triage", { purpose: "drink" }, "water")} />
          <WantChip label="Cook" pictogram="cook" onClick={() => startAt("fire.conditions", { purpose: "cook" })} />
          <WantChip label="Be found" pictogram="signal" onClick={() => startAt("fire.conditions", { purpose: "signal" })} />
          <WantChip label="Keep insects off" pictogram="insects" onClick={() => startAt("fire.conditions", { purpose: "morale" })} />
          <label className="mt-2 flex flex-col gap-2 text-muted">
            Optional words
            <input
              value={wantText}
              onChange={(event) => setWantText(event.target.value)}
              aria-label="Optional words"
              className="tap-target rounded-xl border border-line bg-surface px-3 text-fg"
            />
          </label>
          <button
            type="button"
            className="tap-target rounded-xl bg-accent px-4 font-display text-2xl text-accent-fg"
            onClick={() => {
              const hit = matchWant(wantText);
              if (!hit) startAt(fireTree.entry_node, {}, "fire");
              else startAt(hit.nodeId, { purpose: hit.purpose }, hit.treeId);
            }}
          >
            Use these words
          </button>
        </section>
      ) : null}

      {model.screen === "guide" ? (
        <NodeView
          node={node}
          kid={model.kid}
          unlocked={model.adultUnlocked.includes(node.id)}
          resolved={resolved}
          onUnlock={() =>
            patch({ adultUnlocked: model.adultUnlocked.includes(node.id) ? model.adultUnlocked : [...model.adultUnlocked, node.id] })
          }
          onChoose={choose}
          onFallback={(nodeId) =>
            setModel((current) => ({
              ...current,
              history: [...current.history, current.nodeId],
              nodeId,
            }))
          }
        />
      ) : null}

      {model.screen === "have" ? (
        <Checklist
          title="What I have"
          items={INVENTORY_ITEMS}
          selected={model.context.inventory}
          onToggle={toggleItem}
        />
      ) : null}
      {model.screen === "around" ? (
        <Checklist
          title="What's around me"
          items={ENVIRONMENT_ITEMS}
          selected={model.context.inventory}
          onToggle={toggleItem}
        />
      ) : null}

      {model.screen === "settings" ? (
        <section className="flex flex-col gap-4">
          <h1 className="font-display text-4xl tracking-wide">Settings</h1>
          <BiomePicker
            context={model.context}
            onBiome={(biome) => patchContext({ biome })}
            onSeason={(season) => patchContext({ season })}
            onWeather={(weather) => patchContext({ weather })}
          />
          <label className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-3">
            <span>Daylight</span>
            <input
              type="checkbox"
              className="size-6"
              checked={model.context.daylight}
              onChange={(event) => patchContext({ daylight: event.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-3">
            <span>Kid mode</span>
            <input
              type="checkbox"
              className="size-6"
              checked={model.kid}
              onChange={(event) => patch({ kid: event.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-3">
            <span>Red night vision</span>
            <input
              type="checkbox"
              className="size-6"
              checked={model.theme === "night"}
              onChange={(event) => patch({ theme: event.target.checked ? "night" : "field" })}
            />
          </label>
          <button
            type="button"
            className="tap-target rounded-xl border border-line px-4"
            onClick={() => {
              clearSession(localStorage);
              const next = initialModel();
              next.theme = model.theme;
              setModel(next);
              localStorage.removeItem(STATE_KEY);
            }}
          >
            Reset this guide
          </button>
        </section>
      ) : null}
    </main>
  );
}

function biomeLabel(id: Biome): string {
  return BIOME_META.find((item) => item.id === id)?.label ?? id;
}

function IconButton({
  label,
  pictogram,
  onClick,
  pressed,
  wide,
}: {
  label: string;
  pictogram: string;
  onClick: () => void;
  pressed?: boolean;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`tap-target flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 ${wide ? "w-full" : ""} ${pressed ? "text-accent" : "text-fg"}`}
      onClick={onClick}
    >
      <Pictogram id={pictogram} className="pic size-8" />
      {wide ? <span className="font-display text-2xl tracking-wide">{label}</span> : <span className="sr-only">{label}</span>}
    </button>
  );
}

function BigTile({
  label,
  pictogram,
  onClick,
  disabled,
}: {
  label: string;
  pictogram: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="tap-target flex min-h-24 items-center gap-4 rounded-xl bg-surface px-4 text-left disabled:opacity-40"
      onClick={onClick}
    >
      <Pictogram id={pictogram} className="pic size-14 text-accent" />
      <span className="font-display text-4xl tracking-wide">{label}</span>
    </button>
  );
}

function WantChip({ label, pictogram, onClick }: { label: string; pictogram: string; onClick: () => void }) {
  return (
    <button type="button" className="tap-target flex items-center gap-3 rounded-xl bg-surface px-4 text-left" onClick={onClick}>
      <Pictogram id={pictogram} className="pic size-10 text-accent" />
      <span className="font-display text-3xl tracking-wide">{label}</span>
    </button>
  );
}

function Checklist({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: { id: string; label: string; pictogram: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="font-display text-4xl tracking-wide">{title}</h1>
      {items.map((item) => {
        const on = selected.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={on}
            className={`tap-target flex items-center gap-3 rounded-xl px-3 text-left ${on ? "bg-accent text-accent-fg" : "bg-surface text-fg"}`}
            onClick={() => onToggle(item.id)}
          >
            <Pictogram id={item.pictogram} className="pic size-10" />
            <span className="font-display text-2xl tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </section>
  );
}

function BiomePicker({
  context,
  onBiome,
  onSeason,
  onWeather,
  onStart,
}: {
  context: Context;
  onBiome: (biome: Biome) => void;
  onSeason: (season: Season) => void;
  onWeather: (weather: Weather) => void;
  onStart?: () => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-display text-4xl tracking-wide">Where are you?</h1>
      <div className="grid grid-cols-2 gap-2">
        {BIOME_META.map((biome) => (
          <button
            key={biome.id}
            type="button"
            aria-pressed={context.biome === biome.id}
            className={`tap-target flex flex-col items-start gap-2 rounded-xl px-3 py-3 text-left ${context.biome === biome.id ? "bg-accent text-accent-fg" : "bg-surface text-fg"}`}
            onClick={() => onBiome(biome.id)}
          >
            <Pictogram id={biome.pictogram} className="pic size-10" />
            <span className="font-display text-2xl leading-none tracking-wide">{biome.label}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SEASONS.map((season) => (
          <button
            key={season}
            type="button"
            aria-pressed={context.season === season}
            className={`tap-target rounded-xl px-3 ${context.season === season ? "bg-accent text-accent-fg" : "bg-surface"}`}
            onClick={() => onSeason(season)}
          >
            {season}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {WEATHERS.map((weather) => (
          <button
            key={weather}
            type="button"
            aria-pressed={context.weather === weather}
            className={`tap-target flex items-center gap-2 rounded-xl px-3 ${context.weather === weather ? "bg-accent text-accent-fg" : "bg-surface"}`}
            onClick={() => onWeather(weather)}
          >
            <Pictogram
              id={weather === "dry" ? "weather_dry" : weather === "wet" ? "weather_wet" : weather === "freezing" ? "weather_freeze" : "weather_hot"}
              className="pic size-8"
            />
            {weather}
          </button>
        ))}
      </div>
      {onStart ? (
        <button type="button" className="tap-target rounded-xl bg-accent px-4 font-display text-3xl text-accent-fg" onClick={onStart}>
          This is where I am
        </button>
      ) : null}
      <p className="sr-only">
        Biomes available: {BIOMES.join(", ")}. Seasons: {SEASONS.join(", ")}.
      </p>
    </section>
  );
}
