import { useState } from 'react';
import { Modal, View } from 'react-native';
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
    <WorkoutSurface centered={mode === 'emom'}>
      <WorkoutHeading
        title={t(mode === 'emom' ? 'visual.emomTitle' : 'visual.strength')}
        onBack={onClose}
        divider={mode !== 'emom'}
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
      <InkText
        style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 12,
          color: ink.parchment,
          textAlign: 'center',
          backgroundColor: 'rgba(8,13,9,0.75)',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 8,
          alignSelf: 'center',
        }}
      >
        {t('visual.previewOnly')}
      </InkText>
      {mode === 'emom' ? (
        <>
          <View style={{ flex: 1, minHeight: 60, maxHeight: 110 }} />
          <EnsoTimer remaining={38} total={60} brush label="EMOM" />
          <BrushDivider />
          <InkText style={{ fontSize: 23, letterSpacing: 2, marginTop: 8 }}>
            {t('set').toUpperCase()} 3 / 10
          </InkText>
          <InkText style={{ fontSize: 58, letterSpacing: 2 }}>5 REPS</InkText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                borderRadius: 24,
                padding: 10,
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
              marginTop: 28,
              marginBottom: 18,
            }}
          >
            {[1, 2, 3, 4].map((n) => (
              <View key={n} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
                <View
                  accessibilityLabel={`${t('set')} ${n} · ${t(n < 3 ? 'completed' : n === 3 ? 'current' : 'pending')}`}
                  style={{
                    minHeight: 58,
                    minWidth: 58,
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
        paddingTop: 12,
        gap: 6,
      }}
    >
      <InkText
        style={{
          fontSize: 19,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 4,
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
            minHeight: 28,
            paddingHorizontal: 12,
            borderRadius: 28,
            backgroundColor: i === 2 ? 'rgba(101,133,86,0.36)' : 'transparent',
            borderWidth: i === 2 ? 1 : 0,
            borderColor: ink.border,
          }}
        >
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
  return (
    <Modal
      visible={mode !== null}
      animationType="none"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      {mode ? <Preview key={mode} mode={mode} onClose={onClose} /> : null}
    </Modal>
  );
}
