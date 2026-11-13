// Tone marks only: huyền, sắc, ngã, hỏi, nặng. Vowel marks (ă â ê ô ơ ư) are kept.
const TONE_MARKS = /[̣̀́̃̉]/g;

export const normalize = (s: string) =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const stripTone = (s: string) => s.normalize('NFD').replace(TONE_MARKS, '').normalize('NFC');

// "chòe" and "choè" are the same syllable with tone mark in different positions.
const toneKey = (s: string) => `${stripTone(s)}|${s.normalize('NFD').match(TONE_MARKS)?.join('') ?? ''}`;

export type SyllableState = 'ok' | 'tone' | 'miss';

export interface MatchResult {
  verdict: 'correct' | 'near' | 'wrong';
  syllables: { text: string; state: SyllableState }[];
  heard: string;
}

const scoreOne = (target: string[], heard: string) => {
  const words = normalize(heard).split(' ');
  const tokens = new Set(words.map(toneKey));
  const toneless = new Set(words.map(stripTone));
  const syllables = target.map((text) => {
    const state: SyllableState = tokens.has(toneKey(text)) ? 'ok' : toneless.has(stripTone(text)) ? 'tone' : 'miss';
    return { text, state };
  });
  const score = syllables.reduce((n, s) => n + (s.state === 'ok' ? 2 : s.state === 'tone' ? 1 : 0), 0);
  return { syllables, score };
};

// Recognizer returns several alternatives; keep the one closest to the target.
export function match(word: string, alternatives: string[]): MatchResult {
  const target = normalize(word).split(' ');
  let best = { ...scoreOne(target, ''), heard: '' };
  for (const alt of alternatives) {
    const r = scoreOne(target, alt);
    if (r.score > best.score || !best.heard) best = { ...r, heard: alt };
  }
  const states = best.syllables.map((s) => s.state);
  const verdict = states.every((s) => s === 'ok') ? 'correct' : states.every((s) => s !== 'miss') ? 'near' : 'wrong';
  return { verdict, syllables: best.syllables, heard: best.heard };
}
