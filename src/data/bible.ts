import type { BibleTranslation, Locale } from '../types'

type TranslationSeed = Omit<BibleTranslation, 'verseCount'> & {
  books: Record<string, Record<number, Record<number, string>>>
}

export const BIBLE_BOOKS = [
  { id: 'psalms', names: { en: 'Psalms', pt: 'Salmos', 'pt-BR': 'Salmos', es: 'Salmos', fr: 'Psaumes', de: 'Psalmen', it: 'Salmi' }, abbreviations: ['ps', 'psalm', 'psalms', 'salmo', 'salmos'] },
  { id: 'john', names: { en: 'John', pt: 'João', 'pt-BR': 'João', es: 'Juan', fr: 'Jean', de: 'Johannes', it: 'Giovanni' }, abbreviations: ['jn', 'john', 'joao', 'joão', 'juan', 'jean', 'johannes', 'giovanni'] },
  { id: 'romans', names: { en: 'Romans', pt: 'Romanos', 'pt-BR': 'Romanos', es: 'Romanos', fr: 'Romains', de: 'Römer', it: 'Romani' }, abbreviations: ['ro', 'rom', 'romans', 'romanos', 'romains', 'römer', 'romer', 'romani'] },
  { id: '1corinthians', names: { en: '1 Corinthians', pt: '1 Coríntios', 'pt-BR': '1 Coríntios', es: '1 Corintios', fr: '1 Corinthiens', de: '1. Korinther', it: '1 Corinzi' }, abbreviations: ['1co', '1cor', '1 corinthians', '1 corintios', '1 coríntios', '1 corinthiens', '1 korinther', '1 corinzi'] },
  { id: 'matthew', names: { en: 'Matthew', pt: 'Mateus', 'pt-BR': 'Mateus', es: 'Mateo', fr: 'Matthieu', de: 'Matthäus', it: 'Matteo' }, abbreviations: ['mt', 'matt', 'matthew', 'mateus', 'mateo', 'matthieu', 'matthäus', 'matthaus', 'matteo'] },
  { id: 'isaiah', names: { en: 'Isaiah', pt: 'Isaías', 'pt-BR': 'Isaías', es: 'Isaías', fr: 'Ésaïe', de: 'Jesaja', it: 'Isaia' }, abbreviations: ['isa', 'is', 'isaiah', 'isaias', 'isaías', 'ésaïe', 'esaie', 'jesaja', 'isaia'] },
  { id: 'philippians', names: { en: 'Philippians', pt: 'Filipenses', 'pt-BR': 'Filipenses', es: 'Filipenses', fr: 'Philippiens', de: 'Philipper', it: 'Filippesi' }, abbreviations: ['php', 'phil', 'philippians', 'filipenses', 'philippiens', 'philipper', 'filippesi'] },
] as const

export const BOOK_IDS = BIBLE_BOOKS.map((book) => book.id)

export function bookName(bookId: string, language: Locale): string {
  const book = BIBLE_BOOKS.find((entry) => entry.id === bookId)
  if (!book) return bookId
  return book.names[language] ?? book.names.en
}

const psalm23 = {
  1: 'The LORD is my shepherd; I shall not want.',
  2: 'He makes me lie down in green pastures. He leads me beside still waters.',
  3: "He restores my soul. He guides me in the paths of righteousness for his name's sake.",
  4: 'Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me.',
  5: 'You prepare a table before me in the presence of my enemies. You anoint my head with oil. My cup runs over.',
  6: "Surely goodness and loving kindness shall follow me all the days of my life, and I will dwell in the LORD's house forever.",
}

