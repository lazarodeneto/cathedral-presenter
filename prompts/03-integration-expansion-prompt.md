# Integration expansion prompt

```text
Extend Church Presenter with provider-ready content libraries while keeping the app local-first.

Use `assets/reference/church-presenter-bible-library.png` as the visual reference for the Bible Library screen and `assets/reference/church-presenter-add-slide.png` for the insertion flow. Keep the Bible Library accessible from the Home screen shown in `assets/reference/church-presenter-first-screen.png` and preserve the Live Service workflow shown in `assets/reference/church-presenter-live-service.png`.

Add a Bible library view with book, chapter, verse range, and translation selectors. Use only clearly public-domain or openly licensed sample translations for bundled local data, such as WEB, OEB, and BSB after verifying the exact release terms. Do not bundle modern copyrighted translations as if they were free. Add a songs library with search, language filter, tags, and import-to-service action. Create a provider adapter interface so a licensed Bible API or song source can be added without rewriting the UI.

Add a language selector for en, pt, pt-BR, es, fr, de, and it. Translate all UI strings through a dictionary. Do not translate sample song lyrics unless they are clearly provided as sample content.

Security rules:
- Keep provider credentials out of the frontend and local exports.
- Use least-privilege OAuth scopes and store tokens in the desktop OS credential store.
- Validate provider responses and cache only content permitted by the provider.
- Do not scrape sites or bypass access controls.
- Label online-only content and provide clear offline fallback behavior.

Preserve the existing operator workflow and do not hide it behind a new navigation system.
```
