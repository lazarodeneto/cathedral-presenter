import type { Song } from '../types'

const PUBLIC_DOMAIN_NOTE =
  'Public-domain hymn text in the local sample library. Verify arrangement, translation, and recording rights for your church.'

export const SONGS: Song[] = [
  {
    id: 'amazing-grace',
    title: 'Amazing Grace',
    author: 'John Newton',
    year: '1779',
    key: 'G',
    language: 'en',
    tags: ['grace', 'assurance', 'worship'],
    license: PUBLIC_DOMAIN_NOTE,
    sourceLabel: 'Local sample hymn library',
    stanzas: [
      'Amazing grace! how sweet the sound,\nThat saved a wretch like me!\nI once was lost, but now am found,\nWas blind, but now I see.',
      '’Twas grace that taught my heart to fear,\nAnd grace my fears relieved;\nHow precious did that grace appear\nThe hour I first believed!',
      'Through many dangers, toils, and snares,\nI have already come;\n’Tis grace hath brought me safe thus far,\nAnd grace will lead me home.',
      'When we’ve been there ten thousand years,\nBright shining as the sun,\nWe’ve no less days to sing God’s praise\nThan when we’d first begun.',
    ],
  },
  {
    id: 'holy-holy-holy',
    title: 'Holy, Holy, Holy',
    author: 'Reginald Heber',
    year: '1826',
    key: 'D',
    language: 'en',
    tags: ['adoration', 'worship'],
    license: PUBLIC_DOMAIN_NOTE,
    sourceLabel: 'Local sample hymn library',
    stanzas: [
      'Holy, holy, holy! Lord God Almighty!\nEarly in the morning our song shall rise to Thee;\nHoly, holy, holy! Merciful and mighty!\nGod in three Persons, blessed Trinity!',
      'Holy, holy, holy! All the saints adore Thee,\nCasting down their golden crowns around the glassy sea;\nCherubim and seraphim falling down before Thee,\nWhich wert, and art, and evermore shalt be.',
      'Holy, holy, holy! Though the darkness hide Thee,\nThough the eye of sinful man Thy glory may not see,\nOnly Thou art holy; there is none beside Thee,\nPerfect in power, in love, and purity.',
    ],
  },
  {
    id: 'come-thou-fount',
    title: 'Come Thou Fount of Every Blessing',
    author: 'Robert Robinson',
    year: '1758',
    key: 'D',
    language: 'en',
    tags: ['grace', 'worship'],
    license: PUBLIC_DOMAIN_NOTE,
    sourceLabel: 'Local sample hymn library',
    stanzas: [
      'Come, Thou Fount of every blessing,\ntune my heart to sing Thy grace;\nStreams of mercy, never ceasing,\ncall for songs of loudest praise.\nTeach me some melodious sonnet,\nsung by flaming tongues above;\nPraise the mount! I’m fixed upon it,\nmount of Thy redeeming love.',
      'O to grace how great a debtor\ndaily I’m constrained to be!\nLet Thy goodness, like a fetter,\nbind my wandering heart to Thee.\nProne to wander, Lord, I feel it,\nprone to leave the God I love;\nHere’s my heart, O take and seal it,\nseal it for Thy courts above.',
    ],
  },
  {
    id: 'what-a-friend',
    title: 'What a Friend We Have in Jesus',
    author: 'Joseph M. Scriven',
    year: '1855',
    key: 'F',
    language: 'en',
    tags: ['prayer', 'assurance'],
    license: PUBLIC_DOMAIN_NOTE,
    sourceLabel: 'Local sample hymn library',
    stanzas: [
      'What a friend we have in Jesus,\nall our sins and griefs to bear!\nWhat a privilege to carry\neverything to God in prayer!\nO what peace we often forfeit,\nO what needless pain we bear,\nAll because we do not carry\neverything to God in prayer!',
      'Have we trials and temptations?\nIs there trouble anywhere?\nWe should never be discouraged;\ntake it to the Lord in prayer.\nCan we find a friend so faithful\nwho will all our sorrows share?\nJesus knows our every weakness;\ntake it to the Lord in prayer.',
    ],
  },
  {
    id: 'blessed-assurance',
    title: 'Blessed Assurance',
    author: 'Fanny J. Crosby',
    year: '1873',
    key: 'D',
    language: 'en',
    tags: ['assurance', 'worship'],
    license: PUBLIC_DOMAIN_NOTE,
    sourceLabel: 'Local sample hymn library',
    stanzas: [
      'Blessed assurance, Jesus is mine!\nO what a foretaste of glory divine!\nHeir of salvation, purchase of God,\nborn of His Spirit, washed in His blood.\nThis is my story, this is my song,\npraising my Savior all the day long;\nthis is my story, this is my song,\npraising my Savior all the day long.',
      'Perfect submission, perfect delight,\nvisions of rapture now burst on my sight;\nangels descending bring from above\nechoes of mercy, whispers of love.\nThis is my story, this is my song,\npraising my Savior all the day long.',
    ],
  },
  {
    id: 'doxology',
    title: 'Doxology',
    author: 'Thomas Ken',
    year: '1674',
    key: 'G',
    language: 'en',
    tags: ['adoration', 'worship'],
    license: PUBLIC_DOMAIN_NOTE,
    sourceLabel: 'Local sample hymn library',
    stanzas: [
      'Praise God, from whom all blessings flow;\npraise Him, all creatures here below;\npraise Him above, ye heavenly host;\npraise Father, Son, and Holy Ghost. Amen.',
    ],
  },
]
