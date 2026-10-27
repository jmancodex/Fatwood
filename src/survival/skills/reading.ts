/** Fixed syllable counter. No dictionary and no network. */
export function countSyllables(raw: string): number {
  const word = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return 0;
  if (word.length <= 3) return 1;
  let work = word.replace(/e$/, "");
  work = work.replace(/[^aeiouy]+/g, " ").trim();
  if (!work) return 1;
  return work.split(/\s+/).length;
}

export interface ReadScore {
  grade: number;
  words: number;
  sentences: number;
  syllables: number;
}

export function scoreText(text: string): ReadScore {
  const sentences = Math.max(1, text.split(/[.!?]+/).filter((part) => part.trim().length > 0).length);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const wordCount = Math.max(1, words.length);
  const grade = 0.39 * (wordCount / sentences) + 11.8 * (syllables / wordCount) - 15.59;
  return {
    grade: Math.round(grade * 100) / 100,
    words: words.length,
    sentences,
    syllables,
  };
}
