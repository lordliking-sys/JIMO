import { StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import { useTranslation } from 'react-i18next';
import { Text } from '@jimo/ui';
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
  return (
    <View
      testID="program-week-overview"
      style={{ gap: 8, paddingVertical: 8, paddingHorizontal: 6 }}
    >
      <MainText
        accessibilityRole="header"
        style={{ fontSize: 22, lineHeight: 26 }}
      >
        {t('weekOverview')}
      </MainText>
      {days.map((day, index) => {
        const state = states.get(day.id) ?? 'future';
        return (
          <View
            key={day.id}
            testID={
              days.length === 1
                ? 'program-single-day-overview'
                : `program-overview-day-${day.id}`
            }
            accessible
            accessibilityLabel={`${day.name}, ${t(`dayStates.${state}`)}, ${t('programs:exerciseCount', { count: day.exercises.length })}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              minHeight: 40,
              paddingVertical: 8,
              borderBottomWidth:
                index < days.length - 1 ? StyleSheet.hairlineWidth : 0,
              borderBottomColor: 'rgba(183, 198, 155, 0.28)',
            }}
          >
            <View
              accessible={false}
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: mainInk.sage,
                backgroundColor:
                  state === 'future' ? 'transparent' : mainInk.sage,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {state === 'completed' ? (
                <Check size={12} color={mainInk.charcoal} />
              ) : null}
            </View>
            <MainText
              style={{ flex: 1, minWidth: 0, fontSize: 19, lineHeight: 23 }}
            >
              {day.name}
            </MainText>
            <Text
              variant="caption"
              color={mainInk.muted}
              style={{ flexShrink: 1, textAlign: 'right' }}
            >
              {t('programs:exerciseCount', { count: day.exercises.length })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
