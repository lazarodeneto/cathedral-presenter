import type { Locale } from '../types'
const keys = ['title', 'local', 'drive', 'connectDrive', 'syncDrive', 'protected', 'checking', 'scanning', 'scannerUnavailable', 'virusDetected', 'signIn', 'cloudSetup', 'failed', 'synced']
const rows: Record<Locale, string[]> = {
  en: ['Save uploads to', 'This computer', 'Google Drive · local copy', 'Connect church Drive', 'Sync Drive', 'Antivirus protection active', 'Checking protection…', 'Scanning and saving…', 'Antivirus unavailable. Uploads are blocked until protection is restored.', 'Threat detected. This file was blocked and was not added to the library.', 'Sign in to save and manage the church media library.', 'The administrator must configure Google Drive before connecting the church account.', 'The media service could not complete the request. Check the connection and try again.', 'Church Drive synchronized.'],
  pt: ['Guardar envios em', 'Este computador', 'Google Drive · cópia local', 'Ligar Drive da igreja', 'Sincronizar Drive', 'Proteção antivírus ativa', 'A verificar a proteção…', 'A analisar e guardar…', 'Antivírus indisponível. Os envios estão bloqueados até a proteção ser restabelecida.', 'Ameaça detetada. Este ficheiro foi bloqueado e não foi adicionado à biblioteca.', 'Inicie sessão para guardar e gerir a biblioteca de média da igreja.', 'O administrador precisa de configurar o Google Drive antes de ligar a conta da igreja.', 'O serviço de média não conseguiu concluir o pedido. Verifique a ligação e tente novamente.', 'Drive da igreja sincronizado.'],
  'pt-BR': ['Salvar envios em', 'Este computador', 'Google Drive · cópia local', 'Conectar Drive da igreja', 'Sincronizar Drive', 'Proteção antivírus ativa', 'Verificando a proteção…', 'Analisando e salvando…', 'Antivírus indisponível. Os envios estão bloqueados até a proteção ser restabelecida.', 'Ameaça detectada. Este arquivo foi bloqueado e não foi adicionado à biblioteca.', 'Entre na sua conta para salvar e gerenciar a biblioteca de mídia da igreja.', 'O administrador precisa configurar o Google Drive antes de conectar a conta da igreja.', 'O serviço de mídia não conseguiu concluir o pedido. Verifique a conexão e tente novamente.', 'Drive da igreja sincronizado.'],
  es: ['Guardar archivos en', 'Este ordenador', 'Google Drive · copia local', 'Conectar Drive de la iglesia', 'Sincronizar Drive', 'Protección antivirus activa', 'Verificando protección…', 'Analizando y guardando…', 'Antivirus no disponible. Las cargas están bloqueadas hasta restablecer la protección.', 'Amenaza detectada. El archivo fue bloqueado y no se añadió a la biblioteca.', 'Inicia sesión para guardar y gestionar los archivos de la iglesia.', 'El administrador debe configurar Google Drive antes de conectar la cuenta de la iglesia.', 'No se pudo completar la solicitud. Revisa la conexión e inténtalo de nuevo.', 'Drive de la iglesia sincronizado.'],
  fr: ['Enregistrer dans', 'Cet ordinateur', 'Google Drive · copie locale', 'Connecter le Drive de l’église', 'Synchroniser Drive', 'Protection antivirus active', 'Vérification de la protection…', 'Analyse et enregistrement…', 'Antivirus indisponible. Les envois sont bloqués jusqu’au rétablissement de la protection.', 'Menace détectée. Ce fichier a été bloqué et n’a pas été ajouté à la bibliothèque.', 'Connectez-vous pour gérer les médias de l’église.', 'L’administrateur doit configurer Google Drive avant de connecter le compte de l’église.', 'Le service n’a pas pu terminer la demande. Vérifiez la connexion et réessayez.', 'Drive de l’église synchronisé.'],
  de: ['Uploads speichern in', 'Diesem Computer', 'Google Drive · lokale Kopie', 'Gemeinde-Drive verbinden', 'Drive synchronisieren', 'Virenschutz aktiv', 'Virenschutz wird geprüft…', 'Prüfen und speichern…', 'Virenschutz nicht verfügbar. Uploads bleiben bis zur Wiederherstellung gesperrt.', 'Bedrohung erkannt. Die Datei wurde blockiert und nicht zur Bibliothek hinzugefügt.', 'Zum Verwalten der Gemeindemedien bitte anmelden.', 'Die Administration muss Google Drive vor dem Verbinden des Gemeindekontos einrichten.', 'Die Anfrage konnte nicht abgeschlossen werden. Verbindung prüfen und erneut versuchen.', 'Gemeinde-Drive synchronisiert.'],
  it: ['Salva caricamenti su', 'Questo computer', 'Google Drive · copia locale', 'Collega Drive della chiesa', 'Sincronizza Drive', 'Protezione antivirus attiva', 'Verifica protezione…', 'Analisi e salvataggio…', 'Antivirus non disponibile. I caricamenti sono bloccati fino al ripristino della protezione.', 'Minaccia rilevata. Il file è stato bloccato e non è stato aggiunto alla raccolta.', 'Accedi per gestire i contenuti multimediali della chiesa.', 'L’amministratore deve configurare Google Drive prima di collegare l’account della chiesa.', 'Impossibile completare la richiesta. Verifica la connessione e riprova.', 'Drive della chiesa sincronizzato.'],
}
export const storageStrings = Object.fromEntries(Object.entries(rows).map(([locale, values]) => [locale, Object.fromEntries(keys.map((key, index) => [`storage.${key}`, values[index]]))])) as Record<Locale, Record<string, string>>
const naming: Record<Locale, string[]> = {
  en: ['Rename media', 'Media name', 'Media renamed.'],
  pt: ['Renomear média', 'Nome da média', 'Média renomeada.'],
  'pt-BR': ['Renomear mídia', 'Nome da mídia', 'Mídia renomeada.'],
  es: ['Renombrar archivo', 'Nombre del archivo', 'Archivo renombrado.'],
  fr: ['Renommer le média', 'Nom du média', 'Média renommé.'],
  de: ['Medium umbenennen', 'Medienname', 'Medium umbenannt.'],
  it: ['Rinomina contenuto', 'Nome del contenuto', 'Contenuto rinominato.'],
}
for (const locale of Object.keys(naming) as Locale[]) ['rename', 'mediaName', 'renamed'].forEach((key, index) => { storageStrings[locale][`storage.${key}`] = naming[locale][index] })

