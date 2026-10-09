import { View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import { useTranslation } from 'react-i18next';
import type { DayDto } from '@jimo/schemas';
import { MainText } from './Surface';
import { mainInk } from './theme';
import type { DayState } from './helpers';

export function WeekOverview({
  days,
  states,
}: {
  days: DayDto[];
  states: Map<string, DayState>;
}) {
  const { t } = useTranslation(['main', 'programs']);
  const rows = Array.from({ length: Math.ceil(days.length / 4) }, (_, index) =>
    days.slice(index * 4, index * 4 + 4),
  );
  return (
    <View
      testID="program-week-overview"
      style={{
        gap: 8,
        paddingTop: 12,
        paddingBottom: 12,
        paddingHorizontal: 6,
        backgroundColor: 'rgba(10, 17, 12, 0.84)',
      }}
    >
      <MainText
        accessibilityRole="header"
        style={{ fontSize: 22, lineHeight: 26 }}
      >
        {t('weekOverview')}
      </MainText>
      {days.length === 1 ? (
        <View
          testID="program-single-day-overview"
          accessible
          accessibilityLabel={`${days[0]!.name}, ${t(`dayStates.${states.get(days[0]!.id) ?? 'future'}`)}, ${t('programs:exerciseCount', { count: days[0]!.exercises.length })}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            minHeight: 26,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 1,
              borderColor: mainInk.sage,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor:
                states.get(days[0]!.id) === 'future'
                  ? mainInk.charcoal
                  : mainInk.sage,
            }}
          >
            {states.get(days[0]!.id) === 'completed' ? (
              <Check size={16} color={mainInk.charcoal} />
            ) : null}
          </View>
          <MainText style={{ flex: 1, fontSize: 18 }}>{days[0]!.name}</MainText>
          <MainText style={{ fontSize: 15, color: mainInk.muted }}>
            {t('programs:exerciseCount', { count: days[0]!.exercises.length })}
          </MainText>
        </View>
      ) : (
        rows.map((row, index) => (
          <View key={index} style={{ flexDirection: 'row' }}>
            <View
              accessible={false}
              style={{
                position: 'absolute',
                height: 1,
                top: 12,
                left: `${50 / row.length}%`,
                right: `${50 / row.length}%`,
                backgroundColor: mainInk.border,
              }}
            />
            {row.map((day) => (
              <View
                key={day.id}
                accessible
                accessibilityLabel={`${day.name}, ${t(`dayStates.${states.get(day.id) ?? 'future'}`)}, ${t('programs:exerciseCount', { count: day.exercises.length })}`}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  gap: 3,
                  paddingHorizontal: 3,
                }}
              >
                <View
                  style={{
                    width: 26,
                    height: 26,
                    marginBottom: 2,
                    borderRadius: 13,
                    borderWidth: 1.5,
                    borderColor:
                      states.get(day.id) === 'future'
                        ? mainInk.parchment
                        : mainInk.sage,
                    backgroundColor:
                      states.get(day.id) === 'future'
                        ? mainInk.charcoal
                        : mainInk.sage,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {states.get(day.id) === 'completed' ? (
                    <Check size={18} color={mainInk.charcoal} />
                  ) : null}
                </View>
                <MainText style={{ fontSize: 18, textAlign: 'center' }}>
                  {day.name}
                </MainText>
                <MainText
                  style={{
                    fontSize: 15,
                    textAlign: 'center',
                    color: mainInk.muted,
                  }}
                >
                  {t('programs:exerciseCount', { count: day.exercises.length })}
                </MainText>
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
}
