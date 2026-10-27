export const SKILL_DANGERS = ["none", "fire", "blade", "water", "height", "chemical", "medical"] as const;
export type SkillDanger = (typeof SKILL_DANGERS)[number];

export interface SkillStep {
  text: string;
  pictogram: string;
  /** Nested skill id. Expands inline up to depth 3 under the tree step. */
  skill?: string;
}

export interface SkillMistake {
  text: string;
  fix: string;
  pictogram: string;
}

export interface Skill {
  id: string;
  title: string;
  pictogram: string;
  steps: SkillStep[];
  mistakes: SkillMistake[];
  safety: string[];
  kid_text: string;
  danger: SkillDanger;
  biomes?: string[];
}

export interface GlossaryEntry {
  id: string;
  term: string;
  pictogram: string;
  text: string;
  kid_text: string;
}

export interface Glossary {
  entries: GlossaryEntry[];
  /** Jargon that must have an entry, or be taught in the skill that uses it. */
  watch: string[];
}
