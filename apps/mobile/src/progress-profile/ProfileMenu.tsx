import type { ComponentType, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import Check from 'lucide-react-native/icons/check';
import type { LucideProps } from 'lucide-react-native';
import {
  EditorialText,
  Copy,
  PaperCard,
  useProfileMenuAnchor,
} from './Surface';
import { ink } from './theme';
export function ProfileMenu({ children }: { children: ReactNode }) {
  const { rememberMenu } = useProfileMenuAnchor();
  return (
    <PaperCard
      testID="profile-menu"
      onLayout={(event) => rememberMenu(event.nativeEvent.layout.y)}
      style={{ paddingHorizontal: 18, paddingTop: 0, paddingBottom: 0 }}
    >
      {children}
    </PaperCard>
  );
}

export function ProfileMenuRow({
  icon: Icon,
  title,
  subtitle,
  disabled = false,
  expanded = false,
  onPress,
  children,
}: {
  icon: ComponentType<LucideProps>;
  title: string;
  subtitle: string;
  disabled?: boolean;
  expanded?: boolean;
  onPress: () => void;
  children?: ReactNode;
}) {
  const Chevron = expanded ? ChevronDown : ChevronRight;
  return (
    <View style={{ borderTopWidth: 1, borderColor: ink.border }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={subtitle}
        {...(children ? { 'aria-expanded': expanded } : {})}
        accessibilityState={{ disabled, ...(children ? { expanded } : {}) }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 74,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          paddingVertical: 12,
          opacity: disabled ? 0.6 : pressed ? 0.7 : 1,
        })}
      >
        <Icon size={27} color={ink.charcoal} accessible={false} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <EditorialText style={{ fontSize: 24, lineHeight: 27 }}>
            {title}
          </EditorialText>
          <Copy>{subtitle}</Copy>
        </View>
        {!disabled ? (
          <Chevron size={22} color={ink.charcoal} accessible={false} />
        ) : null}
      </Pressable>
      {expanded ? (
        <View style={{ gap: 8, paddingBottom: 16 }}>{children}</View>
      ) : null}
    </View>
  );
}
export function ProfileChoice({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      aria-checked={selected}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? ink.green : ink.border,
        borderRadius: 7,
        paddingHorizontal: 14,
        paddingVertical: 10,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Copy style={{ color: ink.charcoal, fontSize: 14 }}>{label}</Copy>
      {selected ? (
        <Check size={18} color={ink.green} accessible={false} />
      ) : null}
    </Pressable>
  );
}
