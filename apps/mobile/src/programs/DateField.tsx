import { useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import { Button, Card, colors, spacing, Text } from '@jimo/ui';
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
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t, i18n } = useTranslation('programs');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(new Date());
  const choose = () => {
    Keyboard.dismiss();
    const date = parseCalendarDate(value) ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        onChange: (event, selected) => {
          if (event.type === 'set' && selected)
            onChange(calendarDateValue(selected));
        },
      });
    } else {
      setDraft(date);
      setOpen(true);
    }
  };
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label">{t('startsOn')}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('startsOn')}: ${value ? calendarDateLabel(value, i18n.language) : t('chooseDate')}`}
        accessibilityHint={t('chooseDate')}
        onPress={choose}
        style={({ pressed }) => [
          styles.input,
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            borderColor: pressed ? colors.primary : colors.border,
          },
        ]}
      >
        <CalendarDays
          size={22}
          color={colors.secondary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text
          style={{ flex: 1 }}
          color={value ? colors.text : colors.secondary}
        >
          {value ? calendarDateLabel(value, i18n.language) : t('chooseDate')}
        </Text>
      </Pressable>
      {value ? (
        <Button
          variant="secondary"
          label={t('clearDate')}
          onPress={() => onChange('')}
        />
      ) : null}
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <Card accessibilityViewIsModal>
            <Text variant="h3">{t('startsOn')}</Text>
            <DateTimePicker
              value={draft}
              mode="date"
              accessibilityLabel={t('startsOn')}
              display="inline"
              themeVariant="dark"
              accentColor={colors.primary}
              locale={i18n.language}
              onChange={(_event, selected) => {
                if (selected) setDraft(selected);
              }}
            />
            <Button
              label={t('confirm')}
              onPress={() => {
                onChange(calendarDateValue(draft));
                setOpen(false);
              }}
            />
            <Button
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
