import type { Monitor, Service, Slide, SlideItem } from '../types'
import { DEFAULT_CHURCH_ID } from '../utils/church'
import { inferStatus } from '../utils/culto'

type SeedService = Omit<Service, 'churchId' | 'status' | 'version'>
import { getLocalPassageSync } from '../providers/bible/LocalBibleProvider'
import {
  createBibleItem,
  createBibleSlides,
  createSongItem,
  makeSlide,
  section,
  scriptureTitle,
} from '../utils/slides'
import { SONGS } from './songs'

function titleSlide(
  title: string,
  subtitle: string,
  preset: Slide['background']['preset'] = 'dawn',
): Slide {
  return makeSlide({
    kind: 'title',
    title,
    text: `${title}\n${subtitle}`,
    background: { type: 'preset', preset, tone: preset === 'linen' || preset === 'ivory' ? 'light' : 'dark' },
    textAlign: 'center',
  })
}

function song(id: string): SlideItem {
  const found = SONGS.find((entry) => entry.id === id)
  if (!found) throw new Error('Seed song missing')
  return createSongItem(found)
}

function buildSundayService(): SeedService {
  const welcome: SlideItem = {
    id: 'item_seed_welcome',
    type: 'announcement',
    title: 'Welcome Home',
    slides: [
      titleSlide('Welcome Home', 'Campus Algarve · Sunday Worship'),
    ],
    metadata: { provider: 'Local service content' },
  }

  const announcements: SlideItem = {
    id: 'item_seed_announcements',
    type: 'announcement',
    title: 'This Week at Grace',
    slides: [
      makeSlide({
        kind: 'announcement',
        title: 'This Week at Grace',
        text: 'Wednesday Bible Study\nFellowship Hall · 7:00 PM\nBring your Bible and a friend.',
        background: { type: 'preset', preset: 'copper', tone: 'dark' },
        textAlign: 'center',
      }),
      makeSlide({
        kind: 'announcement',
        title: 'Christmas Eve',
        text: 'Christmas Eve Service\nDecember 24 · 6:00 PM\nCandles, carols, and the Christmas story.',
        background: { type: 'preset', preset: 'violet', tone: 'dark' },
        textAlign: 'center',
      }),
    ],
    metadata: { provider: 'Local service content' },
  }

  const amazingGrace = song('amazing-grace')
  const holyHoly = song('holy-holy-holy')
  const doxology = song('doxology')

  const psalmPrimary = getLocalPassageSync('Psalm 23:1-6', 'web')
  const psalmSecondary = getLocalPassageSync('Psalm 23:1-6', 'blivre')
  const psalmSlides = createBibleSlides({
    primary: psalmPrimary,
    secondary: psalmSecondary,
    bilingual: true,
  })

  const sermonTitle = makeSlide({
    kind: 'title',
    title: 'The Lord Is My Shepherd',
    text: 'The Lord Is My Shepherd\nPsalm 23 · A sermon in four movements',
    background: { type: 'preset', preset: 'golden', tone: 'dark' },
    textAlign: 'center',
  })

  const shepherdPoints: SlideItem = {
    id: 'item_seed_shepherd_points',
    type: 'sermon',
    title: 'The Shepherd Leads',
    slides: [
      makeSlide({
        kind: 'sermon',
        title: 'The Shepherd Leads',
        text: 'He Provides\n“I shall not want.”',
        background: { type: 'preset', preset: 'graphite', tone: 'dark' },
        textAlign: 'center',
        notes: 'Hold this slide while reading the opening line slowly.',
      }),
      makeSlide({
        kind: 'sermon',
        title: 'The Shepherd Leads',
        text: 'He Guides\n“He leads me beside still waters.”',
        background: { type: 'preset', preset: 'aurora', tone: 'dark' },
        textAlign: 'center',
      }),
      makeSlide({
        kind: 'sermon',
        title: 'The Shepherd Leads',
        text: 'He Restores\n“He restores my soul.”',
        background: { type: 'preset', preset: 'violet', tone: 'dark' },
        textAlign: 'center',
      }),
    ],
    metadata: { provider: 'Local service content' },
  }

  const application: SlideItem = {
    id: 'item_seed_application',
    type: 'sermon',
    title: 'Where Do You Need the Shepherd?',
    slides: [
      makeSlide({
        kind: 'sermon',
        title: 'Where Do You Need the Shepherd?',
        text: 'Where do you need\nthe Shepherd today?',
        background: { type: 'preset', preset: 'golden', tone: 'dark' },
        textAlign: 'center',
        notes: 'Leave this slide up during the response and prayer.',
      }),
    ],
    metadata: { provider: 'Local service content' },
  }

  const invitation: SlideItem = {
    id: 'item_seed_invitation',
    type: 'announcement',
    title: 'Come to the Shepherd',
    slides: [
      makeSlide({
        kind: 'announcement',
        title: 'Come to the Shepherd',
        text: 'Come to the Shepherd\nThere is room at the table for you.',
        background: { type: 'preset', preset: 'copper', tone: 'dark' },
        textAlign: 'center',
      }),
    ],
    metadata: { provider: 'Local service content' },
  }

  const benediction: SlideItem = {
    id: 'item_seed_benediction',
    type: 'announcement',
    title: 'Benediction',
    slides: [
      makeSlide({
        kind: 'announcement',
        title: 'Benediction',
        text: 'May the Lord bless you and keep you;\nmay the Lord make his face shine on you\nand be gracious to you.\n\nNumbers 6:24–26',
        background: { type: 'preset', preset: 'dawn', tone: 'dark' },
        textAlign: 'center',
      }),
    ],
    metadata: { provider: 'Local service content' },
  }

  const closing: SlideItem = {
    id: 'item_seed_closing',
    type: 'blank',
    title: 'Thank You',
    slides: [
      makeSlide({
        kind: 'title',
        title: 'Thank You',
        text: 'Thank you for worshipping with us.\nGo in the peace of Christ.',
        background: { type: 'preset', preset: 'graphite', tone: 'dark' },
        textAlign: 'center',
      }),
    ],
    metadata: { provider: 'Local service content' },
  }

  const messageScripture = createBibleItem(
    scriptureTitle(psalmPrimary, psalmSecondary),
    psalmSlides,
    psalmPrimary,
    psalmSecondary,
  )
  messageScripture.id = 'item_seed_psalm'

  const messageTitle: SlideItem = {
    id: 'item_seed_message_title',
    type: 'sermon',
    title: 'The Lord Is My Shepherd',
    slides: [sermonTitle],
    metadata: { provider: 'Local service content' },
  }

  const items = [
    welcome,
    announcements,
    amazingGrace,
    holyHoly,
    doxology,
    messageTitle,
    messageScripture,
    shepherdPoints,
    application,
    invitation,
    benediction,
    closing,
  ]

  return {
    id: 'service_seed_sunday',
    title: 'Sunday Morning',
    date: '2026-11-01',
    time: '10:00',
    eventType: 'Sunday Service',
    sections: [
      section('Welcome', [welcome.id, announcements.id]),
      section('Worship', [amazingGrace.id, holyHoly.id, doxology.id]),
      section('Message', [messageTitle.id, messageScripture.id, shepherdPoints.id, application.id]),
      section('Response', [invitation.id, benediction.id, closing.id]),
    ],
    items,
    createdAt: '2026-10-20T09:00:00.000Z',
    updatedAt: '2026-10-27T07:45:00.000Z',
    notes: 'Communion is not part of this service. Keep the response slides ready.',
  }
}

