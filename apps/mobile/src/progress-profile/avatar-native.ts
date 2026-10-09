import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';
import {
  AvatarError,
  LocalAvatarStore,
  type AvatarMetadata,
  type AvatarPicker,
} from './avatar-store';

export const avatarPicker: AvatarPicker = {
  permission: async (source) => {
    // Persistent native document storage is unavailable in Expo's web filesystem.
    if (Platform.OS === 'web') throw new AvatarError('phoneOnly');
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    return permission.granted;
  },
  pick: async (source) => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      exif: false,
      base64: false,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return null;
    if (!result.assets[0]) throw new AvatarError('unavailable');
    return result.assets[0];
  },
};
export function createAvatarStore(metadata: AvatarMetadata) {
  return new LocalAvatarStore(
    metadata,
    {
      directory: (owner) =>
        new Directory(
          Paths.document,
          'jimo',
          'profile-avatars',
          owner,
        ).uri.replace(/\/+$/, '') + '/',
      exists: async (uri) => Platform.OS !== 'web' && new File(uri).exists,
      copy: async (source, destination) => {
        const file = new File(source),
          target = new File(destination);
        if (!file.exists) throw new AvatarError('unavailable');
        target.parentDirectory.create({
          intermediates: true,
          idempotent: true,
        });
        file.copy(target);
      },
      delete: async (uri) => {
        const file = new File(uri);
        if (file.exists) file.delete();
      },
    },
    randomUUID,
  );
}
