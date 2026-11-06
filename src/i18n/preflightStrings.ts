import type { Locale } from '../types'
const keys = ['title', 'slides', 'missing', 'internet', 'media', 'storage', 'disk', 'recheck']
const rows: Record<Locale, string[]> = {
  en: ['Service check', 'Add slides before presenting.', 'Media is missing or cannot be played.', 'This item needs internet access.', 'Media is ready.', 'Local database connection', 'Low disk space. Free space before the service.', 'Check again'],
  pt: ['Verificação do culto', 'Adicione diapositivos antes de apresentar.', 'Média em falta ou incompatível.', 'Este item precisa de acesso à internet.', 'Média pronta.', 'Ligação à base de dados local', 'Pouco espaço em disco. Liberte espaço antes do culto.', 'Verificar novamente'],
  'pt-BR': ['Verificação do culto', 'Adicione slides antes de apresentar.', 'Mídia ausente ou incompatível.', 'Este item precisa de acesso à internet.', 'Mídia pronta.', 'Conexão com o banco de dados local', 'Pouco espaço em disco. Libere espaço antes do culto.', 'Verificar novamente'],
  es: ['Comprobar servicio', 'Añade diapositivas antes de presentar.', 'Falta un archivo o no se puede reproducir.', 'Este elemento necesita internet.', 'Archivo listo.', 'Conexión a la base de datos local', 'Poco espacio en disco. Libera espacio antes del servicio.', 'Comprobar otra vez'],
  fr: ['Vérification du culte', 'Ajoutez des diapositives avant de présenter.', 'Média absent ou illisible.', 'Cet élément nécessite internet.', 'Média prêt.', 'Connexion à la base locale', 'Espace disque faible. Libérez de l’espace avant le culte.', 'Vérifier à nouveau'],
  de: ['Gottesdienst prüfen', 'Vor der Präsentation Folien hinzufügen.', 'Medium fehlt oder kann nicht abgespielt werden.', 'Dieses Element benötigt Internet.', 'Medium bereit.', 'Verbindung zur lokalen Datenbank', 'Wenig Speicherplatz. Vor dem Gottesdienst Platz freigeben.', 'Erneut prüfen'],
  it: ['Verifica del culto', 'Aggiungi diapositive prima di presentare.', 'Contenuto assente o non riproducibile.', 'Questo elemento richiede internet.', 'Contenuto pronto.', 'Connessione al database locale', 'Spazio su disco insufficiente. Libera spazio prima del culto.', 'Verifica di nuovo'],
}
export const preflightStrings = Object.fromEntries(Object.entries(rows).map(([locale, row]) => [locale, Object.fromEntries(keys.map((key, i) => [`preflight.${key}`, row[i]]))])) as Record<Locale, Record<string, string>>
