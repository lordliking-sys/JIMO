import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Text, animePink } from '@jimo/ui';
import type { DayDto } from '@jimo/schemas';
import { MainText } from './Surface';
/** Weekly overview: prescriptions live exclusively in the day dialog. */
export function DayCard({ day, onPress }: { day: DayDto; onPress(): void }) {
  const { t } = useTranslation(['main', 'programs']);
  return (
    <Pressable
      testID={`program-day-${day.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${t('programs:openDay')} ${day.name}`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 80,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: animePink.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <MainText style={{ fontSize: 18 }}>
          {day.dayOfWeek
            ? t(
                `programs:weekdays.${day.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7}`,
              )
            : day.name}
        </MainText>
        <Text
          style={{
            fontSize: 15,
            lineHeight: 22,
            color: animePink.textSecondary,
          }}
        >
          {day.dayOfWeek ? `${day.name} · ` : ''}
          {t('programs:exerciseCount', { count: day.exercises.length })}
        </Text>
      </View>
      <ChevronRight
        size={22}
        color={animePink.primaryText}
        accessible={false}
      />
    </Pressable>
  );
}