const webBooks = {
  psalms: { 23: psalm23 },
  john: {
    3: {
      16: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.',
      17: 'For God didn’t send his Son into the world to judge the world, but that the world should be saved through him.',
    },
  },
  romans: {
    8: {
      28: 'We know that all things work together for good for those who love God, for those who are called according to his purpose.',
      31: 'What then shall we say about these things? If God is for us, who can be against us?',
      38: 'For I am persuaded that neither death, nor life, nor angels, nor principalities, nor things present, nor things to come, nor powers,',
      39: 'nor height, nor depth, nor any other created thing, will be able to separate us from God’s love which is in Christ Jesus our Lord.',
    },
  },
  '1corinthians': {
    13: {
      1: 'If I speak with the languages of men and of angels, but don’t have love, I have become sounding brass, or a clanging cymbal.',
      4: 'Love is patient and is kind. Love doesn’t envy. Love doesn’t brag, is not proud,',
      5: 'doesn’t behave itself inappropriately, doesn’t seek its own way, is not provoked, takes no account of evil;',
      6: 'doesn’t rejoice in unrighteousness, but rejoices with the truth;',
      7: 'bears all things, believes all things, hopes all things, and endures all things.',
      13: 'But now faith, hope, and love remain—these three. The greatest of these is love.',
    },
  },
  matthew: {
    5: {
      1: 'Seeing the multitudes, he went up onto the mountain. When he had sat down, his disciples came to him.',
      2: 'He opened his mouth and taught them, saying,',
      3: '“Blessed are the poor in spirit, for theirs is the Kingdom of Heaven.',
      4: 'Blessed are those who mourn, for they shall be comforted.',
      5: 'Blessed are the gentle, for they shall inherit the earth.',
      6: 'Blessed are those who hunger and thirst after righteousness, for they shall be filled.',
      7: 'Blessed are the merciful, for they shall obtain mercy.',
      8: 'Blessed are the pure in heart, for they shall see God.',
      9: 'Blessed are the peacemakers, for they shall be called children of God.',
      10: 'Blessed are those who have been persecuted for righteousness’ sake, for theirs is the Kingdom of Heaven.',
      11: '“Blessed are you when people reproach you, persecute you, and say all kinds of evil against you falsely, for my sake.',
      12: 'Rejoice, and be exceedingly glad, for great is your reward in heaven. For that is how they persecuted the prophets who were before you.',
    },
  },
  isaiah: {
    40: {
      31: 'But those who wait for the LORD will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.',
    },
  },
  philippians: {
    4: {
      6: 'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God.',
      7: 'And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.',
    },
  },
}

const oebBooks = {
  psalms: {
    23: {
      1: 'The Lord is my shepherd; I shall not want.',
      2: 'He makes me lie down in green pastures; he leads me beside the waters of rest.',
      3: 'He restores my soul; he guides me in right paths for his name’s sake.',
      4: 'Even when I pass through the darkest valley, I fear no evil, for you are with me; your rod and your staff comfort me.',
      5: 'You spread a table before me in the sight of my foes; you anoint my head with oil; my cup overflows.',
      6: 'Surely goodness and love will follow me all the days of my life, and I will dwell in the house of the Lord for ever.',
    },
  },
  john: { 3: { 16: 'For God so loved the world that he gave his only Son, that everyone who believes in him should not perish but have eternal life.' } },
  romans: { 8: { 28: 'And we know that all things work together for good to those who love God, who are called according to his purpose.' } },
  '1corinthians': { 13: { 4: 'Love is patient and kind; love does not envy or boast; it is not arrogant or rude.', 7: 'It bears all things, believes all things, hopes all things, endures all things.', 13: 'And now faith, hope, and love remain, these three; but the greatest of these is love.' } },
  matthew: { 5: { 3: 'Blessed are the poor in spirit, for theirs is the kingdom of heaven.', 14: 'You are the light of the world. A city set on a hill cannot be hidden.' } },
}

const bsbBooks = {
  psalms: {
    23: {
      1: 'The LORD is my shepherd; I shall not want.',
      2: 'He makes me lie down in green pastures; He leads me beside quiet waters.',
      3: 'He restores my soul; He guides me in the paths of righteousness for the sake of His name.',
      4: 'Even though I walk through the valley of the shadow of death, I will fear no evil, for You are with me; Your rod and Your staff, they comfort me.',
      5: 'You prepare a table before me in the presence of my enemies. You anoint my head with oil; my cup overflows.',
      6: 'Surely goodness and mercy will follow me all the days of my life, and I will dwell in the house of the LORD forever.',
    },
  },
  john: { 3: { 16: 'For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.' } },
  romans: { 8: { 28: 'And we know that God works all things together for the good of those who love Him, who are called according to His purpose.' } },
  isaiah: { 40: { 31: 'But those who wait upon the LORD will renew their strength; they will mount up with wings like eagles; they will run and not grow weary; they will walk and not faint.' } },
}

