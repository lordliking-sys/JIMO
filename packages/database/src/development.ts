import type { DatabaseClient } from './client';
/** Prevent development-only writes from reaching another Neon branch. */
export async function assertDevelopment(
  client: DatabaseClient,
  expectedBranchId = process.env.NEON_DEVELOPMENT_BRANCH_ID,
) {
  if (!expectedBranchId)
    throw new Error('NEON_DEVELOPMENT_BRANCH_ID is required');
  const [rows] = await client.sqlClient.transaction(
    [
      client.sqlClient.query(
        "SELECT current_setting('neon.branch_id',true) AS branch_id",
      ),
    ],
    { readOnly: true },
  );
  if (rows?.[0]?.branch_id !== expectedBranchId)
    throw new Error('Development branch mismatch');
}
