import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import {
  extractedWorkoutPlanSchema,
  importReviewSchema,
  importConfirmationSchema,
  type ImportReview,
} from '@jimo/schemas';
import {
  reviewToDraft,
  draftConfirmation,
  ImportDraftRepository,
  incompleteItem,
} from '../src/imports/draft';
import { createApiClient, ApiClientError } from '../src/api/client';
import { importErrorKey } from '../src/imports/errors';
import { resources } from '../src/i18n/resources';
import { sqliteAdapter } from './sqlite-adapter';
import plan from '../../api/test/fixtures/imports/plan.json';
function review(): ImportReview {
  const extraction = extractedWorkoutPlanSchema.parse(plan);
  return importReviewSchema.parse({
    importId: randomUUID(),
    extraction,
    matches: extraction.days.map((day) =>
      day.exercises.map((_, i) =>
        i === 0
          ? {
              status: 'MATCHED',
              exercise: {
                id: randomUUID(),
                canonicalName: 'Bench Press',
                displayName: 'Panca piana',
                trackingMode: 'reps',
                defaultLoadMode: 'external',
                isCustom: false,
              },
              suggestions: [],
            }
          : { status: 'UNMATCHED', exercise: null, suggestions: [] },
      ),
    ),
  });
}
test('review preserves nulls, raw text, low confidence and advanced technique notes without inventing defaults', () => {
  const draft = reviewToDraft(review(), randomUUID),
    first = draft.days[0]!.exercises[0]!,
    unknown = draft.days[0]!.exercises[3]!;
  assert.equal(draft.program.durationWeeks, null);
  assert.equal(first.prescription.targetLoadKg, '80.00');
  assert.equal(first.prescription.targetRpe, '8.0');
  assert.equal(unknown.prescription.loadMode, null);
  assert.equal(unknown.exercise, null);
  assert.equal(unknown.custom, null);
  assert.equal(unknown.prescription.targetRpe, null);
  assert.match(unknown.prescription.notes!, /RIR 2/);
  assert.match(unknown.prescription.notes!, /tempo 3-1-1/);
  assert.equal(incompleteItem(unknown), true);
  assert.throws(() => draftConfirmation(draft));
  draft.days[0]!.exercises = [first];
  const input = draftConfirmation(draft);
  assert.equal(input.confirmationKey, draft.confirmationKey);
  assert.equal(importConfirmationSchema.safeParse(input).success, true);
  first.prescription.targetRepMin = 8;
  first.prescription.targetRepMax = null;
  first.prescription.targetReps = null;
  assert.equal(incompleteItem(first), true);
});
test('SQLite review survives restart and is isolated by account and API deployment; originals are never stored', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'jimo-import-')),
    path = join(dir, 'review.sqlite'),
    owner = randomUUID(),
    other = randomUUID(),
    draft = reviewToDraft(review(), randomUUID);
  let c = sqliteAdapter(path);
  try {
    await c.db.migrate();
    const repo = new ImportDraftRepository(c.db, 'https://api.example.invalid');
    await repo.save(owner, draft);
    const firstRead = await repo.read(owner);
    assert.equal(firstRead?.confirmationKey, draft.confirmationKey);
    assert.equal(await repo.read(other), null);
    assert.equal(
      await new ImportDraftRepository(
        c.db,
        'https://other.example.invalid',
      ).read(owner),
      null,
    );
    c.sqlite.close();
    c = sqliteAdapter(path);
    await c.db.migrate();
    const restarted = new ImportDraftRepository(
      c.db,
      'https://api.example.invalid',
    );
    assert.deepEqual(await restarted.read(owner), firstRead);
    const serialized = JSON.stringify(
      c.sqlite
        .prepare('SELECT value FROM sync_metadata WHERE owner_user_id=?')
        .get(owner),
    );
    for (const field of ['base64', 'file_data', 'data:image', 'uri', 'bytes'])
      assert.equal(serialized.includes('"' + field + '"'), false);
    await restarted.discard(other);
    assert.ok(await restarted.read(owner));
    await restarted.discard(owner);
    assert.equal(await restarted.read(owner), null);
  } finally {
    c.sqlite.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test('multipart uses central authenticated client without forcing JSON content type; long timeout is request-specific', async () => {
  const body = new FormData();
  body.append('locale', 'it');
  body.append('files', new Blob(['synthetic']), 'fixture.pdf');
  let calls = 0;
  const fetcher: typeof fetch = async (_input, init) => {
    calls++;
    assert.equal(init?.body, body);
    const headers = new Headers(init?.headers);
    assert.equal(headers.has('content-type'), false);
    assert.equal(headers.get('authorization'), 'Bearer fixture');
    assert.equal(headers.get('x-jimo-owner'), 'fixture-user');
    assert.ok(init?.signal);
    return Response.json({ ok: true });
  };
  const client = createApiClient(
    'https://api.example.invalid',
    fetcher,
    () => ({ getToken: async () => 'fixture', unauthorized: () => {} }),
  );
  assert.deepEqual(
    await client('/imports/workout-plan', z.object({ ok: z.boolean() }), {
      method: 'POST',
      body,
      timeoutMs: 150000,
      expectedUserId: 'fixture-user',
    }),
    { ok: true },
  );
  assert.equal(calls, 1);
});
test('errors are translated in IT/EN and raw provider text never reaches UI', () => {
  for (const code of [
    'IMPORT_FILE_TOO_LARGE',
    'PDF_CORRUPT',
    'IMPORT_NO_PROGRAM',
    'AI_INVALID_OUTPUT',
    'AI_TIMEOUT',
    'AI_RATE_LIMITED',
    'AI_NOT_CONFIGURED',
    'NETWORK_ERROR',
  ]) {
    const key = importErrorKey(new ApiClientError(code)).split('.')[1]!;
    assert.ok(
      resources.it.imports.errors[
        key as keyof typeof resources.it.imports.errors
      ],
    );
    assert.ok(
      resources.en.imports.errors[
        key as keyof typeof resources.en.imports.errors
      ],
    );
  }
  assert.equal(
    importErrorKey(new Error('private-provider-details')),
    'errors.generic',
  );
  assert.deepEqual(
    Object.keys(resources.it.imports).sort(),
    Object.keys(resources.en.imports).sort(),
  );
});
