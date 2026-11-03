/**
 * The 66 books of the Protestant canon, in canonical order. Ids are stable
 * keys used in stored Scripture text, so never rename one. Names cover every
 * interface language; abbreviations help reference search and imports.
 */
type BookRow = [id: string, en: string, pt: string, es: string, fr: string, de: string, it: string, abbreviations: string[]]

const ROWS: BookRow[] = [
  ['genesis', 'Genesis', 'Gênesis', 'Génesis', 'Genèse', '1. Mose', 'Genesi', ['gen', 'gn', 'ge']],
  ['exodus', 'Exodus', 'Êxodo', 'Éxodo', 'Exode', '2. Mose', 'Esodo', ['exo', 'ex', 'exod']],
  ['leviticus', 'Leviticus', 'Levítico', 'Levítico', 'Lévitique', '3. Mose', 'Levitico', ['lev', 'lv', 'le']],
  ['numbers', 'Numbers', 'Números', 'Números', 'Nombres', '4. Mose', 'Numeri', ['num', 'nm', 'nu']],
  ['deuteronomy', 'Deuteronomy', 'Deuteronômio', 'Deuteronomio', 'Deutéronome', '5. Mose', 'Deuteronomio', ['deut', 'dt', 'de']],
  ['joshua', 'Joshua', 'Josué', 'Josué', 'Josué', 'Josua', 'Giosuè', ['josh', 'jos', 'js']],
  ['judges', 'Judges', 'Juízes', 'Jueces', 'Juges', 'Richter', 'Giudici', ['judg', 'jdg', 'jz', 'jue']],
  ['ruth', 'Ruth', 'Rute', 'Rut', 'Ruth', 'Rut', 'Rut', ['rth', 'rt', 'ru']],
  ['1samuel', '1 Samuel', '1 Samuel', '1 Samuel', '1 Samuel', '1. Samuel', '1 Samuele', ['1sam', '1sa', '1sm', '1 sam']],
  ['2samuel', '2 Samuel', '2 Samuel', '2 Samuel', '2 Samuel', '2. Samuel', '2 Samuele', ['2sam', '2sa', '2sm', '2 sam']],
  ['1kings', '1 Kings', '1 Reis', '1 Reyes', '1 Rois', '1. Könige', '1 Re', ['1kgs', '1ki', '1rs', '1 reis', '1re']],
  ['2kings', '2 Kings', '2 Reis', '2 Reyes', '2 Rois', '2. Könige', '2 Re', ['2kgs', '2ki', '2rs', '2 reis', '2re']],
  ['1chronicles', '1 Chronicles', '1 Crônicas', '1 Crónicas', '1 Chroniques', '1. Chronik', '1 Cronache', ['1chr', '1ch', '1cr', '1cro']],
  ['2chronicles', '2 Chronicles', '2 Crônicas', '2 Crónicas', '2 Chroniques', '2. Chronik', '2 Cronache', ['2chr', '2ch', '2cr', '2cro']],
  ['ezra', 'Ezra', 'Esdras', 'Esdras', 'Esdras', 'Esra', 'Esdra', ['ezr', 'ed', 'esd']],
  ['nehemiah', 'Nehemiah', 'Neemias', 'Nehemías', 'Néhémie', 'Nehemia', 'Neemia', ['neh', 'ne']],
  ['esther', 'Esther', 'Ester', 'Ester', 'Esther', 'Ester', 'Ester', ['esth', 'est', 'et']],
  ['job', 'Job', 'Jó', 'Job', 'Job', 'Hiob', 'Giobbe', ['jb']],
  ['psalms', 'Psalms', 'Salmos', 'Salmos', 'Psaumes', 'Psalmen', 'Salmi', ['ps', 'psa', 'psalm', 'sl', 'sal', 'salmo']],
  ['proverbs', 'Proverbs', 'Provérbios', 'Proverbios', 'Proverbes', 'Sprüche', 'Proverbi', ['prov', 'pr', 'prv', 'pv']],
  ['ecclesiastes', 'Ecclesiastes', 'Eclesiastes', 'Eclesiastés', 'Ecclésiaste', 'Prediger', 'Ecclesiaste', ['eccl', 'ecc', 'ec', 'qo']],
  ['songofsongs', 'Song of Songs', 'Cânticos', 'Cantares', 'Cantique des cantiques', 'Hoheslied', 'Cantico dei cantici', ['song', 'sos', 'ct', 'cant', 'cantares', 'song of solomon']],
  ['isaiah', 'Isaiah', 'Isaías', 'Isaías', 'Ésaïe', 'Jesaja', 'Isaia', ['isa', 'is']],
  ['jeremiah', 'Jeremiah', 'Jeremias', 'Jeremías', 'Jérémie', 'Jeremia', 'Geremia', ['jer', 'jr']],
  ['lamentations', 'Lamentations', 'Lamentações', 'Lamentaciones', 'Lamentations', 'Klagelieder', 'Lamentazioni', ['lam', 'lm']],
  ['ezekiel', 'Ezekiel', 'Ezequiel', 'Ezequiel', 'Ézéchiel', 'Hesekiel', 'Ezechiele', ['ezek', 'eze', 'ez']],
  ['daniel', 'Daniel', 'Daniel', 'Daniel', 'Daniel', 'Daniel', 'Daniele', ['dan', 'dn', 'da']],
  ['hosea', 'Hosea', 'Oseias', 'Oseas', 'Osée', 'Hosea', 'Osea', ['hos', 'os']],
  ['joel', 'Joel', 'Joel', 'Joel', 'Joël', 'Joel', 'Gioele', ['jl', 'joe']],
  ['amos', 'Amos', 'Amós', 'Amós', 'Amos', 'Amos', 'Amos', ['am']],
  ['obadiah', 'Obadiah', 'Obadias', 'Abdías', 'Abdias', 'Obadja', 'Abdia', ['obad', 'ob', 'ab']],
  ['jonah', 'Jonah', 'Jonas', 'Jonás', 'Jonas', 'Jona', 'Giona', ['jon']],
  ['micah', 'Micah', 'Miqueias', 'Miqueas', 'Michée', 'Micha', 'Michea', ['mic', 'mq', 'mi']],
  ['nahum', 'Nahum', 'Naum', 'Nahúm', 'Nahum', 'Nahum', 'Naum', ['nah', 'na']],
  ['habakkuk', 'Habakkuk', 'Habacuque', 'Habacuc', 'Habacuc', 'Habakuk', 'Abacuc', ['hab', 'hc']],
  ['zephaniah', 'Zephaniah', 'Sofonias', 'Sofonías', 'Sophonie', 'Zefanja', 'Sofonia', ['zeph', 'zep', 'sf']],
  ['haggai', 'Haggai', 'Ageu', 'Hageo', 'Aggée', 'Haggai', 'Aggeo', ['hag', 'ag']],
  ['zechariah', 'Zechariah', 'Zacarias', 'Zacarías', 'Zacharie', 'Sacharja', 'Zaccaria', ['zech', 'zec', 'zc']],
  ['malachi', 'Malachi', 'Malaquias', 'Malaquías', 'Malachie', 'Maleachi', 'Malachia', ['mal', 'ml']],
  ['matthew', 'Matthew', 'Mateus', 'Mateo', 'Matthieu', 'Matthäus', 'Matteo', ['mt', 'matt', 'mat']],
  ['mark', 'Mark', 'Marcos', 'Marcos', 'Marc', 'Markus', 'Marco', ['mk', 'mrk', 'mc', 'mr']],
  ['luke', 'Luke', 'Lucas', 'Lucas', 'Luc', 'Lukas', 'Luca', ['lk', 'luk', 'lc']],
  ['john', 'John', 'João', 'Juan', 'Jean', 'Johannes', 'Giovanni', ['jn', 'jhn', 'joh']],
  ['acts', 'Acts', 'Atos', 'Hechos', 'Actes', 'Apostelgeschichte', 'Atti', ['act', 'at', 'hch']],
  ['romans', 'Romans', 'Romanos', 'Romanos', 'Romains', 'Römer', 'Romani', ['rom', 'ro', 'rm']],
  ['1corinthians', '1 Corinthians', '1 Coríntios', '1 Corintios', '1 Corinthiens', '1. Korinther', '1 Corinzi', ['1cor', '1co']],
  ['2corinthians', '2 Corinthians', '2 Coríntios', '2 Corintios', '2 Corinthiens', '2. Korinther', '2 Corinzi', ['2cor', '2co']],
  ['galatians', 'Galatians', 'Gálatas', 'Gálatas', 'Galates', 'Galater', 'Galati', ['gal', 'gl', 'ga']],
  ['ephesians', 'Ephesians', 'Efésios', 'Efesios', 'Éphésiens', 'Epheser', 'Efesini', ['eph', 'ef']],
  ['philippians', 'Philippians', 'Filipenses', 'Filipenses', 'Philippiens', 'Philipper', 'Filippesi', ['phil', 'php', 'fp', 'fil']],
  ['colossians', 'Colossians', 'Colossenses', 'Colosenses', 'Colossiens', 'Kolosser', 'Colossesi', ['col', 'cl']],
  ['1thessalonians', '1 Thessalonians', '1 Tessalonicenses', '1 Tesalonicenses', '1 Thessaloniciens', '1. Thessalonicher', '1 Tessalonicesi', ['1thess', '1th', '1ts', '1tes']],
  ['2thessalonians', '2 Thessalonians', '2 Tessalonicenses', '2 Tesalonicenses', '2 Thessaloniciens', '2. Thessalonicher', '2 Tessalonicesi', ['2thess', '2th', '2ts', '2tes']],
  ['1timothy', '1 Timothy', '1 Timóteo', '1 Timoteo', '1 Timothée', '1. Timotheus', '1 Timoteo', ['1tim', '1ti', '1tm']],
  ['2timothy', '2 Timothy', '2 Timóteo', '2 Timoteo', '2 Timothée', '2. Timotheus', '2 Timoteo', ['2tim', '2ti', '2tm']],
  ['titus', 'Titus', 'Tito', 'Tito', 'Tite', 'Titus', 'Tito', ['tit', 'tt']],
  ['philemon', 'Philemon', 'Filemom', 'Filemón', 'Philémon', 'Philemon', 'Filemone', ['phlm', 'phm', 'fm', 'flm']],
  ['hebrews', 'Hebrews', 'Hebreus', 'Hebreos', 'Hébreux', 'Hebräer', 'Ebrei', ['heb', 'hb']],
  ['james', 'James', 'Tiago', 'Santiago', 'Jacques', 'Jakobus', 'Giacomo', ['jas', 'jm', 'tg', 'stg']],
  ['1peter', '1 Peter', '1 Pedro', '1 Pedro', '1 Pierre', '1. Petrus', '1 Pietro', ['1pet', '1pe', '1pt']],
  ['2peter', '2 Peter', '2 Pedro', '2 Pedro', '2 Pierre', '2. Petrus', '2 Pietro', ['2pet', '2pe', '2pt']],
  ['1john', '1 John', '1 João', '1 Juan', '1 Jean', '1. Johannes', '1 Giovanni', ['1jn', '1jo', '1jhn', '1 joao']],
  ['2john', '2 John', '2 João', '2 Juan', '2 Jean', '2. Johannes', '2 Giovanni', ['2jn', '2jo', '2jhn', '2 joao']],
  ['3john', '3 John', '3 João', '3 Juan', '3 Jean', '3. Johannes', '3 Giovanni', ['3jn', '3jo', '3jhn', '3 joao']],
  ['jude', 'Jude', 'Judas', 'Judas', 'Jude', 'Judas', 'Giuda', ['jud', 'jd']],
  ['revelation', 'Revelation', 'Apocalipse', 'Apocalipsis', 'Apocalypse', 'Offenbarung', 'Apocalisse', ['rev', 're', 'ap', 'apoc', 'revelations']],
]

