import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import { Text, animePink, uiDepth } from '@jimo/ui';
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
        padding: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: animePink.border,
        backgroundColor: animePink.surfaceSoft,
        ...uiDepth.card,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        accessible={false}
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          backgroundColor: animePink.primaryPinkPale,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Dumbbell size={21} color={animePink.primaryText} />
      </View>
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
