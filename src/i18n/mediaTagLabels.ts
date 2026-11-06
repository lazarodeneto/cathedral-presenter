import type { Locale } from '../types'

export const STANDARD_MEDIA_TAGS = [
  'Campus Algarve', 'Londres Campus Sul', 'Londres Campus North', 'Oração',
  'Culto', 'Pastor', 'Louvor', 'Equipe de Louvor', 'Acampamento', 'Vigília',
  'Convidado', 'Música', 'Pregação', 'Jovens', 'Adultos', 'Crianças', 'Igreja',
  'Mulheres', 'Homens', 'Mídia', 'Pr. Jackson Antonio', 'Pra. Akemi Antonio',
  'Pr. Pool Mcartney', 'Pr. Sidney Santos', 'Gabriela Rocha', 'Natália Machado',
] as const

const pt: string[] = [...STANDARD_MEDIA_TAGS]
pt[2] = 'Londres Campus Norte'
const labels: Record<Locale, readonly string[]> = {
  pt, 'pt-BR': pt,
  en: ['Algarve Campus', 'London South Campus', 'London North Campus', 'Prayer', 'Service', 'Pastor', 'Worship', 'Worship team', 'Camp', 'Prayer vigil', 'Guest', 'Music', 'Sermon', 'Youth', 'Adults', 'Children', 'Church', 'Women', 'Men', 'Media', 'Pastor Jackson Antonio', 'Pastor Akemi Antonio', 'Pastor Pool Mcartney', 'Pastor Sidney Santos', 'Gabriela Rocha', 'Natália Machado'],
  es: ['Campus Algarve', 'Campus Londres Sur', 'Campus Londres Norte', 'Oración', 'Culto', 'Pastor', 'Alabanza', 'Equipo de alabanza', 'Campamento', 'Vigilia', 'Invitado', 'Música', 'Predicación', 'Jóvenes', 'Adultos', 'Niños', 'Iglesia', 'Mujeres', 'Hombres', 'Multimedia', 'Pastor Jackson Antonio', 'Pastora Akemi Antonio', 'Pastor Pool Mcartney', 'Pastor Sidney Santos', 'Gabriela Rocha', 'Natália Machado'],
  fr: ['Campus Algarve', 'Campus de Londres Sud', 'Campus de Londres Nord', 'Prière', 'Culte', 'Pasteur', 'Louange', 'Équipe de louange', 'Camp', 'Veillée de prière', 'Invité', 'Musique', 'Prédication', 'Jeunes', 'Adultes', 'Enfants', 'Église', 'Femmes', 'Hommes', 'Médias', 'Pasteur Jackson Antonio', 'Pasteure Akemi Antonio', 'Pasteur Pool Mcartney', 'Pasteur Sidney Santos', 'Gabriela Rocha', 'Natália Machado'],
  de: ['Campus Algarve', 'London Campus Süd', 'London Campus Nord', 'Gebet', 'Gottesdienst', 'Pastor', 'Lobpreis', 'Lobpreisteam', 'Freizeit', 'Gebetsnacht', 'Gast', 'Musik', 'Predigt', 'Jugend', 'Erwachsene', 'Kinder', 'Gemeinde', 'Frauen', 'Männer', 'Medien', 'Pastor Jackson Antonio', 'Pastorin Akemi Antonio', 'Pastor Pool Mcartney', 'Pastor Sidney Santos', 'Gabriela Rocha', 'Natália Machado'],
  it: ['Campus Algarve', 'Campus Londra Sud', 'Campus Londra Nord', 'Preghiera', 'Culto', 'Pastore', 'Lode', 'Gruppo di lode', 'Campeggio', 'Veglia di preghiera', 'Ospite', 'Musica', 'Predicazione', 'Giovani', 'Adulti', 'Bambini', 'Chiesa', 'Donne', 'Uomini', 'Media', 'Pastore Jackson Antonio', 'Pastora Akemi Antonio', 'Pastore Pool Mcartney', 'Pastore Sidney Santos', 'Gabriela Rocha', 'Natália Machado'],
}
const key = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim()
const aliases = new Map<string, string>()
for (const values of [STANDARD_MEDIA_TAGS, ...Object.values(labels)]) values.forEach((value, index) => aliases.set(key(value), STANDARD_MEDIA_TAGS[index]))
for (const old of ['Pr. Sidney', 'Pastor Sidney', 'Pasteur Sidney', 'Pastore Sidney']) aliases.set(key(old), 'Pr. Sidney Santos')

export function canonicalMediaTag(value: string): string { return aliases.get(key(value)) ?? value }
export function mediaTagLabel(value: string, locale: Locale): string {
  const canonical = canonicalMediaTag(value)
  const index = STANDARD_MEDIA_TAGS.indexOf(canonical as typeof STANDARD_MEDIA_TAGS[number])
  return index < 0 ? value : labels[locale][index]
}
