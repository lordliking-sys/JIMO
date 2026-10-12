import { Pressable } from 'react-native';
import { Text } from '@jimo/ui';
import { useTranslation } from 'react-i18next';
import { NumberControl } from './NumberControl';
import { programInk } from './presentation';
import { restControlLabel, stepRestControl } from './rest-control';
export function RestControl({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange(value: string): void;
  invalid(): void;
}) {
  const { t } = useTranslation('programs');
  return (
    <NumberControl
      label={t('rest')}
      displayLabel={t('restShort')}
      value={value}
      displayValue={restControlLabel(value, t('secondsShort'))}
      onChange={onChange}
      min={0}
      max={86400}
      labelAccessory={
        value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('unspecified')}
            onPress={() => onChange('')}
            style={{
              minHeight: 44,
              justifyContent: 'center',
              alignSelf: 'flex-start',
            }}
          >
            <Text variant="caption" color={programInk.secondary}>
              {t('unspecified')}
            </Text>
          </Pressable>
        ) : undefined
      }
      onStep={(direction) => {
        try {
          onChange(stepRestControl(value, direction));
        } catch {
          invalid();
        }
      }}
    />
  );
}