const driveSetup: Record<Locale, string[]> = {
 en: ['Configure church Drive', 'Google OAuth client ID', 'Client secret', 'Authorized redirect address'],
 pt: ['Configurar Drive da igreja', 'ID do cliente Google OAuth', 'Segredo do cliente', 'Endereço de redirecionamento autorizado'],
 'pt-BR': ['Configurar Drive da igreja', 'ID do cliente Google OAuth', 'Segredo do cliente', 'Endereço de redirecionamento autorizado'],
 es: ['Configurar Drive de la iglesia', 'ID de cliente Google OAuth', 'Secreto de cliente', 'Dirección de redirección autorizada'],
 fr: ['Configurer le Drive de l’église', 'ID client Google OAuth', 'Secret client', 'Adresse de redirection autorisée'],
 de: ['Gemeinde-Drive einrichten', 'Google-OAuth-Client-ID', 'Client-Geheimnis', 'Autorisierte Weiterleitungsadresse'],
 it: ['Configura Drive della chiesa', 'ID client Google OAuth', 'Segreto client', 'Indirizzo di reindirizzamento autorizzato'],
}
for (const locale of Object.keys(driveSetup) as Locale[]) ['configureDrive', 'clientId', 'clientSecret', 'redirectUri'].forEach((key, i) => { storageStrings[locale][`storage.${key}`] = driveSetup[locale][i] })

const browserConnection: Record<Locale, string> = {
 en: 'Continue in your browser: sign in with the administrator account and connect the church Drive there.',
 pt: 'Continue no navegador: inicie sessão como administrador e ligue aí o Drive da igreja.',
 'pt-BR': 'Continue no navegador: entre como administrador e conecte o Drive da igreja por lá.',
 es: 'Continúa en el navegador: inicia sesión como administrador y conecta el Drive de la iglesia.',
 fr: 'Continuez dans le navigateur : connectez-vous comme administrateur et associez le Drive de l’église.',
 de: 'Im Browser fortfahren: als Administrator anmelden und dort den Gemeinde-Drive verbinden.',
 it: 'Continua nel browser: accedi come amministratore e collega il Drive della chiesa.',
}
for (const locale of Object.keys(browserConnection) as Locale[]) storageStrings[locale]['storage.inBrowser'] = browserConnection[locale]
