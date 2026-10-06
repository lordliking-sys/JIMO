export default async function cleanupApi() {
  if (!process.env.DATABASE_URL) return;
  const response = await fetch(
    `http://localhost:${process.env.E2E_API_PORT ?? 4301}/__e2e/cleanup`,
    { method: 'POST', signal: AbortSignal.timeout(20_000) },
  );
  if (!response.ok || (await response.json()).cleaned !== true)
    throw new Error('E2E isolated data cleanup failed');
}
