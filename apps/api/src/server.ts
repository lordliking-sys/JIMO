import { buildApp } from './app';
import { readEnv } from './env';
async function main() {
  const env = readEnv();
  const app = buildApp();
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void app.close().catch((error: unknown) => {
        app.log.error(error);
        process.exitCode = 1;
      });
    });
  }
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
