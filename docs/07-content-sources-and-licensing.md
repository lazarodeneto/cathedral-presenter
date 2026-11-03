# Church Presenter — Bible and Song Content Sources

## Short answer

Use three layers:

1. **Bundled public-domain content** for the offline starter library.
2. **Church-owned imports** for songs and Bible files the church is allowed to use.
3. **Connected licensed providers** for modern translations and copyrighted worship lyrics.

Do not bundle a shared database of modern Bible translations or worship lyrics for every church by default.

## Bible sources

### Development and starter library

Use public-domain or explicitly licensed Bible text for the first local demo. Good candidates to evaluate are:

- [World English Bible](https://worldenglish.bible/) — its official site states that the text is public domain, while the name/logo remain trademarked.
- [Open English Bible](https://openenglishbible.org/) — the project states that it uses a Creative Commons Zero/public-domain license.
- [Berean Standard Bible](https://www.livingwordbibles.com/licensing/) — the publisher states that the text was dedicated to the public domain in 2023; keep the attribution and branding rules separate from the text itself.
- [Open.Bible catalog](https://open.bible/bibles) — use it to find additional openly licensed translations, checking the license on each individual translation before bundling.

For the first offline release, bundle only versions whose source clearly grants redistribution rights. Store the translation name, copyright notice, license, and source with every version.

### Current bundled demo library

The current build bundles short, curated excerpts rather than complete Bibles. Every translation card and passage keeps its license and source metadata.

| ID | Translation | Language | License | Source |
| --- | --- | --- | --- | --- |
| `web` | World English Bible | English | Public domain (name/logo trademarked) | https://worldenglish.bible/ |
| `oeb` | Open English Bible | English | CC0 / public domain | https://openenglishbible.org/ |
| `bsb` | Berean Standard Bible | English | Public-domain dedication (2023) | https://berean.bible/terms.htm |
| `blivre` | Bíblia Livre | Portuguese (Brazil) | CC BY 4.0 Brasil | https://ebible.org/porbr2018/ |
| `rv1909` | Reina-Valera 1909 | Spanish | Public domain | https://ebible.org/spaRV1909/ |
| `lsg1910` | Louis Segond 1910 | French | Public domain | https://ebible.org/fraLSG/ |
| `lut1912` | Luther Bible 1912 | German | Public domain | https://ebible.org/deu1912/ |
| `riv1927` | Riveduta 1927 | Italian | Public domain | https://ebible.org/ita1927/ |

WEB is the default primary translation and BLIVRE is the default secondary translation.

Bíblia Livre attribution shown with the text:

> Bíblia Livre (BLIVRE), Copyright © 2018 Diego Santos, Mario Sérgio, e Marco Teles, https://sites.google.com/site/biblialivre/ — Licença Creative Commons Atribuição 4.0 Brasil.

ARC (Almeida Revista e Corrigida) is not bundled. Modern ARC editions remain copyrighted, so the app must not redistribute them without publisher permission. A future provider adapter or church-owned import may support them.

Before expanding any excerpt into a full corpus, re-check the current license, attribution, and redistribution terms for that exact edition. BSB branding and attribution rules are separate from the public-domain text dedication.

### API.Bible

[API.Bible](https://scripture.api.bible/) is a practical provider to evaluate for Bible search and passage retrieval. Its FAQ states that Scripture content requires copyright information beside the displayed text, and commercial use requires specific approval. It also notes that translation availability depends on permissions from publishers. [Read the API.Bible terms and FAQ](https://scripture.api.bible/faq).

The app should therefore:

- Ask the church/admin to connect its provider account where required.
- Store provider and translation metadata.
- Display the required copyright notice on slides or in a configurable footer.
- Cache only what the provider license permits.
- Never assume that one API provides every requested language or translation.

### Other Bible providers

Evaluate additional providers only through their official developer/licensing channels. Modern translations such as NIV, NVI, NVT, ESV, and similar versions usually require permission from the publisher or an authorized distributor. Do not scrape Bible websites.

## Song sources

### CCLI and SongSelect

[CCLI Church Copyright License](https://ccli.com/us/en/church-copyright-license) covers common church activities such as projecting lyrics and electronically storing/retrieving song files, subject to the church’s license and territory.

[SongSelect](https://ccli.com/us/enhttps%253A/songselect) provides lyrics and song resources and supports integrations with presentation software. Access and download rights depend on the church’s CCLI license and SongSelect subscription. SongSelect terms are church-specific and non-transferable, so the app should connect each church to its own entitlement rather than ship one shared account or library.

The app should:

- Let a church connect its own licensed provider account.
- Store copyright owner, writer, year, source, and license metadata with each song.
- Include a CCLI/license number field where applicable.
- Support usage reporting/export if required by the license.
- Block or warn when a song has no verified permission.
- Keep lyrics private to the licensed church and its authorized presentation workflow.

### JEM and other song libraries

Do not implement a JEM integration until the provider gives you current official API/SDK and redistribution terms. Request:

- Developer/API documentation.
- Authentication and church entitlement model.
- Whether lyrics may be cached offline.
- Whether lyrics may be edited, translated, exported, or printed.
- Required attribution and reporting.
- Commercial/software distribution terms.

If no official API agreement exists, support manual import formats instead of scraping or reverse-engineering the service.

### Church-owned and public-domain songs

Support these in the first version:

- Public-domain hymns.
- Church-authored songs with explicit permission.
- User-imported plain text, ChordPro, OpenLyrics, or approved XML files.
- Manual lyric entry with copyright metadata.

Do not ship copyrighted lyrics as sample data unless the rights are documented.

For starter songs, build a small verified hymn pack from public-domain texts and tunes. Public-domain status depends on country and on the text, tune, translation, and arrangement separately; use the guidance from [The United Methodist Church](https://www.umc.org/en/content/ask-the-umc-how-can-i-identify-public-domain-hymns) as a checklist, then verify each song yourself. The [Free Hymn Project](https://www.saministries.org/FHP/) is another source with per-song conditions; do not assume every item there is unrestricted.

Do not include modern worship songs in the bundled free pack. Let churches import their own authorized lyrics or connect a licensed provider later.

## Media sources in the slide editor

The editor accepts four media sources. Each source is labeled in the UI with its provider.

| Source | How it works | Rights note |
| --- | --- | --- |
| Local upload | Image or video chosen from this device, or dropped on the canvas. Validated by type, size, and file signature. | The church must own the file or hold a licence for projection. The app records no licence data yet. |
| Public URL | HTTPS image or video loaded directly by the browser. | Linking does not grant a projection licence. Online only. |
| YouTube | Official privacy-enhanced embed (`youtube-nocookie.com`). Playback stays inside the YouTube player. | Follows the YouTube Terms of Service. No download, rip, or ad removal is implemented or planned. Public performance may still need a church video licence (for example CCLI Streaming / CVLI or a local equivalent). |
| QR code | Generated locally from a URL, text, event details, or contact card. | No third-party content. The church is responsible for the linked destination. |

Before a public release, add an optional licence/source field to each media asset, and show it in the Media Library next to the provider label.

## Recommended implementation model

```text
Local public-domain library
        +
Church-owned imports
        +
Connected licensed providers
        ↓
Unified local content model
        ↓
Service slides and presentation output
```

Every imported or provider-sourced item should retain:

- `sourceProvider`
- `sourceId`
- `licenseType`
- `copyrightNotice`
- `territory`
- `offlineCacheAllowed`
- `lastVerifiedAt`
- `attributionText`

Security requirements for content sources:

- Treat imported Bible/song files and provider responses as untrusted data.
- Validate file type, size, schema, and encoding before indexing.
- Never execute markup, scripts, macros, or template code from a content file.
- Keep provider tokens separate from content exports and backups.
- Preserve source and license metadata so content can be removed or re-verified.

## Legal product rule

Church Presenter provides presentation software; it does not grant churches permission to use copyrighted Bible translations, songs, recordings, images, or videos. The church remains responsible for its licenses and permissions. The app should make those permissions easier to manage and report.
