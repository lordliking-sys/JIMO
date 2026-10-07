import { profileSchema, type Profile } from '@jimo/schemas';
import type { OfflineRuntime } from '../db/runtime';
export class AccountProfileCache {
  constructor(
    private runtime: Pick<OfflineRuntime, 'metadata'>,
    private namespace = `${process.env.EXPO_PUBLIC_API_URL ?? ''}|${process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''}`,
  ) {}
  private key(subject: string) {
    return `profile:${this.namespace}:${subject}`;
  }
  async get(subject: string) {
    const raw = await this.runtime.metadata('_auth', this.key(subject));
    if (!raw) return null;
    try {
      const value = profileSchema.safeParse(JSON.parse(raw));
      return value.success ? value.data : null;
    } catch {
      return null;
    }
  }
  async save(subject: string, profile: Profile) {
    await this.runtime.metadata(
      '_auth',
      this.key(subject),
      JSON.stringify(profileSchema.parse(profile)),
    );
  }
}
