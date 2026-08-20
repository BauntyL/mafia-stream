/** Локальная цензура чата: темы из правил Twitch и типичные обходы написания. */

export const CENSOR_SEND_ERROR = 'Сообщение не прошло цензуру';

const MASK = '•••';
const SEP = String.raw`[\s\p{P}\p{S}_]{0,2}`;
const BOUND_L = String.raw`(?<![\p{L}\p{N}])`;
const BOUND_R = String.raw`(?![\p{L}\p{N}])`;

const HOMO: Record<string, string> = {
  a: 'aаáàâäãå@4',
  b: 'bьъб6',
  c: 'cсç',
  d: 'd',
  e: 'eеёéèêë3',
  f: 'f',
  g: 'g',
  h: 'hн',
  i: 'iіıíìîï!1|l',
  j: 'j',
  k: 'kк',
  l: 'l1|i',
  m: 'mм',
  n: 'nп',
  o: 'oо0óòôöø',
  p: 'pр',
  q: 'q',
  r: 'r',
  s: 's$5',
  t: 'tт7',
  u: 'uиüúùû',
  v: 'v',
  w: 'w',
  x: 'xх',
  y: 'yуý',
  z: 'z',
  а: 'аa@4áà',
  б: 'бb6',
  в: 'вb',
  г: 'г',
  д: 'дd',
  е: 'еeёé3',
  ё: 'ёеe3',
  ж: 'ж',
  з: 'з3',
  и: 'иuіi1',
  й: 'йи',
  к: 'кk',
  л: 'л',
  м: 'мm',
  н: 'нh',
  о: 'оo0',
  п: 'пn',
  р: 'рp',
  с: 'сc',
  т: 'тt7',
  у: 'уy',
  ф: 'ф',
  х: 'хx',
  ц: 'ц',
  ч: 'ч',
  ш: 'ш',
  щ: 'щ',
  ъ: 'ъb',
  ы: 'ы',
  ь: 'ьb',
  э: 'эe',
  ю: 'ю',
  я: 'я',
};

/** Длинные однозначные корни: достаточно вхождения в сжатый текст. */
const STEMS = [
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'tranny',
  'pedoph',
  'paedo',
  'lolicon',
  'shotacon',
  'childporn',
  'onlyfans',
  'hentai',
  'blowjob',
  'handjob',
  'cumshot',
  'orgasm',
  'ejaculat',
  'pornography',
  'underage',
  'columbine',
  'whitepower',
  'siegheil',
  'heilhitler',
  'cocaine',
  'heroin',
  'fentanyl',
  'methamphetamine',
  'пидорас',
  'пидораж',
  'гомосек',
  'черножоп',
  'узкоглаз',
  'педофил',
  'педоф',
  'лоликон',
  'шотакон',
  'малолетк',
  'малолетн',
  'детскпорн',
  'закладк',
  'закладчик',
  'метамфетамин',
  'фентан',
  'кокаин',
  'героин',
  'зигхайль',
  'хайльгитлер',
  'скинхед',
  'killmyself',
  'killyourself',
  'schoolshooter',
  'swatting',
  'домашнийадрес',
  'номерпаспорта',
];

/** Короткие / неоднозначные: только как отдельное слово, с обходами. */
const WORDS = [
  'nigger',
  'nigga',
  'faggot',
  'kike',
  'spic',
  'chink',
  'tranny',
  'negro',
  'retard',
  'rapist',
  'porn',
  'porno',
  'hentai',
  'nsfw',
  'nudes',
  'nude',
  'cock',
  'dick',
  'pussy',
  'anal',
  'dildo',
  'vagina',
  'penis',
  'fuck',
  'fck',
  'bitch',
  'slut',
  'whore',
  'loli',
  'shota',
  'pedo',
  'kys',
  'isis',
  '1488',
  'жид',
  'хач',
  'чурк',
  'пидор',
  'пидр',
  'педик',
  'хуй',
  'хуя',
  'хуе',
  'хуё',
  'хуи',
  'huy',
  'xyu',
  'пизд',
  'пезд',
  'бляд',
  'блеад',
  'blyat',
  'blyad',
  'шлюх',
  'минет',
  'дроч',
  'ебал',
  'ебат',
  'ебёт',
  'ебет',
  'ебля',
  'выеб',
  'секс',
  'порно',
  'порн',
  'сперма',
  'онанизм',
  'вагин',
  'пенис',
  'нацист',
  'кокаин',
  'героин',
  'спайс',
  'снилс',
];

