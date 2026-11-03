const ERROR_KEYS: Record<string, string> = {
  'empty-file': 'error.emptyFile',
  'unsupported-type': 'error.unsupportedType',
  'file-too-large': 'error.fileTooLarge',
  'svg-rejected': 'error.svgRejected',
  'mime-mismatch': 'error.mimeMismatch',
  'read-failed': 'error.readFailed',
  'unsupported-extension': 'error.unsupportedExtension',
  'invalid-file-signature': 'error.invalidFileSignature',
  'logo-too-large': 'error.logoTooLarge',
  'logo-must-be-image': 'error.logoMustBeImage',
  'invalid-url': 'error.invalidUrl',
  'unsafe-scheme': 'error.unsafeScheme',
  'private-network': 'error.privateNetwork',
  'credentials-in-url': 'error.credentialsInUrl',
  'unsafe-port': 'error.unsafePort',
  'unsupported-provider': 'error.unsupportedProvider',
  'invalid-video-id': 'error.invalidVideoId',
  'unc-path': 'error.privateNetwork',
  'control-characters': 'error.invalidUrl',
  'too-long': 'error.tooLong',
  'empty': 'error.emptyReference',
  'invalid-host': 'error.invalidUrl',
  'protocol-relative': 'error.invalidUrl',
}

export function errorKey(reason: string | undefined, fallback = 'error.apiUnavailable'): string {
  if (!reason) return fallback
  return ERROR_KEYS[reason] ?? fallback
}
