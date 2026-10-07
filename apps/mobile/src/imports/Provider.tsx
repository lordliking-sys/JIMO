import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ImportDraft } from '@jimo/schemas';
import { useOffline } from '../db/Provider';
import { ImportDraftRepository } from './draft';
const Context = createContext<{
  draft: ImportDraft | null;
  loaded: boolean;
  error: boolean;
  update: (change: (draft: ImportDraft | null) => ImportDraft) => Promise<void>;
  discard: () => Promise<void>;
} | null>(null);
export const importDeployment = process.env.EXPO_PUBLIC_API_URL ?? '';
export function ImportDraftProvider({ children }: { children: ReactNode }) {
  const { runtime } = useOffline(),
    owner = runtime.owner;
  const repository = useMemo(
    () => new ImportDraftRepository(runtime.db, importDeployment),
    [runtime],
  );
  const [state, setState] = useState<{
    owner: string | null;
    draft: ImportDraft | null;
    loaded: boolean;
    error: boolean;
  }>({ owner: null, draft: null, loaded: false, error: false });
  const current = useRef<{ owner: string | null; draft: ImportDraft | null }>({
    owner: null,
    draft: null,
  });
  useEffect(() => {
    let live = true;
    current.current = { owner, draft: null };
    if (owner)
      void repository
        .read(owner)
        .then((draft) => {
          if (live) {
            current.current = { owner, draft };
            setState({ owner, draft, loaded: true, error: false });
          }
        })
        .catch(() => {
          if (live) setState({ owner, draft: null, loaded: true, error: true });
        });
    return () => {
      live = false;
    };
  }, [owner, repository]);
  const update = async (change: (draft: ImportDraft | null) => ImportDraft) => {
    if (!owner || current.current.owner !== owner)
      throw new Error('IDENTITY_CHANGED');
    const draft = change(current.current.draft);
    const previous = current.current.draft;
    current.current = { owner, draft };
    setState({ owner, draft, loaded: true, error: false });
    try {
      await repository.save(owner, draft);
    } catch (error) {
      if (runtime.owner === owner && current.current.draft === draft) {
        current.current = { owner, draft: previous };
        setState({ owner, draft: previous, loaded: true, error: true });
      }
      throw error;
    }
  };
  const discard = async () => {
    if (!owner) return;
    await repository.discard(owner);
    if (runtime.owner === owner) {
      current.current = { owner, draft: null };
      setState({ owner, draft: null, loaded: true, error: false });
    }
  };
  return (
    <Context.Provider
      value={{
        draft: state.owner === owner ? state.draft : null,
        loaded: state.owner === owner && state.loaded,
        error: state.owner === owner && state.error,
        update,
        discard,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useImportDraft() {
  const value = useContext(Context);
  if (!value) throw new Error('Import provider required');
  return value;
}
