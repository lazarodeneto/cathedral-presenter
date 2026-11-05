import type { Locale } from '../types'

type Strings = Record<string, string>

/** Explanations shown in the tooltips of the editor's canvas rail. */
const en: Strings = {
  'rail.addContent': 'Add a song, Bible passage, media or other item to the service.',
  'rail.addSlide': 'Add a blank slide after the current one.',
  'rail.useAsBackground': 'Make this image fill the whole slide background.',
  'rail.hide': 'Hide the selected element on the slide without deleting it.',
  'rail.show': 'Show the hidden element on the slide again.',
  'rail.duplicate': 'Make a copy of the selected element.',
  'rail.deleteElement': 'Remove the selected element from this slide.',
  'rail.needsSelection': 'Select an element on the slide first.',
  'rail.grid': 'Show a grid on the canvas to line things up. It never appears on the projector.',
  'rail.snap': 'While you drag, elements line up with the edges, the centre and each other.',
  'rail.deleteSlide': 'Delete slide',
  'rail.deleteSlideHint': 'Remove this slide from the item. You will be asked to confirm.',
}

const pt: Strings = {
  'rail.addContent': 'Adicionar uma música, passagem bíblica, mídia ou outro item ao culto.',
  'rail.addSlide': 'Adicionar um slide em branco depois do atual.',
  'rail.useAsBackground': 'Usar esta imagem como fundo de todo o slide.',
  'rail.hide': 'Esconder o elemento selecionado no slide, sem o apagar.',
  'rail.show': 'Mostrar de novo o elemento escondido no slide.',
  'rail.duplicate': 'Criar uma cópia do elemento selecionado.',
  'rail.deleteElement': 'Remover o elemento selecionado deste slide.',
  'rail.needsSelection': 'Selecione primeiro um elemento no slide.',
  'rail.grid': 'Mostrar uma grelha no editor para alinhar os elementos. Nunca aparece na projeção.',
  'rail.snap': 'Ao arrastar, os elementos alinham-se com as margens, o centro e uns com os outros.',
  'rail.deleteSlide': 'Apagar slide',
  'rail.deleteSlideHint': 'Remover este slide do item. Será pedida confirmação.',
}

const ptBR: Strings = {
  ...pt,
  'rail.hide': 'Esconder o elemento selecionado no slide, sem apagá-lo.',
  'rail.grid': 'Mostrar uma grade no editor para alinhar os elementos. Nunca aparece na projeção.',
  'rail.snap': 'Ao arrastar, os elementos se alinham às bordas, ao centro e uns aos outros.',
  'rail.deleteSlideHint': 'Remover este slide do item. Você vai precisar confirmar.',
}

const es: Strings = {
  'rail.addContent': 'Añade una canción, un pasaje bíblico, medios u otro elemento al culto.',
  'rail.addSlide': 'Añade una diapositiva en blanco después de la actual.',
  'rail.useAsBackground': 'Usa esta imagen como fondo de toda la diapositiva.',
  'rail.hide': 'Oculta el elemento seleccionado en la diapositiva sin borrarlo.',
  'rail.show': 'Vuelve a mostrar el elemento oculto en la diapositiva.',
  'rail.duplicate': 'Crea una copia del elemento seleccionado.',
  'rail.deleteElement': 'Quita el elemento seleccionado de esta diapositiva.',
  'rail.needsSelection': 'Selecciona primero un elemento en la diapositiva.',
  'rail.grid': 'Muestra una cuadrícula en el editor para alinear los elementos. Nunca aparece en la proyección.',
  'rail.snap': 'Al arrastrar, los elementos se alinean con los bordes, el centro y entre sí.',
  'rail.deleteSlide': 'Eliminar diapositiva',
  'rail.deleteSlideHint': 'Quita esta diapositiva del elemento. Se pedirá confirmación.',
}

const fr: Strings = {
  'rail.addContent': 'Ajouter un chant, un passage biblique, un média ou un autre élément au culte.',
  'rail.addSlide': 'Ajouter une diapositive vide après celle-ci.',
  'rail.useAsBackground': 'Utiliser cette image comme fond de toute la diapositive.',
  'rail.hide': 'Masquer l’élément sélectionné sur la diapositive sans le supprimer.',
  'rail.show': 'Afficher à nouveau l’élément masqué sur la diapositive.',
  'rail.duplicate': 'Créer une copie de l’élément sélectionné.',
  'rail.deleteElement': 'Retirer l’élément sélectionné de cette diapositive.',
  'rail.needsSelection': 'Sélectionnez d’abord un élément sur la diapositive.',
  'rail.grid': 'Afficher une grille dans l’éditeur pour aligner les éléments. Elle n’apparaît jamais à la projection.',
  'rail.snap': 'Pendant le glissement, les éléments s’alignent sur les bords, le centre et entre eux.',
  'rail.deleteSlide': 'Supprimer la diapositive',
  'rail.deleteSlideHint': 'Retirer cette diapositive de l’élément. Une confirmation sera demandée.',
}

const de: Strings = {
  'rail.addContent': 'Ein Lied, eine Bibelstelle, Medien oder ein anderes Element zum Gottesdienst hinzufügen.',
  'rail.addSlide': 'Eine leere Folie nach der aktuellen hinzufügen.',
  'rail.useAsBackground': 'Dieses Bild als Hintergrund der ganzen Folie verwenden.',
  'rail.hide': 'Das ausgewählte Element auf der Folie ausblenden, ohne es zu löschen.',
  'rail.show': 'Das ausgeblendete Element auf der Folie wieder anzeigen.',
  'rail.duplicate': 'Eine Kopie des ausgewählten Elements erstellen.',
  'rail.deleteElement': 'Das ausgewählte Element von dieser Folie entfernen.',
  'rail.needsSelection': 'Wählen Sie zuerst ein Element auf der Folie aus.',
  'rail.grid': 'Ein Raster im Editor zum Ausrichten anzeigen. Es erscheint nie in der Projektion.',
  'rail.snap': 'Beim Ziehen richten sich Elemente an Rändern, Mitte und aneinander aus.',
  'rail.deleteSlide': 'Folie löschen',
  'rail.deleteSlideHint': 'Diese Folie aus dem Element entfernen. Sie werden um Bestätigung gebeten.',
}

const it: Strings = {
  'rail.addContent': 'Aggiungi un canto, un passo biblico, un media o un altro elemento al culto.',
  'rail.addSlide': 'Aggiungi una diapositiva vuota dopo quella attuale.',
  'rail.useAsBackground': 'Usa questa immagine come sfondo di tutta la diapositiva.',
  'rail.hide': 'Nascondi l’elemento selezionato sulla diapositiva senza eliminarlo.',
  'rail.show': 'Mostra di nuovo l’elemento nascosto sulla diapositiva.',
  'rail.duplicate': 'Crea una copia dell’elemento selezionato.',
  'rail.deleteElement': 'Rimuovi l’elemento selezionato da questa diapositiva.',
  'rail.needsSelection': 'Seleziona prima un elemento sulla diapositiva.',
  'rail.grid': 'Mostra una griglia nell’editor per allineare gli elementi. Non appare mai in proiezione.',
  'rail.snap': 'Durante il trascinamento, gli elementi si allineano ai bordi, al centro e tra loro.',
  'rail.deleteSlide': 'Elimina diapositiva',
  'rail.deleteSlideHint': 'Rimuovi questa diapositiva dall’elemento. Ti verrà chiesta conferma.',
}

export const railStrings: Record<Locale, Strings> = { en, pt, 'pt-BR': ptBR, es, fr, de, it }
