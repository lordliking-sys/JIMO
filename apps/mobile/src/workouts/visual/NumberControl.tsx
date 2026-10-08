import { useRef, useState } from 'react';
import { Keyboard, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';
import Minus from 'lucide-react-native/icons/minus';
import Plus from 'lucide-react-native/icons/plus';
import Check from 'lucide-react-native/icons/check';
import RotateCw from 'lucide-react-native/icons/rotate-cw';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import ChartNoAxesColumnIncreasing from 'lucide-react-native/icons/chart-no-axes-column-increasing';
import { useTranslation } from 'react-i18next';
import { InkButton } from './components';
import { InkText, useWorkoutFieldFocus, useWorkoutLayout } from './Surface';
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
    { contentWidth, fontScale } = useWorkoutLayout();
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
  const labelSize = contentWidth < 300 ? 14 : 15;
  const labelWidth =
    (label.length + (unit === 'kg' ? 5 : 0)) *
      (labelSize * 0.5 + 0.45) *
      fontScale +
    30;
  const stacked = contentWidth - 164 < labelWidth || fontScale > 1.2 || editing;
  const circle = {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: ink.border,
    backgroundColor: 'rgba(60,64,52,0.45)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  };
  return (
    <View style={{ gap: 4, paddingVertical: 1 }}>
      <View
        style={{
          flexDirection: stacked ? 'column' : 'row',
          alignItems: stacked ? 'stretch' : 'center',
          gap: stacked ? 2 : 6,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flex: stacked ? undefined : 1,
          }}
        >
          <Icon size={22} color={ink.sage} strokeWidth={1.7} />
          <InkText
            style={{
              flexShrink: 1,
              fontSize: labelSize,
              letterSpacing: 0.45,
            }}
          >
            {label.toUpperCase()}
            {unit === 'kg' ? (
              <InkText style={{ fontSize: 13, letterSpacing: 0 }}>
                {' '}
                (kg)
              </InkText>
            ) : null}
          </InkText>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            justifyContent: 'flex-end',
          }}
        >
          <InkButton
            label={`${t('decrease')} ${label}`}
            onPress={() => onStep(-1)}
            disabled={!value.trim() || (valid && current <= min)}
          >
            <View style={circle}>
              <Minus size={24} color={ink.parchment} strokeWidth={1.5} />
            </View>
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
              style={{ minWidth: 56, flexShrink: 1 }}
            >
              <InkText style={{ fontSize: 28, textAlign: 'center' }}>
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
          >
            <View style={circle}>
              <Plus size={24} color={ink.parchment} strokeWidth={1.5} />
            </View>
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
