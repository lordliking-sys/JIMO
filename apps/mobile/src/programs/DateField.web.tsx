import {
  useProgramPresentation,
  programInk,
  ProgramButton,
} from './presentation';
import { View } from 'react-native';
import {
  colors,
  spacing,
  Text,
  Button,
  radius,
  sizes,
  animePink,
} from '@jimo/ui';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { useTranslation } from 'react-i18next';
import { calendarDateLabel } from './date';

export function DateField({
  value,
  onChange,
  compact = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const { t, i18n } = useTranslation('programs');
  const visual = useProgramPresentation(),
    palette = visual
      ? {
          ...colors,
          text: programInk.text,
          secondary: programInk.secondary,
          primary: programInk.sage,
          border: programInk.border,
          elevated: programInk.field,
        }
      : colors,
    ActionButton = visual ? ProgramButton : Button;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" color={palette.text}>
        {t('startsOn')}
      </Text>
      {compact ? (
        <View
          style={{
            minHeight: 48,
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: 22,
            backgroundColor: '#FFFFFF',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            gap: 10,
          }}
        >
          <CalendarDays
            size={22}
            color={animePink.primaryText}
            accessible={false}
          />
          <Text
            style={{ flex: 1, fontSize: 15 }}
            color={value ? palette.text : palette.secondary}
          >
            {value ? calendarDateLabel(value, i18n.language) : t('chooseDate')}
          </Text>
          <ChevronRight size={19} color={palette.text} accessible={false} />
          <input
            type="date"
            aria-label={t('startsOn')}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              colorScheme: 'light',
            }}
          />
        </View>
      ) : (
        <input
          type="date"
          aria-label={t('startsOn')}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          style={{
            colorScheme: 'dark',
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
      )}
      {value ? (
        <>
          <Text variant="caption" color={palette.secondary}>
            {calendarDateLabel(value, i18n.language)}
          </Text>
          <ActionButton
            variant="secondary"
            label={t('clearDate')}
            onPress={() => onChange('')}
            disabled={disabled}
          />
        </>
      ) : null}
    </View>
  );
}
