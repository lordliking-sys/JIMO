import { Pressable, View } from 'react-native';
import { zonedDateKey } from '@jimo/schemas';
import Check from 'lucide-react-native/icons/check';
import { useTranslation } from 'react-i18next';
import { MainText } from './Surface';
import { animePink } from '@jimo/ui';
import type { weekSchedule } from '../workouts/helpers';

export function WeekStrip({
  week,
  selectedDate,
  onSelect,
}: {
  week: ReturnType<typeof weekSchedule>;
  selectedDate: Date;
  onSelect(date: Date): void;
}) {
  const { t } = useTranslation(['main', 'workouts', 'programs']);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return (
    <View
      testID="home-week-strip"
      accessibilityLabel={t('week')}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 0,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: animePink.border,
        borderRadius: 20,
        backgroundColor: animePink.surface,
      }}
    >
      {week.map((day) => {
        const selected =
          zonedDateKey(day.date, zone) === zonedDateKey(selectedDate, zone);
        const state = [
          day.today ? t('workouts:weekState.today') : null,
          day.completed
            ? t('workouts:weekState.completed')
            : day.days.length
              ? t('workouts:weekState.scheduled')
              : t('workouts:weekState.rest'),
        ]
          .filter(Boolean)
          .join(', ');
        return (
          <Pressable
            key={day.weekday}
            testID={`home-date-${day.weekday}`}
            accessibilityRole="button"
            accessibilityLabel={`${t(`programs:weekdays.${day.weekday}`)}, ${day.date.getDate()}, ${state}`}
            accessibilityState={{ selected }}
            aria-pressed={selected}
            onPress={() => onSelect(day.date)}
            style={{
              flex: 1,
              minHeight: 52,
              gap: 6,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MainText style={{ fontSize: 12, lineHeight: 16 }}>
              {t(`weekdayLetters.${day.weekday}`)}
            </MainText>
            <View
              style={{
                width: 32,
                minHeight: 44,
                borderRadius: 17,
                gap: 3,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected
                  ? animePink.primaryAction
                  : day.days.length || day.completed
                    ? animePink.primaryPinkPale
                    : 'transparent',
                borderWidth: day.today ? 2 : 0,
                borderColor: selected ? animePink.white : animePink.primaryText,
              }}
            >
              <MainText
                style={{
                  fontSize: 14,
                  lineHeight: 18,
                  color: selected ? animePink.white : animePink.textPrimary,
                }}
              >
                {day.date.getDate()}
              </MainText>
              {day.completed ? (
                <Check
                  size={12}
                  color={selected ? animePink.white : animePink.primaryText}
                />
              ) : (
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: day.days.length
                      ? selected
                        ? animePink.white
                        : animePink.primaryPink
                      : animePink.border,
                  }}
                />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
