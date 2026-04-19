const SETS = {
    'she/her': { subj: 'she', obj: 'her', possAdj: 'her', possNoun: 'hers', refl: 'herself', isAre: 'is', hasHave: 'has' },
    'he/him': { subj: 'he', obj: 'him', possAdj: 'his', possNoun: 'his', refl: 'himself', isAre: 'is', hasHave: 'has' },
    'they/them': { subj: 'they', obj: 'them', possAdj: 'their', possNoun: 'theirs', refl: 'themselves', isAre: 'are', hasHave: 'have' },
};
export function getPronouns(set) {
    return SETS[set ?? 'she/her'] ?? SETS['she/her'];
}
/** Capitalise first letter — use at sentence or heading start. */
export function cap(s) {
    return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
