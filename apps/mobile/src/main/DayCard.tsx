import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Check from 'lucide-react-native/icons/check';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Text } from '@jimo/ui';
import type { DayDto, ProgramDetail, WorkoutSummary } from '@jimo/schemas';
import { MainText } from './Surface';
import { mainInk } from './theme';
import { type DayState } from './helpers';
import { useDayStart } from './useDayStart';

export function DayCard({
  program,
  day,
  state,
  completed,
}: {
  program: ProgramDetail;
  day: DayDto;
  state: DayState;
  completed?: WorkoutSummary | undefined;
}) {
  const { t } = useTranslation(['main', 'programs', 'workouts']),
    router = useRouter(),
    action = useDayStart(day.id);
  const startable = program.status === 'active' && day.exercises.length > 0;
  const label = completed
    ? t('openSession', { name: day.name })
    : action.conflict
      ? t('workouts:resume')
      : startable
        ? `${t('workouts:start')} · ${day.name}`
        : `${t('programs:open')} ${day.name}`;
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        testID={`program-day-${day.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${t(`dayStates.${state}`)}`}
        accessibilityState={{ disabled: action.pending }}
        disabled={action.pending}
        onPress={() => {
          if (completed)
            router.push({
              pathname: '/workout/[id]',
              params: { id: completed.id },
            });
          else if (startable) action.start();
          else
            router.push({
              pathname: '/program/[id]',
              params: { id: program.id },
            });
        }}
        style={({ pressed }) => ({
          minHeight: state === 'current' ? 132 : 116,
          borderRadius: 28,
          borderWidth: 1,
          borderColor:
            state === 'current'
              ? 'rgba(183, 198, 155, 0.50)'
              : 'rgba(183, 198, 155, 0.22)',
          overflow: 'hidden',
          backgroundColor: mainInk.charcoal,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            paddingHorizontal: 18,
            paddingVertical: state === 'current' ? 22 : 18,
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
            <MainText style={{ fontSize: 30, lineHeight: 33 }}>
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
              backgroundColor: 'rgba(9, 15, 10, 0.8)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {state === 'completed' ? (
              <Check size={23} strokeWidth={1.8} color={mainInk.sage} />
            ) : state === 'current' ? (
              <ArrowRight size={24} strokeWidth={1.8} color={mainInk.sage} />
            ) : (
              <ChevronRight size={21} color={mainInk.sage} />
            )}
          </View>
        </View>
      </Pressable>
      {action.error ? (
        <Text variant="caption" accessibilityRole="alert" color={mainInk.muted}>
          {t(
            action.conflict ? 'workouts:startConflict' : 'programs:serverError',
          )}
        </Text>
      ) : null}
    </View>
  );
}