function buildPastService(): SeedService {
  const welcome: SlideItem = {
    id: 'item_past_welcome',
    type: 'announcement',
    title: 'Welcome',
    slides: [titleSlide('Rooted in Grace', 'Sunday Worship · October 25', 'copper')],
    metadata: { provider: 'Local service content' },
  }
  const songItem = song('come-thou-fount')
  const johnPassage = getLocalPassageSync('John 3:16', 'web')
  const scripture = createBibleItem(
    'John 3:16 · WEB',
    createBibleSlides({ primary: johnPassage, bilingual: false }),
    johnPassage,
  )
  scripture.id = 'item_past_john'
  const sermon: SlideItem = {
    id: 'item_past_sermon',
    type: 'sermon',
    title: 'Rooted in Grace',
    slides: [
      makeSlide({
        kind: 'title',
        title: 'Rooted in Grace',
        text: 'Rooted in Grace\nJohn 3:16',
        background: { type: 'preset', preset: 'golden', tone: 'dark' },
      }),
      makeSlide({
        kind: 'sermon',
        title: 'Rooted in Grace',
        text: 'Grace is not a reward.\nIt is a gift.',
        background: { type: 'preset', preset: 'aurora', tone: 'dark' },
      }),
    ],
    metadata: { provider: 'Local service content' },
  }
  return {
    id: 'service_seed_past',
    title: 'Sunday Morning',
    date: '2026-10-25',
    time: '10:00',
    eventType: 'Sunday Service',
    sections: [
      section('Welcome', [welcome.id]),
      section('Worship', [songItem.id]),
      section('Message', [scripture.id, sermon.id]),
    ],
    items: [welcome, songItem, scripture, sermon],
    createdAt: '2026-10-18T09:00:00.000Z',
    updatedAt: '2026-10-25T12:15:00.000Z',
  }
}

