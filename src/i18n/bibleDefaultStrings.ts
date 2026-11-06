import type { Locale } from '../types'
export const bibleDefaultStrings: Record<Locale, Record<string, string>> = {
  en: {
    'bible.sampleNote':
      'Complete offline Bibles · Bíblia Livre and Tradução Brasileira are included.',
    'bible.chapterNotBundled':
      'This chapter was not found in this translation. Choose another chapter or translation.',
  },
  pt: {
    'bible.sampleNote': 'Bíblias completas offline · Bíblia Livre e Tradução Brasileira incluídas.',
    'bible.chapterNotBundled':
      'Este capítulo não foi encontrado nesta tradução. Escolha outro capítulo ou tradução.',
  },
  'pt-BR': {
    'bible.sampleNote':
      'Bíblias completas offline · Bíblia Livre e Tradução Brasileira já incluídas.',
    'bible.chapterNotBundled':
      'Este capítulo não foi encontrado nesta tradução. Selecione outro capítulo ou tradução.',
  },
  es: {
    'bible.sampleNote':
      'Biblias completas sin conexión · Bíblia Livre y Tradução Brasileira incluidas.',
    'bible.chapterNotBundled':
      'No se encontró este capítulo en esta traducción. Elige otro capítulo o traducción.',
  },
  fr: {
    'bible.sampleNote':
      'Bibles complètes hors ligne · Bíblia Livre et Tradução Brasileira incluses.',
    'bible.chapterNotBundled':
      'Ce chapitre est introuvable dans cette traduction. Choisissez un autre chapitre ou une autre traduction.',
  },
  de: {
    'bible.sampleNote':
      'Vollständige Offline-Bibeln · Bíblia Livre und Tradução Brasileira enthalten.',
    'bible.chapterNotBundled':
      'Dieses Kapitel wurde in dieser Übersetzung nicht gefunden. Wählen Sie ein anderes Kapitel oder eine andere Übersetzung.',
  },
  it: {
    'bible.sampleNote': 'Bibbie complete offline · Bíblia Livre e Tradução Brasileira incluse.',
    'bible.chapterNotBundled':
      'Capitolo non trovato in questa traduzione. Scegli un altro capitolo o un’altra traduzione.',
  },
}

const addBibleLabels: Record<Locale, string> = {
  en: 'Add a new Bible',
  pt: 'Adicionar nova Bíblia',
  'pt-BR': 'Adicionar nova Bíblia',
  es: 'Añadir nueva Biblia',
  fr: 'Ajouter une Bible',
  de: 'Neue Bibel hinzufügen',
  it: 'Aggiungi una Bibbia',
}
for (const locale of Object.keys(addBibleLabels) as Locale[])
  bibleDefaultStrings[locale]['bible.addNew'] = addBibleLabels[locale]

const modeLabels: Record<Locale, [string, string]> = {
  en: ['1 Bible', '2 Bibles'],
  pt: ['1 Bíblia', '2 Bíblias'],
  'pt-BR': ['1 Bíblia', '2 Bíblias'],
  es: ['1 Biblia', '2 Biblias'],
  fr: ['Une Bible', 'Deux Bibles'],
  de: ['1 Bibel', '2 Bibeln'],
  it: ['1 Bibbia', '2 Bibbie'],
}
for (const locale of Object.keys(modeLabels) as Locale[]) {
  bibleDefaultStrings[locale]['bible.oneTranslation'] = modeLabels[locale][0]
  bibleDefaultStrings[locale]['bible.twoTranslations'] = modeLabels[locale][1]
}
