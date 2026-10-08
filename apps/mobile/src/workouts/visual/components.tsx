import { useRef, useState, type ReactNode } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import type { AccessibilityValue, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Check from 'lucide-react-native/icons/check';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import { useTranslation } from 'react-i18next';
import type { WorkoutExercise, WorkoutSet } from '@jimo/schemas';
import { useApiLocale } from '../../api/queries';
import { countdown, setSummary } from '../helpers';
import { InkText, useWorkoutLayout } from './Surface';
import { SafeBack } from '../../navigation/SafeBack';
import { artwork, ink } from './theme';

export function InkButton({
  label,
  children,
  onPress,
  disabled = false,
  primary = false,
  style,
  accessibilityHint,
  accessibilityValue,
}: {
  label: string;
  children?: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  accessibilityValue?: AccessibilityValue;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityValue={accessibilityValue}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 48,
          minWidth: 48,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
        primary ? styles.primary : null,
        style,
      ]}
    >
      {children ?? (
        <InkText
          style={{
            textAlign: 'center',
            fontSize: primary ? 24 : 20,
            letterSpacing: primary ? 1.6 : 0,
            textTransform: primary ? 'uppercase' : 'none',
          }}
        >
          {label.replace(/^✓\s*/, '')}
        </InkText>
      )}
    </Pressable>
  );
}
export function BrushDivider({ width = 100 }: { width?: number }) {
  return (
    <Image
      source={artwork.divider}
      accessible={false}
      resizeMode="contain"
      style={{
        width,
        height: width / 3,
        alignSelf: 'center',
        marginVertical: -8,
      }}
    />
  );
}
export function InkActionMenu({
  label,
  title,
  actions,
  children,
  disabled = false,
}: {
  label: string;
  title: string;
  children?: ReactNode;
  disabled?: boolean;
  actions: { label: string; action: () => void }[];
}) {
  const [open, setOpen] = useState(false),
    pending = useRef<(() => void) | null>(null);
  const { t } = useTranslation('programs');
  const perform = () => {
    const action = pending.current;
    pending.current = null;
    action?.();
  };
  return (
    <>
      <InkButton
        label={label}
        disabled={disabled}
        onPress={() => setOpen(true)}
      >
        {children}
      </InkButton>
      <Modal
        visible={open}
        transparent
        animationType="none"
        onDismiss={perform}
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.75)',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            accessibilityViewIsModal
            style={{
              backgroundColor: ink.background,
              borderWidth: 1,
              borderColor: ink.border,
              borderRadius: 24,
              padding: 20,
              gap: 8,
            }}
          >
            <InkText style={{ textAlign: 'center', marginBottom: 8 }}>
              {title}
            </InkText>
            {actions.map((item) => (
              <InkButton
                key={item.label}
                label={item.label}
                onPress={() => {
                  pending.current = item.action;
                  setOpen(false);
                  if (Platform.OS !== 'ios') requestAnimationFrame(perform);
                }}
              />
            ))}
            <InkButton label={t('cancel')} onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}
