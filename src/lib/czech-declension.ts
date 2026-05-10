// Pragmatic Czech declension for personal names. Covers the frequent name
// shapes found in customer rows: "Pan Novotný", "Paní Nováková", single first
// names, "Jméno Příjmení" pairs. Returns nominative for unrecognized shapes
// so a missing rule reads as nominative rather than as nonsense.

const SE_PREFIX = /^[sšzžSŠZŽ]/;
const SOFT_END = /[jščžřťďň]$/i;

const KNOWN_MALE_A_NICKNAMES = new Set([
  'honza', 'jirka', 'mira', 'míra', 'standa', 'venca', 'pepa', 'olda',
  'sváťa', 'sláva', 'kuba', 'fanda', 'tonda', 'lojza', 'ríša', 'saša',
  'ondra', 'mára', 'áda',
]);

function isFemaleSurname(token: string): boolean {
  const w = token.toLowerCase();
  return w.endsWith('ová') || (w.endsWith('á') && w.length > 2);
}

function isMaleAdjSurname(token: string): boolean {
  const w = token.toLowerCase();
  return w.endsWith('ý') || w.endsWith('í');
}

function detectGender(name: string): 'male' | 'female' | 'unknown' {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 'unknown';
  const first = tokens[0].toLowerCase();
  if (first === 'pan') return 'male';
  if (first === 'paní') return 'female';

  for (const t of tokens) {
    if (isFemaleSurname(t)) return 'female';
    if (isMaleAdjSurname(t)) return 'male';
  }

  if (tokens.length === 1) {
    if (first === 'jiří') return 'male';
    if (KNOWN_MALE_A_NICKNAMES.has(first)) return 'male';
    if (first.endsWith('a') || first.endsWith('e') || first.endsWith('í')) return 'female';
    return 'male';
  }

  const last = tokens[tokens.length - 1].toLowerCase();
  if (last.endsWith('a') || last.endsWith('e')) return 'female';
  return 'male';
}

function declineTokenInstrumental(token: string, gender: 'male' | 'female' | 'unknown'): string {
  if (!token) return token;
  const t = token.toLowerCase();

  if (t === 'pan') return 'panem';
  if (t === 'paní') return 'paní';

  if (gender === 'female') {
    if (t.endsWith('ová')) return token.slice(0, -3) + 'ovou';
    if (t.endsWith('á')) return token.slice(0, -1) + 'ou';
    if (t.endsWith('e')) return token.slice(0, -1) + 'í';
    if (t.endsWith('a')) return token.slice(0, -1) + 'ou';
    return token;
  }

  if (t.endsWith('ý') || t.endsWith('í')) return token + 'm';
  if ((t.endsWith('el') || t.endsWith('ek')) && token.length > 2) {
    return token.slice(0, -2) + token[token.length - 1] + 'em';
  }
  if (t.endsWith('a')) return token.slice(0, -1) + 'ou';
  if (t.endsWith('o') || t.endsWith('e')) return token.slice(0, -1) + 'em';
  return token + 'em';
}

function declineTokenAccusative(token: string, gender: 'male' | 'female' | 'unknown'): string {
  if (!token) return token;
  const t = token.toLowerCase();

  if (t === 'pan') return 'pana';
  if (t === 'paní') return 'paní';

  if (gender === 'female') {
    if (t.endsWith('ová')) return token.slice(0, -3) + 'ovou';
    if (t.endsWith('á')) return token.slice(0, -1) + 'ou';
    if (t.endsWith('e')) return token.slice(0, -1) + 'i';
    if (t.endsWith('a')) return token.slice(0, -1) + 'u';
    return token;
  }

  if (t.endsWith('ý')) return token.slice(0, -1) + 'ého';
  if (t.endsWith('í')) return token + 'ho';
  if ((t.endsWith('el') || t.endsWith('ek')) && token.length > 2) {
    return token.slice(0, -2) + token[token.length - 1] + 'a';
  }
  if (t.endsWith('a')) return token.slice(0, -1) + 'u';
  if (SOFT_END.test(t)) return token + 'e';
  return token + 'a';
}

export function instrumental(name: string): string {
  if (!name?.trim()) return name;
  const tokens = name.trim().split(/\s+/);
  const gender = detectGender(name);
  return tokens.map((t) => declineTokenInstrumental(t, gender)).join(' ');
}

export function accusative(name: string): string {
  if (!name?.trim()) return name;
  const tokens = name.trim().split(/\s+/);
  const gender = detectGender(name);
  return tokens.map((t) => declineTokenAccusative(t, gender)).join(' ');
}

export function withPreposition(name: string): 's' | 'se' {
  if (!name?.trim()) return 's';
  const declined = instrumental(name);
  return SE_PREFIX.test(declined) ? 'se' : 's';
}
