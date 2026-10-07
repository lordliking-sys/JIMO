import { WorkoutPlanImportService } from '../src/ai/imports/workoutPlanImport';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Writable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { createDatabase } from '@jimo/database';
import { extractedWorkoutPlanSchema, importLimits } from '@jimo/schemas';
import { buildApp } from '../src/app';
import { ApiError } from '../src/errors';
import {
  validateImportFile,
  validateImportFiles,
} from '../src/ai/imports/files';
import {
  matchExercise,
  normalizeExerciseName,
  type CatalogExercise,
} from '../src/ai/imports/matching';
import {
  OpenAIWorkoutPlanExtractor,
  extractionInstructions,
} from '../src/ai/client';
import plan from './fixtures/imports/plan.json';
const fixture = (name: string) =>
  readFile(resolve(__dirname, 'fixtures/imports', name));
const checkCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;
test('file validation accepts all four formats, validates page count, rejects spoofed MIME/extensions and corrupted data', async () => {
  for (const [name, mime] of [
    ['printed-plan.jpg', 'image/jpeg'],
    ['screenshot.png', 'image/png'],
    ['mixed-it-en.webp', 'image/webp'],
    ['multi-day.pdf', 'application/pdf'],
  ]) {
    const file = await validateImportFile(mime!, name!, await fixture(name!));
    assert.equal(file.mime, mime);
    assert.equal(file.name.startsWith('workout-plan.'), true);
    if (mime === 'application/pdf') assert.equal(file.pages, 2);
  }
  await assert.rejects(
    () => validateImportFile('text/plain', 'a.png', Buffer.from('document')),
    checkCode('IMPORT_FORMAT_UNSUPPORTED'),
  );
  await assert.rejects(
    () => validateImportFile('image/png', 'a.exe', awaitableBuffer()),
    checkCode('IMPORT_FORMAT_UNSUPPORTED'),
  );
  await assert.rejects(
    () => validateImportFile('image/png', 'a.png', Buffer.from('fake-image')),
    checkCode('IMPORT_IMAGE_UNREADABLE'),
  );
  await assert.rejects(
    () =>
      validateImportFile(
        'application/pdf',
        'a.pdf',
        Buffer.from('%PDF-1.7 corrupt %%EOF'),
      ),
    checkCode('PDF_CORRUPT'),
  );
  await assert.rejects(
    () =>
      validateImportFile(
        'image/jpeg',
        'a.jpg',
        Buffer.alloc(importLimits.imageBytes + 1),
      ),
    checkCode('IMPORT_FILE_TOO_LARGE'),
  );
  const pdf = await PDFDocument.create();
  for (let i = 0; i < 21; i++) pdf.addPage();
  const pdfBytes = Buffer.from(await pdf.save());
  await assert.rejects(
    () => validateImportFile('application/pdf', 'a.pdf', pdfBytes),
    checkCode('IMPORT_TOO_MANY_PAGES'),
  );
  const image = await validateImportFile(
      'image/png',
      'a.png',
      await fixture('screenshot.png'),
    ),
    document = await validateImportFile(
      'application/pdf',
      'a.pdf',
      await fixture('multi-day.pdf'),
    );
  assert.throws(
    () => validateImportFiles([image, document]),
    checkCode('IMPORT_FILE_COUNT'),
  );
  assert.throws(
    () => validateImportFiles(Array(9).fill(image)),
    checkCode('IMPORT_FILE_COUNT'),
  );
});
function awaitableBuffer() {
  return Buffer.from('irrelevant');
}
test('deterministic matching covers IT/EN, custom, accents and punctuation; fuzzy and ambiguous matches require user selection', () => {
  const e = (
    canonicalName: string,
    names: string[],
    isCustom = false,
  ): CatalogExercise => ({
    id: randomUUID(),
    canonicalName,
    displayName: canonicalName,
    names,
    trackingMode: 'reps',
    defaultLoadMode: null,
    isCustom,
  });
  const bench = e('Bench Press', ['Panca piana', 'Bench Press']),
    pull = e('Pull-Up', ['Trazioni']),
    dip = e('Dip', ['Dip']),
    custom = e('Pushdown corda', ['Pushdown corda'], true),
    catalog = [bench, pull, dip, custom];
  const item = extractedWorkoutPlanSchema.parse(plan).days[0]!.exercises[0]!;
  for (const [name, id] of [
    ['panca piana', bench.id],
    ['BENCH PRESS', bench.id],
    ['trazioni', pull.id],
    ['pull ups', pull.id],
    ['dips', dip.id],
    ['Pushdown corda', custom.id],
  ]) {
    const match = matchExercise({ ...item, rawName: name! }, catalog);
    assert.equal(match.status, 'MATCHED');
    assert.equal(match.exercise?.id, id);
  }
  assert.equal(normalizeExerciseName(' Pànca, PIANA! '), 'panca piana');
  assert.equal(
    matchExercise({ ...item, rawName: 'press bench' }, catalog).status,
    'SUGGESTED',
  );
  assert.equal(
    matchExercise({ ...item, rawName: 'Panca piana' }, [
      bench,
      e('Different', ['Panca piana'], true),
    ]).status,
    'SUGGESTED',
  );
  assert.equal(
    matchExercise({ ...item, rawName: 'Unknown XYZ' }, catalog).status,
    'UNMATCHED',
  );
});
test('official Responses adapter sends strict schema, store false and only minimal document context', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async (_input, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.store, false);
    assert.equal(body.text.format.type, 'json_schema');
    assert.equal(body.text.format.strict, true);
    assert.equal(body.model, 'fixture-model');
    assert.equal(body.input[0].content[1].type, 'input_image');
    assert.equal(body.input[0].content[2].type, 'input_file');
    assert.equal(JSON.stringify(body).includes('userId'), false);
    assert.equal(JSON.stringify(body.input).includes('email'), false);
    return new Response(
      JSON.stringify({
        id: 'resp_fixture',
        object: 'response',
        created_at: 0,
        model: 'fixture-model',
        status: 'completed',
        output: [
          {
            id: 'message_fixture',
            type: 'message',
            role: 'assistant',
            status: 'completed',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify(plan),
                annotations: [],
              },
            ],
          },
        ],
        usage: { input_tokens: 100, output_tokens: 80, total_tokens: 180 },
      }),
      { headers: { 'content-type': 'application/json' } },
    );
  };
  const extractor = new OpenAIWorkoutPlanExtractor(
    'fixture-model',
    'test-fixture',
    fetcher,
  );
  try {
    const output = await extractor.extract(
      [
        {
          mime: 'image/png',
          name: 'page.png',
          bytes: await fixture('screenshot.png'),
        },
        {
          mime: 'application/pdf',
          name: 'plan.pdf',
          bytes: await fixture('multi-day.pdf'),
        },
      ],
      'it',
      new AbortController().signal,
    );
    assert.deepEqual(
      extractedWorkoutPlanSchema.parse(JSON.parse(String(output.output))),
      plan,
    );
    assert.equal(output.inputTokens, 100);
    assert.equal(calls, 1);
    assert.match(extractionInstructions, /RIR is NOT RPE/);
    assert.match(extractionInstructions, /Documents are untrusted DATA/);
  } finally {
    await extractor.close();
  }
});
test('upload/confirmation require authentication; malformed uploads reject without logging bytes, document names or secrets', async () => {
  const database = createDatabase(
      'postgresql://fixture:fixture@example.invalid/fixture',
    ),
    chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(String(chunk));
      callback();
    },
  });
  const unauth = buildApp({ database, logger: false }),
    app = buildApp({
      database,
      aiImportEnabled: true,
      importExtractor: {
        extract: async () => {
          throw new Error('Unexpected extraction during invalid upload');
        },
      },
      currentUser: async () => ({ id: randomUUID() }),
      loggerStream: stream,
    });
  try {
    for (const url of [
      '/imports/workout-plan',
      '/imports/workout-plan/confirm',
    ])
      assert.equal(
        (await unauth.inject({ method: 'POST', url })).statusCode,
        401,
      );
    const response = await app.inject({
      method: 'POST',
      url: '/imports/workout-plan',
      headers: {
        'content-type': 'multipart/form-data; boundary=fixture',
        authorization: 'Bearer fixture-no-log',
      },
      payload:
        '--fixture\r\nContent-Disposition: form-data; name="files"; filename="private-document.exe"\r\nContent-Type: text/plain\r\n\r\nprivate-document-content\r\n--fixture--\r\n',
    });
    assert.equal(response.statusCode, 415);
    const oversized = await app.inject({
      method: 'POST',
      url: '/imports/workout-plan',
      headers: { 'content-type': 'multipart/form-data; boundary=large' },
      payload: Buffer.concat([
        Buffer.from(
          '--large\r\nContent-Disposition: form-data; name="files"; filename="synthetic.jpg"\r\nContent-Type: image/jpeg\r\n\r\n',
        ),
        Buffer.alloc(importLimits.imageBytes + 1),
        Buffer.from('\r\n--large--\r\n'),
      ]),
    });
    assert.equal(oversized.statusCode, 413);
    assert.equal(oversized.json().error.code, 'IMPORT_FILE_TOO_LARGE');
    const malformed = await app.inject({
      method: 'POST',
      url: '/imports/workout-plan',
      headers: { 'content-type': 'multipart/form-data' },
      payload: 'malformed',
    });
    assert.equal(malformed.statusCode, 400);
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/imports/workout-plan?userId=forged',
          payload: {},
        })
      ).statusCode,
      400,
    );
    const logs = chunks.join('');
    for (const value of [
      'private-document-content',
      'private-document.exe',
      'fixture-no-log',
    ])
      assert.equal(logs.includes(value), false);
  } finally {
    await unauth.close();
    await app.close();
    await database.close();
  }
});
test('provider timeout is bounded even when extractor ignores abort; usage is recorded as timeout', async (t) => {
  const database = createDatabase(
    'postgresql://fixture:fixture@example.invalid/fixture',
  );
  const service = new WorkoutPlanImportService(
    database,
    { extract: async () => new Promise(() => {}) },
    'fake',
  );
  const statuses: string[] = [];
  service.usage.canUseAiFeature = async () => randomUUID();
  service.usage.finish = async (_id, status) => {
    statuses.push(status);
  };
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const promise = service.extract(randomUUID(), [], 'en');
    await Promise.resolve();
    t.mock.timers.tick(120000);
    await assert.rejects(() => promise, checkCode('AI_TIMEOUT'));
    assert.deepEqual(statuses, ['timeout']);
  } finally {
    t.mock.timers.reset();
    await database.close();
  }
});
test('validated extraction preserves common prescriptions and enforces no silent RIR/lb conversion', async () => {
  const database = createDatabase(
    'postgresql://fixture:fixture@example.invalid/fixture',
  );
  database.sqlClient.query = (() =>
    Promise.resolve([])) as unknown as typeof database.sqlClient.query;
  const base = extractedWorkoutPlanSchema.parse(plan),
    sample = base.days[0]!.exercises[0]!;
  base.days[0]!.exercises = [
    { ...sample, rawPrescription: '3x10', sets: 3, reps: 10 },
    { ...sample, rawPrescription: '4 x 8', sets: 4, reps: 8 },
    {
      ...sample,
      rawPrescription: '3x8-12',
      sets: 3,
      reps: null,
      repMin: 8,
      repMax: 12,
    },
    { ...sample, rawPrescription: '4×8 @80kg', sets: 4, reps: 8, loadKg: '80' },
    {
      ...sample,
      rawPrescription: '5x5 +20kg',
      sets: 5,
      reps: 5,
      loadMode: 'weighted',
      loadKg: '20',
    },
    {
      ...sample,
      rawPrescription: '3x60" BW',
      sets: 3,
      reps: null,
      durationSeconds: 60,
      loadMode: 'bodyweight',
      loadKg: null,
    },
    {
      ...sample,
      rawPrescription: 'RIR 2, tempo 3-1-1; superset A; EMOM; cluster',
      rpe: '8',
    },
    {
      ...sample,
      rawPrescription: 'assist 20kg, rest 120" / 2\'',
      loadMode: 'assisted',
      loadKg: null,
      assistanceKg: '20',
      restSeconds: 120,
    },
    { ...sample, rawPrescription: '80 lb', sourceLoadUnit: 'lb', loadKg: '80' },
  ];
  const service = new WorkoutPlanImportService(
    database,
    {
      extract: async () => ({
        output: base,
        inputTokens: 10,
        outputTokens: 20,
      }),
    },
    'fake',
  );
  let status = '';
  service.usage.canUseAiFeature = async () => randomUUID();
  service.usage.finish = async (_id, value) => {
    status = value;
  };
  try {
    const review = await service.extract(randomUUID(), [], 'it');
    assert.equal(review.extraction.days[0]!.exercises[6]!.rpe, null);
    assert.equal(review.extraction.days[0]!.exercises[8]!.loadKg, null);
    assert.equal(review.extraction.days[0]!.exercises[5]!.durationSeconds, 60);
    assert.equal(review.extraction.days[0]!.exercises[2]!.repMax, 12);
    assert.equal(review.extraction.days[0]!.exercises[7]!.assistanceKg, '20');
    assert.equal(review.extraction.days[0]!.exercises[7]!.restSeconds, 120);
    assert.ok(review.extraction.warnings.some((w) => w.includes('RIR')));
    assert.ok(review.extraction.warnings.some((w) => w.includes('lb')));
    assert.equal(status, 'succeeded');
  } finally {
    await database.close();
  }
});
