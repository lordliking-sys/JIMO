import { workoutOperationSchema } from '@jimo/schemas';
import { ApiClientError } from '../../api/client';
import type { SyncOutboxRepository } from '../repositories/outbox';

/** Persist a pending start before editing/archiving/deleting its source plan. */
export async function prepareProgramChange(options: {
  owner: string;
  currentOwner(): string | null;
  outbox: Pick<SyncOutboxRepository, 'list'>;
  flush(): Promise<void>;
  programId?: string;
  activatingProgramId?: string;
}) {
  const hasPendingStart = async () =>
    (await options.outbox.list(options.owner)).some((row) => {
      const operation = workoutOperationSchema.parse(JSON.parse(row.payload));
      return (
        operation.operationType === 'START_WORKOUT' &&
        operation.payload.programId !== options.activatingProgramId &&
        (!options.programId ||
          operation.payload.programId === options.programId)
      );
    });
  if (options.currentOwner() !== options.owner)
    throw new ApiClientError('IDENTITY_CHANGED', 403);
  if (await hasPendingStart()) {
    await options.flush();
    if (options.currentOwner() !== options.owner)
      throw new ApiClientError('IDENTITY_CHANGED', 403);
    if (await hasPendingStart())
      throw new ApiClientError('PROGRAM_SYNC_PENDING');
  }
  if (options.currentOwner() !== options.owner)
    throw new ApiClientError('IDENTITY_CHANGED', 403);
}
