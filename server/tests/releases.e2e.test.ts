import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { STEP_IDS } from '../src/domain/steps';

// Integration test against the configured DATABASE_URL. It only ever touches
// rows it creates (name prefixed) and cleans up after itself.
const app = createApp();
const PREFIX = '__test__';

afterAll(async () => {
  await prisma.release.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

describe('Releases API', () => {
  it('rejects an invalid create payload (missing name) with 400', async () => {
    const res = await request(app).post('/api/releases').send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
  });

  it('exposes the canonical checklist via GET /api/steps', async () => {
    const res = await request(app).get('/api/steps');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(STEP_IDS.length);
  });

  it('runs the full lifecycle: create → toggle → complete → update → delete', async () => {
    // --- create ---
    const created = await request(app).post('/api/releases').send({
      name: `${PREFIX} v1.0`,
      releaseDate: '2026-07-01T10:00:00.000Z',
      additionalInfo: 'first cut',
    });
    expect(created.status).toBe(201);
    const rel = created.body.data;
    expect(rel.status).toBe('planned');
    expect(rel.completedCount).toBe(0);
    expect(rel.totalSteps).toBe(STEP_IDS.length);

    // --- it shows up in the list ---
    const list = await request(app).get('/api/releases');
    expect(list.status).toBe(200);
    expect(list.body.data.some((r: { id: string }) => r.id === rel.id)).toBe(true);

    // --- toggling one step flips status to ongoing ---
    const toggled = await request(app)
      .patch(`/api/releases/${rel.id}/steps`)
      .send({ stepId: STEP_IDS[0], completed: true });
    expect(toggled.status).toBe(200);
    expect(toggled.body.data.status).toBe('ongoing');
    expect(toggled.body.data.completedCount).toBe(1);

    // --- an unknown step id is rejected ---
    const bad = await request(app)
      .patch(`/api/releases/${rel.id}/steps`)
      .send({ stepId: 'not_a_real_step', completed: true });
    expect(bad.status).toBe(400);

    // --- completing every step flips status to done ---
    for (const id of STEP_IDS) {
      await request(app).patch(`/api/releases/${rel.id}/steps`).send({ stepId: id, completed: true });
    }
    const done = await request(app).get(`/api/releases/${rel.id}`);
    expect(done.body.data.status).toBe('done');
    expect(done.body.data.completedCount).toBe(STEP_IDS.length);

    // --- updating additional info ---
    const updated = await request(app)
      .patch(`/api/releases/${rel.id}`)
      .send({ additionalInfo: 'shipped 🚀' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.additionalInfo).toBe('shipped 🚀');

    // --- delete, then it is gone ---
    const del = await request(app).delete(`/api/releases/${rel.id}`);
    expect(del.status).toBe(204);
    const gone = await request(app).get(`/api/releases/${rel.id}`);
    expect(gone.status).toBe(404);
  });
});