/** Русский мат, который часто пишут слитно: похуй, охуеть. */
const GLUED = [
  'хуй',
  'хуя',
  'хуе',
  'хуё',
  'пизд',
  'пезд',
  'бляд',
  'ебал',
  'ебат',
  'выеб',
  'пидор',
  'пидр',
  'педик',
  'шлюх',
  'дроч',
];

const MINOR_MARKERS = [
  'child',
  'kiddo',
  'loli',
  'shota',
  'underage',
  'pedo',
  'paedo',
  'малолет',
  'детск',
  'ребен',
  'ребён',
  'школьниц',
  'лоли',
  'шота',
  'педоф',
];

const SEX_MARKERS = [
  'porn',
  'sex',
  'nude',
  'fuck',
  'cock',
  'dick',
  'pussy',
  'xxx',
  'порно',
  'секс',
  'ебл',
  'ебат',
  'голая',
  'голый',
  'минет',
  'трах',
];

function escapeClass(ch: string) {
  return ch.replace(/[\\^\-\]]/g, '\\$&');
}

function charClass(ch: string) {
  const key = ch.toLowerCase();
  const set = HOMO[key] || ch;
  const uniq = [...new Set([...set, ch.toLowerCase(), ch.toUpperCase()])].join('');
  return `[${[...uniq].map(escapeClass).join('')}]`;
}

function toFlexibleRegex(term: string, bounded: boolean) {
  const chars = [...term.trim().toLowerCase()].filter((c) => c !== ' ');
  if (!chars.length) return null;
  const body = chars
    .map((c, i) => `${charClass(c)}+${i < chars.length - 1 ? SEP : ''}`)
    .join('');
  return new RegExp(bounded ? `${BOUND_L}${body}${BOUND_R}` : body, 'giu');
}

const WORD_PATTERNS = WORDS.map((w) => toFlexibleRegex(w, true)).filter((r): r is RegExp => !!r);
const STEM_PATTERNS = STEMS.map((w) => toFlexibleRegex(w, false)).filter((r): r is RegExp => !!r);
const GLUED_PATTERNS = GLUED.map((w) => toFlexibleRegex(w, false)).filter((r): r is RegExp => !!r);
const ALL_PATTERNS = [...WORD_PATTERNS, ...STEM_PATTERNS, ...GLUED_PATTERNS];

function compact(text: string) {
  return text.replace(/[^\p{L}\p{N}]+/gu, '').replace(/(.)\1{2,}/gu, '$1$1');
}

function latinize(text: string) {
  return text
    .replace(/а/g, 'a')
    .replace(/е/g, 'e')
    .replace(/о/g, 'o')
    .replace(/р/g, 'p')
    .replace(/с/g, 'c')
    .replace(/х/g, 'x')
    .replace(/у/g, 'y')
    .replace(/к/g, 'k')
    .replace(/м/g, 'm')
    .replace(/т/g, 't')
    .replace(/и/g, 'i')
    .replace(/н/g, 'h')
    .replace(/в/g, 'b')
    .replace(/л/g, 'l')
    .replace(/з/g, 'z')
    .replace(/д/g, 'd')
    .replace(/б/g, 'b')
    .replace(/п/g, 'p')
    .replace(/й/g, 'i');
}

