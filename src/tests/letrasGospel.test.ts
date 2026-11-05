import { describe, expect, it } from 'vitest'
import {
  buildDirectory,
  parseSongPage,
  readSitemapPaths,
  searchDirectory,
  titleFromSlug,
  titleLanguage,
} from '../providers/songs/letrasGospel'
import { isAllowedLetrasGospelPath } from '../providers/songs/letrasGospelPaths'
import { detectLanguage } from '../utils/detectLanguage'

const O = 'https://www.letrasgospel.net'
const sitemap = (paths: string[]) =>
  `<?xml version="1.0"?><urlset>${paths.map((path) => `<url><loc>${O}/${path}</loc></url>`).join('')}</urlset>`

// Invented sample text, written for these tests.
const page = (lyrics: string, language = 'pt-BR') => `<!doctype html><html><head>
<meta property="og:title" content="Canção De Teste - Grupo Exemplo | Letra">
<script type="application/ld+json">{"@type":"MusicRecording","name":"Canção de Teste","inLanguage":"${language}","byArtist":{"name":"Grupo Exemplo"}}</script>
</head><body><h1>Canção de Teste</h1><div class="musica-letra lyric-text">${lyrics}<script>ads()</script></div></body></html>`

describe('letrasgospel.net directory', () => {
  it('only lets the proxy fetch sitemaps and artist or song pages', () => {
    expect(isAllowedLetrasGospelPath('sitemaps/musicas_1.xml')).toBe(true)
    expect(isAllowedLetrasGospelPath('grupo-exemplo/cancao-de-teste')).toBe(true)
    for (const path of ['', 'login', '../etc/passwd', 'a/b/c', 'a?x=1', 'evil.com/x', '%2e%2e/x', 'A/B']) {
      expect(isAllowedLetrasGospelPath(path)).toBe(false)
    }
  })

  it('reads sitemap paths and builds a compact catalogue', () => {
    expect(readSitemapPaths(sitemap(['a-b', 'a-b/x-y']))).toEqual(['a-b', 'a-b/x-y'])
    expect(readSitemapPaths(`<loc>https://other.site/a</loc>`)).toEqual([])
    const directory = buildDirectory(
      ['grupo-exemplo', 'outro-cantor'],
      ['grupo-exemplo/cancao-de-teste', 'grupo-exemplo/cancao-de-teste', 'grupo-exemplo/discografia', 'novo/way-maker', 'bad path/x'],
      '2026-11-05T00:00:00.000Z',
    )
    expect(directory.artists).toEqual(['grupo-exemplo', 'outro-cantor', 'novo'])
    expect(directory.songs).toEqual([
      [0, 'cancao-de-teste'],
      [2, 'way-maker'],
    ])
  })

  it('searches titles and artists without accents, title starts first', () => {
    const directory = buildDirectory(
      [],
      ['b/coracao-peregrino', 'a/meu-coracao-peregrino', 'coracao-band/outra', 'c/nada-a-ver'],
    )
    const titles = searchDirectory(directory, 'Coração').map((entry) => entry.title)
    expect(titles).toEqual(['Coracao Peregrino', 'Meu Coracao Peregrino', 'Outra'])
    expect(searchDirectory(directory, 'peregrino meu')).toHaveLength(1)
    expect(searchDirectory(directory, '   ')).toEqual([])
    expect(titleFromSlug('coracao-peregrino')).toBe('Coracao Peregrino')
  })

  it('marks titles as pt-BR unless the words clearly say another language', () => {
    expect(titleLanguage('coracao-peregrino')).toBe('pt-BR')
    expect(titleLanguage('do-you-dream-of-me')).toBe('en')
    expect(titleLanguage('cuan-grande-es-el-senor')).toBe('es')
  })

  it('reads title, artist, stanzas and language from a song page', () => {
    const parsed = parseSongPage(page('Linha um do meu louvor<br>Linha dois com você<br><br>Segunda estrofe aqui<br>Senhor, eu sou teu'))
    expect(parsed).toEqual({
      title: 'Canção de Teste',
      artist: 'Grupo Exemplo',
      lyrics: 'Linha um do meu louvor\nLinha dois com você\n\nSegunda estrofe aqui\nSenhor, eu sou teu',
      language: 'pt-BR',
    })
    expect(parseSongPage('<html><body><h1>Sem letra</h1></body></html>')).toBeNull()
  })

  it('trusts the lyrics over the page language, which the site always sets to pt-BR', () => {
    const english = parseSongPage(page('You are my God and I will sing<br>All my heart is in your name'))
    expect(english?.language).toBe('en')
    const shortRefrain = parseSongPage(page('Gadol Elohai<br>Gadol Elohai').replace(/Canção de Teste/g, 'How Great Is Our God'))
    expect(shortRefrain?.language).toBe('en')
    const korean = parseSongPage(page('주님의 사랑이<br>나를 감싸네'))
    expect(korean?.language).toBe('ko')
  })
})

describe('detectLanguage', () => {
  it('recognises the supported languages from common words', () => {
    expect(detectLanguage('Eu te louvo, Senhor, com todo o meu coração, não há outro Deus').locale).toBe('pt-BR')
    expect(detectLanguage('Yo te alabo Señor, eres mi Dios y mi corazón es tuyo').locale).toBe('es')
    expect(detectLanguage('Je te loue Seigneur, tu es mon Dieu et mon coeur est à toi').locale).toBe('fr')
    expect(detectLanguage('Ich lobe dich Herr, du bist mein Gott und mein Herz ist dein').locale).toBe('de')
    expect(detectLanguage('Io ti lodo Signore, tu sei il mio Dio e il mio cuore è tuo').locale).toBe('it')
  })

  it('gives no answer when the text is too short to tell', () => {
    expect(detectLanguage('Aleluia')).toEqual({})
  })
})
