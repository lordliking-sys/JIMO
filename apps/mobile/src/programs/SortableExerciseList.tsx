import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  View,
  type ViewStyle,
} from 'react-native';
import GripVertical from 'lucide-react-native/icons/grip-vertical';
import { Text, animePink } from '@jimo/ui';
import { useTranslation } from 'react-i18next';
import { useDialogDrag } from '../components/JimoDialog';

/** Native responder gestures keep one scroll view; only the final order is persisted. */
export function SortableExerciseList<T extends { id: string }>({
  items,
  disabled,
  onReorder,
  renderItem,
  name,
}: {
  items: T[];
  disabled: boolean;
  onReorder(ids: string[]): Promise<unknown>;
  renderItem(item: T): ReactNode;
  name(item: T): string;
}) {
  const { t } = useTranslation('programs'),
    dialog = useDialogDrag();
  const [preview, setPreview] = useState<string[] | null>(null),
    [activeId, setActiveId] = useState<string | null>(null),
    [dropIndex, setDropIndex] = useState(-1),
    [saving, setSaving] = useState(false),
    [announcement, setAnnouncement] = useState('');
  const source = useRef(items);
  const callbacks = useRef({ onReorder, dialog, name });
  useLayoutEffect(() => {
    source.current = items;
    callbacks.current = { onReorder, dialog, name };
  });
  const layout = useRef(new Map<string, { y: number; height: number }>());
  const drag = useRef<null | {
    id: string;
    from: number;
    target: number;
    ids: string[];
    dy: number;
    scroll: number;
    pointer: number;
  }>(null);
  const frame = useRef(0);
  const [translate] = useState(() => new Animated.Value(0));
  const signature = items.map((item) => item.id).join(':');
  useEffect(() => {
    if (!drag.current) setPreview(null);
  }, [signature]);
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      callbacks.current.dialog?.setDragging(false);
    },
    [],
  );
  const reset = () => {
    cancelAnimationFrame(frame.current);
    drag.current = null;
    translate.setValue(0);
    setActiveId(null);
    setDropIndex(-1);
    callbacks.current.dialog?.setDragging(false);
  };
  const persist = async (ids: string[], id: string) => {
    setPreview(ids);
    setSaving(true);
    try {
      await callbacks.current.onReorder(ids);
      setAnnouncement(
        t('reorderedExercise', {
          name: callbacks.current.name(
            source.current.find((e) => e.id === id)!,
          ),
          position: ids.indexOf(id) + 1,
        }),
      );
    } catch {
      setPreview(null);
    } finally {
      setSaving(false);
    }
  };
  const update = () => {
    const state = drag.current;
    if (!state) return;
    const origin = layout.current.get(state.id);
    if (!origin) return;
    const center = origin.y + origin.height / 2 + state.dy + state.scroll;
    let target = 0;
    state.ids.forEach((id, index) => {
      const row = layout.current.get(id);
      if (row && center >= row.y + row.height / 2) target = index;
    });
    // Upward drags cross the previous row's centre, not the active row's top.
    if (center < origin.y + origin.height / 2) {
      target = state.from;
      for (let i = state.from - 1; i >= 0; i--) {
        const row = layout.current.get(state.ids[i]!);
        if (row && center < row.y + row.height / 2) target = i;
      }
    }
    state.target = target;
    setDropIndex(target);
    translate.setValue(state.dy + state.scroll);
  };
  const tick = () => {
    if (!drag.current) return;
    drag.current.scroll +=
      callbacks.current.dialog?.scrollNear(drag.current.pointer) ?? 0;
    update();
    frame.current = requestAnimationFrame(tick);
  };
  const start = (id: string, y: number) => {
    const ids = source.current.map((e) => e.id),
      from = ids.indexOf(id);
    drag.current = {
      id,
      from,
      target: from,
      ids,
      dy: 0,
      scroll: 0,
      pointer: y,
    };
    setActiveId(id);
    setDropIndex(from);
    callbacks.current.dialog?.setDragging(true);
    frame.current = requestAnimationFrame(tick);
  };
  const finish = () => {
    update();
    const state = drag.current;
    if (!state) return;
    const ids = [...state.ids];
    ids.splice(state.from, 1);
    ids.splice(state.target, 0, state.id);
    reset();
    if (state.target !== state.from) void persist(ids, state.id);
  };
  const moveAccessible = (id: string, direction: number) => {
    if (disabled || saving || drag.current) return;
    const ids = source.current.map((e) => e.id),
      from = ids.indexOf(id),
      to = from + direction;
    if (to < 0 || to >= ids.length) return;
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    void persist(ids, id);
  };
  const events = useRef({ start, finish, reset, moveAccessible });
  const locked = useRef(false);
  useLayoutEffect(() => {
    events.current = { start, finish, reset, moveAccessible };
    locked.current = disabled || saving;
  });
  const [responders, setResponders] = useState<
    Map<string, ReturnType<typeof PanResponder.create>>
  >(() => new Map());
  useEffect(() => {
    setResponders(
      new Map(
        (signature ? signature.split(':') : []).map((id) => [
          id,
          PanResponder.create({
            onStartShouldSetPanResponder: () => !locked.current,
            onMoveShouldSetPanResponder: () => !locked.current,
            onPanResponderGrant: (_e, g) => events.current.start(id, g.y0),
            onPanResponderMove: (_e, g) => {
              if (drag.current) {
                drag.current.dy = g.dy;
                drag.current.pointer = g.moveY;
              }
            },
            onPanResponderRelease: () => events.current.finish(),
            onPanResponderTerminate: () => events.current.reset(),
            onPanResponderTerminationRequest: () => false,
          }),
        ]),
      ),
    );
  }, [signature]);
  const rows = preview
    ? preview.flatMap((id) => items.filter((item) => item.id === id))
    : items;
  return (
    <View testID="sortable-day-exercises" style={{ gap: 4 }}>
      {rows.map((item, index) => (
        <Animated.View
          key={item.id}
          onLayout={(e) =>
            layout.current.set(item.id, {
              y: e.nativeEvent.layout.y,
              height: e.nativeEvent.layout.height,
            })
          }
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            zIndex: activeId === item.id ? 10 : 0,
            backgroundColor:
              activeId === item.id ? animePink.surfaceSoft : 'transparent',
            borderRadius: 14,
            opacity: saving ? 0.65 : 1,
            ...(activeId === item.id
              ? {
                  transform: [{ translateY: translate }],
                  shadowColor: '#7D2451',
                  shadowOpacity: 0.2,
                  shadowRadius: 10,
                  elevation: 5,
                }
              : {}),
          }}
        >
          {activeId && index === dropIndex && activeId !== item.id ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: animePink.primaryPink,
              }}
            />
          ) : null}
          <View style={{ flex: 1, minWidth: 0 }}>{renderItem(item)}</View>
          {items.length > 1 ? (
            <View
              testID={`drag-exercise-${item.id}`}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={t('dragExercise', { name: name(item) })}
              accessibilityHint={t('dragHint')}
              accessibilityValue={{ min: 1, max: items.length, now: index + 1 }}
              accessibilityState={{ disabled: disabled || saving }}
              accessibilityActions={[
                { name: 'increment', label: t('moveDown') },
                { name: 'decrement', label: t('moveUp') },
              ]}
              onAccessibilityAction={(e) =>
                events.current.moveAccessible(
                  item.id,
                  e.nativeEvent.actionName === 'increment' ? 1 : -1,
                )
              }
              focusable
              {...(Platform.OS === 'web'
                ? {
                    onKeyDown: (e: KeyboardEvent) => {
                      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        events.current.moveAccessible(
                          item.id,
                          e.key === 'ArrowDown' ? 1 : -1,
                        );
                      }
                    },
                  }
                : {})}
              {...responders.get(item.id)?.panHandlers}
              style={[
                {
                  width: 48,
                  minHeight: 64,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
                Platform.OS === 'web'
                  ? ({
                      touchAction: 'none',
                    } as ViewStyle)
                  : {},
              ]}
            >
              <GripVertical
                size={20}
                color={animePink.primaryText}
                accessible={false}
              />
            </View>
          ) : null}
        </Animated.View>
      ))}
      <Text
        accessibilityLiveRegion="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
        }}
      >
        {announcement}
      </Text>
    </View>
  );
}
