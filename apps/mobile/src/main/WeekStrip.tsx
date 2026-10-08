import { View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import { useTranslation } from 'react-i18next';
import { MainText } from './Surface';
import { mainInk } from './theme';
import type { weekSchedule } from '../workouts/helpers';

export function WeekStrip({ week }: { week: ReturnType<typeof weekSchedule> }) {
  const { t } = useTranslation(['main', 'workouts', 'programs']);
  return (
    <View
      testID="home-week-strip"
      accessibilityLabel={t('week')}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 16,
      }}
    >
      {week.map((day) => {
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
          <View
            key={day.weekday}
            accessible
            accessibilityLabel={`${t(`programs:weekdays.${day.weekday}`)}, ${state}`}
            style={{
              flex: 1,
              minHeight: 58,
              gap: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MainText style={{ fontSize: 19 }}>
              {t(`weekdayLetters.${day.weekday}`)}
            </MainText>
            <View
              style={{
                width: 25,
                height: 25,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: day.completed
                  ? day.today
                    ? mainInk.sage
                    : mainInk.green
                  : day.today
                    ? mainInk.sage
                    : 'transparent',
                borderWidth: day.today || day.completed ? 2 : 1.5,
                borderColor:
                  day.days.length || day.completed || day.today
                    ? mainInk.green
                    : mainInk.darkMuted,
              }}
            >
              {day.completed ? (
                <Check
                  size={17}
                  strokeWidth={2.2}
                  color={day.today ? mainInk.charcoal : mainInk.parchment}
                />
              ) : day.days.length ? (
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: mainInk.green,
                  }}
                />
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
