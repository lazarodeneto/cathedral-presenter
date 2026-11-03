import { useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'
import { intlLocale } from '../utils/dates'
import { translate } from './dictionary'

export function useT() {
  const locale = useAppStore((state) => state.settings.locale)
  return useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  )
}

export function useLocale() {
  return useAppStore((state) => state.settings.locale)
}

export function useIntlLocale() {
  const locale = useLocale()
  return intlLocale(locale)
}
