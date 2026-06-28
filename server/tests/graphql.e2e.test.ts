import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { STEP_IDS } from '../src/domain/steps';

const app = createApp();
const PREFIX = '__gqltest__';

afterAll(async () => {
  await prisma.release.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

function gql(query: string, variables?: Record<string, unknown>) {
  return request(app).post('/graphql').send({ query, variables });
}

describe('GraphQL API', () => {
  it('returns the canonical steps', async () => {
    const res = await gql(`{ steps { id label } }`);
    expect(res.status).toBe(200);
    expect(res.body.data.steps).toHaveLength(STEP_IDS.length);
  });

  it('runs create → toggle → delete with computed status', async () => {
    const create = await gql(
      `mutation($input: CreateReleaseInput!) {
         createRelease(input: $input) { id status completedCount totalSteps steps { id completed } }
       }`,
      { input: { name: `${PREFIX} v1`, releaseDate: '2026-07-01T10:00:00.000Z' } },
    );
    expect(create.status).toBe(200);
    const rel = create.body.data.createRelease;
    expect(rel.status).toBe('planned');
    expect(rel.totalSteps).toBe(STEP_IDS.length);
    expect(rel.steps).toHaveLength(STEP_IDS.length);
    const id = rel.id;

    const toggled = await gql(
      `mutation($id: ID!, $s: String!) {
         toggleStep(id: $id, stepId: $s, completed: true) { status completedCount }
       }`,
      { id, s: STEP_IDS[0] },
    );
    expect(toggled.body.data.toggleStep.status).toBe('ongoing');
    expect(toggled.body.data.toggleStep.completedCount).toBe(1);

    const del = await gql(`mutation($id: ID!) { deleteRelease(id: $id) }`, { id });
    expect(del.body.data.deleteRelease).toBe(true);

    const after = await gql(`query($id: ID!) { release(id: $id) { id } }`, { id });
    expect(after.body.data.release).toBeNull();
  });

  it('surfaces validation errors with a BAD_USER_INPUT code', async () => {
    const res = await gql(
      `mutation($input: CreateReleaseInput!) { createRelease(input: $input) { id } }`,
      { input: { name: '', releaseDate: 'not-a-date' } },
    );
    expect(res.body.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
  });
});
