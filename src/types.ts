export type Verdict = 'correct' | 'near' | 'wrong';
export type Progress = Record<string, Verdict>;

export interface PracticeItem {
  id: string;
  van: string;
  word: string;
  emoji?: string | null;
  audio_path?: string | null;
}

export interface ClassRow {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface StudentRow {
  id: string;
  class_id: string;
  name: string;
}

export interface LessonRow {
  id: string;
  title: string;
  position: number;
  created_at: string;
}

export interface ItemRow extends PracticeItem {
  lesson_id: string;
  position: number;
}

const RANK: Record<Verdict, number> = { wrong: 0, near: 1, correct: 2 };

export const withBest = (p: Progress, id: string, v: Verdict): Progress =>
  p[id] && RANK[p[id]] >= RANK[v] ? p : { ...p, [id]: v };