function buildMidweekService(): SeedService {
  const welcome: SlideItem = {
    id: 'item_midweek_welcome',
    type: 'announcement',
    title: 'Wednesday Study',
    slides: [titleSlide('The Sermon on the Mount', 'Wednesday Bible Study · 7:00 PM', 'violet')],
    metadata: { provider: 'Local service content' },
  }
  const passage = getLocalPassageSync('Matthew 5:1-12', 'web')
  const scripture = createBibleItem(
    'Matthew 5:1–12 · WEB',
    createBibleSlides({ primary: passage, bilingual: false }),
    passage,
  )
  scripture.id = 'item_midweek_scripture'
  const questions: SlideItem = {
    id: 'item_midweek_questions',
    type: 'sermon',
    title: 'Discussion',
    slides: [
      makeSlide({
        kind: 'sermon',
        title: 'Discussion',
        text: 'Where do you see\nhunger for righteousness\nin your own life?',
        background: { type: 'preset', preset: 'graphite', tone: 'dark' },
      }),
      makeSlide({
        kind: 'sermon',
        title: 'Discussion',
        text: 'Who is one person\nwho needs mercy this week?',
        background: { type: 'preset', preset: 'copper', tone: 'dark' },
      }),
    ],
    metadata: { provider: 'Local service content' },
  }
  const closing = song('doxology')
  return {
    id: 'service_seed_midweek',
    title: 'Wednesday Study',
    date: '2026-10-28',
    time: '19:00',
    eventType: 'Bible Study',
    sections: [
      section('Welcome', [welcome.id]),
      section('Message', [scripture.id, questions.id]),
      section('Response', [closing.id]),
    ],
    items: [welcome, scripture, questions, closing],
    createdAt: '2026-10-22T15:00:00.000Z',
    updatedAt: '2026-10-26T18:30:00.000Z',
  }
}

function buildChristmasService(): SeedService {
  const welcome: SlideItem = {
    id: 'item_christmas_welcome',
    type: 'announcement',
    title: 'Christmas Eve',
    slides: [titleSlide('Light of the World', 'Christmas Eve · 6:00 PM', 'violet')],
    metadata: { provider: 'Local service content' },
  }
  const songItem = song('holy-holy-holy')
  const passage = getLocalPassageSync('Isaiah 40:31', 'web')
  const scripture = createBibleItem(
    'Isaiah 40:31 · WEB',
    createBibleSlides({ primary: passage, bilingual: false }),
    passage,
  )
  scripture.id = 'item_christmas_scripture'
  const sermon: SlideItem = {
    id: 'item_christmas_sermon',
    type: 'sermon',
    title: 'A Light in the Waiting',
    slides: [
      makeSlide({
        kind: 'title',
        title: 'A Light in the Waiting',
        text: 'A Light in the Waiting\nIsaiah 40:31',
        background: { type: 'preset', preset: 'aurora', tone: 'dark' },
      }),
      makeSlide({
        kind: 'sermon',
        title: 'A Light in the Waiting',
        text: 'Those who wait\nwill renew their strength.',
        background: { type: 'preset', preset: 'golden', tone: 'dark' },
      }),
    ],
    metadata: { provider: 'Local service content' },
  }
  const candles: SlideItem = {
    id: 'item_christmas_candles',
    type: 'announcement',
    title: 'Candle Lighting',
    slides: [
      makeSlide({
        kind: 'announcement',
        title: 'Candle Lighting',
        text: 'The people who walked in darkness\nhave seen a great light.',
        background: { type: 'preset', preset: 'graphite', tone: 'dark' },
        textAlign: 'center',
      }),
    ],
    metadata: { provider: 'Local service content' },
  }
  return {
    id: 'service_seed_christmas',
    title: 'Christmas Eve',
    date: '2026-12-24',
    time: '18:00',
    eventType: 'Special Service',
    sections: [
      section('Welcome', [welcome.id]),
      section('Worship', [songItem.id, candles.id]),
      section('Message', [scripture.id, sermon.id]),
    ],
    items: [welcome, songItem, candles, scripture, sermon],
    createdAt: '2026-10-10T10:00:00.000Z',
    updatedAt: '2026-10-24T11:20:00.000Z',
  }
}

