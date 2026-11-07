import type { Locale } from '../types'
const rows: Record<Locale, string[]> = {
  en: ['Bible updated.', '{count} characters'],
  pt: ['Bíblia atualizada.', '{count} caracteres'],
  'pt-BR': ['Bíblia atualizada.', '{count} caracteres'],
  es: ['Biblia actualizada.', '{count} caracteres'],
  fr: ['Bible mise à jour.', '{count} caractères'],
  de: ['Bibel aktualisiert.', '{count} Zeichen'],
  it: ['Bibbia aggiornata.', '{count} caratteri'],
}
export const auditStrings = {} as Record<Locale, Record<string,string>>
for (const locale of Object.keys(rows) as Locale[]) auditStrings[locale] = { 'settings.bibleUpdated': rows[locale][0], 'editor.characters': rows[locale][1] }
const connection: Record<Locale,string[]> = {
 en: ['Connect presentation screens','Open Cathedral Presenter on the presentation computer.','Connect TVs or projectors using extended display mode.','Pair that computer in the online output settings.','Assign each display a role in Outputs.','Open installed app','Check connection','Configure outputs','Computer connected. Review Outputs, then press Present again.'],
 pt: ['Ligar telas de apresentação','Abra o Cathedral Presenter no computador da apresentação.','Ligue TVs ou projetores em modo de ecrã expandido.','Associe o computador nas definições de saídas do site.','Atribua uma função a cada tela em Saídas.','Abrir aplicação instalada','Verificar ligação','Configurar saídas','Computador ligado. Reveja as Saídas e volte a premir Apresentar.'],
 'pt-BR': ['Conectar telas de apresentação','Abra o Cathedral Presenter no computador da apresentação.','Conecte TVs ou projetores em modo de tela estendida.','Vincule o computador nas configurações de saídas do site.','Atribua uma função a cada tela em Saídas.','Abrir aplicativo instalado','Verificar conexão','Configurar saídas','Computador conectado. Confira as Saídas e pressione Apresentar novamente.'],
 es: ['Conectar pantallas','Abre Cathedral Presenter en el ordenador de presentación.','Conecta las pantallas en modo extendido.','Vincula el ordenador en los ajustes de salidas del sitio.','Asigna un rol a cada pantalla en Salidas.','Abrir aplicación instalada','Comprobar conexión','Configurar salidas','Ordenador conectado. Revisa Salidas y pulsa Presentar de nuevo.'],
 fr: ['Connecter les écrans','Ouvrez Cathedral Presenter sur l’ordinateur de présentation.','Connectez les écrans en mode étendu.','Associez l’ordinateur dans les réglages des sorties du site.','Attribuez un rôle à chaque écran dans Sorties.','Ouvrir l’application installée','Vérifier la connexion','Configurer les sorties','Ordinateur connecté. Vérifiez les sorties, puis relancez la présentation.'],
 de: ['Präsentationsbildschirme verbinden','Cathedral Presenter auf dem Präsentationscomputer öffnen.','Bildschirme im erweiterten Modus verbinden.','Computer in den Ausgabe-Einstellungen der Website koppeln.','Jedem Bildschirm unter Ausgaben eine Rolle zuweisen.','Installierte App öffnen','Verbindung prüfen','Ausgaben einrichten','Computer verbunden. Ausgaben prüfen und erneut Präsentieren drücken.'],
 it: ['Collega gli schermi','Apri Cathedral Presenter sul computer della presentazione.','Collega gli schermi in modalità estesa.','Associa il computer nelle impostazioni delle uscite del sito.','Assegna un ruolo a ogni schermo nelle Uscite.','Apri app installata','Verifica connessione','Configura uscite','Computer collegato. Controlla le Uscite e premi di nuovo Presenta.'],
}
for (const locale of Object.keys(connection) as Locale[]) ['title','stepApp','stepExtend','stepPair','stepOutputs','open','check','outputs','ready'].forEach((key,i)=>{auditStrings[locale][`connection.${key}`]=connection[locale][i]})
const history: Record<Locale,string[]> = {
 en:['Previous connections','Saved display history. These devices are not currently detected and are not counted as available outputs.'],
 pt:['Ligações anteriores','Histórico de telas guardadas. Estes aparelhos não estão a ser detetados e não contam como saídas disponíveis.'],
 'pt-BR':['Conexões anteriores','Histórico de telas salvas. Estes aparelhos não estão sendo detectados e não contam como saídas disponíveis.'],
 es:['Conexiones anteriores','Historial de pantallas guardadas. No se detectan actualmente y no cuentan como salidas disponibles.'],
 fr:['Connexions précédentes','Historique des écrans enregistrés. Ils ne sont pas détectés actuellement et ne comptent pas comme sorties disponibles.'],
 de:['Frühere Verbindungen','Gespeicherter Bildschirmverlauf. Diese Geräte werden aktuell nicht erkannt und zählen nicht als verfügbare Ausgaben.'],
 it:['Connessioni precedenti','Cronologia degli schermi salvati. Questi dispositivi non vengono rilevati e non contano come uscite disponibili.'],
}
for(const locale of Object.keys(history) as Locale[]){auditStrings[locale]['hardware.history']=history[locale][0];auditStrings[locale]['hardware.historyHelp']=history[locale][1]}