const blivreBooks = {
  psalms: {
    23: {
      1: 'O SENHOR é meu pastor, nada me faltará.',
      2: 'Ele me faz deitar em pastos verdes, e me leva a águas quietas.',
      3: 'Ele restaura minha alma, e me guia pelos caminhos da justiça por seu nome.',
      4: 'Ainda que eu venha a andar pelo vale da sombra da morte, não temerei mal algum, porque tu estás comigo; tua vara e teu cajado me consolam.',
      5: 'Tu preparas uma mesa diante de mim à vista de meus adversários; unges a minha cabeça com azeite, meu cálice transborda.',
      6: 'Certamente o bem e a bondade me seguirão todos os dias de minha vida; e habitarei na casa do SENHOR por muitos e muitos dias.',
    },
  },
  john: { 3: { 16: 'Porque Deus amou ao mundo de tal maneira, que deu o seu Filho unigênito; para que todo aquele que nele crê não pereça, mas tenha a vida eterna.' } },
  romans: { 8: { 28: 'E sabemos que todas as coisas juntamente contribuem para o bem daqueles que amam a Deus, dos que são chamados segundo o seu propósito.' } },
  isaiah: { 40: { 31: 'Mas os que confiam no SENHOR renovarão as forças, subirão com asas como águias; correrão, e não se cansarão; caminharão, e não se fatigarão.' } },
  philippians: { 4: { 6: 'Não estejais ansiosos por coisa alguma; mas em tudo, por meio de orações e súplicas com ações de gratidão, sejam os vossos pedidos conhecidos por Deus;', 7: 'e a paz de Deus, que excede todo entendimento, guardará os vossos corações e as vossas mentes em Cristo Jesus.' } },
  '1corinthians': { 13: { 4: 'O amor é paciente, é bondoso; o amor não é invejoso; o amor não é orgulhoso, não é arrogante.', 7: 'Tudo aguenta, tudo crê, tudo espera, tudo suporta.', 13: 'E agora continuam a fé, a esperança, e o amor, estes três; porém o maior destes é o amor.' } },
}

