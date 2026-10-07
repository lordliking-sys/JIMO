import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  equipmentOptions,
  experienceLevels,
  goals,
  startMethods,
} from '@jimo/schemas';
import type { OnboardingData } from '@jimo/schemas';
import { colors, spacing, Text } from '@jimo/ui';
import { LanguagePicker } from '../components/LanguagePicker';
import { OptionCard } from '../components/OptionCard';
import { Wordmark } from '../components/Wordmark';
import type { OnboardingDraft } from './state';
import { useImportFeature } from '../features/useImportFeature';
export function StepOptions({
  step,
  draft,
  update,
  finish,
  saving,
}: {
  step: number;
  draft: OnboardingDraft;
  update: (patch: OnboardingDraft) => void;
  finish: (method: OnboardingData['startMethod']) => void;
  saving: boolean;
}) {
  const importEnabled = useImportFeature();
  const { t } = useTranslation(['common', 'onboarding']);
  switch (step) {
    case 0:
      return (
        <View style={styles.welcome}>
          <Wordmark />
          <Text color={colors.secondary}>{t('brand.tagline')}</Text>
        </View>
      );
    case 1:
      return <LanguagePicker />;
    case 2:
      return (
        <>
          {goals.map((goal) => (
            <OptionCard
              key={goal}
              label={t(`onboarding:goals.${goal}`)}
              selected={draft.goal === goal}
              onPress={() => update({ goal })}
            />
          ))}
        </>
      );
    case 3:
      return (
        <>
          {experienceLevels.map((experienceLevel) => (
            <OptionCard
              key={experienceLevel}
              label={t(`onboarding:levels.${experienceLevel}`)}
              selected={draft.experienceLevel === experienceLevel}
              onPress={() => update({ experienceLevel })}
            />
          ))}
        </>
      );
    case 4:
      return (
        <>
          {[1, 2, 3, 4, 5, 6, 7].map((days) => (
            <OptionCard
              key={days}
              label={t('onboarding:days.option', { count: days })}
              selected={draft.trainingDaysPerWeek === days}
              onPress={() => update({ trainingDaysPerWeek: days })}
            />
          ))}
        </>
      );
    case 5:
      return (
        <>
          {equipmentOptions.map((item) => (
            <OptionCard
              key={item}
              label={t(`onboarding:equipmentOptions.${item}`)}
              selected={draft.equipment?.includes(item) ?? false}
              multiple
              onPress={() => {
                const equipment = draft.equipment ?? [];
                update({
                  equipment: equipment.includes(item)
                    ? equipment.filter((entry) => entry !== item)
                    : [...equipment, item],
                });
              }}
            />
          ))}
        </>
      );
    case 6:
      return (
        <>
          {startMethods.map((method) => (
            <OptionCard
              key={method}
              label={t(`methods.${method}`)}
              description={`${t(`methodDescriptions.${method}`)}${method === 'ai' || (method === 'import' && !importEnabled) ? ` · ${t('comingSoon')}` : ''}`}
              selected={
                draft.startMethod === method &&
                (method === 'manual' || (method === 'import' && importEnabled))
              }
              disabled={
                saving ||
                method === 'ai' ||
                (method === 'import' && !importEnabled)
              }
              onPress={() => finish(method)}
            />
          ))}
        </>
      );
    default:
      return null;
  }
}
const styles = StyleSheet.create({
  welcome: { gap: spacing.md, paddingVertical: spacing.huge },
});
