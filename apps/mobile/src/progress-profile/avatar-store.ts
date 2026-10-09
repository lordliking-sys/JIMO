/** Local metadata uses the same JIMO owner UUID as workout/profile caches. */
export const avatarKey = 'localProfileAvatar:v1';
export type AvatarSource = 'camera' | 'gallery';
export type AvatarPhoto = { uri: string; mimeType?: string | null };
export type AvatarErrorKind =
  | 'cameraPermission'
  | 'galleryPermission'
  | 'unavailable'
  | 'phoneOnly'
  | 'storage'
  | 'identityChanged';
export class AvatarError extends Error {
  constructor(readonly kind: AvatarErrorKind) {
    super(kind);
  }
}
export type AvatarPicker = {
  permission(source: AvatarSource): Promise<boolean>;
  pick(source: AvatarSource): Promise<AvatarPhoto | null>;
};
export async function chooseAvatar(
  source: AvatarSource,
  picker: AvatarPicker,
  current: () => boolean = () => true,
) {
  if (!current()) throw new AvatarError('identityChanged');
  if (!(await picker.permission(source)))
    throw new AvatarError(
      source === 'camera' ? 'cameraPermission' : 'galleryPermission',
    );
  if (!current()) throw new AvatarError('identityChanged');
  const photo = await picker.pick(source);
  if (!current()) throw new AvatarError('identityChanged');
  if (photo && !photo.uri) throw new AvatarError('unavailable');
  return photo;
}
export type AvatarFiles = {
  directory(owner: string): string;
  exists(uri: string): Promise<boolean>;
  copy(source: string, destination: string): Promise<void>;
  delete(uri: string): Promise<void>;
};
export type AvatarMetadata = (
  owner: string,
  key: string,
  value?: string,
) => Promise<string | null>;
const fileName = /^[a-zA-Z0-9-]+\.(jpg|png|webp|heic|heif|avif|gif)$/;
function extension(photo: AvatarPhoto) {
  const mime = photo.mimeType?.split('/')[1];
  if (mime === 'jpeg') return 'jpg';
  if (mime && /^(png|webp|heic|heif|avif|gif)$/.test(mime)) return mime;
  const suffix = photo.uri.split('?')[0]?.split('.').pop()?.toLowerCase();
  return suffix && /^(jpg|png|webp|heic|heif|avif|gif)$/.test(suffix)
    ? suffix
    : 'jpg';
}
export class LocalAvatarStore {
  private pending: Promise<unknown> = Promise.resolve();
  constructor(
    private readonly metadata: AvatarMetadata,
    private readonly files: AvatarFiles,
    private readonly id: () => string,
  ) {}
  private owned(owner: string, uri: string | null): uri is string {
    const prefix = this.files.directory(owner);
    return (
      !!uri && uri.startsWith(prefix) && fileName.test(uri.slice(prefix.length))
    );
  }
  private serial<T>(owner: string, action: () => Promise<T>): Promise<T> {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(owner))
      return Promise.reject(new AvatarError('identityChanged'));
    const next = this.pending.then(action);
    this.pending = next.catch(() => {});
    return next;
  }
  read(owner: string) {
    return this.serial(owner, async () => {
      const uri = await this.metadata(owner, avatarKey);
      if (!uri) return null;
      // Never render a remote URI or another account's local file.
      if (this.owned(owner, uri) && (await this.files.exists(uri))) return uri;
      await this.metadata(owner, avatarKey, '');
      return null;
    });
  }
  replace(
    owner: string,
    photo: AvatarPhoto,
    current: () => boolean = () => true,
  ) {
    return this.serial(owner, async () => {
      if (!current()) throw new AvatarError('identityChanged');
      const previous = await this.metadata(owner, avatarKey);
      const uri = `${this.files.directory(owner)}${this.id()}.${extension(photo)}`;
      if (!this.owned(owner, uri)) throw new AvatarError('storage');
      let committed = false;
      try {
        await this.files.copy(photo.uri, uri);
        if (!(await this.files.exists(uri)))
          throw new AvatarError('unavailable');
        if (!current()) throw new AvatarError('identityChanged');
        await this.metadata(owner, avatarKey, uri);
        committed = true;
        if (this.owned(owner, previous) && previous !== uri)
          await this.files.delete(previous);
        return uri;
      } catch (error) {
        if (!committed) {
          // Roll back only our new copy; leave the previous photo/association intact.
          try {
            await this.files.delete(uri);
          } catch {
            /* Storage failure is reported by the caller. */
          }
        }
        throw error;
      }
    });
  }
  remove(owner: string, expected?: string) {
    return this.serial(owner, async () => {
      const previous = await this.metadata(owner, avatarKey);
      if (expected && previous !== expected) return;
      await this.metadata(owner, avatarKey, '');
      if (this.owned(owner, previous)) await this.files.delete(previous);
    });
  }
}
