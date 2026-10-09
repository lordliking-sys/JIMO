import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MainText } from './Surface';
import { mainInk } from './theme';

export function WeekSelector({
  total,
  selected,
  onSelect,
}: {
  total: number;
  selected: number;
  onSelect(week: number): void;
}) {
  const { t } = useTranslation('main'),
    scroll = useRef<ScrollView>(null),
    chips = useRef(new Map<number, { x: number; width: number }>()),
    [viewport, setViewport] = useState(0);
  const revealSelected = useCallback(() => {
    const chip = chips.current.get(selected);
    if (!chip || !viewport) return;
    scroll.current?.scrollTo({
      x: Math.max(0, chip.x - (viewport - chip.width) / 2),
      animated: false,
    });
  }, [selected, viewport]);
  useEffect(() => {
    revealSelected();
  }, [revealSelected]);
  return (
    <View
      testID="program-week-selector"
      accessibilityRole="radiogroup"
      accessibilityLabel={t('week')}
      style={{ marginBottom: 12 }}
    >
      <ScrollView
        ref={scroll}
        testID="program-week-scroll"
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        onLayout={(event) => setViewport(event.nativeEvent.layout.width)}
        onContentSizeChange={revealSelected}
        contentContainerStyle={{
          gap: 10,
          paddingHorizontal: 1,
          paddingVertical: 2,
        }}
      >
        {Array.from({ length: total }, (_, index) => index + 1).map((week) => (
          <Pressable
            key={week}
            accessibilityRole="radio"
            accessibilityLabel={t('weekNumber', { number: week })}
            accessibilityState={{ checked: selected === week }}
            aria-checked={selected === week}
            onPress={() => onSelect(week)}
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              chips.current.set(week, { x, width });
              if (week === selected) revealSelected();
            }}
            style={({ pressed }) => ({
              minWidth: 140,
              minHeight: 48,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: selected === week ? mainInk.sage : mainInk.border,
              backgroundColor:
                selected === week ? mainInk.sage : mainInk.darkSurface,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <MainText
              style={{
                fontSize: 19,
                color: selected === week ? mainInk.charcoal : mainInk.parchment,
              }}
            >
              {t('weekNumber', { number: week })}
            </MainText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
