import enCommon from './locales/en/common.json';
import enOnboarding from './locales/en/onboarding.json';
import enNavigation from './locales/en/navigation.json';
import itCommon from './locales/it/common.json';
import itOnboarding from './locales/it/onboarding.json';
import itNavigation from './locales/it/navigation.json';
import enPrograms from './locales/en/programs.json';
import itPrograms from './locales/it/programs.json';
export const resources = {
  en: {
    programs: enPrograms,
    common: enCommon,
    onboarding: enOnboarding,
    navigation: enNavigation,
  },
  it: {
    programs: itPrograms,
    common: itCommon,
    onboarding: itOnboarding,
    navigation: itNavigation,
  },
} as const;
