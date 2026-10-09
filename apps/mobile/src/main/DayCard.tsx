import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Check from 'lucide-react-native/icons/check';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Text } from '@jimo/ui';
import type { DayDto, ProgramDetail, WorkoutSummary } from '@jimo/schemas';
import { MainText } from './Surface';
import { mainArtwork, mainInk } from './theme';
import { dayArtworkKey, type DayState } from './helpers';
import { useDayStart } from './useDayStart';

export function DayCard({
  program,
  day,
  state,
  index,
  completed,
}: {
  program: ProgramDetail;
  day: DayDto;
  state: DayState;
  index: number;
  completed?: WorkoutSummary | undefined;
}) {
  const { t } = useTranslation(['main', 'programs', 'workouts']),
    router = useRouter(),
    action = useDayStart(day.id);
  const artwork = dayArtworkKey(day.name),
    startable = program.status === 'active' && day.exercises.length > 0;
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
          minHeight: 100,
          borderRadius: 17,
          borderWidth: state === 'current' ? 2 : 1,
          borderColor: state === 'current' ? mainInk.sage : mainInk.border,
          overflow: 'hidden',
          backgroundColor: mainInk.charcoal,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Image
          testID="program-day-artwork"
          source={artwork ? mainArtwork[artwork] : mainArtwork.program}
          accessible={false}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        />
        <Svg
          accessible={false}
          width="100%"
          height="100%"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <LinearGradient id={`shade-${day.id}`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#07100a" stopOpacity={0.93} />
              <Stop offset="0.48" stopColor="#07100a" stopOpacity={0.67} />
              <Stop offset="1" stopColor="#07100a" stopOpacity={0.08} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#shade-${day.id})`} />
        </Svg>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            paddingHorizontal: 18,
            paddingVertical: 12,
          }}
        >
          <View style={{ flex: 1, gap: 1 }}>
            <MainText style={{ fontSize: 18 }}>
              {t('dayNumber', { number: index + 1 })}
            </MainText>
            <MainText style={{ fontSize: 30, lineHeight: 33 }}>
              {day.name}
            </MainText>
            <MainText style={{ fontSize: 17 }}>
              {t('programs:exerciseCount', { count: day.exercises.length })}
            </MainText>
          </View>
          <View
            accessible={false}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              borderWidth: state === 'current' ? 0 : 1,
              borderColor: mainInk.parchment,
              backgroundColor:
                state === 'current' ? mainInk.sage : 'rgba(9, 15, 10, 0.8)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {state === 'completed' ? (
              <Check size={27} strokeWidth={1.8} color={mainInk.parchment} />
            ) : state === 'current' ? (
              <ArrowRight
                size={28}
                strokeWidth={1.8}
                color={mainInk.charcoal}
              />
            ) : (
              <ChevronRight size={24} color={mainInk.parchment} />
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
