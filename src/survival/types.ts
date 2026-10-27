export const BIOMES = [
  "temperate_forest",
  "boreal/snow",
  "desert",
  "tropical/jungle",
  "grassland",
  "coastal",
  "alpine",
  "urban_ruin",
] as const;

export type Biome = (typeof BIOMES)[number];

export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export const WEATHERS = ["dry", "wet", "freezing", "hot"] as const;
export type Weather = (typeof WEATHERS)[number];

export const NODE_TYPES = ["question", "instruction", "warning", "terminal"] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const DANGERS = [
  "fire",
  "blade",
  "chemical",
  "foraging",
  "first_aid_advanced",
] as const;
export type Danger = (typeof DANGERS)[number];

export type Condition =
  | { op: "biome_in"; biomes: Biome[] }
  | { op: "weather_in"; weather: Weather[] }
  | { op: "has_all"; items: string[] }
  | { op: "has_any"; items: string[] }
  | { op: "has_none"; items: string[] }
  | { op: "flag"; key: string; value: string }
  | { op: "daylight"; value: boolean }
  | { op: "injury"; id: string }
  | { op: "any"; of: Condition[] };

export interface Step {
  id: string;
  text: string;
  kid_text: string;
  pictogram: string;
  danger?: Danger;
  /** Skill id. The same skill is reused; it is not copied onto the step. */
  skill?: string;
  /** True when the step is one plain action and does not need a skill. */
  atomic?: boolean;
  atomic_reason?: string;
}

export interface Option {
  id: string;
  label: string;
  kid_label: string;
  next: string;
  pictogram: string;
  conditions?: Condition[];
  sets?: Record<string, string>;
  retry?: boolean;
}

export interface Alternative {
  item: string;
  pictogram: string;
  biomes?: Biome[];
  requires?: string[];
  avoid_weather?: Weather[];
  how_to: string;
  caveats?: string;
}

export interface Substitution {
  id: string;
  need: string;
  pictogram: string;
  alternatives: Alternative[];
  fallback_node: string;
}

export interface Node {
  id: string;
  type: NodeType;
  text: string;
  kid_text: string;
  pictogram: string;
  danger?: Danger;
  /** Standing header, required on every first-aid node. */
  header?: string;
  steps: Step[];
  options: Option[];
  substitutions?: Substitution[];
  safety?: string[];
  sources?: string[];
  /** True when this node is a no-equipment method. */
  no_gear?: boolean;
}

export interface Tree {
  id: string;
  title: string;
  version: string;
  section: string;
  entry_node: string;
  nodes: Node[];
}

export interface Context {
  biome: Biome;
  season: Season;
  weather: Weather;
  inventory: string[];
  injuries: string[];
  party_size: number;
  daylight: boolean;
  flags: Record<string, string>;
}

export interface ResolvedSubstitution {
  need: string;
  substitutionId: string;
  status: "alternative" | "fallback";
  item?: string;
  how_to?: string;
  caveats?: string;
  pictogram: string;
  fallback_node?: string;
}

export interface TraceEvent {
  nodeId: string;
  type: NodeType;
  text: string;
  safety: string[];
  steps: string[];
  /** Safety lines are recorded before steps for every visited node. */
  safetyBeforeSteps: boolean;
  substitutions: ResolvedSubstitution[];
  optionId?: string;
  next?: string;
  no_gear?: boolean;
}

export interface WalkResult {
  trace: TraceEvent[];
  ended: boolean;
  deadEnd: boolean;
  finalNodeId: string;
  context: Context;
}

export interface ItemDef {
  id: string;
  label: string;
  kid_label: string;
  pictogram: string;
  group: "inventory" | "environment";
}