function buildYouthService(): SeedService {
  const welcome: SlideItem = {
    id: 'item_youth_welcome',
    type: 'announcement',
    title: 'Youth Night',
    slides: [titleSlide('Psalms for the Anxious', 'Youth Night · October 16', 'copper')],
    metadata: { provider: 'Local service content' },
  }
  const passage = getLocalPassageSync('Philippians 4:6-7', 'web')
  const scripture = createBibleItem(
    'Philippians 4:6–7 · WEB',
    createBibleSlides({ primary: passage, bilingual: false }),
    passage,
  )
  scripture.id = 'item_youth_scripture'
  const response = makeSlide({
    kind: 'sermon',
    title: 'Psalms for the Anxious',
    text: 'What do you need\nto hand to God tonight?',
    background: { type: 'preset', preset: 'violet', tone: 'dark' },
  })
  const responseItem: SlideItem = {
    id: 'item_youth_response',
    type: 'sermon',
    title: 'Response',
    slides: [response],
    metadata: { provider: 'Local service content' },
  }
  return {
    id: 'service_seed_youth',
    title: 'Youth Night',
    date: '2026-10-16',
    time: '18:00',
    eventType: 'Youth',
    sections: [
      section('Welcome', [welcome.id]),
      section('Message', [scripture.id, responseItem.id]),
    ],
    items: [welcome, scripture, responseItem],
    createdAt: '2026-10-10T14:00:00.000Z',
    updatedAt: '2026-10-16T20:10:00.000Z',
  }
}

function buildNewBelieversService(): SeedService {
  const welcome: SlideItem = {
    id: 'item_new_welcome',
    type: 'announcement',
    title: 'Starting with Grace',
    slides: [titleSlide('Starting with Grace', 'New Believers Class · November 8', 'golden')],
    metadata: { provider: 'Local service content' },
  }
  const passage = getLocalPassageSync('Romans 8:28', 'web')
  const scripture = createBibleItem(
    'Romans 8:28 · WEB',
    createBibleSlides({ primary: passage, bilingual: false }),
    passage,
  )
  scripture.id = 'item_new_scripture'
  const discussion: SlideItem = {
    id: 'item_new_discussion',
    type: 'sermon',
    title: 'What Grace Means',
    slides: [
      makeSlide({
        kind: 'sermon',
        title: 'What Grace Means',
        text: 'Grace is God’s\nunearned kindness.',
        background: { type: 'preset', preset: 'aurora', tone: 'dark' },
      }),
      makeSlide({
        kind: 'sermon',
        title: 'What Grace Means',
        text: 'Nothing can separate us\nfrom the love of God.',
        background: { type: 'preset', preset: 'golden', tone: 'dark' },
      }),
    ],
    metadata: { provider: 'Local service content' },
  }
  return {
    id: 'service_seed_newbelievers',
    title: 'New Believers Class',
    date: '2026-11-08',
    time: '09:00',
    eventType: 'Class',
    sections: [
      section('Welcome', [welcome.id]),
      section('Message', [scripture.id, discussion.id]),
    ],
    items: [welcome, scripture, discussion],
    createdAt: '2026-10-24T09:00:00.000Z',
    updatedAt: '2026-10-26T13:40:00.000Z',
  }
}

export function createSeedServices(): Service[] {
  return [
    buildSundayService(),
    buildMidweekService(),
    buildPastService(),
    buildYouthService(),
    buildNewBelieversService(),
    buildChristmasService(),
  ].map((service) => ({ ...service, churchId: DEFAULT_CHURCH_ID, status: inferStatus(service), version: 1 }))
}

export const DEFAULT_MONITORS: Monitor[] = [
  {
    id: 'monitor_main',
    name: 'Main Output',
    displayName: 'Built-in Display (simulated)',
    role: 'audience',
    status: 'ready',
    width: 1920,
    height: 1080,
    fullscreen: true,
    simulated: true,
  },
  {
    id: 'monitor_confidence',
    name: 'Confidence',
    displayName: 'Stage Display (simulated)',
    role: 'confidence',
    status: 'ready',
    width: 1280,
    height: 720,
    fullscreen: false,
    simulated: true,
  },
  {
    id: 'monitor_broadcast',
    name: 'Broadcast / OBS',
    displayName: 'Future output',
    role: 'broadcast',
    status: 'unsupported',
    width: 1920,
    height: 1080,
    fullscreen: false,
    simulated: true,
  },
]
