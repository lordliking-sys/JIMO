import { useRef, useState } from 'react';
import { Keyboard, TextInput, View, useWindowDimensions } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';
import Minus from 'lucide-react-native/icons/minus';
import Plus from 'lucide-react-native/icons/plus';
import Check from 'lucide-react-native/icons/check';
import RotateCw from 'lucide-react-native/icons/rotate-cw';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import ChartNoAxesColumnIncreasing from 'lucide-react-native/icons/chart-no-axes-column-increasing';
import { useTranslation } from 'react-i18next';
import { InkButton } from './components';
import { InkText, useWorkoutFieldFocus } from './Surface';
import { ink } from './theme';

export function NumberControl({
  label,
  value,
  onChange,
  onStep,
  min = 0,
  max,
  keyboardType = 'number-pad',
  prefix = '',
  unit = '',
  presets = [],
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onStep: (direction: 1 | -1) => void;
  min?: number;
  max?: number;
  keyboardType?: KeyboardTypeOptions;
  prefix?: string;
  unit?: string;
  presets?: { value: string; label: string; accessibilityLabel?: string }[];
}) {
  const { t } = useTranslation('programs'),
    { width, fontScale } = useWindowDimensions();
  const [editing, setEditing] = useState(false),
    focus = useWorkoutFieldFocus(),
    ref = useRef<TextInput>(null);
  const current = Number(value.replace(',', '.')),
    valid = value.trim() !== '' && Number.isFinite(current);
  const finish = () => {
    Keyboard.dismiss();
    focus(null);
    setEditing(false);
  };
  const Icon = presets.length
    ? ChartNoAxesColumnIncreasing
    : unit === 'kg'
      ? Dumbbell
      : RotateCw;
  const stacked = width < 360 || fontScale > 1.15 || editing;
  return (
    <View style={{ gap: 4, paddingVertical: 4 }}>
      <View
        style={{
          flexDirection: stacked ? 'column' : 'row',
          alignItems: stacked ? 'stretch' : 'center',
          gap: stacked ? 4 : 8,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            flex: stacked ? undefined : 1,
          }}
        >
          <Icon size={25} color={ink.sage} strokeWidth={1.7} />
          <InkText
            style={{
              flexShrink: 1,
              textTransform: 'uppercase',
              fontSize: 16,
              letterSpacing: 1.1,
            }}
          >
            {label}
            {unit === 'kg' ? ' (kg)' : ''}
          </InkText>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            justifyContent: 'flex-end',
          }}
        >
          <InkButton
            label={`${t('decrease')} ${label}`}
            onPress={() => onStep(-1)}
            disabled={!value.trim() || (valid && current <= min)}
            style={{
              borderRadius: 28,
              borderWidth: 1,
              borderColor: ink.border,
              backgroundColor: 'rgba(60,64,52,0.45)',
            }}
          >
            <Minus size={25} color={ink.parchment} strokeWidth={1.5} />
          </InkButton>
          {editing ? (
            <TextInput
              ref={ref}
              accessibilityLabel={label}
              accessibilityHint={t('numberHint')}
              value={value}
              onChangeText={onChange}
              keyboardType={keyboardType}
              placeholder="—"
              placeholderTextColor={ink.secondary}
              autoFocus
              onFocus={() => focus(ref.current)}
              onBlur={() => focus(null)}
              onSubmitEditing={finish}
              selectionColor={ink.sage}
              style={{
                color: ink.parchment,
                fontSize: 24,
                minHeight: 48,
                flex: 1,
                minWidth: 48,
                paddingHorizontal: 4,
                textAlign: 'center',
                borderBottomWidth: 1,
                borderColor: ink.sage,
              }}
            />
          ) : (
            <InkButton
              label={t('manualValue', { label })}
              accessibilityHint={t('numberHint')}
              accessibilityValue={{ text: value || t('unspecified') }}
              onPress={() => setEditing(true)}
              style={{ minWidth: 64, flexShrink: 1 }}
            >
              <InkText style={{ fontSize: 30, textAlign: 'center' }}>
                {value ? `${prefix}${value}` : '—'}
                {value && unit ? (
                  <InkText style={{ fontSize: 14 }}> {unit}</InkText>
                ) : null}
              </InkText>
            </InkButton>
          )}
          <InkButton
            label={`${t('increase')} ${label}`}
            onPress={() => onStep(1)}
            disabled={valid && max !== undefined && current >= max}
            style={{
              borderRadius: 28,
              borderWidth: 1,
              borderColor: ink.border,
              backgroundColor: 'rgba(60,64,52,0.45)',
            }}
          >
            <Plus size={25} color={ink.parchment} strokeWidth={1.5} />
          </InkButton>
          {editing ? (
            <InkButton label={t('confirmValue', { label })} onPress={finish}>
              <Check size={24} color={ink.sage} />
            </InkButton>
          ) : null}
        </View>
      </View>
      {editing && presets.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {presets.map((preset) => (
            <InkButton
              key={preset.value}
              label={preset.accessibilityLabel ?? preset.label}
              onPress={() => {
                onChange(preset.value);
                finish();
              }}
              style={{
                borderWidth: 1,
                borderColor: ink.border,
                borderRadius: 24,
                paddingHorizontal: 10,
              }}
            >
              <InkText style={{ fontSize: 18 }}>{preset.label}</InkText>
            </InkButton>
          ))}
        </View>
      ) : null}
    </View>
  );
}
