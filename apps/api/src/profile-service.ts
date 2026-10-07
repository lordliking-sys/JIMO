import { eq, and, isNull } from 'drizzle-orm';
import { users, type DatabaseClient } from '@jimo/database';
import { profileSchema, type ProfileUpdate } from '@jimo/schemas';
import { ApiError } from './errors';
export class ProfileService {
  constructor(private client: DatabaseClient) {}
  async get(id: string) {
    const row = (
      await this.client.db.select().from(users).where(eq(users.id, id))
    )[0];
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Profile not found');
    return profileSchema.parse({
      id: row.id,
      displayName: row.displayName,
      locale: row.locale,
      unitSystem: row.unitSystem,
      createdAt: row.createdAt.toISOString(),
      initialized: row.profileInitializedAt !== null,
    });
  }
  async update(id: string, input: ProfileUpdate) {
    const { initialize, ...fields } = input;
    await this.client.db
      .update(users)
      .set({ ...fields, profileInitializedAt: new Date() })
      .where(
        initialize
          ? and(eq(users.id, id), isNull(users.profileInitializedAt))
          : eq(users.id, id),
      );
    return this.get(id);
  }
}
