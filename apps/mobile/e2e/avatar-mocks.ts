/** Browser-only OS/filesystem fixture; the actual store, hook and avatar UI run unchanged. */
import {
  AvatarError,
  LocalAvatarStore,
  type AvatarMetadata,
  type AvatarPicker,
} from '../src/progress-profile/avatar-store';
type Fixture = {
  granted: boolean;
  result: 'photo' | 'cancel' | 'missing';
  calls: string[];
};
const state: Fixture = { granted: true, result: 'photo', calls: [] };
Object.assign(window, { avatarFixture: state });
export const avatarPicker: AvatarPicker = {
  permission: async (source) => {
    state.calls.push(`permission:${source}`);
    return state.granted;
  },
  pick: async (source) => {
    state.calls.push(`pick:${source}`);
    return state.result === 'cancel'
      ? null
      : {
          uri:
            state.result === 'photo' ? 'picker://fixture' : 'picker://missing',
        };
  },
};
const svg = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#243b2e"/></svg>',
);
export function createAvatarStore(metadata: AvatarMetadata) {
  return new LocalAvatarStore(
    metadata,
    {
      directory: (owner) => `data:image/svg+xml,${svg}#${owner}/`,
      exists: async (uri) =>
        localStorage.getItem(`avatarFixture:file:${uri}`) === 'exists',
      copy: async (source, destination) => {
        if (source === 'picker://missing') throw new AvatarError('unavailable');
        localStorage.setItem(`avatarFixture:file:${destination}`, 'exists');
      },
      delete: async (uri) => {
        localStorage.removeItem(`avatarFixture:file:${uri}`);
      },
    },
    () => crypto.randomUUID(),
  );
}
