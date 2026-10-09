import {
  useProgramPresentation,
  programInk,
  ProgramButton,
} from './presentation';
import { View } from 'react-native';
import { colors, spacing, Text, Button, radius, sizes } from '@jimo/ui';
import { useTranslation } from 'react-i18next';
import { calendarDateLabel } from './date';

export function DateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t, i18n } = useTranslation('programs');
  const visual = useProgramPresentation(),
    palette = visual
      ? {
          ...colors,
          text: programInk.charcoal,
          secondary: programInk.secondary,
          primary: programInk.green,
          border: programInk.border,
          elevated: 'rgba(250,242,223,0.55)',
        }
      : colors,
    ActionButton = visual ? ProgramButton : Button;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" color={palette.text}>
        {t('startsOn')}
      </Text>
      <input
        type="date"
        aria-label={t('startsOn')}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          colorScheme: visual ? 'light' : 'dark',
          background: palette.elevated,
          color: palette.text,
          minHeight: sizes.touch,
          border: `1px solid ${palette.border}`,
          borderRadius: radius.medium,
          padding: spacing.md,
          fontFamily: 'Inter_400Regular',
          fontSize: 16,
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
      {value ? (
        <>
          <Text variant="caption" color={palette.secondary}>
            {calendarDateLabel(value, i18n.language)}
          </Text>
          <ActionButton
            variant="secondary"
            label={t('clearDate')}
            onPress={() => onChange('')}
          />
        </>
      ) : null}
    </View>
  );
}
