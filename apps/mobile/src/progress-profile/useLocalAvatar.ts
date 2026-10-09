import { useEffect, useMemo, useRef, useState } from 'react';
import { useOffline } from '../db/Provider';
import { avatarPicker, createAvatarStore } from './avatar-native';
import {
  AvatarError,
  chooseAvatar,
  type AvatarSource,
  type AvatarErrorKind,
} from './avatar-store';

export function useLocalAvatar() {
  const { runtime } = useOffline(),
    owner = runtime.owner;
  const store = useMemo(
    () => createAvatarStore((...args) => runtime.metadata(...args)),
    [runtime],
  );
  const [state, setState] = useState<{
    owner: string | null;
    uri: string | null;
    loaded: boolean;
    open: boolean;
    busy: boolean;
    error: AvatarErrorKind | null;
  }>({
    owner: null,
    uri: null,
    loaded: false,
    open: false,
    busy: false,
    error: null,
  });
  const lock = useRef(false),
    mounted = useRef(false),
    generation = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    let live = true;
    const revision = ++generation.current;
    setState({
      owner,
      uri: null,
      loaded: false,
      open: false,
      busy: false,
      error: null,
    });
    if (owner)
      void store.read(owner).then(
        (uri) => {
          if (live) setState((s) => ({ ...s, uri, loaded: true }));
        },
        () => {
          if (live) setState((s) => ({ ...s, loaded: true, error: 'storage' }));
        },
      );
    return () => {
      live = false;
      generation.current = revision + 1;
    };
  }, [owner, store]);
  const current = state.owner === owner;
  async function run(source: AvatarSource | 'remove', expected?: string) {
    if (!owner || lock.current || !current) return;
    lock.current = true;
    const revision = generation.current;
    const active = () =>
      mounted.current &&
      runtime.owner === owner &&
      generation.current === revision;
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      if (source === 'remove') {
        await store.remove(owner, expected);
      } else {
        const photo = await chooseAvatar(source, avatarPicker, active);
        if (!photo) {
          if (active()) setState((s) => ({ ...s, open: false }));
          return;
        }
        await store.replace(owner, photo, active);
      }
      const uri = await store.read(owner);
      if (active())
        setState((s) => ({
          ...s,
          uri,
          open: false,
          error: expected ? 'unavailable' : null,
        }));
    } catch (error) {
      // Re-read after a partial filesystem failure; metadata remains the source of truth.
      const uri = await store.read(owner).catch(() => null);
      if (active())
        setState((s) => ({
          ...s,
          uri,
          error: error instanceof AvatarError ? error.kind : 'storage',
        }));
    } finally {
      lock.current = false;
      if (active()) setState((s) => ({ ...s, busy: false }));
    }
  }
  return {
    uri: current ? state.uri : null,
    open: current && state.open,
    busy: current && state.busy,
    disabled: !owner || !current || !state.loaded || state.busy,
    error: current ? state.error : null,
    show: () => {
      if (owner && current && state.loaded && !state.busy)
        setState((s) => ({ ...s, open: true, error: null }));
    },
    close: () => {
      if (!state.busy) setState((s) => ({ ...s, open: false, error: null }));
    },
    choose: (source: AvatarSource) => {
      void run(source);
    },
    remove: () => {
      void run('remove');
    },
    unavailable: (uri: string) => {
      if (current && state.uri === uri) void run('remove', uri);
    },
  };
}