const rvBooks = {
  psalms: {
    23: {
      1: 'Jehová es mi pastor; nada me faltará.',
      2: 'En lugares de delicados pastos me hará yacer; junto a aguas de reposo me pastoreará.',
      3: 'Confortará mi alma; guiárame por sendas de justicia por amor de su nombre.',
      4: 'Aunque ande en valle de sombra de muerte, no temeré mal alguno, porque tú estarás conmigo; tu vara y tu cayado me infundirán aliento.',
      5: 'Aderezarás mesa delante de mí en presencia de mis angustiadores; ungiste mi cabeza con aceite; mi copa está rebosando.',
      6: 'Ciertamente el bien y la misericordia me seguirán todos los días de mi vida; y en la casa de Jehová moraré por largos días.',
    },
  },
  john: { 3: { 16: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree no se pierda, mas tenga vida eterna.' } },
  romans: { 8: { 28: 'Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien, esto es, a los que conforme al propósito son llamados.' } },
}

const lsgBooks = {
  psalms: {
    23: {
      1: 'L’Éternel est mon berger: je ne manquerai de rien.',
      2: 'Il me fait reposer dans de verts pâturages, il me dirige près des eaux paisibles.',
      3: 'Il restaure mon âme, il me conduit dans les sentiers de la justice, à cause de son nom.',
      4: 'Quand je marche dans la vallée de l’ombre de la mort, je ne crains aucun mal, car tu es avec moi: ta houlette et ton bâton me rassurent.',
      5: 'Tu dresses devant moi une table, en face de mes adversaires; tu oins d’huile ma tête, et ma coupe déborde.',
      6: 'Oui, le bonheur et la grâce m’accompagneront tous les jours de ma vie, et j’habiterai dans la maison de l’Éternel jusqu’à la fin de mes jours.',
    },
  },
  john: { 3: { 16: 'Car Dieu a tant aimé le monde qu’il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu’il ait la vie éternelle.' } },
  romans: { 8: { 28: 'Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu, de ceux qui sont appelés selon son dessein.' } },
}

const lutBooks = {
  psalms: {
    23: {
      1: 'Der HERR ist mein Hirte; mir wird nichts mangeln.',
      2: 'Er weidet mich auf einer grünen Aue und führet mich zum frischen Wasser.',
      3: 'Er erquicket meine Seele; er führet mich auf rechter Straße um seines Namens willen.',
      4: 'Und ob ich schon wanderte im finstern Tal, fürchte ich kein Unglück; denn du bist bei mir, dein Stecken und Stab trösten mich.',
      5: 'Du bereitest vor mir einen Tisch im Angesicht meiner Feinde; du salbest mein Haupt mit Öl und schenkest mir voll ein.',
      6: 'Gutes und Barmherzigkeit werden mir folgen mein Leben lang, und ich werde bleiben im Hause des HERRN immerdar.',
    },
  },
  john: { 3: { 16: 'Also hat Gott die Welt geliebt, daß er seinen eingeborenen Sohn gab, auf daß alle, die an ihn glauben, nicht verloren werden, sondern das ewige Leben haben.' } },
  romans: { 8: { 28: 'Wir wissen aber, daß denen, die Gott lieben, alle Dinge zum Besten dienen, denen, die nach dem Vorsatz berufen sind.' } },
}

const rivBooks = {
  psalms: {
    23: {
      1: 'L’Eterno è il mio pastore; non manco di nulla.',
      2: 'Egli mi fa giacere in verdi pascoli, mi conduce ad acque tranquille.',
      3: 'Egli mi ristora l’anima, mi guida per sentieri di giustizia, per amor del suo nome.',
      4: 'Quand’anche camminassi per la valle dell’ombra della morte, non temerei alcun male, perché tu sei meco; il tuo bastone e la tua verga mi danno sicurezza.',
      5: 'Tu imbandisci la tavola dinanzi a me, sotto gli occhi dei miei nemici; tu ungi il mio capo con olio, la mia coppa trabocca.',
      6: 'Certo, beni e benignità m’accompagneranno tutti i giorni della mia vita; e abiterò nella casa dell’Eterno per lunghi giorni.',
    },
  },
  john: { 3: { 16: 'Poiché Iddio ha tanto amato il mondo, che ha dato il suo unigenito Figliuolo, affinché chiunque crede in lui non perisca, ma abbia vita eterna.' } },
  romans: { 8: { 28: 'Or noi sappiamo che tutte le cose cooperano al bene di quelli che amano Dio, i quali son chiamati secondo il suo proponimento.' } },
}

const seeds: TranslationSeed[] = [
  {
    id: 'web',
    providerId: 'local-bible',
    name: 'World English Bible',
    abbreviation: 'WEB',
    language: 'en',
    licenseType: 'public-domain',
    licenseText: 'Public Domain',
    sourceUrl: 'https://worldenglish.bible',
    copyrightNotice:
      'The World English Bible is in the public domain. “World English Bible” is a trademark of Michael Paul Johnson. This offline demo includes a curated excerpt, not the full Bible.',
    bundled: true,
    sample: true,
    availability: 'bundled',
    books: webBooks,
  },
  {
    id: 'oeb',
    providerId: 'local-bible',
    name: 'Open English Bible',
    abbreviation: 'OEB',
    language: 'en',
    licenseType: 'cc0',
    licenseText: 'CC0 / Public Domain',
    sourceUrl: 'https://openenglishbible.org',
    copyrightNotice:
      'The Open English Bible is released under CC0. This offline demo includes a curated excerpt, not the full Bible.',
    bundled: true,
    sample: true,
    availability: 'bundled',
    books: oebBooks,
  },
  {
    id: 'bsb',
    providerId: 'local-bible',
    name: 'Berean Standard Bible',
    abbreviation: 'BSB',
    language: 'en',
    licenseType: 'public-domain',
    licenseText: 'Public Domain dedication (2023)',
    sourceUrl: 'https://berean.bible/terms.htm',
    copyrightNotice:
      'The Berean Standard Bible text was dedicated to the public domain in 2023. This offline demo includes a curated excerpt, not the full Bible. Verify current publisher terms before redistributing a full copy.',
    bundled: true,
    sample: true,
    availability: 'bundled',
    books: bsbBooks,
  },
  {
    id: 'blivre',
    providerId: 'local-bible',
    name: 'Bíblia Livre',
    abbreviation: 'BLIVRE',
    language: 'pt-BR',
    licenseType: 'cc-by',
    licenseText: 'CC BY 4.0',
    sourceUrl: 'https://ebible.org/porbr2018/',
    copyrightNotice:
      'Bíblia Livre (BLIVRE), Copyright © 2018 Diego Santos, Mario Sérgio, e Marco Teles, https://sites.google.com/site/biblialivre/ — Licença Creative Commons Atribuição 4.0 Brasil. This offline demo includes a curated excerpt. Indicate BLIVRE and the authors when reusing this text.',
    bundled: true,
    sample: true,
    availability: 'bundled',
    books: blivreBooks,
  },
  {
    id: 'rv1909',
    providerId: 'local-bible',
    name: 'Reina-Valera 1909',
    abbreviation: 'RV1909',
    language: 'es',
    licenseType: 'public-domain',
    licenseText: 'Public Domain',
    sourceUrl: 'https://ebible.org/spaRV1909/',
    copyrightNotice: 'Reina-Valera 1909 is in the public domain. Source: eBible.org. Curated offline demo excerpt.',
    bundled: true,
    sample: true,
    availability: 'bundled',
    books: rvBooks,
  },
  {
    id: 'lsg1910',
    providerId: 'local-bible',
    name: 'Louis Segond 1910',
    abbreviation: 'LSG',
    language: 'fr',
    licenseType: 'public-domain',
    licenseText: 'Public Domain',
    sourceUrl: 'https://ebible.org/fraLSG/',
    copyrightNotice: 'Louis Segond 1910 is in the public domain. Source: eBible.org. Curated offline demo excerpt.',
    bundled: true,
    sample: true,
    availability: 'bundled',
    books: lsgBooks,
  },
  {
    id: 'lut1912',
    providerId: 'local-bible',
    name: 'Luther Bible 1912',
    abbreviation: 'LUT',
    language: 'de',
    licenseType: 'public-domain',
    licenseText: 'Public Domain',
    sourceUrl: 'https://ebible.org/deu1912/',
    copyrightNotice: 'Luther Bible 1912 is in the public domain. Source: eBible.org. Curated offline demo excerpt.',
    bundled: true,
    sample: true,
    availability: 'bundled',
    books: lutBooks,
  },
  {
    id: 'riv1927',
    providerId: 'local-bible',
    name: 'Riveduta 1927',
    abbreviation: 'RIV',
    language: 'it',
    licenseType: 'public-domain',
    licenseText: 'Public Domain',
    sourceUrl: 'https://ebible.org/ita1927/',
    copyrightNotice: 'Riveduta 1927 is in the public domain. Source: eBible.org. Curated offline demo excerpt.',
    bundled: true,
    sample: true,
    availability: 'bundled',
    books: rivBooks,
  },
]

function countVerses(books: TranslationSeed['books']): number {
  let count = 0
  for (const chapters of Object.values(books)) {
    for (const verses of Object.values(chapters)) {
      count += Object.keys(verses).length
    }
  }
  return count
}

export const BIBLE_TRANSLATIONS: BibleTranslation[] = seeds.map(({ books, ...translation }) => ({
  ...translation,
  verseCount: countVerses(books),
}))

export const BIBLE_VERSES: Record<string, TranslationSeed['books']> = Object.fromEntries(
  seeds.map((seed) => [seed.id, seed.books]),
)
