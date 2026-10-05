import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources';
export const i18n = createInstance();
void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['it', 'en'],
  defaultNS: 'common',
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

i18n.on('languageChanged', (language) => {
  if (typeof document !== 'undefined') document.documentElement.lang = language;
});
