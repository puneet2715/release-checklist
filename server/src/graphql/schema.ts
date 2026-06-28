import { createSchema, createGraphQLError } from 'graphql-yoga';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import * as service from '../services/releases.service';
import { STEP_DEFINITIONS, type StepId } from '../domain/steps';
import {
  createReleaseSchema,
  toggleStepSchema,
  updateReleaseSchema,
} from '../schemas/release.schema';
import { AppError } from '../middleware/error';
import type { ReleaseDTO } from '../types';

// GraphQL and REST share ONE service layer, so business logic, caching, and
// validation never diverge between the two API surfaces.

const typeDefs = /* GraphQL */ `
  enum ReleaseStatus {
    planned
    ongoing
    done
  }

  "A checklist step definition (same for every release)."
  type StepDefinition {
    id: ID!
    label: String!
  }

  "A step within a specific release, with its completion state."
  type ReleaseStep {
    id: ID!
    label: String!
    completed: Boolean!
  }

  type Release {
    id: ID!
    name: String!
    releaseDate: String!
    additionalInfo: String
    status: ReleaseStatus!
    completedCount: Int!
    totalSteps: Int!
    steps: [ReleaseStep!]!
    createdAt: String!
    updatedAt: String!
  }

  input CreateReleaseInput {
    name: String!
    releaseDate: String!
    additionalInfo: String
  }

  input UpdateReleaseInput {
    name: String
    releaseDate: String
    additionalInfo: String
  }

  type Query {
    "All releases, ordered by release date."
    releases: [Release!]!
    "A single release by id, or null if it doesn't exist."
    release(id: ID!): Release
    "The canonical checklist definitions."
    steps: [StepDefinition!]!
  }

  type Mutation {
    createRelease(input: CreateReleaseInput!): Release!
    updateRelease(id: ID!, input: UpdateReleaseInput!): Release!
    "Check or uncheck a single step; returns the release with recomputed status."
    toggleStep(id: ID!, stepId: String!, completed: Boolean!): Release!
    "Returns true when the release was deleted."
    deleteRelease(id: ID!): Boolean!
  }
`;

/** Expose steps as a typed list (more idiomatic than a JSON blob in GraphQL). */
function toGraphQL(dto: ReleaseDTO) {
  return {
    ...dto,
    steps: STEP_DEFINITIONS.map((s) => ({
      id: s.id,
      label: s.label,
      completed: dto.steps[s.id] === true,
    })),
  };
}

/** Translate our domain errors into client-visible GraphQL errors. */
function asGraphQLError(e: unknown): never {
  if (e instanceof ZodError) {
    throw createGraphQLError('Validation failed', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: e.flatten().fieldErrors },
    });
  }
  if (e instanceof AppError) {
    throw createGraphQLError(e.message, {
      extensions: { code: e.statusCode === 404 ? 'NOT_FOUND' : 'BAD_REQUEST' },
    });
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
    throw createGraphQLError('Release not found', { extensions: { code: 'NOT_FOUND' } });
  }
  throw e; // unknown — let Yoga mask it as an internal error
}

const resolvers = {
  Query: {
    releases: async () => {
      const { data } = await service.listReleases();
      return data.map(toGraphQL);
    },
    release: async (_: unknown, { id }: { id: string }) => {
      try {
        return toGraphQL(await service.getRelease(id));
      } catch (e) {
        // A missing release reads more naturally as null than an error here.
        if (e instanceof AppError && e.statusCode === 404) return null;
        return asGraphQLError(e);
      }
    },
    steps: () => STEP_DEFINITIONS,
  },

  Mutation: {
    createRelease: async (_: unknown, { input }: { input: unknown }) => {
      try {
        return toGraphQL(await service.createRelease(createReleaseSchema.parse(input)));
      } catch (e) {
        return asGraphQLError(e);
      }
    },
    updateRelease: async (_: unknown, { id, input }: { id: string; input: unknown }) => {
      try {
        return toGraphQL(await service.updateRelease(id, updateReleaseSchema.parse(input)));
      } catch (e) {
        return asGraphQLError(e);
      }
    },
    toggleStep: async (
      _: unknown,
      { id, stepId, completed }: { id: string; stepId: string; completed: boolean },
    ) => {
      try {
        const parsed = toggleStepSchema.parse({ stepId, completed });
        return toGraphQL(await service.toggleStep(id, parsed.stepId as StepId, parsed.completed));
      } catch (e) {
        return asGraphQLError(e);
      }
    },
    deleteRelease: async (_: unknown, { id }: { id: string }) => {
      try {
        await service.deleteRelease(id);
        return true;
      } catch (e) {
        return asGraphQLError(e);
      }
    },
  },
};

export const schema = createSchema({ typeDefs, resolvers });
