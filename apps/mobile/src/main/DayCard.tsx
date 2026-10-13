import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Check from 'lucide-react-native/icons/check';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Text, animePink } from '@jimo/ui';
import type { DayDto, ProgramDetail } from '@jimo/schemas';
import { MainText } from './Surface';
import { mainInk } from './theme';
import { type DayState } from './helpers';

export function DayCard({
  program,
  day,
  state,
}: {
  program: ProgramDetail;
  day: DayDto;
  state: DayState;
}) {
  const { t } = useTranslation(['main', 'programs', 'workouts']),
    router = useRouter();
  const label = `${t('programs:openDay')} ${day.name}`;
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        testID={`program-day-${day.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${t(`dayStates.${state}`)}`}
        onPress={() =>
          router.push({
            pathname: '/program/[id]/day-detail',
            params: { id: program.id, dayId: day.id, backTo: 'scheda' },
          })
        }
        style={({ pressed }) => ({
          minHeight: state === 'current' ? 104 : 92,
          borderRadius: 20,
          borderWidth: 1,
          borderColor:
            state === 'current' ? animePink.primaryPink : animePink.border,
          overflow: 'hidden',
          backgroundColor: animePink.surface,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            paddingHorizontal: 18,
            paddingVertical: state === 'current' ? 18 : 14,
          }}
        >
          <View style={{ flex: 1, gap: 1 }}>
            {day.dayOfWeek ? (
              <MainText style={{ fontSize: 18 }}>
                {t(
                  `programs:weekdays.${day.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7}`,
                )}
              </MainText>
            ) : null}
            <MainText style={{ fontSize: 20, lineHeight: 27 }}>
              {day.name}
            </MainText>
            <Text
              variant="caption"
              color={mainInk.muted}
              style={{ marginTop: 5 }}
            >
              {t('programs:exerciseCount', { count: day.exercises.length })}
            </Text>
          </View>
          <View
            accessible={false}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: mainInk.sage,
              backgroundColor: animePink.surfaceSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {state === 'completed' ? (
              <Check size={23} strokeWidth={1.8} color={mainInk.sage} />
            ) : (
              <ChevronRight size={21} color={mainInk.sage} />
            )}
          </View>
        </View>
      </Pressable>
    </View>
  );
}
