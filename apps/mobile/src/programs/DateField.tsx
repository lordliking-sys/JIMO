import {
  useProgramPresentation,
  programInk,
  ProgramButton,
} from './presentation';
import { useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Button, Card, colors, spacing, Text, animePink } from '@jimo/ui';
import { useTranslation } from 'react-i18next';
import {
  calendarDateLabel,
  calendarDateValue,
  parseCalendarDate,
} from './date';
import { styles } from './components';

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
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(new Date());
  const choose = () => {
    Keyboard.dismiss();
    const date = parseCalendarDate(value) ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        onValueChange: (_event, selected) =>
          onChange(calendarDateValue(selected)),
        onDismiss: () => {},
      });
    } else {
      setDraft(date);
      setOpen(true);
    }
  };
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" color={palette.text}>
        {t('startsOn')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('startsOn')}: ${value ? calendarDateLabel(value, i18n.language) : t('chooseDate')}`}
        accessibilityHint={t('chooseDate')}
        onPress={choose}
        disabled={disabled}
        style={({ pressed }) => [
          styles.input,
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            borderColor: pressed ? palette.primary : palette.border,
            backgroundColor: palette.elevated,
            ...(compact
              ? {
                  borderRadius: 22,
                  minHeight: 48,
                  gap: 10,
                  backgroundColor: '#FFFFFF',
                }
              : {}),
          },
        ]}
      >
        <CalendarDays
          size={22}
          color={compact ? animePink.primaryText : palette.secondary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text
          style={{ flex: 1 }}
          color={value ? palette.text : palette.secondary}
        >
          {value ? calendarDateLabel(value, i18n.language) : t('chooseDate')}
        </Text>
        {compact ? (
          <ChevronRight size={19} color={palette.text} accessible={false} />
        ) : null}
      </Pressable>
      {value ? (
        <ActionButton
          variant="secondary"
          label={t('clearDate')}
          onPress={() => onChange('')}
          disabled={disabled}
        />
      ) : null}
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <Card
            accessibilityViewIsModal
            style={
              visual
                ? {
                    backgroundColor: programInk.surface,
                    borderColor: programInk.border,
                  }
                : {}
            }
          >
            <Text variant="h3" color={palette.text}>
              {t('startsOn')}
            </Text>
            <DateTimePicker
              value={draft}
              mode="date"
              accessibilityLabel={t('startsOn')}
              display="inline"
              themeVariant="light"
              accentColor={palette.primary}
              locale={i18n.language}
              onValueChange={(_event, selected) => setDraft(selected)}
              onDismiss={() => setOpen(false)}
            />
            <ActionButton
              label={t('confirm')}
              onPress={() => {
                onChange(calendarDateValue(draft));
                setOpen(false);
              }}
            />
            <ActionButton
              variant="secondary"
              label={t('cancel')}
              onPress={() => setOpen(false)}
            />
          </Card>
        </View>
      </Modal>
    </View>
  );
}
