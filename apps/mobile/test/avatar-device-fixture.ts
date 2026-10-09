/** Test-only native contracts: Expo 57 copy resolves asynchronously, provider stat can be unavailable. */
export const Platform = { OS: 'android' };
type StoredFile = { readable: boolean; decodable: boolean; size: number };
export const device = {
  files: new Map<string, StoredFile>(),
  calls: [] as string[],
  uri: 'file:///picker/photo',
  granted: true,
  canceled: false,
  mimeType: null as string | null,
};
export function resetDevice() {
  device.files.clear();
  device.calls.length = 0;
  device.uri = 'file:///picker/photo';
  device.granted = true;
  device.canceled = false;
  device.mimeType = null;
  device.files.set(device.uri, { readable: true, decodable: true, size: 100 });
}
export function randomUUID() {
  return `photo-${crypto.randomUUID()}`;
}
export class Directory {
  uri: string;
  constructor(...parts: (string | Directory)[]) {
    this.uri = parts
      .map((part) =>
        typeof part === 'string' ? part : part.uri.replace(/\/$/, ''),
      )
      .join('/');
  }
  create() {
    device.calls.push('mkdir');
  }
}
export const Paths = { document: new Directory('file:///documents') };
export class File {
  constructor(readonly uri: string) {}
  get exists() {
    return !this.uri.startsWith('content:') && device.files.has(this.uri);
  }
  get size() {
    return device.files.get(this.uri)?.size ?? 0;
  }
  get parentDirectory() {
    return new Directory(this.uri.slice(0, this.uri.lastIndexOf('/')));
  }
  async copy(destination: File) {
    device.calls.push('copy:start');
    await new Promise<void>((resolve) => setImmediate(resolve));
    const source = device.files.get(this.uri);
    if (!source?.readable) {
      device.files.set(destination.uri, {
        readable: true,
        decodable: false,
        size: 0,
      });
      throw new Error('fixture unreadable provider');
    }
    device.files.set(destination.uri, { ...source });
    device.calls.push('copy:complete');
  }
  delete() {
    device.files.delete(this.uri);
    device.calls.push('delete');
  }
}
export const Image = {
  getSize: async (uri: string) => {
    if (!device.files.get(uri)?.decodable)
      throw new Error('fixture decoding failure');
    device.calls.push('decode');
    return { width: 100, height: 80 };
  },
};
export async function requestCameraPermissionsAsync() {
  device.calls.push('permission:camera');
  return { granted: device.granted };
}
export async function requestMediaLibraryPermissionsAsync() {
  device.calls.push('permission:gallery');
  return { granted: device.granted };
}
export async function launchCameraAsync() {
  device.calls.push('picker:camera');
  return result();
}
export async function launchImageLibraryAsync() {
  device.calls.push('picker:gallery');
  return result();
}
function result() {
  return {
    canceled: device.canceled,
    assets: [{ uri: device.uri, mimeType: device.mimeType }],
  };
}