export function WorkoutHeading({
  title,
  counter,
  badge,
  onClose,
  trailing,
  divider = true,
}: {
  title: string;
  counter?: string | undefined;
  badge?: string;
  onClose?: (() => void) | undefined;
  trailing?: ReactNode;
  divider?: boolean;
}) {
  return (
    <View style={{ width: '100%', gap: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <SafeBack dismiss={onClose} color={ink.parchment} />
        <InkText
          accessibilityRole="header"
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 24,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </InkText>
        {trailing ?? (
          <InkText style={{ minWidth: 48, textAlign: 'right', fontSize: 23 }}>
            {counter}
          </InkText>
        )}
      </View>
      {divider ? <BrushDivider /> : null}
      {badge ? (
        <InkText
          style={{
            position: 'absolute',
            right: 4,
            bottom: divider ? 0 : -8,
            fontFamily: 'Inter_400Regular',
            fontSize: 10,
            letterSpacing: 1.3,
            color: ink.secondary,
          }}
        >
          {badge}
        </InkText>
      ) : null}
    </View>
  );
}
export function ExerciseHero({
  name,
  compact = false,
  imageUri,
}: {
  name: string;
  compact?: boolean;
  imageUri?: string | null;
}) {
  const { standardImageHeight, pyramidImageHeight } = useWorkoutLayout();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const uri = imageUri?.trim();
  return (
    <View
      style={{
        gap: 4,
      }}
    >
      {uri && uri !== failedUri ? (
        <Image
          testID="workout-exercise-artwork"
          source={{ uri }}
          onError={() => setFailedUri(uri)}
          accessible={false}
          resizeMode="contain"
          style={{
            width: '100%',
            height: compact ? pyramidImageHeight : standardImageHeight,
          }}
        />
      ) : null}
      <InkText
        accessibilityRole="header"
        style={{
          fontSize: compact ? 34 : 38,
          textTransform: 'uppercase',
          textAlign: compact ? 'center' : 'left',
          letterSpacing: 1.2,
        }}
      >
        {name}
      </InkText>
    </View>
  );
}
export function SeriesHeading({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const { t } = useTranslation('workouts');
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 4,
      }}
    >
      <View style={styles.rule} />
      <InkText
        accessibilityLabel={t('setProgress', { current, total })}
        style={{ textAlign: 'center', letterSpacing: 1.8, fontSize: 20 }}
      >
        {t('set').toUpperCase()} {String(current).padStart(2, '0')} /{' '}
        {String(total).padStart(2, '0')}
      </InkText>
      <View style={styles.rule} />
    </View>
  );
}
export function TargetPill({
  exercise,
  set,
}: {
  exercise: WorkoutExercise;
  set: WorkoutSet;
}) {
  const { t } = useTranslation('workouts'),
    locale = useApiLocale(),
    s = setSummary(exercise, set, locale),
    mode = exercise.loadModeSnapshot;
  const values = [
    `${s.target}${exercise.trackingModeSnapshot === 'reps' ? ` ${t('repsShort')}` : ''}`,
    mode === 'bodyweight'
      ? t('bodyweight')
      : mode === 'assisted'
        ? `${t('assisted')} ${s.load || '—'} kg`
        : `${mode === 'weighted' ? '+' : ''}${s.load || '—'} kg`,
    ...(s.rpe ? [`RPE ${s.rpe}`] : []),
  ];
  return <ValuePill values={values} />;
}
export function ValuePill({ values }: { values: string[] }) {
  return (
    <View
      style={styles.pill}
      accessible
      accessibilityLabel={values.join(' · ')}
    >
      {values.map((value, i) => (
        <View
          key={i}
          style={{
            flexGrow: 1,
            flexShrink: 1,
            paddingHorizontal: 8,
            alignItems: 'center',
            ...(i ? { borderLeftWidth: 1, borderColor: ink.border } : {}),
          }}
        >
          <InkText style={{ textAlign: 'center', fontSize: 22 }}>
            {value}
          </InkText>
        </View>
      ))}
    </View>
  );
}
export function EnsoTimer({
  remaining,
  total,
  brush = false,
  label,
}: {
  remaining: number;
  total: number;
  brush?: boolean;
  label: string;
}) {
  const { fontScale, restRing, emomRing } = useWorkoutLayout(),
    diameter = brush ? emomRing : restRing,
    r = 46,
    circumference = 2 * Math.PI * r;
  const fraction = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessible
      accessibilityLabel={`${label} ${countdown(remaining)}`}
      accessibilityValue={{
        min: 0,
        max: Math.max(total, 1),
        now: remaining,
        text: countdown(remaining),
      }}
      aria-valuemin={0}
      aria-valuemax={Math.max(total, 1)}
      aria-valuenow={remaining}
      aria-valuetext={countdown(remaining)}
      accessibilityLiveRegion="none"
      style={{
        width: diameter,
        height: diameter,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
      }}
    >
      {brush ? (
        <Image
          source={artwork.enso}
          accessible={false}
          style={[
            StyleSheet.absoluteFill,
            { width: '100%', height: '100%', opacity: 0.65 },
          ]}
          resizeMode="contain"
        />
      ) : null}
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="timerSage" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#d0d0a9" />
            <Stop offset="1" stopColor="#879e6d" />
          </LinearGradient>
        </Defs>
        {!brush ? (
          <Circle
            cx="50"
            cy="50"
            r={r}
            fill="rgba(8,13,9,0.35)"
            stroke="#354631"
            strokeWidth="4.8"
          />
        ) : null}
        {fraction > 0 ? (
          <Circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="url(#timerSage)"
            strokeWidth="4.8"
            strokeLinecap="round"
            strokeDasharray={`${circumference * fraction} ${circumference}`}
            rotation="-90"
            origin="50,50"
          />
        ) : null}
      </Svg>
      <InkText
        style={{
          fontSize: Math.min(94, (diameter * 0.31) / fontScale),
          lineHeight: Math.min(110, diameter * 0.38),
        }}
      >
        {countdown(remaining)}
      </InkText>
    </View>
  );
}
export function CompletedSet({
  exercise,
  set,
  onEdit,
}: {
  exercise: WorkoutExercise;
  set: WorkoutSet;
  onEdit: () => void;
}) {
  const { t } = useTranslation('workouts'),
    locale = useApiLocale(),
    s = setSummary(exercise, set, locale, true);
  const load =
    exercise.loadModeSnapshot === 'bodyweight'
      ? ''
      : `${exercise.loadModeSnapshot === 'weighted' ? '+' : ''}${s.load || '—'}`;
  return (
    <InkButton
      label={t('editSet', { number: set.setNumber })}
      onPress={onEdit}
      style={[
        styles.pill,
        { minHeight: 54, gap: 10, justifyContent: 'space-around' },
      ]}
    >
      <InkText>{String(set.setNumber).padStart(2, '0')}</InkText>
      <InkText style={{ flex: 1, textAlign: 'center' }}>
        {s.target}
        {load ? ` × ${load}` : ''}
      </InkText>
      {s.rpe ? <InkText>RPE {s.rpe}</InkText> : null}
      <View style={styles.check}>
        <Check size={22} color={ink.parchment} />
      </View>
    </InkButton>
  );
}
export function SetIndicators({
  exercise,
  currentId,
  onEdit,
}: {
  exercise: WorkoutExercise;
  currentId: string;
  onEdit: (set: WorkoutSet) => void;
}) {
  const { t } = useTranslation('workouts');
  // Early sets are implicit in the reference; reveal the history only once it exists.
  if (!exercise.sets.some((s) => s.status !== 'pending')) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
      }}
    >
      {exercise.sets.map((set) => (
        <InkButton
          key={set.id}
          label={
            set.status === 'completed'
              ? t('editSet', { number: set.setNumber })
              : `${t('set')} ${set.setNumber} · ${t(set.id === currentId ? 'current' : set.status)}`
          }
          onPress={() => onEdit(set)}
          disabled={set.status !== 'completed'}
          style={{
            borderRadius: 28,
            borderWidth: 1,
            borderColor: set.id === currentId ? ink.sage : ink.border,
          }}
        >
          {set.status === 'completed' ? (
            <Check size={18} color={ink.sage} />
          ) : (
            <InkText style={{ fontSize: 19 }}>
              {String(set.setNumber).padStart(2, '0')}
            </InkText>
          )}
        </InkButton>
      ))}
    </View>
  );
}
export const Arrow = () => <ArrowRight size={23} color={ink.parchment} />;
const styles = StyleSheet.create({
  primary: {
    backgroundColor: ink.sageDark,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: ink.sage,
    minHeight: 54,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  rule: { flex: 1, height: 1, backgroundColor: ink.secondary, opacity: 0.6 },
  pill: {
    minHeight: 46,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: ink.border,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ink.surface,
    width: '100%',
  },
  check: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#819769',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
