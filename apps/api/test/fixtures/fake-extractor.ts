import plan from './imports/plan.json';
import type {
  WorkoutPlanExtractor,
  ExtractionResult,
} from '../../src/ai/client';
import type { ImportFile } from '../../src/ai/imports/files';
export class FakeWorkoutPlanExtractor implements WorkoutPlanExtractor {
  calls = 0;
  constructor(
    public output: unknown = plan,
    private waitMs = 0,
  ) {}
  async extract(
    _files: ImportFile[],
    _locale: 'it' | 'en',
    signal: AbortSignal,
  ): Promise<ExtractionResult> {
    this.calls++;
    if (this.waitMs)
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, this.waitMs);
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new Error('Cancelled'));
          },
          { once: true },
        );
      });
    return {
      output: structuredClone(this.output),
      inputTokens: 100,
      outputTokens: 80,
    };
  }
}
