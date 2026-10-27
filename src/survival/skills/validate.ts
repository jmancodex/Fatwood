import type { Tree } from "../types";
import { isKnownPictogram } from "../pictograms/catalog";
import { graphErrors, skillById } from "./graph";
import { scoreText } from "./reading";
import type { Glossary, Skill } from "./types";

export interface SkillReadout {
  id: string;
  title: string;
  mean: number;
  max: number;
  steps: { text: string; grade: number; words: number }[];
}

export interface TeachReport {
  errors: string[];
  linked: number;
  atomic: number;
  actionable: number;
  coverage: number;
  unknown: string[];
  orphans: string[];
  readout: SkillReadout[];
}

export function validateTeach(trees: Tree[], skills: Skill[], glossary: Glossary): TeachReport {
  const errors: string[] = [];
  const byId = skillById(skills);
  const unknown = new Set<string>();
  const referenced = new Set<string>();
  let linked = 0;
  let atomic = 0;
  let actionable = 0;

  for (const tree of trees) {
    for (const node of tree.nodes) {
      for (const step of node.steps) {
        actionable += 1;
        const hasSkill = Boolean(step.skill);
        const hasAtomic = step.atomic === true && Boolean(step.atomic_reason?.trim());
        if (hasSkill) {
          linked += 1;
          referenced.add(step.skill!);
          if (!byId.has(step.skill!)) {
            unknown.add(step.skill!);
            errors.push(`${node.id} step ${step.id} links unknown skill ${step.skill}`);
          }
        } else if (hasAtomic) {
          atomic += 1;
        } else {
          errors.push(`${node.id} step ${step.id} is not linked or atomic-with-reason`);
        }
      }
    }
  }

  for (const skill of skills) {
    if (!skill.title.trim() || !skill.kid_text.trim()) errors.push(`${skill.id} is missing title or kid_text`);
    if (!isKnownPictogram(skill.pictogram)) errors.push(`${skill.id} has unknown pictogram ${skill.pictogram || "<empty>"}`);
    for (const step of skill.steps) {
      if (step.skill) referenced.add(step.skill);
      if (!isKnownPictogram(step.pictogram)) errors.push(`${skill.id} step has unknown pictogram ${step.pictogram || "<empty>"}`);
    }
    for (const mistake of skill.mistakes) {
      if (!mistake.text.trim() || !mistake.fix.trim()) errors.push(`${skill.id} has an empty mistake`);
      if (!isKnownPictogram(mistake.pictogram)) errors.push(`${skill.id} mistake has unknown pictogram ${mistake.pictogram || "<empty>"}`);
    }
  }

  const orphans = skills.filter((skill) => !referenced.has(skill.id)).map((skill) => skill.id);
  for (const id of orphans) errors.push(`orphan skill ${id}`);
  errors.push(...graphErrors(skills));

  const readout: SkillReadout[] = [];
  for (const skill of skills) {
    const stepSamples = skill.steps.map((step) => ({ text: step.text, score: scoreText(step.text) }));
    const kid = scoreText(skill.kid_text);
    for (const sample of [...stepSamples, { text: skill.kid_text, score: kid }]) {
      if (sample.score.words > 20) errors.push(`${skill.id} has ${sample.score.words} words: ${sample.text}`);
      if (sample.score.grade > 6) errors.push(`${skill.id} grade ${sample.score.grade} over 6.0: ${sample.text}`);
    }
    const grades = stepSamples.map((sample) => sample.score.grade);
    const mean = grades.length === 0 ? 0 : Math.round((grades.reduce((sum, grade) => sum + grade, 0) / grades.length) * 100) / 100;
    const max = grades.length === 0 ? 0 : Math.round(Math.max(...grades) * 100) / 100;
    if (mean > 5) errors.push(`${skill.id} mean grade ${mean} over 5.0`);
    readout.push({
      id: skill.id,
      title: skill.title,
      mean,
      max,
      steps: stepSamples.map((sample) => ({ text: sample.text, grade: sample.score.grade, words: sample.score.words })),
    });
  }

  const undefinedTerms = missingGlossaryTerms(skills, glossary);
  for (const term of undefinedTerms) errors.push(`undefined glossary term ${term}`);

  const coverage = actionable === 0 ? 0 : (linked + atomic) / actionable;
  return {
    errors,
    linked,
    atomic,
    actionable,
    coverage,
    unknown: [...unknown],
    orphans,
    readout,
  };
}

/** Watch-list words used in a skill must have an entry, unless that skill explains the word. */
export function missingGlossaryTerms(skills: Skill[], glossary: Glossary): string[] {
  const defined = new Set(glossary.entries.map((entry) => entry.term.toLowerCase()));
  const missing = new Set<string>();
  for (const entry of glossary.entries) {
    if (!entry.term.trim() || !entry.text.trim() || !entry.kid_text.trim() || !isKnownPictogram(entry.pictogram)) {
      missing.add(entry.term || "(blank entry)");
    }
  }
  for (const term of glossary.watch) {
    const key = term.toLowerCase();
    if (!defined.has(key)) missing.add(key);
  }
  for (const skill of skills) {
    const blob = [skill.title, skill.kid_text, ...skill.steps.map((step) => step.text), ...skill.mistakes.flatMap((item) => [item.text, item.fix])]
      .join(" ")
      .toLowerCase();
    for (const term of glossary.watch) {
      const key = term.toLowerCase();
      if (!blob.includes(key)) continue;
      const explained = skill.steps.some((step) => step.text.toLowerCase().includes(`${key} is `) || step.text.toLowerCase().includes(`${key} means `));
      if (!defined.has(key) && !explained) missing.add(key);
    }
  }
  return [...missing];
}