export const CANONICAL_BIBLE_BOOKS = ROWS.map(([id, en, pt, es, fr, de, it, abbreviations]) => ({
  id,
  names: { en, pt, 'pt-BR': pt, es, fr, de, it },
  abbreviations,
}))

function bookKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

const BOOK_KEYS = new Map<string, string>()
// Abbreviations first, then ids and names, so a full name always wins over a
// short form that collides with it (Portuguese "Jó" is Job, not John).
for (const book of CANONICAL_BIBLE_BOOKS) {
  for (const abbreviation of book.abbreviations) BOOK_KEYS.set(bookKey(abbreviation), book.id)
}
for (const book of CANONICAL_BIBLE_BOOKS) {
  BOOK_KEYS.set(bookKey(book.id), book.id)
  for (const name of Object.values(book.names)) BOOK_KEYS.set(bookKey(name), book.id)
}

/**
 * Book id for an id, a name in any interface language, an abbreviation, or a
 * 1-based canonical number (1 = Genesis, 66 = Revelation). Null when unknown.
 */
export function resolveBookId(value: unknown): string | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? (CANONICAL_BIBLE_BOOKS[value - 1]?.id ?? null) : null
  }
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (/^\d{1,2}$/.test(trimmed)) return resolveBookId(Number(trimmed))
  return BOOK_KEYS.get(bookKey(trimmed)) ?? null
}
