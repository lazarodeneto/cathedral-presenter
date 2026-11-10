import type { Locale } from '../types'
const keys = ['connecting', 'noDisplay', 'chooseDisplays', 'blocked', 'unreachable', 'browserScreen', 'browserScreenHelp', 'openBrowserScreen']
const rows: Record<Locale, string[]> = {
  en: ['Connecting…', 'No audience display is available. Connect an extended screen and check Outputs.', 'Choose the audience screens in Settings → Outputs, then present again.', 'Could not open the output. Check the desktop app or allow presentation pop-ups.', 'The output did not confirm its connection. Check the desktop app and try Present again.', 'Use a browser screen', 'Open a second browser window and move it to any available screen or use fullscreen.', 'Open browser screen'],
  pt: ['A ligar…', 'Não há um ecrã de público disponível. Ligue um ecrã expandido e verifique as Saídas.', 'Escolha os ecrãs de público em Definições → Saídas e volte a apresentar.', 'Não foi possível abrir a saída. Verifique a aplicação de computador ou permita as janelas de apresentação.', 'A saída não confirmou a ligação. Verifique a aplicação de computador e volte a clicar em Apresentar.', 'Usar um ecrã no navegador', 'Abra uma segunda janela do navegador e mova-a para qualquer ecrã disponível ou use o ecrã inteiro.', 'Abrir ecrã no navegador'],
  'pt-BR': ['Conectando…', 'Não há uma tela de público disponível. Conecte uma tela estendida e verifique as Saídas.', 'Escolha as telas de público em Configurações → Saídas e apresente novamente.', 'Não foi possível abrir a saída. Verifique o aplicativo de computador ou permita as janelas de apresentação.', 'A saída não confirmou a conexão. Verifique o aplicativo de computador e clique em Apresentar novamente.', 'Usar uma tela no navegador', 'Abra uma segunda janela do navegador e mova-a para qualquer tela disponível ou use tela cheia.', 'Abrir tela no navegador'],
  es: ['Conectando…', 'No hay una pantalla de público disponible. Conecta una pantalla extendida y revisa Salidas.', 'Elige las pantallas de público en Ajustes → Salidas y vuelve a presentar.', 'No se pudo abrir la salida. Revisa la aplicación de escritorio o permite las ventanas de presentación.', 'La salida no confirmó la conexión. Revisa la aplicación de escritorio y pulsa Presentar de nuevo.', 'Usar una pantalla del navegador', 'Abre una segunda ventana del navegador y muévela a cualquier pantalla disponible o usa pantalla completa.', 'Abrir pantalla del navegador'],
  fr: ['Connexion…', 'Aucun écran public disponible. Connectez un écran étendu et vérifiez les sorties.', 'Choisissez les écrans publics dans Réglages → Sorties, puis relancez la présentation.', 'Impossible d’ouvrir la sortie. Vérifiez l’application de bureau ou autorisez les fenêtres de présentation.', 'La sortie n’a pas confirmé sa connexion. Vérifiez l’application de bureau et relancez la présentation.', 'Utiliser un écran du navigateur', 'Ouvrez une seconde fenêtre du navigateur, déplacez-la vers un écran disponible ou passez en plein écran.', 'Ouvrir l’écran du navigateur'],
  de: ['Verbinden…', 'Kein Publikumsbildschirm verfügbar. Erweiterten Bildschirm anschließen und Ausgänge prüfen.', 'Publikumsbildschirme unter Einstellungen → Ausgänge wählen und erneut präsentieren.', 'Ausgabe konnte nicht geöffnet werden. Desktop-App prüfen oder Präsentationsfenster erlauben.', 'Die Ausgabe hat die Verbindung nicht bestätigt. Desktop-App prüfen und erneut präsentieren.', 'Browserbildschirm verwenden', 'Ein zweites Browserfenster öffnen, auf einen verfügbaren Bildschirm verschieben oder Vollbild verwenden.', 'Browserbildschirm öffnen'],
  it: ['Connessione…', 'Nessuno schermo per il pubblico disponibile. Collega uno schermo esteso e verifica le uscite.', 'Scegli gli schermi del pubblico in Impostazioni → Uscite, poi presenta di nuovo.', 'Impossibile aprire l’uscita. Verifica l’app desktop o consenti le finestre di presentazione.', 'L’uscita non ha confermato la connessione. Verifica l’app desktop e riprova a presentare.', 'Usa uno schermo del browser', 'Apri una seconda finestra del browser e spostala su uno schermo disponibile oppure usa lo schermo intero.', 'Apri lo schermo del browser'],
}
export const presentationStrings = Object.fromEntries(Object.entries(rows).map(([locale, values]) => [locale, Object.fromEntries(keys.map((key, index) => [`presentation.${key}`, values[index]]))])) as Record<Locale, Record<string, string>>
const desktopRequired: Record<Locale, string> = {
  en: 'Open Cathedral Presenter on this computer to connect its TVs and projectors. You can keep using this browser to control it.',
  pt: 'Abra o Cathedral Presenter neste computador para ligar as TVs e os projetores. Pode continuar a controlar a apresentação neste navegador.',
  'pt-BR': 'Abra o Cathedral Presenter neste computador para conectar as TVs e os projetores. Você pode continuar controlando a apresentação neste navegador.',
  es: 'Abre Cathedral Presenter en este ordenador para conectar televisores y proyectores. Puedes seguir controlándolo desde este navegador.',
  fr: 'Ouvrez Cathedral Presenter sur cet ordinateur pour connecter les téléviseurs et projecteurs. Vous pouvez continuer à le contrôler dans ce navigateur.',
  de: 'Cathedral Presenter auf diesem Computer öffnen, um Fernseher und Projektoren zu verbinden. Die Steuerung kann in diesem Browser bleiben.',
  it: 'Apri Cathedral Presenter su questo computer per collegare TV e proiettori. Puoi continuare a controllarlo da questo browser.',
}
for (const locale of Object.keys(desktopRequired) as Locale[]) presentationStrings[locale]['presentation.desktopRequired'] = desktopRequired[locale]
const slideViews: Record<Locale, [string, string]> = {
  en: ['Slide grid', 'Editor view'], pt: ['Grelha de slides', 'Vista de edição'], 'pt-BR': ['Grade de slides', 'Modo de edição'],
  es: ['Cuadrícula de diapositivas', 'Vista de edición'], fr: ['Grille des diapositives', 'Mode édition'],
  de: ['Folienübersicht', 'Editoransicht'], it: ['Griglia delle slide', 'Vista editor'],
}
for (const locale of Object.keys(slideViews) as Locale[]) {
  presentationStrings[locale]['editor.gridView'] = slideViews[locale][0]
  presentationStrings[locale]['editor.canvasView'] = slideViews[locale][1]
}
const backgroundSections: Record<Locale, [string, string]> = {
  en: ['Static backgrounds', 'Motion backgrounds'], pt: ['Fundos estáticos', 'Fundos animados'], 'pt-BR': ['Fundos estáticos', 'Fundos animados'],
  es: ['Fondos estáticos', 'Fondos animados'], fr: ['Arrière-plans fixes', 'Arrière-plans animés'], de: ['Statische Hintergründe', 'Bewegte Hintergründe'], it: ['Sfondi statici', 'Sfondi animati'],
}
for (const locale of Object.keys(backgroundSections) as Locale[]) {
  presentationStrings[locale]['background.static'] = backgroundSections[locale][0]
  presentationStrings[locale]['background.motion'] = backgroundSections[locale][1]
}
