import type translations from '../i18n/locales/en/imports.json';
import { ApiClientError } from '../api/client';
export type ImportErrorKey = `errors.${keyof typeof translations.errors}`;
export function importErrorKey(error: unknown): ImportErrorKey {
  const code =
    error instanceof ApiClientError
      ? error.code
      : error instanceof Error
        ? error.message
        : '';
  const map: Record<string, keyof typeof translations.errors> = {
    IMPORT_CAMERA_DENIED: 'camera',
    IMPORT_FILE_TOO_LARGE: 'size',
    REQUEST_TOO_LARGE: 'size',
    IMPORT_TOO_MANY_PAGES: 'pages',
    IMPORT_FILE_COUNT: 'count',
    IMPORT_FORMAT_UNSUPPORTED: 'format',
    IMPORT_MULTIPART_INVALID: 'format',
    PDF_CORRUPT: 'pdf',
    IMPORT_IMAGE_UNREADABLE: 'image',
    IMPORT_NO_PROGRAM: 'noProgram',
    AI_INVALID_OUTPUT: 'output',
    AI_TIMEOUT: 'timeout',
    TIMEOUT: 'timeout',
    AI_RATE_LIMITED: 'rate',
    AI_NOT_CONFIGURED: 'unavailable',
    FEATURE_DISABLED: 'unavailable',
    AI_TEMPORARILY_UNAVAILABLE: 'unavailable',
    NETWORK_ERROR: 'network',
    TOKEN_UNAVAILABLE: 'network',
    AUTH_REQUIRED: 'session',
    SESSION_EXPIRED: 'session',
    INVALID_SESSION: 'session',
    IDENTITY_CHANGED: 'session',
    IMPORT_CONFLICT: 'conflict',
    CONFLICT: 'customConflict',
    IMPORT_ALREADY_REMOVED: 'removed',
    VALIDATION_ERROR: 'review',
  };
  return `errors.${map[code] ?? 'generic'}`;
}
