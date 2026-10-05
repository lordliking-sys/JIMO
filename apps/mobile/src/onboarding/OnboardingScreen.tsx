import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { useTranslation } from 'react-i18next';
import { onboardingSchema } from '@jimo/schemas';
import type { OnboardingData } from '@jimo/schemas';
import { Button, colors, IconButton, Screen, spacing, Text } from '@jimo/ui';
import { usePreferences } from '../storage/PreferencesProvider';
import { canContinue, stepNames } from './state';
import type { OnboardingDraft } from './state';
import { StepOptions } from './StepOptions';
export function OnboardingScreen() {
  const { t } = useTranslation(['common', 'onboarding']);
  const { preferences, complete, saving, saveError } = usePreferences();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>({ equipment: [] });
  const [invalid, setInvalid] = useState(false);
  const name = stepNames[step] ?? 'welcome';
  const update = (patch: OnboardingDraft) =>
    setDraft((current) => ({ ...current, ...patch }));
  function finish(startMethod: OnboardingData['startMethod']) {
    update({ startMethod });
    const result = onboardingSchema.safeParse({
      ...draft,
      startMethod,
      locale: preferences?.localePreference,
    });
    if (!result.success) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    void complete(result.data);
  }
  return (
    <Screen>
      <View style={styles.progressHeader}>
        {step > 0 ? (
          <IconButton
            label={t('back')}
            icon={<ArrowLeft color={colors.text} size={22} />}
            disabled={saving}
            onPress={() => setStep((value) => value - 1)}
          />
        ) : null}
        <Text variant="caption" color={colors.secondary}>
          {t('onboarding:progress', {
            current: step + 1,
            total: stepNames.length,
          })}
        </Text>
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityLabel={t('onboarding:progress', {
          current: step + 1,
          total: stepNames.length,
        })}
        accessibilityValue={{ min: 0, max: stepNames.length, now: step + 1 }}
      >
        <View
          style={[
            styles.fill,
            { width: `${((step + 1) / stepNames.length) * 100}%` },
          ]}
        />
      </View>
      {step === 0 ? (
        <View style={styles.options}>
          <StepOptions
            step={step}
            draft={draft}
            update={update}
            finish={finish}
            saving={saving}
          />
        </View>
      ) : null}
      <View style={styles.heading}>
        <Text variant="h1" accessibilityRole="header">
          {t(`onboarding:${name}.title`)}
        </Text>
        <Text color={colors.secondary}>
          {t(`onboarding:${name}.description`)}
        </Text>
      </View>
      {step !== 0 ? (
        <View style={styles.options}>
          <StepOptions
            step={step}
            draft={draft}
            update={update}
            finish={finish}
            saving={saving}
          />
        </View>
      ) : null}
      {saveError || invalid ? (
        <Text accessibilityRole="alert" color={colors.danger}>
          {t('saveError')}
        </Text>
      ) : null}
      {step < stepNames.length - 1 ? (
        <Button
          label={step === 0 ? t('onboarding:welcome.cta') : t('continue')}
          disabled={saving || !canContinue(step, draft)}
          onPress={() => setStep((value) => value + 1)}
        />
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  track: { height: 3, backgroundColor: colors.border },
  fill: { height: 3, backgroundColor: colors.primary },
  heading: { gap: spacing.md },
  options: { gap: spacing.md },
});
