import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  profileSchema,
  profileUpdateSchema,
  syncIdentitySchema,
  type Profile,
  type ProfileUpdate,
} from '@jimo/schemas';
import { apiRequest, ApiClientError } from '../api/client';
import { useOffline } from '../db/Provider';
import { usePreferences } from '../storage/PreferencesProvider';
import { useAuthSession } from './SessionProvider';
import { AccountProfileCache } from './profile-cache';
import { initialProfilePatch } from './helpers';
const Context = createContext<{
  profile: Profile | null;
  resolved: boolean;
  error: boolean;
  retry(): void;
  update(input: ProfileUpdate): Promise<void>;
  logout(): Promise<void>;
} | null>(null);
export function AccountProvider({ children }: { children: ReactNode }) {
  const session = useAuthSession(),
    { runtime } = useOffline(),
    cache = useQueryClient(),
    { preferences, applyAccountProfile } = usePreferences();
  const [state, setState] = useState<{
    subject: string | null;
    profile: Profile | null;
    resolved: boolean;
    error: boolean;
  }>({ subject: null, profile: null, resolved: false, error: false });
  const [attempt, setAttempt] = useState(0);
  const localeRef = useRef(applyAccountProfile),
    prefsRef = useRef(preferences);
  const boundSubject = useRef<string | null>(null),
    profileRevision = useRef(0);
  useEffect(() => {
    localeRef.current = applyAccountProfile;
    prefsRef.current = preferences;
  }, [applyAccountProfile, preferences]);
  const preferencesReady = preferences !== null;
  useEffect(() => {
    if (!session.loaded || !preferencesReady) return;
    let live = true;
    const subject = session.subject;
    // Immediately unbind and clear in-memory data before any other account mounts.
    if (
      boundSubject.current !== subject ||
      !session.signedIn ||
      session.needsAuth
    ) {
      boundSubject.current = null;
      runtime.bindOwner(null);
      void cache.cancelQueries();
      cache.clear();
    }
    if (!session.signedIn || !subject || session.needsAuth)
      return () => {
        live = false;
      };
    const profiles = new AccountProfileCache(runtime);
    const bind = async (profile: Profile) => {
      if (!live) return;
      if (!(await localeRef.current(profile.locale)))
        throw new ApiClientError('PROFILE_PREFERENCES_UNAVAILABLE');
      if (!live) return;
      runtime.bindOwner(profile.id);
      boundSubject.current = subject;
      setState({ subject, profile, resolved: true, error: false });
      void runtime.engine.request(true);
    };
    void (async () => {
      if (session.test) {
        const stored = await profiles.get(subject);
        let userId = stored?.id;
        try {
          userId = (await apiRequest('/sync/identity', syncIdentitySchema))
            .userId;
        } catch {
          if (!stored) throw new ApiClientError('NETWORK_ERROR');
        }
        if (!live || !userId) return;
        await profiles.save(subject, {
          id: userId,
          displayName: null,
          locale: prefsRef.current!.localePreference,
          unitSystem: 'metric',
          createdAt: '2026-10-07T00:00:00.000Z',
          initialized: true,
        });
        runtime.bindOwner(userId);
        boundSubject.current = subject;
        setState({ subject, profile: null, resolved: true, error: false });
        void runtime.engine.request(true);
        return;
      }
      const stored = await profiles.get(subject);
      if (stored) await bind(stored);
      if (stored && !runtime.online) return;
      try {
        const revision = profileRevision.current;
        if (stored) {
          const pending = await runtime.metadata(stored.id, 'pendingProfile');
          if (pending) {
            await apiRequest('/me', profileSchema, {
              method: 'PATCH',
              body: profileUpdateSchema.parse(JSON.parse(pending)),
              expectedUserId: stored.id,
            });
            if (!live) return;
            await runtime.metadata(stored.id, 'pendingProfile', '');
          }
        }
        let profile = await apiRequest('/me', profileSchema);
        if (!live) return;
        const patch = initialProfilePatch(profile, prefsRef.current!);
        if (patch)
          profile = await apiRequest('/me', profileSchema, {
            method: 'PATCH',
            body: patch,
          });
        if (!live) return;
        if (revision !== profileRevision.current) return;
        await profiles.save(subject, profile);
        await bind(profile);
      } catch (error) {
        if (!live) return;
        if (error instanceof ApiClientError && error.status === 401) {
          runtime.bindOwner(null);
          setState({ subject, profile: null, resolved: false, error: true });
        } else if (!stored)
          setState({ subject, profile: null, resolved: false, error: true });
      }
    })().catch(() => {
      if (live)
        setState({ subject, profile: null, resolved: false, error: true });
    });
    return () => {
      live = false;
    };
  }, [
    session.loaded,
    session.signedIn,
    session.subject,
    session.needsAuth,
    session.test,
    preferencesReady,
    attempt,
    runtime,
    cache,
  ]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && runtime.syncError === 'AUTH_REQUIRED')
        setAttempt((a) => a + 1);
    });
    return () => sub.remove();
  }, [runtime]);
  useEffect(() => {
    let previous = runtime.online;
    return runtime.subscribe(() => {
      if (!previous && runtime.online) setAttempt((a) => a + 1);
      previous = runtime.online;
    });
  }, [runtime]);
  const subject = session.subject;
  const current =
    state.subject === subject && session.signedIn && !session.needsAuth;
  return (
    <Context.Provider
      value={{
        profile: current ? state.profile : null,
        resolved: current && state.resolved && runtime.owner !== null,
        error: current && state.error,
        retry: () => setAttempt((a) => a + 1),
        update: async (input) => {
          if (!subject || !state.profile)
            throw new ApiClientError('AUTH_REQUIRED', 401);
          const owner = state.profile.id;
          profileRevision.current++;
          if (
            !runtime.online &&
            input.locale &&
            Object.keys(input).length === 1
          ) {
            const profile = { ...state.profile, locale: input.locale };
            await runtime.metadata(
              owner,
              'pendingProfile',
              JSON.stringify(input),
            );
            await new AccountProfileCache(runtime).save(subject, profile);
            if (runtime.owner !== owner)
              throw new ApiClientError('IDENTITY_CHANGED', 403);
            await localeRef.current(profile.locale);
            setState({ subject, profile, resolved: true, error: false });
            return;
          }
          const profile = await apiRequest('/me', profileSchema, {
            method: 'PATCH',
            body: input,
            expectedUserId: owner,
          });
          if (runtime.owner !== owner)
            throw new ApiClientError('IDENTITY_CHANGED', 403);
          await new AccountProfileCache(runtime).save(subject, profile);
          await localeRef.current(profile.locale);
          setState({ subject, profile, resolved: true, error: false });
        },
        logout: async () => {
          runtime.bindOwner(null);
          await cache.cancelQueries();
          cache.clear();
          await session.signOut();
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAccount() {
  const value = useContext(Context);
  if (!value) throw new Error('AccountProvider missing');
  return value;
}
