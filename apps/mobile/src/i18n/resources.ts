import authIt from './locales/it/auth.json';
import authEn from './locales/en/auth.json';
import enProgress from './locales/en/progress.json';
import itProgress from './locales/it/progress.json';
import enWorkouts from './locales/en/workouts.json';
import itWorkouts from './locales/it/workouts.json';
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
    auth: authEn,
    progress: enProgress,
    programs: enPrograms,
    workouts: enWorkouts,
    common: enCommon,
    onboarding: enOnboarding,
    navigation: enNavigation,
  },
  it: {
    auth: authIt,
    progress: itProgress,
    programs: itPrograms,
    workouts: itWorkouts,
    common: itCommon,
    onboarding: itOnboarding,
    navigation: itNavigation,
  },
} as const;
