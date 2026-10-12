import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
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
        <Image
          testID="program-day-artwork"
          source={artwork ? mainArtwork[artwork] : mainArtwork.program}
          accessible={false}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        />
        <Svg
          pointerEvents="none"
          accessible={false}
          width="100%"
          height="100%"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <LinearGradient id={`shade-${day.id}`} x1="0" y1="0" x2="1" y2="0">
              <Stop
                offset={0}
                stopColor={mainInk.charcoal}
                stopOpacity={0.86}
              />
              <Stop
                offset={0.55}
                stopColor={mainInk.charcoal}
                stopOpacity={0.48}
              />
              <Stop
                offset={1}
                stopColor={mainInk.charcoal}
                stopOpacity={0.08}
              />
            </LinearGradient>
            <RadialGradient id={`ink-${day.id}`}>
              <Stop offset={0} stopColor={mainInk.charcoal} stopOpacity={0.6} />
              <Stop
                offset={0.6}
                stopColor={mainInk.charcoal}
                stopOpacity={0.35}
              />
              <Stop offset={1} stopColor={mainInk.charcoal} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#shade-${day.id})`} />
          <Ellipse
            cx="28%"
            cy="50%"
            rx="70%"
            ry="85%"
            fill={`url(#ink-${day.id})`}
          />
        </Svg>
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
            <MainText style={{ fontSize: 18 }}>
              {t('dayNumber', { number: index + 1 })}
            </MainText>
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
              borderWidth: state === 'current' ? 0 : 1,
              borderColor: mainInk.parchment,
              backgroundColor:
                state === 'current' ? mainInk.sage : 'rgba(9, 15, 10, 0.8)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {state === 'completed' ? (
              <Check size={23} strokeWidth={1.8} color={mainInk.parchment} />
            ) : state === 'current' ? (
              <ArrowRight
                size={24}
                strokeWidth={1.8}
                color={mainInk.charcoal}
              />
            ) : (
              <ChevronRight size={21} color={mainInk.parchment} />
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
