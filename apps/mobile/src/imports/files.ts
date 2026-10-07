import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { importLimits } from '@jimo/schemas';
export type SourceFile = {
  uri: string;
  name: string;
  mime: string;
  size: number;
  owned: boolean;
};
export async function pickImages(camera: boolean): Promise<SourceFile[]> {
  if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted)
    throw new Error('IMPORT_CAMERA_DENIED');
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 1,
    exif: false,
    allowsMultipleSelection: !camera,
    selectionLimit: importLimits.maxImages,
    orderedSelection: true,
  };
  const result = camera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return [];
  if (result.assets.length > importLimits.maxImages)
    throw new Error('IMPORT_FILE_COUNT');
  const files: SourceFile[] = [];
  try {
    for (const image of result.assets) {
      const largest = Math.max(image.width, image.height);
      const actions =
        largest > 2400
          ? [
              {
                resize:
                  image.width >= image.height
                    ? { width: 2400 }
                    : { height: 2400 },
              },
            ]
          : [];
      const normalized = await ImageManipulator.manipulateAsync(
        image.uri,
        actions,
        { compress: 0.94, format: ImageManipulator.SaveFormat.JPEG },
      );
      const size =
        Platform.OS === 'web'
          ? (await (await fetch(normalized.uri)).blob()).size
          : new File(normalized.uri).size;
      const file = {
        uri: normalized.uri,
        name: `page-${files.length + 1}.jpg`,
        mime: 'image/jpeg',
        size,
        owned: Platform.OS !== 'web',
      };
      files.push(file);
      if (size > importLimits.imageBytes)
        throw new Error('IMPORT_FILE_TOO_LARGE');
    }
    return files;
  } catch (e) {
    cleanupSources(files);
    throw e;
  }
}
export async function pickPdf(): Promise<SourceFile[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  const asset = result.assets[0]!;
  if ((asset.size ?? 0) > importLimits.pdfBytes) {
    cleanupSources([
      {
        uri: asset.uri,
        name: asset.name,
        mime: 'application/pdf',
        size: asset.size ?? 0,
        owned: Platform.OS !== 'web',
      },
    ]);
    throw new Error('IMPORT_FILE_TOO_LARGE');
  }
  return [
    {
      uri: asset.uri,
      name: asset.name,
      mime: 'application/pdf',
      size: asset.size ?? 0,
      owned: Platform.OS !== 'web',
    },
  ];
}
export function cleanupSources(files: SourceFile[]) {
  for (const f of files)
    if (f.owned) {
      try {
        const file = new File(f.uri);
        if (file.exists) file.delete();
      } catch {
        /* OS cache expiry is the fallback; never delete the original gallery/document. */
      }
    }
}
export async function uploadBody(files: SourceFile[], locale: string) {
  if (!files.length || files.length > importLimits.maxImages)
    throw new Error('IMPORT_FILE_COUNT');
  if (files.reduce((n, f) => n + f.size, 0) > importLimits.totalBytes)
    throw new Error('IMPORT_FILE_TOO_LARGE');
  const body = new FormData();
  body.append('locale', locale);
  for (const f of files) {
    if (Platform.OS === 'web') {
      const blob = await (await fetch(f.uri)).blob();
      body.append('files', blob, f.name);
    } else
      body.append('files', {
        uri: f.uri,
        name: f.name,
        type: f.mime,
      } as unknown as Blob);
  }
  return body;
}
