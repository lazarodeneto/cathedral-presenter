import type { BibleTranslation } from '../../types'
import type { BibleProvider } from './BibleProvider'
import { localBibleProvider } from './LocalBibleProvider'

const providers: BibleProvider[] = [localBibleProvider]

export function listBibleProviders(): BibleProvider[] {
  return providers
}

export function listBibleTranslations(): BibleTranslation[] {
  return providers.flatMap((provider) => provider.listTranslations())
}

export function resolveBibleProvider(translationId: string): BibleProvider {
  return (
    providers.find((provider) => provider.supportsTranslation(translationId)) ?? localBibleProvider
  )
}
