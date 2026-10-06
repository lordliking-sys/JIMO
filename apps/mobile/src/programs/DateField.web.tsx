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
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label">{t('startsOn')}</Text>
      <input
        type="date"
        aria-label={t('startsOn')}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          colorScheme: 'dark',
          background: colors.elevated,
          color: colors.text,
          minHeight: sizes.touch,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.medium,
          padding: spacing.md,
          fontFamily: 'inherit',
          fontSize: 16,
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
      {value ? (
        <>
          <Text variant="caption" color={colors.secondary}>
            {calendarDateLabel(value, i18n.language)}
          </Text>
          <Button
            variant="secondary"
            label={t('clearDate')}
            onPress={() => onChange('')}
          />
        </>
      ) : null}
    </View>
  );
}
