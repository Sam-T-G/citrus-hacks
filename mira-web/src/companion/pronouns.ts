export type PronounSet = 'she/her' | 'he/him' | 'they/them';

export interface Pronouns {
  subj:    string; // she / he / they
  obj:     string; // her / him / them
  possAdj: string; // her / his / their  (before noun: "her mood")
  possNoun:string; // hers / his / theirs (standalone)
  refl:    string; // herself / himself / themselves
  isAre:   string; // is / is / are
  hasHave: string; // has / has / have
}

const SETS: Record<PronounSet, Pronouns> = {
  'she/her':  { subj:'she',  obj:'her',  possAdj:'her',   possNoun:'hers',   refl:'herself',    isAre:'is',  hasHave:'has'  },
  'he/him':   { subj:'he',   obj:'him',  possAdj:'his',   possNoun:'his',    refl:'himself',    isAre:'is',  hasHave:'has'  },
  'they/them':{ subj:'they', obj:'them', possAdj:'their', possNoun:'theirs', refl:'themselves', isAre:'are', hasHave:'have' },
};

export function getPronouns(set?: PronounSet | string): Pronouns {
  return SETS[(set as PronounSet) ?? 'she/her'] ?? SETS['she/her'];
}

/** Capitalise first letter — use at sentence or heading start. */
export function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