function phonetic(text: string) {
  return text
    .replace(/а/g, 'a')
    .replace(/б/g, 'b')
    .replace(/в/g, 'v')
    .replace(/г/g, 'g')
    .replace(/д/g, 'd')
    .replace(/е/g, 'e')
    .replace(/ж/g, 'zh')
    .replace(/з/g, 'z')
    .replace(/и/g, 'i')
    .replace(/й/g, 'y')
    .replace(/к/g, 'k')
    .replace(/л/g, 'l')
    .replace(/м/g, 'm')
    .replace(/н/g, 'n')
    .replace(/о/g, 'o')
    .replace(/п/g, 'p')
    .replace(/р/g, 'r')
    .replace(/с/g, 's')
    .replace(/т/g, 't')
    .replace(/у/g, 'u')
    .replace(/ф/g, 'f')
    .replace(/х/g, 'h')
    .replace(/ц/g, 'c')
    .replace(/ч/g, 'ch')
    .replace(/ш/g, 'sh')
    .replace(/щ/g, 'sch')
    .replace(/ы/g, 'y')
    .replace(/э/g, 'e')
    .replace(/ю/g, 'yu')
    .replace(/я/g, 'ya')
    .replace(/[ьъ]/g, '');
}

function haystacks(text: string) {
  const n = text.normalize('NFKC').toLowerCase().replace(/ё/g, 'е');
  const latinLeet = compact(
    n.replace(/0/g, 'o').replace(/[@4]/g, 'a').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/\$/g, 's')
  );
  const cyrLeet = compact(
    n.replace(/0/g, 'о').replace(/4/g, 'а').replace(/1/g, 'и').replace(/3/g, 'з').replace(/6/g, 'б').replace(/@/g, 'а')
  );
  return [
    latinLeet,
    cyrLeet,
    latinize(latinLeet),
    latinize(cyrLeet),
    phonetic(latinLeet),
    phonetic(cyrLeet),
  ];
}

const FOLDED_STEMS = [...new Set(STEMS.flatMap(haystacks))].filter((t) => t.length >= 5);
const FOLDED_GLUED = [...new Set(GLUED.flatMap(haystacks))].filter((t) => t.length >= 3);
const FOLDED_MINOR = [...new Set(MINOR_MARKERS.flatMap(haystacks))];
const FOLDED_SEX = [...new Set(SEX_MARKERS.flatMap(haystacks))];

function hasToken(hay: string, needle: string) {
  if (needle.length >= 5) return hay.includes(needle);
  const i = hay.indexOf(needle);
  if (i < 0) return false;
  const before = i === 0 || !/\p{L}|\p{N}/u.test(hay[i - 1] ?? '');
  const after =
    i + needle.length >= hay.length || !/\p{L}|\p{N}/u.test(hay[i + needle.length] ?? '');
  return before && after;
}

function hasMark(forms: string[], markers: string[]) {
  return forms.some((h) =>
    markers.some((m) => (m.length >= 5 ? h.includes(m) : hasToken(h, m)))
  );
}

function hasCombo(forms: string[]) {
  return hasMark(forms, FOLDED_MINOR) && hasMark(forms, FOLDED_SEX);
}

function matchesPattern(text: string) {
  return ALL_PATTERNS.some((re) => {
    re.lastIndex = 0;
    return re.test(text);
  });
}

export function isChatBanned(text: string) {
  if (!text.trim()) return false;
  const forms = haystacks(text);
  if (FOLDED_STEMS.some((term) => forms.some((h) => h.includes(term)))) return true;
  if (FOLDED_GLUED.some((term) => forms.some((h) => h.includes(term)))) return true;
  if (hasCombo(forms)) return true;
  return matchesPattern(text);
}

export function censorChat(text: string) {
  if (!text) return text;
  let out = text;
  for (const re of ALL_PATTERNS) {
    re.lastIndex = 0;
    out = out.replace(re, MASK);
  }
  if (out === text && isChatBanned(text)) return 'сообщение скрыто цензурой';
  return out;
}
