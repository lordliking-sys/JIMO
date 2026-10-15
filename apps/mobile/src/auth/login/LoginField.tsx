import { useId, useRef, useState, type ReactNode } from 'react';
import { TextInput, View, StyleSheet, type TextInputProps } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Text, animePink, useFormFocus } from '@jimo/ui';

/** Visual input wrapper only: values, autofill properties and handlers belong to AuthForm. */
export function LoginField({
  label,
  accessory,
  style,
  onPillLayout,
  ...props
}: TextInputProps & {
  label: string;
  accessory?: ReactNode;
  onPillLayout?: (top: number) => void;
}) {
  const input = useRef<TextInput>(null),
    focus = useFormFocus(),
    [focused, setFocused] = useState(false),
    id = `login-field-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={{ gap: 6 }}>
      <Text
        variant="label"
        style={{ fontSize: 15, lineHeight: 22, color: animePink.ink }}
      >
        {label}
      </Text>
      <View
        testID={`login-field-${label}`}
        onLayout={(e) => onPillLayout?.(e.nativeEvent.layout.y)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 56,
          borderRadius: 32,
          backgroundColor: 'rgba(255,247,250,0.94)',
          borderWidth: 1,
          borderColor: focused
            ? animePink.primaryText
            : 'rgba(218,105,158,0.35)',
          shadowColor: '#AC5C7A',
          shadowOpacity: 0.16,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        }}
      >
        <View
          pointerEvents="none"
          accessible={false}
          style={[
            StyleSheet.absoluteFill,
            { overflow: 'hidden', borderRadius: 32 },
          ]}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
                <Stop offset="0.12" stopColor="#FFF9FC" stopOpacity={0.1} />
                <Stop offset="1" stopColor="#ECC6D8" stopOpacity={0.2} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${id})`} />
          </Svg>
        </View>
        <TextInput
          {...props}
          ref={input}
          accessibilityLabel={label}
          placeholder={props.placeholder ?? label}
          placeholderTextColor={animePink.textSecondary}
          selectionColor={animePink.primaryPink}
          onFocus={(event) => {
            setFocused(true);
            focus(input.current);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            focus(null);
            props.onBlur?.(event);
          }}
          style={[
            {
              flex: 1,
              minWidth: 0,
              minHeight: 54,
              borderWidth: 0,
              backgroundColor: 'transparent',
              borderRadius: 32,
              paddingHorizontal: 18,
              paddingVertical: 12,
              fontFamily: 'Inter_400Regular',
              fontSize: 16,
              color: animePink.ink,
            },
            style,
          ]}
        />
        {accessory ? (
          <View style={{ paddingRight: 6 }}>{accessory}</View>
        ) : null}
      </View>
    </View>
  );
}
