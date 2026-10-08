import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Check from 'lucide-react-native/icons/check';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Circle from 'lucide-react-native/icons/circle';
import Bell from 'lucide-react-native/icons/bell';
import EllipsisVertical from 'lucide-react-native/icons/ellipsis-vertical';
import { useTranslation } from 'react-i18next';
import {
  BrushDivider,
  EnsoTimer,
  ExerciseHero,
  InkButton,
  SeriesHeading,
  ValuePill,
  WorkoutHeading,
} from './components';
import { InkText, WorkoutSurface } from './Surface';
import { NumberControl } from './NumberControl';
import { ink } from './theme';
import { useSafeBack } from '../../navigation/SafeBack';
import {
  decimalDisplay,
  stepDecimal,
  stepInteger,
} from '../../programs/helpers';

export type PreviewMode = 'emom' | 'pyramid';
const pyramid = [
  [12, 60],
  [10, 70],
  [8, 80],
  [6, 90],
  [8, 80],
  [10, 70],
  [12, 60],
] as const;

/** Isolated visual samples: no workout actions, clock, storage, sound or network. */
function Preview({
  mode,
  onClose,
}: {
  mode: PreviewMode;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('workouts');
  const [reps, setReps] = useState('8'),
    [load, setLoad] = useState('80'),
    [info, setInfo] = useState(false);
  return (
    <WorkoutSurface
      centered={mode === 'emom'}
      variant={mode}
      footer={
        mode === 'pyramid' ? (
          <InkButton
            primary
            disabled
            label={t('completeSet')}
            onPress={() => {}}
          />
        ) : undefined
      }
    >
      <WorkoutHeading
        title={t(mode === 'emom' ? 'visual.emomTitle' : 'visual.strength')}
        onClose={onClose}
        divider={mode !== 'emom'}
        badge={t('visual.previewBadge')}
        counter={mode === 'pyramid' ? '3 / 7' : undefined}
        trailing={
          mode === 'emom' ? (
            <InkButton
              label={t('visual.previewInfo')}
              onPress={() => setInfo((v) => !v)}
            >
              <EllipsisVertical size={24} color={ink.parchment} />
            </InkButton>
          ) : undefined
        }
      />
      {mode === 'emom' ? (
        <>
          <View style={{ flex: 1, minHeight: 0, maxHeight: 64 }} />
          <EnsoTimer remaining={38} total={60} brush label="EMOM" />
          <BrushDivider />
          <InkText style={{ fontSize: 23, letterSpacing: 1.5, marginTop: 4 }}>
            {t('set').toUpperCase()} 3 / 10
          </InkText>
          <InkText style={{ fontSize: 54, letterSpacing: 1.5 }}>5 REPS</InkText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                borderRadius: 24,
                padding: 8,
                backgroundColor: ink.surface,
              }}
            >
              <Bell size={22} color={ink.sage} />
            </View>
            <InkText style={{ fontSize: 18, color: ink.sage, flexShrink: 1 }}>
              {t('visual.soundPreview')}
            </InkText>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: '100%',
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            {[1, 2, 3, 4].map((n) => (
              <View key={n} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
                <View
                  accessibilityLabel={`${t('set')} ${n} · ${t(n < 3 ? 'completed' : n === 3 ? 'current' : 'pending')}`}
                  style={{
                    minHeight: 54,
                    minWidth: 54,
                    borderWidth: n === 3 ? 2 : 1,
                    borderColor: n === 3 ? ink.sage : ink.border,
                    borderRadius: 38,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 8,
                  }}
                >
                  <InkText
                    style={{
                      fontSize: 22,
                      color: n > 3 ? ink.secondary : ink.parchment,
                    }}
                  >
                    {String(n).padStart(2, '0')}
                  </InkText>
                  {n < 3 ? <Check size={16} color={ink.sage} /> : null}
                </View>
                {n === 3 ? (
                  <InkText style={{ fontSize: 15 }}>
                    {t('workoutStatus.in_progress').toLowerCase()}
                  </InkText>
                ) : null}
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          <ExerciseHero name={t('visual.benchPress')} compact />
          <SeriesHeading current={3} total={7} />
          <ValuePill values={['8 reps', '80 kg']} />
          <NumberControl
            label={t('reps')}
            value={reps}
            onChange={setReps}
            onStep={(direction) => {
              try {
                setReps(stepInteger(reps, direction, { min: 0, max: 1000000 }));
              } catch {
                /* local invalid preview input */
              }
            }}
          />
          <NumberControl
            label={t('load')}
            value={load}
            onChange={setLoad}
            unit="kg"
            keyboardType="decimal-pad"
            onStep={(direction) => {
              try {
                setLoad(
                  decimalDisplay(
                    stepDecimal(load.replace(',', '.'), '2.5', direction, 2),
                    i18n.language,
                  ),
                );
              } catch {
                /* local invalid preview input */
              }
            }}
          />
          <PyramidTimeline />
        </>
      )}
      {info ? (
        <InkText
          style={{
            fontFamily: 'Inter_400Regular',
            color: ink.secondary,
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          {t('visual.previewInfoText')}
        </InkText>
      ) : null}
    </WorkoutSurface>
  );
}

export function PyramidTimeline() {
  const { t } = useTranslation('workouts');
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderColor: ink.border,
        paddingTop: 6,
        gap: 0,
      }}
    >
      <InkText
        style={{
          fontSize: 19,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 0,
        }}
      >
        {t('visual.pyramidProgression')}
      </InkText>
      {pyramid.map(([reps, kg], i) => (
        <View
          key={i}
          accessibilityLabel={`${t('set')} ${i + 1}: ${reps} reps, ${kg} kg, ${t(i < 2 ? 'completed' : i === 2 ? 'current' : 'pending')}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 30,
            paddingHorizontal: 12,
            borderRadius: 28,
            paddingVertical: i === 2 ? 2 : 0,
          }}
        >
          {i === 2 ? (
            <Svg
              style={StyleSheet.absoluteFill}
              width="100%"
              height="100%"
              pointerEvents="none"
            >
              <Defs>
                <LinearGradient id="pyramidCurrent" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#658556" stopOpacity="0" />
                  <Stop offset="0.18" stopColor="#658556" stopOpacity="0.32" />
                  <Stop offset="0.72" stopColor="#658556" stopOpacity="0.32" />
                  <Stop offset="1" stopColor="#658556" stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Rect
                width="100%"
                height="100%"
                rx="18"
                fill="url(#pyramidCurrent)"
              />
            </Svg>
          ) : null}
          <View
            style={{
              width: 24,
              alignSelf: 'stretch',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 14,
            }}
          >
            <View
              style={{
                position: 'absolute',
                width: 2,
                top: i === 0 ? '50%' : -4,
                bottom: i === 6 ? '50%' : -4,
                backgroundColor: i < 3 ? ink.sageDark : ink.pending,
              }}
            />
            <View
              style={{
                width: i === 2 ? 14 : 10,
                height: i === 2 ? 14 : 10,
                borderRadius: 8,
                backgroundColor: i < 3 ? ink.sage : ink.pending,
              }}
            />
          </View>
          <InkText
            style={{
              fontSize: 21,
              color: i === 2 ? ink.parchment : ink.secondary,
            }}
          >
            {String(i + 1).padStart(2, '0')}
          </InkText>
          <InkText style={{ flex: 1, textAlign: 'center', fontSize: 24 }}>
            {reps} × {kg}
          </InkText>
          {i < 2 ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: ink.sage,
                borderRadius: 15,
                padding: 3,
              }}
            >
              <Check size={16} color={ink.sage} />
            </View>
          ) : i === 2 ? (
            <ArrowRight size={24} color={ink.parchment} />
          ) : (
            <Circle size={22} color={ink.secondary} strokeWidth={1} />
          )}
        </View>
      ))}
    </View>
  );
}

export function WorkoutVisualPreview({
  mode,
  onClose,
}: {
  mode: PreviewMode | null;
  onClose: () => void;
}) {
  const close = useSafeBack('/workout', onClose, false);
  return (
    <Modal
      visible={mode !== null}
      animationType="none"
      onRequestClose={close}
      presentationStyle="fullScreen"
    >
      <SafeAreaProvider>
        {mode ? <Preview key={mode} mode={mode} onClose={close} /> : null}
      </SafeAreaProvider>
    </Modal>
  );
}
