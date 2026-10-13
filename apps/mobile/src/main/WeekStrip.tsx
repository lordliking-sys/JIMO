import { View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import { useTranslation } from 'react-i18next';
import { MainText } from './Surface';
import { animePink } from '@jimo/ui';
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
        marginVertical: 0,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: animePink.border,
        borderRadius: 20,
        backgroundColor: animePink.surface,
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
                backgroundColor: day.today
                  ? animePink.primaryAction
                  : day.days.length || day.completed
                    ? animePink.primaryPinkPale
                    : 'transparent',
                borderWidth: day.today ? 1 : 0,
                borderColor: animePink.primaryPink,
              }}
            >
              <MainText
                style={{
                  fontSize: 14,
                  lineHeight: 18,
                  color: day.today ? animePink.white : animePink.textPrimary,
                }}
              >
                {day.date.getDate()}
              </MainText>
              {day.completed ? (
                <Check
                  size={12}
                  color={day.today ? animePink.white : animePink.primaryText}
                />
              ) : (
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: day.days.length
                      ? day.today
                        ? animePink.white
                        : animePink.primaryPink
                      : animePink.border,
                  }}
                />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
