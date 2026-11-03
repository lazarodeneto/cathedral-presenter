# Church Presenter — Bible Library First Plan

## Goal

Make the Bible library the first genuinely useful feature after the app shell. A church must be able to search Scripture offline, choose a translation, preview a passage, add it to a service, and present it immediately.

Use `assets/reference/church-presenter-bible-library.png` as the Bible Library visual reference and connect it to the Home, Slide Editor, and Live Service screens.

## First release content strategy

Bundle only Bible texts whose license explicitly permits redistribution. The current offline demo includes curated excerpts from:

- World English Bible (WEB) — public domain; default primary translation.
- Open English Bible (OEB) — CC0/public domain.
- Berean Standard Bible (BSB) — public-domain dedication (2023); verify current branding and attribution terms.
- Bíblia Livre (BLIVRE) — CC BY 4.0 Brasil; default secondary translation and shown with its required attribution.
- Reina-Valera 1909 (RV1909) — public domain.
- Louis Segond 1910 (LSG) — public domain.
- Luther Bible 1912 (LUT) — public domain.
- Riveduta 1927 (RIV) — public domain.

Each bundled translation keeps its provider ID, language, source URL, license type, copyright notice, availability, and sample status. ARC is excluded because modern Almeida Revista e Corrigida editions remain copyrighted.

For other languages and modern translations, add content only when its source license clearly allows local redistribution. Otherwise support church-admin import or a future provider connection.

## Bible library MVP features

### Search

- Search by reference: `John 3:16`, `Jn 3:16`, `João 3:16`.
- Search by keyword across the selected translation.
- Search books by localized name and abbreviation.
- Select book, chapter, and verse range.
- Handle verse ranges across paragraphs.
- Show recent passages.
- Show favorite passages.
- Work completely offline for bundled translations.

### Passage preview

Show before inserting:

- Translation name.
- Book/chapter/verse reference.
- Copyright/license notice when required.
- Full passage text.
- Estimated slide count.
- Primary and secondary translation preview.

### Add to service

Offer these choices:

- One verse per slide.
- Multiple verses per slide.
- Full passage on one slide when it fits.
- Add as a bilingual slide.
- Add to the current section or create a new Bible section.

### Bilingual mode

- Primary translation at the top.
- Primary text bold and larger.
- Secondary translation below in normal weight and smaller size.
- Both references visible.
- Independent language/translation selectors.
- Long-text handling that reduces size gradually and warns before overflow.

## Suggested data model

```ts
type ProviderSecurityProfile = {
  auth: 'none' | 'oauth';
  oauthScopes: string[];
  tokenStorage: 'none' | 'desktop-credential-store';
  cachePolicy: 'bundled' | 'metadata-only' | 'provider-permitted';
};

type BibleTranslation = {
  id: string;
  providerId: string;
  name: string;
  abbreviation: string;
  language: 'en' | 'pt' | 'pt-BR' | 'es' | 'fr' | 'de' | 'it';
  licenseType: 'public-domain' | 'cc0' | 'cc-by' | 'provider' | 'church-import';
  licenseText?: string;
  sourceUrl?: string;
  copyrightNotice?: string;
  bundled: boolean;
  sample: boolean;
  verseCount: number;
  availability: 'bundled' | 'online-only';
};

type BibleVerse = {
  translationId: string;
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
};

type BiblePassage = {
  id: string;
  translationId: string;
  bookId: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
  reference: string;
  verses: BibleVerse[];
  licenseType: string;
  copyrightNotice: string;
  sourceUrl?: string;
};
```

## Import formats

Support later, but design the adapter boundary now:

- USFM.
- OSIS XML.
- Zefania XML.
- Plain text with a documented format.

Every imported translation must require a name, language, source, license type, and copyright/attribution notice before it becomes searchable.

## Bible provider boundary

```ts
interface BibleProvider {
  readonly id: string;
  readonly label: string;
  readonly security: ProviderSecurityProfile;
  listTranslations(): BibleTranslation[];
  supportsTranslation(translationId: string): boolean;
  getBookCatalog(translationId: string, locale: Locale): Promise<BibleBookCatalogEntry[]>;
  getChapter(translationId: string, bookId: string, chapter: number): Promise<BibleVerse[]>;
  search(query: string, translationId: string): Promise<BibleSearchResult>;
  getPassage(reference: string, translationId: string): Promise<BiblePassage>;
  isOfflineAvailable(translationId: string): boolean;
  parseReference(reference: string): ParsedReference | null;
}
```

Implement `LocalBibleProvider` first. It lists bundled translations synchronously, localizes the book catalog, parses references in all supported UI languages, and searches curated offline excerpts. Provider messages use i18n keys so the UI can localize errors.

Add API.Bible or another licensed provider only through a separate adapter that respects provider terms, attribution, caching rules, and authentication. Remote adapters must not hold tokens in the webview; use a desktop credential store and fall back to a bundled translation when offline.

The UI treats `online-only` translations as unavailable offline and explains the fallback inline. No live licensed provider is connected in this build.

## Bible library UX

Use a focused library screen or Add Slide panel:

1. Search/reference field.
2. Translation selector.
3. Book/chapter/verse controls.
4. Results list.
5. Passage preview.
6. Bilingual toggle.
7. Slide format choice.
8. Add to Service button.

Keep the operator’s service rundown visible or easy to return to. The Bible library should not feel like a separate unrelated product.

## Acceptance checklist

- Search works with a disconnected network.
- `John 3:16` and localized book names resolve correctly.
- Passage preview shows the correct translation and reference.
- A passage can be added as one verse per slide.
- A passage can be added as a bilingual slide.
- Primary/secondary typography is correct.
- Long passages do not overflow silently.
- License/attribution metadata is preserved.
- Imported translations remain local after restart.
- A missing or invalid translation file gives a recoverable error.
- Search remains fast with the full bundled corpus.
- Malformed USFM/OSIS/Zefania files cannot execute code or escape the app data directory.
- Provider credentials are never stored with the Bible database or exported services.
- Search/index errors do not expose local paths, tokens, or raw provider responses.
